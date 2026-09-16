const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createAuthRouter } = require('../routes/auth');
const { AuthTokenError } = require('../services/tokenService');

const ACCESS = 'inkvistar_access_token';
const REFRESH = 'inkvistar_refresh_token';
const EXPIRY = 'inkvistar_access_token_expiry';
const jwt = (seconds, id = 'token') => `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds, jti: id })).toString('base64url')}.signature`;
const response = (status, data = {}) => ({ status, ok: status >= 200 && status < 300, json: async () => data, text: async () => JSON.stringify(data) });

test('mobile customer and artist password changes persist the replacement session', async () => {
  for (const method of ['changeCustomerPassword', 'changeArtistPassword']) {
    const fresh = jwt(900, 'password-changed');
    const client = mobile(async (url, options) => {
      assert.ok(url.endsWith('/auth/change-password'));
      assert.ok(options.headers.Authorization);
      assert.deepEqual(JSON.parse(options.body), { currentPassword: 'OldPassword1!', newPassword: 'NewPassword2_', clientType: 'mobile' });
      return response(200, { success: true, accessToken: fresh, refreshToken: 'new-family' });
    });
    client.storage.set(ACCESS, jwt(900, 'old'));
    client.storage.set(EXPIRY, String(Date.now() + 900000));
    assert.equal((await client[method](9, 'OldPassword1!', 'NewPassword2_')).success, true);
    assert.equal(client.storage.get(ACCESS), fresh);
    assert.equal(client.storage.get(REFRESH), 'new-family');
  }
});

test('mobile recovery never refreshes unrelated stale credentials or creates a login session', async () => {
  const client = mobile(async (url, options) => {
    assert.ok(url.includes('/password-recovery/'));
    if (url.endsWith('/request')) assert.equal(JSON.parse(options.body).codeFlow, true);
    return response(200, { success: true });
  });
  assert.equal((await client.requestPasswordRecovery('user@example.test')).success, true);
  assert.equal((await client.resetUserPassword('user@example.test', 'a'.repeat(32), 'NewPassword2_')).success, true);
  assert.equal(client.storage.get(REFRESH), 'refresh-original');
});

function mobile(fetch) {
  const storage = new Map([[ACCESS, jwt(-1)], [REFRESH, 'refresh-original'], [EXPIRY, String(Date.now() - 1000)]]);
  const source = fs.readFileSync(path.join(__dirname, '../../mobile-app/src/utils/api.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
  const context = {
    module: { exports: {} }, fetch, AbortController, setTimeout, clearTimeout,
    atob: value => Buffer.from(value, 'base64').toString('binary'),
    console: { log() {}, warn() {}, error() {} },
    SecureStore: {
      getItemAsync: async key => storage.get(key) || null,
      setItemAsync: async (key, value) => { storage.set(key, value); },
      deleteItemAsync: async key => { storage.delete(key); },
    },
  };
  vm.runInNewContext(`${source}\nmodule.exports = { fetchAPI, getSocketAuthToken, removeAuthToken, saveAuthSession, changeCustomerPassword, changeArtistPassword, requestPasswordRecovery, resetUserPassword };`, context);
  return { ...context.module.exports, storage };
}

test('mobile foreground requests renew expired credentials once for concurrent requests', async () => {
  let rotations = 0;
  const fresh = jwt(900);
  const client = mobile(async (url, options) => {
    if (url.endsWith('/auth/refresh')) {
      rotations++;
      return response(200, { accessToken: fresh, refreshToken: 'refresh-new' });
    }
    assert.equal(options.headers.Authorization, `Bearer ${fresh}`);
    return response(200, { success: true });
  });
  const results = await Promise.all([client.fetchAPI('/one'), client.fetchAPI('/two'), client.getSocketAuthToken()]);
  assert.equal(rotations, 1);
  assert.equal(results[0].success, true);
  assert.equal(results[1].success, true);
  assert.equal(client.storage.get(REFRESH), 'refresh-new');
});

test('mobile delayed 401 retries reuse credentials already refreshed by another request', async () => {
  let finishSlow;
  let rotations = 0;
  const old = jwt(900, 'old');
  const fresh = jwt(900, 'new');
  const client = mobile(async (url, options) => {
    if (url.endsWith('/auth/refresh')) {
      rotations++;
      return response(200, { accessToken: fresh, refreshToken: 'new' });
    }
    if (options.headers.Authorization === `Bearer ${fresh}`) return response(200);
    if (url.endsWith('/slow')) return new Promise(resolve => { finishSlow = resolve; });
    return response(401);
  });
  client.storage.set(ACCESS, old);
  client.storage.set(EXPIRY, String(Date.now() + 900000));
  const slow = client.fetchAPI('/slow');
  const fast = await client.fetchAPI('/fast');
  assert.equal(fast.success, true);
  finishSlow(response(401));
  assert.equal((await slow).success, true);
  assert.equal(rotations, 1);
});

test('mobile transient errors and malformed responses retain refresh credentials', async () => {
  for (const failure of [response(503), response(200, {}), new Error('offline')]) {
    const client = mobile(async () => {
      if (failure instanceof Error) throw failure;
      return failure;
    });
    const result = await client.fetchAPI('/protected', { requireAuth: true });
    assert.equal(result.success, false);
    assert.notEqual(result.status, 401);
    assert.equal(client.storage.get(REFRESH), 'refresh-original');
  }
});

test('mobile clears credentials only when renewal is definitively rejected', async () => {
  for (const status of [401, 403]) {
    const client = mobile(async () => response(status));
    const result = await client.fetchAPI('/protected', { requireAuth: true });
    assert.equal(result.status, 401);
    assert.equal(client.storage.has(REFRESH), false);
  }
});

test('mobile late renewal cannot undo logout', async () => {
  let finish;
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  const client = mobile(async () => {
    started();
    return new Promise(resolve => { finish = resolve; });
  });
  const pending = client.getSocketAuthToken();
  await ready;
  await client.removeAuthToken();
  finish(response(200, { accessToken: jwt(900), refreshToken: 'new' }));
  assert.equal(await pending, null);
  assert.equal(client.storage.size, 0);
});

test('mobile login never attempts refresh with old credentials', async () => {
  const client = mobile(async url => {
    assert.ok(url.endsWith('/login'));
    return response(200);
  });
  assert.equal((await client.fetchAPI('/login', { method: 'POST' })).success, true);
});

test('backend refresh preserves cookies on server failure but clears rejected sessions', async () => {
  for (const error of [new Error('temporary outage'), new AuthTokenError('refresh_token_expired', 'Expired')]) {
    const router = createAuthRouter({
      tokenService: { rotateRefreshToken: async () => { throw error; } },
      authenticate: (req, res, next) => next(),
    });
    const handler = router.stack.find(layer => layer.route?.path === '/refresh').route.stack[0].handle;
    let cleared = false;
    let status;
    await handler({ headers: {}, body: {} }, {
      clearCookie() { cleared = true; },
      status(value) { status = value; return this; },
      json() {},
    });
    assert.equal(status, error instanceof AuthTokenError ? 401 : 500);
    assert.equal(cleared, error instanceof AuthTokenError);
  }
});
