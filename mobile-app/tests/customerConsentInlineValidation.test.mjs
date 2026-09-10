import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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
