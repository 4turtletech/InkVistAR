/**
 * ArtistClients.jsx -- Today's Client Queue with Details Navigation
 * Themed with lucide icons, StatusBadge, and manage session action.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Clock, Zap, ChevronRight, User } from 'lucide-react-native';
import { colors, typography, borderRadius, shadows } from '../src/theme';
import { StatusBadge } from '../src/components/shared/StatusBadge';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { formatCurrency, getInitials } from '../src/utils/formatters';
import { getArtistAppointments } from '../src/utils/api';

export const ArtistClients = ({ artistId, onBack, navigation }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTodaySessions = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const response = await getArtistAppointments(artistId, '', today);
      if (response.success) setSessions(response.appointments || []);
    } catch (e) { console.error('Sessions error:', e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchTodaySessions(); }, [artistId]);
  const onRefresh = () => { setRefreshing(true); fetchTodaySessions(); };

  const todayStr = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.timeWrap}>
          <Clock size={14} color={colors.textTertiary} />
          <Text style={styles.timeText}>{item.start_time?.substring(0, 5) || '00:00'}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.cardBody}>
        <TouchableOpacity
          style={styles.clientSection}
          onPress={() => navigation.navigate('artist-client-details', { session: item })}
          activeOpacity={0.7}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
            <Text style={styles.avatarText}>{getInitials(item.client_name)}</Text>
          </View>
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>{item.client_name || 'Unknown Client'}</Text>
            <Text style={styles.designTitle} numberOfLines={1}>{item.design_title || 'No design specified'}</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.priceSection}>
          <Text style={styles.priceLabel}>Fee</Text>
          <Text style={styles.priceValue}>P{formatCurrency(item.price)}</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.detailsBtn}
          onPress={() => navigation.navigate('artist-client-details', { session: item })}
          activeOpacity={0.7}
        >
          <User size={14} color={colors.textSecondary} />
          <Text style={styles.detailsBtnText}>Client Details</Text>
        </TouchableOpacity>

        {(item.status === 'confirmed' || item.status === 'in_progress') && (
          <TouchableOpacity
            style={styles.manageBtn}
            onPress={() => navigation.navigate('artist-active-session', { appointment: item })}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#0f172a', colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.manageBtnGradient}>
              <Zap size={14} color="#ffffff" />
              <Text style={styles.manageBtnText}>Manage Session</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Session Manager</Text>
            <Text style={styles.dateText}>{todayStr}</Text>
          </View>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
            <Calendar size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading && !refreshing ? <PremiumLoader message="Loading today's queue..." /> : (
        <FlatList
          data={sessions}
          renderItem={renderItem}
          keyExtractor={(item) => (item.id || Math.random()).toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <EmptyState icon={Calendar} title="Your board is clear" subtitle="No sessions scheduled for today" />
              <TouchableOpacity style={styles.scheduleLink} onPress={() => navigation?.navigate?.('Schedule')}>
                <Text style={styles.scheduleLinkText}>View Full Schedule</Text>
                <ChevronRight size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 56, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { ...typography.h1, color: '#ffffff' },
  dateText: { ...typography.bodySmall, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  refreshBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16 },
  card: {
    backgroundColor: '#ffffff', borderRadius: borderRadius.xxl, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: colors.border, ...shadows.subtle,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  timeWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeText: { ...typography.body, fontWeight: '700', color: colors.textPrimary },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  clientSection: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { ...typography.body, fontWeight: '700', color: colors.primary },
  clientInfo: { flex: 1 },
  clientName: { ...typography.body, fontWeight: '700', color: colors.textPrimary },
  designTitle: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  priceSection: { alignItems: 'flex-end' },
  priceLabel: { ...typography.bodyXSmall, color: colors.textTertiary, textTransform: 'uppercase', fontWeight: '600' },
  priceValue: { ...typography.h4, color: colors.textPrimary, fontWeight: '800' },
  cardActions: { flexDirection: 'row', gap: 10 },
  detailsBtn: {
    flex: 1, height: 44, borderRadius: borderRadius.lg, backgroundColor: colors.lightBgSecondary,
    borderWidth: 1, borderColor: colors.border, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
  },
  detailsBtnText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  manageBtn: { flex: 2, height: 44, borderRadius: borderRadius.lg, overflow: 'hidden' },
  manageBtnGradient: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  manageBtnText: { ...typography.button, color: '#ffffff', fontSize: 13 },
  emptyWrap: { alignItems: 'center', marginTop: 60 },
  scheduleLink: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 20,
    paddingVertical: 12, paddingHorizontal: 20,
    backgroundColor: colors.lightBgSecondary, borderRadius: borderRadius.lg,
  },
  scheduleLinkText: { ...typography.body, color: colors.primary, fontWeight: '600' },
});
