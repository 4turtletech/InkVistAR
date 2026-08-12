/**
 * OTPVerification.jsx -- 6-digit OTP Entry
 * Themed with lucide icons. Preserves countdown, verify, resend, and cancel.
 * Supports `embedded` prop for rendering inside a parent modal card.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Keyboard } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ShieldCheck } from 'lucide-react-native';
import { colors, typography, borderRadius, shadows } from '../src/theme';
import { verifyOTP } from '../src/utils/api';

export function OTPVerification({ email, userType, purpose, onOTPVerified, onResendOTP, onCancel, autoSend = true, embedded = false }) {
  const [otp, setOTP] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(300);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const handleSendOTP = async () => {
    Keyboard.dismiss();
    setNotice('');
    try {
      const result = await onResendOTP();
      if (result && result.success) {
        setOTP('');
        setError('');
        setNotice(`A new code was sent to ${email}.`);
        setCountdown(Math.max(1, Number(result.expires_in || 300)));
        setCanResend(false);
      }
      else { setError(result?.message || 'Failed to send OTP. Please try again.'); }
    } catch (error) { setError('Failed to send OTP. Please try again.'); }
  };

  useEffect(() => { if (autoSend) handleSendOTP(); }, []);

  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return undefined;
    }
    const timer = setTimeout(() => setCountdown(previous => Math.max(0, previous - 1)), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const isExpired = countdown <= 0;

  const handleOTPChange = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setOTP(digits);
    setNotice('');
    if (!isExpired) setError('');
  };

  const handleVerify = async () => {
    Keyboard.dismiss();
    setNotice('');
    const cleanedOtp = otp.replace(/\D/g, ''); // Remove non-digit characters
    if (isExpired) {
      setError('This verification code has expired. Request a new code.');
      return;
    }
    if (cleanedOtp.length !== 6) {
      setError('Enter the complete 6-digit verification code.');
      return;
    }
    setLoading(true);
    const result = await verifyOTP(email, cleanedOtp, userType, purpose);
    setLoading(false);
    if (result.success) {
      setError('');
      onOTPVerified(result.user);
    } else {
      const message = result.message || 'Code is incorrect or expired.';
      if (message.toLowerCase().includes('expired')) {
        setCountdown(0);
        setCanResend(true);
        setError('This verification code has expired. Request a new code.');
      } else {
        setError(message);
      }
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // Inner content shared by both modes
  const renderContent = () => (
    <>
      <LinearGradient colors={['#0f172a', colors.primary]} style={styles.iconWrap}>
        <ShieldCheck size={32} color="#ffffff" />
      </LinearGradient>
      <Text style={[styles.title, embedded && styles.titleEmbedded]}>Enter Verification Code</Text>
      <Text style={styles.subtitle}>A 6-digit code was sent to {email}</Text>

      <View style={styles.otpWrap}>
        <TextInput
          style={[styles.otpInput, embedded && styles.otpInputEmbedded, (error || isExpired) && styles.otpInputError]}
          value={otp}
          onChangeText={handleOTPChange}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="------"
          placeholderTextColor={colors.textTertiary}
          returnKeyType="done"
          blurOnSubmit
          onSubmitEditing={handleVerify}
        />
        {(error || isExpired) && (
          <Text style={styles.errorText}>{error || 'This verification code has expired. Request a new code.'}</Text>
        )}
      </View>

      {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}

      {!isExpired ? (
        <Text style={styles.timer}>Code expires in {formatTime(countdown)}</Text>
      ) : (
        <View style={styles.expiredBadge}>
          <Text style={styles.expiredText}>CODE EXPIRED</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, embedded && styles.buttonEmbedded, loading && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={loading}
        activeOpacity={0.8}
        title="Verify your OTP code"
      >
        <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'VERIFY CODE'}</Text>
      </TouchableOpacity>

      {canResend && (
        <TouchableOpacity onPress={handleSendOTP} style={styles.resendBtn} title="Resend verification code">
          <Text style={styles.resendText}>Resend Code</Text>
        </TouchableOpacity>
      )}

      {!embedded && (
        <TouchableOpacity onPress={onCancel} style={{ marginTop: 10 }} title="Cancel verification">
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </>
  );

  // Embedded mode: render flat content for parent modal card
  if (embedded) {
    return (
      <View style={styles.embeddedContainer}>
        {renderContent()}
      </View>
    );
  }

  // Standalone mode: full-screen gradient + card
  return (
    <LinearGradient colors={['#0f172a', '#1e293b', colors.primaryDark]} style={styles.container}>
      <View style={styles.card}>
        {renderContent()}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  // Standalone (full-screen) mode
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#ffffff', borderRadius: borderRadius.xxl, padding: 28, alignItems: 'center', ...shadows.cardStrong },

  // Embedded (inside parent modal) mode
  embeddedContainer: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },

  // Shared styles
  iconWrap: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: 6 },
  titleEmbedded: { fontSize: 18, fontWeight: '700' },
  subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: 28, textAlign: 'center' },
  otpWrap: { marginBottom: 20, width: '100%', alignItems: 'center' },
  otpInput: {
    borderWidth: 2, borderColor: colors.primary, borderRadius: borderRadius.lg,
    width: 200, height: 56, fontSize: 22, textAlign: 'center',
    letterSpacing: 8, fontWeight: '700', color: colors.textPrimary,
  },
  otpInputEmbedded: { width: '85%', borderColor: colors.gold || colors.primary },
  otpInputError: { borderColor: colors.error, backgroundColor: 'rgba(239, 68, 68, 0.05)' },
  errorText: { ...typography.bodySmall, color: colors.error, marginTop: 7, textAlign: 'center' },
  noticeText: { ...typography.bodySmall, color: colors.success || '#16a34a', marginTop: -10, marginBottom: 14, textAlign: 'center' },
  timer: { ...typography.bodySmall, color: colors.textTertiary, marginBottom: 20 },
  expiredBadge: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: borderRadius.md, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 20 },
  expiredText: { ...typography.bodyXSmall, color: colors.error, fontWeight: '800', letterSpacing: 0.8 },
  button: {
    backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: borderRadius.lg, minWidth: 200, alignItems: 'center',
  },
  buttonEmbedded: { backgroundColor: colors.gold || colors.primary, minWidth: '85%' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { ...typography.button, color: '#ffffff', fontSize: 16 },
  resendBtn: { padding: 12, marginTop: 6 },
  resendText: { ...typography.body, color: colors.primary, fontWeight: '600' },
  cancelText: { ...typography.bodySmall, color: colors.textTertiary },
});
