import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appSource = readFileSync(new URL('../App.js', import.meta.url), 'utf8');
const registerSource = readFileSync(new URL('../screens/RegisterPage.jsx', import.meta.url), 'utf8');

test('registration failures render inline without a native failure alert', () => {
  assert.doesNotMatch(
    appSource,
    /Alert\.alert\(['"]Registration Failed['"]/,
    'Registration failures must not open a native alert over the closing CAPTCHA modal.',
  );
  assert.match(registerSource, /accessibilityRole="alert"/);
  assert.match(registerSource, /submit:\s*message/);
});

test('duplicate email failures are attached to the email field', () => {
  assert.match(registerSource, /const isEmailConflict = \/email\/i\.test\(message\)/);
  assert.match(registerSource, /email:\s*isEmailConflict \? message : prev\.email/);
});

test('Android registration does not height-resize the form while its keyboard closes', () => {
  assert.match(registerSource, /enabled=\{Platform\.OS === 'ios'\}/);
  assert.doesNotMatch(registerSource, /Platform\.OS === 'ios' \? 'padding' : 'height'/);
});
