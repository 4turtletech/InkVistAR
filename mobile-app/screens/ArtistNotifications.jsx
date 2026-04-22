/**
 * ArtistNotifications.jsx -- Full Notification Page
 * Themed upgrade with lucide icons. Preserves pagination, type filters,
 * mark read/unread, and accept/reject assignment actions.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Bell, Calendar, CheckCircle, XCircle, Star,
  AlertTriangle, CreditCard, Mail, ChevronDown,
} from 'lucide-react-native';
import { colors, typography, borderRadius, shadows } from '../src/theme';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { getNotifications, markNotificationAsRead, markNotificationAsUnread } from '../src/utils/api';
import { API_URL } from '../src/config';

const timeAgo = (dateString) => {
  if (!dateString) return '';
  const seconds = Math.round((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

const ICON_MAP = {
  appointment_request: { Icon: Calendar, color: colors.info, bg: colors.infoBg },
  appointment_new: { Icon: Calendar, color: colors.info, bg: colors.infoBg },
  appointment_confirmed: { Icon: CheckCircle, color: colors.success, bg: colors.successBg },
  appointment_cancelled: { Icon: XCircle, color: colors.error, bg: colors.errorBg },
  appointment_completed: { Icon: Star, color: colors.iconPurple, bg: colors.iconPurpleBg },
  action_required: { Icon: AlertTriangle, color: colors.warning, bg: colors.warningBg },
  payment_success: { Icon: CreditCard, color: colors.success, bg: colors.successBg },
};
const DEFAULT_ICON = { Icon: Bell, color: colors.textTertiary, bg: colors.lightBgSecondary };

const FILTER_LABELS = {
  all: 'All',
  appointment_request: 'Requests',
  appointment_new: 'New',
  appointment_confirmed: 'Confirmed',
  appointment_cancelled: 'Cancelled',
  appointment_completed: 'Completed',
  payment_success: 'Payments',
};

export function ArtistNotifications({ onBack, userId }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => { loadNotifications(1); }, [userId, filterType]);

  const loadNotifications = async (pageNum = 1) => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const opts = { page: pageNum, limit: 20 };
      if (filterType !== 'all') opts.type = filterType;
      const result = await getNotifications(userId, opts);
      if (result.success) {
        if (pageNum === 1) setNotifications(result.notifications || []);
        else setNotifications(prev => [...prev, ...(result.notifications || [])]);
        setHasMore(result.pagination?.hasMore || false);
      }
    } catch (e) { console.error('Notifications error:', e); }
    finally { setLoading(false); }
  };

  const handleMarkAllRead = () => {
    const ids = notifications.filter(n => !n.is_read).map(n => n.id);
    if (ids.length > 0) {
      Promise.all(ids.map(id => markNotificationAsRead(id)));
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    }
  };

  const handlePress = async (item) => {
    if (!item.is_read) {
      await markNotificationAsRead(item.id);
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n));
    }
  };

  const handleUnread = async (item) => {
    await markNotificationAsUnread(item.id);
    setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: false } : n));
  };

  const handleAction = async (notifId, apptId, action) => {
    try {
      const response = await fetch(`${API_URL}/artist/appointments/${apptId}/${action}`, { method: 'PUT' });
      const data = await response.json();
      if (data.success) {
        await markNotificationAsRead(notifId);
        loadNotifications(1);
      }
    } catch (e) { console.error(e); }
  };

  const handleLoadMore = () => { const next = page + 1; setPage(next); loadNotifications(next); };
  const handleFilter = (type) => { setFilterType(type); setPage(1); setNotifications([]); };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const renderItem = ({ item }) => {
    const cfg = ICON_MAP[item.type] || DEFAULT_ICON;
    return (
      <TouchableOpacity style={[styles.card, !item.is_read && styles.cardUnread]} onPress={() => handlePress(item)} activeOpacity={0.7}>
        <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
          <cfg.Icon size={20} color={cfg.color} />
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <Text style={[styles.cardTitle, !item.is_read && styles.cardTitleUnread]} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.cardTime}>{timeAgo(item.created_at)}</Text>
          </View>
          <Text style={styles.cardMessage} numberOfLines={2}>{item.message}</Text>

          {item.type === 'action_required' && !item.is_read && (
            <View style={styles.actionBtns}>
              <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAction(item.id, item.related_id, 'accept')}>
                <CheckCircle size={14} color="#fff" />
                <Text style={styles.actionBtnText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.declineBtn} onPress={() => handleAction(item.id, item.related_id, 'reject')}>
                <XCircle size={14} color="#fff" />
                <Text style={styles.actionBtnText}>Decline</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {item.is_read && (
          <TouchableOpacity style={styles.markUnreadBtn} onPress={() => handleUnread(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Mail size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
            <ArrowLeft size={20} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {/* Actions bar */}
      <View style={styles.actionsBar}>
        <Text style={styles.countText}>{unreadCount} Unread</Text>
        <TouchableOpacity onPress={handleMarkAllRead}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <View style={styles.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {Object.entries(FILTER_LABELS).map(([key, label]) => (
            <TouchableOpacity key={key} style={[styles.filterChip, filterType === key && styles.filterChipActive]} onPress={() => handleFilter(key)}>
              <Text style={[styles.filterChipText, filterType === key && styles.filterChipTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading && notifications.length === 0 ? <PremiumLoader message="Loading notifications..." /> : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={item => (item.id || Math.random()).toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState icon={Bell} title="No notifications" subtitle="We'll let you know when something important happens" />}
          ListFooterComponent={
            hasMore ? (
              <TouchableOpacity style={styles.loadMoreBtn} onPress={handleLoadMore}>
                <Text style={styles.loadMoreText}>Load More</Text>
                <ChevronDown size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : notifications.length > 0 ? (
              <Text style={styles.endText}>No more notifications</Text>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 52, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...typography.h2, color: '#ffffff' },
  actionsBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ffffff',
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  countText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  markAllText: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' },
  filterWrap: { backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: colors.borderLight, paddingBottom: 10 },
  filterRow: { paddingHorizontal: 16, paddingVertical: 6, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: borderRadius.round,
    backgroundColor: colors.lightBgSecondary, borderWidth: 1, borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { ...typography.bodyXSmall, color: colors.textSecondary, fontWeight: '600' },
  filterChipTextActive: { color: '#ffffff' },
  listContent: { padding: 16 },
  card: {
    flexDirection: 'row', backgroundColor: '#ffffff', borderRadius: borderRadius.xl,
    padding: 14, marginBottom: 8, alignItems: 'flex-start',
    borderWidth: 1, borderColor: colors.border,
  },
  cardUnread: { backgroundColor: 'rgba(190,144,85,0.04)', borderLeftWidth: 3, borderLeftColor: colors.primary },
  iconWrap: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardContent: { flex: 1, marginRight: 8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  cardTitle: { ...typography.body, fontWeight: '600', color: colors.textPrimary, flex: 1, marginRight: 8 },
  cardTitleUnread: { fontWeight: '800', color: colors.textDark },
  cardTime: { ...typography.bodyXSmall, color: colors.textTertiary },
  cardMessage: { ...typography.bodySmall, color: colors.textSecondary, lineHeight: 20 },
  actionBtns: { flexDirection: 'row', gap: 8, marginTop: 10 },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.success, paddingVertical: 6, paddingHorizontal: 12, borderRadius: borderRadius.sm },
  declineBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.error, paddingVertical: 6, paddingHorizontal: 12, borderRadius: borderRadius.sm },
  actionBtnText: { ...typography.bodyXSmall, color: '#ffffff', fontWeight: '700' },
  markUnreadBtn: { padding: 4 },
  unreadDot: { position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  loadMoreBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4,
    paddingVertical: 12, marginTop: 8, marginBottom: 20,
    backgroundColor: '#ffffff', borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border,
  },
  loadMoreText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  endText: { ...typography.bodySmall, color: colors.textTertiary, textAlign: 'center', paddingVertical: 20, fontStyle: 'italic' },
});