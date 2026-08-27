const assert = require('node:assert/strict');
const test = require('node:test');
const {
  InvoiceRecordInputError,
  InvoiceRecordNotFoundError,
  buildInvoiceUpdate,
  updateInvoiceRecord,
} = require('../services/invoiceRecordService');

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

test('paid invoice updates synchronize a linked appointment in the same transaction', async () => {
  const calls = [];
  const connection = {
    async beginTransaction() { calls.push('begin'); },
    async query(sql, values) {
      calls.push({ sql, values });
      return [{ affectedRows: 1 }];
    },
    async commit() { calls.push('commit'); },
    async rollback() { calls.push('rollback'); },
    release() { calls.push('release'); },
  };
  const database = { promise: () => ({ getConnection: async () => connection }) };

  const result = await updateInvoiceRecord({
    database,
    invoiceId: 17,
    update: buildInvoiceUpdate({ status: 'paid' }),
    markLinkedAppointmentPaid: true,
  });

  assert.equal(result.linkedAppointmentUpdated, true);
  assert.deepEqual(calls.filter(call => typeof call === 'string'), ['begin', 'commit', 'release']);
  assert.match(calls[2].sql, /SET ap\.payment_status = 'paid'/);
  assert.deepEqual(calls[2].values, [17]);
});

test('failed invoice updates roll back and preserve not-found semantics', async () => {
  const calls = [];
  const connection = {
    async beginTransaction() { calls.push('begin'); },
    async query() { return [{ affectedRows: 0 }]; },
    async commit() { calls.push('commit'); },
    async rollback() { calls.push('rollback'); },
    release() { calls.push('release'); },
  };
  const database = { promise: () => ({ getConnection: async () => connection }) };

  await assert.rejects(
    updateInvoiceRecord({
      database,
      invoiceId: 999,
      update: buildInvoiceUpdate({ status: 'paid' }),
      markLinkedAppointmentPaid: true,
    }),
    InvoiceRecordNotFoundError
  );
  assert.deepEqual(calls, ['begin', 'rollback', 'release']);
});
