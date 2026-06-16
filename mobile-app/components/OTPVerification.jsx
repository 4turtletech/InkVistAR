/**
 * OTPVerification.jsx -- 6-digit OTP Entry
 * Themed with lucide icons. Preserves countdown, verify, resend, and cancel.
 * Supports `embedded` prop for rendering inside a parent modal card.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ShieldCheck } from 'lucide-react-native';
import { colors, typography, borderRadius, shadows } from '../src/theme';
import { verifyOTP } from '../src/utils/api';

export function OTPVerification({ email, userType, purpose, onOTPVerified, onResendOTP, onCancel, autoSend = true, embedded = false }) {
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
    const cleanedOtp = otp.replace(/\D/g, ''); // Remove non-digit characters
    if (cleanedOtp.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-digit numeric code.');
      return;
    }
    setLoading(true);
    const result = await verifyOTP(email, cleanedOtp, userType, purpose);
    setLoading(false);
    result.success ? onOTPVerified(result.user) : Alert.alert('Invalid OTP', result.message || 'Code is incorrect or expired.');
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
          style={[styles.otpInput, embedded && styles.otpInputEmbedded]}
          value={otp}
          onChangeText={setOTP}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="------"
          placeholderTextColor={colors.textTertiary}
        />
      </View>

      {!canResend && <Text style={styles.timer}>Resend code in {formatTime(countdown)}</Text>}

      <TouchableOpacity
        style={[styles.button, embedded && styles.buttonEmbedded, (loading || otp.length !== 6) && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={loading || otp.length !== 6}
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
  timer: { ...typography.bodySmall, color: colors.textTertiary, marginBottom: 20 },
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