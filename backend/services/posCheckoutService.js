const { insertInvoiceRecordWithConnection } = require('./invoiceService');

const PAYMENT_METHODS = new Set(['Cash', 'Card', 'GCash']);
const DISCOUNT_RATES = Object.freeze({
  none: 0,
  pwd_senior: 20,
  promo_10: 10,
});

class PosCheckoutError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'PosCheckoutError';
    this.statusCode = statusCode;
  }
}

function normalizeRequestKey(value) {
  const key = String(value || '').trim();
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(key)) {
    throw new PosCheckoutError('A valid checkout request key is required. Please reopen checkout and try again.');
  }
  return `POS-${key}`;
}

function normalizePosCheckoutInput(input = {}) {
  if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > 100) {
    throw new PosCheckoutError('Add at least one valid item to the sale.');
  }

  const combined = new Map();
  input.items.forEach((item) => {
    const id = Number(item?.id);
    const quantity = Number(item?.quantity);
    if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(quantity) || quantity <= 0 || quantity > 10000) {
      throw new PosCheckoutError('Every sale item must have a valid product and whole-number quantity.');
    }
    combined.set(id, (combined.get(id) || 0) + quantity);
  });

  const paymentMethod = String(input.paymentMethod || input.payment_method || '').trim();
  if (!PAYMENT_METHODS.has(paymentMethod)) throw new PosCheckoutError('Select a supported payment method.');

  const discountType = String(input.discountType || input.discount_type || 'none').trim().toLowerCase();
  if (!(discountType in DISCOUNT_RATES) && discountType !== 'custom') {
    throw new PosCheckoutError('Select a supported discount type.');
  }
  const discountPercent = discountType === 'custom'
    ? Number(input.customDiscount ?? input.custom_discount)
    : DISCOUNT_RATES[discountType];
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent >= 100) {
    throw new PosCheckoutError('Discount must be between 0% and 99.99%.');
  }

  const customerId = input.customerId === '' || input.customerId == null
    ? null
    : Number(input.customerId);
  if (customerId !== null && (!Number.isInteger(customerId) || customerId <= 0)) {
    throw new PosCheckoutError('Select a valid customer or use Walk-in Customer.');
  }

  return {
    requestKey: normalizeRequestKey(input.requestKey),
    customerId,
    paymentMethod,
    amountTendered: Number(input.amountTendered ?? input.amount_tendered),
    discountType,
    discountPercent,
    items: [...combined.entries()].map(([id, quantity]) => ({ id, quantity })),
  };
}

function calculatePosTotals(inventoryRows, requestedItems, discountPercent) {
  const byId = new Map(inventoryRows.map((row) => [Number(row.id), row]));
  const items = requestedItems.map((requested) => {
    const row = byId.get(requested.id);
    if (!row || Number(row.is_deleted || 0) === 1) {
      throw new PosCheckoutError(`Product #${requested.id} is no longer available.`, 409);
    }
    if (Number(row.current_stock) < requested.quantity) {
      throw new PosCheckoutError(`${row.name} only has ${Number(row.current_stock)} remaining.`, 409);
    }
    const storedCentavos = Number(row.retail_price_centavos);
    const unitCentavos = storedCentavos > 0
      ? Math.round(storedCentavos)
      : Math.round(Number(row.retail_price || row.cost || 0) * 100);
    if (!Number.isInteger(unitCentavos) || unitCentavos <= 0) {
      throw new PosCheckoutError(`${row.name} needs a valid selling price before checkout.`, 409);
    }
    return {
      id: requested.id,
      name: String(row.name || `Product #${requested.id}`).substring(0, 255),
      quantity: requested.quantity,
      retail_price: unitCentavos / 100,
      unitCentavos,
    };
  });

  const subtotalCentavos = items.reduce((sum, item) => sum + (item.unitCentavos * item.quantity), 0);
  const discountCentavos = Math.round(subtotalCentavos * (discountPercent / 100));
  const totalCentavos = subtotalCentavos - discountCentavos;
  if (totalCentavos <= 0) throw new PosCheckoutError('The sale total must be greater than zero.');

  return { items, subtotalCentavos, discountCentavos, totalCentavos };
}

function parseStoredItems(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function formatExistingSale(row) {
  const amount = Number(row.amount) || 0;
  const discountAmount = Number(row.discount_amount) || 0;
  const changeGiven = Number(row.change_given) || 0;
  return {
    id: row.id,
    invoice_number: row.invoice_number,
    client_name: row.client_name,
    subtotal: amount + discountAmount,
    discount_amount: discountAmount,
    amount,
    payment_method: row.payment_method,
    amount_tendered: amount + changeGiven,
    change_given: changeGiven,
    items: parseStoredItems(row.items),
    created_at: row.created_at,
    existing: true,
  };
}

async function executePosCheckout({ database, input, userId, createdAt }) {
  if (!database?.promise) throw new TypeError('A database pool is required.');
  const normalized = normalizePosCheckoutInput(input);
  const connection = await database.promise().getConnection();

  try {
    await connection.beginTransaction();

    const [existingRows] = await connection.query(
      `SELECT id, invoice_number, client_name, amount, discount_amount, payment_method,
              change_given, items, created_at
       FROM invoices WHERE request_key = ? LIMIT 1`,
      [normalized.requestKey]
    );
    if (existingRows[0]) {
      await connection.commit();
      return formatExistingSale(existingRows[0]);
    }

    let clientName = 'Walk-in Customer';
    if (normalized.customerId) {
      const [customers] = await connection.query(
        `SELECT id, name FROM users
         WHERE id = ? AND user_type = 'customer' AND COALESCE(is_deleted, 0) = 0
         LIMIT 1 FOR UPDATE`,
        [normalized.customerId]
      );
      if (!customers[0]) throw new PosCheckoutError('The selected customer is no longer available.', 409);
      clientName = customers[0].name;
    }

    const inventoryIds = normalized.items.map((item) => item.id);
    const [inventoryRows] = await connection.query(
      `SELECT id, name, current_stock, cost, retail_price, retail_price_centavos, is_deleted
       FROM inventory WHERE id IN (?) FOR UPDATE`,
      [inventoryIds]
    );
    const totals = calculatePosTotals(inventoryRows, normalized.items, normalized.discountPercent);
    const total = totals.totalCentavos / 100;
    const tendered = normalized.paymentMethod === 'Cash' ? normalized.amountTendered : total;
    if (!Number.isFinite(tendered) || tendered < total) {
      throw new PosCheckoutError('The amount tendered is less than the total due.');
    }
    const changeGiven = normalized.paymentMethod === 'Cash' ? tendered - total : 0;

    const invoiceItems = totals.items.map(({ unitCentavos, ...item }) => item);
    const invoice = await insertInvoiceRecordWithConnection(connection, {
      requestKey: normalized.requestKey,
      customerId: normalized.customerId,
      clientName,
      serviceType: 'Retail POS Sale',
      amount: total,
      paymentMethod: normalized.paymentMethod,
      changeGiven,
      discountAmount: totals.discountCentavos / 100,
      discountType: normalized.discountType === 'none' ? null : normalized.discountType,
      status: 'Paid',
      items: invoiceItems,
      createdAt,
    });

    for (const item of totals.items) {
      const [stockUpdate] = await connection.query(
        `UPDATE inventory SET current_stock = current_stock - ?
         WHERE id = ? AND current_stock >= ?`,
        [item.quantity, item.id, item.quantity]
      );
      if (stockUpdate.affectedRows !== 1) {
        throw new PosCheckoutError(`${item.name} no longer has enough stock.`, 409);
      }
      await connection.query(
        `INSERT INTO inventory_transactions
         (inventory_id, type, quantity, reason, user_id, item_price)
         VALUES (?, 'out', ?, ?, ?, ?)`,
        [item.id, item.quantity, `POS Sale ${invoice.invoiceNumber}`, userId || null, item.unitCentavos / 100]
      );
    }

    await connection.commit();
    return {
      id: invoice.id,
      invoice_number: invoice.invoiceNumber,
      client_name: clientName,
      subtotal: totals.subtotalCentavos / 100,
      discount_amount: totals.discountCentavos / 100,
      amount: total,
      payment_method: normalized.paymentMethod,
      amount_tendered: tendered,
      change_given: changeGiven,
      items: invoiceItems,
      created_at: createdAt,
      existing: false,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  PosCheckoutError,
  calculatePosTotals,
  executePosCheckout,
  formatExistingSale,
  normalizePosCheckoutInput,
};
