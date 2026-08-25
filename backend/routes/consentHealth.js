const express = require('express');
const router = express.Router();

const calculateAgeFromDOB = (dobString) => {
  if (!dobString) return null;
  const dob = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
};

module.exports = (db) => {
  // ════════════════════════════════════════════════════════════════════
  // CONSENT & AGE / GUARDIAN VERIFICATION
  // ════════════════════════════════════════════════════════════════════
  router.post('/consents', (req, res) => {
    const { 
      appointmentId, customerId, dateOfBirth, idType, idLastFour,
      guardianName, guardianRelationship, guardianIdNumber, guardianSignature, guardianPresent,
      medicalConditionsAcknowledged, aftercareAcknowledged, risksAcknowledged, signatureData, witnessName 
    } = req.body;

    const calculatedAge = calculateAgeFromDOB(dateOfBirth);

    const query = `
      INSERT INTO consent_records (
        appointment_id, customer_id, date_of_birth, calculated_age, id_type, id_last_four,
        guardian_name, guardian_relationship, guardian_id_number, guardian_signature, guardian_present,
        medical_conditions_acknowledged, aftercare_acknowledged, risks_acknowledged, signature_data, witness_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      appointmentId || null, customerId, dateOfBirth || null, calculatedAge, idType || null, idLastFour || null,
      guardianName || null, guardianRelationship || null, guardianIdNumber || null, guardianSignature || null, guardianPresent ? 1 : 0,
      medicalConditionsAcknowledged ? 1 : 1, aftercareAcknowledged ? 1 : 1, risksAcknowledged ? 1 : 1, signatureData || null, witnessName || null
    ];

    db.query(query, params, (err, result) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'Consent record created', consentId: result.insertId, age: calculatedAge });
    });
  });

  router.get('/consents/appointment/:id', (req, res) => {
    db.query('SELECT * FROM consent_records WHERE appointment_id = ? AND status = "active" ORDER BY id DESC LIMIT 1', [req.params.id], (err, results) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, consent: results[0] || null });
    });
  });

  router.put('/consents/:id/verify-id', (req, res) => {
    const { staffId } = req.body;
    db.query('UPDATE consent_records SET id_verified_by = ?, id_verified_at = NOW() WHERE id = ?', [staffId || 1, req.params.id], (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'ID verified successfully' });
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // PER-SESSION HEALTH SCREENING
  // ════════════════════════════════════════════════════════════════════
  router.post('/health-screenings', (req, res) => {
    const {
      appointmentId, customerId, allergies, medicationsBloodThinners, hasDiabetes,
      hasSkinDisorders, isPregnantNursing, hasBleedingConditions, hasImmuneConditions,
      recentIllnessInfection, alcoholDrugInfluence, siteSkinCondition
    } = req.body;

    const query = `
      INSERT INTO session_health_screenings (
        appointment_id, customer_id, allergies, medications_blood_thinners, has_diabetes,
        has_skin_disorders, is_pregnant_nursing, has_bleeding_conditions, has_immune_conditions,
        recent_illness_infection, alcohol_drug_influence, site_skin_condition
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      appointmentId, customerId, allergies || null, medicationsBloodThinners || null,
      hasDiabetes ? 1 : 0, hasSkinDisorders ? 1 : 0, isPregnantNursing ? 1 : 0,
      hasBleedingConditions ? 1 : 0, hasImmuneConditions ? 1 : 0, recentIllnessInfection ? 1 : 0,
      alcoholDrugInfluence ? 1 : 0, siteSkinCondition || null
    ];

    db.query(query, params, (err, result) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'Health screening saved', screeningId: result.insertId });
    });
  });

  router.get('/health-screenings/appointment/:id', (req, res) => {
    db.query('SELECT * FROM session_health_screenings WHERE appointment_id = ? ORDER BY id DESC LIMIT 1', [req.params.id], (err, results) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, screening: results[0] || null });
    });
  });

  router.put('/health-screenings/:id/review', (req, res) => {
    const { artistId, clearanceStatus, refusalReason } = req.body;
    const query = 'UPDATE session_health_screenings SET reviewed_by_artist_id = ?, reviewed_at = NOW(), clearance_status = ?, refusal_reason = ? WHERE id = ?';
    db.query(query, [artistId || 1, clearanceStatus, refusalReason || null, req.params.id], (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: `Health screening review updated to ${clearanceStatus}` });
    });
  });

  return router;
};
