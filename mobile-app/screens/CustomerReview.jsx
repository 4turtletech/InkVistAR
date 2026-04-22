/**
 * CustomerReview.jsx -- Rate Your Session
 * Themed with lucide icons, star rating, and theme tokens.
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { ArrowLeft, Star } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, borderRadius, shadows } from '../src/theme';
import { submitReview } from '../src/utils/api';

export const CustomerReview = ({ route, navigation }) => {
  const appointmentId = route.params?.appointmentId;
  const artistId = route.params?.artistId;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rate Your Session</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.ratingCard}>
            <Text style={styles.prompt}>How was your tattoo session?</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(s => (
                <TouchableOpacity key={s} onPress={() => setRating(s)} activeOpacity={0.7}>
                  <Star
                    size={38}
                    color={rating >= s ? '#f59e0b' : colors.textTertiary}
                    fill={rating >= s ? '#f59e0b' : 'transparent'}
                  />
                </TouchableOpacity>
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
                style={styles.textInput}
                placeholder="Share your experience (optional)..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={5}
                value={comment}
                onChangeText={setComment}
                textAlignVertical="top"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.submitBtnText}>Submit Review</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingTop: 52, backgroundColor: '#ffffff',
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.lightBgSecondary, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...typography.h3, color: colors.textPrimary },
  content: { padding: 20, flex: 1, justifyContent: 'center' },
  ratingCard: {
    backgroundColor: '#ffffff', padding: 24, borderRadius: borderRadius.xxl,
    marginBottom: 20, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, ...shadows.subtle,
  },
  prompt: { ...typography.h3, color: colors.textPrimary, textAlign: 'center', marginBottom: 20 },
  starsRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  ratingLabel: { ...typography.bodySmall, color: colors.primary, fontWeight: '700', marginBottom: 20 },
  inputWrap: { width: '100%', marginTop: 8 },
  inputLabel: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: 8, fontWeight: '600' },
  textInput: {
    backgroundColor: colors.lightBgSecondary, color: colors.textPrimary,
    borderRadius: borderRadius.lg, padding: 14, height: 120, ...typography.body,
    borderWidth: 1, borderColor: colors.border,
  },
  submitBtn: {
    backgroundColor: colors.primary, paddingVertical: 16,
    borderRadius: borderRadius.lg, alignItems: 'center',
  },
  submitBtnText: { ...typography.button, color: '#ffffff', fontSize: 16 },
});
