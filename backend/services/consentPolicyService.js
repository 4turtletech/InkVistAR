const OPTIONAL_CONSENT_FIELDS = new Set(['photo_consent', 'marketing_consent']);

const asPositiveInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

function validateConsentInput(input) {
  const errors = [];
  if (input.ageConfirmed !== true) errors.push('You must confirm that you are 18 years old or older.');
  if (!input.procedureConsent) errors.push('Procedure consent is required.');
  if (!input.paymentConsent) errors.push('Payment consent is required.');
  if (!input.healthDataConsent) errors.push('Health-data consent is required.');
  if (String(input.signatureEvidence || '').trim().length < 3) errors.push('Waiver acceptance evidence is required.');
  if (String(input.waiverText || '').trim().length < 20) errors.push('The exact waiver text is required.');
  if (!/(?:at least 18 years (?:old|of age)|18 years old or older)/i.test(String(input.waiverText || ''))) {
    errors.push('The signed waiver must contain the adult age confirmation.');
  }
  return { valid: errors.length === 0, errors };
}

function validateWithdrawalChanges(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (!entries.length || entries.some(([field]) => !OPTIONAL_CONSENT_FIELDS.has(field))) return null;
  return entries.map(([field, effectiveValue]) => ({ field, effectiveValue: Boolean(effectiveValue) }));
}

module.exports = {
  OPTIONAL_CONSENT_FIELDS,
  asPositiveInteger,
  validateConsentInput,
  validateWithdrawalChanges,
};
