import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAdminReviews, updateReviewStatus } from '../src/utils/api';

export const AdminReviewModeration = ({ navigation }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    const res = await getAdminReviews();
    if (res.success && res.reviews) {
      setReviews(res.reviews);
    }
    setLoading(false);
  };

  const handleStatusChange = async (id, status) => {
    const res = await updateReviewStatus(id, status);
    if (res.success) {
      loadReviews();
    } else {
      Alert.alert('Error', 'Failed to update review status.');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <Text style={styles.customerName}>{item.customer_name}</Text>
          <Text style={styles.artistName}>for {item.artist_name}</Text>
        </View>
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={14} color="#f59e0b" />
          <Text style={styles.ratingText}>{item.rating}/5</Text>
        </View>
      </View>
      
      {item.comment ? (
        <Text style={styles.comment}>"{item.comment}"</Text>
      ) : (
        <Text style={styles.noComment}>No written feedback provided.</Text>
      )}

      <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>

      <View style={styles.actionRow}>
        <View style={[styles.statusTag, { backgroundColor: item.status === 'approved' ? 'rgba(16, 185, 129, 0.1)' : item.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)' }]}>
          <Text style={[styles.statusText, { color: item.status === 'approved' ? '#10b981' : item.status === 'rejected' ? '#ef4444' : '#f59e0b' }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
        
        {item.status === 'pending' && (
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => handleStatusChange(item.id, 'rejected')}>
              <Ionicons name="close" size={16} color="white" />
              <Text style={styles.btnText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.approveBtn} onPress={() => handleStatusChange(item.id, 'approved')}>
              <Ionicons name="checkmark" size={16} color="white" />
              <Text style={styles.btnText}>Approve</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Moderation</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#f59e0b" style={{ marginTop: 50 }} />
      ) : reviews.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="star-outline" size={48} color="#4b5563" />
          <Text style={styles.emptyText}>No reviews found.</Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          onRefresh={loadReviews}
          refreshing={loading}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#1f2937' },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  listContent: { padding: 20 },
  card: { backgroundColor: '#1f2937', padding: 16, borderRadius: 12, marginBottom: 15 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  customerName: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  artistName: { color: '#9ca3af', fontSize: 12 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  ratingText: { color: '#f59e0b', fontWeight: 'bold', marginLeft: 4, fontSize: 12 },
  comment: { color: '#e5e7eb', fontSize: 14, fontStyle: 'italic', marginBottom: 10 },
  noComment: { color: '#6b7280', fontSize: 14, fontStyle: 'italic', marginBottom: 10 },
  date: { color: '#64748b', fontSize: 10, marginBottom: 15 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#374151', paddingTop: 12 },
  statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  buttons: { flexDirection: 'row', gap: 10 },
  rejectBtn: { backgroundColor: '#ef4444', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 4 },
  approveBtn: { backgroundColor: '#10b981', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 4 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#9ca3af', marginTop: 10, fontSize: 16 }
});
