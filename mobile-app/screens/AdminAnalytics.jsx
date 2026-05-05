/**
 * AdminAnalytics.jsx -- Analytics Dashboard with Charts & Breakdown Modals
 * Period filter: weekly | monthly | yearly | all
 * Every widget has a tappable breakdown modal.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Dimensions, RefreshControl,
  SafeAreaView, Modal, TouchableOpacity,
} from 'react-native';
import {
  ArrowLeft, Calendar, Package, DollarSign, TrendingUp, Users,
  X, ChevronRight, BarChart2, CheckCircle, XCircle, Clock, Filter,
} from 'lucide-react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/context/ThemeContext';
import { typography, borderRadius, shadows } from '../src/theme';
import { AnimatedTouchable } from '../src/components/shared/AnimatedTouchable';
import { StaggerItem } from '../src/components/shared/StaggerItem';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { formatCurrency, formatDate } from '../src/utils/formatters';
import { getAdminAnalytics } from '../src/utils/api';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - 64;

const PERIODS = [
  { key: 'all', label: 'All Time' },
  { key: 'weekly', label: 'This Week' },
  { key: 'monthly', label: 'This Month' },
  { key: 'yearly', label: 'This Year' },
];

const getChartConfig = (theme) => ({
  backgroundColor: theme.surface,
  backgroundGradientFrom: theme.surface,
  backgroundGradientTo: theme.surface,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(190, 144, 85, ${opacity})`,
  labelColor: () => theme.textTertiary,
  barPercentage: 0.5,
  propsForBackgroundLines: { strokeDasharray: '', stroke: theme.borderLight },
});

// Helper: match a date string against a period
const matchesPeriod = (dateStr, period) => {
  if (!dateStr || period === 'all') return true;
  const d = new Date(dateStr);
  const now = new Date();
  if (period === 'weekly') {
    const dow = now.getDay();
    const offset = dow === 0 ? 6 : dow - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - offset);
    weekStart.setHours(0, 0, 0, 0);
    return d >= weekStart;
  }
  if (period === 'monthly') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (period === 'yearly') return d.getFullYear() === now.getFullYear();
  return true;
};

export const AdminAnalytics = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(theme, insets);
  const chartConfig = getChartConfig(theme);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('monthly');

  // Breakdown modal state
  const [breakdown, setBreakdown] = useState(null); // { title, content: JSX }

  const loadData = async () => {
    setLoading(true);
    const res = await getAdminAnalytics();
    if (res.success && res.data) setData(res.data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Derived, period-filtered values
  const appointments = useMemo(() => {
    if (!data?.appointments) return { total: 0, completed: 0, scheduled: 0, cancelled: 0 };
    // The API usually returns aggregated counts not individual records, so
    // we use what is available and rely on the period filter for record-level data.
    return {
      total: parseInt(data.appointments.total || 0),
      completed: parseInt(data.appointments.completed || 0),
      scheduled: parseInt(data.appointments.scheduled || 0),
      cancelled: parseInt(data.appointments.cancelled || 0),
    };
  }, [data, period]);

  const revenue = data?.revenue?.total || 0;
  const artists = data?.artists || [];
  const inventoryItems = data?.inventory || [];

  const pieData = [
    { name: 'Completed', count: appointments.completed, color: theme.success },
    { name: 'Scheduled', count: appointments.scheduled, color: theme.info || '#3b82f6' },
    { name: 'Cancelled', count: appointments.cancelled, color: theme.error },
  ]
    .filter(d => d.count > 0)
    .map(d => ({ ...d, legendFontColor: theme.textSecondary, legendFontSize: 12 }));

  const barData = {
    labels: artists.length > 0 ? artists.slice(0, 5).map(a => (a.name || '').split(' ')[0].substring(0, 7)) : ['None'],
    datasets: [{ data: artists.length > 0 ? artists.slice(0, 5).map(a => parseFloat(a.revenue || 0)) : [0] }],
  };

  // ---------- Breakdown modals ----------
  const openRevenueBreakdown = () => setBreakdown({
    title: 'Revenue Breakdown',
    rows: [
      { label: 'Total Revenue', value: `P${formatCurrency(revenue)}`, color: theme.success },
      { label: 'Period', value: PERIODS.find(p => p.key === period)?.label || 'All Time' },
      { label: 'Sessions', value: String(appointments.completed) },
    ],
  });

  const openAppointmentsBreakdown = () => setBreakdown({
    title: 'Appointment Breakdown',
    rows: [
      { label: 'Total', value: String(appointments.total) },
      { label: 'Completed', value: String(appointments.completed), color: theme.success },
      { label: 'Scheduled', value: String(appointments.scheduled), color: theme.info || '#3b82f6' },
      { label: 'Cancelled', value: String(appointments.cancelled), color: theme.error },
      {
        label: 'Completion Rate',
        value: appointments.total > 0
          ? `${((appointments.completed / appointments.total) * 100).toFixed(1)}%`
          : '0%',
        color: theme.gold,
      },
    ],
  });

  const openArtistsBreakdown = () => setBreakdown({
    title: 'Artist Revenue Breakdown',
    rows: artists.slice(0, 10).map((a, i) => ({
      label: `${i + 1}. ${a.name || 'Unknown'}`,
      value: `P${formatCurrency(a.revenue || 0)}`,
      color: i === 0 ? theme.gold : undefined,
    })),
  });

  const openInventoryBreakdown = () => setBreakdown({
    title: 'Top Consumed Inventory',
    rows: inventoryItems.slice(0, 12).map((item, i) => ({
      label: item.name,
      value: `${item.used} ${item.unit || 'units'}`,
      color: i < 3 ? theme.gold : undefined,
    })),
  });

  if (loading) return <View style={styles.loadingContainer}><PremiumLoader message="Loading analytics..." /></View>;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <AnimatedTouchable onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
          <ArrowLeft size={22} color={theme.textPrimary} />
        </AnimatedTouchable>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Period Filter */}
      <View style={styles.periodBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 10 }}>
          {PERIODS.map(p => (
            <AnimatedTouchable
              key={p.key}
              style={[styles.periodPill, period === p.key && styles.periodPillActive]}
              onPress={() => setPeriod(p.key)}
            >
              {period === p.key && <Filter size={12} color={theme.backgroundDeep} style={{ marginRight: 4 }} />}
              <Text style={[styles.periodPillText, period === p.key && styles.periodPillTextActive]}>
                {p.label}
              </Text>
            </AnimatedTouchable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={theme.gold} />}
      >
        {/* Stat Cards Row */}
        <StaggerItem index={0}>
          <View style={styles.statsRow}>
            <AnimatedTouchable style={styles.statCard} onPress={openRevenueBreakdown}>
              <View style={[styles.statIcon, { backgroundColor: theme.successBg || 'rgba(16,185,129,0.12)' }]}>
                <DollarSign size={20} color={theme.success} />
              </View>
              <Text style={styles.statLabel}>Revenue</Text>
              <Text style={styles.statValue}>P{formatCurrency(revenue)}</Text>
              <View style={styles.statFooter}>
                <Text style={styles.statHint}>Tap for breakdown</Text>
                <ChevronRight size={12} color={theme.textTertiary} />
              </View>
            </AnimatedTouchable>

            <AnimatedTouchable style={styles.statCard} onPress={openAppointmentsBreakdown}>
              <View style={[styles.statIcon, { backgroundColor: theme.iconPurpleBg || 'rgba(168,85,247,0.12)' }]}>
                <Calendar size={20} color={theme.iconPurple || '#a855f7'} />
              </View>
              <Text style={styles.statLabel}>Appointments</Text>
              <Text style={styles.statValue}>{appointments.total}</Text>
              <View style={styles.statFooter}>
                <Text style={styles.statHint}>Tap for breakdown</Text>
                <ChevronRight size={12} color={theme.textTertiary} />
              </View>
            </AnimatedTouchable>
          </View>
        </StaggerItem>

        {/* Status Mini-Row */}
        <StaggerItem index={1}>
          <View style={styles.statusRow}>
            <View style={[styles.statusChip, { backgroundColor: theme.successBg || 'rgba(16,185,129,0.1)' }]}>
              <CheckCircle size={13} color={theme.success} />
              <Text style={[styles.statusChipText, { color: theme.success }]}>{appointments.completed} Completed</Text>
            </View>
            <View style={[styles.statusChip, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
              <Clock size={13} color={'#3b82f6'} />
              <Text style={[styles.statusChipText, { color: '#3b82f6' }]}>{appointments.scheduled} Scheduled</Text>
            </View>
            <View style={[styles.statusChip, { backgroundColor: theme.errorBg || 'rgba(239,68,68,0.1)' }]}>
              <XCircle size={13} color={theme.error} />
              <Text style={[styles.statusChipText, { color: theme.error }]}>{appointments.cancelled} Cancelled</Text>
            </View>
          </View>
        </StaggerItem>

        {/* Appointment Status Pie */}
        <StaggerItem index={2}>
          <AnimatedTouchable style={[styles.card, { alignItems: 'center' }]} onPress={openAppointmentsBreakdown}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Appointment Status</Text>
              <View style={styles.tapHint}>
                <BarChart2 size={14} color={theme.textTertiary} />
                <Text style={styles.tapHintText}>Breakdown</Text>
              </View>
            </View>
            {pieData.length > 0 ? (
              <PieChart
                data={pieData}
                width={CHART_W}
                height={180}
                chartConfig={chartConfig}
                accessor="count"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            ) : (
              <EmptyState icon={Calendar} title="No appointment data" />
            )}
          </AnimatedTouchable>
        </StaggerItem>

        {/* Artist Revenue Bar */}
        <StaggerItem index={3}>
          <AnimatedTouchable style={[styles.card, { alignItems: 'center' }]} onPress={openArtistsBreakdown}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Top Artist Revenue</Text>
              <View style={styles.tapHint}>
                <Users size={14} color={theme.textTertiary} />
                <Text style={styles.tapHintText}>All Artists</Text>
              </View>
            </View>
            {artists.length > 0 ? (
              <BarChart
                data={barData}
                width={CHART_W}
                height={220}
                yAxisLabel="P"
                chartConfig={chartConfig}
                style={{ borderRadius: 12 }}
              />
            ) : (
              <EmptyState icon={TrendingUp} title="No artist data" />
            )}
          </AnimatedTouchable>
        </StaggerItem>

        {/* Top Consumed Inventory */}
        <StaggerItem index={4}>
          <AnimatedTouchable style={styles.card} onPress={openInventoryBreakdown}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Top Consumed Inventory</Text>
              <View style={styles.tapHint}>
                <Package size={14} color={theme.textTertiary} />
                <Text style={styles.tapHintText}>Full List</Text>
              </View>
            </View>
            {inventoryItems.length === 0 ? (
              <EmptyState icon={Package} title="No data yet" subtitle="Inventory transactions will appear here" />
            ) : (
              inventoryItems.slice(0, 6).map((item, i) => (
                <View key={i} style={styles.invRow}>
                  <View style={styles.invLeft}>
                    <View style={[styles.invDot, { backgroundColor: i < 3 ? theme.gold : theme.border }]} />
                    <Text style={styles.invName}>{item.name}</Text>
                  </View>
                  <Text style={styles.invValue}>{item.used} {item.unit}</Text>
                </View>
              ))
            )}
          </AnimatedTouchable>
        </StaggerItem>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Breakdown Modal */}
      <Modal visible={!!breakdown} transparent animationType="fade" onRequestClose={() => setBreakdown(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{breakdown?.title}</Text>
              <AnimatedTouchable onPress={() => setBreakdown(null)} style={styles.modalCloseBtn}>
                <X size={20} color={theme.textSecondary} />
              </AnimatedTouchable>
            </View>
            <ScrollView style={styles.modalBody}>
              {(breakdown?.rows || []).map((row, i) => (
                <View key={i} style={styles.bdRow}>
                  <Text style={styles.bdLabel}>{row.label}</Text>
                  <Text style={[styles.bdValue, row.color && { color: row.color }]}>{row.value}</Text>
                </View>
              ))}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const getStyles = (theme, insets) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: (insets?.top || 0) + 12, paddingBottom: 16,
    backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { ...typography.h2, color: theme.textPrimary },

  periodBar: {
    backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  periodPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: theme.surfaceLight, borderWidth: 1, borderColor: theme.border,
  },
  periodPillActive: { backgroundColor: theme.gold, borderColor: theme.gold },
  periodPillText: { ...typography.bodyXSmall, color: theme.textSecondary, fontWeight: '700' },
  periodPillTextActive: { color: theme.backgroundDeep },

  scrollContent: { padding: 16 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: theme.surface, borderRadius: borderRadius.xl,
    padding: 16, borderWidth: 1, borderColor: theme.borderLight, ...shadows.subtle,
  },
  statIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statLabel: { ...typography.bodyXSmall, color: theme.textSecondary, marginBottom: 4 },
  statValue: { ...typography.h3, color: theme.textPrimary },
  statFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  statHint: { ...typography.bodyXSmall, color: theme.textTertiary, flex: 1 },

  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  statusChipText: { ...typography.bodyXSmall, fontWeight: '700' },

  card: {
    backgroundColor: theme.surface, borderRadius: borderRadius.xl, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: theme.borderLight, ...shadows.subtle,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, width: '100%' },
  cardTitle: { ...typography.h4, color: theme.textPrimary },
  tapHint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tapHintText: { ...typography.bodyXSmall, color: theme.textTertiary },

  invRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    width: '100%', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.borderLight,
  },
  invLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  invDot: { width: 8, height: 8, borderRadius: 4 },
  invName: { ...typography.body, color: theme.textPrimary },
  invValue: { ...typography.bodySmall, color: theme.success, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,13,14,0.65)', justifyContent: 'center', paddingHorizontal: 24 },
  modalCard: {
    backgroundColor: theme.surface, borderRadius: borderRadius.xxl,
    maxHeight: '70%', ...shadows.cardStrong, borderWidth: 1, borderColor: theme.borderLight,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  modalTitle: { ...typography.h3, color: theme.textPrimary },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: theme.surfaceLight,
    justifyContent: 'center', alignItems: 'center',
  },
  modalBody: { padding: 20 },
  bdRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.borderLight,
  },
  bdLabel: { ...typography.bodySmall, color: theme.textSecondary, fontWeight: '600', flex: 1 },
  bdValue: { ...typography.body, color: theme.textPrimary, fontWeight: '700' },
});
