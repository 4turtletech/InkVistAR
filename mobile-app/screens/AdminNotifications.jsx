/**
 * AdminNotifications.jsx -- Full notifications page
 * Mark read/unread, type-based icons, time ago display, search, and filters.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, RefreshControl, TextInput
} from 'react-native';
import {
  ArrowLeft, Bell, CreditCard, Calendar, Info, CheckCircle, AlertTriangle, Search, CheckCircle2
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/context/ThemeContext';
import { typography, spacing, borderRadius, shadows } from '../src/theme';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { AnimatedTouchable } from '../src/components/shared/AnimatedTouchable';
import { getNotifications, markNotificationAsRead } from '../src/utils/api';

const timeAgo = (dateString) => {
  if (!dateString) return '';
  const seconds = Math.round((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

const getNotifConfig = (theme, type) => {
  switch (type) {
    case 'payment_success': return { Icon: CreditCard, color: theme.success, bg: theme.successBg || 'rgba(16,185,129,0.15)' };
    case 'appointment_request': return { Icon: Calendar, color: theme.info, bg: theme.infoBg || 'rgba(59,130,246,0.15)' };
    case 'appointment_confirmed': return { Icon: CheckCircle, color: theme.success, bg: theme.successBg || 'rgba(16,185,129,0.15)' };
    case 'appointment_cancelled': return { Icon: AlertTriangle, color: theme.error, bg: theme.errorBg || 'rgba(239,68,68,0.15)' };
    default: return { Icon: Info, color: theme.iconPurple, bg: theme.iconPurpleBg || 'rgba(168,85,247,0.15)' };
  }
};

export const AdminNotifications = ({ navigation }) => {
  const { theme, hapticsEnabled } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(theme, insets);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all, unread, read

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const userStr = await AsyncStorage.getItem('user_session');
      const userId = userStr ? JSON.parse(userStr).id : 1;
      const result = await getNotifications(userId, { limit: 100 });
      if (result.success) {
        setNotifications(result.notifications || []);
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
    setLoading(false);
  };

  useEffect(() => { loadNotifications(); }, []);

  const handlePress = async (notif) => {
    if (!notif.is_read) {
      await markNotificationAsRead(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    }
  };

  const handleMarkAllRead = async () => {
    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    // Real endpoint should be hit here, but simulating loop for now
    for (const notif of notifications.filter(n => !n.is_read)) {
      await markNotificationAsRead(notif.id);
    }
  };

  const filteredNotifs = notifications.filter(n => {
    const searchMatch = n.title.toLowerCase().includes(search.toLowerCase()) || n.message.toLowerCase().includes(search.toLowerCase());
    if (!searchMatch) return false;
    if (filter === 'unread') return !n.is_read;
    if (filter === 'read') return n.is_read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <AnimatedTouchable onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
          <ArrowLeft size={24} color={theme.textPrimary} />
        </AnimatedTouchable>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSub}>{unreadCount} Unread Alerts</Text>
        </View>
        {unreadCount > 0 && (
          <AnimatedTouchable onPress={handleMarkAllRead} style={styles.markAllBtn}>
            <CheckCircle2 size={18} color={theme.gold} />
          </AnimatedTouchable>
        )}
      </View>

      <View style={styles.searchBar}>
        <Search size={18} color={theme.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search notifications..."
          placeholderTextColor={theme.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.filterRow}>
        {['all', 'unread', 'read'].map(f => (
          <AnimatedTouchable
            key={f}
            style={[styles.filterPill, filter === f && styles.filterPillActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </AnimatedTouchable>
        ))}
      </View>

      {loading ? <PremiumLoader message="Loading notifications..." /> : (
        <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadNotifications} tintColor={theme.gold} />}>
          {filteredNotifs.length === 0 ? (
            <EmptyState icon={Bell} title="No notifications found" subtitle={search ? "Try a different search" : "You're all caught up"} />
          ) : (
            filteredNotifs.map(notif => {
              const config = getNotifConfig(theme, notif.type);
              return (
                <TouchableOpacity
                  key={notif.id}
                  style={[styles.card, !notif.is_read && styles.cardUnread]}
                  onPress={() => handlePress(notif)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconWrap, { backgroundColor: config.bg }]}>
                    <config.Icon size={20} color={config.color} />
                  </View>
                  <View style={styles.cardContent}>
                    <View style={styles.cardTop}>
                      <Text style={[styles.cardTitle, !notif.is_read && styles.cardTitleUnread]} numberOfLines={1}>{notif.title}</Text>
                      <Text style={styles.cardTime}>{timeAgo(notif.created_at)}</Text>
                    </View>
                    <Text style={styles.cardMessage} numberOfLines={2}>{notif.message}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 30 }} />
        </ScrollView>
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
  headerInfo: { flex: 1 },
  headerTitle: { ...typography.h2, color: theme.textPrimary },
  headerSub: { ...typography.bodyXSmall, color: theme.gold, fontWeight: '600', marginTop: 2 },
  markAllBtn: { padding: 8, backgroundColor: theme.primaryLight, borderRadius: borderRadius.md },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface,
    marginHorizontal: 16, marginTop: 16, marginBottom: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: borderRadius.lg, borderWidth: 1, borderColor: theme.border, gap: 10
  },
  searchInput: { flex: 1, ...typography.body, color: theme.textPrimary },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.surfaceLight, borderWidth: 1, borderColor: theme.border },
  filterPillActive: { backgroundColor: theme.primaryLight, borderColor: theme.gold },
  filterText: { ...typography.bodySmall, color: theme.textSecondary },
  filterTextActive: { color: theme.gold, fontWeight: '700' },
  scrollContent: { padding: 16 },
  card: {
    flexDirection: 'row', backgroundColor: theme.surface, padding: 14,
    borderRadius: borderRadius.xl, marginBottom: 10, borderWidth: 1, borderColor: theme.border, ...shadows.subtle
  },
  cardUnread: { borderLeftWidth: 4, borderLeftColor: theme.gold, backgroundColor: theme.primaryLight },
  iconWrap: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardContent: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { ...typography.body, fontWeight: '600', color: theme.textPrimary, flex: 1, marginRight: 8 },
  cardTitleUnread: { fontWeight: '800', color: theme.gold },
  cardTime: { ...typography.bodyXSmall, color: theme.textTertiary },
  cardMessage: { ...typography.bodySmall, color: theme.textSecondary, lineHeight: 20 },
});
