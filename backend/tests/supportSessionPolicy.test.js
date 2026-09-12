const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createSupportSessionId,
  buildActiveSupportHistoryQuery,
} = require('../services/supportSessionPolicy');

test('each live support session receives a distinct opaque identifier', () => {
  const first = createSupportSessionId();
  const second = createSupportSessionId();

  assert.match(first, /^[a-f0-9]{32}$/);
  assert.match(second, /^[a-f0-9]{32}$/);
  assert.notEqual(first, second);
});

test('active chat history is isolated by room and current session', () => {
  const query = buildActiveSupportHistoryQuery('customer_71', { sessionId: 'session-2' });

  assert.deepEqual(query.params, ['customer_71', 'session-2']);
  assert.match(query.sql, /room_id = \? AND session_id = \?/);
  assert.equal(query.sessionId, 'session-2');
});

test('ended rooms do not expose an earlier session as current history', () => {
  assert.equal(buildActiveSupportHistoryQuery('customer_71', null), null);
  assert.equal(buildActiveSupportHistoryQuery('customer_71', {}), null);
});
