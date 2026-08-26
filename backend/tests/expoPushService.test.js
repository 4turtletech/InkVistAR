const assert = require('node:assert/strict');
const test = require('node:test');
const {
  EXPO_PUSH_ENDPOINT,
  EXPO_RECEIPTS_ENDPOINT,
  isExpoPushToken,
  buildExpoPushMessages,
  sendExpoPushBatch,
  fetchExpoPushReceipts,
  getImmediatelyInvalidTokens,
  getReceiptInvalidTokens,
} = require('../services/expoPushService');

test('accepts both current Expo push-token formats and rejects arbitrary values', () => {
  assert.equal(isExpoPushToken('ExpoPushToken[android-token]'), true);
  assert.equal(isExpoPushToken('ExponentPushToken[ios-token]'), true);
  assert.equal(isExpoPushToken('not-a-push-token'), false);
});

test('builds one high-priority message per unique valid device token', () => {
  const messages = buildExpoPushMessages([
    'ExpoPushToken[android-token]',
    'ExponentPushToken[ios-token]',
    'ExpoPushToken[android-token]',
    'invalid',
  ], 'Title', 'Body', { type: 'session_started' });

  assert.equal(messages.length, 2);
  assert.deepEqual(messages.map(message => message.to), [
    'ExpoPushToken[android-token]',
    'ExponentPushToken[ios-token]',
  ]);
  assert.equal(messages[0].priority, 'high');
  assert.equal(messages[0].channelId, 'default');
});

test('sends Android and iOS messages together through Expo push service', async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: [{ status: 'ok', id: 'one' }, { status: 'ok', id: 'two' }] }),
    };
  };

  const result = await sendExpoPushBatch({
    fetchImpl,
    tokens: ['ExpoPushToken[android-token]', 'ExponentPushToken[ios-token]'],
    title: 'Appointment update',
    body: 'Your appointment changed.',
  });

  assert.equal(request.url, EXPO_PUSH_ENDPOINT);
  assert.equal(JSON.parse(request.options.body).length, 2);
  assert.equal(result.tickets.length, 2);
});

test('identifies tokens rejected immediately as unregistered', () => {
  const messages = buildExpoPushMessages(
    ['ExpoPushToken[current]', 'ExponentPushToken[stale]'],
    'Title',
    'Body'
  );
  const invalid = getImmediatelyInvalidTokens(messages, [
    { status: 'ok', id: 'ticket' },
    { status: 'error', details: { error: 'DeviceNotRegistered' } },
  ]);
  assert.deepEqual(invalid, ['ExponentPushToken[stale]']);
});

test('checks Expo receipts and maps an unregistered device back to its token', async () => {
  let request;
  const receipts = await fetchExpoPushReceipts({
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            accepted: { status: 'ok' },
            stale: { status: 'error', details: { error: 'DeviceNotRegistered' } },
          },
        }),
      };
    },
    ticketIds: ['accepted', 'stale'],
    accessToken: 'expo-access-token',
  });

  assert.equal(request.url, EXPO_RECEIPTS_ENDPOINT);
  assert.equal(request.options.headers.Authorization, 'Bearer expo-access-token');
  const messages = buildExpoPushMessages(
    ['ExpoPushToken[current]', 'ExponentPushToken[stale]'],
    'Title',
    'Body'
  );
  assert.deepEqual(getReceiptInvalidTokens(messages, [
    { status: 'ok', id: 'accepted' },
    { status: 'ok', id: 'stale' },
  ], receipts), ['ExponentPushToken[stale]']);
});
