/**
 * LoginPage.jsx -- Gilded Noir Auth Entry
 * Dark surface design with gold accents, cinematic branding.
 * Preserves all auth logic: lockout timer, email sanitization,
 * forgot password modal, verification modal, success modal.
 */

import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, Modal, Alert, Animated, StatusBar, Image, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeOff, Check, X, CheckCircle, ArrowRight, Mail, Lock, Sun, Moon } from 'lucide-react-native';
import { colors, typography, borderRadius, shadows } from '../src/theme';
import { useTheme } from '../src/context/ThemeContext';
import { API_URL } from '../src/utils/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BG_IMAGES = [
  require('../assets/bg_tattoo_1.png'),
  require('../assets/bg_tattoo_2.png'),
  require('../assets/bg_tattoo_3.png'),
];

export function LoginPage({ route, onLogin, onSwitchToRegister, onForgotPassword }) {
  const [email, setEmail] = useState(route.params?.prefillEmail || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Forgot Password State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Background slideshow
  const [bgIndex, setBgIndex] = useState(0);
  const bgOpacity = useRef(new Animated.Value(1)).current;

  // Global Theme State
  const { isDark, theme, toggleTheme } = useTheme();
  const overlayColor = isDark ? 'rgba(15,13,14,0.88)' : 'rgba(248,250,252,0.88)';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, damping: 18, useNativeDriver: true }),
    ]).start();

    // Crossfade background every 5 seconds
    const bgInterval = setInterval(() => {
      Animated.timing(bgOpacity, { toValue: 0, duration: 800, useNativeDriver: true }).start(() => {
        setBgIndex(i => (i + 1) % BG_IMAGES.length);
        Animated.timing(bgOpacity, { toValue: 1, duration: 800, useNativeDriver: true }).start();
      });
    }, 5000);
    return () => clearInterval(bgInterval);
  }, []);

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

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleEmailChange = (text) => {
    const sanitized = text.replace(/\s/g, '');
    setEmail(sanitized);
    if (sanitized !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized)) {
      setErrors(p => ({ ...p, email: 'Invalid email format' }));
    } else {
      setErrors(p => ({ ...p, email: null }));
    }
  };

  const handleEmailBlur = () => { setEmailFocused(false); if (!email.trim()) setErrors(p => ({ ...p, email: 'Email is required' })); };
  const handlePasswordChange = (text) => { setPassword(text); if (text && errors.password) setErrors(p => ({ ...p, password: null })); };
  const handlePasswordBlur = () => { setPasswordFocused(false); if (!password) setErrors(p => ({ ...p, password: 'Password is required' })); };

  const handleButtonPressIn = () => { Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true }).start(); };
  const handleButtonPressOut = () => { Animated.spring(buttonScale, { toValue: 1, damping: 15, useNativeDriver: true }).start(); };

  const handleSubmit = async () => {
    const cleanEmail = email.trim();
    let newErrors = {};
    let isValid = true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail) { newErrors.email = 'Email is required'; isValid = false; }
    else if (!emailRegex.test(cleanEmail)) { newErrors.email = 'Please enter a valid email address'; isValid = false; }
    if (!password) { newErrors.password = 'Password is required'; isValid = false; }
    setErrors(newErrors);

    if (!isValid) { triggerShake(); return; }

    if (lockoutTime > 0) { Alert.alert('Locked Out', `Please wait ${lockoutTime} seconds before trying again.`); return; }
    setIsLoading(true);
    const result = await onLogin(cleanEmail, password);
    setIsLoading(false);
    if (result && !result.success) {
      if (result.requireVerification) { setShowVerificationModal(true); }
      else {
        triggerShake();
        const n = failedAttempts + 1; setFailedAttempts(n);
        if (n >= 3) { setLockoutTime(30); Alert.alert('Too Many Attempts', 'Temporarily locked for 30 seconds.'); }
      }
    } else { setFailedAttempts(0); }
  };

  const handleResetSubmit = () => {
    if (!resetEmail.trim()) { Alert.alert('Error', 'Please enter your email address'); return; }
    if (onForgotPassword) { onForgotPassword(resetEmail, 'customer'); setShowForgotModal(false); setResetEmail(''); }
    else { Alert.alert('Coming Soon', 'Not connected yet.'); setShowForgotModal(false); }
  };

  const handleResendVerification = async () => {
    try {
      const response = await fetch(`${API_URL}/resend-verification`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();
      data.success ? (Alert.alert('Success', data.message), setShowVerificationModal(false)) : Alert.alert('Error', data.message);
    } catch (e) { Alert.alert('Error', 'Failed to connect to server'); }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundDeep }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.backgroundDeep} />

      {/* Animated Background */}
      <Animated.Image
        source={BG_IMAGES[bgIndex]}
        style={[styles.bgImage, { opacity: bgOpacity }]}
        blurRadius={2}
      />
      <View style={[styles.bgOverlay, { backgroundColor: overlayColor }]} />
      
      {/* Theme Toggle */}
      <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme}>
        {isDark ? <Sun size={22} color={theme.textPrimary} /> : <Moon size={22} color={theme.textPrimary} />}
      </TouchableOpacity>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Brand Header */}
          <Animated.View style={[styles.brandSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={[styles.brandSubtitle, { color: theme.goldMuted }]}>BGC'S PREMIER STUDIO</Text>
            <Text style={[styles.brandTitle, { color: theme.gold }]}>INKVICTUS</Text>
          </Animated.View>

          {/* Form Card */}
          <Animated.View style={[styles.formSection, { opacity: fadeAnim, transform: [{ translateX: shakeAnim }] }]}>

            <Text style={[styles.welcomeText, { color: theme.textPrimary }]}>Welcome Back</Text>
            <Text style={[styles.welcomeSub, { color: theme.textSecondary }]}>Sign in to continue your journey</Text>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <View style={[
                styles.inputWrap, 
                { backgroundColor: theme.darkBgSecondary, borderColor: theme.border },
                emailFocused && { borderColor: theme.gold, backgroundColor: isDark ? '#1E1B1C' : '#ffffff' }, 
                errors.email && { borderColor: theme.error }
              ]}>
                <Mail size={18} color={emailFocused ? theme.gold : theme.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.textPrimary }]}
                  placeholder="Email address"
                  placeholderTextColor={theme.textTertiary}
                  value={email}
                  onChangeText={handleEmailChange}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={handleEmailBlur}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  selectionColor={theme.gold}
                />
              </View>
              {errors.email && <Text style={[styles.errorText, { color: theme.error }]}>{errors.email}</Text>}
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <View style={[
                styles.inputWrap, 
                { backgroundColor: theme.darkBgSecondary, borderColor: theme.border },
                passwordFocused && { borderColor: theme.gold, backgroundColor: isDark ? '#1E1B1C' : '#ffffff' }, 
                errors.password && { borderColor: theme.error }
              ]}>
                <Lock size={18} color={passwordFocused ? theme.gold : theme.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.textPrimary }]}
                  placeholder="Password"
                  placeholderTextColor={theme.textTertiary}
                  value={password}
                  onChangeText={handlePasswordChange}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={handlePasswordBlur}
                  secureTextEntry={!showPassword}
                  selectionColor={theme.gold}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  {showPassword ? <EyeOff size={18} color={theme.textTertiary} /> : <Eye size={18} color={theme.textTertiary} />}
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={[styles.errorText, { color: theme.error }]}>{errors.password}</Text>}
            </View>

            {/* Remember & Forgot */}
            <View style={styles.row}>
              <TouchableOpacity style={styles.checkRow} onPress={() => setRememberMe(!rememberMe)}>
                <View style={[
                  styles.checkbox, 
                  { borderColor: theme.border },
                  rememberMe && { borderColor: theme.gold, backgroundColor: theme.gold }
                ]}>
                  {rememberMe && <Check size={12} color={theme.backgroundDeep} />}
                </View>
                <Text style={[styles.checkLabel, { color: theme.textSecondary }]}>Remember me</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowForgotModal(true)}>
                <Text style={[styles.forgotText, { color: theme.textSecondary }]}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* Sign In Button */}
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                onPress={handleSubmit}
                onPressIn={handleButtonPressIn}
                onPressOut={handleButtonPressOut}
                disabled={lockoutTime > 0}
                activeOpacity={1}
              >
                <View style={[
                  styles.button, 
                  { backgroundColor: theme.gold },
                  lockoutTime > 0 && { backgroundColor: theme.border }
                ]}>
                  <Text style={[styles.buttonText, { color: theme.backgroundDeep }]}>
                    {isLoading ? 'SIGNING IN...' : lockoutTime > 0 ? `WAIT ${lockoutTime}s` : 'SIGN IN'}
                  </Text>
                  {lockoutTime <= 0 && <ArrowRight size={18} color={theme.backgroundDeep} style={{ marginLeft: 8 }} />}
                </View>
              </TouchableOpacity>
            </Animated.View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: theme.textSecondary }]}>Don't have an account? </Text>
              <TouchableOpacity onPress={onSwitchToRegister}>
                <Text style={[styles.link, { color: theme.gold }]}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

        </ScrollView>

        {/* Forgot Password Modal */}
        <Modal visible={showForgotModal} transparent animationType="fade" onRequestClose={() => setShowForgotModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Reset Password</Text>
                <TouchableOpacity onPress={() => setShowForgotModal(false)} style={styles.modalClose}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalText}>Enter your email to receive a verification code.</Text>
              <View style={[styles.inputWrap, { marginBottom: 16 }]}>
                <Mail size={18} color={colors.textTertiary} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="your@email.com" placeholderTextColor={colors.textTertiary} value={resetEmail} onChangeText={setResetEmail} keyboardType="email-address" autoCapitalize="none" selectionColor={colors.gold} />
              </View>
              <TouchableOpacity onPress={handleResetSubmit} activeOpacity={0.8}>
                <View style={styles.button}>
                  <Text style={styles.buttonText}>SEND CODE</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Verification Modal */}
        <Modal visible={showVerificationModal} transparent animationType="fade" onRequestClose={() => setShowVerificationModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Account Not Verified</Text>
                <TouchableOpacity onPress={() => setShowVerificationModal(false)} style={styles.modalClose}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalText}>Your email has not been verified yet. Please check your inbox.</Text>
              <Text style={styles.modalText}>Link expired or didn't receive it?</Text>
              <TouchableOpacity onPress={handleResendVerification} activeOpacity={0.8}>
                <View style={styles.button}>
                  <Text style={styles.buttonText}>RESEND VERIFICATION LINK</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Success Modal */}
        <Modal visible={showSuccessModal} transparent animationType="fade" onRequestClose={() => setShowSuccessModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Success</Text>
                <TouchableOpacity onPress={() => setShowSuccessModal(false)} style={styles.modalClose}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View style={styles.successCircle}>
                  <CheckCircle size={40} color={colors.success} />
                </View>
              </View>
              <Text style={[styles.modalText, { textAlign: 'center' }]}>{successMessage}</Text>
              <TouchableOpacity onPress={() => setShowSuccessModal(false)} activeOpacity={0.8}>
                <View style={styles.button}>
                  <Text style={styles.buttonText}>CONTINUE</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  themeToggle: { position: 'absolute', top: 50, right: 24, zIndex: 10, padding: 8 },
  bgImage: { position: 'absolute', width: SCREEN_WIDTH, height: SCREEN_HEIGHT, resizeMode: 'cover' },
  bgOverlay: { position: 'absolute', width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: 'rgba(15,13,14,0.88)' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },

  // Brand Header
  brandSection: { alignItems: 'center', marginBottom: 40 },
  brandSubtitle: {
    fontSize: 11, fontWeight: '500', letterSpacing: 4, color: colors.goldMuted, marginBottom: 8,
  },
  brandTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 32, fontWeight: '700', letterSpacing: 8, color: colors.gold, marginBottom: 0,
  },

  // Form
  formSection: { paddingBottom: 20 },
  welcomeText: {
    fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: 6,
  },
  welcomeSub: { fontSize: 14, color: colors.textSecondary, marginBottom: 28 },

  // Inputs
  inputGroup: { marginBottom: 20 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', height: 52,
    backgroundColor: colors.darkBgSecondary, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14,
  },
  inputFocused: { borderColor: colors.gold, backgroundColor: '#1E1E1E' },
  inputError: { borderColor: colors.error },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: '100%', fontSize: 15, color: colors.textPrimary },
  eyeBtn: { padding: 4 },
  errorText: { fontSize: 12, color: colors.error, marginTop: 6, marginLeft: 4 },

  // Remember & Forgot
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: {
    width: 20, height: 20, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 5, justifyContent: 'center', alignItems: 'center',
  },
  checkboxActive: { borderColor: colors.gold, backgroundColor: colors.gold },
  checkLabel: { fontSize: 13, color: colors.textSecondary },
  forgotText: { fontSize: 13, color: colors.goldMuted, fontWeight: '500' },

  // Button
  button: {
    height: 52, borderRadius: 12, backgroundColor: colors.gold,
    justifyContent: 'center', alignItems: 'center', flexDirection: 'row',
    marginBottom: 20, ...shadows.button,
  },
  buttonDisabled: { backgroundColor: '#3A3A3A' },
  buttonText: {
    fontSize: 15, fontWeight: '700', letterSpacing: 1.5,
    color: colors.backgroundDeep,
  },

  // Footer
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 4 },
  footerText: { fontSize: 14, color: colors.textSecondary },
  link: { fontSize: 14, color: colors.gold, fontWeight: '600' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: colors.borderGold },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalClose: { padding: 4 },
  modalTitle: {
    fontSize: 18, fontWeight: '700', color: colors.textPrimary,
  },
  modalText: { fontSize: 14, color: colors.textSecondary, marginBottom: 16, lineHeight: 20 },
  successCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.successBg, justifyContent: 'center', alignItems: 'center' },
});
