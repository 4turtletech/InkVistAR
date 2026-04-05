import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🔥 VALIDATORS
const isEmailValid = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export function RegisterPage({ onRegister, onSwitchToLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // 🔥 EYE BUTTON STATES
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  // 🔥 SINGLE DEFINITIONS - NO DUPLICATES
  const handleNameChange = (text) => {
    setName(text);
    const trimmed = text.trim();
    
    if (!trimmed) {
      setErrors(prev => ({ ...prev, name: '' }));
    } else if (/[^a-zA-Z\s]/.test(trimmed)) {
      setErrors(prev => ({ ...prev, name: 'Name must contain letters only' }));
    } else if (trimmed.length < 8) {
      setErrors(prev => ({ ...prev, name: 'Name requires minimum 8 characters' }));
    } else if (trimmed.length > 20) {
      setErrors(prev => ({ ...prev, name: 'Name must not exceed 20 characters' }));
    } else {
      setErrors(prev => ({ ...prev, name: '' }));
    }
  };

  const handleEmailChange = (text) => {
    setEmail(text);
    const trimmed = text.trim();
    
    if (!trimmed) {
      setErrors(prev => ({ ...prev, email: '' }));
    } else if (!isEmailValid(trimmed)) {
      setErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
    } else {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const handlePhoneChange = (text) => {
    setPhone(text);
    const trimmed = text.trim();
    
    if (!trimmed) {
      setErrors(prev => ({ ...prev, phone: '' }));
    } else if (!/^\d+$/.test(trimmed)) {
      setErrors(prev => ({ ...prev, phone: 'Phone must contain numbers only' }));
    } else if (trimmed.length < 10) {
      setErrors(prev => ({ ...prev, phone: 'Phone number is too short' }));
    } else {
      setErrors(prev => ({ ...prev, phone: '' }));
    }
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    
    if (!text) {
      setErrors(prev => ({ ...prev, password: '' }));
      setIsPasswordValid(false);
    } else if (text.length < 8) {
      setErrors(prev => ({ ...prev, password: 'Password must be at least 8 characters' }));
      setIsPasswordValid(false);
    } else if (!/[A-Z]/.test(text)) {
      setErrors(prev => ({ ...prev, password: 'Password requires at least 1 uppercase letter' }));
      setIsPasswordValid(false);
    } else if (!/\d/.test(text)) {
      setErrors(prev => ({ ...prev, password: 'Password requires at least 1 number' }));
      setIsPasswordValid(false);
    } else if (!/[^a-zA-Z0-9]/.test(text)) {
      setErrors(prev => ({ ...prev, password: 'Password requires at least 1 special character' }));
      setIsPasswordValid(false);
    } else {
      setErrors(prev => ({ ...prev, password: '' }));
      setIsPasswordValid(true);
    }
  };

  const handleConfirmPasswordChange = (text) => {
    setConfirmPassword(text);
    
    if (!text) {
      setErrors(prev => ({ ...prev, confirmPassword: '' }));
    } else if (!isPasswordValid) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Please enter a valid password first' }));
    } else if (text !== password) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
    } else {
      setErrors(prev => ({ ...prev, confirmPassword: '' }));
    }
  };

  // 🔥 BLUR HANDLERS
  const handleNameBlur = () => {
    if (!name.trim()) {
      setErrors(prev => ({ ...prev, name: 'Full name is required' }));
    }
  };

  const handleEmailBlur = () => {
    if (!email.trim()) {
      setErrors(prev => ({ ...prev, email: 'Email address is required' }));
    }
  };

  const handlePhoneBlur = () => {
    if (!phone.trim()) {
      setErrors(prev => ({ ...prev, phone: 'Phone number is required' }));
    }
  };

  const handlePasswordBlur = () => {
    if (!password.trim()) {
      setErrors(prev => ({ ...prev, password: 'Password is required' }));
    }
  };

  const handleConfirmPasswordBlur = () => {
    if (!confirmPassword.trim()) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Please confirm your password' }));
    }
  };

  const validateForm = () => {
  const err = {};
  
  if (!name.trim()) err.name = 'Full name is required';
  else if (/[^a-zA-Z\s]/.test(name.trim())) err.name = 'Name must contain letters only';
  else if (name.trim().length < 8) err.name = 'Name requires minimum 8 characters';
  else if (name.trim().length > 20) err.name = 'Name must not exceed 20 characters';
  
  if (!email.trim()) err.email = 'Email address is required';
  else if (!isEmailValid(email)) err.email = 'Please enter a valid email address';
  
  if (!phone.trim()) err.phone = 'Phone number is required';
  else if (!/^\d+$/.test(phone.trim())) err.phone = 'Phone must contain numbers only';

  // 🔥 FIX: RESPECT REAL-TIME PASSWORD VALIDATION
  if (!password) err.password = 'Password is required';
  else if (errors.password) err.password = errors.password; // Keep real-time error
  else if (!isPasswordValid) err.password = 'Password is invalid';
  
  // 🔥 FIX: CONFIRM PASSWORD LOGIC
  if (!confirmPassword) err.confirmPassword = 'Please confirm your password';
  else if (!isPasswordValid) err.confirmPassword = 'Please enter a valid password first';
  else if (confirmPassword !== password) err.confirmPassword = 'Passwords do not match';
  
  if (!agreedToTerms) err.terms = 'You must accept the Terms of Service';
  
  setErrors(err);
  return err;
};


  const handleSubmit = async () => {
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      Alert.alert('Registration Failed', Object.values(formErrors).join('\n'));
      return;
    }

    try {
      setSubmitted(true);
      const orphanIdStr = await AsyncStorage.getItem('orphanAppointmentId');
      const orphanAppointmentId = orphanIdStr ? parseInt(orphanIdStr, 10) : null;
      
      const result = await onRegister(name.trim(), email.toLowerCase().trim(), password, phone.trim(), 'customer', orphanAppointmentId);
      
      if (result && !result.success) {
        setSubmitted(false);
      }
    } catch (error) {
      Alert.alert('Registration Failed', error.message || 'Please try again');
      setSubmitted(false);
    }
  };

  return (
    <LinearGradient colors={['#000000', '#1f1f1f', '#b8860b']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
              <LinearGradient colors={['#000000', '#daa520']} style={styles.iconContainer}>
                <Ionicons name="color-palette" size={32} color="#ffffff" />
              </LinearGradient>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Start your tattoo journey today</Text>
            </View>

            {/* ALL FIELDS */}
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="Full name"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={handleNameChange}
                onBlur={handleNameBlur}
                autoCapitalize="words"
              />
              {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="your@email.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={handleEmailChange}
                onBlur={handleEmailBlur}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                placeholder="Phone Number"
                placeholderTextColor="#9CA3AF"
                value={phone}
                onChangeText={handlePhoneChange}
                onBlur={handlePhoneBlur}
                keyboardType="phone-pad"
              />
              {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
            </View>

            <View style={styles.inputContainer}>
              <View style={[styles.passwordContainer, errors.password && styles.inputError]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={handlePasswordChange}
                  onBlur={handlePasswordBlur}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            <View style={styles.inputContainer}>
              <View style={[styles.passwordContainer, errors.confirmPassword && styles.inputError]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Confirm password"
                  placeholderTextColor="#9CA3AF"
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                  onBlur={handleConfirmPasswordBlur}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
            </View>

            <TouchableOpacity style={styles.checkboxRow} onPress={() => setAgreedToTerms(!agreedToTerms)}>
              <View style={[styles.checkbox, errors.terms && styles.checkboxError]}>
                {agreedToTerms && <Ionicons name="checkmark" size={16} color="#daa520" />}
              </View>
              <Text style={styles.checkboxLabel}>I agree to Terms of Service and Privacy Policy</Text>
            </TouchableOpacity>
            {errors.terms ? <Text style={styles.errorText}>{errors.terms}</Text> : null}

            <TouchableOpacity onPress={handleSubmit} disabled={submitted}>
              <LinearGradient colors={['#000000', '#daa520']} style={styles.button}>
                <Text style={styles.buttonText}>
                  {submitted ? 'Creating Account...' : 'Create Account'}
                </Text>
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
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 16, paddingTop: 40 },
  card: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2,
    shadowRadius: 16, elevation: 8,
  },
  header: { alignItems: 'center', marginBottom: 24 },
  iconContainer: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280' },
  userTypeContainer: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 },
  userTypeButtons: { flexDirection: 'row', gap: 12 },
  userTypeButton: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 2, borderColor: '#e5e7eb', backgroundColor: '#ffffff', alignItems: 'center' },
  userTypeButtonActive: { borderColor: '#daa520', backgroundColor: '#fef3c7' },
  userTypeEmoji: { fontSize: 24, marginBottom: 4 },
  userTypeText: { fontSize: 14, color: '#374151' },
  userTypeTextActive: { color: '#b8860b' },
  inputContainer: { marginBottom: 20 },
  input: { height: 48, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 16, fontSize: 16, color: '#27282a', backgroundColor: '#f9fafb' },
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
  passwordInput: { flex: 1, height: '100%', fontSize: 16, color: '#27282a' },
  eyeButton: { padding: 8 },
  inputError: { borderColor: '#ef4444' },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: 4 },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 24 },
  checkbox: { width: 20, height: 20, borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 4, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  checkboxError: { borderColor: '#ef4444' },
  checkboxLabel: { flex: 1, fontSize: 14, color: '#6b7280' },
  button: { height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { fontSize: 14, color: '#6b7280' },
  link: { fontSize: 14, color: '#daa520', fontWeight: '600' },
});
