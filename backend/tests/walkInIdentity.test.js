const assert = require('node:assert/strict');
const test = require('node:test');
const {
  normalizeAdminWalkInIdentity,
  storedWalkInEmail,
  storedWalkInName,
} = require('../services/walkInIdentity');

test('normalizes a structured admin walk-in identity without requiring email', () => {
  assert.deepStrictEqual(normalizeAdminWalkInIdentity({
    guestFirstName: '  Maria ',
    guestMiddleName: 'Santos',
    guestLastName: 'Cruz',
    guestSuffix: 'Jr.',
    guestPhone: '0917 123 4567',
  }), {
    guest_name: 'Maria Santos Cruz Jr.',
    guest_first_name: 'Maria',
    guest_middle_name: 'Santos',
    guest_last_name: 'Cruz',
    guest_suffix: 'Jr.',
    guest_email: null,
    guest_phone: '+639171234567',
  });
});

test('rejects incomplete or invalid admin walk-in contact details', () => {
  assert.throws(() => normalizeAdminWalkInIdentity({
    guestFirstName: 'Maria', guestPhone: '09171234567',
  }), /Last name is required/);
  assert.throws(() => normalizeAdminWalkInIdentity({
    guestFirstName: 'Maria', guestLastName: 'Cruz', guestPhone: '123',
  }), /valid Philippine mobile number/);
  assert.throws(() => normalizeAdminWalkInIdentity({
    guestFirstName: 'Maria', guestLastName: 'Cruz', guestPhone: '09171234567', guestEmail: 'bad',
  }), /valid email address/);
});

test('reads new structured walk-in names and legacy appointment fallbacks', () => {
  assert.strictEqual(storedWalkInName({
    guest_first_name: 'Maria', guest_middle_name: 'S.', guest_last_name: 'Cruz',
  }), 'Maria S. Cruz');
  assert.strictEqual(storedWalkInName({ guest_name: 'Juan Dela Cruz' }), 'Juan Dela Cruz');
  assert.strictEqual(storedWalkInName({ notes: '[Walk-In Details]\nName: Legacy Client\n[/Walk-In Details]' }), 'Legacy Client');
  assert.strictEqual(storedWalkInName({ guest_email: 'Old Stored Name' }), 'Old Stored Name');
  assert.strictEqual(storedWalkInEmail({ guest_email: 'Guest@Example.com' }), 'guest@example.com');
  assert.strictEqual(storedWalkInEmail({ guest_email: 'Old Stored Name' }), null);
});
