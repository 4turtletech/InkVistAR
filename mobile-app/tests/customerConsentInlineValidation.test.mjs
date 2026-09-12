import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { customerSignatureError, signatureMatchesFullName } from '../src/utils/consentValidation.js';

const source = readFileSync(new URL('../screens/CustomerAppointments.jsx', import.meta.url), 'utf8');

test('consent waiver validation stays inside the modal instead of opening native alerts', () => {
  const start = source.indexOf('const submitConsentAndPay = async () => {');
  const end = source.indexOf('const triggerPayment = async', start);
  const submitFlow = source.slice(start, end);

  assert.match(submitFlow, /const nextErrors = \{\}/);
  assert.match(submitFlow, /nextErrors\.ageConfirmed/);
  assert.match(submitFlow, /nextErrors\.signatureEvidence/);
  assert.match(submitFlow, /setConsentErrors\(\{ submission:/);
  assert.doesNotMatch(submitFlow, /Alert\.alert/);
});

test('each required waiver choice and signature can render and clear its inline error', () => {
  assert.match(source, /consentErrors\[field\].*accessibilityRole="alert"/s);
  assert.match(source, /borderColor: consentErrors\.signatureEvidence \? theme\.error : theme\.border/);
  assert.match(source, /setConsentErrors\(current => \(\{ \.\.\.current, \[field\]: '' \}\)\)/);
  assert.match(source, /consentErrors\.submission.*modalS\.submissionError/s);
});

test('electronic signature must match the customer profile name', () => {
  assert.equal(signatureMatchesFullName('  JUAN   dela Cruz ', 'Juan dela Cruz'), true);
  assert.equal(signatureMatchesFullName('Juan Cruz', 'Juan dela Cruz'), false);
  assert.equal(customerSignatureError('Juan Cruz', 'Juan dela Cruz'), 'Signature must match your profile full name exactly.');
  assert.equal(customerSignatureError('Juan dela Cruz', 'Juan dela Cruz'), '');
  assert.match(source, /customerSignatureError\(\s*consentForm\.signatureEvidence,\s*selectedAppointment\.customer_name/s);
});
