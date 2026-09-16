import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { fetchAPI, requestPasswordRecovery } from '../src/utils/api';
import { useTheme } from '../src/context/ThemeContext';

export default function RecoveryCodeForm({ email, challenge: initialChallenge, onVerified, onCancel }) {
  const { theme } = useTheme();
  const [challenge, setChallenge] = useState(initialChallenge);
  const [digits, setDigits] = useState(Array(6).fill(''));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deadline, setDeadline] = useState(Date.now() + 60000);
  const [now, setNow] = useState(Date.now());
  const refs = useRef([]);
  const lock = useRef(false);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const seconds = Math.max(0, Math.ceil((deadline - now) / 1000));
  const submit = async () => {
    if (lock.current) return;
    if (!/^\d{6}$/.test(digits.join(''))) { setError('Enter all six digits.'); return; }
    lock.current = true; setBusy(true); setError('');
    try {
      const result = await fetchAPI('/password-recovery/verify', { method: 'POST', skipAuthRefresh: true, body: JSON.stringify({ email, code: digits.join(''), challenge }) });
      if (result.success) onVerified(result.resetToken);
      else setError(result.message || 'Unable to verify code.');
    } catch (_) { setError('Check your connection and try again.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <View style={{ width: '100%' }}>
    <Text style={{ color: theme.textSecondary, textAlign: 'center', marginBottom: 18 }}>If an active account exists for {email}, we sent a six-digit code. It expires in 10 minutes. Check Spam/Junk too.</Text>
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {digits.map((digit, i) => <TextInput key={i} ref={ref => { refs.current[i] = ref; }} value={digit} editable={!busy} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={6} accessibilityLabel={`Code digit ${i + 1}`} style={{ flex: 1, minWidth: 0, height: 48, textAlign: 'center', fontSize: 22, color: theme.textPrimary, borderWidth: 1, borderRadius: 8, borderColor: error ? theme.error : theme.borderGold }} onChangeText={text => {
        const clean = text.replace(/\D/g, ''); const next = [...digits];
        if (clean.length > 1) { clean.slice(0, 6).split('').forEach((d, n) => { next[n] = d; }); refs.current[Math.min(clean.length, 5)]?.focus(); }
        else { next[i] = clean; if (clean) refs.current[i + 1]?.focus(); }
        setDigits(next); setError('');
      }} onKeyPress={({ nativeEvent }) => { if (nativeEvent.key === 'Backspace' && !digit) refs.current[i - 1]?.focus(); }} />)}
    </View>
    {!!error && <Text accessibilityRole="alert" style={{ color: theme.error, marginTop: 12 }}>{error}</Text>}
    <TouchableOpacity disabled={busy} onPress={submit} style={{ backgroundColor: theme.primary, padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 20 }}>{busy ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '700' }}>Verify Code</Text>}</TouchableOpacity>
    <TouchableOpacity disabled={busy || seconds > 0} onPress={async () => {
      if (lock.current) return;
      lock.current = true; setBusy(true); setError('');
      try {
        const result = await requestPasswordRecovery(email);
        if (result.success) { setChallenge(result.challenge); setDigits(Array(6).fill('')); setDeadline(Date.now() + 60000); }
        else setError(result.message || 'Unable to send code.');
      } catch (_) { setError('Check your connection and try again.'); }
      finally { lock.current = false; setBusy(false); }
    }} style={{ padding: 16 }}><Text style={{ textAlign: 'center', color: theme.textSecondary }}>{seconds ? `Resend in ${seconds}s` : 'Resend Code'}</Text></TouchableOpacity>
    <TouchableOpacity disabled={busy} onPress={onCancel}><Text style={{ textAlign: 'center', color: theme.primary }}>Back to Login</Text></TouchableOpacity>
  </View>;
}
