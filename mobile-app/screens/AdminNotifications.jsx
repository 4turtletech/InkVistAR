/**
 * AdminNotifications.jsx -- Full notifications page
 * Mark read/unread, type-based icons, time ago display, search, and filters.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, RefreshControl, TextInput, Animated, PanResponder, Dimensions
} from 'react-native';
import {
  ArrowLeft, Bell, CreditCard, Calendar, Info, CheckCircle, AlertTriangle, Search, CheckCircle2, Mail, MailOpen, Trash2
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/context/ThemeContext';
import { typography, spacing, borderRadius, shadows } from '../src/theme';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { AnimatedTouchable } from '../src/components/shared/AnimatedTouchable';
import { getNotifications, markNotificationAsRead, markNotificationAsUnread, deleteNotification } from '../src/utils/api';

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

const SCREEN_WIDTH = Dimensions.get('window').width;

const SwipeableNotificationItem = ({ item, index, onPress, onToggleRead, onDismiss, theme, styles }) => {
  const config = getNotifConfig(theme, item.type);
  const pan = React.useRef(new Animated.ValueXY()).current;
  const opacity = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  const itemRef = React.useRef(item);
  const onToggleReadRef = React.useRef(onToggleRead);
  const onDismissRef = React.useRef(onDismiss);

  React.useEffect(() => {
    itemRef.current = item;
    onToggleReadRef.current = onToggleRead;
    onDismissRef.current = onDismiss;
  }, [item, onToggleRead, onDismiss]);

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay: index * 50, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, delay: index * 50, useNativeDriver: true })
    ]).start();
  }, []);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: 0 });
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -SCREEN_WIDTH * 0.3) {
          Animated.timing(pan, { toValue: { x: -SCREEN_WIDTH, y: 0 }, duration: 200, useNativeDriver: false }).start(() => {
            onDismissRef.current(itemRef.current.id);
          });
        } else if (gestureState.dx > SCREEN_WIDTH * 0.3) {
          Animated.timing(pan, { toValue: { x: SCREEN_WIDTH, y: 0 }, duration: 200, useNativeDriver: false }).start(() => {
            onToggleReadRef.current(itemRef.current);
            Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
          });
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      }
    })
  ).current;

  return (
    <View style={{ marginBottom: 8 }}>
      <Animated.View style={{ opacity, transform: [{ translateY: slideAnim }] }}>
        <View style={[StyleSheet.absoluteFill, { borderRadius: borderRadius.xl, overflow: 'hidden' }]}>
          <Animated.View style={[styles.readBg, { opacity: pan.x.interpolate({ inputRange: [0, 20], outputRange: [0, 1], extrapolate: 'clamp' }) }]}>
            {item.is_read ? <Mail size={24} color="#ffffff" /> : <MailOpen size={24} color="#ffffff" />}
            <Text style={styles.actionText}>{item.is_read ? 'Mark Unread' : 'Mark Read'}</Text>
          </Animated.View>
          <Animated.View style={[styles.deleteBg, { opacity: pan.x.interpolate({ inputRange: [-20, 0], outputRange: [1, 0], extrapolate: 'clamp' }) }]}>
            <Trash2 size={24} color="#ffffff" />
            <Text style={styles.actionText}>Delete</Text>
          </Animated.View>
        </View>

        <Animated.View {...panResponder.panHandlers} style={[pan.getLayout()]}>
          <TouchableOpacity style={[styles.card, !item.is_read && styles.cardUnread]} onPress={() => onPress(item)} activeOpacity={1}>
            {!item.is_read && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(190,144,85,0.06)', borderRadius: borderRadius.xl }]} pointerEvents="none" />}
            <View style={[styles.iconWrap, { backgroundColor: config.bg }]}>
              <config.Icon size={20} color={config.color} />
            </View>
            <View style={styles.cardContent}>
              <View style={styles.cardTop}>
                <Text style={[styles.cardTitle, !item.is_read && styles.cardTitleUnread]} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.cardTime}>{timeAgo(item.created_at)}</Text>
              </View>
              <Text style={styles.cardMessage} numberOfLines={2}>{item.message}</Text>
            </View>
            {!item.is_read && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  );
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
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!notif.is_read) {
      await markNotificationAsRead(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    }
    
    // Routing based on type
    if (notif.type === 'payment_success' || notif.type === 'payout_processed') {
      try { navigation?.navigate?.('admin-billing'); } catch(e){}
    } else if (notif.type === 'appointment_request' || notif.type === 'action_required') {
      try { navigation?.navigate?.('Bookings', { filter: 'pending' }); } catch(e){}
    } else if (notif.type === 'appointment_confirmed') {
      try { navigation?.navigate?.('Bookings', { filter: 'confirmed' }); } catch(e){}
    } else if (notif.type?.startsWith('appointment_') || notif.type === 'system') {
      try { navigation?.navigate?.('Bookings'); } catch(e){}
    } else if (notif.type === 'inventory' || notif.type === 'inventory_out') {
      try { navigation?.navigate?.('admin-inventory'); } catch(e){}
    }
  };

  const handleToggleRead = async (notif) => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (notif.is_read) {
      await markNotificationAsUnread(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: false } : n));
    } else {
      await markNotificationAsRead(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    }
  };

  const handleDismiss = async (id) => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotifications(prev => prev.filter(n => n.id !== id));
    await deleteNotification(id);
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
            filteredNotifs.map((notif, index) => (
              <SwipeableNotificationItem
                key={notif.id}
                item={notif}
                index={index}
                onPress={handlePress}
                onToggleRead={handleToggleRead}
                onDismiss={handleDismiss}
                theme={theme}
                styles={styles}
              />
            ))
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
  cardUnread: { borderLeftWidth: 4, borderLeftColor: theme.gold },
  iconWrap: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardContent: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { ...typography.body, fontWeight: '600', color: theme.textPrimary, flex: 1, marginRight: 8 },
  cardTitleUnread: { fontWeight: '800', color: theme.gold },
  cardTime: { ...typography.bodyXSmall, color: theme.textTertiary },
  cardMessage: { ...typography.bodySmall, color: theme.textSecondary, lineHeight: 20 },
  deleteBg: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '50%', backgroundColor: theme.error, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 24 },
  readBg: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '50%', backgroundColor: theme.info, justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 24 },
  actionText: { ...typography.bodyXSmall, color: '#ffffff', fontWeight: '700', marginTop: 4 },
  unreadDot: { position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: 4, backgroundColor: theme.gold },
});
