const assert = require('node:assert/strict');
const test = require('node:test');
const { normalizeBlockedDate } = require('../services/artistAvailabilityPolicy');

test('blocked dates use a real ISO calendar date and cannot be in the past', () => {
  assert.equal(normalizeBlockedDate('2026-09-20', '2026-09-15'), '2026-09-20');
  assert.throws(() => normalizeBlockedDate('2026-02-30', '2026-01-01'), /valid date/i);
  assert.throws(() => normalizeBlockedDate('09/20/2026', '2026-01-01'), /valid date/i);
  assert.throws(() => normalizeBlockedDate('2026-09-14', '2026-09-15'), /Past dates/i);
});
