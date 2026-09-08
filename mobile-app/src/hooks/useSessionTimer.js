import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseSessionAudit, pauseSessionTimer, restoreSessionTimer, timerElapsedMs } from '../utils/sessionState';

// Serialize writes and subsequent reads, including a quick unmount/remount.
let storageQueue = Promise.resolve();
const enqueue = (operation) => {
  const result = storageQueue.then(operation);
  storageQueue = result.catch(() => {});
  return result;
};

export function useSessionTimer(appointment, status) {
  const key = `inkvistar:session-timer:v1:${appointment?.artist_id}:${appointment?.id}`;
  const initial = restoreSessionTimer(appointment, null);
  const runtime = useRef(initial);
  const mounted = useRef(false);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(initial.isPaused);
  const [auditLog, setAuditState] = useState(initial.auditLog);

  const display = () => {
    setElapsedSeconds(Math.floor(timerElapsedMs(runtime.current) / 1000));
    setIsPaused(runtime.current.isPaused);
    setAuditState(runtime.current.auditLog);
  };
  const persist = (snapshot) => {
    const serialized = JSON.stringify(snapshot);
    enqueue(() => snapshot.status === 'in_progress'
      ? AsyncStorage.setItem(key, serialized)
      : AsyncStorage.removeItem(key)
    ).then(() => { if (mounted.current) setStorageError(''); })
      .catch(() => { if (mounted.current) setStorageError('Timer could not be saved on this device. Keep this session open and try Pause/Resume again.'); });
  };

  useEffect(() => {
    let cancelled = false;
    mounted.current = true;
    setReady(false);
    enqueue(() => AsyncStorage.getItem(key)).then(value => {
      if (cancelled) return;
      let stored = null;
      try { stored = value ? JSON.parse(value) : null; } catch { /* discard invalid cache */ }
      runtime.current = restoreSessionTimer(appointment, stored);
      display();
      setReady(true);
      persist(runtime.current);
    }).catch(() => {
      if (cancelled) return;
      runtime.current = restoreSessionTimer(appointment, null);
      display();
      setStorageError('Saved timer could not be loaded. Time is based on the available session history.');
      setReady(true);
    });
    return () => { cancelled = true; mounted.current = false; };
  }, [key]);

  useEffect(() => {
    if (!ready || runtime.current.status === status) return;
    runtime.current = status === 'in_progress'
      ? restoreSessionTimer({ ...appointment, status, audit_log: runtime.current.auditLog }, null)
      : { ...pauseSessionTimer(runtime.current, true), status };
    display();
    persist(runtime.current);
  }, [status, ready, key]);

  useEffect(() => {
    if (!ready) return;
    const interval = setInterval(() => setElapsedSeconds(Math.floor(timerElapsedMs(runtime.current) / 1000)), 1000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') display();
    });
    return () => { clearInterval(interval); subscription.remove(); };
  }, [ready, key]);

  const setAuditLog = (value) => {
    const next = typeof value === 'function' ? value(runtime.current.auditLog) : value;
    runtime.current = { ...runtime.current, auditLog: parseSessionAudit(next) };
    setAuditState(runtime.current.auditLog);
    if (ready) persist(runtime.current);
  };
  const setPaused = (paused) => {
    if (!ready) return;
    runtime.current = pauseSessionTimer(runtime.current, paused);
    display();
    persist(runtime.current);
  };
  return { elapsedSeconds, isPaused, setPaused, auditLog, setAuditLog, timerReady: ready, timerError: storageError };
}
