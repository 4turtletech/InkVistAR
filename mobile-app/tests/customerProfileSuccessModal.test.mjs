import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../screens/CustomerProfilePage.jsx', import.meta.url), 'utf8');

test('successful customer profile edit uses the themed modal instead of a native alert', () => {
  assert.doesNotMatch(source, /Alert\.alert\(['"]Success['"],\s*['"]Profile updated successfully/);
  assert.match(source, /customAlert\(['"]Profile Updated['"],\s*['"]Your profile changes were saved successfully\.['"],\s*\[\],\s*['"]success['"]\)/);
  assert.match(source, /alertModal\.type === 'success'/);
  assert.match(source, /<CheckCircle2 size=\{24\} color=\{theme\.success\} \/>/);
});

test('profile save closes after valid submission and ignores rapid duplicate taps', () => {
  assert.match(source, /if \(profileSaveInFlightRef\.current\) return;/);
  assert.match(source, /profileSaveInFlightRef\.current = true;[\s\S]*setEditProfileVisible\(false\);[\s\S]*updateCustomerProfile/);
  assert.match(source, /finally \{[\s\S]*profileSaveInFlightRef\.current = false;/);
  assert.doesNotMatch(source, /Alert\.alert\(['"]Error['"],\s*res\.message \|\| ['"]Failed to update/);
});
