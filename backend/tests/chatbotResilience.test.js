const assert = require('node:assert/strict');
const test = require('node:test');
const {
  ChatbotInputError,
  createChatbotResponder,
} = require('../services/chatbotResilience');

const silentLogger = { warn() {} };
const fallback = (message, context) => `Fallback for ${message} at ${context.studio?.name || 'studio'}`;

test('returns a valid Groq response and trims its content', async () => {
  const responder = createChatbotResponder({
    provider: async ({ message }) => `  Answer for ${message}  `,
    fallback,
    logger: silentLogger,
  });

  const result = await responder.respond({ message: 'hello', context: {} });
  assert.deepEqual(result, {
    response: 'Answer for hello',
    source: 'groq',
    degraded: false,
  });
});

test('returns the local response when Groq rejects instead of throwing', async () => {
  const responder = createChatbotResponder({
    provider: async () => { throw Object.assign(new Error('rate limited'), { code: 'rate_limit_exceeded' }); },
    fallback,
    logger: silentLogger,
  });

  const result = await responder.respond({
    message: 'pricing',
    context: { studio: { name: 'InkVictus' } },
  });

  assert.equal(result.source, 'fallback');
  assert.equal(result.degraded, true);
  assert.equal(result.response, 'Fallback for pricing at InkVictus');
  assert.equal(result.reason, 'rate_limit_exceeded');
});

test('returns the local response when no Groq API key/provider is configured', async () => {
  const responder = createChatbotResponder({ fallback, logger: silentLogger });
  const result = await responder.respond({ message: 'booking', context: {} });

  assert.equal(result.source, 'fallback');
  assert.equal(result.reason, 'provider_unavailable');
  assert.equal(result.response, 'Fallback for booking at studio');
});

test('times out a stalled provider and returns the local response', async () => {
  const responder = createChatbotResponder({
    provider: async () => new Promise(() => {}),
    fallback,
    logger: silentLogger,
    timeoutMs: 10,
  });

  const result = await responder.respond({ message: 'aftercare', context: {} });
  assert.equal(result.source, 'fallback');
  assert.equal(result.reason, 'CHATBOT_PROVIDER_TIMEOUT');
});

test('opens a cooldown after repeated provider failures', async () => {
  let currentTime = 1_000;
  let providerCalls = 0;
  let shouldFail = true;
  const responder = createChatbotResponder({
    provider: async () => {
      providerCalls += 1;
      if (shouldFail) throw new Error('temporary outage');
      return 'Recovered';
    },
    fallback,
    logger: silentLogger,
    failureThreshold: 2,
    cooldownMs: 1_000,
    now: () => currentTime,
  });

  await responder.respond({ message: 'one' });
  await responder.respond({ message: 'two' });
  const duringCooldown = await responder.respond({ message: 'three' });
  assert.equal(providerCalls, 2);
  assert.equal(duringCooldown.reason, 'provider_cooldown');
  assert.equal(responder.getState().circuitOpen, true);

  currentTime += 1_001;
  shouldFail = false;
  const recovered = await responder.respond({ message: 'four' });
  assert.equal(providerCalls, 3);
  assert.equal(recovered.response, 'Recovered');
  assert.equal(responder.getState().consecutiveFailures, 0);
});

test('rejects empty and oversized chatbot messages before calling a provider', async () => {
  let providerCalls = 0;
  const responder = createChatbotResponder({
    provider: async () => { providerCalls += 1; return 'unused'; },
    fallback,
    logger: silentLogger,
  });

  await assert.rejects(
    () => responder.respond({ message: '   ' }),
    (error) => error instanceof ChatbotInputError && error.status === 400
  );
  await assert.rejects(
    () => responder.respond({ message: 'x'.repeat(501) }),
    (error) => error instanceof ChatbotInputError && error.status === 400
  );
  assert.equal(providerCalls, 0);
});
