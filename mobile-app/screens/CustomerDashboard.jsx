/**
 * CustomerDashboard.jsx -- Premium Customer Home Screen
 * Themed with lucide icons, theme tokens, stats grid, quick actions,
 * upcoming appointments, trending styles, and AI recommendation CTA.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell, User, Palette, Calendar, Heart, Star, Sparkles,
  MessageCircle, Images, Zap, Clock, ChevronRight, Lightbulb, ArrowRight,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, borderRadius, shadows } from '../src/theme';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { StatusBadge } from '../src/components/shared/StatusBadge';
import { getCustomerDashboard } from '../src/utils/api';
import { getCustomerFavoriteWorks, getCustomerMyTattoos } from '../src/api/customerAPI';

export function CustomerDashboard({ userName, userId, onNavigate, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [myTattoosCount, setMyTattoosCount] = useState(0);

  const loadDashboard = async () => {
    if (!userId) return;
    try {
      const result = await getCustomerDashboard(userId);
      if (result.success) setDashboardData(result);

      const favResult = await getCustomerFavoriteWorks(userId);
      if (favResult.success) setFavoritesCount((favResult.favorites || []).length);

      const tattoosResult = await getCustomerMyTattoos(userId);
      if (tattoosResult.success) setMyTattoosCount((tattoosResult.tattoos || []).length);
    } catch (e) { console.error('Dashboard error:', e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { loadDashboard(); }, [userId]);
  useFocusEffect(useCallback(() => { if (userId) loadDashboard(); }, [userId]));
  const onRefresh = () => { setRefreshing(true); loadDashboard(); };

  const upcomingApts = (dashboardData?.appointments || []).slice(0, 2).map(a => ({
    id: a.id,
    artist: a.artist_name,
    date: new Date(a.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    time: a.start_time?.slice(0, 5) || 'TBD',
    type: a.design_title || 'Appointment',
    status: a.status || 'pending',
  }));

  const stats = {
    tattoos: dashboardData?.stats?.total_tattoos ?? myTattoosCount,
    upcoming: dashboardData?.stats?.upcoming ?? 0,
    saved: dashboardData?.stats?.saved_designs ?? favoritesCount,
    artists: dashboardData?.stats?.artists ?? 0,
  };

  const quickActions = [
    { title: 'AR Preview', subtitle: 'Try tattoos in AR', Icon: Sparkles, screen: 'AR', gradient: ['#fbbf24', '#d97706'] },
    { title: 'Book Artist', subtitle: 'Schedule appointment', Icon: Calendar, screen: 'booking-create', gradient: ['#0f172a', '#334155'] },
    { title: 'Chat', subtitle: 'Contact studio', Icon: MessageCircle, screen: 'Chat', gradient: ['#1e40af', '#3b82f6'] },
    { title: 'Gallery', subtitle: 'Browse designs', Icon: Images, screen: 'Gallery', gradient: ['#7c3aed', '#a78bfa'] },
    { title: 'Favorites', subtitle: `${favoritesCount} saved`, Icon: Heart, screen: 'Gallery', params: { initialViewMode: 'Favorites' }, gradient: ['#e11d48', '#fb7185'] },
    { title: 'My Tattoos', subtitle: `${myTattoosCount} sessions`, Icon: Zap, screen: 'Gallery', params: { initialViewMode: 'My Tattoos' }, gradient: ['#059669', '#34d399'] },
  ];

  const trendingStyles = [
    { name: 'Minimalist', Icon: Palette, color: '#0f172a' },
    { name: 'Traditional', Icon: Palette, color: '#b91c1c' },
    { name: 'Watercolor', Icon: Palette, color: '#3b82f6' },
    { name: 'Geometric', Icon: Palette, color: '#10b981' },
    { name: 'Blackwork', Icon: Palette, color: '#111827' },
  ];

  const statCards = [
    { label: 'Tattoos', value: stats.tattoos, Icon: Palette, color: colors.primary },
    { label: 'Upcoming', value: stats.upcoming, Icon: Calendar, color: colors.success },
    { label: 'Saved', value: stats.saved, Icon: Heart, color: colors.error },
    { label: 'Artists', value: stats.artists, Icon: Star, color: colors.warning },
  ];

  if (loading && !refreshing) {
    return <SafeAreaView style={styles.container}><PremiumLoader message="Loading your dashboard..." /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>

        {/* Hero Header */}
        <LinearGradient colors={['#0f172a', '#1e293b', colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>{userName}</Text>
              <Text style={styles.tagline}>Your tattoo journey starts here</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerBtn} onPress={() => onNavigate('customer-notifications')}>
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

          {/* Stats */}
          <View style={styles.statsGrid}>
            {statCards.map((s, i) => (
              <View key={i} style={styles.statCard}>
                <View style={[styles.statIconWrap, { backgroundColor: `${s.color}25` }]}>
                  <s.Icon size={16} color={s.color} />
                </View>
                <Text style={styles.statNumber}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((a, i) => (
              <TouchableOpacity key={i} style={styles.actionCard} onPress={() => onNavigate(a.screen, a.params || {})} activeOpacity={0.8}>
                <LinearGradient colors={a.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionIcon}>
                  <a.Icon size={24} color="#ffffff" />
                </LinearGradient>
                <Text style={styles.actionTitle}>{a.title}</Text>
                <Text style={styles.actionSubtitle}>{a.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Upcoming Appointments */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
            <TouchableOpacity onPress={() => onNavigate('Appointments')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          {upcomingApts.length > 0 ? upcomingApts.map(apt => (
            <TouchableOpacity key={apt.id} style={styles.aptCard} onPress={() => onNavigate('Appointments')} activeOpacity={0.7}>
              <View style={styles.aptLeft}>
                <View style={[styles.aptAvatarWrap, { backgroundColor: colors.primaryLight }]}>
                  <Palette size={20} color={colors.primary} />
                </View>
              </View>
              <View style={styles.aptDetails}>
                <Text style={styles.aptArtist}>{apt.artist}</Text>
                <Text style={styles.aptType} numberOfLines={1}>{apt.type}</Text>
                <View style={styles.aptTimeRow}>
                  <Clock size={12} color={colors.textTertiary} />
                  <Text style={styles.aptTime}>{apt.date} -- {apt.time}</Text>
                </View>
              </View>
              <StatusBadge status={apt.status} />
              <ChevronRight size={18} color={colors.textTertiary} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          )) : (
            <View style={styles.emptyApt}>
              <EmptyState icon={Calendar} title="No upcoming appointments" />
              <TouchableOpacity style={styles.bookBtn} onPress={() => onNavigate('booking-create')}>
                <Calendar size={14} color="#ffffff" />
                <Text style={styles.bookBtnText}>Book Now</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Trending Styles */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending Styles</Text>
            <TouchableOpacity onPress={() => onNavigate('customer-artists')}>
              <Text style={styles.viewAll}>Discover Artists</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingRow}>
            {trendingStyles.map((s, i) => (
              <TouchableOpacity key={i} style={styles.trendingCard} onPress={() => onNavigate('Gallery', { searchQuery: s.name })} activeOpacity={0.7}>
                <View style={[styles.trendingIcon, { backgroundColor: `${s.color}15` }]}>
                  <s.Icon size={22} color={s.color} />
                </View>
                <Text style={styles.trendingText}>{s.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* AI CTA */}
          <LinearGradient colors={['#0f172a', '#1e293b']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaCard}>
            <Lightbulb size={28} color="#fbbf24" />
            <View style={styles.ctaText}>
              <Text style={styles.ctaTitle}>Need Inspiration?</Text>
              <Text style={styles.ctaDesc}>Chat with our AI for personalized tattoo suggestions</Text>
            </View>
            <TouchableOpacity style={styles.ctaBtn} onPress={() => onNavigate('chatbot-enhanced')} activeOpacity={0.8}>
              <Text style={styles.ctaBtnText}>Try AI</Text>
              <ArrowRight size={14} color="#0f172a" />
            </TouchableOpacity>
          </LinearGradient>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 56, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  welcomeText: { ...typography.body, color: 'rgba(255,255,255,0.8)' },
  userName: { ...typography.h1, color: '#ffffff', marginBottom: 2 },
  tagline: { ...typography.bodySmall, color: 'rgba(255,255,255,0.65)' },
  headerActions: { flexDirection: 'row', gap: 10 },
  headerBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center',
  },
  notifDot: {
    position: 'absolute', top: -3, right: -3,
    backgroundColor: colors.error, minWidth: 16, height: 16, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: colors.darkBg,
  },
  notifDotText: { color: '#fff', fontSize: 8, fontWeight: '800' },

  statsGrid: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: borderRadius.xl, padding: 12, alignItems: 'center' },
  statIconWrap: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  statNumber: { ...typography.h4, color: '#ffffff', fontWeight: '800', marginBottom: 2 },
  statLabel: { ...typography.bodyXSmall, color: 'rgba(255,255,255,0.8)' },

  content: { padding: 16, paddingBottom: 80 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 8 },
  sectionTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: 12 },
  viewAll: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  actionCard: {
    width: '48%', backgroundColor: '#ffffff', borderRadius: borderRadius.xl, padding: 14,
    borderWidth: 1, borderColor: colors.border, ...shadows.subtle,
  },
  actionIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  actionTitle: { ...typography.body, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  actionSubtitle: { ...typography.bodyXSmall, color: colors.textSecondary },

  aptCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
    borderRadius: borderRadius.xl, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border, ...shadows.subtle,
  },
  aptLeft: { marginRight: 12 },
  aptAvatarWrap: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  aptDetails: { flex: 1 },
  aptArtist: { ...typography.body, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  aptType: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: 4 },
  aptTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  aptTime: { ...typography.bodyXSmall, color: colors.textTertiary },
  emptyApt: { alignItems: 'center' },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12,
    backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: borderRadius.md,
  },
  bookBtnText: { ...typography.button, color: '#ffffff' },

  trendingRow: { gap: 12, paddingRight: 16, marginBottom: 8 },
  trendingCard: { alignItems: 'center', padding: 10 },
  trendingIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  trendingText: { ...typography.bodyXSmall, fontWeight: '600', color: colors.textSecondary },

  ctaCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.xxl,
    padding: 20, marginTop: 8,
  },
  ctaText: { flex: 1, marginHorizontal: 14 },
  ctaTitle: { ...typography.h4, color: '#ffffff', marginBottom: 3 },
  ctaDesc: { ...typography.bodySmall, color: 'rgba(255,255,255,0.75)', lineHeight: 18 },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#ffffff', paddingHorizontal: 14, paddingVertical: 10, borderRadius: borderRadius.md,
  },
  ctaBtnText: { ...typography.bodySmall, fontWeight: '700', color: '#0f172a' },
});