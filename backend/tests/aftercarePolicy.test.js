const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const policy = require('../services/aftercarePolicy');

test('service input rejects missing/generic types and preserves supported procedures', () => {
  for (const value of [undefined, null, '', ' ', 'General Session', 'unknown', 1]) {
    assert.equal(policy.normalizeServiceType(value), null);
  }
  for (const value of ['Tattoo Session', 'Piercing', 'Tattoo + Piercing', 'Consultation', 'Touch-up']) {
    assert.equal(policy.normalizeServiceType(` ${value.toUpperCase()} `), value);
  }
});

test('legacy recovery requires an explicit procedure prefix, never a generic booking or payment', () => {
  assert.equal(policy.isTattooAftercare({ service_type: 'General Session', design_title: 'Tattoo Session: Rose' }), true);
  assert.equal(policy.isTattooAftercare({ service_type: null, design_title: 'Touch-up: Rose' }), true);
  for (const appointment of [
    { service_type: 'General Session', design_title: 'General Session: Appointment', payment_status: 'paid' },
    { service_type: 'General Session', design_title: 'A tattoo of a rose' },
    { service_type: 'Piercing', design_title: 'Tattoo Session: Rose' },
    { service_type: 'Consultation', design_title: 'Tattoo Session: Rose' },
  ]) assert.equal(policy.isTattooAftercare(appointment), false);
});

const source = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
const start = source.indexOf("app.get('/api/customer/aftercare/:customerId'");
const end = source.indexOf('// ========== ADMIN AFTERCARE', start);

test('create endpoint requires a real service type before any booking writes', async () => {
  const routeStart = source.indexOf("app.post('/api/admin/appointments'");
  const validationEnd = source.indexOf('  const isAdminWalkInBooking', routeStart);
  let handler;
  vm.runInNewContext(`${source.slice(routeStart, validationEnd)} res.json({ serviceType }); });`, {
    ...policy,
    normalizeCommissionSplit: value => value,
    app: { post: (route, callback) => { handler = callback; } },
  });
  for (const body of [{}, { serviceType: '' }, { serviceType: 'General Session' }]) {
    let status;
    let result;
    await handler({ body }, {
      status(value) { status = value; return this; },
      json(value) { result = value; },
    });
    assert.equal(status, 400);
    assert.equal(result.field, 'serviceType');
  }
  let normalized;
  await handler({ body: { service_type: ' tattoo session ' } }, { json: value => { normalized = value.serviceType; } });
  assert.equal(normalized, 'Tattoo Session');
});

function requestAftercare({ appointment, query = {}, error } = {}) {
  let handler;
  let payload;
  let status = 200;
  const queries = [];
  vm.runInNewContext(source.slice(start, end), {
    ...policy,
    app: { get: (route, callback) => { handler = callback; } },
    db: { query(sql, params, callback) {
      if (typeof params === 'function') { callback = params; params = []; }
      queries.push({ sql, params: Array.from(params) });
      callback(error, sql.includes('FROM appointments') ? (appointment ? [appointment] : []) : [{ day_number: 1 }]);
    } },
  });
  handler({ params: { customerId: '71' }, query }, {
    status(code) { status = code; return this; },
    json(data) { payload = data; },
  });
  return { status, payload, queries };
}

const tattoo = { id: 111, service_type: 'Tattoo Session', design_title: 'Rose', days_since: 1 };

test('paid, unpaid and legacy confirmed tattoo procedures receive the same guide', () => {
  for (const payment_status of ['paid', 'unpaid', 'downpayment_paid']) {
    const { payload } = requestAftercare({ appointment: { ...tattoo, payment_status } });
    assert.equal(payload.active, true);
    assert.equal(payload.aftercare.appointmentId, 111);
  }
  assert.equal(requestAftercare({ appointment: { ...tattoo, service_type: 'General Session', design_title: 'Tattoo: Rose' } }).payload.active, true);
});

test('selected guides remain scoped to the customer and completed nondeleted appointments', () => {
  const { queries } = requestAftercare({ appointment: tattoo, query: { appointmentId: '111' } });
  assert.deepEqual(queries[0].params, ['71', '111']);
  assert.match(queries[0].sql, /ap.customer_id = \?.*ap.status = 'completed'.*ap.is_deleted = 0/);
  assert.match(queries[0].sql, /AND ap.id = \?/);
  assert.equal(requestAftercare({ query: { appointmentId: '111 OR 1=1' } }).status, 400);
  assert.equal(requestAftercare().payload.active, false);
});

test('ambiguous, non-tattoo, expired and future records explain why tracking is unavailable', () => {
  for (const [patch, reason] of [
    [{ service_type: 'General Session' }, 'service_confirmation_required'],
    [{ service_type: 'Piercing' }, 'not_tattoo'],
    [{ service_type: 'Consultation' }, 'not_tattoo'],
    [{ days_since: 31 }, 'outside_tracking_window'],
    [{ days_since: -1 }, 'date_confirmation_required'],
    [{ days_since: null }, 'date_confirmation_required'],
  ]) {
    const { payload, queries } = requestAftercare({ appointment: { ...tattoo, ...patch } });
    assert.equal(payload.reason, reason);
    assert.equal(payload.active, false);
    assert.equal(queries.length, 1);
  }
  assert.equal(requestAftercare({ error: new Error('offline') }).status, 500);
});

test('dashboard, guide and daily reminders share procedure eligibility', () => {
  assert.equal(source.split('${TATTOO_AFTERCARE_SQL}').length - 1, 3);
  assert.match(source, /if \(isTattooAftercare\(appointment\)\)/);
});
