/**
 * AdminReviewModeration.jsx -- Review Approval/Rejection
 * Star ratings, comments, approve/reject/revoke actions, categorized tabs.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Alert, RefreshControl,
} from 'react-native';
import { ArrowLeft, Star, CheckCircle, XCircle, RefreshCcw } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/context/ThemeContext';
import { typography, spacing, borderRadius, shadows } from '../src/theme';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { AnimatedTouchable } from '../src/components/shared/AnimatedTouchable';
import { getAdminReviews, updateReviewStatus } from '../src/utils/api';

export const AdminReviewModeration = ({ navigation }) => {
  const { theme, hapticsEnabled } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(theme, insets);

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // pending, approved, rejected

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
    const cfg = status === 'approved' ? { bg: theme.successBg || 'rgba(16,185,129,0.15)', color: theme.success }
      : status === 'rejected' ? { bg: theme.errorBg || 'rgba(239,68,68,0.15)', color: theme.error }
      : { bg: theme.warningBg || 'rgba(245,158,11,0.15)', color: theme.warning };
    return (
      <View style={[styles.statusTag, { backgroundColor: cfg.bg }]}>
        <Text style={[styles.statusText, { color: cfg.color }]}>{(status || 'pending').toUpperCase()}</Text>
      </View>
    );
  };

  const StarRow = ({ rating }) => (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={14} color={i <= rating ? theme.warning : theme.borderLight} fill={i <= rating ? theme.warning : 'transparent'} />
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
            <AnimatedTouchable style={styles.rejectBtn} onPress={() => handleStatus(item.id, 'rejected')}>
              <XCircle size={15} color={theme.backgroundDeep} />
              <Text style={styles.btnText}>Reject</Text>
            </AnimatedTouchable>
            <AnimatedTouchable style={styles.approveBtn} onPress={() => handleStatus(item.id, 'approved')}>
              <CheckCircle size={15} color={theme.backgroundDeep} />
              <Text style={styles.btnText}>Approve</Text>
            </AnimatedTouchable>
          </View>
        )}
        {item.status === 'approved' && (
          <View style={styles.actionBtns}>
            <AnimatedTouchable style={styles.revokeBtn} onPress={() => handleStatus(item.id, 'pending')}>
              <RefreshCcw size={15} color={theme.backgroundDeep} />
              <Text style={styles.btnText}>Revoke</Text>
            </AnimatedTouchable>
          </View>
        )}
        {item.status === 'rejected' && (
          <View style={styles.actionBtns}>
            <AnimatedTouchable style={styles.reconsiderBtn} onPress={() => handleStatus(item.id, 'pending')}>
              <RefreshCcw size={15} color={theme.backgroundDeep} />
              <Text style={styles.btnText}>Reconsider</Text>
            </AnimatedTouchable>
          </View>
        )}
      </View>
    </View>
  );

  const filteredReviews = reviews.filter(r => (r.status || 'pending') === activeTab);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <AnimatedTouchable onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
          <ArrowLeft size={24} color={theme.textPrimary} />
        </AnimatedTouchable>
        <Text style={styles.headerTitle}>Review Moderation</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'pending' && styles.activeTab]} onPress={() => setActiveTab('pending')}>
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'approved' && styles.activeTab]} onPress={() => setActiveTab('approved')}>
          <Text style={[styles.tabText, activeTab === 'approved' && styles.activeTabText]}>Approved</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'rejected' && styles.activeTab]} onPress={() => setActiveTab('rejected')}>
          <Text style={[styles.tabText, activeTab === 'rejected' && styles.activeTabText]}>Rejected</Text>
        </TouchableOpacity>
      </View>

      {loading ? <PremiumLoader message="Loading reviews..." /> : (
        <FlatList
          data={filteredReviews}
          renderItem={renderItem}
          keyExtractor={item => (item.id || Math.random()).toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState icon={Star} title={`No ${activeTab} reviews`} subtitle={`There are currently no reviews in this status`} />}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadReviews} tintColor={theme.gold} />}
        />
      )}
    </SafeAreaView>
  );
};

const getStyles = (theme, insets) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: (insets?.top || 0) + 12, paddingBottom: 16,
    backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { ...typography.h2, color: theme.textPrimary },
  tabContainer: { flexDirection: 'row', backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: theme.gold },
  tabText: { ...typography.bodySmall, color: theme.textSecondary, fontWeight: '600' },
  activeTabText: { color: theme.gold },
  listContent: { padding: 16, paddingBottom: 30 },
  card: {
    backgroundColor: theme.surface, padding: 16, borderRadius: borderRadius.xl,
    marginBottom: 12, borderWidth: 1, borderColor: theme.border, ...shadows.subtle
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardTopLeft: { flex: 1, marginRight: 8 },
  customerName: { ...typography.body, fontWeight: '600', color: theme.textPrimary },
  artistName: { ...typography.bodyXSmall, color: theme.textSecondary, marginTop: 2 },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingNum: { ...typography.bodyXSmall, color: theme.warning, fontWeight: '700', marginLeft: 4 },
  comment: { ...typography.bodySmall, color: theme.textSecondary, fontStyle: 'italic', marginBottom: 8, lineHeight: 20 },
  noComment: { ...typography.bodySmall, color: theme.textTertiary, fontStyle: 'italic', marginBottom: 8 },
  dateText: { ...typography.bodyXSmall, color: theme.textTertiary, marginBottom: 12 },
  actionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: theme.borderLight, paddingTop: 12,
  },
  statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.md },
  statusText: { fontSize: 10, fontWeight: '700' },
  actionBtns: { flexDirection: 'row', gap: 8 },
  rejectBtn: { backgroundColor: theme.error, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: borderRadius.md, gap: 4 },
  approveBtn: { backgroundColor: theme.success, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: borderRadius.md, gap: 4 },
  revokeBtn: { backgroundColor: theme.warning, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: borderRadius.md, gap: 4 },
  reconsiderBtn: { backgroundColor: theme.info, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: borderRadius.md, gap: 4 },
  btnText: { ...typography.bodyXSmall, color: theme.backgroundDeep, fontWeight: '700' },
});
