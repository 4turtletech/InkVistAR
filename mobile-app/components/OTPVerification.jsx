/**
 * OTPVerification.jsx -- 6-digit OTP Entry
 * Themed with lucide icons. Preserves countdown, verify, resend, and cancel.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ShieldCheck } from 'lucide-react-native';
import { colors, typography, borderRadius, shadows } from '../src/theme';
import { verifyOTP } from '../src/utils/api';

export function OTPVerification({ email, userType, onOTPVerified, onResendOTP, onCancel, autoSend = true }) {
  const [otp, setOTP] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(300);
  const [canResend, setCanResend] = useState(false);

  const handleSendOTP = async () => {
    try {
      const result = await onResendOTP();
      if (result && result.success) { Alert.alert('OTP Sent', `Code sent to ${email}`); setCountdown(300); setCanResend(false); }
      else { Alert.alert('Error', result?.message || 'Failed to send OTP'); }
    } catch (error) { Alert.alert('Error', 'Failed to send OTP'); }
  };

  useEffect(() => { if (autoSend) handleSendOTP(); }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => { if (prev <= 1) { setCanResend(true); clearInterval(timer); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleVerify = async () => {
    if (otp.length !== 6) { Alert.alert('Invalid Code', 'Please enter the 6-digit code.'); return; }
    setLoading(true);
    const result = await verifyOTP(email, otp, userType);
    setLoading(false);
    result.success ? onOTPVerified(result.user) : Alert.alert('Invalid OTP', result.message || 'Code is incorrect or expired.');
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <LinearGradient colors={['#0f172a', '#1e293b', colors.primaryDark]} style={styles.container}>
      <View style={styles.card}>
        <LinearGradient colors={['#0f172a', colors.primary]} style={styles.iconWrap}>
          <ShieldCheck size={32} color="#ffffff" />
        </LinearGradient>
        <Text style={styles.title}>Enter OTP</Text>
        <Text style={styles.subtitle}>for {email}</Text>

        <View style={styles.otpWrap}>
          <TextInput style={styles.otpInput} value={otp} onChangeText={setOTP} keyboardType="number-pad" maxLength={6} />
        </View>

        {!canResend && <Text style={styles.timer}>Resend code in {formatTime(countdown)}</Text>}

        <TouchableOpacity style={[styles.button, (loading || otp.length !== 6) && styles.buttonDisabled]} onPress={handleVerify} disabled={loading || otp.length !== 6} activeOpacity={0.8}>
          <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Verify OTP'}</Text>
        </TouchableOpacity>

        {canResend && (
          <TouchableOpacity onPress={handleSendOTP} style={styles.resendBtn}>
            <Text style={styles.resendText}>Resend OTP</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={onCancel} style={{ marginTop: 10 }}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#ffffff', borderRadius: borderRadius.xxl, padding: 28, alignItems: 'center', ...shadows.cardStrong },
  iconWrap: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: 6 },
  subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: 28, textAlign: 'center' },
  otpWrap: { marginBottom: 20 },
  otpInput: { borderWidth: 2, borderColor: colors.primary, borderRadius: borderRadius.lg, width: 200, height: 56, fontSize: 22, textAlign: 'center', letterSpacing: 8, fontWeight: '700', color: colors.textPrimary },
  timer: { ...typography.bodySmall, color: colors.textTertiary, marginBottom: 20 },
  button: { backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: borderRadius.lg, minWidth: 200, alignItems: 'center' },
  buttonDisabled: { backgroundColor: colors.primaryDark, opacity: 0.7 },
  buttonText: { ...typography.button, color: '#ffffff', fontSize: 16 },
  resendBtn: { padding: 12, marginTop: 6 },
  resendText: { ...typography.body, color: colors.primary, fontWeight: '600' },
  cancelText: { ...typography.bodySmall, color: colors.textTertiary },
});