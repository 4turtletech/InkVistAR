import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appSource = readFileSync(new URL('../App.js', import.meta.url), 'utf8');
const appConfig = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8'));

test('Android root always paints the screen behind the system navigation area', () => {
  assert.match(appSource, /backgroundColor:\s*theme\.backgroundDeep/);
  assert.equal(appConfig.expo.splash.backgroundColor, '#0f0d0e');
  assert.deepEqual(appConfig.expo.androidNavigationBar, {
    visible: 'immersive',
    barStyle: 'light-content',
    backgroundColor: '#0f0d0e',
    enforceContrast: false,
  });
});

test('Android immersive mode is restored when the app becomes active', () => {
  assert.match(appSource, /AppState\.addEventListener\('change'/);
  assert.match(appSource, /nextState === 'active'/);
  assert.match(appSource, /\[syncAndroidSystemBars, user\?\.id, showOTP, showResetPassword\]/);
  assert.match(appSource, /NavigationBar\.setVisibilityAsync\('hidden'\)/);
  assert.match(appSource, /NavigationBar\.setBehaviorAsync\('overlay-swipe'\)/);
});
