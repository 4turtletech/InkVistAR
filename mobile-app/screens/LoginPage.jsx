import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Modal, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
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
    // When navigating from Register, pre-fill email and show message
    if (route.params?.prefillEmail) {
      setEmail(route.params.prefillEmail);
    }
    if (route.params?.message) {
      setSuccessMessage(route.params.message);
      setShowSuccessModal(true);
    }
  }, [route.params]);

  // Timer for lockout
  useEffect(() => {
    let interval;
    if (lockoutTime > 0) {
      interval = setInterval(() => {
        setLockoutTime((prev) => prev - 1);
      }, 1000);
    } else if (lockoutTime === 0 && failedAttempts >= 3) {
      setFailedAttempts(0); // Reset attempts after lockout expires
    }
    return () => clearInterval(interval);
  }, [lockoutTime]);

  const handleEmailChange = (text) => {
    // Sanitize: Remove spaces automatically
    const sanitized = text.replace(/\s/g, '');
    setEmail(sanitized);
    
    // Live Validation
    if (sanitized !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized)) {
      setErrors(prev => ({ ...prev, email: 'Invalid email format' }));
    } else {
      setErrors(prev => ({ ...prev, email: null }));
    }
  };

  const handleEmailBlur = () => {
    if (!email.trim()) {
      setErrors(prev => ({ ...prev, email: 'Email is required' }));
    }
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    if (text && errors.password) {
      setErrors(prev => ({ ...prev, password: null }));
    }
  };

  const handlePasswordBlur = () => {
    if (!password) {
      setErrors(prev => ({ ...prev, password: 'Password is required' }));
    }
  };

  const handleSubmit = async () => {
    const cleanEmail = email.trim();
    let newErrors = {};
    let isValid = true;

    // Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!emailRegex.test(cleanEmail)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    // Password Validation
    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    }

    setErrors(newErrors);

    if (isValid) {
      if (lockoutTime > 0) {
        Alert.alert('Locked Out', `Please wait ${lockoutTime} seconds before trying again.`);
        return;
      }

      const result = await onLogin(cleanEmail, password);
      
      if (result && !result.success) {
        if (result.requireVerification) {
          setShowVerificationModal(true);
        } else {
          const newAttempts = failedAttempts + 1;
          setFailedAttempts(newAttempts);
          
          if (newAttempts >= 3) {
            setLockoutTime(30); // 30 seconds lockout
            Alert.alert('Too Many Attempts', 'You have been temporarily locked out for 30 seconds.');
          }
        }
      } else {
        setFailedAttempts(0);
      }
    }
  };

  const handleResetSubmit = () => {
    if (!resetEmail.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    if (onForgotPassword) {
      onForgotPassword(resetEmail, 'customer');
      setShowForgotModal(false);
      setResetEmail('');
    } else {
      Alert.alert('Coming Soon', 'This feature is not connected yet.');
      setShowForgotModal(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      const response = await fetch(`${API_URL}/api/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert('Success', data.message);
        setShowVerificationModal(false);
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to server');
    }
  };

  return (
    <LinearGradient
      colors={['#000000', '#1f1f1f', '#b8860b']}
      style={styles.container}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.header}>
              <LinearGradient
                colors={['#000000', '#daa520']}
                style={styles.iconContainer}
              >
                <Ionicons name="color-palette" size={32} color="#ffffff" />
              </LinearGradient>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to your tattoo journey</Text>
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="your@email.com"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={handleEmailChange}
                onBlur={handleEmailBlur}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.passwordContainer, errors.password && styles.inputError]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={handlePasswordChange}
                  onBlur={handlePasswordBlur}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            {/* Remember Me & Forgot Password */}
            <View style={styles.row}>
              <TouchableOpacity 
                style={styles.checkboxRow}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={styles.checkbox}>
                  {rememberMe && <Ionicons name="checkmark" size={16} color="#daa520" />}
                </View>
                <Text style={styles.checkboxLabel}>Remember me</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowForgotModal(true)}>
                <Text style={styles.forgotPassword}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity onPress={handleSubmit} disabled={lockoutTime > 0}>
              <LinearGradient
                colors={lockoutTime > 0 ? ['#6b7280', '#9ca3af'] : ['#000000', '#daa520']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>{lockoutTime > 0 ? `Wait ${lockoutTime}s` : 'Sign In'}</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={onSwitchToRegister}>
                <Text style={styles.link}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Forgot Password Modal */}
        <Modal
          visible={showForgotModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowForgotModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Reset Password</Text>
                <TouchableOpacity onPress={() => setShowForgotModal(false)}>
                  <Ionicons name="close" size={24} color="#111827" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalText}>Enter your email to receive a verification code.</Text>
              
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor="#9ca3af"
                value={resetEmail}
                onChangeText={setResetEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TouchableOpacity onPress={handleResetSubmit}>
                <LinearGradient
                  colors={['#000000', '#daa520']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.button}
                >
                  <Text style={styles.buttonText}>Send Code</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Verification Modal */}
        <Modal
          visible={showVerificationModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowVerificationModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Account Not Verified</Text>
                <TouchableOpacity onPress={() => setShowVerificationModal(false)}>
                  <Ionicons name="close" size={24} color="#111827" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalText}>Your email address has not been verified yet. Please check your inbox for the verification link.</Text>
              <Text style={styles.modalText}>Link expired or didn't receive it?</Text>
              
              <TouchableOpacity onPress={handleResendVerification}>
                <LinearGradient
                  colors={['#000000', '#daa520']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.button}
                >
                  <Text style={styles.buttonText}>Resend Verification Link</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Success Modal (Registration) */}
        <Modal
          visible={showSuccessModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowSuccessModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Success</Text>
                <TouchableOpacity onPress={() => setShowSuccessModal(false)}>
                  <Ionicons name="close" size={24} color="#111827" />
                </TouchableOpacity>
              </View>
              
              <View style={{alignItems: 'center', marginBottom: 16}}>
                <Ionicons name="checkmark-circle" size={48} color="#10b981" />
              </View>
              <Text style={[styles.modalText, {textAlign: 'center'}]}>{successMessage}</Text>
              
              <TouchableOpacity onPress={() => setShowSuccessModal(false)}>
                <LinearGradient
                  colors={['#000000', '#daa520']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.button}
                >
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
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  userTypeContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  userTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  userTypeButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  userTypeButtonActive: {
    borderColor: '#daa520',
    backgroundColor: '#fef3c7',
  },
  userTypeEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  userTypeText: {
    fontSize: 14,
    color: '#374151',
  },
  userTypeTextActive: {
    color: '#b8860b',
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  inputError: {
    borderColor: '#dc2626',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    marginTop: 4,
  },
  passwordContainer: { 
    flexDirection: 'row', 
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
  },
  passwordInput: { flex: 1, height: '100%', fontSize: 16, color: '#111827' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  forgotPassword: {
    fontSize: 14,
    color: '#daa520',
    fontWeight: '600',
  },
  button: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
  },
  link: {
    fontSize: 14,
    color: '#daa520',
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  modalText: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
});
