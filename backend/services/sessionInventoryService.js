const { validateInventoryMaterial } = require('./materialTraceabilityPolicy');

class InventoryOperationError extends Error {
  constructor(message, statusCode = 400, code = 'inventory_operation_failed') {
    super(message);
    this.name = 'InventoryOperationError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

const asPositiveInteger = (value, label) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new InventoryOperationError(`${label} must be a positive whole number.`);
  }
  return parsed;
};

function getMaterialDisposition(previousStatus, nextStatus) {
  if (!['completed', 'cancelled', 'incomplete'].includes(nextStatus)) return null;
  if (nextStatus === 'completed' || previousStatus === 'in_progress') return 'consume';
  return 'release';
}

const parseJewelrySelections = (value) => {
  if (!value) return [];
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

function createSessionInventoryService(pool) {
  const database = pool.promise();

  async function withTransaction(operation) {
    const connection = await database.getConnection();
    try {
      await connection.beginTransaction();
      const result = await operation(connection);
      await connection.commit();
      return result;
    } catch (error) {
      try { await connection.rollback(); } catch {}
      throw error;
    } finally {
      connection.release();
    }
  }

  async function loadAppointment(connection, appointmentId) {
    const [rows] = await connection.query(
      'SELECT * FROM appointments WHERE id = ? AND COALESCE(is_deleted, 0) = 0 FOR UPDATE',
      [appointmentId]
    );
    if (!rows[0]) throw new InventoryOperationError('Appointment not found.', 404, 'appointment_not_found');
    return rows[0];
  }

  async function reserveInventory(connection, appointmentId, inventoryId, requestedQuantity, options = {}) {
    const quantity = asPositiveInteger(requestedQuantity, 'Quantity');
    const [items] = await connection.query('SELECT * FROM inventory WHERE id = ? FOR UPDATE', [inventoryId]);
    const item = items[0];
    if (!item) throw new InventoryOperationError('Inventory item not found.', 404, 'inventory_not_found');

    const policy = validateInventoryMaterial(item);
    if (!policy.valid) throw new InventoryOperationError(policy.message, 400, 'unsafe_inventory');
    const traceability = policy.snapshot;

    const [holds] = await connection.query(
      `SELECT id, quantity FROM session_materials
       WHERE appointment_id = ? AND inventory_id = ? AND status = 'hold'
         AND IFNULL(batch_number, '') = ? FOR UPDATE`,
      [appointmentId, inventoryId, traceability.batchNumber || '']
    );
    const existingQuantity = holds.reduce((sum, hold) => sum + Number(hold.quantity || 0), 0);
    const quantityToReserve = options.ensureMinimum
      ? Math.max(0, quantity - existingQuantity)
      : quantity;
    if (quantityToReserve === 0) return { item, quantityReserved: 0 };

    if (Number(item.current_stock) < quantityToReserve) {
      throw new InventoryOperationError(
        `Insufficient stock for "${item.name}". Available: ${item.current_stock}, Required: ${quantityToReserve}.`,
        409,
        'insufficient_stock'
      );
    }

    const [stockUpdate] = await connection.query(
      'UPDATE inventory SET current_stock = current_stock - ? WHERE id = ? AND current_stock >= ?',
      [quantityToReserve, inventoryId, quantityToReserve]
    );
    if (stockUpdate.affectedRows !== 1) {
      throw new InventoryOperationError(`Insufficient stock for "${item.name}".`, 409, 'insufficient_stock');
    }

    if (holds[0]) {
      await connection.query(
        'UPDATE session_materials SET quantity = quantity + ? WHERE id = ?',
        [quantityToReserve, holds[0].id]
      );
    } else {
      await connection.query(
        `INSERT INTO session_materials
          (appointment_id, inventory_id, quantity, status, batch_number, lot_number, serial_number, expiration_date)
         VALUES (?, ?, ?, 'hold', ?, ?, ?, ?)`,
        [
          appointmentId, inventoryId, quantityToReserve,
          traceability.batchNumber, traceability.lotNumber,
          traceability.serialNumber, traceability.expirationDate,
        ]
      );
    }
    return { item, quantityReserved: quantityToReserve };
  }

  async function finalizeHolds(connection, appointmentId, disposition, reason) {
    const [materials] = await connection.query(
      `SELECT id, inventory_id, quantity FROM session_materials
       WHERE appointment_id = ? AND status = 'hold' FOR UPDATE`,
      [appointmentId]
    );
    if (!materials.length) return 0;

    if (disposition === 'release') {
      for (const material of materials) {
        await connection.query(
          'UPDATE inventory SET current_stock = current_stock + ? WHERE id = ?',
          [material.quantity, material.inventory_id]
        );
      }
      await connection.query(
        `UPDATE session_materials SET status = 'released'
         WHERE appointment_id = ? AND status = 'hold'`,
        [appointmentId]
      );
      return materials.length;
    }

    await connection.query(
      `UPDATE session_materials SET status = 'consumed'
       WHERE appointment_id = ? AND status = 'hold'`,
      [appointmentId]
    );
    for (const material of materials) {
      await connection.query(
        `INSERT INTO inventory_transactions (inventory_id, type, quantity, reason)
         VALUES (?, 'out', ?, ?)`,
        [material.inventory_id, material.quantity, reason]
      );
    }
    return materials.length;
  }

  async function addMaterial({ appointmentId, inventoryId, quantity }) {
    return withTransaction(async (connection) => {
      const appointment = await loadAppointment(connection, asPositiveInteger(appointmentId, 'Appointment ID'));
      if (['completed', 'cancelled', 'incomplete'].includes(appointment.status)) {
        throw new InventoryOperationError('Materials cannot be added to a closed session.', 409, 'session_closed');
      }
      return reserveInventory(connection, appointment.id, asPositiveInteger(inventoryId, 'Inventory ID'), quantity);
    });
  }

  async function releaseMaterial({ appointmentId, materialId }) {
    return withTransaction(async (connection) => {
      await loadAppointment(connection, asPositiveInteger(appointmentId, 'Appointment ID'));
      const [materials] = await connection.query(
        'SELECT * FROM session_materials WHERE id = ? AND appointment_id = ? FOR UPDATE',
        [asPositiveInteger(materialId, 'Material ID'), appointmentId]
      );
      const material = materials[0];
      if (!material) {
        throw new InventoryOperationError('Material record not found for this appointment.', 404, 'material_not_found');
      }
      if (material.status !== 'hold') {
        throw new InventoryOperationError(
          `Material #${materialId} has already been ${material.status}. It cannot be released twice.`,
          409,
          'material_already_resolved'
        );
      }
      await connection.query(
        `UPDATE session_materials SET status = 'released' WHERE id = ? AND status = 'hold'`,
        [materialId]
      );
      await connection.query(
        'UPDATE inventory SET current_stock = current_stock + ? WHERE id = ?',
        [material.quantity, material.inventory_id]
      );
      return material;
    });
  }

  async function reservePiercingJewelry(connection, appointment) {
    const counts = new Map();
    for (const selection of parseJewelrySelections(appointment.piercing_jewelry)) {
      if (selection?.type !== 'studio') continue;
      const inventoryId = Number(selection.itemId);
      if (!Number.isInteger(inventoryId) || inventoryId <= 0) continue;
      counts.set(inventoryId, (counts.get(inventoryId) || 0) + 1);
    }
    for (const [inventoryId, quantity] of counts) {
      await reserveInventory(connection, appointment.id, inventoryId, quantity, { ensureMinimum: true });
    }
  }

  async function reserveDefaultKit(connection, appointment) {
    const [kitItems] = await connection.query(
      'SELECT inventory_id, default_quantity FROM service_kits WHERE service_type = ?',
      [appointment.service_type || 'General Session']
    );
    for (const kitItem of kitItems) {
      await reserveInventory(
        connection,
        appointment.id,
        kitItem.inventory_id,
        kitItem.default_quantity,
        { ensureMinimum: true }
      );
    }
  }

  async function transitionStatus({ appointmentId, status, price, sessionDuration, auditLog }) {
    return withTransaction(async (connection) => {
      const id = asPositiveInteger(appointmentId, 'Appointment ID');
      const appointment = await loadAppointment(connection, id);
      const previousStatus = appointment.status;

      if (previousStatus !== status) {
        if (status === 'confirmed') await reservePiercingJewelry(connection, appointment);
        if (status === 'in_progress') await reserveDefaultKit(connection, appointment);

        const disposition = getMaterialDisposition(previousStatus, status);
        if (disposition) {
          const reason = status === 'completed'
            ? `Consumed in completed session #${id}`
            : `Consumed after ${status} session #${id}`;
          await finalizeHolds(connection, id, disposition, reason);
        }
      }

      let updateSql = 'UPDATE appointments SET status = ?';
      const params = [status];
      if (price !== undefined && price !== null) {
        updateSql += ', price = ?';
        params.push(price);
      }
      if (sessionDuration !== undefined && sessionDuration !== null) {
        updateSql += ', session_duration = ?';
        params.push(sessionDuration);
      }
      if (auditLog !== undefined && auditLog !== null) {
        updateSql += ', audit_log = ?';
        params.push(typeof auditLog === 'string' ? auditLog : JSON.stringify(auditLog));
      }
      updateSql += ' WHERE id = ?';
      params.push(id);
      await connection.query(updateSql, params);
      return { appointment, previousStatus };
    });
  }

  async function adjustStock({ inventoryId, type, quantity, reason, userId }) {
    if (!['in', 'out'].includes(type)) throw new InventoryOperationError('Invalid stock transaction type.');
    const id = asPositiveInteger(inventoryId, 'Inventory ID');
    const qty = asPositiveInteger(quantity, 'Quantity');
    return withTransaction(async (connection) => {
      const [items] = await connection.query('SELECT * FROM inventory WHERE id = ? FOR UPDATE', [id]);
      const item = items[0];
      if (!item || item.is_deleted) throw new InventoryOperationError('Inventory item not found.', 404, 'inventory_not_found');
      if (type === 'out' && Number(item.current_stock) < qty) {
        throw new InventoryOperationError(
          `Insufficient stock. Available: ${item.current_stock}, Requested: ${qty}.`,
          409,
          'insufficient_stock'
        );
      }
      if (type === 'in') {
        await connection.query(
          'UPDATE inventory SET current_stock = current_stock + ?, last_restocked = ? WHERE id = ?',
          [qty, new Date(), id]
        );
      } else {
        await connection.query(
          'UPDATE inventory SET current_stock = current_stock - ? WHERE id = ? AND current_stock >= ?',
          [qty, id, qty]
        );
      }
      const itemPrice = type === 'in'
        ? Number(item.cost || 0)
        : Number(item.retail_price || item.cost || 0);
      await connection.query(
        `INSERT INTO inventory_transactions (inventory_id, type, quantity, reason, user_id, item_price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, type, qty, String(reason || '').trim() || null, userId || null, itemPrice]
      );
      return { item, quantity: qty };
    });
  }

  async function permanentlyDeleteInventory(inventoryId) {
    return withTransaction(async (connection) => {
      const id = asPositiveInteger(inventoryId, 'Inventory ID');
      const [items] = await connection.query('SELECT id FROM inventory WHERE id = ? FOR UPDATE', [id]);
      if (!items[0]) throw new InventoryOperationError('Inventory item not found.', 404, 'inventory_not_found');
      const [references] = await connection.query(
        'SELECT COUNT(*) AS count FROM session_materials WHERE inventory_id = ?',
        [id]
      );
      if (Number(references[0]?.count || 0) > 0) {
        throw new InventoryOperationError(
          'This item is part of session history and cannot be permanently deleted. Archive it instead.',
          409,
          'inventory_has_history'
        );
      }
      await connection.query('DELETE FROM inventory WHERE id = ?', [id]);
      return { id };
    });
  }

  return {
    addMaterial,
    adjustStock,
    permanentlyDeleteInventory,
    releaseMaterial,
    transitionStatus,
  };
}

module.exports = {
  InventoryOperationError,
  createSessionInventoryService,
  getMaterialDisposition,
};
