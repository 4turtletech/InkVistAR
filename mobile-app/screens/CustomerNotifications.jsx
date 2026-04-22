/**
 * CustomerNotifications.jsx -- Customer Notification Center
 * Themed with lucide icons, type-based icon mapping, filter chips, pagination.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Bell, Calendar, CheckCircle, XCircle, Star,
  CreditCard, Info, MessageSquare, Mail, ChevronDown,
} from 'lucide-react-native';
import { colors, typography, borderRadius } from '../src/theme';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { getNotifications, markNotificationAsRead, markNotificationAsUnread } from '../src/utils/api';

const timeAgo = (dateString) => {
  if (!dateString) return '';
  const s = Math.round((Date.now() - new Date(dateString).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

const ICON_MAP = {
  appointment_request: { Icon: Calendar, color: colors.info, bg: colors.infoBg },
  appointment_new: { Icon: Calendar, color: colors.info, bg: colors.infoBg },
  appointment_confirmed: { Icon: CheckCircle, color: colors.success, bg: colors.successBg },
  appointment_cancelled: { Icon: XCircle, color: colors.error, bg: colors.errorBg },
  appointment_completed: { Icon: Star, color: colors.iconPurple, bg: colors.iconPurpleBg },
  payment_success: { Icon: CreditCard, color: colors.success, bg: colors.successBg },
  aftercare_reminder: { Icon: Info, color: colors.info, bg: colors.infoBg },
  review_prompt: { Icon: MessageSquare, color: colors.warning, bg: colors.warningBg },
};
const DEF = { Icon: Bell, color: colors.textTertiary, bg: colors.lightBgSecondary };

const FILTERS = {
  all: 'All', appointment_request: 'Requests', appointment_new: 'New',
  appointment_confirmed: 'Confirmed', appointment_cancelled: 'Cancelled',
  appointment_completed: 'Completed', payment_success: 'Payments',
};

export function CustomerNotifications({ onBack, userId }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => { load(1); }, [userId, filterType]);

  const load = async (p = 1) => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const opts = { page: p, limit: 20 };
      if (filterType !== 'all') opts.type = filterType;
      const r = await getNotifications(userId, opts);
      if (r.success) {
        p === 1 ? setNotifications(r.notifications || []) : setNotifications(prev => [...prev, ...(r.notifications || [])]);
        setHasMore(r.pagination?.hasMore || false);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const markAllRead = () => {
    const ids = notifications.filter(n => !n.is_read).map(n => n.id);
    if (ids.length) { Promise.all(ids.map(id => markNotificationAsRead(id))); setNotifications(prev => prev.map(n => ({ ...n, is_read: true }))); }
  };

  const onPress = async (item) => {
    if (!item.is_read) { await markNotificationAsRead(item.id); setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n)); }
  };
  const onUnread = async (item) => { await markNotificationAsUnread(item.id); setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: false } : n)); };
  const loadMore = () => { const next = page + 1; setPage(next); load(next); };
  const setFilter = (t) => { setFilterType(t); setPage(1); setNotifications([]); };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const renderItem = ({ item }) => {
    const cfg = ICON_MAP[item.type] || DEF;
    return (
      <TouchableOpacity style={[styles.card, !item.is_read && styles.cardUnread]} onPress={() => onPress(item)} activeOpacity={0.7}>
        <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
          <cfg.Icon size={20} color={cfg.color} />
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <Text style={[styles.cardTitle, !item.is_read && styles.cardTitleBold]} numberOfLines={2}>{item.title || ''}</Text>
            <Text style={styles.cardTime}>{timeAgo(item.created_at)}</Text>
          </View>
          <Text style={styles.cardMsg} numberOfLines={2}>{item.message}</Text>
        </View>
        {!!item.is_read && (
          <TouchableOpacity style={{ padding: 4 }} onPress={() => onUnread(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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

      <View style={styles.actionsBar}>
        <Text style={styles.countText}>{unreadCount} Unread</Text>
        <TouchableOpacity onPress={markAllRead}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {Object.entries(FILTERS).map(([key, label]) => (
            <TouchableOpacity key={key} style={[styles.chip, filterType === key && styles.chipActive]} onPress={() => setFilter(key)}>
              <Text style={[styles.chipText, filterType === key && styles.chipTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading && notifications.length === 0 ? <PremiumLoader message="Loading..." /> : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={item => (item.id || Math.random()).toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState icon={Bell} title="No notifications" subtitle="We'll let you know when something important happens" />}
          ListFooterComponent={
            hasMore ? (
              <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore}>
                <Text style={styles.loadMoreText}>Load More</Text>
                <ChevronDown size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : notifications.length > 0 ? <Text style={styles.endText}>No more notifications</Text> : null
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
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: borderRadius.round,
    backgroundColor: colors.lightBgSecondary, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.bodyXSmall, color: colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: '#ffffff' },
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
  cardTitleBold: { fontWeight: '800', color: colors.textDark },
  cardTime: { ...typography.bodyXSmall, color: colors.textTertiary },
  cardMsg: { ...typography.bodySmall, color: colors.textSecondary, lineHeight: 20 },
  unreadDot: { position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  loadMoreBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4,
    paddingVertical: 12, marginBottom: 20, backgroundColor: '#ffffff',
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border,
  },
  loadMoreText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  endText: { ...typography.bodySmall, color: colors.textTertiary, textAlign: 'center', paddingVertical: 20, fontStyle: 'italic' },
});
