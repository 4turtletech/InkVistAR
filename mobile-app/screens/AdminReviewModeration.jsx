/**
 * AdminReviewModeration.jsx -- Review Approval/Rejection
 * Star ratings, comments, approve/reject actions.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Alert, RefreshControl,
} from 'react-native';
import { ArrowLeft, Star, CheckCircle, XCircle } from 'lucide-react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../src/theme';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { getAdminReviews, updateReviewStatus } from '../src/utils/api';

export const AdminReviewModeration = ({ navigation }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReviews = async () => {
    setLoading(true);
    const res = await getAdminReviews();
    if (res.success && res.reviews) setReviews(res.reviews);
    setLoading(false);
  };

  useEffect(() => { loadReviews(); }, []);

  const handleStatus = async (id, status) => {
    const res = await updateReviewStatus(id, status);
    if (res.success) {
      loadReviews();
    } else {
      Alert.alert('Error', 'Failed to update review status.');
    }
  };

  const StatusTag = ({ status }) => {
    const cfg = status === 'approved' ? { bg: colors.successBg, color: colors.success }
      : status === 'rejected' ? { bg: colors.errorBg, color: colors.error }
      : { bg: colors.warningBg, color: colors.warning };
    return (
      <View style={[styles.statusTag, { backgroundColor: cfg.bg }]}>
        <Text style={[styles.statusText, { color: cfg.color }]}>{(status || 'pending').toUpperCase()}</Text>
      </View>
    );
  };

  const StarRow = ({ rating }) => (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={14} color={i <= rating ? '#f59e0b' : colors.borderLight} fill={i <= rating ? '#f59e0b' : 'transparent'} />
      ))}
      <Text style={styles.ratingNum}>{rating}/5</Text>
    </View>
  );

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardTopLeft}>
          <Text style={styles.customerName}>{item.customer_name}</Text>
          <Text style={styles.artistName}>for {item.artist_name}</Text>
        </View>
        <StarRow rating={item.rating} />
      </View>

      {item.comment ? (
        <Text style={styles.comment}>"{item.comment}"</Text>
      ) : (
        <Text style={styles.noComment}>No written feedback provided.</Text>
      )}

      <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString()}</Text>

      <View style={styles.actionRow}>
        <StatusTag status={item.status} />
        {item.status === 'pending' && (
          <View style={styles.actionBtns}>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => handleStatus(item.id, 'rejected')}>
              <XCircle size={15} color="#ffffff" />
              <Text style={styles.btnText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.approveBtn} onPress={() => handleStatus(item.id, 'approved')}>
              <CheckCircle size={15} color="#ffffff" />
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
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Moderation</Text>
      </View>

      {loading ? <PremiumLoader message="Loading reviews..." /> : (
        <FlatList
          data={reviews}
          renderItem={renderItem}
          keyExtractor={item => (item.id || Math.random()).toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState icon={Star} title="No reviews" subtitle="Customer reviews will appear here" />}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadReviews} tintColor={colors.primary} />}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  listContent: { padding: 16, paddingBottom: 30 },
  card: {
    backgroundColor: '#ffffff', padding: 16, borderRadius: borderRadius.xl,
    marginBottom: 12, borderWidth: 1, borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardTopLeft: { flex: 1, marginRight: 8 },
  customerName: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  artistName: { ...typography.bodyXSmall, color: colors.textSecondary, marginTop: 2 },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingNum: { ...typography.bodyXSmall, color: colors.warning, fontWeight: '700', marginLeft: 4 },
  comment: { ...typography.bodySmall, color: colors.textSecondary, fontStyle: 'italic', marginBottom: 8, lineHeight: 20 },
  noComment: { ...typography.bodySmall, color: colors.textTertiary, fontStyle: 'italic', marginBottom: 8 },
  dateText: { ...typography.bodyXSmall, color: colors.textTertiary, marginBottom: 12 },
  actionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 12,
  },
  statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.md },
  statusText: { fontSize: 10, fontWeight: '700' },
  actionBtns: { flexDirection: 'row', gap: 8 },
  rejectBtn: {
    backgroundColor: colors.error, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: borderRadius.md, gap: 4,
  },
  approveBtn: {
    backgroundColor: colors.success, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: borderRadius.md, gap: 4,
  },
  btnText: { ...typography.bodyXSmall, color: '#ffffff', fontWeight: '700' },
});
