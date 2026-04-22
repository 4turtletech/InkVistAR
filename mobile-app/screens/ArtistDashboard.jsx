/**
 * ArtistDashboard.jsx -- Complete Artist Dashboard with Real Data
 * Themed upgrade: lucide icons, theme tokens, StatusBadge integration.
 */
import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  SafeAreaView, RefreshControl, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell, User, Calendar, Zap, Images, DollarSign, Clock,
  ChevronRight, ImageIcon, Plus,
} from 'lucide-react-native';
import { colors, typography, borderRadius, shadows } from '../src/theme';
import { StatusBadge } from '../src/components/shared/StatusBadge';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { formatCurrency } from '../src/utils/formatters';
import { getArtistDashboard, API_URL } from '../src/utils/api';

export function ArtistDashboard({ userName, userEmail, userId, onNavigate, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [artOfTheDay, setArtOfTheDay] = useState(null);
  const [loadingArt, setLoadingArt] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
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
      } catch (e) {
        setArtOfTheDay(null);
      } finally {
        setLoadingArt(false);
      }
    };
    fetchArtOfTheDay();
  }, [userId]);

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
          <TouchableOpacity style={styles.retryButton} onPress={loadDashboardData}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { artist = {}, appointments = [], works = [], stats = {} } = dashboardData || {};
  const artistName = artist?.name || userName;
  const artistSpecialization = artist?.specialization || 'Tattoo Artist';
  const artistExperience = artist?.experience_years || '8';
  const artistHourlyRate = artist?.hourly_rate || 150;

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

  const quickStats = [
    { label: 'Today', value: String(todayCount), Icon: Calendar, color: colors.info, bg: colors.infoBg },
    { label: 'This Week', value: String(weekCount), Icon: Clock, color: colors.iconPurple, bg: colors.iconPurpleBg },
    { label: 'Total Earned', value: `P${formatCurrency(totalEarnings)}`, Icon: DollarSign, color: colors.success, bg: colors.successBg },
    { label: 'Hourly Rate', value: `P${Number(artistHourlyRate).toLocaleString()}`, Icon: Zap, color: colors.warning, bg: colors.warningBg },
  ];

  const todaySchedule = appointments
    .filter(a => isToday(a.appointment_date))
    .slice(0, 3)
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

  const recentWorks = works.slice(0, 3).map(w => ({
    id: w.id,
    title: w.title || 'Untitled',
    category: w.category || 'Portfolio',
    date: w.created_at ? new Date(w.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recently',
  }));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {/* Hero Header */}
        <LinearGradient colors={['#0f172a', '#1e293b', colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>{artistName}</Text>
              <Text style={styles.userRole}>{artistSpecialization} -- {artistExperience} Years Exp.</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerBtn} onPress={() => onNavigate('artist-notifications')}>
                <Bell size={20} color="#ffffff" />
                {dashboardData?.unreadCount > 0 && (
                  <View style={styles.notifDot}><Text style={styles.notifDotText}>{dashboardData.unreadCount > 99 ? '99+' : dashboardData.unreadCount}</Text></View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerBtn} onPress={() => onNavigate('Profile')}>
                <User size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {quickStats.map((stat, i) => (
              <View key={i} style={styles.statItem}>
                <View style={[styles.statIconWrap, { backgroundColor: stat.bg }]}>
                  <stat.Icon size={18} color={stat.color} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            {[
              { label: 'Schedule', Icon: Calendar, gradient: ['#0f172a', '#334155'], nav: 'Schedule' },
              { label: 'Sessions', Icon: Zap, gradient: ['#7f1d1d', '#dc2626'], nav: 'Sessions' },
              { label: 'Portfolio', Icon: Images, gradient: ['#1e3a5f', '#3b82f6'], nav: 'Works' },
              { label: 'Earnings', Icon: DollarSign, gradient: ['#064e3b', '#10b981'], nav: 'artist-earnings' },
            ].map((action, i) => (
              <TouchableOpacity key={i} style={styles.quickAction} onPress={() => onNavigate(action.nav)} activeOpacity={0.8}>
                <LinearGradient colors={action.gradient} style={styles.quickActionIcon}>
                  <action.Icon size={24} color="#ffffff" />
                </LinearGradient>
                <Text style={styles.quickActionText}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Today's Schedule */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            {todaySchedule.length > 0 && (
              <TouchableOpacity onPress={() => onNavigate('Schedule')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>
          {todaySchedule.length > 0 ? (
            todaySchedule.map(apt => (
              <TouchableOpacity key={apt.id} style={styles.scheduleCard} onPress={() => onNavigate('artist-active-session', { appointment: apt.fullApt })} activeOpacity={0.7}>
                <View style={styles.scheduleTime}>
                  <Clock size={16} color={colors.primary} />
                  <Text style={styles.scheduleTimeText}>{apt.time}</Text>
                </View>
                <View style={styles.scheduleDetails}>
                  <Text style={styles.scheduleClient}>{apt.client}</Text>
                  <Text style={styles.scheduleType} numberOfLines={1}>{apt.type}</Text>
                </View>
                <StatusBadge status={apt.status} />
                <ChevronRight size={18} color={colors.textTertiary} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            ))
          ) : (
            <EmptyState icon={Calendar} title="No appointments today" subtitle="Your schedule is clear" />
          )}

          {/* Recent Works */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Works</Text>
            {recentWorks.length > 0 && (
              <TouchableOpacity onPress={() => onNavigate('Works')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>
          {recentWorks.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.worksRow}>
              {recentWorks.map(work => (
                <TouchableOpacity key={work.id} style={styles.workCard} activeOpacity={0.8}>
                  <LinearGradient colors={['#0f172a', '#334155']} style={styles.workImage}>
                    <ImageIcon size={36} color={colors.textTertiary} />
                  </LinearGradient>
                  <View style={styles.workInfo}>
                    <Text style={styles.workTitle} numberOfLines={1}>{work.title}</Text>
                    <View style={styles.categoryBadge}><Text style={styles.categoryText}>{work.category}</Text></View>
                    <Text style={styles.workDate}>{work.date}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyWorkWrap}>
              <EmptyState icon={Images} title="No portfolio works yet" />
              <TouchableOpacity style={styles.addWorkBtn} onPress={() => onNavigate('Works')}>
                <Plus size={16} color="#ffffff" />
                <Text style={styles.addWorkBtnText}>Add Your First Work</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Art of the Day */}
          <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Art of the Day</Text>
          {loadingArt ? (
            <View style={{ height: 200, justifyContent: 'center' }}><PremiumLoader /></View>
          ) : artOfTheDay ? (
            <View style={styles.artCard}>
              <Image source={{ uri: artOfTheDay.image_url }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.artOverlay}>
                <Text style={styles.artTitle}>{artOfTheDay.title}</Text>
                <Text style={styles.artArtist}>by {artOfTheDay.artist_name}</Text>
              </LinearGradient>
            </View>
          ) : (
            <EmptyState icon={ImageIcon} title="No featured art today" subtitle="Upload a public piece to be featured" />
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorTitle: { ...typography.h2, color: colors.error, marginBottom: 8 },
  errorText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  retryButton: { backgroundColor: colors.darkBg, paddingHorizontal: 24, paddingVertical: 12, borderRadius: borderRadius.md },
  retryText: { ...typography.button, color: '#ffffff' },

  // Header
  header: { padding: 20, paddingTop: 56, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  headerLeft: { flex: 1 },
  welcomeText: { ...typography.body, color: 'rgba(255,255,255,0.8)' },
  userName: { ...typography.h1, color: '#ffffff', marginBottom: 2 },
  userRole: { ...typography.bodySmall, color: 'rgba(255,255,255,0.7)' },
  headerActions: { flexDirection: 'row', gap: 10 },
  headerBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center',
  },
  notifDot: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: colors.error, minWidth: 18, height: 18, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
    borderWidth: 1.5, borderColor: colors.darkBg,
  },
  notifDotText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statItem: {
    width: '48%', backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.xl, padding: 14, marginBottom: 4,
  },
  statIconWrap: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { ...typography.h3, color: '#ffffff', marginBottom: 2 },
  statLabel: { ...typography.bodyXSmall, color: 'rgba(255,255,255,0.8)' },

  // Content
  content: { padding: 16, paddingBottom: 80 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 8 },
  sectionTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: 12 },
  viewAllText: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' },

  // Quick Actions
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  quickAction: {
    width: '48%', alignItems: 'center', padding: 16,
    backgroundColor: '#ffffff', borderRadius: borderRadius.xl,
    borderWidth: 1, borderColor: colors.border, ...shadows.subtle,
  },
  quickActionIcon: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  quickActionText: { ...typography.bodySmall, fontWeight: '600', color: colors.textPrimary },

  // Schedule
  scheduleCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
    borderRadius: borderRadius.xl, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border, ...shadows.subtle,
  },
  scheduleTime: { alignItems: 'center', marginRight: 14, gap: 4 },
  scheduleTimeText: { ...typography.bodySmall, fontWeight: '700', color: colors.textPrimary },
  scheduleDetails: { flex: 1 },
  scheduleClient: { ...typography.body, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  scheduleType: { ...typography.bodySmall, color: colors.textSecondary },

  // Works
  worksRow: { gap: 12, paddingRight: 16 },
  workCard: {
    width: 190, backgroundColor: '#ffffff', borderRadius: borderRadius.xl,
    overflow: 'hidden', borderWidth: 1, borderColor: colors.border, ...shadows.subtle,
  },
  workImage: { height: 130, justifyContent: 'center', alignItems: 'center' },
  workInfo: { padding: 12 },
  workTitle: { ...typography.body, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  categoryBadge: { backgroundColor: colors.lightBgSecondary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.sm, alignSelf: 'flex-start', marginBottom: 6 },
  categoryText: { ...typography.bodyXSmall, color: colors.textSecondary, fontWeight: '600' },
  workDate: { ...typography.bodyXSmall, color: colors.textTertiary },
  emptyWorkWrap: { alignItems: 'center' },
  addWorkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12,
    backgroundColor: colors.darkBg, paddingHorizontal: 20, paddingVertical: 10, borderRadius: borderRadius.md,
  },
  addWorkBtnText: { ...typography.bodySmall, color: '#ffffff', fontWeight: '600' },

  // Art of Day
  artCard: {
    height: 240, borderRadius: borderRadius.xl, overflow: 'hidden',
    backgroundColor: colors.darkBgSecondary, justifyContent: 'flex-end',
    ...shadows.cardStrong,
  },
  artOverlay: { padding: 20 },
  artTitle: { ...typography.h2, color: '#ffffff', textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 10, marginBottom: 4 },
  artArtist: { ...typography.body, color: 'rgba(255,255,255,0.9)', textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 10 },
});