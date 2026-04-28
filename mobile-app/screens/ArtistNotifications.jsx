import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView, ScrollView, Animated, PanResponder, Dimensions, RefreshControl
} from 'react-native';
import {
  ArrowLeft, Bell, Calendar, CheckCircle, XCircle, Star,
  AlertTriangle, CreditCard, Mail, ChevronDown, Trash2, Filter, MessageSquare, Info
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../src/context/ThemeContext';
import { typography, borderRadius, shadows } from '../src/theme';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { getNotifications, markNotificationAsRead, markNotificationAsUnread, deleteNotification } from '../src/utils/api';
import { API_URL } from '../src/config';

const timeAgo = (dateString) => {
  if (!dateString) return '';
  const seconds = Math.round((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const m = Math.round(seconds / 60); if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

const getIconMap = (colors) => ({
  appointment_request: { Icon: Calendar, color: colors.info, bg: colors.infoBg },
  appointment_new: { Icon: Calendar, color: colors.info, bg: colors.infoBg },
  appointment_confirmed: { Icon: CheckCircle, color: colors.success, bg: colors.successBg },
  appointment_cancelled: { Icon: XCircle, color: colors.error, bg: colors.errorBg },
  appointment_completed: { Icon: Star, color: colors.iconPurple, bg: colors.iconPurpleBg },
  action_required: { Icon: AlertTriangle, color: colors.warning, bg: colors.warningBg },
  payment_success: { Icon: CreditCard, color: colors.success, bg: colors.successBg },
});

const MAIN_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' }
];

const TYPE_FILTERS = [
  { key: 'all_types', label: 'All Types' },
  { key: 'appointment_request', label: 'Requests' },
  { key: 'appointment_new', label: 'New' },
  { key: 'appointment_confirmed', label: 'Confirmed' },
  { key: 'appointment_cancelled', label: 'Cancelled' },
  { key: 'appointment_completed', label: 'Completed' },
  { key: 'payment_success', label: 'Payments' }
];

const SCREEN_WIDTH = Dimensions.get('window').width;

const SwipeableNotificationItem = ({ item, index, onPress, onUnread, onDismiss, onAction, theme, styles }) => {
  const ICON_MAP = getIconMap(theme);
  const cfg = ICON_MAP[item.type] || { Icon: Bell, color: theme.textTertiary, bg: theme.surfaceLight };
  const pan = useRef(new Animated.ValueXY()).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const itemHeight = useRef(new Animated.Value(item.type === 'action_required' && !item.is_read ? 140 : 100)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay: index * 100, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, delay: index * 100, useNativeDriver: true })
    ]).start();
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          pan.setValue({ x: gestureState.dx, y: 0 });
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -SCREEN_WIDTH * 0.3) {
          Animated.timing(pan, { toValue: { x: -SCREEN_WIDTH, y: 0 }, duration: 200, useNativeDriver: false }).start(() => {
            Animated.timing(itemHeight, { toValue: 0, duration: 200, useNativeDriver: false }).start(() => {
              onDismiss(item.id);
            });
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
    <Animated.View style={{ height: itemHeight, overflow: 'hidden' }}>
      <Animated.View style={{ opacity, transform: [{ translateY: slideAnim }], flex: 1 }}>
      <View style={styles.deleteBg}>
        <Trash2 size={24} color="#ffffff" />
        <Text style={styles.deleteText}>Delete</Text>
      </View>
      <Animated.View {...panResponder.panHandlers} style={[pan.getLayout(), { flex: 1 }]}>
        <TouchableOpacity style={[styles.card, !item.is_read && styles.cardUnread]} onPress={() => onPress(item)} activeOpacity={0.9}>
          {!item.is_read && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(190,144,85,0.06)', borderRadius: borderRadius.xl }]} pointerEvents="none" />}
          <View style={[styles.iconWrap, { backgroundColor: cfg.bg || theme.surfaceLight }]}>
            <cfg.Icon size={20} color={cfg.color || theme.textTertiary} />
          </View>
          <View style={styles.cardContent}>
            <View style={styles.cardTop}>
              <Text style={[styles.cardTitle, !item.is_read && styles.cardTitleBold]} numberOfLines={2}>{item.title || ''}</Text>
              <Text style={styles.cardTime}>{timeAgo(item.created_at)}</Text>
            </View>
            <Text style={styles.cardMsg} numberOfLines={2}>{item.message || ''}</Text>
            
            {item.type === 'action_required' && !item.is_read && (
              <View style={styles.actionBtns}>
                <TouchableOpacity style={styles.acceptBtn} onPress={() => onAction(item.id, item.related_id, 'accept')}>
                  <CheckCircle size={14} color="#fff" />
                  <Text style={styles.actionBtnText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.declineBtn} onPress={() => onAction(item.id, item.related_id, 'reject')}>
                  <XCircle size={14} color="#fff" />
                  <Text style={styles.actionBtnText}>Decline</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          {!!item.is_read && (
            <TouchableOpacity style={{ padding: 4 }} onPress={() => onUnread(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Mail size={16} color={theme.gold} />
            </TouchableOpacity>
          )}
          {!item.is_read && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      </Animated.View>
      </Animated.View>
    </Animated.View>
  );
};

export function ArtistNotifications({ onBack, userId }) {
  const { theme, hapticsEnabled } = useTheme();
  const navigation = useNavigation();
  const styles = getStyles(theme);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [subFilter, setSubFilter] = useState('all_types');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => { load(1); }, [userId, filterType, subFilter]);

  const load = async (p = 1) => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const opts = { page: p, limit: 20 };
      
      if (filterType === 'unread') opts.is_read = false;
      if (filterType === 'read') opts.is_read = true;
      if (subFilter !== 'all_types') opts.type = subFilter;

      const r = await getNotifications(userId, opts);
      if (r.success) {
        p === 1 ? setNotifications(r.notifications || []) : setNotifications(prev => [...prev, ...(r.notifications || [])]);
        setHasMore(r.pagination?.hasMore || false);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const markAllRead = () => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const ids = notifications.filter(n => !n.is_read).map(n => n.id);
    if (ids.length) { Promise.all(ids.map(id => markNotificationAsRead(id))); setNotifications(prev => prev.map(n => ({ ...n, is_read: true }))); }
  };

  const onPress = async (item) => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!item.is_read) { await markNotificationAsRead(item.id); setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n)); }
    
    if (item.type === 'payment_success') {
      try { navigation.navigate('artist-earnings', { openTransactionId: item.related_id }); } catch(e){}
    } else if (item.type === 'appointment_request' || item.type === 'action_required') {
      try { navigation.navigate('artist-main', { screen: 'Sessions', params: { openAppointmentId: item.related_id } }); } catch(e){}
    } else if (item.type?.startsWith('appointment_')) {
      try { navigation.navigate('artist-main', { screen: 'Schedule', params: { openAppointmentId: item.related_id } }); } catch(e){}
    }
  };
  
  const onUnread = async (item) => { 
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await markNotificationAsUnread(item.id); setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: false } : n)); 
  };
  
  const onDismiss = async (id) => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotifications(prev => prev.filter(n => n.id !== id));
    await deleteNotification(id);
  };
  
  const handleAction = async (notifId, apptId, action) => {
    try {
      if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const response = await fetch(`${API_URL}/artist/appointments/${apptId}/${action}`, { method: 'PUT' });
      const data = await response.json();
      if (data.success) {
        await markNotificationAsRead(notifId);
        load(1);
      }
    } catch (e) { console.error(e); }
  };

  const loadMore = () => { const next = page + 1; setPage(next); load(next); };
  
  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await load(1);
    setRefreshing(false);
  };
  
  const setFilter = (t) => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilterType(t); setPage(1); setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const renderItem = ({ item, index }) => (
    <SwipeableNotificationItem
      item={item} index={index} onPress={onPress} onUnread={onUnread} onDismiss={onDismiss} onAction={handleAction} theme={theme} styles={styles}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
            <ArrowLeft size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <View style={styles.actionsBar}>
        <Text style={styles.countText}>{unreadCount} Unread</Text>
        <TouchableOpacity onPress={markAllRead}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.filterWrap, { zIndex: 10 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {MAIN_FILTERS.map(f => (
            <TouchableOpacity key={f.key} style={[styles.chip, filterType === f.key && styles.chipActive]} onPress={() => setFilter(f.key)}>
              <Text style={[styles.chipText, filterType === f.key && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity 
            style={[styles.chip, { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 10, borderColor: showDropdown ? theme.gold : theme.border, backgroundColor: showDropdown ? theme.surface : theme.surfaceLight }]} 
            onPress={() => { if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowDropdown(!showDropdown); }}
          >
            <Filter size={12} color={showDropdown ? theme.gold : theme.textSecondary} />
            <Text style={[styles.chipText, { color: showDropdown ? theme.gold : theme.textSecondary }]}>
              {TYPE_FILTERS.find(t => t.key === subFilter)?.label || 'All Types'}
            </Text>
            <ChevronDown size={12} color={showDropdown ? theme.gold : theme.textSecondary} />
          </TouchableOpacity>
        </ScrollView>
        {showDropdown && (
          <View style={styles.dropdownWrap}>
            {TYPE_FILTERS.map(f => (
              <TouchableOpacity key={f.key} style={styles.dropdownItem} onPress={() => {
                if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSubFilter(f.key);
                setShowDropdown(false);
                setPage(1);
                setNotifications([]);
              }}>
                <Text style={[styles.dropdownText, subFilter === f.key && { color: theme.gold, fontWeight: '700' }]}>{f.label}</Text>
                {subFilter === f.key && <CheckCircle size={14} color={theme.gold} />}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {loading && notifications.length === 0 ? <PremiumLoader message="Loading..." /> : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={item => (item.id || Math.random()).toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={onRefresh}
          refreshing={refreshing}
          ListEmptyComponent={<EmptyState icon={Bell} title="No notifications" subtitle="We'll let you know when something important happens" />}
          ListFooterComponent={
            hasMore ? (
              <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore}>
                <Text style={styles.loadMoreText}>Load More</Text>
                <ChevronDown size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            ) : notifications.length > 0 ? <Text style={styles.endText}>No more notifications</Text> : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { padding: 20, paddingTop: 52, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border, ...shadows.subtle },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.surfaceLight, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...typography.h2, color: theme.textPrimary },
  actionsBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.surface,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  countText: { ...typography.bodySmall, color: theme.textSecondary, fontWeight: '600' },
  markAllText: { ...typography.bodySmall, color: theme.gold, fontWeight: '600' },
  filterWrap: { backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 10 },
  filterRow: { paddingHorizontal: 16, paddingVertical: 6, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: borderRadius.round,
    backgroundColor: theme.surfaceLight, borderWidth: 1, borderColor: theme.border,
  },
  chipActive: { backgroundColor: theme.gold, borderColor: theme.gold },
  chipText: { ...typography.bodyXSmall, color: theme.textSecondary, fontWeight: '600' },
  chipTextActive: { color: theme.backgroundDeep },
  dropdownWrap: { position: 'absolute', top: 50, right: 16, width: 180, backgroundColor: theme.backgroundDeep, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: theme.border, ...shadows.medium, paddingVertical: 4, zIndex: 20 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
  dropdownText: { ...typography.bodySmall, color: theme.textPrimary },
  listContent: { padding: 16 },
  deleteBg: { position: 'absolute', right: 0, top: 0, bottom: 8, width: 80, backgroundColor: theme.error, borderRadius: borderRadius.xl, justifyContent: 'center', alignItems: 'center' },
  deleteText: { ...typography.bodyXSmall, color: '#ffffff', fontWeight: '700', marginTop: 4 },
  card: {
    flexDirection: 'row', backgroundColor: theme.surface, borderRadius: borderRadius.xl,
    padding: 14, marginBottom: 8, alignItems: 'flex-start',
    borderWidth: 1, borderColor: theme.border, ...shadows.subtle
  },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: theme.gold },
  iconWrap: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardContent: { flex: 1, marginRight: 8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  cardTitle: { ...typography.body, fontWeight: '600', color: theme.textPrimary, flex: 1, marginRight: 8 },
  cardTitleBold: { fontWeight: '800', color: theme.textPrimary },
  cardTime: { ...typography.bodyXSmall, color: theme.textTertiary },
  cardMsg: { ...typography.bodySmall, color: theme.textSecondary, lineHeight: 20 },
  actionBtns: { flexDirection: 'row', gap: 8, marginTop: 10 },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.success, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  declineBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.error, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  actionBtnText: { ...typography.bodyXSmall, color: '#ffffff', fontWeight: '700' },
  unreadDot: { position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: 4, backgroundColor: theme.gold },
  loadMoreBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4,
    paddingVertical: 12, marginBottom: 20, backgroundColor: theme.surface,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: theme.border,
  },
  loadMoreText: { ...typography.bodySmall, color: theme.textSecondary, fontWeight: '600' },
  endText: { ...typography.bodySmall, color: theme.textTertiary, textAlign: 'center', paddingVertical: 20, fontStyle: 'italic' },
});