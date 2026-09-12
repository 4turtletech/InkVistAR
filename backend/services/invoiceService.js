const PAID_STATUSES = new Set(['paid', 'completed']);

const parseJson = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return {};
  }
};

const paymentMethodFromRow = (payment = {}) => {
  const event = parseJson(payment.raw_event);
  const reference = String(payment.paymongo_payment_id || payment.session_id || '');
  const eventType = String(event.type || '').toLowerCase();

  if (event.method) return String(event.method).substring(0, 100);
  if (eventType === 'manual_adjustment' || reference.startsWith('MANUAL-')) return 'Cash';
  if (eventType === 'billing_invoice' || reference.startsWith('BILLING-')) return 'Cash';
  return 'PayMongo';
};

const invoiceNumberForId = (id) => `INV-${String(id).padStart(6, '0')}`;

async function insertInvoiceRecordWithConnection(connection, record) {
  const amount = Math.round(Number(record.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Invoice amount must be greater than zero.');

  if (record.paymentId) {
    const [existing] = await connection.query(
      'SELECT id, invoice_number FROM invoices WHERE payment_id = ? LIMIT 1',
      [record.paymentId]
    );
    if (existing[0]) {
      return { id: existing[0].id, invoiceNumber: existing[0].invoice_number, existing: true };
    }
  }

  if (record.requestKey) {
    const [existing] = await connection.query(
      'SELECT id, invoice_number FROM invoices WHERE request_key = ? LIMIT 1',
      [record.requestKey]
    );
    if (existing[0]) {
      return { id: existing[0].id, invoiceNumber: existing[0].invoice_number, existing: true };
    }
  }

  const [result] = await connection.query(
    `INSERT INTO invoices
     (invoice_number, payment_id, request_key, customer_id, appointment_id, client_name, service_type,
      amount, payment_method, change_given, discount_amount, discount_type, status, items, created_at)
     VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))`,
    [
      record.paymentId || null,
      record.requestKey || null,
      record.customerId || null,
      record.appointmentId || null,
      String(record.clientName || 'Walk-in Customer').trim().substring(0, 255),
      String(record.serviceType || 'Service').trim().substring(0, 255),
      amount,
      record.paymentMethod ? String(record.paymentMethod).substring(0, 100) : null,
      Math.max(0, Number(record.changeGiven) || 0),
      Math.max(0, Number(record.discountAmount) || 0),
      record.discountType || null,
      record.status || 'Paid',
      record.items ? JSON.stringify(record.items) : null,
      record.createdAt || null,
    ]
  );

  const invoiceNumber = invoiceNumberForId(result.insertId);
  await connection.query('UPDATE invoices SET invoice_number = ? WHERE id = ?', [invoiceNumber, result.insertId]);
  return { id: result.insertId, invoiceNumber, existing: false };
}

async function insertInvoiceRecord(database, record) {
  if (!database?.promise) throw new TypeError('A database pool is required.');

  const connection = await database.promise().getConnection();
  try {
    await connection.beginTransaction();
    const invoice = await insertInvoiceRecordWithConnection(connection, record);
    await connection.commit();
    return invoice;
  } catch (error) {
    await connection.rollback();
    if ((record.paymentId || record.requestKey) && error?.code === 'ER_DUP_ENTRY') {
      const [existing] = await database.promise().query(
        `SELECT id, invoice_number FROM invoices
         WHERE (? IS NOT NULL AND payment_id = ?) OR (? IS NOT NULL AND request_key = ?)
         LIMIT 1`,
        [record.paymentId || null, record.paymentId || null, record.requestKey || null, record.requestKey || null]
      );
      if (existing[0]) return { id: existing[0].id, invoiceNumber: existing[0].invoice_number, existing: true };
    }
    throw error;
  } finally {
    connection.release();
  }
}

async function ensureInvoiceForPaidPayment(database, paymentId) {
  const [rows] = await database.promise().query(
    `SELECT p.id AS payment_id, p.amount, p.status, p.raw_event, p.paymongo_payment_id,
            p.session_id, p.created_at, ap.id AS appointment_id, ap.customer_id,
            ap.design_title, ap.service_type, u.name AS client_name
     FROM payments p
     JOIN appointments ap ON ap.id = p.appointment_id
     LEFT JOIN users u ON u.id = ap.customer_id
     WHERE p.id = ? LIMIT 1`,
    [paymentId]
  );

  const payment = rows[0];
  if (!payment || !PAID_STATUSES.has(String(payment.status || '').toLowerCase())) return null;
  const amount = Number(payment.amount || 0) / 100;
  if (amount <= 0) return null;

  const [linked] = await database.promise().query(
    'SELECT id, invoice_number FROM invoices WHERE payment_id = ? LIMIT 1',
    [paymentId]
  );
  if (linked[0]) return { id: linked[0].id, invoiceNumber: linked[0].invoice_number, existing: true };

  // Older manual-payment flows created an invoice but did not link it to its payment row.
  // Link the closest compatible record instead of creating a duplicate.
  const [legacyMatch] = await database.promise().query(
    `SELECT id, invoice_number
     FROM invoices
     WHERE payment_id IS NULL
       AND appointment_id = ?
       AND ABS(amount - ?) < 0.01
       AND payment_method IS NOT NULL
     ORDER BY ABS(TIMESTAMPDIFF(SECOND, created_at, ?)) ASC
     LIMIT 1`,
    [payment.appointment_id, amount, payment.created_at]
  );

  if (legacyMatch[0]) {
    const [update] = await database.promise().query(
      'UPDATE invoices SET payment_id = ? WHERE id = ? AND payment_id IS NULL',
      [paymentId, legacyMatch[0].id]
    );
    if (update.affectedRows) {
      return { id: legacyMatch[0].id, invoiceNumber: legacyMatch[0].invoice_number, existing: true, linked: true };
    }
  }

  return insertInvoiceRecord(database, {
    paymentId,
    customerId: payment.customer_id,
    appointmentId: payment.appointment_id,
    clientName: payment.client_name || `Customer #${payment.customer_id}`,
    serviceType: payment.design_title || payment.service_type || 'Session Payment',
    amount,
    paymentMethod: paymentMethodFromRow(payment),
    status: 'Paid',
    createdAt: payment.created_at,
  });
}

async function backfillPaidPaymentInvoices(database) {
  const [rows] = await database.promise().query(
    `SELECT p.id
     FROM payments p
     LEFT JOIN invoices i ON i.payment_id = p.id
     WHERE LOWER(p.status) IN ('paid', 'completed')
       AND p.appointment_id IS NOT NULL
       AND p.amount > 0
       AND i.id IS NULL
     ORDER BY p.id ASC`
  );

  let created = 0;
  let linked = 0;
  for (const row of rows) {
    const result = await ensureInvoiceForPaidPayment(database, row.id);
    if (result?.linked) linked += 1;
    else if (result && !result.existing) created += 1;
  }
  return { inspected: rows.length, created, linked };
}

module.exports = {
  backfillPaidPaymentInvoices,
  ensureInvoiceForPaidPayment,
  insertInvoiceRecord,
  insertInvoiceRecordWithConnection,
  invoiceNumberForId,
  paymentMethodFromRow,
};
