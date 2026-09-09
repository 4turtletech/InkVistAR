import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Execute the real transport with in-memory SecureStore and fetch; never contacts production.
const source = readFileSync(new URL('../src/utils/api.js', import.meta.url), 'utf8');
const response = (status, data) => ({ status, ok: status >= 200 && status < 300, text: async () => JSON.stringify(data), json: async () => data });
function harness(values = {}, replies = []) {
  const storage = new Map(Object.entries(values));
  const calls = [];
  const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} }, Date, URLSearchParams,
    SecureStore: {
      getItemAsync: async key => storage.get(key) || null,
      setItemAsync: async (key, value) => storage.set(key, value),
      deleteItemAsync: async key => storage.delete(key),
    },
    fetch: async (url, options) => {
      calls.push({ url, options });
      const next = replies.shift();
      if (!next) throw Error('Unexpected network call');
      return next;
    },
  });
  vm.runInContext(source.replace(/^import .*;\r?\n/gm, '').replace(/export /g, '') + '\nglobalThis.book = createCustomerAppointment;', context);
  return { book: context.book, calls };
}
test('booking carries bearer token and structured consultation method', async () => {
  const h = harness({ inkvistar_access_token: 'test-access' }, [response(200, { success: true, appointmentId: 74 })]);
  const result = await h.book({ consultationMethod: 'Face-to-Face' });
  assert.equal(result.success, true);
  assert.equal(h.calls[0].options.headers.Authorization, 'Bearer test-access');
  assert.equal(JSON.parse(h.calls[0].options.body).consultationMethod, 'Face-to-Face');
  assert.equal(h.calls[0].options.requireAuth, undefined);
});
test('missing login blocks booking without an anonymous request', async () => {
  const h = harness();
  const result = await h.book({ customerId: 71 });
  assert.equal(result.status, 401);
  assert.equal(result.success, false);
  assert.equal(h.calls.length, 0);
});
test('missing access token can recover from refresh before booking', async () => {
  const h = harness({ inkvistar_refresh_token: 'test-refresh' }, [response(200, { accessToken: 'renewed', refreshToken: 'rotated' }), response(200, { success: true })]);
  assert.equal((await h.book({})).success, true);
  assert.match(h.calls[0].url, /auth\/refresh$/);
  assert.equal(h.calls[1].options.headers.Authorization, 'Bearer renewed');
});
test('expired access token retries once with refreshed authentication', async () => {
  const h = harness({ inkvistar_access_token: 'expired', inkvistar_refresh_token: 'test-refresh' }, [response(401, {}), response(200, { accessToken: 'renewed', refreshToken: 'rotated' }), response(200, { success: true })]);
  assert.equal((await h.book({})).success, true);
  assert.equal(h.calls.length, 3);
  assert.equal(h.calls[2].options.headers.Authorization, 'Bearer renewed');
});
test('rejected refresh never falls back to guest booking', async () => {
  const h = harness({ inkvistar_refresh_token: 'expired' }, [response(401, {})]);
  assert.equal((await h.book({})).status, 401);
  assert.equal(h.calls.length, 1);
  assert.match(h.calls[0].url, /auth\/refresh$/);
});
test('expired bearer and rejected refresh stop without anonymous retry', async () => {
  const h = harness({ inkvistar_access_token: 'expired', inkvistar_refresh_token: 'expired-refresh' }, [response(401, {}), response(401, {})]);
  assert.equal((await h.book({})).status, 401);
  assert.equal(h.calls.length, 2);
  assert.equal(h.calls[0].options.headers.Authorization, 'Bearer expired');
  assert.match(h.calls[1].url, /auth\/refresh$/);
});
test('screen uses authenticated helper, structured method, inline errors and submission lock', () => {
  const screen = readFileSync(new URL('../screens/CustomerBooking.jsx', import.meta.url), 'utf8');
  assert.match(screen, /await createCustomerAppointment\(payload\)/);
  assert.doesNotMatch(screen, /fetch\(`\$\{API_URL\}\/customer\/appointments/);
  assert.match(screen, /consultationMethod: formData.selectedServices.includes\('Consultation'\)/);
  assert.match(screen, /if \(bookingSubmissionInFlight.current\) return/);
  assert.match(screen, /Booking Request Sent/);
  assert.doesNotMatch(screen, /Alert.alert\('Booking Confirmed'/);
  assert.match(screen, /errors.submission.*accessibilityLiveRegion/);
});
