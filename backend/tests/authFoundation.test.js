const assert = require('node:assert/strict');
const test = require('node:test');
const { authorize } = require('../middleware/authorize');
const { createAuthenticate } = require('../middleware/authenticate');
const { requireOwnership } = require('../middleware/ownership');
const { safeUser } = require('../routes/auth');
const { createTokenService, hashRefreshToken } = require('../services/tokenService');
const {
  deliverRefreshToken,
  getRefreshToken,
  rotateRefreshTokenResponse,
} = require('../services/sessionTransport');

const invokeMiddleware = (middleware, req) => new Promise((resolve) => {
  const response = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { resolve({ next: false, status: this.statusCode, body }); },
  };
  middleware(req, response, () => resolve({ next: true, status: response.statusCode }));
});

test('issues a signed access token and stores only a refresh-token hash', async () => {
  const calls = [];
  const database = {
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (sql.includes('INSERT INTO refresh_tokens')) return [{ insertId: 1 }];
      return [{}];
    },
  };
  const service = createTokenService({ promise: () => database });
  const user = { id: 42, user_type: 'artist' };
  const session = await service.issueSession(user, { clientType: 'mobile', ip: '127.0.0.1' });

  assert.equal(service.verifyAccessToken(session.accessToken).sub, '42');
  assert.equal(service.verifyAccessToken(session.accessToken).role, 'artist');
  assert.ok(session.refreshToken.length >= 64);

  const insert = calls.find(({ sql }) => sql.includes('INSERT INTO refresh_tokens'));
  assert.equal(insert.params[1], hashRefreshToken(session.refreshToken));
  assert.notEqual(insert.params[1], session.refreshToken);
});

test('rotates a refresh token and revokes the token it replaces', async () => {
  const connectionCalls = [];
  const connection = {
    async beginTransaction() { connectionCalls.push('begin'); },
    async commit() { connectionCalls.push('commit'); },
    async rollback() { connectionCalls.push('rollback'); },
    release() { connectionCalls.push('release'); },
    async query(sql, params = []) {
      connectionCalls.push({ sql, params });
      if (sql.includes('FROM refresh_tokens rt')) {
        return [[{
          id: 7,
          user_id: 42,
          family_id: 'family-id',
          client_type: 'mobile',
          expires_at: new Date(Date.now() + 60_000),
          revoked_at: null,
          name: 'Artist',
          email: 'artist@example.test',
          user_type: 'artist',
          is_verified: 1,
          is_deleted: 0,
          account_status: 'active',
          is_superadmin: 0,
          must_change_password: 0,
        }]];
      }
      if (sql.includes('INSERT INTO refresh_tokens')) return [{ insertId: 8 }];
      return [{}];
    },
  };
  const database = {
    async query() { return [{}]; },
    async getConnection() { return connection; },
  };
  const service = createTokenService({ promise: () => database });
  const oldToken = 'a'.repeat(64);
  const session = await service.rotateRefreshToken(oldToken, { ip: '127.0.0.1' });

  assert.notEqual(session.refreshToken, oldToken);
  assert.ok(connectionCalls.some((entry) => typeof entry === 'object' && entry.sql.includes('replaced_by_token_id')));
  assert.ok(connectionCalls.includes('commit'));
  assert.ok(!connectionCalls.includes('rollback'));
});

test('detects refresh-token reuse and revokes the entire token family', async () => {
  const queries = [];
  const connection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() { throw new Error('A committed reuse response must not roll back.'); },
    release() {},
    async query(sql, params = []) {
      queries.push({ sql, params });
      if (sql.includes('FROM refresh_tokens rt')) {
        return [[{
          id: 7,
          user_id: 42,
          family_id: 'compromised-family',
          revoked_at: new Date(),
        }]];
      }
      return [{}];
    },
  };
  const database = {
    async query() { return [{}]; },
    async getConnection() { return connection; },
  };
  const service = createTokenService({ promise: () => database });

  await assert.rejects(
    () => service.rotateRefreshToken('b'.repeat(64)),
    (error) => error.code === 'refresh_token_reused'
  );
  assert.ok(queries.some(({ sql, params }) => sql.includes('WHERE family_id = ?') && params[0] === 'compromised-family'));
});

test('role and ownership middleware deny unauthorized access', async () => {
  const deniedRole = await invokeMiddleware(authorize('admin'), { auth: { role: 'artist', userId: 5 } });
  assert.equal(deniedRole.status, 403);

  const ownResource = await invokeMiddleware(
    requireOwnership({ getOwnerId: (req) => req.params.userId }),
    { auth: { role: 'customer', userId: 5 }, params: { userId: '5' } }
  );
  assert.equal(ownResource.next, true);

  const otherResource = await invokeMiddleware(
    requireOwnership({ getOwnerId: (req) => req.params.userId }),
    { auth: { role: 'customer', userId: 5 }, params: { userId: '6' } }
  );
  assert.equal(otherResource.status, 403);
});

test('authentication middleware loads current account state and safe users omit secrets', async () => {
  const request = { headers: { authorization: 'Bearer signed-token' } };
  const databaseUser = {
    id: 9,
    name: 'Manager',
    email: 'manager@example.test',
    user_type: 'manager',
    is_verified: 1,
    is_deleted: 0,
    account_status: 'active',
    is_superadmin: 0,
    must_change_password: 0,
    password_hash: 'must-not-leak',
    otp_code: '123456',
  };
  const database = {
    async query() {
      return [[databaseUser]];
    },
  };
  const authenticate = createAuthenticate({
    tokenService: { verifyAccessToken: () => ({ sub: '9', role: 'manager' }) },
    pool: { promise: () => database },
  });
  const result = await invokeMiddleware(authenticate, request);
  assert.equal(result.next, true);
  assert.equal(request.auth.userId, 9);

  const publicUser = safeUser(databaseUser);
  assert.equal(publicUser.type, 'manager');
  assert.equal('password_hash' in publicUser, false);
  assert.equal('otp_code' in publicUser, false);
});

test('web refresh tokens use cookies while mobile tokens use the response body', () => {
  const cookies = [];
  const response = { cookie: (...args) => cookies.push(args) };
  const webRequest = { body: {}, headers: { origin: 'https://inkvictusstudio.com' } };
  const mobileRequest = { body: { clientType: 'mobile' }, headers: {} };

  assert.deepEqual(deliverRefreshToken(webRequest, response, 'web-secret', 'web'), {});
  assert.equal(cookies[0][0], 'inkvistar_refresh');
  assert.equal(cookies[0][2].httpOnly, true);
  assert.equal(cookies[0][2].path, '/api/auth');
  assert.deepEqual(deliverRefreshToken(mobileRequest, response, 'mobile-secret', 'mobile'), { refreshToken: 'mobile-secret' });
  assert.deepEqual(rotateRefreshTokenResponse({ body: { refreshToken: 'old' } }, response, 'next'), { refreshToken: 'next' });
  assert.equal(getRefreshToken({ body: {}, headers: { cookie: 'other=x; inkvistar_refresh=cookie-secret' } }), 'cookie-secret');
});
