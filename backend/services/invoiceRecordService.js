const ALLOWED_PAYMENT_METHODS = new Set(['Cash', 'GCash', 'Bank Transfer', 'Card', 'Digital', 'Manual']);
const STATUS_LABELS = new Map([
  ['paid', 'Paid'],
  ['pending', 'Pending'],
  ['cancelled', 'Cancelled'],
  ['canceled', 'Cancelled'],
]);

class InvoiceRecordInputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvoiceRecordInputError';
    this.statusCode = 400;
  }
}

function cleanText(value, label, maxLength = 255) {
  const cleaned = String(value ?? '').trim();
  if (!cleaned) throw new InvoiceRecordInputError(`${label} is required.`);
  return cleaned.substring(0, maxLength);
}

function buildInvoiceUpdate(input = {}) {
  const assignments = [];
  const values = [];

  if (input.client !== undefined) {
    assignments.push('client_name = ?');
    values.push(cleanText(input.client, 'Client name'));
  }

  if (input.type !== undefined) {
    assignments.push('service_type = ?');
    values.push(cleanText(input.type, 'Service type'));
  }

  if (input.amount !== undefined) {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 99999999.99) {
      throw new InvoiceRecordInputError('Invoice amount must be greater than 0.');
    }
    assignments.push('amount = ?');
    values.push(Math.round(amount * 100) / 100);
  }

  if (input.status !== undefined) {
    const status = STATUS_LABELS.get(String(input.status).trim().toLowerCase());
    if (!status) throw new InvoiceRecordInputError('Invoice status must be Paid, Pending, or Cancelled.');
    assignments.push('status = ?');
    values.push(status);
  }

  if (input.payment_method !== undefined) {
    const method = cleanText(input.payment_method, 'Payment method', 50);
    if (!ALLOWED_PAYMENT_METHODS.has(method)) {
      throw new InvoiceRecordInputError('Unsupported payment method.');
    }
    assignments.push('payment_method = ?');
    values.push(method);
  }

  if (assignments.length === 0) {
    throw new InvoiceRecordInputError('No invoice changes were provided.');
  }

  return { assignments, values };
}

module.exports = {
  InvoiceRecordInputError,
  buildInvoiceUpdate,
};
