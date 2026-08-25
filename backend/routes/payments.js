const express = require('express');
const router = express.Router();

const formatCentavosToPHP = (centavos) => {
  return (centavos / 100).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
};

module.exports = (db, logAction, getAdminId) => {
  // ════════════════════════════════════════════════════════════════════
  // TASK 7: CONSOLIDATED UNIFIED CUSTOMER TRANSACTION LEDGER
  // ════════════════════════════════════════════════════════════════════
  router.get('/customer/:id/transactions', (req, res) => {
    const customerId = parseInt(req.params.id, 10);
    if (isNaN(customerId)) {
      return res.status(400).json({ success: false, message: 'Valid customer ID required.' });
    }

    const unifiedQuery = `
      SELECT 
        'digital' as payment_type,
        CONCAT('PAYMONGO-', p.id) as reference_id,
        p.amount_centavos,
        (p.amount_centavos / 100.0) as amount,
        p.status,
        p.currency,
        a.design_title as description,
        p.created_at,
        a.id as appointment_id
      FROM payments p
      JOIN appointments a ON p.appointment_id = a.id
      WHERE a.customer_id = ? AND p.status IN ('paid', 'succeeded', 'successful')

      UNION ALL

      SELECT 
        'manual_cash' as payment_type,
        CONCAT('MANUAL-', a.id) as reference_id,
        a.manual_paid_centavos as amount_centavos,
        (a.manual_paid_centavos / 100.0) as amount,
        'paid' as status,
        'PHP' as currency,
        CONCAT(a.design_title, ' (Cash Payment)') as description,
        a.created_at,
        a.id as appointment_id
      FROM appointments a
      WHERE a.customer_id = ? AND a.manual_paid_centavos > 0 AND a.is_deleted = 0

      UNION ALL

      SELECT 
        l.transaction_type as payment_type,
        COALESCE(l.reference_code, CONCAT('LEDGER-', l.id)) as reference_id,
        l.amount_centavos,
        (l.amount_centavos / 100.0) as amount,
        'completed' as status,
        'PHP' as currency,
        CONCAT('Ledger Record: ', l.transaction_type, ' (', l.notes, ')') as description,
        l.created_at,
        l.appointment_id
      FROM unified_financial_ledger l
      WHERE l.customer_id = ?

      ORDER BY created_at DESC
    `;

    db.query(unifiedQuery, [customerId, customerId, customerId], (err, results) => {
      if (err) {
        console.error('[ERROR] Consolidated ledger query failed:', err.message);
        return res.status(500).json({ success: false, message: 'Database error fetching ledger.' });
      }

      const formatted = results.map(row => ({
        ...row,
        formatted_amount: formatCentavosToPHP(row.amount_centavos)
      }));

      res.json({ success: true, transactions: formatted });
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // TASK 7: POS CASH DRAWER SESSION MANAGEMENT
  // ════════════════════════════════════════════════════════════════════
  router.get('/pos/drawer/active', (req, res) => {
    const query = 'SELECT * FROM pos_drawer_sessions WHERE status = "open" ORDER BY opened_at DESC LIMIT 1';
    db.query(query, (err, results) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, session: results[0] || null });
    });
  });

  router.post('/pos/drawer/open', (req, res) => {
    const { userId, startingFloat } = req.body;
    const floatCentavos = Math.round((parseFloat(startingFloat) || 0) * 100);

    const query = 'INSERT INTO pos_drawer_sessions (opened_by_user_id, starting_float_centavos, status) VALUES (?, ?, "open")';
    db.query(query, [userId || 1, floatCentavos], (err, result) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'Cash drawer opened', sessionId: result.insertId });
    });
  });

  router.post('/pos/drawer/close', (req, res) => {
    const { sessionId, userId, actualCash, closingNotes } = req.body;
    const actualCentavos = Math.round((parseFloat(actualCash) || 0) * 100);

    db.query('SELECT * FROM pos_drawer_sessions WHERE id = ? AND status = "open"', [sessionId], (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ success: false, message: 'Active drawer session not found' });
      }

      const sess = results[0];
      const varianceCentavos = actualCentavos - sess.starting_float_centavos;

      const updateQuery = `
        UPDATE pos_drawer_sessions SET
          closed_by_user_id = ?,
          closed_at = NOW(),
          actual_cash_centavos = ?,
          variance_centavos = ?,
          closing_notes = ?,
          status = "closed"
        WHERE id = ?
      `;

      db.query(updateQuery, [userId || 1, actualCentavos, varianceCentavos, closingNotes || null, sessionId], (updErr) => {
        if (updErr) return res.status(500).json({ success: false, message: updErr.message });
        res.json({ 
          success: true, 
          message: 'Cash drawer closed and reconciled', 
          actualCash: actualCash, 
          variance: varianceCentavos / 100 
        });
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // TASK 7: DAILY SETTLEMENT RECONCILIATION
  // ════════════════════════════════════════════════════════════════════
  router.get('/pos/settlements', (req, res) => {
    const query = 'SELECT * FROM daily_settlements ORDER BY settlement_date DESC LIMIT 30';
    db.query(query, (err, results) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, settlements: results });
    });
  });

  router.post('/pos/settlements', (req, res) => {
    const { settlementDate, digitalCentavos, cashCentavos, discountsCentavos, refundsCentavos, userId, notes } = req.body;
    const date = settlementDate || new Date().toISOString().split('T')[0];

    const query = `
      INSERT INTO daily_settlements (settlement_date, total_digital_centavos, total_cash_centavos, total_discounts_centavos, total_refunds_centavos, reconciled_by_user_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        total_digital_centavos = VALUES(total_digital_centavos),
        total_cash_centavos = VALUES(total_cash_centavos),
        total_discounts_centavos = VALUES(total_discounts_centavos),
        total_refunds_centavos = VALUES(total_refunds_centavos),
        notes = VALUES(notes)
    `;

    db.query(query, [date, digitalCentavos || 0, cashCentavos || 0, discountsCentavos || 0, refundsCentavos || 0, userId || 1, notes || null], (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'Daily settlement reconciled successfully.' });
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // TASK 7: PRINTABLE RECEIPT HISTORY
  // ════════════════════════════════════════════════════════════════════
  router.get('/billing/receipts/:appointmentId', (req, res) => {
    const appointmentId = parseInt(req.params.appointmentId, 10);
    const query = `
      SELECT 
        a.id as appointment_id,
        a.design_title,
        a.service_type,
        a.price_centavos,
        a.deposit_centavos,
        a.manual_paid_centavos,
        a.discount_centavos,
        (a.price_centavos - a.deposit_centavos - a.manual_paid_centavos - a.discount_centavos) as balance_due_centavos,
        u.name as customer_name,
        u.email as customer_email,
        a.created_at
      FROM appointments a
      JOIN users u ON a.customer_id = u.id
      WHERE a.id = ?
    `;

    db.query(query, [appointmentId], (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ success: false, message: 'Receipt not found' });
      }

      const r = results[0];
      res.json({
        success: true,
        receipt: {
          ...r,
          formatted_price: formatCentavosToPHP(r.price_centavos || 0),
          formatted_deposit: formatCentavosToPHP(r.deposit_centavos || 0),
          formatted_manual_paid: formatCentavosToPHP(r.manual_paid_centavos || 0),
          formatted_discount: formatCentavosToPHP(r.discount_centavos || 0),
          formatted_balance_due: formatCentavosToPHP(Math.max(0, r.balance_due_centavos || 0))
        }
      });
    });
  });

  return router;
};
