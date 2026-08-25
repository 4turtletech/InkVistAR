const express = require('express');
const router = express.Router();

const queryAsync = (db, sql, params = []) => new Promise((resolve, reject) => {
  db.query(sql, params, (err, results) => {
    if (err) reject(err);
    else resolve(results);
  });
});

module.exports = (db, logAction, getAdminId) => {
  // GET all appointments
  router.get('/', (req, res) => {
    const query = `
      SELECT a.*, c.name as customer_name, c.email as customer_email, art.name as artist_name
      FROM appointments a
      LEFT JOIN users c ON a.customer_id = c.id
      LEFT JOIN users art ON a.artist_id = art.id
      WHERE a.is_deleted = 0
      ORDER BY a.appointment_date DESC, a.start_time DESC
    `;
    db.query(query, (err, results) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, appointments: results });
    });
  });

  // GET appointment by ID
  router.get('/:id', (req, res) => {
    const { id } = req.params;
    const query = `
      SELECT a.*, c.name as customer_name, c.email as customer_email, art.name as artist_name
      FROM appointments a
      LEFT JOIN users c ON a.customer_id = c.id
      LEFT JOIN users art ON a.artist_id = art.id
      WHERE a.id = ? AND a.is_deleted = 0
    `;
    db.query(query, [id], (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ success: false, message: 'Appointment not found' });
      }
      res.json({ success: true, appointment: results[0] });
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // TASK 6: STATUS UPDATE WITH SESSION COMPLETION GUARD FOR UNRESOLVED HOLDS
  // ════════════════════════════════════════════════════════════════════
  router.put('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status, price, isFullyComplete, sessionDuration, auditLog } = req.body;

    try {
      // 1. Completion Guard Check: If marking completed, check for unresolved material holds
      if (status === 'completed') {
        const activeHolds = await queryAsync(
          db,
          'SELECT COUNT(*) as count FROM session_materials WHERE appointment_id = ? AND status = "hold"',
          [id]
        );

        if (activeHolds[0].count > 0) {
          return res.status(400).json({
            success: false,
            message: `Cannot complete session: There are ${activeHolds[0].count} material(s) still on 'hold'. Return unused items to inventory or confirm consumption before completing.`
          });
        }
      }

      // 2. Perform status update
      const updateParams = [status];
      let sql = 'UPDATE appointments SET status = ?, updated_at = NOW()';

      if (price !== undefined) {
        sql += ', price = ?, price_centavos = ?';
        updateParams.push(price, Math.round((parseFloat(price) || 0) * 100));
      }

      sql += ' WHERE id = ?';
      updateParams.push(id);

      await queryAsync(db, sql, updateParams);
      return res.json({ success: true, message: `Appointment status updated to ${status}` });
    } catch (err) {
      console.error('[ERROR] Appointment status update failed:', err.message);
      return res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
  });

  return router;
};
