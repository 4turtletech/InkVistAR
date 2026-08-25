const express = require('express');
const router = express.Router();

// Helper to wrap db.query in Promise if needed
const queryAsync = (db, sql, params = []) => new Promise((resolve, reject) => {
  db.query(sql, params, (err, results) => {
    if (err) reject(err);
    else resolve(results);
  });
});

module.exports = (db, logAction, getAdminId) => {
  // GET all inventory items
  router.get('/', (req, res) => {
    const status = req.query.status || 'all';
    let sql = 'SELECT * FROM inventory WHERE is_deleted = 0 ORDER BY name ASC';
    if (status === 'deleted') {
      sql = 'SELECT * FROM inventory WHERE is_deleted = 1 ORDER BY name ASC';
    }
    db.query(sql, (err, results) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, inventory: results });
    });
  });

  // POST add new inventory item (with Centavos & Traceability)
  router.post('/', (req, res) => {
    const { 
      name, category, currentStock, minStock, maxStock, unit, supplier, cost, retailPrice, image,
      manufacturer, lot_number, batch_number, serial_number, manufacture_date, expiration_date, date_opened, is_single_use, recall_status, storage_requirements 
    } = req.body;

    const costCentavos = Math.round((parseFloat(cost) || 0) * 100);
    const retailCentavos = Math.round((parseFloat(retailPrice) || 0) * 100);

    const query = `
      INSERT INTO inventory (
        name, category, current_stock, min_stock, max_stock, unit, supplier, cost, retail_price, image, last_restocked,
        manufacturer, lot_number, batch_number, serial_number, manufacture_date, expiration_date, date_opened, is_single_use, recall_status, storage_requirements,
        cost_centavos, retail_price_centavos
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      name, category, currentStock || 0, minStock || 5, maxStock || 100, unit || 'pcs', supplier || null, cost || 0, retailPrice || 0, image || null,
      manufacturer || null, lot_number || null, batch_number || null, serial_number || null, manufacture_date || null, expiration_date || null, date_opened || null,
      is_single_use !== undefined ? is_single_use : true, recall_status || 'none', storage_requirements || null,
      costCentavos, retailCentavos
    ];

    db.query(query, params, (err, result) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'Item added successfully', id: result.insertId });
    });
  });

  // PUT update inventory item
  router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { 
      name, category, currentStock, minStock, maxStock, unit, supplier, cost, retailPrice, image,
      manufacturer, lot_number, batch_number, serial_number, manufacture_date, expiration_date, date_opened, is_single_use, recall_status, storage_requirements 
    } = req.body;

    const costCentavos = Math.round((parseFloat(cost) || 0) * 100);
    const retailCentavos = Math.round((parseFloat(retailPrice) || 0) * 100);

    const query = `
      UPDATE inventory SET
        name = ?, category = ?, current_stock = ?, min_stock = ?, max_stock = ?, unit = ?, supplier = ?, cost = ?, retail_price = ?, image = ?,
        manufacturer = ?, lot_number = ?, batch_number = ?, serial_number = ?, manufacture_date = ?, expiration_date = ?, date_opened = ?,
        is_single_use = ?, recall_status = ?, storage_requirements = ?, cost_centavos = ?, retail_price_centavos = ?
      WHERE id = ?
    `;

    const params = [
      name, category, currentStock, minStock, maxStock, unit, supplier, cost, retailPrice, image || null,
      manufacturer || null, lot_number || null, batch_number || null, serial_number || null, manufacture_date || null, expiration_date || null, date_opened || null,
      is_single_use !== undefined ? is_single_use : true, recall_status || 'none', storage_requirements || null,
      costCentavos, retailCentavos, id
    ];

    db.query(query, params, (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'Item updated successfully' });
    });
  });

  // DELETE inventory item (Soft delete to preserve session history)
  router.delete('/:id', (req, res) => {
    const { id } = req.params;
    db.query('UPDATE inventory SET is_deleted = 1 WHERE id = ?', [id], (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'Item archived successfully' });
    });
  });

  // RESTORE archived inventory item
  router.put('/:id/restore', (req, res) => {
    const { id } = req.params;
    db.query('UPDATE inventory SET is_deleted = 0 WHERE id = ?', [id], (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'Item restored successfully' });
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // TASK 6: TRANSACTIONAL MATERIAL RELEASE (Single Canonical Route)
  // ════════════════════════════════════════════════════════════════════
  router.post('/appointments/:id/release-material', async (req, res) => {
    const appointmentId = parseInt(req.params.id, 10);
    const materialId = parseInt(req.body.materialId, 10);

    if (isNaN(appointmentId) || isNaN(materialId)) {
      return res.status(400).json({ success: false, message: 'Valid appointmentId and materialId are required.' });
    }

    try {
      // 1. Begin atomic transaction
      await queryAsync(db, 'START TRANSACTION');

      // 2. Fetch session material with row lock FOR UPDATE
      const materials = await queryAsync(
        db,
        'SELECT * FROM session_materials WHERE id = ? AND appointment_id = ? FOR UPDATE',
        [materialId, appointmentId]
      );

      if (materials.length === 0) {
        await queryAsync(db, 'ROLLBACK');
        return res.status(404).json({ success: false, message: 'Material record not found for this appointment.' });
      }

      const mat = materials[0];

      // 3. Double-release prevention guard
      if (mat.status !== 'hold') {
        await queryAsync(db, 'ROLLBACK');
        return res.status(400).json({ success: false, message: `Material #${materialId} has already been ${mat.status}. Cannot release twice.` });
      }

      // 4. Update status to 'released'
      await queryAsync(db, 'UPDATE session_materials SET status = "released" WHERE id = ?', [materialId]);

      // 5. Restore stock atomically
      await queryAsync(db, 'UPDATE inventory SET current_stock = current_stock + ? WHERE id = ?', [mat.quantity, mat.inventory_id]);

      // 6. Commit transaction
      await queryAsync(db, 'COMMIT');
      return res.json({ success: true, message: 'Material returned to inventory successfully inside transaction.' });
    } catch (error) {
      await queryAsync(db, 'ROLLBACK');
      console.error('[ERROR] Release material transaction failed:', error.message);
      return res.status(500).json({ success: false, message: 'Transaction error while releasing material: ' + error.message });
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // TASK 6: TRANSACTIONAL MATERIAL HOLD (With Expired & Recalled Block)
  // ════════════════════════════════════════════════════════════════════
  router.post('/appointments/:id/materials', async (req, res) => {
    const appointmentId = parseInt(req.params.id, 10);
    const { inventory_id, quantity, batch_number, lot_number, serial_number, expiration_date } = req.body;
    const qty = parseInt(quantity, 10) || 1;

    if (isNaN(appointmentId) || isNaN(inventory_id) || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Valid appointment_id, inventory_id, and positive quantity required.' });
    }

    try {
      await queryAsync(db, 'START TRANSACTION');

      // Lock inventory item row
      const items = await queryAsync(db, 'SELECT * FROM inventory WHERE id = ? FOR UPDATE', [inventory_id]);
      if (items.length === 0) {
        await queryAsync(db, 'ROLLBACK');
        return res.status(404).json({ success: false, message: 'Inventory item not found.' });
      }

      const item = items[0];

      // Expired & Recalled Stock Block
      if (item.recall_status === 'recalled') {
        await queryAsync(db, 'ROLLBACK');
        return res.status(400).json({ success: false, message: `Cannot use item "${item.name}": Item is RECALLED by manufacturer.` });
      }

      if (item.expiration_date && new Date(item.expiration_date) < new Date()) {
        await queryAsync(db, 'ROLLBACK');
        return res.status(400).json({ success: false, message: `Cannot use item "${item.name}": Stock has EXPIRED (${item.expiration_date}).` });
      }

      // Negative Stock Prevention Guard
      if (item.current_stock < qty) {
        await queryAsync(db, 'ROLLBACK');
        return res.status(400).json({ success: false, message: `Insufficient stock for "${item.name}". Available: ${item.current_stock}, Requested: ${qty}` });
      }

      // Deduct stock
      await queryAsync(db, 'UPDATE inventory SET current_stock = current_stock - ? WHERE id = ?', [qty, inventory_id]);

      // Check existing hold
      const existingHolds = await queryAsync(
        db,
        'SELECT id FROM session_materials WHERE appointment_id = ? AND inventory_id = ? AND status = "hold" AND IFNULL(batch_number, "") = ? FOR UPDATE',
        [appointmentId, inventory_id, batch_number || ""]
      );

      if (existingHolds.length > 0) {
        await queryAsync(db, 'UPDATE session_materials SET quantity = quantity + ? WHERE id = ?', [qty, existingHolds[0].id]);
      } else {
        await queryAsync(
          db,
          'INSERT INTO session_materials (appointment_id, inventory_id, quantity, status, batch_number, lot_number, serial_number, expiration_date) VALUES (?, ?, ?, "hold", ?, ?, ?, ?)',
          [appointmentId, inventory_id, qty, batch_number || item.batch_number || null, lot_number || item.lot_number || null, serial_number || item.serial_number || null, expiration_date || item.expiration_date || null]
        );
      }

      await queryAsync(db, 'COMMIT');
      return res.json({ success: true, message: 'Material added to session successfully.' });
    } catch (error) {
      await queryAsync(db, 'ROLLBACK');
      console.error('[ERROR] Add material transaction failed:', error.message);
      return res.status(500).json({ success: false, message: 'Transaction error: ' + error.message });
    }
  });

  return router;
};
