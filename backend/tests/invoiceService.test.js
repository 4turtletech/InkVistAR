const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  insertInvoiceRecord,
  invoiceNumberForId,
  paymentMethodFromRow,
} = require('../services/invoiceService');

test('invoice numbers are derived from the unique database row id', () => {
  assert.equal(invoiceNumberForId(72), 'INV-000072');
  assert.equal(invoiceNumberForId(1000001), 'INV-1000001');
});

test('payment methods retain manual choices and identify gateway payments', () => {
  assert.equal(paymentMethodFromRow({ raw_event: JSON.stringify({ method: 'GCash' }) }), 'GCash');
  assert.equal(paymentMethodFromRow({ paymongo_payment_id: 'MANUAL-123' }), 'Cash');
  assert.equal(paymentMethodFromRow({ paymongo_payment_id: 'pay_123' }), 'PayMongo');
});

test('invoice insertion uses the generated row id without MAX plus one races', async () => {
  const calls = [];
  const connection = {
    async beginTransaction() { calls.push('begin'); },
    async query(sql, values) {
      calls.push({ sql, values });
      if (sql.startsWith('INSERT INTO invoices')) return [{ insertId: 72 }];
      return [{ affectedRows: 1 }];
    },
    async commit() { calls.push('commit'); },
    async rollback() { calls.push('rollback'); },
    release() { calls.push('release'); },
  };
  const database = { promise: () => ({ getConnection: async () => connection }) };

  const result = await insertInvoiceRecord(database, {
    clientName: 'Walk-in Customer',
    serviceType: 'Retail POS Sale',
    amount: 500,
    paymentMethod: 'Cash',
  });

  assert.deepEqual(result, { id: 72, invoiceNumber: 'INV-000072', existing: false });
  assert.deepEqual(calls.filter((call) => typeof call === 'string'), ['begin', 'commit', 'release']);
  assert.match(calls[2].sql, /UPDATE invoices SET invoice_number/);
  assert.deepEqual(calls[2].values, ['INV-000072', 72]);
});

test('admin invoice feed no longer merges payment rows or invoices sessions on completion', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const start = source.indexOf("app.get('/api/admin/invoices'");
  const end = source.indexOf("app.post('/api/admin/appointments/:id/manual-payment'", start);
  const handler = source.slice(start, end);

  assert.doesNotMatch(handler, /FROM payments p/);
  assert.match(handler, /FROM invoices/);
  assert.match(handler, /OR payment_id IS NOT NULL/);
  assert.doesNotMatch(source, /Automatically create a manual invoice for Admin Billing/);
});

test('PayMongo checkout sessions are unique so webhook retries update one payment row', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

  assert.match(source, /UNIQUE KEY uniq_payment_session \(session_id\)/);
  assert.match(source, /CREATE UNIQUE INDEX uniq_payment_session ON payments \(session_id\)/);
});
