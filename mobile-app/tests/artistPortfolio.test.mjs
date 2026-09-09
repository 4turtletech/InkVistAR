import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { getPortfolioTitleError } from '../src/utils/portfolioValidation.js';

const screen = readFileSync(new URL('../screens/ArtistWorks.jsx', import.meta.url), 'utf8');
const helpers = screen.slice(screen.indexOf('  const getNormalizedImageValue ='), screen.indexOf('  const verifyRemoteImage ='));
const handler = screen.slice(screen.indexOf('  const handleUploadWork ='), screen.indexOf('  const handleEditWork ='));
const closer = screen.slice(screen.indexOf('  const closeUploadModal ='), screen.indexOf('  const getNormalizedImageValue ='));
function formHarness(overrides = {}) {
  const events = { writes: [], alerts: [], scrolls: [], dismisses: 0 };
  const state = {};
  const context = vm.createContext({
    URL, getPortfolioTitleError,
    newWorkTitle: 'Integration Test', newWorkImage: 'https://example.test/image.jpg',
    newWorkDescription: '', newWorkCategory: 'Realism', newWorkPriceEstimate: '', isPublic: false,
    artistId: 73, editingWorkId: null, submissionInFlight: { current: false },
    Keyboard: { dismiss: () => events.dismisses++ },
    uploadScrollRef: { current: { scrollTo: value => events.scrolls.push(value) } },
    setHasSubmitted: value => { state.hasSubmitted = value; },
    setIsSubmitting: value => { state.isSubmitting = value; },
    setSubmissionError: value => { state.submissionError = value; },
    setTitleError: value => { state.titleError = value; },
    setImageError: value => { state.imageError = value; },
    setShowUploadModal: value => { state.visible = value; },
    setAlertModal: value => events.alerts.push(value),
    resetForm: () => { state.reset = true; }, loadPortfolio: () => { state.reloaded = true; },
    verifyRemoteImage: async () => true,
    addArtistWork: async (...args) => { events.writes.push(['add', ...args]); return { success: true }; },
    updateArtistWork: async (...args) => { events.writes.push(['edit', ...args]); return { success: true }; },
    ...overrides,
  });
  vm.runInContext(helpers + handler + closer + '\nglobalThis.submit = handleUploadWork; globalThis.close = closeUploadModal;', context);
  return { context, state, events, submit: context.submit, close: context.close };
}

test('portfolio title validation covers empty, whitespace, limits and existing character rules', () => {
  assert.match(getPortfolioTitleError('  '), /required/);
  assert.match(getPortfolioTitleError('ab'), /3 and 50/);
  assert.match(getPortfolioTitleError('x'.repeat(51)), /3 and 50/);
  assert.match(getPortfolioTitleError('<test>'), /Only letters/);
  assert.equal(getPortfolioTitleError(' Integration Test '), '');
});

test('empty submit shows both required errors inline without popup or API call', async () => {
  const h = formHarness({ newWorkTitle: '', newWorkImage: '' });
  await h.submit();
  assert.match(h.state.titleError, /required/);
  assert.match(h.state.imageError, /provide an image/);
  assert.equal(h.events.dismisses, 1);
  assert.equal(h.events.scrolls.length, 1);
  assert.equal(h.events.alerts.length, 0);
  assert.equal(h.events.writes.length, 0);
});

test('invalid and inaccessible image URLs are inline-only and never saved', async () => {
  for (const newWorkImage of ['not a URL', 'file:///private/image.jpg', 'https://example.test/missing.jpg']) {
    const h = formHarness({ newWorkImage, verifyRemoteImage: async () => false });
    await h.submit();
    assert.ok(h.state.imageError);
    assert.equal(h.events.writes.length, 0);
    assert.equal(h.events.alerts.length, 0);
    assert.equal(h.context.submissionInFlight.current, false);
  }
});

test('preview and save normalize mixed-case HTTP schemes and www links without changing path or query case', async () => {
  for (const [raw, expected] of [
    ['Https://example.test/Art.PNG?Key=AbC', 'https://example.test/Art.PNG?Key=AbC'],
    ['HTTP://example.test/Art.PNG', 'http://example.test/Art.PNG'],
    ['www.example.test/Art.PNG?Key=AbC', 'https://www.example.test/Art.PNG?Key=AbC'],
    [' "HTTPS://example.test/Art.PNG?A=1&amp;B=Two" ', 'https://example.test/Art.PNG?A=1&B=Two'],
  ]) {
    const h = formHarness({ newWorkImage: raw, verifyRemoteImage: async url => { assert.equal(url, expected); return true; } });
    h.context.inputUrl = raw;
    assert.equal(vm.runInContext('getNormalizedImageValue(inputUrl)', h.context), expected);
    await h.submit();
    assert.equal(h.events.writes.length, 1);
    assert.equal(h.events.writes[0][2].imageUrl, expected);
  }
});

test('rapid taps during image verification and API save generate only one submission', async () => {
  let finishImage, finishSave;
  const imagePromise = new Promise(resolve => { finishImage = resolve; });
  const savePromise = new Promise(resolve => { finishSave = resolve; });
  let writes = 0;
  const h = formHarness({ verifyRemoteImage: () => imagePromise, addArtistWork: () => { writes++; return savePromise; } });
  const first = h.submit();
  await h.submit();
  h.close();
  assert.equal(h.state.visible, undefined);
  assert.equal(h.state.isSubmitting, true);
  finishImage(true);
  await Promise.resolve();
  await h.submit();
  assert.equal(writes, 1);
  finishSave({ success: true });
  await first;
  assert.equal(h.state.visible, false);
  assert.equal(h.context.submissionInFlight.current, false);
});

test('editing calls the authenticated edit helper and preserves optional empty price', async () => {
  const h = formHarness({ editingWorkId: 123 });
  await h.submit();
  assert.equal(h.events.writes[0][0], 'edit');
  assert.equal(h.events.writes[0][1], 123);
  assert.equal(h.events.writes[0][2].priceEstimate, null);
  assert.equal(h.events.writes[0][2].isPublic, false);
  assert.equal(h.state.reloaded, true);
});

test('failure unlocks the form, preserves the draft and shows an inline retry message', async () => {
  const h = formHarness({ addArtistWork: async () => ({ success: false, status: 401, message: 'Please sign in again.' }) });
  await h.submit();
  assert.match(h.state.submissionError, /sign in/);
  assert.equal(h.state.reset, undefined);
  assert.equal(h.state.isSubmitting, false);
  assert.equal(h.events.alerts.length, 0);
  h.close();
  assert.equal(h.state.visible, false);
});

test('unexpected errors release the lock and warn against blind duplicate retries', async () => {
  const h = formHarness({ addArtistWork: async () => { throw Error('network'); } });
  await h.submit();
  assert.match(h.state.submissionError, /refresh your portfolio before retrying/);
  assert.equal(h.context.submissionInFlight.current, false);
  assert.equal(h.events.alerts.length, 0);
});

test('upload UI keeps submit available for validation, disables busy actions and handles Android Back', () => {
  assert.match(screen, /Image Source \*/);
  assert.match(screen, /Title \*/);
  assert.match(screen, /onRequestClose=\{closeUploadModal\}/);
  assert.match(screen, /onPress=\{handleUploadWork\} disabled=\{isSubmitting\}/);
  assert.doesNotMatch(handler, /fetch\(/);
  assert.doesNotMatch(handler, /title: 'Invalid Image'|title: 'Image Cannot Be Opened'/);
  assert.match(screen, /key=\{getNormalizedImageValue\(newWorkImage\)\}/);
  assert.match(screen, /onLoad=\{\(\) => setImageError\(''\)\}/);
});

const api = readFileSync(new URL('../src/utils/api.js', import.meta.url), 'utf8');
const reply = (status, data) => ({ status, ok: status < 400, text: async () => JSON.stringify(data), json: async () => data });
function transportHarness(values, responses) {
  const storage = new Map(Object.entries(values));
  const calls = [];
  const context = vm.createContext({
    console: { log() {}, error() {}, warn() {} }, Date, URLSearchParams,
    SecureStore: {
      getItemAsync: async key => storage.get(key) || null,
      setItemAsync: async (key, value) => storage.set(key, value),
      deleteItemAsync: async key => storage.delete(key),
    },
    fetch: async (url, options) => { calls.push({ url, options }); assert.ok(responses.length, 'unexpected network request'); return responses.shift(); },
  });
  vm.runInContext(api.replace(/^import .*;\r?\n/gm, '').replace(/export /g, '') + '\nglobalThis.edit = updateArtistWork; globalThis.add = addArtistWork;', context);
  return { edit: context.edit, add: context.add, calls };
}

test('portfolio edit carries bearer token and PUT payload', async () => {
  const h = transportHarness({ inkvistar_access_token: 'test' }, [reply(200, { success: true })]);
  assert.equal((await h.edit(123, { title: 'Integration Test' })).success, true);
  assert.match(h.calls[0].url, /artist\/portfolio\/123$/);
  assert.equal(h.calls[0].options.method, 'PUT');
  assert.equal(h.calls[0].options.headers.Authorization, 'Bearer test');
  assert.equal(JSON.parse(h.calls[0].options.body).title, 'Integration Test');
});

test('portfolio edit retries an expired token once through refresh', async () => {
  const h = transportHarness({ inkvistar_access_token: 'expired', inkvistar_refresh_token: 'refresh' }, [reply(401, {}), reply(200, { accessToken: 'renewed', refreshToken: 'rotated' }), reply(200, { success: true })]);
  assert.equal((await h.edit(123, {})).success, true);
  assert.equal(h.calls.length, 3);
  assert.equal(h.calls[2].options.headers.Authorization, 'Bearer renewed');
});

test('missing login blocks portfolio create and edit without anonymous requests', async () => {
  const h = transportHarness({}, []);
  assert.equal((await h.add(73, {})).status, 401);
  assert.equal((await h.edit(123, {})).status, 401);
  assert.equal(h.calls.length, 0);
});
