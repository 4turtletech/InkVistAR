/**
 * LoginPage.jsx -- Auth Entry Point
 * Themed with lucide icons + theme tokens. Preserves all auth logic:
 * lockout timer, email sanitization, forgot password modal,
 * verification modal, success modal.
 */

import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, Modal, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Palette, Eye, EyeOff, Check, X, CheckCircle } from 'lucide-react-native';
import { colors, typography, borderRadius, shadows } from '../src/theme';
import { API_URL } from '../src/config';

export function LoginPage({ route, onLogin, onSwitchToRegister, onForgotPassword }) {
  const [email, setEmail] = useState(route.params?.prefillEmail || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);

  // Forgot Password State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (route.params?.prefillEmail) setEmail(route.params.prefillEmail);
    if (route.params?.message) { setSuccessMessage(route.params.message); setShowSuccessModal(true); }
  }, [route.params]);

  useEffect(() => {
    let interval;
    if (lockoutTime > 0) {
      interval = setInterval(() => setLockoutTime(p => p - 1), 1000);
    } else if (lockoutTime === 0 && failedAttempts >= 3) {
      setFailedAttempts(0);
    }
    return () => clearInterval(interval);
  }, [lockoutTime]);

  const handleEmailChange = (text) => {
    const sanitized = text.replace(/\s/g, '');
    setEmail(sanitized);
    if (sanitized !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized)) {
      setErrors(p => ({ ...p, email: 'Invalid email format' }));
    } else {
      setErrors(p => ({ ...p, email: null }));
    }
  };

  const handleEmailBlur = () => { if (!email.trim()) setErrors(p => ({ ...p, email: 'Email is required' })); };

  const handlePasswordChange = (text) => {
    setPassword(text);
    if (text && errors.password) setErrors(p => ({ ...p, password: null }));
  };

  const handlePasswordBlur = () => { if (!password) setErrors(p => ({ ...p, password: 'Password is required' })); };

  const handleSubmit = async () => {
    const cleanEmail = email.trim();
    let newErrors = {};
    let isValid = true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail) { newErrors.email = 'Email is required'; isValid = false; }
    else if (!emailRegex.test(cleanEmail)) { newErrors.email = 'Please enter a valid email address'; isValid = false; }
    if (!password) { newErrors.password = 'Password is required'; isValid = false; }
    setErrors(newErrors);

    if (isValid) {
      if (lockoutTime > 0) { Alert.alert('Locked Out', `Please wait ${lockoutTime} seconds before trying again.`); return; }
      const result = await onLogin(cleanEmail, password);
      if (result && !result.success) {
        if (result.requireVerification) { setShowVerificationModal(true); }
        else {
          const n = failedAttempts + 1; setFailedAttempts(n);
          if (n >= 3) { setLockoutTime(30); Alert.alert('Too Many Attempts', 'Temporarily locked for 30 seconds.'); }
        }
      } else { setFailedAttempts(0); }
    }
  };

  const handleResetSubmit = () => {
    if (!resetEmail.trim()) { Alert.alert('Error', 'Please enter your email address'); return; }
    if (onForgotPassword) { onForgotPassword(resetEmail, 'customer'); setShowForgotModal(false); setResetEmail(''); }
    else { Alert.alert('Coming Soon', 'Not connected yet.'); setShowForgotModal(false); }
  };

  const handleResendVerification = async () => {
    try {
      const response = await fetch(`${API_URL}/api/resend-verification`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();
      data.success ? (Alert.alert('Success', data.message), setShowVerificationModal(false)) : Alert.alert('Error', data.message);
    } catch (e) { Alert.alert('Error', 'Failed to connect to server'); }
  };

  return (
    <LinearGradient colors={['#0f172a', '#1e293b', colors.primaryDark]} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <View style={styles.header}>
              <LinearGradient colors={['#0f172a', colors.primary]} style={styles.iconWrap}>
                <Palette size={28} color="#ffffff" />
              </LinearGradient>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to your tattoo journey</Text>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="your@email.com"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={handleEmailChange}
                onBlur={handleEmailBlur}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.passwordWrap, errors.password && styles.inputError]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter password"
                  placeholderTextColor={colors.textTertiary}
                  value={password}
                  onChangeText={handlePasswordChange}
                  onBlur={handlePasswordBlur}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} color={colors.textTertiary} /> : <Eye size={18} color={colors.textTertiary} />}
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            {/* Remember & Forgot */}
            <View style={styles.row}>
              <TouchableOpacity style={styles.checkRow} onPress={() => setRememberMe(!rememberMe)}>
                <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                  {rememberMe && <Check size={14} color={colors.primary} />}
                </View>
                <Text style={styles.checkLabel}>Remember me</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowForgotModal(true)}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* Submit */}
            <TouchableOpacity onPress={handleSubmit} disabled={lockoutTime > 0} activeOpacity={0.8}>
              <LinearGradient
                colors={lockoutTime > 0 ? ['#6b7280', '#9ca3af'] : ['#0f172a', colors.primary]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>{lockoutTime > 0 ? `Wait ${lockoutTime}s` : 'Sign In'}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={onSwitchToRegister}>
                <Text style={styles.link}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Forgot Password Modal */}
        <Modal visible={showForgotModal} transparent animationType="slide" onRequestClose={() => setShowForgotModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Reset Password</Text>
                <TouchableOpacity onPress={() => setShowForgotModal(false)}><X size={22} color={colors.textSecondary} /></TouchableOpacity>
              </View>
              <Text style={styles.modalText}>Enter your email to receive a verification code.</Text>
              <TextInput style={styles.input} placeholder="your@email.com" placeholderTextColor={colors.textTertiary} value={resetEmail} onChangeText={setResetEmail} keyboardType="email-address" autoCapitalize="none" />
              <TouchableOpacity onPress={handleResetSubmit} activeOpacity={0.8}>
                <LinearGradient colors={['#0f172a', colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.button}>
                  <Text style={styles.buttonText}>Send Code</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Verification Modal */}
        <Modal visible={showVerificationModal} transparent animationType="slide" onRequestClose={() => setShowVerificationModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Account Not Verified</Text>
                <TouchableOpacity onPress={() => setShowVerificationModal(false)}><X size={22} color={colors.textSecondary} /></TouchableOpacity>
              </View>
              <Text style={styles.modalText}>Your email has not been verified yet. Please check your inbox.</Text>
              <Text style={styles.modalText}>Link expired or didn't receive it?</Text>
              <TouchableOpacity onPress={handleResendVerification} activeOpacity={0.8}>
                <LinearGradient colors={['#0f172a', colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.button}>
                  <Text style={styles.buttonText}>Resend Verification Link</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Success Modal */}
        <Modal visible={showSuccessModal} transparent animationType="slide" onRequestClose={() => setShowSuccessModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Success</Text>
                <TouchableOpacity onPress={() => setShowSuccessModal(false)}><X size={22} color={colors.textSecondary} /></TouchableOpacity>
              </View>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <CheckCircle size={48} color={colors.success} />
              </View>
              <Text style={[styles.modalText, { textAlign: 'center' }]}>{successMessage}</Text>
              <TouchableOpacity onPress={() => setShowSuccessModal(false)} activeOpacity={0.8}>
                <LinearGradient colors={['#0f172a', colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.button}>
                  <Text style={styles.buttonText}>Continue</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 16 },
  card: { backgroundColor: '#ffffff', borderRadius: borderRadius.xxl, padding: 28, ...shadows.cardStrong },
  header: { alignItems: 'center', marginBottom: 28 },
  iconWrap: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: 6 },
  subtitle: { ...typography.body, color: colors.textSecondary },
  inputGroup: { marginBottom: 20 },
  label: { ...typography.bodySmall, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  input: {
    height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    paddingHorizontal: 14, ...typography.body, color: colors.textPrimary, backgroundColor: '#f8fafc',
  },
  inputError: { borderColor: colors.error },
  errorText: { ...typography.bodyXSmall, color: colors.error, marginTop: 4 },
  passwordWrap: {
    flexDirection: 'row', alignItems: 'center', height: 48,
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    paddingHorizontal: 14, backgroundColor: '#f8fafc',
  },
  passwordInput: { flex: 1, height: '100%', ...typography.body, color: colors.textPrimary },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: {
    width: 20, height: 20, borderWidth: 2, borderColor: colors.border,
    borderRadius: 4, justifyContent: 'center', alignItems: 'center',
  },
  checkboxActive: { borderColor: colors.primary },
  checkLabel: { ...typography.bodySmall, color: colors.textSecondary },
  forgotText: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' },
  button: { height: 48, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  buttonText: { ...typography.button, color: '#ffffff', fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { ...typography.body, color: colors.textSecondary },
  link: { ...typography.body, color: colors.primary, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: borderRadius.xxl, padding: 24, ...shadows.cardStrong },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { ...typography.h3, color: colors.textPrimary },
  modalText: { ...typography.body, color: colors.textSecondary, marginBottom: 14 },
});
