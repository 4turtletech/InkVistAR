/**
 * CustomerReview.jsx -- Rate Your Session
 * Themed with lucide icons, star rating, and theme tokens.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Animated,
} from 'react-native';
import { ArrowLeft, Star, Sparkles } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../src/context/ThemeContext';
import { AnimatedTouchable } from '../src/components/shared/AnimatedTouchable';
import { typography, borderRadius, shadows } from '../src/theme';
import { submitReview } from '../src/utils/api';

const InteractiveStar = ({ s, rating, setRating, theme }) => {
  const scale = useRef(new Animated.Value(1)).current;
  
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRating(s);
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.3, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 100, friction: 5 })
    ]).start();
  };

  const isActive = rating >= s;

  return (
    <AnimatedTouchable onPress={handlePress} style={{ transform: [{ scale }] }}>
      <Star
        size={42}
        color={isActive ? theme.gold : theme.textTertiary}
        fill={isActive ? theme.gold : 'transparent'}
        strokeWidth={isActive ? 2 : 1.5}
      />
    </AnimatedTouchable>
  );
};

export const CustomerReview = ({ route, navigation }) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const appointmentId = route.params?.appointmentId;
  const artistId = route.params?.artistId;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(contentAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleSubmit = async () => {
    if (rating === 0) { Alert.alert('Missing Rating', 'Please select a star rating.'); return; }
    try {
      setSubmitting(true);
      const userStr = await AsyncStorage.getItem('user_data');
      if (userStr) {
        const user = JSON.parse(userStr);
        const res = await submitReview({ customer_id: user.id, artist_id: artistId, appointment_id: appointmentId, rating, comment });
        if (res.success) {
          Alert.alert('Thank You', 'Your review has been submitted for moderation.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
        } else { Alert.alert('Error', res.message || 'Failed to submit review.'); }
      }
    } catch (e) { Alert.alert('Error', 'An error occurred while submitting.'); }
    finally { setSubmitting(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rate Your Session</Text>
          <View style={{ width: 36 }} />
        </View>

        <Animated.View style={[styles.content, { opacity: contentAnim, transform: [{ translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
          <View style={styles.ratingCard}>
            <Text style={styles.prompt}>How was your tattoo session?</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(s => (
                <InteractiveStar key={s} s={s} rating={rating} setRating={setRating} theme={theme} />
              ))}
            </View>
            {rating > 0 && (
              <Text style={styles.ratingLabel}>
                {['', 'Poor', 'Fair', 'Good', 'Great', 'Amazing'][rating]}
              </Text>
            )}

            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Comments & Feedback</Text>
              <TextInput
                style={[styles.textInput, isFocused && { borderColor: theme.gold, backgroundColor: theme.surface }]}
                placeholder="Share your experience (optional)..."
                placeholderTextColor={theme.textTertiary}
                multiline
                numberOfLines={5}
                value={comment}
                onChangeText={setComment}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                textAlignVertical="top"
              />
            </View>
          </View>

          <AnimatedTouchable
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator color={theme.backgroundDeep} /> : (
              <>
                <Sparkles size={18} color={theme.backgroundDeep} />
                <Text style={styles.submitBtnText}>Submit Review</Text>
              </>
            )}
          </AnimatedTouchable>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingTop: 52, backgroundColor: theme.surface,
    borderBottomWidth: 1, borderBottomColor: theme.border, ...shadows.subtle
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.surfaceLight, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...typography.h3, color: theme.textPrimary },
  content: { padding: 20, flex: 1, justifyContent: 'center' },
  ratingCard: {
    backgroundColor: theme.surface, padding: 32, borderRadius: borderRadius.xxl,
    marginBottom: 24, alignItems: 'center',
    borderWidth: 1, borderColor: theme.border, ...shadows.subtle,
  },
  prompt: { ...typography.h2, color: theme.textPrimary, textAlign: 'center', marginBottom: 24 },
  starsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  ratingLabel: { ...typography.body, color: theme.gold, fontWeight: '700', marginBottom: 24 },
  inputWrap: { width: '100%', marginTop: 8 },
  inputLabel: { ...typography.bodySmall, color: theme.textSecondary, marginBottom: 8, fontWeight: '600' },
  textInput: {
    backgroundColor: theme.surfaceLight, color: theme.textPrimary,
    borderRadius: borderRadius.lg, padding: 16, height: 140, ...typography.body,
    borderWidth: 1, borderColor: theme.border,
  },
  submitBtn: {
    backgroundColor: theme.gold, paddingVertical: 18, flexDirection: 'row', gap: 8,
    borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center', ...shadows.subtle
  },
  submitBtnText: { ...typography.button, color: theme.backgroundDeep, fontSize: 16 },
});
