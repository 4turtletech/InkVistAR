/**
 * ResetPasswordPage.jsx -- New Password Entry
 * Themed with lucide icons + theme tokens. Preserves password strength validation.
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Keyboard,
  KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, Eye, EyeOff } from 'lucide-react-native';
import { colors, typography, borderRadius, shadows } from '../src/theme';

export function ResetPasswordPage({ email, onSubmit }) {
  const [recoveryToken, setRecoveryToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
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
    }));
  };

  const handleConfirmChange = (text) => {
    setConfirmPassword(text);
    setErrors(prev => ({
      ...prev,
      confirmPassword: submitAttempted || prev.confirmPassword ? getConfirmPasswordError(newPassword, text) : '',
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
      await onSubmit(recoveryToken.trim(), newPassword);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0f172a', '#1e293b', colors.primaryDark]} style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardWrap}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
      <View style={styles.card}>
        <LinearGradient colors={['#0f172a', colors.primary]} style={styles.iconWrap}>
          <Lock size={28} color="#ffffff" />
        </LinearGradient>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter the recovery code sent to {email}, then choose a new password. The code expires after 30 minutes and works once.</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Recovery Code</Text>
          <View style={[styles.passwordWrap, errors.recoveryToken && styles.inputError]}>
            <TextInput
              ref={recoveryTokenRef}
              style={styles.input}
              placeholder="32-character code"
              placeholderTextColor={colors.textTertiary}
              value={recoveryToken}
              onChangeText={(text) => {
                setRecoveryToken(text.replace(/\s/g, ''));
                if (submitAttempted || errors.recoveryToken) {
                  setErrors(prev => ({ ...prev, recoveryToken: getRecoveryTokenError(text) }));
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
          {errors.recoveryToken ? <Text style={styles.errorText}>{errors.recoveryToken}</Text> : null}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>New Password</Text>
          <View style={[styles.passwordWrap, errors.password && styles.inputError]}>
            <TextInput ref={passwordRef} style={styles.input} placeholder="Enter new password" placeholderTextColor={colors.textTertiary} value={newPassword} onChangeText={handlePasswordChange} secureTextEntry={!showPassword} returnKeyType="next" onSubmitEditing={() => confirmPasswordRef.current?.focus()} blurOnSubmit={false} />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? <Eye size={18} color={colors.textTertiary} /> : <EyeOff size={18} color={colors.textTertiary} />}
            </TouchableOpacity>
          </View>
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          <View style={styles.ruleList}>
            {passwordChecklist.map(rule => (
              <Text key={rule.label} style={[styles.ruleText, rule.met && styles.ruleTextMet]}>
                {rule.met ? 'OK' : '-'} {rule.label}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm Password</Text>
          <View style={[styles.passwordWrap, errors.confirmPassword && styles.inputError]}>
            <TextInput ref={confirmPasswordRef} style={styles.input} placeholder="Confirm password" placeholderTextColor={colors.textTertiary} value={confirmPassword} onChangeText={handleConfirmChange} secureTextEntry={!showPassword} returnKeyType="done" onSubmitEditing={handleSubmit} />
          </View>
          {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
        </View>

        <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.8}>
          <LinearGradient colors={['#0f172a', colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.button}>
            {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Update Password</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </View>
          </ScrollView>
      </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardWrap: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#ffffff', borderRadius: borderRadius.xxl, padding: 28, alignItems: 'center', ...shadows.cardStrong },
  iconWrap: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { ...typography.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: 6 },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginBottom: 28 },
  inputGroup: { marginBottom: 18, width: '100%' },
  label: { ...typography.bodySmall, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  passwordWrap: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.md, paddingHorizontal: 14, height: 48, backgroundColor: '#f8fafc',
  },
  input: { flex: 1, ...typography.body, color: colors.textPrimary },
  inputError: { borderColor: colors.error },
  errorText: { ...typography.bodyXSmall, color: colors.error, marginTop: 4 },
  ruleList: { width: '100%', marginTop: 8, gap: 4 },
  ruleText: { ...typography.bodyXSmall, color: colors.textSecondary },
  ruleTextMet: { color: '#15803d', fontWeight: '600' },
  button: { height: 48, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center', marginTop: 8, width: '100%' },
  buttonText: { ...typography.button, color: '#ffffff', fontSize: 16 },
});
