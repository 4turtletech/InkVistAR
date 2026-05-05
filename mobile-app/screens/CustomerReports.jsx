/**
 * CustomerReports.jsx -- Bug Reports and Feedback (Gilded Noir v2)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Animated, ScrollView
} from 'react-native';
import { ArrowLeft, Flag, Sparkles, AlertTriangle, Bug, CheckCircle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../src/context/ThemeContext';
import { AnimatedTouchable } from '../src/components/shared/AnimatedTouchable';
import { typography, borderRadius, shadows } from '../src/theme';
import { fetchAPI } from '../src/utils/api';

export const CustomerReports = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  
  const [reportType, setReportType] = useState('bug');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const contentAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(contentAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleSubmit = async () => {
    if (!message.trim()) { Alert.alert('Missing Details', 'Please provide some details for your report.'); return; }
    try {
      setSubmitting(true);
      const userStr = await AsyncStorage.getItem('user_session');
      if (userStr) {
        const user = JSON.parse(userStr);
        const res = await fetchAPI('/reports', {
          method: 'POST',
          body: JSON.stringify({
            customer_id: user.id,
            report_type: reportType,
            category: 'other',
            title: `${reportType.toUpperCase()} Report`,
            description: message
          })
        });
        
        if (res.success || res.status === 201 || res.status === 200) {
          triggerSuccessAnimation();
        } else {
          Alert.alert('Error', res.message || 'Failed to submit report.');
        }
      } else {
        Alert.alert('Error', 'User session not found.');
      }
    } catch (e) {
       Alert.alert('Error', 'Failed to connect to the server.');
    }
    finally { setSubmitting(false); }
  };

  const triggerSuccessAnimation = () => {
    setSuccess(true);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(successOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(successScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true })
      ]),
      Animated.delay(1500),
      Animated.timing(successOpacity, { toValue: 0, duration: 300, useNativeDriver: true })
    ]).start(() => {
      navigation.goBack();
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reports & Feedback</Text>
          <View style={{ width: 36 }} />
        </View>

        <Animated.ScrollView style={[styles.content, { opacity: contentAnim, transform: [{ translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]} contentContainerStyle={{ padding: 20 }}>
          
          <Text style={styles.sectionTitle}>What would you like to report?</Text>
          
          <View style={styles.typeSelector}>
            <AnimatedTouchable 
              style={[styles.typeBtn, reportType === 'bug' && styles.typeBtnActive]} 
              onPress={() => { setReportType('bug'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Bug size={18} color={reportType === 'bug' ? theme.gold : theme.textSecondary} />
              <Text style={[styles.typeBtnText, reportType === 'bug' && styles.typeBtnTextActive]}>App Bug</Text>
            </AnimatedTouchable>
            
            <AnimatedTouchable 
              style={[styles.typeBtn, reportType === 'feedback' && styles.typeBtnActive]} 
              onPress={() => { setReportType('feedback'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Sparkles size={18} color={reportType === 'feedback' ? theme.gold : theme.textSecondary} />
              <Text style={[styles.typeBtnText, reportType === 'feedback' && styles.typeBtnTextActive]}>Feedback</Text>
            </AnimatedTouchable>

            <AnimatedTouchable 
              style={[styles.typeBtn, reportType === 'other' && styles.typeBtnActive]} 
              onPress={() => { setReportType('other'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Flag size={18} color={reportType === 'other' ? theme.gold : theme.textSecondary} />
              <Text style={[styles.typeBtnText, reportType === 'other' && styles.typeBtnTextActive]}>Other</Text>
            </AnimatedTouchable>
          </View>

          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>Details</Text>
            <TextInput
              style={[styles.textInput, isFocused && { borderColor: theme.gold, backgroundColor: theme.surface }]}
              placeholder={reportType === 'bug' ? "Describe the issue you encountered..." : "How can we improve your experience?"}
              placeholderTextColor={theme.textTertiary}
              multiline
              numberOfLines={6}
              value={message}
              onChangeText={setMessage}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              textAlignVertical="top"
            />
          </View>

          <AnimatedTouchable
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <View style={styles.submitBtnInner}>
              {submitting ? <ActivityIndicator color={theme.backgroundDeep} /> : (
                <>
                  <Flag size={18} color={theme.backgroundDeep} />
                  <Text style={styles.submitBtnText}>Submit Report</Text>
                </>
              )}
            </View>
          </AnimatedTouchable>
          
        </Animated.ScrollView>

        {/* Success Overlay Animation */}
        {success && (
          <Animated.View style={[styles.successOverlay, { opacity: successOpacity }]}>
            <Animated.View style={[styles.successCard, { transform: [{ scale: successScale }] }]}>
              <View style={styles.successIconBg}>
                <CheckCircle size={48} color={theme.gold} />
              </View>
              <Text style={styles.successTitle}>Report Sent!</Text>
              <Text style={styles.successDesc}>Thank you for your feedback.</Text>
            </Animated.View>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingTop: Platform.OS === 'android' ? 52 : 16, backgroundColor: theme.surface,
    borderBottomWidth: 1, borderBottomColor: theme.border, ...shadows.subtle
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.surfaceLight, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...typography.h3, color: theme.textPrimary },
  content: { flex: 1 },
  sectionTitle: { ...typography.h3, color: theme.textPrimary, marginBottom: 16 },
  
  typeSelector: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  typeBtn: {
    flex: 1, backgroundColor: theme.surface, paddingVertical: 12, borderRadius: borderRadius.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: theme.border, ...shadows.subtle,
  },
  typeBtnActive: { borderColor: theme.gold, backgroundColor: theme.surfaceLight },
  typeBtnText: { ...typography.bodySmall, color: theme.textSecondary, fontWeight: '600' },
  typeBtnTextActive: { color: theme.gold },

  inputWrap: { width: '100%', marginBottom: 32 },
  inputLabel: { ...typography.bodySmall, color: theme.textSecondary, marginBottom: 8, fontWeight: '600' },
  textInput: {
    backgroundColor: theme.surfaceLight, color: theme.textPrimary,
    borderRadius: borderRadius.lg, padding: 16, minHeight: 160, ...typography.body,
    borderWidth: 1, borderColor: theme.border,
  },
  submitBtn: {
    backgroundColor: theme.gold, paddingVertical: 18,
    borderRadius: borderRadius.lg, ...shadows.subtle
  },
  submitBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%'
  },
  submitBtnText: { ...typography.button, color: theme.backgroundDeep, fontSize: 16 },

  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,13,14,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  successCard: {
    backgroundColor: theme.surface,
    padding: 32,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    ...shadows.medium,
  },
  successIconBg: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: `${theme.gold}20`,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: { ...typography.h2, color: theme.textPrimary, marginBottom: 8 },
  successDesc: { ...typography.body, color: theme.textSecondary },
});
