/**
 * ResetPasswordPage.jsx -- New Password Entry
 * Themed with lucide icons + theme tokens. Preserves password strength validation.
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Keyboard,
  KeyboardAvoidingView, Modal, Platform, ScrollView, TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, Lock, Eye, EyeOff } from 'lucide-react-native';
import { colors, typography, borderRadius, shadows } from '../src/theme';
import { useTheme } from '../src/context/ThemeContext';
import { mapPasswordRecoveryFailure } from '../src/utils/passwordRecoveryValidation';

export function ResetPasswordPage({ email, onSubmit, onComplete }) {
  const { theme } = useTheme();
  const [recoveryToken, setRecoveryToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const recoveryTokenRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const getRecoveryTokenError = (text) => {
    if (!text) return 'Recovery code is required';
    if (!/^[a-fA-F0-9]{32}$/.test(text.trim())) return 'Enter the 32-character code from your email';
    return '';
  };

  const getPasswordError = (text) => {
    if (!text) return 'Password is required';
    if (text.length < 8) return 'At least 8 characters';
    if (!/[A-Z]/.test(text)) return 'Requires 1 uppercase letter';
    if (!/[a-z]/.test(text)) return 'Requires 1 lowercase letter';
    if (!/\d/.test(text)) return 'Requires 1 number';
    if (!/[^a-zA-Z0-9]/.test(text)) return 'Requires 1 special character';
    return '';
  };

  const getConfirmPasswordError = (passwordValue, confirmValue) => {
    if (!confirmValue) return 'Please confirm password';
    if (confirmValue !== passwordValue) return 'Passwords do not match';
    return '';
  };

  const passwordChecklist = useMemo(() => ([
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: '1 uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: '1 lowercase letter', met: /[a-z]/.test(newPassword) },
    { label: '1 number', met: /\d/.test(newPassword) },
    { label: '1 special character', met: /[^a-zA-Z0-9]/.test(newPassword) },
  ]), [newPassword]);

  const handlePasswordChange = (text) => {
    setNewPassword(text);
    setErrors(prev => ({
      ...prev,
      password: submitAttempted || prev.password ? getPasswordError(text) : '',
      confirmPassword: submitAttempted || confirmPassword || prev.confirmPassword
        ? getConfirmPasswordError(text, confirmPassword)
        : '',
      submit: '',
    }));
  };

  const handleConfirmChange = (text) => {
    setConfirmPassword(text);
    setErrors(prev => ({
      ...prev,
      confirmPassword: submitAttempted || prev.confirmPassword ? getConfirmPasswordError(newPassword, text) : '',
      submit: '',
    }));
  };

  const handleSubmit = async () => {
    recoveryTokenRef.current?.blur();
    passwordRef.current?.blur();
    confirmPasswordRef.current?.blur();
    Keyboard.dismiss();
    setSubmitAttempted(true);
    const nextErrors = {
      recoveryToken: getRecoveryTokenError(recoveryToken),
      password: getPasswordError(newPassword),
      confirmPassword: getConfirmPasswordError(newPassword, confirmPassword),
    };
    setErrors(nextErrors);
    if (nextErrors.recoveryToken || nextErrors.password || nextErrors.confirmPassword) return;
    setLoading(true);
    try {
      const result = await onSubmit(recoveryToken.trim(), newPassword);
      if (result?.success) {
        setSuccessVisible(true);
      } else {
        setErrors((prev) => ({ ...prev, ...mapPasswordRecoveryFailure(result) }));
      }
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        submit: error?.message || 'Unable to update the password. Please check your connection and try again.',
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessComplete = () => {
    setSuccessVisible(false);
    onComplete?.();
  };

  return (
    <LinearGradient colors={[theme.backgroundDeep, theme.background, theme.primaryDark]} style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          enabled={Platform.OS === 'ios'}
          style={styles.keyboardWrap}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.borderGold }]}>
        <View style={[styles.iconWrap, { backgroundColor: theme.primaryLight, borderColor: theme.gold }]}>
          <Lock size={28} color={theme.gold} />
        </View>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Reset Password</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Enter the recovery code sent to {email}, then choose a new password. The code expires after 30 minutes and works once.</Text>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>Recovery Code</Text>
          <View style={[styles.passwordWrap, { backgroundColor: theme.darkBgSecondary, borderColor: theme.border }, errors.recoveryToken && styles.inputError]}>
            <TextInput
              ref={recoveryTokenRef}
              style={[styles.input, { color: theme.textPrimary }]}
              placeholder="32-character code"
              placeholderTextColor={theme.textTertiary}
              selectionColor={theme.gold}
              value={recoveryToken}
              onChangeText={(text) => {
                setRecoveryToken(text.replace(/\s/g, ''));
                if (submitAttempted || errors.recoveryToken) {
                  setErrors(prev => ({ ...prev, recoveryToken: getRecoveryTokenError(text), submit: '' }));
                }
              }}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={32}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>
          {errors.recoveryToken ? <Text style={[styles.errorText, { color: theme.error }]}>{errors.recoveryToken}</Text> : null}
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>New Password</Text>
          <View style={[styles.passwordWrap, { backgroundColor: theme.darkBgSecondary, borderColor: theme.border }, errors.password && styles.inputError]}>
            <TextInput ref={passwordRef} style={[styles.input, { color: theme.textPrimary }]} placeholder="Enter new password" placeholderTextColor={theme.textTertiary} selectionColor={theme.gold} value={newPassword} onChangeText={handlePasswordChange} secureTextEntry={!showPassword} returnKeyType="next" onSubmitEditing={() => confirmPasswordRef.current?.focus()} blurOnSubmit={false} />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? <Eye size={18} color={theme.textTertiary} /> : <EyeOff size={18} color={theme.textTertiary} />}
            </TouchableOpacity>
          </View>
          {errors.password ? <Text style={[styles.errorText, { color: theme.error }]}>{errors.password}</Text> : null}
          <View style={styles.ruleList}>
            {passwordChecklist.map(rule => (
              <Text key={rule.label} style={[styles.ruleText, { color: theme.textSecondary }, rule.met && styles.ruleTextMet]}>
                {rule.met ? 'OK' : '-'} {rule.label}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>Confirm Password</Text>
          <View style={[styles.passwordWrap, { backgroundColor: theme.darkBgSecondary, borderColor: theme.border }, errors.confirmPassword && styles.inputError]}>
            <TextInput ref={confirmPasswordRef} style={[styles.input, { color: theme.textPrimary }]} placeholder="Confirm password" placeholderTextColor={theme.textTertiary} selectionColor={theme.gold} value={confirmPassword} onChangeText={handleConfirmChange} secureTextEntry={!showPassword} returnKeyType="done" onSubmitEditing={handleSubmit} />
          </View>
          {errors.confirmPassword ? <Text style={[styles.errorText, { color: theme.error }]}>{errors.confirmPassword}</Text> : null}
        </View>

        {errors.submit ? (
          <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.submitErrorText, { color: theme.error, borderColor: theme.error, backgroundColor: theme.errorBg }]}>
            {errors.submit}
          </Text>
        ) : null}

        <TouchableOpacity
          style={styles.buttonContainer}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Submit password reset"
          accessibilityState={{ disabled: loading, busy: loading }}
        >
          <LinearGradient colors={[theme.primaryDark, theme.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.button}>
            {loading ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.buttonText}>Submit</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </View>
          </ScrollView>
      </KeyboardAvoidingView>
      </TouchableWithoutFeedback>

      <Modal
        visible={successVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleSuccessComplete}
      >
        <View style={styles.successOverlay}>
          <View style={[styles.successCard, { backgroundColor: theme.surface, borderColor: theme.borderGold }]}>
            <View style={[styles.successIcon, { backgroundColor: theme.successBg }]}>
              <CheckCircle2 size={36} color={theme.success} />
            </View>
            <Text style={[styles.successTitle, { color: theme.textPrimary }]}>Password Updated</Text>
            <Text style={[styles.successMessage, { color: theme.textSecondary }]}>Your password was changed successfully. Sign in again using your new password.</Text>
            <TouchableOpacity
              style={[styles.successButton, { backgroundColor: theme.gold }]}
              onPress={handleSuccessComplete}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Text style={[styles.successButtonText, { color: theme.backgroundDeep }]}>Continue to Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardWrap: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: { borderRadius: borderRadius.xxl, borderWidth: 1, padding: 28, alignItems: 'center', ...shadows.cardStrong },
  iconWrap: { width: 60, height: 60, borderRadius: 30, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { ...typography.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: 6 },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginBottom: 28 },
  inputGroup: { marginBottom: 18, width: '100%' },
  label: { ...typography.bodySmall, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  passwordWrap: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.md, paddingHorizontal: 14, height: 48,
  },
  input: { flex: 1, ...typography.body, color: colors.textPrimary },
  inputError: { borderColor: colors.error },
  errorText: { ...typography.bodyXSmall, color: colors.error, marginTop: 4 },
  submitErrorText: {
    ...typography.bodySmall,
    width: '100%',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  ruleList: { width: '100%', marginTop: 8, gap: 4 },
  ruleText: { ...typography.bodyXSmall, color: colors.textSecondary },
  ruleTextMet: { color: '#15803d', fontWeight: '600' },
  buttonContainer: { width: '100%', height: 48, marginTop: 8, borderRadius: borderRadius.md, overflow: 'hidden' },
  button: { width: '100%', height: '100%', borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  buttonText: { ...typography.button, color: '#ffffff', fontSize: 16 },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  successCard: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.xxl,
    padding: 28,
    ...shadows.cardStrong,
  },
  successIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  successTitle: { ...typography.h2, textAlign: 'center', marginBottom: 8 },
  successMessage: { ...typography.body, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  successButton: {
    width: '100%',
    minHeight: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  successButtonText: { ...typography.button, fontSize: 15 },
});
