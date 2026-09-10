import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { mapPasswordRecoveryFailure } from '../src/utils/passwordRecoveryValidation.js';

const resetSource = readFileSync(new URL('../screens/ResetPasswordPage.jsx', import.meta.url), 'utf8');
const loginSource = readFileSync(new URL('../screens/LoginPage.jsx', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../App.js', import.meta.url), 'utf8');

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

test('reused passwords and invalid recovery codes map to their inline fields', () => {
  assert.deepEqual(
    mapPasswordRecoveryFailure({ code: 'password_reused', message: 'New password cannot be the same as the old password.' }),
    { password: 'New password cannot be the same as the old password.' },
  );
  assert.deepEqual(
    mapPasswordRecoveryFailure({ code: 'recovery_token_invalid', message: 'The recovery code is invalid or expired.' }),
    { recoveryToken: 'The recovery code is invalid or expired.' },
  );
});

test('password reset failure alerts are not emitted by App', () => {
  assert.doesNotMatch(appSource, /Failed to update password:/);
  assert.match(resetSource, /mapPasswordRecoveryFailure\(result\)/);
});

test('reset submit button retains its full shape while loading', () => {
  assert.match(resetSource, /style=\{styles\.buttonContainer\}/);
  assert.match(resetSource, /buttonContainer:\s*\{\s*width: '100%', height: 48/);
  assert.match(resetSource, /button:\s*\{\s*width: '100%', height: '100%'/);
  assert.match(resetSource, /<Text style=\{styles\.buttonText\}>Submit<\/Text>/);
});

test('reset padlock uses a stable themed badge instead of a gradient', () => {
  assert.match(resetSource, /backgroundColor: theme\.primaryLight, borderColor: theme\.gold/);
  assert.match(resetSource, /<Lock size=\{28\} color=\{theme\.gold\} \/>/);
  assert.doesNotMatch(resetSource, /<LinearGradient[^>]+style=\{styles\.iconWrap\}/);
});

test('successful password reset uses an in-app modal before returning to sign in', () => {
  assert.doesNotMatch(appSource, /Alert\.alert\(['"]Success['"],\s*['"]Password updated/);
  assert.match(resetSource, /setSuccessVisible\(true\)/);
  assert.match(resetSource, /<Modal[\s\S]*visible=\{successVisible\}/);
  assert.match(resetSource, />Password Updated<\/Text>/);
  assert.match(resetSource, />Continue to Sign In<\/Text>/);
  assert.match(appSource, /onComplete=\{handlePasswordResetComplete\}/);
});
