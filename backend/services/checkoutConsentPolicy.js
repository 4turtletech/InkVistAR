const CONSENT_EXISTS_SQL = `EXISTS(
  SELECT 1 FROM consent_records cr
  WHERE cr.appointment_id = ap.id
    AND cr.procedure_consent = 1
    AND cr.payment_consent = 1
    AND cr.health_data_consent = 1
    AND CHAR_LENGTH(cr.waiver_text) >= 20
    AND cr.waiver_hash REGEXP '^[a-f0-9]{64}$'
    AND CHAR_LENGTH(cr.signature_evidence) >= 3
)`;

function isValidStoredConsent(record) {
  return Boolean(record
    && record.procedure_consent
    && record.payment_consent
    && record.health_data_consent
    && String(record.waiver_text || '').trim().length >= 20
    && /^[a-f0-9]{64}$/.test(String(record.waiver_hash || ''))
    && String(record.signature_evidence || '').trim().length >= 3);
}

module.exports = { CONSENT_EXISTS_SQL, isValidStoredConsent };
