const assert = require('node:assert/strict');
const test = require('node:test');
const {
  RECOVERY_TOKEN_HEX_LENGTH,
  createRecoveryToken,
  createPasswordRecoveryService,
  hashRecoveryToken,
  isRecoveryTokenFormat,
} = require('../services/passwordRecoveryService');
const { isStrongPassword } = require('../services/passwordPolicy');
const {
  PUBLIC_ACCOUNT_TYPE,
  publicAccountType,
  isAdminCreatableAccountType,
} = require('../services/registrationPolicy');
const { classifyRequest } = require('../middleware/highRiskProtection');

test('password recovery codes use the expected cryptographic token format', () => {
  const first = createRecoveryToken();
  const second = createRecoveryToken();
  assert.equal(first.length, RECOVERY_TOKEN_HEX_LENGTH);
  assert.equal(isRecoveryTokenFormat(first), true);
  assert.notEqual(first, second);
});

test('only the recovery token hash is suitable for database storage', () => {
  const token = createRecoveryToken();
  const tokenHash = hashRecoveryToken(token);
  assert.match(tokenHash, /^[a-f0-9]{64}$/);
  assert.notEqual(tokenHash, token);
  assert.equal(hashRecoveryToken(token.toUpperCase()), tokenHash);
});

test('password recovery enforces the shared strong-password policy', () => {
  assert.equal(isStrongPassword('weakpassword'), false);
  assert.equal(isStrongPassword('StrongPassword1!'), true);
  assert.equal(isStrongPassword('A1!short'), true);
  assert.equal(isStrongPassword('A1!shor'), false);
});

test('public registration always resolves to customer regardless of requested role', () => {
  assert.equal(PUBLIC_ACCOUNT_TYPE, 'customer');
  assert.equal(publicAccountType('admin'), 'customer');
  assert.equal(publicAccountType('artist'), 'customer');
});

test('admin staff creation accepts only known account roles', () => {
  assert.equal(isAdminCreatableAccountType('admin'), true);
  assert.equal(isAdminCreatableAccountType('manager'), true);
  assert.equal(isAdminCreatableAccountType('artist'), true);
  assert.equal(isAdminCreatableAccountType('customer'), true);
  assert.equal(isAdminCreatableAccountType('superadmin'), false);
});

test('password recovery endpoints remain public while protected APIs still require authentication', () => {
  assert.equal(classifyRequest({ method: 'POST', path: '/api/password-recovery/request' }), null);
  assert.equal(classifyRequest({ method: 'POST', path: '/api/password-recovery/confirm' }), null);
  assert.deepEqual(classifyRequest({ method: 'GET', path: '/api/admin/users' }), { roles: ['admin'], kind: 'role' });
});

test('rejects a reused password recovery token with HTTP 401 semantics', async () => {
  const database = {
    async query(sql) {
      if (sql.includes('FROM password_recovery_events')) {
        return [[{ recent_count: 0, daily_count: 0 }]];
      }
      return [{}];
    },
    async getConnection() {
      return connection;
    },
  };
  const connection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async query(sql) {
      if (sql.includes('FROM password_recovery_tokens pr')) {
        // Used and revoked tokens are excluded from the active-token query.
        return [[]];
      }
      return [{}];
    },
  };
  const service = createPasswordRecoveryService({ promise: () => database });

  await assert.rejects(
    () => service.confirmRecovery({
      email: 'customer@example.test',
      token: 'a'.repeat(RECOVERY_TOKEN_HEX_LENGTH),
      newPassword: 'StrongPassword1!',
    }, { ip: '127.0.0.1' }),
    (error) => error.code === 'recovery_token_invalid' && error.status === 401,
  );
});
