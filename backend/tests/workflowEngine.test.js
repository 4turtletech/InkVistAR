const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const { createConsentService } = require('../services/consentService');
const { isValidStoredConsent } = require('../services/checkoutConsentPolicy');
const { normalizeHealthScreeningInput } = require('../services/healthScreeningPolicy');
const {
  validateConsentInput,
  validateWithdrawalChanges,
} = require('../services/consentPolicyService');

const adultConsent = {
  appointmentId: 42,
  procedureConsent: true,
  paymentConsent: true,
  healthDataConsent: true,
  ageConfirmed: true,
  marketingConsent: false,
  photoConsent: false,
  signatureEvidence: 'Customer Name',
  waiverVersion: 'task-1-test',
  waiverText: 'Age Verification: I confirm that I am at least 18 years old. Exact waiver text retained for this signed consent record.',
};

test('required consents are independent and optional photo consent defaults to declined', () => {
  const valid = validateConsentInput(adultConsent, { allow_minors: false }, new Date('2026-08-22T00:00:00Z'));
  assert.equal(valid.valid, true);

  const missingPayment = validateConsentInput(
    { ...adultConsent, paymentConsent: false },
    { allow_minors: false },
    new Date('2026-08-22T00:00:00Z')
  );
  assert.equal(missingPayment.valid, false);
  assert.match(missingPayment.errors.join(' '), /Payment consent is required/);
  assert.equal(adultConsent.photoConsent, false);

  const missingAgeConfirmation = validateConsentInput({ ...adultConsent, ageConfirmed: false });
  assert.equal(missingAgeConfirmation.valid, false);
  assert.match(missingAgeConfirmation.errors.join(' '), /18 years old or older/);
});

test('withdrawal events accept only optional consent fields', () => {
  assert.deepEqual(validateWithdrawalChanges({ photo_consent: false }), [
    { field: 'photo_consent', effectiveValue: false },
  ]);
  assert.equal(validateWithdrawalChanges({ procedure_consent: false }), null);
  assert.equal(validateWithdrawalChanges({ photo_consent: false, arbitrary_column: true }), null);
});

test('health screening snapshots are normalized without trusting account identity fields', () => {
  const screening = normalizeHealthScreeningInput({
    customerId: 999,
    artistId: 999,
    conditions: ['Diabetes', '<script>', 'Diabetes'],
    allergens: ['Nickel'],
    medicationsBloodThinners: '<b>Aspirin</b>',
    siteSkinCondition: 'Normal',
  }, '2026-08-22 12:00:00');
  assert.deepEqual(screening.conditions, ['Diabetes', 'script']);
  assert.deepEqual(screening.allergens, ['Nickel']);
  assert.equal(screening.hasDiabetes, true);
  assert.equal(screening.medicationsBloodThinners, 'bAspirin/b');
  assert.equal(screening.customerId, undefined);
  assert.equal(screening.artistId, undefined);
});

test('checkout accepts only complete, server-hashed consent records', () => {
  const complete = {
    procedure_consent: 1,
    payment_consent: 1,
    health_data_consent: 1,
    waiver_text: adultConsent.waiverText,
    waiver_hash: crypto.createHash('sha256').update(adultConsent.waiverText).digest('hex'),
    signature_evidence: adultConsent.signatureEvidence,
  };
  assert.equal(isValidStoredConsent(complete), true);
  assert.equal(isValidStoredConsent({ ...complete, payment_consent: 0 }), false);
  assert.equal(isValidStoredConsent({ ...complete, waiver_hash: 'N/A' }), false);
});

test('consent creation derives appointment identity and hashes the exact waiver on the server', async () => {
  const connectionQueries = [];
  const connection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() { throw new Error('Valid consent should not roll back.'); },
    release() {},
    async query(sql, params = []) {
      connectionQueries.push({ sql, params });
      if (sql.includes('INSERT INTO consent_records')) return [{ insertId: 99 }];
      return [{ affectedRows: 1 }];
    },
  };
  const database = {
    async getConnection() { return connection; },
    async query(sql) {
      if (sql.includes("section = 'age_policy'")) return [[]];
      if (sql.includes('consent_withdrawal_events')) return [[]];
      return [[]];
    },
  };
  const pool = { promise: () => database };
  const accessService = {
    async getAppointment() {
      return { id: 42, customer_id: 7, artist_id: 8, customer_name: 'Database Customer', service_type: 'Tattoo' };
    },
    canAccessAppointment(auth, appointment) {
      return auth.role === 'customer' && auth.userId === appointment.customer_id;
    },
    canManageProcedure() { return false; },
  };
  const service = createConsentService(pool, accessService);
  const consent = await service.createConsent(
    { userId: 7, role: 'customer' },
    { ...adultConsent, customerId: 999, customerName: 'Forged Name', waiverHash: 'forged' },
    { ip: '127.0.0.1', userAgent: 'test-agent' }
  );

  const insert = connectionQueries.find(({ sql }) => sql.includes('INSERT INTO consent_records'));
  assert.ok(insert);
  assert.equal(insert.params[1], 7);
  assert.equal(insert.params[2], 'Database Customer');
  assert.equal(insert.params[6], crypto.createHash('sha256').update(adultConsent.waiverText).digest('hex'));
  assert.notEqual(insert.params[6], 'forged');
  assert.equal(insert.params[9], 0);
  assert.equal(insert.params[10], 0);
  assert.equal(consent.id, 99);
});
