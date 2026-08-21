const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const { createPaymongoWebhookVerifier } = require('../middleware/verifyPaymongoWebhook');

function invokeVerifier({ secret = 'test-webhook-secret', mode = 'test', signature, rawBody, now }) {
  let nextCalled = false;
  const response = {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
  const verifier = createPaymongoWebhookVerifier({ secret, mode, now });
  verifier({
    headers: signature ? { 'paymongo-signature': signature } : {},
    rawBody,
  }, response, () => {
    nextCalled = true;
  });
  return { nextCalled, response };
}

test('rejects an unsigned PayMongo webhook with HTTP 400', () => {
  const result = invokeVerifier({ rawBody: Buffer.from('{}') });
  assert.equal(result.response.statusCode, 400);
  assert.equal(result.nextCalled, false);
});

test('rejects a PayMongo webhook with an invalid signature', () => {
  const timestamp = 1_800_000_000;
  const result = invokeVerifier({
    signature: `t=${timestamp},te=invalid,li=`,
    rawBody: Buffer.from('{"data":"tampered"}'),
    now: () => timestamp * 1000,
  });
  assert.equal(result.response.statusCode, 400);
  assert.equal(result.nextCalled, false);
});

test('rejects a signed PayMongo webhook when the raw payload is unavailable', () => {
  const timestamp = 1_800_000_000;
  const result = invokeVerifier({
    signature: `t=${timestamp},te=${'a'.repeat(64)},li=`,
    now: () => timestamp * 1000,
  });
  assert.equal(result.response.statusCode, 400);
  assert.equal(result.nextCalled, false);
});

test('rejects a correctly signed PayMongo webhook outside the replay window', () => {
  const secret = 'test-webhook-secret';
  const timestamp = 1_800_000_000;
  const rawBody = Buffer.from('{}');
  const signature = crypto.createHmac('sha256', secret)
    .update(Buffer.concat([Buffer.from(`${timestamp}.`), rawBody]))
    .digest('hex');
  const result = invokeVerifier({
    secret,
    signature: `t=${timestamp},te=${signature},li=`,
    rawBody,
    now: () => (timestamp + 301) * 1000,
  });
  assert.equal(result.response.statusCode, 400);
  assert.equal(result.nextCalled, false);
});

test('accepts a correctly signed PayMongo webhook within the timestamp window', () => {
  const secret = 'test-webhook-secret';
  const timestamp = 1_800_000_000;
  const rawBody = Buffer.from('{"data":{"id":"evt_test"}}');
  const signature = crypto.createHmac('sha256', secret)
    .update(Buffer.concat([Buffer.from(`${timestamp}.`), rawBody]))
    .digest('hex');
  const result = invokeVerifier({
    secret,
    signature: `t=${timestamp},te=${signature},li=`,
    rawBody,
    now: () => timestamp * 1000,
  });
  assert.equal(result.response.statusCode, 200);
  assert.equal(result.nextCalled, true);
});
