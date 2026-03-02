// mobile-app/screens/ResetPasswordPage.jsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export function ResetPasswordPage({ email, onSubmit }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isPasswordValid, setIsPasswordValid] = useState(false);

  const handlePasswordChange = (text) => {
    setNewPassword(text);
    
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
    } else if (text !== newPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
    } else {
      setErrors(prev => ({ ...prev, confirmPassword: '' }));
    }
  };

  const handleSubmit = async () => {
    if (!newPassword || !confirmPassword || errors.password || errors.confirmPassword) {
      Alert.alert('Error', 'Please fix the errors above');
      return;
    }

    setLoading(true);
    await onSubmit(newPassword);
    setLoading(false);
  };

  return (
    <LinearGradient colors={['#000000', '#1f1f1f', '#b8860b']} style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons name="lock-closed" size={32} color="#ffffff" />
        </View>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter a new password for {email}</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>New Password</Text>
          <View style={[styles.passwordContainer, errors.password && styles.inputError]}>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              value={newPassword}
              onChangeText={handlePasswordChange}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirm Password</Text>
          <View style={[styles.passwordContainer, errors.confirmPassword && styles.inputError]}>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              value={confirmPassword}
              onChangeText={handleConfirmPasswordChange}
              secureTextEntry={!showPassword}
            />
          </View>
          {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
        </View>

        <TouchableOpacity onPress={handleSubmit} disabled={loading}>
          <LinearGradient
            colors={['#000000', '#daa520']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Update Password</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#daa520',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 32 },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 48,
    backgroundColor: '#f9fafb',
  },
  input: { flex: 1, fontSize: 16, color: '#111827' },
  button: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  inputError: {
    borderColor: '#dc2626',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    marginTop: 4,
  },
});
