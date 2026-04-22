/**
 * AdminNotifications.jsx -- Full notifications page
 * Mark read/unread, type-based icons, time ago display.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, RefreshControl,
} from 'react-native';
import {
  ArrowLeft, Bell, CreditCard, Calendar, Info, CheckCircle, AlertTriangle,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing, borderRadius, shadows } from '../src/theme';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
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

const getNotifConfig = (type) => {
  switch (type) {
    case 'payment_success': return { Icon: CreditCard, color: colors.success, bg: colors.successBg };
    case 'appointment_request': return { Icon: Calendar, color: colors.info, bg: colors.infoBg };
    case 'appointment_confirmed': return { Icon: CheckCircle, color: colors.success, bg: colors.successBg };
    case 'appointment_cancelled': return { Icon: AlertTriangle, color: colors.error, bg: colors.errorBg };
    default: return { Icon: Info, color: colors.iconPurple, bg: colors.iconPurpleBg };
  }
};

export const AdminNotifications = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const userStr = await AsyncStorage.getItem('user_session');
      const userId = userStr ? JSON.parse(userStr).id : 1;
      const result = await getNotifications(userId, { limit: 50 });
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

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && <Text style={styles.headerSub}>{unreadCount} unread</Text>}
        </View>
      </View>

      {loading ? <PremiumLoader message="Loading notifications..." /> : (
        <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadNotifications} tintColor={colors.primary} />}>
          {notifications.length === 0 ? (
            <EmptyState icon={Bell} title="No notifications" subtitle="You're all caught up" />
          ) : (
            notifications.map(notif => {
              const config = getNotifConfig(notif.type);
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1 },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  headerSub: { ...typography.bodyXSmall, color: colors.primary, fontWeight: '600', marginTop: 2 },
  scrollContent: { padding: 16 },
  card: {
    flexDirection: 'row', backgroundColor: '#ffffff', padding: 14,
    borderRadius: borderRadius.xl, marginBottom: 8, borderWidth: 1, borderColor: colors.border,
  },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: colors.primary, backgroundColor: 'rgba(190,144,85,0.04)' },
  iconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardContent: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { ...typography.body, fontWeight: '600', color: colors.textPrimary, flex: 1, marginRight: 8 },
  cardTitleUnread: { fontWeight: '800', color: colors.primary },
  cardTime: { ...typography.bodyXSmall, color: colors.textTertiary },
  cardMessage: { ...typography.bodySmall, color: colors.textSecondary, lineHeight: 20 },
});
