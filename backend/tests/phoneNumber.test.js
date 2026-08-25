const test = require('node:test');
const assert = require('node:assert/strict');
const {
  extractPhilippineLocalMobileNumber,
  normalizePhilippineMobileNumber,
} = require('../services/phoneNumber');

test('normalizes supported Philippine mobile formats to E.164', () => {
  const formats = [
    '9171234567',
    '09171234567',
    '+639171234567',
    '+63 917 123 4567',
    '63-917-123-4567',
  ];

  formats.forEach((value) => {
    assert.equal(normalizePhilippineMobileNumber(value), '+639171234567');
  });
});

test('extracts the ten-digit local number for editable mobile fields', () => {
  assert.equal(extractPhilippineLocalMobileNumber('+63 917 123 4567'), '9171234567');
});

test('rejects malformed or non-mobile Philippine numbers', () => {
  ['8171234567', '917123456', '+6391712345678', '', null].forEach((value) => {
    assert.equal(normalizePhilippineMobileNumber(value), null);
  });
});
