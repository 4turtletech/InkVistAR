import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  REPORT_DETAILS_MAX_LENGTH,
  reportDetailsError,
} from '../src/utils/reportValidation.js';

const source = readFileSync(new URL('../screens/CustomerReports.jsx', import.meta.url), 'utf8');

test('report details reject empty, too-short, and excessive input', () => {
  assert.equal(reportDetailsError('   '), 'Details are required.');
  assert.equal(reportDetailsError('Too short'), 'Please enter at least 10 characters.');
  assert.equal(reportDetailsError('A useful description of the issue.'), '');
  assert.match(reportDetailsError('x'.repeat(REPORT_DETAILS_MAX_LENGTH + 1)), /cannot exceed/);
});

test('Reports & Feedback renders field errors instead of validation alerts', () => {
  const start = source.indexOf('const handleSubmit = async () => {');
  const end = source.indexOf('const triggerSuccessAnimation', start);
  const submitFlow = source.slice(start, end);

  assert.match(submitFlow, /reportDetailsError\(message\)/);
  assert.match(source, /accessibilityRole="alert"/);
  assert.match(source, /styles\.textInputError/);
  assert.doesNotMatch(submitFlow, /Alert\.alert/);
});
