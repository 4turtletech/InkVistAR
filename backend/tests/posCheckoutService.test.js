const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  PosCheckoutError,
  calculatePosTotals,
  executePosCheckout,
  formatExistingSale,
  normalizePosCheckoutInput,
} = require('../services/posCheckoutService');

test('POS input accepts supported methods and rejects a zero-total discount', () => {
  const normalized = normalizePosCheckoutInput({
    requestKey: '1234567890abcdef',
    paymentMethod: 'Cash',
    amountTendered: 100,
    discountType: 'custom',
    customDiscount: 25,
    items: [{ id: 4, quantity: 2 }],
  });
  assert.equal(normalized.requestKey, 'POS-1234567890abcdef');
  assert.equal(normalized.discountPercent, 25);
  assert.throws(
    () => normalizePosCheckoutInput({ ...normalized, requestKey: '1234567890abcdef', customDiscount: 100 }),
    PosCheckoutError
  );
});

test('POS totals use locked database prices instead of client prices', () => {
  const totals = calculatePosTotals(
    [{ id: 4, name: 'Aftercare Balm', current_stock: 5, retail_price: 250, retail_price_centavos: 25000, is_deleted: 0 }],
    [{ id: 4, quantity: 2, retail_price: 1 }],
    20
  );
  assert.equal(totals.subtotalCentavos, 50000);
  assert.equal(totals.discountCentavos, 10000);
  assert.equal(totals.totalCentavos, 40000);
});

test('retried POS checkout returns the same complete receipt shape', () => {
  const sale = formatExistingSale({
    id: 81,
    invoice_number: 'INV-000081',
    client_name: 'Walk-in Customer',
    amount: '225.00',
    discount_amount: '25.00',
    payment_method: 'Cash',
    change_given: '75.00',
    items: JSON.stringify([{ id: 4, name: 'Aftercare Balm', quantity: 1, retail_price: 250 }]),
    created_at: '2026-09-10 12:00:00',
  });
  assert.equal(sale.subtotal, 250);
  assert.equal(sale.amount_tendered, 300);
  assert.equal(sale.items[0].name, 'Aftercare Balm');
  assert.equal(sale.existing, true);
});

test('POS checkout commits invoice, stock, and audit rows in one transaction', async () => {
  const calls = [];
  const connection = {
    async beginTransaction() { calls.push('begin'); },
    async commit() { calls.push('commit'); },
    async rollback() { calls.push('rollback'); },
    release() { calls.push('release'); },
    async query(sql) {
      calls.push(sql);
      if (sql.includes('FROM invoices WHERE request_key')) return [[]];
      if (sql.includes('FROM inventory WHERE id IN')) {
        return [[{ id: 4, name: 'Aftercare Balm', current_stock: 5, retail_price: 250, retail_price_centavos: 25000, is_deleted: 0 }]];
      }
      if (sql.startsWith('INSERT INTO invoices')) return [{ insertId: 81 }];
      if (sql.startsWith('UPDATE invoices SET invoice_number')) return [{ affectedRows: 1 }];
      if (sql.includes('UPDATE inventory SET current_stock')) return [{ affectedRows: 1 }];
      if (sql.includes('INSERT INTO inventory_transactions')) return [{ insertId: 91 }];
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
  const database = { promise: () => ({ getConnection: async () => connection }) };

  const sale = await executePosCheckout({
    database,
    userId: 1,
    createdAt: '2026-09-10 12:00:00',
    input: {
      requestKey: '1234567890abcdef',
      paymentMethod: 'Cash',
      amountTendered: 300,
      discountType: 'none',
      items: [{ id: 4, quantity: 1 }],
    },
  });

  assert.equal(sale.invoice_number, 'INV-000081');
  assert.equal(sale.change_given, 50);
  assert.deepEqual(calls.filter(call => typeof call === 'string' && ['begin', 'commit', 'rollback', 'release'].includes(call)), ['begin', 'commit', 'release']);
});

test('POS checkout rolls the invoice back when stock cannot be deducted', async () => {
  const calls = [];
  const connection = {
    async beginTransaction() { calls.push('begin'); },
    async commit() { calls.push('commit'); },
    async rollback() { calls.push('rollback'); },
    release() { calls.push('release'); },
    async query(sql) {
      if (sql.includes('FROM invoices WHERE request_key')) return [[]];
      if (sql.includes('FROM inventory WHERE id IN')) {
        return [[{ id: 4, name: 'Aftercare Balm', current_stock: 1, retail_price: 250, retail_price_centavos: 25000, is_deleted: 0 }]];
      }
      if (sql.startsWith('INSERT INTO invoices')) return [{ insertId: 82 }];
      if (sql.startsWith('UPDATE invoices SET invoice_number')) return [{ affectedRows: 1 }];
      if (sql.includes('UPDATE inventory SET current_stock')) return [{ affectedRows: 0 }];
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
  const database = { promise: () => ({ getConnection: async () => connection }) };

  await assert.rejects(
    executePosCheckout({
      database,
      userId: 1,
      createdAt: '2026-09-10 12:00:00',
      input: {
        requestKey: 'fedcba0987654321',
        paymentMethod: 'Cash',
        amountTendered: 250,
        discountType: 'none',
        items: [{ id: 4, quantity: 1 }],
      },
    }),
    error => error instanceof PosCheckoutError && error.statusCode === 409
  );
  assert.deepEqual(calls, ['begin', 'rollback', 'release']);
});

test('web billing uses atomic endpoints, retry keys, real invoice routes, and pagination guards', () => {
  const pos = fs.readFileSync(path.join(__dirname, '..', '..', 'web-app', 'src', 'pages', 'AdminPOS.js'), 'utf8');
  const billing = fs.readFileSync(path.join(__dirname, '..', '..', 'web-app', 'src', 'pages', 'AdminBilling.js'), 'utf8');
  const notifications = fs.readFileSync(path.join(__dirname, '..', '..', 'web-app', 'src', 'pages', 'CustomerNotifications.js'), 'utf8');
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

  assert.match(pos, /\/api\/admin\/pos\/checkout/);
  assert.doesNotMatch(pos, /Promise\.all\(promises\)/);
  assert.match(billing, /requestKey: invoiceRequestKeyRef\.current/);
  assert.match(billing, /const loadSection = async/);
  assert.match(billing, /invoiceRequest[\s\S]*finally\(\(\) => setLoading\(false\)\)/);
  assert.match(billing, /Math\.min\(page, Math\.max\(1, totalPages\)\)/);
  assert.match(notifications, /customer\/invoice\/\$\{encodeURIComponent\(invoiceNumber\)\}/);
  assert.match(notifications, /message\?\.match\(\/INV-/);
  assert.match(server, /'pos_invoice',[\s\S]*invoice\.id/);
  assert.doesNotMatch(server, /This is just a MOCK invoice/);
});
