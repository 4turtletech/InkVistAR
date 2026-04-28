/**
 * ArtistDashboard.jsx -- Premium Artist Home Screen (Gilded Noir v2)
 * Full theme support, spring animations, haptics, sound effects.
 * Features: Earnings hero, swipeable session queue, bento stats, Art of the Day.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  SafeAreaView, RefreshControl, Image, Animated, Platform,
} from 'react-native';
import {
  Bell, User, Calendar, Zap, Images, DollarSign, Clock,
  ChevronRight, ImageIcon, Plus, TrendingUp, Users, Star,
  Briefcase, Activity, Percent,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { typography, shadows } from '../src/theme';
import { useTheme } from '../src/context/ThemeContext';
import { StatusBadge } from '../src/components/shared/StatusBadge';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { AnimatedTouchable } from '../src/components/shared/AnimatedTouchable';
import { formatCurrency, getInitials } from '../src/utils/formatters';
import { getArtistDashboard, API_URL } from '../src/utils/api';

// --- Staggered animated wrapper ---
const StaggerItem = ({ index, children, style }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 400,
      delay: index * 80,
      useNativeDriver: true,
    }).start();
  }, []);
  return (
    <Animated.View style={[style, {
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
    }]}>
      {children}
    </Animated.View>
  );
};

export function ArtistDashboard({ userName, userEmail, userId, onNavigate, onLogout }) {
  const { theme: colors, hapticsEnabled } = useTheme();
  const styles = getStyles(colors);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [artOfTheDay, setArtOfTheDay] = useState(null);
  const [loadingArt, setLoadingArt] = useState(true);
  const [error, setError] = useState(null);

  // Sound effect
  const playTick = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://actions.google.com/sounds/v1/ui/click_1.ogg' },
        { volume: 0.3 }
      );
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate(s => { if (s.didJustFinish) sound.unloadAsync(); });
    } catch (e) {}
  };

  const triggerFeedback = () => {
    if (hapticsEnabled !== false) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playTick();
  };

  const loadDashboardData = async () => {
    try {
      const result = await getArtistDashboard(userId);
      if (result.success) {
        setDashboardData(result);
        setError(null);
      } else {
        setError(result.message || 'Failed to load data');
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const fetchArtOfTheDay = async () => {
      try {
        setLoadingArt(true);
        const response = await fetch(`${API_URL}/gallery/art-of-the-day`);
        const data = await response.json();
        if (data.success) setArtOfTheDay(data.work);
        else setArtOfTheDay(null);
      } catch (e) { setArtOfTheDay(null); }
      finally { setLoadingArt(false); }
    };
    fetchArtOfTheDay();
  }, [userId]);

  useFocusEffect(useCallback(() => { if (userId) loadDashboardData(); }, [userId]));
  const onRefresh = () => { setRefreshing(true); loadDashboardData(); };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <PremiumLoader message="Loading your dashboard..." />
      </SafeAreaView>
    );
  }

  if (error && !dashboardData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <AnimatedTouchable style={styles.retryButton} onPress={loadDashboardData}>
            <Text style={styles.retryText}>Try Again</Text>
          </AnimatedTouchable>
        </View>
      </SafeAreaView>
    );
  }

  const { artist = {}, appointments = [], works = [], stats = {} } = dashboardData || {};
  const artistName = artist?.name || userName;
  const artistSpecialization = artist?.specialization || 'Tattoo Artist';
  const artistExperience = artist?.experience_years || '0';
  const artistCommission = ((artist?.commission_rate || 0.30) * 100).toFixed(0);
  const artistProfileImage = artist?.profile_image || '';

  const today = new Date();
  const isToday = (dateString) => {
    if (!dateString) return false;
    const d = new Date(dateString);
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };

  const todayCount = appointments.filter(a => isToday(a.appointment_date)).length;
  const weekCount = appointments.filter(a => {
    const d = new Date(a.appointment_date);
    const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
    return d >= weekAgo;
  }).length;
  const totalEarnings = stats?.total_earnings || 0;
  const totalClients = stats?.total_clients || 0;

  const todaySchedule = appointments
    .filter(a => isToday(a.appointment_date))
    .slice(0, 5)
    .map(apt => {
      let timeStr = 'TBD';
      if (apt.start_time) {
        const st = new Date(`2000-01-01T${apt.start_time}`);
        if (!isNaN(st)) timeStr = st.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      }
      return {
        id: apt.id,
        client: apt.client_name || 'Client',
        time: timeStr,
        type: apt.design_title || 'Consultation',
        status: apt.status || 'pending',
        fullApt: apt,
      };
    });

  const recentWorks = works.slice(0, 4).map(w => ({
    id: w.id,
    title: w.title || 'Untitled',
    category: w.category || 'Portfolio',
    image_url: w.image_url || null,
    date: w.created_at ? new Date(w.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recently',
  }));

  const initials = getInitials(artistName);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >

        {/* ── Header ── */}
        <StaggerItem index={0}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.userName}>{artistName.split(' ')[0]}</Text>
            </View>
            <View style={styles.headerActions}>
              <AnimatedTouchable style={styles.iconBtn} onPress={() => { triggerFeedback(); onNavigate('artist-notifications'); }}>
                <Bell size={20} color={colors.textPrimary} />
                {dashboardData?.unreadCount > 0 && (
                  <View style={styles.notifDot}>
                    <Text style={styles.notifDotText}>{dashboardData.unreadCount > 99 ? '99+' : dashboardData.unreadCount}</Text>
                  </View>
                )}
              </AnimatedTouchable>
              <AnimatedTouchable style={styles.avatarBtn} onPress={() => { triggerFeedback(); onNavigate('Profile'); }}>
                {artistProfileImage ? (
                  <Image source={{ uri: artistProfileImage }} style={{ width: 42, height: 42, borderRadius: 21 }} />
                ) : (
                  <Text style={styles.avatarText}>{initials}</Text>
                )}
              </AnimatedTouchable>
            </View>
          </View>
        </StaggerItem>

        {/* ── Earnings Hero Card ── */}
        <StaggerItem index={1}>
          <View style={styles.heroCard}>
            <View style={styles.heroGoldStripe} />
            <View style={styles.heroContent}>
              <View style={styles.heroTop}>
                <View>
                  <Text style={styles.heroLabel}>Total Earnings</Text>
                  <Text style={styles.heroAmount}>P{formatCurrency(totalEarnings)}</Text>
                </View>
                <View style={styles.heroIconWrap}>
                  <TrendingUp size={22} color={colors.gold} />
                </View>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroBottom}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{todayCount}</Text>
                  <Text style={styles.heroStatLabel}>Today</Text>
                </View>
                <View style={[styles.heroStatDivider]} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{weekCount}</Text>
                  <Text style={styles.heroStatLabel}>This Week</Text>
                </View>
                <View style={[styles.heroStatDivider]} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{totalClients}</Text>
                  <Text style={styles.heroStatLabel}>Clients</Text>
                </View>
              </View>
            </View>
          </View>
        </StaggerItem>

        {/* ── Quick Actions ── */}
        <StaggerItem index={2}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            {[
              { label: 'Schedule', Icon: Calendar, color: colors.info, bg: colors.infoBg, nav: 'Schedule' },
              { label: 'Sessions', Icon: Zap, color: colors.warning, bg: colors.warningBg, nav: 'Sessions' },
              { label: 'Portfolio', Icon: Images, color: colors.iconPurple, bg: colors.iconPurpleBg, nav: 'Works' },
              { label: 'Earnings', Icon: DollarSign, color: colors.success, bg: colors.successBg, nav: 'artist-earnings' },
            ].map((action, i) => (
              <AnimatedTouchable key={i} style={styles.quickAction} onPress={() => { triggerFeedback(); onNavigate(action.nav); }}>
                <View style={[styles.quickActionIcon, { backgroundColor: action.bg }]}>
                  <action.Icon size={22} color={action.color} />
                </View>
                <Text style={styles.quickActionText}>{action.label}</Text>
              </AnimatedTouchable>
            ))}
          </View>
        </StaggerItem>

        {/* ── Artist Info Card ── */}
        <StaggerItem index={3}>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIconWrap, { backgroundColor: colors.iconGoldBg }]}>
                <Briefcase size={16} color={colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Specialization</Text>
                <Text style={styles.infoValue}>{artistSpecialization}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.infoLabel}>Experience</Text>
                <Text style={styles.infoValue}>{artistExperience} yrs</Text>
              </View>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={[styles.infoIconWrap, { backgroundColor: colors.successBg }]}>
                <Percent size={16} color={colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Commission</Text>
                <Text style={styles.infoValue}>{artistCommission}%</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.infoLabel}>Works</Text>
                <Text style={styles.infoValue}>{works.length} pieces</Text>
              </View>
            </View>
          </View>
        </StaggerItem>

        {/* ── Today's Schedule ── */}
        <StaggerItem index={4}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            {todaySchedule.length > 0 && (
              <AnimatedTouchable onPress={() => { triggerFeedback(); onNavigate('Schedule'); }}>
                <Text style={styles.viewAllText}>View All</Text>
              </AnimatedTouchable>
            )}
          </View>

          {todaySchedule.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sessionScroll}>
              {todaySchedule.map((apt, i) => (
                <AnimatedTouchable
                  key={apt.id}
                  style={styles.sessionCard}
                  onPress={() => { triggerFeedback(); onNavigate('artist-active-session', { appointment: apt.fullApt }); }}
                >
                  <View style={styles.sessionTimeWrap}>
                    <Clock size={14} color={colors.gold} />
                    <Text style={styles.sessionTime}>{apt.time}</Text>
                  </View>
                  <Text style={styles.sessionClient} numberOfLines={1}>{apt.client}</Text>
                  <Text style={styles.sessionType} numberOfLines={1}>{apt.type}</Text>
                  <View style={{ marginTop: 8 }}>
                    <StatusBadge status={apt.status} />
                  </View>
                </AnimatedTouchable>
              ))}
            </ScrollView>
          ) : (
            <EmptyState icon={Calendar} title="No appointments today" subtitle="Your schedule is clear" />
          )}
        </StaggerItem>

        {/* ── Recent Works ── */}
        <StaggerItem index={5}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Works</Text>
            {recentWorks.length > 0 && (
              <AnimatedTouchable onPress={() => { triggerFeedback(); onNavigate('Works'); }}>
                <Text style={styles.viewAllText}>View All</Text>
              </AnimatedTouchable>
            )}
          </View>

          {recentWorks.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.worksRow}>
              {recentWorks.map(work => (
                <AnimatedTouchable key={work.id} style={styles.workCard} onPress={() => { triggerFeedback(); onNavigate('Works'); }}>
                  {work.image_url ? (
                    <Image source={{ uri: work.image_url }} style={styles.workImage} />
                  ) : (
                    <View style={[styles.workImage, styles.workPlaceholder]}>
                      <ImageIcon size={28} color={colors.textTertiary} />
                    </View>
                  )}
                  <View style={styles.workInfo}>
                    <Text style={styles.workTitle} numberOfLines={1}>{work.title}</Text>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>{work.category}</Text>
                    </View>
                  </View>
                </AnimatedTouchable>
              ))}
              {/* Add Work card */}
              <AnimatedTouchable style={[styles.workCard, styles.addWorkCard]} onPress={() => { triggerFeedback(); onNavigate('Works'); }}>
                <View style={styles.addWorkInner}>
                  <View style={styles.addWorkIcon}>
                    <Plus size={24} color={colors.gold} />
                  </View>
                  <Text style={styles.addWorkText}>Add Work</Text>
                </View>
              </AnimatedTouchable>
            </ScrollView>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <EmptyState icon={Images} title="No portfolio works yet" />
              <AnimatedTouchable style={styles.addFirstBtn} onPress={() => { triggerFeedback(); onNavigate('Works'); }}>
                <Plus size={16} color={colors.backgroundDeep} />
                <Text style={styles.addFirstBtnText}>Add Your First Work</Text>
              </AnimatedTouchable>
            </View>
          )}
        </StaggerItem>

        {/* ── Art of the Day ── */}
        <StaggerItem index={6}>
          <Text style={styles.sectionTitle}>Art of the Day</Text>
          {loadingArt ? (
            <View style={{ height: 200, justifyContent: 'center' }}><PremiumLoader /></View>
          ) : artOfTheDay ? (
            <View style={styles.artCard}>
              <Image source={{ uri: artOfTheDay.image_url }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              <View style={styles.artOverlay}>
                <Text style={styles.artTitle}>{artOfTheDay.title}</Text>
                <Text style={styles.artArtist}>by {artOfTheDay.artist_name}</Text>
              </View>
            </View>
          ) : (
            <EmptyState icon={ImageIcon} title="No featured art today" subtitle="Upload a public piece to be featured" />
          )}
        </StaggerItem>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorTitle: { ...typography.h2, color: colors.error, marginBottom: 8 },
  errorText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  retryButton: { backgroundColor: colors.gold, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText: { ...typography.button, color: colors.backgroundDeep },

  // ── Header ──
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16,
  },
  greeting: { ...typography.body, color: colors.textSecondary },
  userName: { ...typography.h1, color: colors.textPrimary, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  iconBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  notifDot: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: colors.error, minWidth: 18, height: 18, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
    borderWidth: 1.5, borderColor: colors.background,
  },
  notifDotText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  avatarBtn: {
    width: 42, height: 42, borderRadius: 21, overflow: 'hidden',
    backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.gold,
  },
  avatarText: { fontSize: 15, color: colors.gold, fontWeight: '800' },

  // ── Earnings Hero Card ──
  heroCard: {
    marginHorizontal: 20, borderRadius: 16, overflow: 'hidden',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    marginBottom: 20,
  },
  heroGoldStripe: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
    backgroundColor: colors.gold,
  },
  heroContent: { padding: 20, paddingLeft: 20 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLabel: { ...typography.bodyXSmall, color: colors.textTertiary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  heroAmount: { fontSize: 32, fontWeight: '800', color: colors.gold, marginTop: 4, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  heroIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.iconGoldBg, justifyContent: 'center', alignItems: 'center',
  },
  heroDivider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  heroBottom: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  heroStat: { alignItems: 'center' },
  heroStatValue: { ...typography.h3, color: colors.textPrimary, fontWeight: '800' },
  heroStatLabel: { ...typography.bodyXSmall, color: colors.textTertiary, marginTop: 2 },
  heroStatDivider: { width: 1, height: 30, backgroundColor: colors.border },

  // ── Quick Actions ──
  sectionTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: 12, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12, marginTop: 8 },
  viewAllText: { ...typography.bodySmall, color: colors.gold, fontWeight: '700' },
  quickActions: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 20 },
  quickAction: {
    flex: 1, alignItems: 'center', paddingVertical: 16,
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  quickActionIcon: {
    width: 46, height: 46, borderRadius: 23,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  quickActionText: { ...typography.bodyXSmall, fontWeight: '700', color: colors.textPrimary },

  // ── Artist Info Card ──
  infoCard: {
    marginHorizontal: 20, backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 20,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIconWrap: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  infoLabel: { ...typography.bodyXSmall, color: colors.textTertiary, marginBottom: 2 },
  infoValue: { ...typography.body, color: colors.textPrimary, fontWeight: '700' },
  infoDivider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },

  // ── Session Queue (Horizontal Swipe) ──
  sessionScroll: { paddingHorizontal: 20, gap: 12 },
  sessionCard: {
    width: 170, backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, padding: 16,
  },
  sessionTimeWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sessionTime: { ...typography.bodySmall, color: colors.gold, fontWeight: '800' },
  sessionClient: { ...typography.body, color: colors.textPrimary, fontWeight: '700', marginBottom: 2 },
  sessionType: { ...typography.bodyXSmall, color: colors.textSecondary },

  // ── Works (Horizontal) ──
  worksRow: { paddingHorizontal: 20, gap: 12 },
  workCard: {
    width: 150, backgroundColor: colors.surface, borderRadius: 16,
    overflow: 'hidden', borderWidth: 1, borderColor: colors.border,
  },
  workImage: { height: 120, width: '100%' },
  workPlaceholder: { backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center' },
  workInfo: { padding: 10 },
  workTitle: { ...typography.bodySmall, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  categoryBadge: {
    backgroundColor: colors.iconGoldBg, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, alignSelf: 'flex-start',
  },
  categoryText: { ...typography.bodyXSmall, color: colors.gold, fontWeight: '600' },
  addWorkCard: { justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed' },
  addWorkInner: { alignItems: 'center', paddingVertical: 30 },
  addWorkIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.iconGoldBg, justifyContent: 'center', alignItems: 'center',
    marginBottom: 10,
  },
  addWorkText: { ...typography.bodySmall, color: colors.gold, fontWeight: '700' },
  addFirstBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12,
    backgroundColor: colors.gold, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12,
  },
  addFirstBtnText: { ...typography.bodySmall, color: colors.backgroundDeep, fontWeight: '700' },

  // ── Art of Day ──
  artCard: {
    height: 220, marginHorizontal: 20, borderRadius: 16, overflow: 'hidden',
    backgroundColor: colors.surfaceLight, justifyContent: 'flex-end',
  },
  artOverlay: {
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  artTitle: {
    ...typography.h2, color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 10,
    marginBottom: 4,
  },
  artArtist: {
    ...typography.body, color: 'rgba(255,255,255,0.9)',
    textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 10,
  },
});