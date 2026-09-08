import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeSessionDetails, parseSessionAudit, restoreSessionTimer, pauseSessionTimer, timerElapsedMs } from '../src/utils/sessionState.js';

const event = (event, seconds) => ({ event, timestamp: new Date(seconds * 1000).toISOString() });
const appointment = { status: 'in_progress', audit_log: [event('Session Started', 10)] };

test('restores both saved photos and notes on reopening', () => {
  assert.deepEqual(mergeSessionDetails({}, { before_photo: 'before', after_photo: 'after', notes: 'saved' }),
    { beforePhoto: 'before', afterPhoto: 'after', notes: 'saved' });
});
test('late responses cannot replace unsaved edits', () => {
  assert.deepEqual(mergeSessionDetails({ beforePhoto: 'new', notes: 'edited' },
    { before_photo: 'old', after_photo: 'saved', notes: 'old' }, { beforePhoto: true, notes: true }),
    { beforePhoto: 'new', afterPhoto: 'saved', notes: 'edited' });
});
test('missing fields preserve previews; explicit null clears them', () => {
  assert.deepEqual(mergeSessionDetails({ beforePhoto: 'before', afterPhoto: 'after' }, { after_photo: null }),
    { beforePhoto: 'before', afterPhoto: null });
});
test('invalid audit input is safe', () => {
  for (const value of ['{', null, {}, 'null']) assert.deepEqual(parseSessionAudit(value), []);
  assert.deepEqual(parseSessionAudit('[null,1,{"event":"test"}]'), [{ event: 'test' }]);
});
test('running timer includes time away from the screen', () => {
  const timer = restoreSessionTimer(appointment, null, 20000);
  const restored = restoreSessionTimer(appointment, JSON.parse(JSON.stringify(timer)), 50000);
  assert.equal(timerElapsedMs(restored, 50000), 40000);
});
test('paused timer remains paused and unchanged after reload', () => {
  const timer = pauseSessionTimer(restoreSessionTimer(appointment, null, 20000), true, 25000);
  timer.auditLog.push(event('Session Paused', 25));
  const restored = restoreSessionTimer(appointment, JSON.parse(JSON.stringify(timer)), 100000);
  assert.equal(restored.isPaused, true);
  assert.equal(timerElapsedMs(restored, 100000), 15000);
  assert.equal(restored.auditLog.at(-1).event, 'Session Paused');
});
test('resuming excludes the paused interval', () => {
  const paused = pauseSessionTimer(restoreSessionTimer(appointment, null, 20000), true, 25000);
  const resumed = pauseSessionTimer(paused, false, 100000);
  assert.equal(timerElapsedMs(resumed, 110000), 25000);
});
test('new session start invalidates previous cached timer', () => {
  const old = pauseSessionTimer(restoreSessionTimer(appointment, null, 20000), true, 25000);
  const fresh = restoreSessionTimer({ ...appointment, audit_log: [event('Session Started', 90)] }, old, 100000);
  assert.equal(fresh.isPaused, false);
  assert.equal(timerElapsedMs(fresh, 100000), 10000);
});
test('closed and not-yet-started sessions never run', () => {
  const audit_log = [event('Session Started', 10), event('Session Completed', 30)];
  const completed = restoreSessionTimer({ status: 'completed', audit_log }, null, 100000);
  assert.equal(timerElapsedMs(completed, 200000), 20000);
  const confirmed = restoreSessionTimer({ status: 'confirmed', audit_log }, completed, 100000);
  assert.equal(timerElapsedMs(confirmed, 200000), 0);
});
test('invalid cache falls back to start/pause/resume history', () => {
  const timer = restoreSessionTimer({ ...appointment, audit_log: JSON.stringify([
    event('Session Started', 10), event('Session Paused', 20), event('Session Resumed', 40),
  ]) }, { version: 1, elapsedMs: -1 }, 50000);
  assert.equal(timerElapsedMs(timer, 50000), 20000);
});
test('legacy sessions without history start at zero without inventing past time', () => {
  const timer = restoreSessionTimer({ status: 'in_progress' }, null, 50000);
  assert.equal(timerElapsedMs(timer, 50000), 0);
  assert.equal(timerElapsedMs(timer, 55000), 5000);
});
