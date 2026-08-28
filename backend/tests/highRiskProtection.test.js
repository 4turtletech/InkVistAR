const test = require('node:test');
const assert = require('node:assert/strict');
const { createHighRiskProtection, classifyRequest } = require('../middleware/highRiskProtection');

const users = {
  admin: { userId: 1, role: 'admin' },
  manager: { userId: 2, role: 'manager' },
  artist: { userId: 3, role: 'artist' },
  otherArtist: { userId: 6, role: 'artist' },
  customer: { userId: 4, role: 'customer' },
  otherCustomer: { userId: 5, role: 'customer' },
};

function createHarness() {
  const pool = {
    promise: () => ({
      query: async (sql, params) => {
        if (sql.includes('FROM appointments')) {
          const appointmentId = Number(params[0]);
          if (appointmentId === 42) {
            return [[{ id: 42, customer_id: 4, artist_id: 3, secondary_artist_id: null }]];
          }
          return [[]];
        }
        if (sql.includes('FROM notifications')) return [[{ user_id: 4 }]];
        return [[]];
      },
    }),
  };

  const authenticate = (req, res, next) => {
    const token = String(req.headers.authorization || '').replace('Bearer ', '');
    if (!users[token]) return res.status(401).json({ success: false, message: 'Authentication required.' });
    req.auth = users[token];
    next();
  };

  return createHighRiskProtection({ authenticate, pool });
}

async function invoke(middleware, { method = 'GET', path, token, body = {}, query = {} }) {
  const result = { status: null, payload: null, nextCalled: false };
  const req = {
    method,
    path,
    originalUrl: path,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body,
    query,
  };
  const res = {
    headersSent: false,
    status(code) { result.status = code; return this; },
    json(payload) { result.payload = payload; this.headersSent = true; return this; },
  };
  await middleware(req, res, () => { result.nextCalled = true; });
  result.req = req;
  return result;
}

test('highest-risk route groups are classified for protection', () => {
  const paths = [
    ['/api/admin/users', 'role'],
    ['/api/payments/create-checkout-session', 'appointment'],
    ['/api/customer/profile/4', 'identity-path'],
    ['/api/appointments/42/details', 'appointment'],
    ['/api/appointments/42/waiver-document', 'appointment'],
    ['/api/health-screenings/appointment/42', 'appointment'],
    ['/api/artist/3/earnings-ledger', 'artist-path'],
    ['/api/notifications/4', 'self-path'],
    ['/api/push/register', 'self-body'],
    ['/api/admin/inventory', 'role'],
  ];
  for (const [path, kind] of paths) {
    assert.equal(classifyRequest({ method: 'GET', path }).kind, kind, path);
  }
});

test('the optimized homepage gallery remains a public read-only route', () => {
  assert.equal(classifyRequest({ method: 'GET', path: '/api/gallery/homepage' }), null);
});

test('admin routes require authentication and reject customer roles', async () => {
  const middleware = createHarness();
  const unauthenticated = await invoke(middleware, { path: '/api/admin/users' });
  assert.equal(unauthenticated.status, 401);

  const customer = await invoke(middleware, { path: '/api/admin/users', token: 'customer' });
  assert.equal(customer.status, 403);

  const admin = await invoke(middleware, { path: '/api/admin/users', token: 'admin' });
  assert.equal(admin.nextCalled, true);

  const managerInventory = await invoke(middleware, { path: '/api/admin/inventory', token: 'manager' });
  assert.equal(managerInventory.nextCalled, true);
  const managerUsers = await invoke(middleware, { path: '/api/admin/users', token: 'manager' });
  assert.equal(managerUsers.status, 403);
});

test('artists can read session supplies but cannot manage inventory or kits', async () => {
  const middleware = createHarness();

  assert.equal((await invoke(middleware, {
    path: '/api/admin/inventory',
    token: 'artist',
  })).nextCalled, true);
  assert.equal((await invoke(middleware, {
    path: '/api/admin/service-kits',
    token: 'artist',
  })).nextCalled, true);

  assert.equal((await invoke(middleware, {
    method: 'POST',
    path: '/api/admin/service-kits',
    token: 'artist',
  })).status, 403);
  assert.equal((await invoke(middleware, {
    method: 'POST',
    path: '/api/admin/inventory/3/transaction',
    token: 'artist',
  })).status, 403);
  assert.equal((await invoke(middleware, {
    path: '/api/admin/inventory',
    token: 'customer',
  })).status, 403);
});

test('customer profile access is limited to the authenticated customer', async () => {
  const middleware = createHarness();
  assert.equal((await invoke(middleware, { path: '/api/customer/profile/4', token: 'customer' })).nextCalled, true);
  assert.equal((await invoke(middleware, { path: '/api/customer/profile/5', token: 'customer' })).status, 403);
});

test('notification collections are limited to the authenticated account for every role', async () => {
  const middleware = createHarness();

  for (const [token, userId] of [['admin', 1], ['manager', 2], ['artist', 3], ['customer', 4]]) {
    const ownNotifications = await invoke(middleware, {
      path: `/api/notifications/${userId}`,
      token,
    });
    assert.equal(ownNotifications.nextCalled, true, `${token} should read its own notifications`);

    const otherNotifications = await invoke(middleware, {
      path: `/api/notifications/${userId + 100}`,
      token,
    });
    assert.equal(otherNotifications.status, 403, `${token} must not read another account's notifications`);
  }
});

test('appointment authorization loads ownership from the database', async () => {
  const middleware = createHarness();
  const assignedArtist = await invoke(middleware, { method: 'PUT', path: '/api/appointments/42/status', token: 'artist' });
  assert.equal(assignedArtist.nextCalled, true);
  assert.equal(assignedArtist.req.authorizationResource.customer_id, 4);

  const otherCustomer = await invoke(middleware, { path: '/api/appointments/42/transactions', token: 'otherCustomer' });
  assert.equal(otherCustomer.status, 403);

  const owningCustomerWaiver = await invoke(middleware, { path: '/api/appointments/42/waiver-document', token: 'customer' });
  assert.equal(owningCustomerWaiver.nextCalled, true);
  const otherCustomerWaiver = await invoke(middleware, { path: '/api/appointments/42/waiver-document', token: 'otherCustomer' });
  assert.equal(otherCustomerWaiver.status, 403);

  const unassignedArtist = await invoke(middleware, { method: 'PUT', path: '/api/appointments/42/status', token: 'otherArtist' });
  assert.equal(unassignedArtist.status, 403);

  assert.equal((await invoke(middleware, { path: '/api/health-screenings/appointment/42' })).status, 401);
  assert.equal((await invoke(middleware, { path: '/api/health-screenings/appointment/42', token: 'customer' })).nextCalled, true);
  assert.equal((await invoke(middleware, { path: '/api/health-screenings/appointment/42', token: 'otherCustomer' })).status, 403);
  assert.equal((await invoke(middleware, { path: '/api/health-screenings/appointment/42', token: 'artist' })).nextCalled, true);
  assert.equal((await invoke(middleware, { path: '/api/health-screenings/appointment/42', token: 'otherArtist' })).status, 403);
});

test('request-body identity cannot override the authenticated identity', async () => {
  const middleware = createHarness();
  const result = await invoke(middleware, {
    method: 'POST',
    path: '/api/reports',
    token: 'customer',
    body: { customer_id: 5, title: 'Spoofed report' },
  });
  assert.equal(result.status, 403);
});

test('the existing public booking wizard remains available without opening admin appointment creation', async () => {
  const middleware = createHarness();
  const guestWizard = await invoke(middleware, {
    method: 'POST',
    path: '/api/admin/appointments',
    body: { isFromWizard: true, customerId: 'admin' },
  });
  assert.equal(guestWizard.nextCalled, true);

  const ordinaryAdminCreate = await invoke(middleware, {
    method: 'POST',
    path: '/api/admin/appointments',
    body: { customerId: 4 },
  });
  assert.equal(ordinaryAdminCreate.status, 401);

  const spoofedCustomer = await invoke(middleware, {
    method: 'POST',
    path: '/api/admin/appointments',
    token: 'customer',
    body: { isFromWizard: true, customerId: 5 },
  });
  assert.equal(spoofedCustomer.status, 403);
});
