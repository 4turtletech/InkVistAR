const test = require('node:test');
const assert = require('node:assert/strict');
const { buildAdminAppointmentConflictCheck } = require('../services/appointmentConflictPolicy');

test('walk-in conflict checks do not compare the shared placeholder customer', () => {
  const check = buildAdminAppointmentConflictCheck({
    date: '2026-09-01',
    startTime: '13:00:00',
    artistId: 7,
    customerId: 1,
    isWalkIn: true,
  });

  assert.match(check.query, /AND artist_id = \? FOR UPDATE/);
  assert.doesNotMatch(check.query, /customer_id/);
  assert.deepEqual(check.params, ['2026-09-01', '13:00:00', 7]);
});

test('registered-client conflict checks protect both the artist and customer', () => {
  const check = buildAdminAppointmentConflictCheck({
    date: '2026-09-01',
    startTime: '13:00:00',
    artistId: 7,
    customerId: 42,
    isWalkIn: false,
  });

  assert.match(check.query, /artist_id = \? OR customer_id = \?/);
  assert.deepEqual(check.params, ['2026-09-01', '13:00:00', 7, 42]);
});
