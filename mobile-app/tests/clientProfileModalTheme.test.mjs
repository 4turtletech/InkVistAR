import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  new URL('../src/components/Admin/ClientProfileModal.jsx', import.meta.url),
  'utf8',
);

test('client edit modal follows the active theme for its sheet and fields', () => {
  assert.match(source, /const \{ theme \} = useTheme\(\)/);
  assert.match(source, /const styles = getStyles\(theme\)/);
  assert.match(source, /modalCard:\s*\{[^}]*backgroundColor: colors\.surface/);
  assert.match(source, /input:\s*\{[^}]*backgroundColor: colors\.surfaceLight[^}]*color: colors\.textPrimary/);
  assert.doesNotMatch(source, /modalCard:\s*\{[^}]*backgroundColor:\s*['"]#fff(?:fff)?['"]/);
});

test('client edit modal remains usable with the keyboard open', () => {
  assert.match(source, /behavior=\{Platform\.OS === 'ios' \? 'padding' : undefined\}/);
  assert.match(source, /keyboardShouldPersistTaps="handled"/);
  assert.match(source, /modalCard:\s*\{[^}]*height: '90%'/);
});

test('client edit failures are displayed inline without native alerts', () => {
  assert.doesNotMatch(source, /Alert\.alert/);
  assert.match(source, /accessibilityRole="alert" style=\{styles\.inlineError\}/);
  assert.match(source, /accessibilityRole="alert" style=\{styles\.saveError\}/);
});
