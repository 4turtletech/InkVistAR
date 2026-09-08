export const parseSessionAudit = (value) => {
  try {
    const entries = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(entries) ? entries.filter(entry => entry && typeof entry === 'object') : [];
  } catch { return []; }
};

export const mergeSessionDetails = (current, incoming, edited = {}) => {
  const next = { ...current };
  for (const [field, column] of [['notes', 'notes'], ['beforePhoto', 'before_photo'], ['afterPhoto', 'after_photo']]) {
    if (!edited[field] && Object.prototype.hasOwnProperty.call(incoming, column)) {
      next[field] = incoming[column] || (field === 'notes' ? '' : null);
    }
  }
  return next;
};

export const timerElapsedMs = (timer, now = Date.now()) =>
  timer.elapsedMs + (timer.runningSince == null ? 0 : Math.max(0, now - timer.runningSince));

export const pauseSessionTimer = (timer, paused, now = Date.now()) => ({
  ...timer,
  elapsedMs: timerElapsedMs(timer, now),
  runningSince: paused ? null : now,
  isPaused: paused,
});

const lastStart = (audit) => [...audit].reverse().find(entry => entry.event === 'Session Started')?.timestamp || null;

export const restoreSessionTimer = (appointment, stored, now = Date.now()) => {
  const auditLog = parseSessionAudit(appointment?.audit_log);
  const status = appointment?.status || 'confirmed';
  const startStamp = lastStart(auditLog);
  // Cached pause/elapsed state belongs only to this incarnation of an active session.
  if (status === 'in_progress' && stored?.version === 1 && stored.status === status &&
      stored.startStamp === startStamp && Number.isFinite(stored.elapsedMs) && stored.elapsedMs >= 0 &&
      typeof stored.isPaused === 'boolean' &&
      (stored.isPaused ? stored.runningSince === null :
        Number.isFinite(stored.runningSince) && stored.runningSince >= 0 && stored.runningSince <= now)) {
    return { ...stored, auditLog: parseSessionAudit(stored.auditLog) };
  }

  let elapsedMs = 0;
  let runningSince = null;
  let isPaused = false;
  for (const entry of auditLog) {
    const time = Date.parse(entry.timestamp);
    if (!Number.isFinite(time) || time > now) continue;
    if (entry.event === 'Session Started') {
      elapsedMs = 0; runningSince = time; isPaused = false;
    } else if (entry.event === 'Session Paused' && runningSince !== null) {
      elapsedMs += Math.max(0, time - runningSince); runningSince = null; isPaused = true;
    } else if (entry.event === 'Session Resumed' && isPaused) {
      runningSince = time; isPaused = false;
    } else if (['Session Completed', 'Session Partially Completed', 'Session Aborted'].includes(entry.event)) {
      if (runningSince !== null) elapsedMs += Math.max(0, time - runningSince);
      runningSince = null; isPaused = true;
    }
  }
  if (status !== 'in_progress') {
    // Never count time beyond the last recorded event on a closed session.
    runningSince = null;
    isPaused = true;
    if (status === 'confirmed' || status === 'pending') elapsedMs = 0;
  } else if (runningSince === null && !isPaused) {
    runningSince = now; // Legacy session without a recorded start; no fabricated history.
  }
  return { version: 1, status, startStamp, elapsedMs, runningSince, isPaused, auditLog };
};
