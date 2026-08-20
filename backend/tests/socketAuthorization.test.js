const test = require('node:test');
const assert = require('node:assert/strict');
const { createSocketAuthorizer } = require('../services/socketAuthorization');

function createAuthorizer() {
  const tokenService = {
    verifyAccessToken: (token) => token === 'valid' ? { sub: '4', role: 'customer' } : { sub: '3', role: 'artist' },
  };
  const pool = {
    promise: () => ({
      query: async (sql, params) => {
        if (sql.includes('FROM users')) {
          const id = Number(params[0]);
          return [[{
            id,
            name: id === 4 ? 'Customer Four' : 'Artist Three',
            user_type: id === 4 ? 'customer' : 'artist',
            is_verified: 1,
            is_deleted: 0,
            account_status: 'active',
          }]];
        }
        if (sql.includes('FROM appointments') && Number(params[0]) === 42 && Number(params[1]) === 3) return [[{ id: 42 }]];
        return [[]];
      },
    }),
  };
  return createSocketAuthorizer({ tokenService, pool });
}

test('customer socket can join only its own support room', async () => {
  const authorizer = createAuthorizer();
  const socket = { handshake: { auth: { token: 'valid' } } };
  await authorizer.attachAuthentication(socket);
  assert.equal(authorizer.authorizeSupportRoom(socket, 'customer_4'), true);
  assert.equal(authorizer.authorizeSupportRoom(socket, 'customer_5'), false);
  assert.equal(authorizer.canTrackSupport(socket), false);
});

test('guest socket is bound to one randomly named guest room', () => {
  const authorizer = createAuthorizer();
  const socket = { handshake: { auth: {} }, auth: null };
  assert.equal(authorizer.authorizeSupportRoom(socket, 'guest_abcdef'), true);
  assert.equal(authorizer.authorizeSupportRoom(socket, 'guest_ghijkl'), false);
  assert.equal(authorizer.authorizeSupportRoom(socket, 'admin_room'), false);
});

test('artist socket session access is checked against appointment assignment', async () => {
  const authorizer = createAuthorizer();
  const socket = { handshake: { auth: { token: 'artist' } } };
  await authorizer.attachAuthentication(socket);
  assert.equal(await authorizer.authorizeAppointment(socket, 42), true);
  assert.equal(await authorizer.authorizeAppointment(socket, 43), false);
});
