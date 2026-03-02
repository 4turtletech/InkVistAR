import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { verifyOTP } from '../src/utils/api';

export function OTPVerification({ email, userType, onOTPVerified, onResendOTP, onCancel, autoSend = true }) {
  const [otp, setOTP] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);

  const handleSendOTP = async () => {
    try {
      const result = await onResendOTP();
      if (result && result.success) {
        Alert.alert('OTP Sent', `Code sent to ${email}`);
        setCountdown(300);
        setCanResend(false);
      } else {
        Alert.alert('Error', result?.message || 'Failed to send OTP');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send OTP');
    }
  };

  useEffect(() => {
    // Send OTP automatically on mount
    if (autoSend) {
      handleSendOTP();
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      return Alert.alert('Invalid Code', 'Please enter the 6-digit code.');
    }
    setLoading(true);
    const result = await verifyOTP(email, otp, userType);
    setLoading(false);

    if (result.success) {
      onOTPVerified(result.user);
    } else {
      Alert.alert('Invalid OTP', result.message || 'The code is incorrect or has expired.');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <LinearGradient colors={['#000000', '#1f1f1f', '#b8860b']} style={styles.container}>
      <View style={styles.card}>
        <Ionicons name="shield-checkmark" size={64} color="#daa520" style={styles.icon} />
        <Text style={styles.title}>Enter OTP</Text>
        <Text style={styles.subtitle}>for {email}</Text>

        <View style={styles.otpContainer}>
          <TextInput
            style={styles.otpInput}
            value={otp}
            onChangeText={setOTP}
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>

        {/* ONE TIMER */}
        {!canResend ? (
          <Text style={styles.timer}>
            Resend code in {formatTime(countdown)}
          </Text>
        ) : null}

        {/* VERIFY BUTTON */}
        <TouchableOpacity style={[styles.button, (loading || otp.length !== 6) && styles.disabledButton]} onPress={handleVerify} disabled={loading || otp.length !== 6}>
          <Text style={styles.buttonText}>
            {loading ? 'Verifying...' : 'Verify OTP'}
          </Text>
        </TouchableOpacity>

        {/* RESEND BUTTON */}
        {canResend ? (
          <TouchableOpacity onPress={handleSendOTP} style={styles.resendButton} disabled={!canResend}>
            <Text style={styles.resendText}>Resend OTP</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  icon: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6b7280', marginBottom: 32, textAlign: 'center' },
  otpContainer: { marginBottom: 24 },
  otpInput: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    width: 200,
    height: 60,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '600',
    borderColor: '#daa520',
  },
  timer: { fontSize: 14, color: '#6b7280', marginBottom: 24 },
  button: {
    backgroundColor: '#daa520',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#b8860b', // A slightly faded gold
  },
  buttonText: { color: 'white', fontSize: 18, fontWeight: '600' },
  resendButton: { padding: 12, marginTop: 8 },
  resendText: { color: '#daa520', fontSize: 16, fontWeight: '500' },
  cancelButton: {
    marginTop: 10,
  },
  cancelText: {
    color: '#6b7280',
    fontSize: 14,
  },
});