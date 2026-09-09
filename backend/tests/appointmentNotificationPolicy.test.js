const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const policy = require('../services/appointmentNotificationPolicy');

const registered = { customer_id: 71, artist_id: 73, status: 'confirmed', is_guest_placeholder: 0, customer_type: 'customer' };
const previous = {
  customer_id: 71, artist_id: 73, status: 'pending', is_guest_placeholder: 0,
  appointment_date: '2026-09-10', start_time: '19:00:00', price: 0,
  guest_email: 'customer@example.test', guest_phone: '+639171234567',
  booking_code: 'Integration Test', design_title: 'Integration Test', service_type: 'Consultation',
};

test('claimed bookings remain registered despite retained guest contact information', () => {
  assert.equal(policy.isRegisteredAppointmentCustomer({ ...registered, guest_email: previous.guest_email }), true);
  assert.equal(policy.isRegisteredAppointmentCustomer({ ...registered, customer_id: '71', is_guest_placeholder: '0' }), true);
});

test('guest placeholders, noncustomer accounts and missing owners never receive customer notices', () => {
  for (const patch of [{ is_guest_placeholder: 1 }, { is_guest_placeholder: '1' }, { customer_type: 'admin' }, { customer_type: 'artist' }, { customer_type: null }, { customer_id: null }, { customer_id: 0 }]) {
    assert.equal(policy.isRegisteredAppointmentCustomer({ ...registered, ...patch }), false);
  }
});

test('equivalent web/mobile/SQL schedule representations do not trigger rescheduling', () => {
  for (const startTime of ['19:00', '19:00:00', ' 19:00 ']) {
    assert.equal(policy.getAppointmentScheduleChange(previous, { date: '2026-09-10', startTime }).changed, false);
  }
  assert.equal(policy.getAppointmentScheduleChange({ ...previous, start_time: '09:00:00' }, { startTime: '9:00' }).changed, false);
  assert.equal(policy.getAppointmentScheduleChange(previous, { date: new Date('2026-09-09T16:00:00Z') }).changed, false);
  assert.equal(policy.getAppointmentScheduleChange(previous, {}).changed, false);
});

test('real date/time changes preserve omitted schedule components in notification text', () => {
  assert.deepEqual(policy.getAppointmentScheduleChange(previous, { startTime: '20:00' }), { changed: true, date: '2026-09-10', startTime: '20:00:00' });
  assert.deepEqual(policy.getAppointmentScheduleChange(previous, { date: '2026-09-11' }), { changed: true, date: '2026-09-11', startTime: '19:00:00' });
  assert.equal(policy.getAppointmentScheduleChange(previous, { startTime: '19:00:01' }).changed, true);
  assert.equal(policy.getAppointmentScheduleChange(previous, { startTime: null }).changed, false);
  assert.equal(policy.getAppointmentScheduleChange(previous, { startTime: '25:90' }).changed, false);
});

// Execute the actual post-update handler in isolation, not server startup.
// Every DB, email, SMS, push and notification call is an in-memory mock.
const source = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
const start = source.indexOf('function processAdminPostUpdate(');
const end = source.indexOf('// PUT artist accept appointment', start);
assert.ok(start >= 0 && end > start);
function runPostUpdate({ current = registered, old = previous, fields = { status: 'confirmed', date: '2026-09-10', startTime: '19:00', price: 0 } } = {}) {
  const calls = { notifications: [], registeredEmails: [], guestEmails: [], guestSMS: [], sms: [], push: [], responses: [] };
  const db = {
    query(sql, params, callback) {
      if (/UPDATE appointments/.test(sql)) return callback(null, { affectedRows: 1 });
      if (/FROM appointments ap LEFT JOIN users/.test(sql)) {
        assert.match(sql, /ap\.is_guest_placeholder/);
        assert.match(sql, /u\.user_type AS customer_type/);
        return callback(null, [current]);
      }
      if (/SELECT user_type FROM users/.test(sql)) return callback(null, [{ user_type: 'artist' }]);
      if (/SELECT u.phone/.test(sql)) return callback(null, [{ phone: previous.guest_phone, artist_name: 'Artist Tester', appointment_date: previous.appointment_date }]);
      throw new Error(`Unexpected mocked query: ${sql}`);
    },
  };
  const context = {
    ...policy,
    console: { error: (...args) => { throw new Error(args.join(' ')); } },
    createNotification: (...args) => calls.notifications.push(args),
    sendRegisteredUserStatusEmail: (...args) => calls.registeredEmails.push(args),
    sendGuestStatusEmail: (...args) => calls.guestEmails.push(args),
    sendGuestStatusSMS: (...args) => calls.guestSMS.push(args),
    sendSMS: (...args) => calls.sms.push(args),
    appointmentConfirmedSMS: () => 'Confirmation',
    sendPushNotification: (...args) => calls.push.push(args),
  };
  vm.runInNewContext(source.slice(start, end), context);
  context.processAdminPostUpdate({ headersSent: false, json: result => calls.responses.push(result) }, db, 74, old, fields);
  assert.equal(calls.responses[0]?.success, true);
  return calls;
}

test('actual confirmation handler notifies claimed customer and artist without false reschedule or duplicate guest messages', () => {
  const calls = runPostUpdate();
  assert.deepEqual(calls.notifications.map(n => [n[0], n[3]]), [[71, 'appointment_confirmed'], [73, 'appointment_confirmed']]);
  assert.equal(calls.registeredEmails.length, 1);
  assert.equal(calls.registeredEmails[0][1], 71);
  assert.equal(calls.push.length, 1);
  assert.equal(calls.push[0][0], 71);
  assert.equal(calls.sms.length, 1);
  assert.equal(calls.guestEmails.length, 0);
  assert.equal(calls.guestSMS.length, 0);
});

test('actual confirmation handler still supports ordinary registered bookings', () => {
  const calls = runPostUpdate({ old: { ...previous, guest_email: null, guest_phone: null } });
  assert.equal(calls.notifications.filter(n => n[0] === 71 && n[3] === 'appointment_confirmed').length, 1);
  assert.equal(calls.notifications.some(n => n[3] === 'appointment_rescheduled'), false);
});

test('genuine guests retain guest contact delivery without notifying placeholder admin', () => {
  const calls = runPostUpdate({ current: { ...registered, customer_id: 1, customer_type: 'admin', is_guest_placeholder: 1 }, old: { ...previous, customer_id: 1, is_guest_placeholder: 1 } });
  assert.deepEqual(calls.notifications.map(n => n[0]), [73]);
  assert.equal(calls.registeredEmails.length, 0);
  assert.equal(calls.push.length, 0);
  assert.equal(calls.sms.length, 0);
  assert.equal(calls.guestEmails.length, 1);
  assert.equal(calls.guestSMS.length, 1);
});

test('actual date-only and time-only reschedules notify both linked users with complete schedule', () => {
  for (const fields of [{ date: '2026-09-11' }, { startTime: '20:00' }]) {
    const calls = runPostUpdate({ fields });
    assert.deepEqual(calls.notifications.map(n => [n[0], n[3]]), [[71, 'appointment_rescheduled'], [73, 'appointment_rescheduled']]);
    assert.equal(calls.registeredEmails.length, 1);
    assert.equal(calls.guestEmails.length, 0);
    for (const notice of calls.notifications) assert.doesNotMatch(notice[2], /undefined|null/);
    assert.match(calls.notifications[0][2], fields.date ? /2026-09-11 at 19:00:00/ : /2026-09-10 at 20:00:00/);
  }
});

test('re-saving an already confirmed appointment produces no confirmation or reschedule notice', () => {
  const calls = runPostUpdate({ old: { ...previous, status: 'confirmed' } });
  assert.equal(calls.notifications.length, 0);
  assert.equal(calls.registeredEmails.length, 0);
  assert.equal(calls.push.length, 0);
});
