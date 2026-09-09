import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const resetSource = readFileSync(new URL('../screens/ResetPasswordPage.jsx', import.meta.url), 'utf8');
const loginSource = readFileSync(new URL('../screens/LoginPage.jsx', import.meta.url), 'utf8');

test('password recovery fields use matching live-theme surfaces and text colors', () => {
  assert.match(resetSource, /backgroundColor:\s*theme\.surface/);
  assert.match(resetSource, /backgroundColor:\s*theme\.darkBgSecondary/);
  assert.match(resetSource, /color:\s*theme\.textPrimary/);
  assert.doesNotMatch(resetSource, /card:\s*\{\s*backgroundColor:\s*['"]#ffffff['"]/);
});

test('forgot-password email modal follows theme changes', () => {
  assert.match(loginSource, /backgroundColor:\s*theme\.surface/);
  assert.match(loginSource, /placeholderTextColor=\{theme\.textTertiary\}/);
  assert.match(loginSource, /style=\{\[styles\.input, \{ color: theme\.textPrimary \}\]\}/);
});

test('Android reset form avoids height resizing during keyboard transitions', () => {
  assert.match(resetSource, /enabled=\{Platform\.OS === 'ios'\}/);
  assert.doesNotMatch(resetSource, /Platform\.OS === 'ios' \? 'padding' : 'height'/);
});
