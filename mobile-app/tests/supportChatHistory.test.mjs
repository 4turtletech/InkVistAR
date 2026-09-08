import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSupportMessage, mergeSupportHistory, appendSupportMessage } from '../src/utils/supportChatHistory.js';

const message = (text, seconds = 0, sender = 'Studio Support') => ({
  sender, text, timestamp: new Date(Date.UTC(2026, 8, 8, 15, 0, seconds)),
});

test('restores offline replies and their server timestamps', () => {
  const result = mergeSupportHistory([], [message('Offline reply')]);
  assert.equal(result[0].text, 'Offline reply');
  assert.equal(result[0].timestamp.toISOString(), '2026-09-08T15:00:00.000Z');
});
test('UTC SQL history timestamps are not misread as local device time', () => {
  assert.equal(normalizeSupportMessage({ timestamp: '2026-09-08 15:29:14' }).timestamp.toISOString(), '2026-09-08T15:29:14.000Z');
  assert.equal(normalizeSupportMessage({ timestamp: '2026-09-08T23:29:14+08:00' }).timestamp.toISOString(), '2026-09-08T15:29:14.000Z');
});
test('history refresh is idempotent even on the legacy API without IDs', () => {
  const history = [message('First'), message('Second', 1)];
  const once = mergeSupportHistory([], history);
  assert.deepEqual(mergeSupportHistory(once, history), once);
});
test('incoming reply during history retrieval is preserved, or reconciled if included', () => {
  const live = normalizeSupportMessage({ ...message('Live', 2), id: 'socket-1' });
  assert.equal(mergeSupportHistory([live], [message('Earlier')]).length, 2);
  const merged = mergeSupportHistory([live], [message('Earlier'), message('Live', 1)]);
  assert.equal(merged.length, 2);
  assert.equal(merged[1].timestamp.getUTCSeconds(), 1);
});
test('repeated identical messages remain distinct with one-to-one reconciliation', () => {
  const history = [message('Hello'), message('Hello')];
  const live = [normalizeSupportMessage({ ...message('Hello'), id: 'a' }), normalizeSupportMessage({ ...message('Hello'), id: 'b' })];
  const merged = mergeSupportHistory(live, history);
  assert.equal(merged.length, 2);
  assert.notEqual(merged[0].id, merged[1].id);
  assert.equal(mergeSupportHistory(merged, history).length, 2);
});
test('pending customer echo reconciles with history without dropping newer unsaved sends', () => {
  const pending = [normalizeSupportMessage(message('Sent', 0, 'Customer Tester'), 0, 'pending'), normalizeSupportMessage(message('New', 10, 'Customer Tester'), 1, 'pending')];
  assert.equal(mergeSupportHistory(pending, [message('Sent', 0, 'Customer Tester')]).length, 2);
});
test('duplicate socket event IDs do not duplicate the same reply', () => {
  const event = { ...message('Hello'), id: 'event-1' };
  const once = appendSupportMessage([], event);
  assert.equal(appendSupportMessage(once, event), once);
  assert.equal(appendSupportMessage(once, { ...event, id: 'event-2' }).length, 2);
});
test('keeps system notices and safely normalizes invalid timestamps', () => {
  const system = normalizeSupportMessage(message('Welcome', 0, 'system'));
  assert.equal(mergeSupportHistory([system], [message('Reply', 1)]).length, 2);
  assert.ok(Number.isFinite(normalizeSupportMessage({ text: 'Reply', timestamp: 'invalid' }).timestamp.getTime()));
});
