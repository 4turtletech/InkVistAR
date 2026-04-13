import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { submitReview } from '../src/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const CustomerReview = ({ route, navigation }) => {
  // Pass appointmentId and artistId through navigation params
  const appointmentId = route.params?.appointmentId;
  const artistId = route.params?.artistId;

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Missing Rating', 'Please select a star rating.');
      return;
    }

    try {
      setSubmitting(true);
      const userStr = await AsyncStorage.getItem('user_data');
      if (userStr) {
        const user = JSON.parse(userStr);
        const res = await submitReview({
          customer_id: user.id,
          artist_id: artistId,
          appointment_id: appointmentId,
          rating,
          comment
        });

        if (res.success) {
          Alert.alert('Thank You!', 'Your review has been submitted for moderation.', [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]);
        } else {
          Alert.alert('Error', res.message || 'Failed to submit review.');
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'An error occurred while submitting.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rate Your Session</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.ratingCard}>
            <Text style={styles.promptText}>How was your tattoo session?</Text>
            
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Ionicons 
                    name={rating >= star ? "star" : "star-outline"} 
                    size={40} 
                    color={rating >= star ? "#f59e0b" : "#64748b"} 
                  />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Comments & Feedback</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Share your experience (optional)..."
                placeholderTextColor="#64748b"
                multiline
                numberOfLines={5}
                value={comment}
                onChangeText={setComment}
              />
            </View>
          </View>

          <TouchableOpacity style={[styles.submitButton, submitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Review</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#1f2937' },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  content: { padding: 20, flex: 1, justifyContent: 'center' },
  ratingCard: { backgroundColor: '#1f2937', padding: 20, borderRadius: 16, marginBottom: 20, alignItems: 'center' },
  promptText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  starsContainer: { flexDirection: 'row', gap: 10, marginBottom: 30 },
  inputContainer: { width: '100%' },
  label: { color: '#9ca3af', marginBottom: 8, fontSize: 14 },
  textInput: { backgroundColor: '#374151', color: 'white', borderRadius: 12, padding: 15, height: 120, textAlignVertical: 'top' },
  submitButton: { backgroundColor: '#f59e0b', padding: 16, borderRadius: 12, alignItems: 'center' },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
