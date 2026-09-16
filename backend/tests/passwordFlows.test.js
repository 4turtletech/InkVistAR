const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { createPasswordChangeService } = require('../services/passwordChangeService');
const { createPasswordRecoveryService, hashRecoveryToken } = require('../services/passwordRecoveryService');
const { createAuthenticate } = require('../middleware/authenticate');
const { passwordVersion } = require('../services/tokenService');

function changeHarness({ count = 0, sessionFails = false } = {}) {
  const calls = [];
  const user = { id: 9, email: 'user@example.test', user_type: 'customer', is_verified: 1, password_hash: bcrypt.hashSync('OldPassword1!', 4) };
  const connection = {
    async beginTransaction() { calls.push('begin'); },
    async commit() { calls.push('commit'); },
    async rollback() { calls.push('rollback'); },
    release() { calls.push('release'); },
    async query(sql, params) {
      calls.push(sql);
      if (sql.startsWith('SELECT *')) return [[user]];
      if (sql.startsWith('SELECT COUNT')) return [[{ count }]];
      if (sql.startsWith('UPDATE users')) assert.equal(await bcrypt.compare('NewPassword2_', params[0]), true);
      return [{}];
    },
  };
  const service = createPasswordChangeService({ promise: () => ({ getConnection: async () => connection }) }, {
    initialize: async () => {},
    issueSession: async (updated, metadata, transaction) => {
      assert.equal(transaction, connection);
      assert.equal(updated.is_verified, 1);
      assert.notEqual(updated.password_hash, user.password_hash);
      calls.push('session');
      if (sessionFails) throw new Error('session insert failed');
      return { accessToken: 'new-access', refreshToken: 'new-refresh' };
    },
  });
  return { calls, service };
}

test('signed-in password change atomically revokes old sessions and issues the current session without OTP', async () => {
  const { service, calls } = changeHarness();
  const result = await service(9, 'OldPassword1!', 'NewPassword2_', {});
  assert.equal(result.refreshToken, 'new-refresh');
  assert.ok(calls.some(sql => sql.startsWith('UPDATE refresh_tokens')));
  assert.ok(calls.some(sql => sql.startsWith('UPDATE password_recovery_tokens')));
  assert.ok(calls.indexOf('session') < calls.indexOf('commit'));
  assert.equal(calls.includes('rollback'), false);
});

test('wrong current password records an attempt but never changes credentials', async () => {
  const { service, calls } = changeHarness();
  await assert.rejects(service(9, 'WrongPassword1!', 'NewPassword2_', {}), { code: 'current_password_invalid' });
  assert.ok(calls.includes('commit'));
  assert.equal(calls.some(sql => sql.startsWith('UPDATE')), false);
});

test('password change rejects reused passwords and rate-limits repeated guesses', async () => {
  const reused = changeHarness();
  await assert.rejects(reused.service(9, 'OldPassword1!', 'OldPassword1!', {}), { code: 'password_reused' });
  const limited = changeHarness({ count: 5 });
  await assert.rejects(limited.service(9, 'OldPassword1!', 'NewPassword2_', {}), { status: 429 });
  assert.equal(limited.calls.includes('session'), false);
});

test('failed replacement-session insertion rolls the password change back', async () => {
  const { service, calls } = changeHarness({ sessionFails: true });
  await assert.rejects(service(9, 'OldPassword1!', 'NewPassword2_', {}), /session insert failed/);
  assert.ok(calls.includes('rollback'));
  assert.equal(calls.includes('commit'), false);
  assert.equal(calls.at(-1), 'release');
});

function recoveryHarness(options = {}) {
  const challenge = 'a'.repeat(48);
  const record = { id: 1, user_id: 9, password_hash: bcrypt.hashSync('OldPassword1!', 4), token_hash: hashRecoveryToken(`${challenge}:123456`), expires_at: new Date(Date.now() + 600000), failed_attempts: 0, max_attempts: 5, ...options };
  const calls = [];
  const connection = {
    async beginTransaction() {}, async commit() { calls.push('commit'); }, async rollback() { calls.push('rollback'); }, release() {},
    async query(sql, params) {
      calls.push(sql);
      if (sql.includes('SELECT pr.')) return [record.used_at ? [] : [record]];
      if (sql.includes('SET used_at')) record.used_at = new Date();
      if (sql.includes('SET token_hash')) record.token_hash = params[0];
      if (sql.includes('failed_attempts = failed_attempts')) record.failed_attempts++;
      return [{}];
    },
  };
  const database = {
    async query(sql) { return sql.includes('FROM password_recovery_events') ? [[{ recent_count: 0, daily_count: 0 }]] : [{}]; },
    getConnection: async () => connection,
  };
  return { service: createPasswordRecoveryService({ promise: () => database }), challenge, record, calls };
}

test('six-digit recovery code becomes a reset-only grant and cannot be reused', async () => {
  const { service, challenge } = recoveryHarness();
  const payload = { email: 'user@example.test', code: '123456', challenge };
  const result = await service.verifyCode(payload);
  assert.match(result.token, /^[a-f0-9]{32}$/);
  assert.equal(result.accessToken, undefined);
  await assert.rejects(service.verifyCode(payload), { code: 'recovery_token_invalid' });
  await assert.rejects(service.confirmRecovery({ email: payload.email, token: '123456', newPassword: 'NewPassword2_' }), { code: 'recovery_token_invalid' });
});

test('incorrect, expired and exhausted recovery codes cannot grant access', async () => {
  const wrong = recoveryHarness();
  await assert.rejects(wrong.service.verifyCode({ email: 'user@example.test', code: '654321', challenge: wrong.challenge }), { code: 'recovery_token_invalid' });
  assert.equal(wrong.record.failed_attempts, 1);
  assert.ok(wrong.calls.includes('commit'));
  assert.equal(wrong.calls.includes('rollback'), false);
  for (const options of [{ expires_at: new Date(0) }, { failed_attempts: 5 }]) {
    const h = recoveryHarness(options);
    await assert.rejects(h.service.verifyCode({ email: 'user@example.test', code: '123456', challenge: h.challenge }), { code: 'recovery_token_invalid' });
    assert.equal(h.calls.some(sql => sql.includes('SET token_hash')), false);
  }
});

test('verified recovery grant resets once, revokes sessions and preserves account verification', async () => {
  const h = recoveryHarness();
  const { token } = await h.service.verifyCode({ email: 'user@example.test', code: '123456', challenge: h.challenge });
  assert.equal(h.calls.some(sql => sql.includes('UPDATE users')), false);
  const result = await h.service.confirmRecovery({ email: 'user@example.test', token, newPassword: 'NewPassword2_' });
  assert.equal(result.userId, 9);
  assert.ok(h.calls.some(sql => sql.includes('UPDATE refresh_tokens')));
  const update = h.calls.find(sql => sql.includes('UPDATE users'));
  assert.ok(update.includes('password_hash'));
  assert.equal(update.includes('is_verified'), false);
  await assert.rejects(h.service.confirmRecovery({ email: 'user@example.test', token, newPassword: 'NewPassword2_' }), { code: 'recovery_token_invalid' });
});

test('failed recovery email delivery returns a useful error and invalidates the undelivered code', async () => {
  const { createPasswordRecoveryRouter } = require('../routes/passwordRecovery');
  let revoked;
  const router = createPasswordRecoveryRouter({ passwordRecoveryService: {
    requestRecovery: async () => ({ delivery: { token: 'undelivered-code' } }),
    revokeRecoveryToken: async token => { revoked = token; },
  }, sendRecoveryEmail: async () => { throw new Error('provider unavailable'); } });
  const handler = router.stack.find(layer => layer.route.path === '/request').route.stack[0].handle;
  let status;
  let body;
  await handler({ body: { email: 'user@example.test', codeFlow: true }, headers: {} }, { status(value) { status = value; return this; }, json(value) { body = value; } });
  assert.equal(status, 503);
  assert.equal(body.code, 'email_delivery_failed');
  assert.equal(revoked, 'undelivered-code');
});

test('access tokens from before a password change are rejected even before JWT expiry', async () => {
  const middleware = createAuthenticate({ tokenService: { verifyAccessToken: () => ({ sub: '9', role: 'customer', pv: passwordVersion('old-hash') }) }, pool: { promise: () => ({ query: async () => [[{ id: 9, user_type: 'customer', is_verified: 1, account_status: 'active', password_hash: 'new-hash' }]] }) } });
  let status;
  let body;
  await middleware({ headers: { authorization: 'Bearer old-token' } }, { status(value) { status = value; return this; }, json(value) { body = value; } }, () => assert.fail('Old access token accepted'));
  assert.equal(status, 401);
  assert.equal(body.code, 'access_token_invalid');
});
