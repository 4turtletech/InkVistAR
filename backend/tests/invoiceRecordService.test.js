const assert = require('node:assert/strict');
const test = require('node:test');
const { InvoiceRecordInputError, buildInvoiceUpdate } = require('../services/invoiceRecordService');

test('invoice updates include only supplied editable fields', () => {
  const update = buildInvoiceUpdate({
    type: 'Tattoo Session',
    status: 'paid',
    payment_method: 'GCash',
  });

  assert.deepEqual(update.assignments, [
    'service_type = ?',
    'status = ?',
    'payment_method = ?',
  ]);
  assert.deepEqual(update.values, ['Tattoo Session', 'Paid', 'GCash']);
  assert.equal(update.assignments.some(field => field.includes('discount')), false);
  assert.equal(update.assignments.some(field => field.includes('items')), false);
});

test('invoice update normalizes money and rejects invalid financial fields', () => {
  assert.deepEqual(buildInvoiceUpdate({ amount: '1250.256' }).values, [1250.26]);
  assert.throws(() => buildInvoiceUpdate({ amount: 0 }), InvoiceRecordInputError);
  assert.throws(() => buildInvoiceUpdate({ status: 'refunded' }), InvoiceRecordInputError);
  assert.throws(() => buildInvoiceUpdate({ payment_method: 'Unknown' }), InvoiceRecordInputError);
  assert.throws(() => buildInvoiceUpdate({}), InvoiceRecordInputError);
});
