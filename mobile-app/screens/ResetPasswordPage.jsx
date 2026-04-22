/**
 * ResetPasswordPage.jsx -- New Password Entry
 * Themed with lucide icons + theme tokens. Preserves password strength validation.
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, Eye, EyeOff } from 'lucide-react-native';
import { colors, typography, borderRadius, shadows } from '../src/theme';

export function ResetPasswordPage({ email, onSubmit }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isPasswordValid, setIsPasswordValid] = useState(false);

  const handlePasswordChange = (text) => {
    setNewPassword(text);
    if (!text) { setErrors(p => ({ ...p, password: '' })); setIsPasswordValid(false); }
    else if (text.length < 8) { setErrors(p => ({ ...p, password: 'At least 8 characters' })); setIsPasswordValid(false); }
    else if (!/[A-Z]/.test(text)) { setErrors(p => ({ ...p, password: 'Requires 1 uppercase' })); setIsPasswordValid(false); }
    else if (!/\d/.test(text)) { setErrors(p => ({ ...p, password: 'Requires 1 number' })); setIsPasswordValid(false); }
    else if (!/[^a-zA-Z0-9]/.test(text)) { setErrors(p => ({ ...p, password: 'Requires 1 special character' })); setIsPasswordValid(false); }
    else { setErrors(p => ({ ...p, password: '' })); setIsPasswordValid(true); }
  };

  const handleConfirmChange = (text) => {
    setConfirmPassword(text);
    if (!text) setErrors(p => ({ ...p, confirmPassword: '' }));
    else if (!isPasswordValid) setErrors(p => ({ ...p, confirmPassword: 'Enter a valid password first' }));
    else if (text !== newPassword) setErrors(p => ({ ...p, confirmPassword: 'Passwords do not match' }));
    else setErrors(p => ({ ...p, confirmPassword: '' }));
  };

  const handleSubmit = async () => {
    if (!newPassword || !confirmPassword || errors.password || errors.confirmPassword) { Alert.alert('Error', 'Please fix the errors above'); return; }
    setLoading(true); await onSubmit(newPassword); setLoading(false);
  };

  return (
    <LinearGradient colors={['#0f172a', '#1e293b', colors.primaryDark]} style={styles.container}>
      <View style={styles.card}>
        <LinearGradient colors={['#0f172a', colors.primary]} style={styles.iconWrap}>
          <Lock size={28} color="#ffffff" />
        </LinearGradient>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter a new password for {email}</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>New Password</Text>
          <View style={[styles.passwordWrap, errors.password && styles.inputError]}>
            <TextInput style={styles.input} placeholder="Enter new password" placeholderTextColor={colors.textTertiary} value={newPassword} onChangeText={handlePasswordChange} secureTextEntry={!showPassword} />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={18} color={colors.textTertiary} /> : <Eye size={18} color={colors.textTertiary} />}
            </TouchableOpacity>
          </View>
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm Password</Text>
          <View style={[styles.passwordWrap, errors.confirmPassword && styles.inputError]}>
            <TextInput style={styles.input} placeholder="Confirm password" placeholderTextColor={colors.textTertiary} value={confirmPassword} onChangeText={handleConfirmChange} secureTextEntry={!showPassword} />
          </View>
          {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
        </View>

        <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.8}>
          <LinearGradient colors={['#0f172a', colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.button}>
            {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Update Password</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
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
  button: { height: 48, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center', marginTop: 8, width: '100%' },
  buttonText: { ...typography.button, color: '#ffffff', fontSize: 16 },
});
