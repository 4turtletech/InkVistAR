const test = require('node:test');
const assert = require('node:assert/strict');
const { groqRequest, DEFAULT_GROQ_MODEL } = require('../services/groqProvider');
const { getFallbackResponse } = require('../services/chatbotFallback');

test('Groq defaults to supported replacement and keeps reasoning out of chat content', () => {
  const request = groqRequest({ message: 'Integration Test', systemPrompt: 'Studio facts' });
  assert.equal(DEFAULT_GROQ_MODEL, 'openai/gpt-oss-120b');
  assert.equal(request.model, DEFAULT_GROQ_MODEL);
  assert.equal(request.reasoning_effort, 'low');
  assert.equal(request.include_reasoning, false);
  assert.equal(request.max_completion_tokens, 1024);
  assert.deepEqual(request.messages.map(m => m.role), ['system', 'user']);
});
test('configurable models do not inherit incompatible reasoning options', () => {
  const request = groqRequest({ message: 'Hello', model: 'another-model' });
  assert.equal(request.model, 'another-model');
  assert.equal(request.include_reasoning, undefined);
  assert.equal(request.reasoning_effort, undefined);
});
test('fallback answers opening hours from supplied studio context before generic booking intent', () => {
  const response = getFallbackResponse('What time can I book? What are your opening hours?', {
    studio: { name: 'Integration Test', openingTime: '13:00', closingTime: '20:00', phone: 'studio support' },
  });
  assert.match(response, /13:00 to 20:00/);
  assert.doesNotMatch(response, /daily|not sure/);
});
test('missing hours are not invented and other fallback intents remain available', () => {
  assert.match(getFallbackResponse('When do you open?'), /current opening hours/);
  assert.match(getFallbackResponse('How can I book?'), /book an appointment/);
});
