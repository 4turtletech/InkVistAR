/**
 * RegisterPage.jsx -- Account Creation
 * Themed with lucide icons + theme tokens. Preserves all validation:
 * name, email, phone, password strength, confirm match, terms checkbox.
 */

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Palette, Eye, EyeOff, Check } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, borderRadius, shadows } from '../src/theme';

const isEmailValid = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export function RegisterPage({ onRegister, onSwitchToLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleNameChange = (text) => {
    setName(text); const t = text.trim();
    if (!t) setErrors(p => ({ ...p, name: '' }));
    else if (/[^a-zA-Z\s]/.test(t)) setErrors(p => ({ ...p, name: 'Name must contain letters only' }));
    else if (t.length < 8) setErrors(p => ({ ...p, name: 'Name requires minimum 8 characters' }));
    else if (t.length > 20) setErrors(p => ({ ...p, name: 'Name must not exceed 20 characters' }));
    else setErrors(p => ({ ...p, name: '' }));
  };

  const handleEmailChange = (text) => {
    setEmail(text); const t = text.trim();
    if (!t) setErrors(p => ({ ...p, email: '' }));
    else if (!isEmailValid(t)) setErrors(p => ({ ...p, email: 'Please enter a valid email address' }));
    else setErrors(p => ({ ...p, email: '' }));
  };

  const handlePhoneChange = (text) => {
    setPhone(text); const t = text.trim();
    if (!t) setErrors(p => ({ ...p, phone: '' }));
    else if (!/^\d+$/.test(t)) setErrors(p => ({ ...p, phone: 'Phone must contain numbers only' }));
    else if (t.length < 10) setErrors(p => ({ ...p, phone: 'Phone number is too short' }));
    else setErrors(p => ({ ...p, phone: '' }));
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    if (!text) { setErrors(p => ({ ...p, password: '' })); setIsPasswordValid(false); }
    else if (text.length < 8) { setErrors(p => ({ ...p, password: 'At least 8 characters' })); setIsPasswordValid(false); }
    else if (!/[A-Z]/.test(text)) { setErrors(p => ({ ...p, password: 'Requires 1 uppercase letter' })); setIsPasswordValid(false); }
    else if (!/\d/.test(text)) { setErrors(p => ({ ...p, password: 'Requires 1 number' })); setIsPasswordValid(false); }
    else if (!/[^a-zA-Z0-9]/.test(text)) { setErrors(p => ({ ...p, password: 'Requires 1 special character' })); setIsPasswordValid(false); }
    else { setErrors(p => ({ ...p, password: '' })); setIsPasswordValid(true); }
  };

  const handleConfirmChange = (text) => {
    setConfirmPassword(text);
    if (!text) setErrors(p => ({ ...p, confirmPassword: '' }));
    else if (!isPasswordValid) setErrors(p => ({ ...p, confirmPassword: 'Enter a valid password first' }));
    else if (text !== password) setErrors(p => ({ ...p, confirmPassword: 'Passwords do not match' }));
    else setErrors(p => ({ ...p, confirmPassword: '' }));
  };

  const handleNameBlur = () => { if (!name.trim()) setErrors(p => ({ ...p, name: 'Full name is required' })); };
  const handleEmailBlur = () => { if (!email.trim()) setErrors(p => ({ ...p, email: 'Email is required' })); };
  const handlePhoneBlur = () => { if (!phone.trim()) setErrors(p => ({ ...p, phone: 'Phone is required' })); };
  const handlePasswordBlur = () => { if (!password) setErrors(p => ({ ...p, password: 'Password is required' })); };
  const handleConfirmBlur = () => { if (!confirmPassword) setErrors(p => ({ ...p, confirmPassword: 'Please confirm password' })); };

  const validateForm = () => {
    const err = {};
    if (!name.trim()) err.name = 'Full name is required';
    else if (/[^a-zA-Z\s]/.test(name.trim())) err.name = 'Letters only';
    else if (name.trim().length < 8) err.name = 'Min 8 characters';
    if (!email.trim()) err.email = 'Email is required';
    else if (!isEmailValid(email)) err.email = 'Invalid email';
    if (!phone.trim()) err.phone = 'Phone is required';
    else if (!/^\d+$/.test(phone.trim())) err.phone = 'Numbers only';
    if (!password) err.password = 'Password is required';
    else if (errors.password) err.password = errors.password;
    else if (!isPasswordValid) err.password = 'Password is invalid';
    if (!confirmPassword) err.confirmPassword = 'Confirm password';
    else if (!isPasswordValid) err.confirmPassword = 'Enter valid password first';
    else if (confirmPassword !== password) err.confirmPassword = 'Passwords do not match';
    if (!agreedToTerms) err.terms = 'You must accept the Terms of Service';
    setErrors(err); return err;
  };

  const handleSubmit = async () => {
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) { Alert.alert('Registration Failed', Object.values(formErrors).join('\n')); return; }
    try {
      setSubmitted(true);
      const orphanStr = await AsyncStorage.getItem('orphanAppointmentId');
      const orphanId = orphanStr ? parseInt(orphanStr, 10) : null;
      const result = await onRegister(name.trim(), email.toLowerCase().trim(), password, phone.trim(), 'customer', orphanId);
      if (result && !result.success) setSubmitted(false);
    } catch (e) { Alert.alert('Registration Failed', e.message || 'Please try again'); setSubmitted(false); }
  };

  const renderField = (placeholder, value, onChange, onBlur, errorKey, opts = {}) => (
    <View style={styles.inputGroup}>
      {opts.isPassword ? (
        <View style={[styles.passwordWrap, errors[errorKey] && styles.inputError]}>
          <TextInput style={styles.passwordInput} placeholder={placeholder} placeholderTextColor={colors.textTertiary} value={value} onChangeText={onChange} onBlur={onBlur} secureTextEntry={!opts.show} {...opts.extra} />
          <TouchableOpacity onPress={opts.toggle}>
            {opts.show ? <EyeOff size={18} color={colors.textTertiary} /> : <Eye size={18} color={colors.textTertiary} />}
          </TouchableOpacity>
        </View>
      ) : (
        <TextInput style={[styles.input, errors[errorKey] && styles.inputError]} placeholder={placeholder} placeholderTextColor={colors.textTertiary} value={value} onChangeText={onChange} onBlur={onBlur} {...(opts.extra || {})} />
      )}
      {errors[errorKey] ? <Text style={styles.errorText}>{errors[errorKey]}</Text> : null}
    </View>
  );

  return (
    <LinearGradient colors={['#0f172a', '#1e293b', colors.primaryDark]} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <View style={styles.header}>
              <LinearGradient colors={['#0f172a', colors.primary]} style={styles.iconWrap}>
                <Palette size={28} color="#ffffff" />
              </LinearGradient>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Start your tattoo journey today</Text>
            </View>

            {renderField('Full name', name, handleNameChange, handleNameBlur, 'name', { extra: { autoCapitalize: 'words' } })}
            {renderField('your@email.com', email, handleEmailChange, handleEmailBlur, 'email', { extra: { keyboardType: 'email-address', autoCapitalize: 'none' } })}
            {renderField('Phone Number', phone, handlePhoneChange, handlePhoneBlur, 'phone', { extra: { keyboardType: 'phone-pad' } })}
            {renderField('Password', password, handlePasswordChange, handlePasswordBlur, 'password', { isPassword: true, show: showPassword, toggle: () => setShowPassword(!showPassword) })}
            {renderField('Confirm password', confirmPassword, handleConfirmChange, handleConfirmBlur, 'confirmPassword', { isPassword: true, show: showConfirmPassword, toggle: () => setShowConfirmPassword(!showConfirmPassword) })}

            <TouchableOpacity style={styles.checkRow} onPress={() => setAgreedToTerms(!agreedToTerms)}>
              <View style={[styles.checkbox, agreedToTerms && styles.checkboxActive, errors.terms && styles.checkboxError]}>
                {agreedToTerms && <Check size={14} color={colors.primary} />}
              </View>
              <Text style={styles.checkLabel}>I agree to Terms of Service and Privacy Policy</Text>
            </TouchableOpacity>
            {errors.terms ? <Text style={styles.errorText}>{errors.terms}</Text> : null}

            <TouchableOpacity onPress={handleSubmit} disabled={submitted} activeOpacity={0.8}>
              <LinearGradient colors={['#0f172a', colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.button}>
                <Text style={styles.buttonText}>{submitted ? 'Creating Account...' : 'Create Account'}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={onSwitchToLogin}>
                <Text style={styles.link}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 16, paddingTop: 40 },
  card: { backgroundColor: '#ffffff', borderRadius: borderRadius.xxl, padding: 28, ...shadows.cardStrong },
  header: { alignItems: 'center', marginBottom: 24 },
  iconWrap: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: 6 },
  subtitle: { ...typography.body, color: colors.textSecondary },
  inputGroup: { marginBottom: 18 },
  input: {
    height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    paddingHorizontal: 14, ...typography.body, color: colors.textPrimary, backgroundColor: '#f8fafc',
  },
  inputError: { borderColor: colors.error },
  errorText: { ...typography.bodyXSmall, color: colors.error, marginTop: 4 },
  passwordWrap: {
    flexDirection: 'row', alignItems: 'center', height: 48, borderWidth: 1,
    borderColor: colors.border, borderRadius: borderRadius.md, paddingHorizontal: 14, backgroundColor: '#f8fafc',
  },
  passwordInput: { flex: 1, height: '100%', ...typography.body, color: colors.textPrimary },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 20 },
  checkbox: { width: 20, height: 20, borderWidth: 2, borderColor: colors.border, borderRadius: 4, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  checkboxActive: { borderColor: colors.primary },
  checkboxError: { borderColor: colors.error },
  checkLabel: { flex: 1, ...typography.bodySmall, color: colors.textSecondary },
  button: { height: 48, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  buttonText: { ...typography.button, color: '#ffffff', fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { ...typography.body, color: colors.textSecondary },
  link: { ...typography.body, color: colors.primary, fontWeight: '700' },
});
