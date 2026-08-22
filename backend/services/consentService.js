const crypto = require('node:crypto');
const {
  asPositiveInteger,
  validateConsentInput,
  validateWithdrawalChanges,
} = require('./consentPolicyService');

class ConsentError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function createConsentService(pool, accessService) {
  const database = pool.promise();

  async function decorateConsent(record) {
    if (!record) return null;
    const [withdrawals] = await database.query(
      `SELECT consent_field, effective_value, reason, changed_by_user_id, changed_at
       FROM consent_withdrawal_events WHERE consent_id = ? ORDER BY id ASC`,
      [record.id]
    );
    const effective = {
      photo_consent: Boolean(record.photo_consent),
      marketing_consent: Boolean(record.marketing_consent),
    };
    for (const event of withdrawals) effective[event.consent_field] = Boolean(event.effective_value);
    return {
      ...record,
      ...effective,
      withdrawal_history: withdrawals,
    };
  }

  async function loadConsent(consentId) {
    const id = asPositiveInteger(consentId);
    if (!id) return null;
    const [rows] = await database.query('SELECT * FROM consent_records WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  }

  async function assertConsentAccess(auth, consent, manage = false) {
    if (!consent) throw new ConsentError('consent_not_found', 'Consent record not found.', 404);
    const appointment = consent.appointment_id ? await accessService.getAppointment(consent.appointment_id) : null;
    const allowed = manage
      ? accessService.canManageProcedure(auth, appointment)
      : (appointment ? accessService.canAccessAppointment(auth, appointment) : Number(consent.customer_id) === Number(auth.userId));
    if (!allowed) throw new ConsentError('consent_forbidden', 'You do not have permission to access this consent record.', 403);
    return appointment;
  }

  async function createConsent(auth, input, metadata = {}) {
    const appointment = await accessService.getAppointment(input.appointmentId);
    if (!appointment) throw new ConsentError('appointment_not_found', 'Appointment not found.', 404);
    if (!accessService.canAccessAppointment(auth, appointment)) throw new ConsentError('consent_forbidden', 'You cannot sign for this appointment.', 403);
    if (auth.role === 'artist') throw new ConsentError('consent_forbidden', 'Artists cannot sign customer consent.', 403);

    const validation = validateConsentInput(input);
    if (!validation.valid) throw new ConsentError('consent_invalid', validation.errors[0]);

    const waiverText = String(input.waiverText).trim();
    const waiverHash = crypto.createHash('sha256').update(waiverText, 'utf8').digest('hex');
    const signature = String(input.signatureEvidence).trim().slice(0, 255);
    let witnessName = null;
    const witnessUserId = asPositiveInteger(input.witnessUserId);
    if (witnessUserId) {
      const [witnessRows] = await database.query(
        `SELECT name FROM users
         WHERE id = ? AND user_type IN ('admin', 'manager', 'artist') AND COALESCE(is_deleted, 0) = 0
         LIMIT 1`,
        [witnessUserId]
      );
      if (!witnessRows[0]) throw new ConsentError('witness_invalid', 'The selected staff witness is not available.');
      witnessName = witnessRows[0].name;
    }
    const connection = await database.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.query(
        `INSERT INTO consent_records (
          appointment_id, customer_id, customer_name, procedure_type, waiver_version,
          waiver_text, waiver_hash, signature_evidence, witness_name, payment_consent,
          procedure_consent, health_data_consent, marketing_consent, photo_consent,
          ip_address, device_info, accepted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1, ?, ?, ?, ?, NOW())`,
        [
          appointment.id,
          appointment.customer_id,
          appointment.customer_name,
          appointment.service_type || 'General Service',
          String(input.waiverVersion || '1.0').slice(0, 50),
          waiverText,
          waiverHash,
          signature,
          witnessName,
          input.marketingConsent ? 1 : 0,
          input.photoConsent ? 1 : 0,
          String(metadata.ip || '').split(',')[0].slice(0, 45) || null,
          String(metadata.userAgent || '').slice(0, 1000) || null,
        ]
      );
      await connection.query('UPDATE appointments SET waiver_accepted_at = NOW() WHERE id = ?', [appointment.id]);
      await connection.commit();
      return decorateConsent({
        id: result.insertId,
        appointment_id: appointment.id,
        customer_id: appointment.customer_id,
        waiver_hash: waiverHash,
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async function getForAppointment(auth, appointmentId) {
    const appointment = await accessService.getAppointment(appointmentId);
    if (!appointment) throw new ConsentError('appointment_not_found', 'Appointment not found.', 404);
    if (!accessService.canAccessAppointment(auth, appointment)) throw new ConsentError('consent_forbidden', 'Access denied.', 403);
    const [rows] = await database.query(
      'SELECT * FROM consent_records WHERE appointment_id = ? ORDER BY accepted_at DESC, id DESC LIMIT 1',
      [appointment.id]
    );
    if (!rows[0]) throw new ConsentError('consent_not_found', 'No consent record found.', 404);
    return decorateConsent(rows[0]);
  }

  async function listForCustomer(auth, customerId) {
    const id = asPositiveInteger(customerId);
    const staff = ['admin', 'manager'].includes(auth.role);
    if (!id || (!staff && !(auth.role === 'customer' && Number(auth.userId) === id))) {
      throw new ConsentError('consent_forbidden', 'You may only access your own consent records.', 403);
    }
    const [rows] = await database.query(
      `SELECT cr.*, a.booking_code, a.appointment_date, a.service_type
       FROM consent_records cr LEFT JOIN appointments a ON a.id = cr.appointment_id
       WHERE cr.customer_id = ? ORDER BY cr.accepted_at DESC, cr.id DESC`,
      [id]
    );
    return Promise.all(rows.map(decorateConsent));
  }

  async function changeOptionalConsent(auth, consentId, changes, reason, metadata = {}) {
    const normalized = validateWithdrawalChanges(changes);
    if (!normalized) throw new ConsentError('consent_change_invalid', 'Only photo and marketing consent can be changed.');
    const consent = await loadConsent(consentId);
    await assertConsentAccess(auth, consent, false);
    if (auth.role !== 'customer' || Number(consent.customer_id) !== Number(auth.userId)) {
      throw new ConsentError('consent_forbidden', 'Only the customer can change optional consent.', 403);
    }
    const connection = await database.getConnection();
    try {
      await connection.beginTransaction();
      for (const change of normalized) {
        await connection.query(
          `INSERT INTO consent_withdrawal_events
            (consent_id, consent_field, effective_value, reason, changed_by_user_id, ip_address)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [consent.id, change.field, change.effectiveValue ? 1 : 0, String(reason || 'Customer preference changed').slice(0, 500), auth.userId, String(metadata.ip || '').slice(0, 45) || null]
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return decorateConsent(consent);
  }

  return {
    changeOptionalConsent,
    createConsent,
    getForAppointment,
    listForCustomer,
  };
}

module.exports = { ConsentError, createConsentService };
