const assert = require('node:assert/strict');
const test = require('node:test');
const {
  getMaterialTraceabilitySnapshot,
  validateInventoryMaterial,
} = require('../services/materialTraceabilityPolicy');

test('session traceability is copied from inventory and ignores request data', () => {
  const inventoryItem = {
    batch_number: ' BATCH-7 ',
    lot_number: 'LOT-12',
    serial_number: 'SERIAL-4',
    expiration_date: '2027-04-30 00:00:00',
  };
  const requestBody = {
    batch_number: 'FORGED-BATCH',
    expiration_date: '2099-12-31',
  };

  assert.deepEqual(getMaterialTraceabilitySnapshot(inventoryItem, requestBody), {
    batchNumber: 'BATCH-7',
    lotNumber: 'LOT-12',
    serialNumber: 'SERIAL-4',
    expirationDate: '2027-04-30',
  });
});

test('recalled and expired inventory cannot be selected for a session', () => {
  const now = new Date('2026-08-22T10:00:00Z');
  assert.equal(validateInventoryMaterial({ name: 'Ink', recall_status: 'recalled' }, now).valid, false);
  assert.equal(validateInventoryMaterial({ name: 'Needle', expiration_date: '2026-08-21' }, now).valid, false);
  assert.equal(validateInventoryMaterial({ name: 'Needle', expiration_date: '2026-08-22' }, now).valid, true);
});

test('traceability fields remain optional for ordinary supplies', () => {
  const result = validateInventoryMaterial({ name: 'Paper towels', recall_status: 'none' });
  assert.equal(result.valid, true);
  assert.deepEqual(result.snapshot, {
    batchNumber: null,
    lotNumber: null,
    serialNumber: null,
    expirationDate: null,
  });
});
