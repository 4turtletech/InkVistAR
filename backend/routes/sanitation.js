const express = require('express');
const router = express.Router();

module.exports = (db) => {
  // Cleaning Checklists
  router.get('/checklists', (req, res) => {
    db.query('SELECT * FROM sanitation_checklist_logs ORDER BY logged_at DESC LIMIT 50', (err, results) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, logs: results });
    });
  });

  router.post('/checklists', (req, res) => {
    const { cleanerName, areaName, checklistData, verifiedBy } = req.body;
    const query = 'INSERT INTO sanitation_checklist_logs (cleaner_name, area_name, checklist_data, verified_by) VALUES (?, ?, ?, ?)';
    db.query(query, [cleanerName, areaName, JSON.stringify(checklistData || {}), verifiedBy || null], (err, result) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'Checklist logged', id: result.insertId });
    });
  });

  // Waste Disposal
  router.get('/waste-disposal', (req, res) => {
    db.query('SELECT * FROM waste_disposal_logs ORDER BY disposed_at DESC LIMIT 50', (err, results) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, logs: results });
    });
  });

  router.post('/waste-disposal', (req, res) => {
    const { disposalType, wasteWeightKg, disposalCompany, manifestNumber, disposedBy } = req.body;
    const query = 'INSERT INTO waste_disposal_logs (disposal_type, waste_weight_kg, disposal_company, manifest_number, disposed_by) VALUES (?, ?, ?, ?, ?)';
    db.query(query, [disposalType, wasteWeightKg, disposalCompany, manifestNumber, disposedBy], (err, result) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'Waste disposal manifest logged', id: result.insertId });
    });
  });

  // Health Certificates
  router.get('/health-certificates', (req, res) => {
    db.query('SELECT * FROM staff_health_certificates ORDER BY expiration_date ASC', (err, results) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, certificates: results });
    });
  });

  router.post('/health-certificates', (req, res) => {
    const { userId, staffName, certificateType, issuedDate, expirationDate, documentUrl } = req.body;
    const query = 'INSERT INTO staff_health_certificates (user_id, staff_name, certificate_type, issued_date, expiration_date, document_url) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(query, [userId, staffName, certificateType, issuedDate, expirationDate, documentUrl || null], (err, result) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'Health certificate added', id: result.insertId });
    });
  });

  // Sanitary Permits
  router.get('/studio-permits', (req, res) => {
    db.query('SELECT * FROM studio_sanitary_permits ORDER BY expiration_date ASC', (err, results) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, permits: results });
    });
  });

  router.post('/studio-permits', (req, res) => {
    const { permitType, permitNumber, issuingAuthority, issuedDate, expirationDate, documentUrl } = req.body;
    const query = 'INSERT INTO studio_sanitary_permits (permit_type, permit_number, issuing_authority, issued_date, expiration_date, document_url) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(query, [permitType, permitNumber, issuingAuthority, issuedDate, expirationDate, documentUrl || null], (err, result) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'Sanitary permit logged', id: result.insertId });
    });
  });

  return router;
};
