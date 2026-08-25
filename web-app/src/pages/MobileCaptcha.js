import { useCallback, useEffect, useRef, useState } from 'react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

const postToNativeApp = (payload) => {
  if (window.ReactNativeWebView?.postMessage) {
    window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    return true;
  }
  return false;
};

function MobileCaptcha() {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const requestedRef = useRef(false);
  const completedRef = useRef(false);
  const [status, setStatus] = useState('Loading security check...');
  const [failed, setFailed] = useState(false);

  const runCaptcha = useCallback(async () => {
    if (!executeRecaptcha) return;

    completedRef.current = false;
    setFailed(false);
    setStatus('Verifying you are not a bot...');
    try {
      // Keep the native bridge action separate from ordinary browser registration.
      // The backend still validates the action, hostname, and score before accepting it.
      const token = await executeRecaptcha('mobile_register');
      if (!token) throw new Error('Google did not return a verification token.');

      completedRef.current = true;
      const delivered = postToNativeApp({ type: 'captcha-token', token });
      setStatus(delivered ? 'Verification complete.' : 'This security page must be opened from the InkVistAR mobile app.');
      setFailed(!delivered);
    } catch (error) {
      completedRef.current = true;
      const message = error?.message || 'CAPTCHA verification failed. Please try again.';
      setStatus(message);
      setFailed(true);
      postToNativeApp({ type: 'captcha-error', message });
    }
  }, [executeRecaptcha]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (completedRef.current) return;
      const message = 'CAPTCHA timed out. Check your connection and try again.';
      completedRef.current = true;
      setStatus(message);
      setFailed(true);
      postToNativeApp({ type: 'captcha-error', message });
    }, 15000);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!executeRecaptcha || requestedRef.current) return;
    requestedRef.current = true;
    runCaptcha();
  }, [executeRecaptcha, runCaptcha]);

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#171415', color: '#f5f1eb', fontFamily: 'Arial, sans-serif', padding: '24px', boxSizing: 'border-box' }}>
      <section style={{ textAlign: 'center', maxWidth: '360px' }}>
        <div style={{ width: '42px', height: '42px', margin: '0 auto 14px', border: '3px solid rgba(190,144,85,.25)', borderTopColor: '#be9055', borderRadius: '50%', animation: failed ? 'none' : 'captcha-spin 1s linear infinite' }} />
        <h1 style={{ fontSize: '18px', margin: '0 0 8px' }}>InkVistAR Security Check</h1>
        <p style={{ color: '#b9b2ad', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>{status}</p>
        {failed && executeRecaptcha ? (
          <button type="button" onClick={runCaptcha} style={{ marginTop: '16px', border: 0, borderRadius: '8px', padding: '10px 18px', background: '#be9055', color: '#171415', fontWeight: 700, cursor: 'pointer' }}>
            Try Again
          </button>
        ) : null}
        <style>{'@keyframes captcha-spin { to { transform: rotate(360deg); } }'}</style>
      </section>
    </main>
  );
}

export default MobileCaptcha;
