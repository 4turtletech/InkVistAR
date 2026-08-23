const assert = require('node:assert/strict');
const test = require('node:test');
const {
  calculatePayablePricePesos,
  createFinancialLedgerService,
  normalizePayment,
  pesosToCentavos,
  summarizeAppointmentFinances,
} = require('../services/financialLedgerService');

test('discounts reduce the payable price and remaining balance without changing stored prices', () => {
  assert.equal(calculatePayablePricePesos(5000, 10, 'percent'), 4500);
  assert.equal(calculatePayablePricePesos(5000, 750, 'flat'), 4250);
  assert.deepEqual(
    summarizeAppointmentFinances({ price: 5000, discount_amount: 10, discount_type: 'percent', total_paid: 1200 }),
    { payable_price: 4500, total_paid: 1200, remaining_balance: 3300 }
  );
});

test('ledger keeps API amounts in integer centavos and does not expose raw payment events', () => {
  assert.equal(pesosToCentavos('1250.25'), 125025);

  const transaction = normalizePayment({
    id: 7,
    appointment_id: 42,
    amount: 125025,
    status: 'Paid',
    paymongo_payment_id: 'MANUAL-123',
    raw_event: JSON.stringify({ type: 'manual_adjustment', method: 'Cash', private: 'omit-me' }),
    design_title: 'Tattoo Session',
  });

  assert.equal(transaction.amount, 125025);
  assert.equal(transaction.amount_centavos, 125025);
  assert.equal(transaction.payment_method, 'Cash');
  assert.equal(transaction.type, 'manual');
  assert.equal(transaction.status, 'paid');
  assert.equal(Object.hasOwn(transaction, 'raw_event'), false);
});

test('customer ledger merges current payments, legacy manual totals, and standalone POS invoices once', async () => {
  const calls = [];
  const pool = {
    query(sql, params, callback) {
      calls.push({ sql, params });
      if (sql.includes('FROM payments p')) {
        return callback(null, [{
          id: 1,
          appointment_id: 42,
          amount: 50000,
          status: 'paid',
          currency: 'PHP',
          created_at: '2026-08-23 10:00:00',
          paymongo_payment_id: 'pay_123',
          raw_event: null,
          design_title: 'Dragon',
        }]);
      }
      if (sql.includes('FROM appointments a')) {
        return callback(null, [{
          appointment_id: 43,
          manual_paid_amount: '250.50',
          manual_payment_method: 'Cash',
          created_at: '2026-08-22 10:00:00',
          design_title: 'Rose',
        }]);
      }
      if (sql.includes('FROM invoices i')) {
        return callback(null, [{
          id: 9,
          invoice_number: 'INV-000009',
          amount: '100.00',
          status: 'Paid',
          payment_method: 'Cash',
          service_type: 'Retail POS',
          created_at: '2026-08-21 10:00:00',
        }]);
      }
      return callback(new Error('Unexpected query'));
    },
  };

  const transactions = await createFinancialLedgerService(pool).getCustomerTransactions(12);

  assert.deepEqual(transactions.map(({ amount }) => amount), [50000, 25050, 10000]);
  assert.deepEqual(transactions.map(({ type }) => type), ['digital', 'manual', 'manual']);
  assert.ok(calls.every(({ params }) => params[0] === 12));
  assert.ok(calls.find(({ sql }) => sql.includes('FROM invoices i')).sql.includes('i.appointment_id IS NULL'));
  assert.equal(calls.some(({ sql }) => sql.includes('unified_financial_ledger')), false);
  assert.equal(calls.some(({ sql }) => sql.includes('amount_centavos')), false);
});

test('appointment transaction history uses the same normalized ledger response', async () => {
  const pool = {
    query(sql, params, callback) {
      assert.ok(sql.includes('FROM payments p'));
      assert.deepEqual(params, [42]);
      callback(null, [{
        id: 3,
        appointment_id: 42,
        amount: 75000,
        status: 'paid',
        created_at: '2026-08-23 11:00:00',
        paymongo_payment_id: 'BILLING-123',
        raw_event: { type: 'billing_invoice', method: 'Bank Transfer' },
        design_title: 'Sleeve Session',
      }]);
    },
  };

  const transactions = await createFinancialLedgerService(pool).getAppointmentTransactions(42);
  assert.equal(transactions.length, 1);
  assert.equal(transactions[0].amount, 75000);
  assert.equal(transactions[0].payment_method, 'Bank Transfer');
  assert.equal(transactions[0].description, 'Sleeve Session');
});
