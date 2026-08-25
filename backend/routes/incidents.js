const express = require('express');
const router = express.Router();

module.exports = (db) => {
  // Report incident
  router.post('/', (req, res) => {
    const { customerId, appointmentId, reportedBy, incidentType, severity, description, photos } = req.body;
    const incidentCode = 'INC-' + Date.now().toString().slice(-6);
    const emergencyEscalation = (severity === 'high' || severity === 'critical') ? 1 : 0;

    const query = `
      INSERT INTO incident_reports (
        incident_code, customer_id, appointment_id, reported_by, incident_type, severity, description, photos, emergency_escalation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(query, [incidentCode, customerId, appointmentId || null, reportedBy || 'Customer', incidentType, severity || 'medium', description, JSON.stringify(photos || []), emergencyEscalation], (err, result) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'Incident reported successfully', incidentCode, id: result.insertId, emergencyEscalation: Boolean(emergencyEscalation) });
    });
  });

  // Admin get all incidents
  router.get('/admin', (req, res) => {
    const query = `
      SELECT ir.*, u.name as customer_name, u.email as customer_email, a.design_title
      FROM incident_reports ir
      LEFT JOIN users u ON ir.customer_id = u.id
      LEFT JOIN appointments a ON ir.appointment_id = a.id
      ORDER BY 
        CASE ir.severity 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          ELSE 4 
        END,
        ir.created_at DESC
    `;
    db.query(query, (err, results) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, incidents: results });
    });
  });

  // Customer get incidents
  router.get('/customer/:customerId', (req, res) => {
    db.query('SELECT * FROM incident_reports WHERE customer_id = ? ORDER BY created_at DESC', [req.params.customerId], (err, results) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, incidents: results });
    });
  });

  // Respond to incident / update status
  router.put('/:id/respond', (req, res) => {
    const { staffResponse, medicalReferralRequired, status, resolutionNotes } = req.body;
    const query = `
      UPDATE incident_reports SET
        staff_response = COALESCE(?, staff_response),
        medical_referral_required = COALESCE(?, medical_referral_required),
        status = COALESCE(?, status),
        resolution_notes = COALESCE(?, resolution_notes)
      WHERE id = ?
    `;
    db.query(query, [staffResponse || null, medicalReferralRequired !== undefined ? (medicalReferralRequired ? 1 : 0) : null, status || null, resolutionNotes || null, req.params.id], (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'Incident updated' });
    });
  });

  return router;
};
