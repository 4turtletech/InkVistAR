const PAID_STATUSES = new Set(['paid', 'succeeded', 'successful', 'completed']);

const toIntegerCentavos = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.round(number));
};

const pesosToCentavos = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.round(number * 100));
};

const calculatePayablePricePesos = (price, discountAmount = 0, discountType = null) => {
  const basePrice = Math.max(0, Number(price) || 0);
  const rawDiscount = Math.max(0, Number(discountAmount) || 0);
  const normalizedType = String(discountType || '').toLowerCase();
  const discountPesos = normalizedType === 'percent' || normalizedType === 'percentage'
    ? basePrice * Math.min(rawDiscount, 100) / 100
    : Math.min(rawDiscount, basePrice);

  return Math.round((basePrice - discountPesos) * 100) / 100;
};

const summarizeAppointmentFinances = (appointment) => {
  const totalPaid = Math.max(0, Number(appointment.total_paid) || 0);
  const payablePrice = calculatePayablePricePesos(
    appointment.price,
    appointment.discount_amount,
    appointment.discount_type
  );

  return {
    payable_price: payablePrice,
    total_paid: Math.round(totalPaid * 100) / 100,
    remaining_balance: Math.max(0, Math.round((payablePrice - totalPaid) * 100) / 100),
  };
};

const parseRawEvent = (rawEvent) => {
  if (!rawEvent) return {};
  if (typeof rawEvent === 'object') return rawEvent;

  try {
    return JSON.parse(rawEvent);
  } catch (_error) {
    return {};
  }
};

const normalizeStatus = (status) => String(status || 'pending').toLowerCase();

const normalizePayment = (row) => {
  const rawEvent = parseRawEvent(row.raw_event);
  const { raw_event: _rawEvent, ...safeRow } = row;
  const rawType = String(rawEvent.type || '').toLowerCase();
  const reference = String(row.paymongo_payment_id || row.session_id || '');
  const isManual = rawType === 'manual_adjustment'
    || rawType === 'billing_invoice'
    || reference.startsWith('MANUAL-')
    || reference.startsWith('BILLING-');
  const method = rawEvent.method || (isManual ? 'Manual Payment' : 'PayMongo');
  const status = normalizeStatus(row.status);
  const amountCentavos = toIntegerCentavos(row.amount);

  return {
    ...safeRow,
    ledger_id: `payment-${row.id}`,
    amount: amountCentavos,
    amount_centavos: amountCentavos,
    status,
    type: isManual ? 'manual' : 'digital',
    payment_type: isManual ? 'manual' : 'digital',
    payment_method: method,
    description: row.design_title || 'Tattoo Service',
    formatted_amount: (amountCentavos / 100).toFixed(2),
    is_paid: PAID_STATUSES.has(status),
  };
};

const normalizeLegacyManualPayment = (row) => {
  const amountCentavos = pesosToCentavos(row.manual_paid_amount);

  return {
    id: `legacy-manual-${row.appointment_id}`,
    ledger_id: `legacy-manual-${row.appointment_id}`,
    appointment_id: row.appointment_id,
    amount: amountCentavos,
    amount_centavos: amountCentavos,
    status: 'paid',
    currency: 'PHP',
    created_at: row.created_at,
    paymongo_payment_id: null,
    session_id: null,
    type: 'manual',
    payment_type: 'manual',
    payment_method: row.manual_payment_method || 'Manual Payment',
    design_title: row.design_title || 'Tattoo Service',
    description: row.design_title || 'Tattoo Service',
    formatted_amount: (amountCentavos / 100).toFixed(2),
    is_paid: true,
  };
};

const normalizeStandaloneInvoice = (row) => {
  const amountCentavos = pesosToCentavos(row.amount);
  const status = normalizeStatus(row.status);

  return {
    id: `invoice-${row.id}`,
    ledger_id: `invoice-${row.id}`,
    appointment_id: null,
    amount: amountCentavos,
    amount_centavos: amountCentavos,
    status,
    currency: 'PHP',
    created_at: row.created_at,
    paymongo_payment_id: row.invoice_number,
    session_id: null,
    type: 'manual',
    payment_type: 'manual',
    payment_method: row.payment_method || 'POS',
    design_title: row.service_type || 'Studio Purchase',
    description: row.service_type || 'Studio Purchase',
    invoice_number: row.invoice_number,
    formatted_amount: (amountCentavos / 100).toFixed(2),
    is_paid: PAID_STATUSES.has(status),
  };
};

const query = (pool, sql, params) => new Promise((resolve, reject) => {
  pool.query(sql, params, (error, rows) => {
    if (error) reject(error);
    else resolve(rows);
  });
});

const createFinancialLedgerService = (pool) => ({
  async getAppointmentTransactions(appointmentId) {
    const rows = await query(pool, `
      SELECT
        p.id,
        p.appointment_id,
        p.amount,
        p.status,
        p.currency,
        p.created_at,
        p.session_id,
        p.paymongo_payment_id,
        p.raw_event,
        a.design_title
      FROM payments p
      JOIN appointments a ON a.id = p.appointment_id
      WHERE p.appointment_id = ?
      ORDER BY p.created_at DESC, p.id DESC
    `, [appointmentId]);

    return rows.map(normalizePayment);
  },

  async getCustomerTransactions(customerId) {
    const [paymentRows, legacyManualRows, invoiceRows] = await Promise.all([
      query(pool, `
        SELECT
          p.id,
          p.appointment_id,
          p.amount,
          p.status,
          p.currency,
          p.created_at,
          p.session_id,
          p.paymongo_payment_id,
          p.raw_event,
          a.design_title
        FROM payments p
        JOIN appointments a ON a.id = p.appointment_id
        WHERE a.customer_id = ? AND a.is_deleted = 0
      `, [customerId]),
      query(pool, `
        SELECT
          a.id AS appointment_id,
          a.design_title,
          a.manual_paid_amount,
          a.manual_payment_method,
          a.created_at
        FROM appointments a
        WHERE a.customer_id = ?
          AND a.is_deleted = 0
          AND COALESCE(a.manual_paid_amount, 0) > 0
      `, [customerId]),
      query(pool, `
        SELECT
          i.id,
          i.invoice_number,
          i.amount,
          i.status,
          i.payment_method,
          i.service_type,
          i.created_at
        FROM invoices i
        WHERE i.customer_id = ?
          AND i.appointment_id IS NULL
      `, [customerId]),
    ]);

    return [
      ...paymentRows.map(normalizePayment),
      ...legacyManualRows.map(normalizeLegacyManualPayment),
      ...invoiceRows.map(normalizeStandaloneInvoice),
    ].sort((left, right) => {
      const dateDifference = new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      return dateDifference || String(right.ledger_id).localeCompare(String(left.ledger_id));
    });
  },
});

module.exports = {
  PAID_STATUSES,
  calculatePayablePricePesos,
  createFinancialLedgerService,
  normalizeLegacyManualPayment,
  normalizePayment,
  normalizeStandaloneInvoice,
  pesosToCentavos,
  summarizeAppointmentFinances,
  toIntegerCentavos,
};
