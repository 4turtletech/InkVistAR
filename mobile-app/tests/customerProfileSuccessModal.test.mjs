import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../screens/CustomerProfilePage.jsx', import.meta.url), 'utf8');
const artistSource = readFileSync(new URL('../screens/ArtistProfile.jsx', import.meta.url), 'utf8');

test('successful customer profile edit uses the themed modal instead of a native alert', () => {
  assert.doesNotMatch(source, /Alert\.alert\(['"]Success['"],\s*['"]Profile updated successfully/);
  assert.match(source, /customAlert\(['"]Profile Updated['"],\s*['"]Your profile changes were saved successfully\.['"],\s*\[\],\s*['"]success['"]\)/);
  assert.match(source, /alertModal\.type === 'success'/);
  assert.match(source, /<CheckCircle2 size=\{24\} color=\{theme\.success\} \/>/);
});

test('profile save closes after valid submission and ignores rapid duplicate taps', () => {
  assert.match(source, /if \(profileSaveInFlightRef\.current\) return;/);
  assert.match(source, /profileSaveInFlightRef\.current = true;[\s\S]*updateCustomerProfile[\s\S]*if \(res\.success\) \{[\s\S]*setEditProfileVisible\(false\);/);
  assert.doesNotMatch(source, /profileSaveInFlightRef\.current = true;[\s\S]{0,200}setEditProfileVisible\(false\);/);
  assert.match(source, /finally \{[\s\S]*profileSaveInFlightRef\.current = false;/);
  assert.doesNotMatch(source, /Alert\.alert\(['"]Error['"],\s*res\.message \|\| ['"]Failed to update/);
});

test('change-password action stays outside the bounded keyboard-aware scroll region', () => {
  assert.match(source, /style=\{\[styles\.modalCard, styles\.passwordModalCard\]\}/);
  assert.match(source, /style=\{styles\.passwordScroll\}/);
  assert.match(source, /contentContainerStyle=\{styles\.passwordScrollContent\}/);
  assert.match(source, /keyboardDismissMode=\{Platform\.OS === 'ios' \? 'interactive' : 'on-drag'\}/);

  const scrollEnd = source.indexOf('</ScrollView>', source.indexOf('style={styles.passwordScroll}'));
  const actions = source.indexOf('<View style={styles.passwordActions}>', scrollEnd);
  assert.ok(scrollEnd > -1 && actions > scrollEnd, 'Password actions should remain fixed below the scroll area.');
});

test('password success message asks for a new-password login without a second OTP', () => {
  for (const profileSource of [source, artistSource]) {
    assert.match(profileSource, /Your password was updated successfully\. Please sign in with your new password\./);
    assert.doesNotMatch(profileSource, /6-digit verification code was sent/);
  }
});
