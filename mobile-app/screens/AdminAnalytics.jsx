/**
 * AdminAnalytics.jsx -- Analytics Dashboard with Charts
 * Uses react-native-chart-kit for pie/bar charts.
 * Themed upgrade matching web's AdminAnalytics.js
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Dimensions, RefreshControl, SafeAreaView,
} from 'react-native';
import { ArrowLeft, Calendar, Package, DollarSign } from 'lucide-react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/context/ThemeContext';
import { typography, borderRadius, shadows } from '../src/theme';
import { AnimatedTouchable } from '../src/components/shared/AnimatedTouchable';
import { StaggerItem } from '../src/components/shared/StaggerItem';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { formatCurrency } from '../src/utils/formatters';
import { getAdminAnalytics } from '../src/utils/api';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - 64;

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

export const AdminAnalytics = ({ navigation }) => {
  const { theme, hapticsEnabled } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(theme, insets);
  const chartConfig = getChartConfig(theme);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const res = await getAdminAnalytics();
    if (res.success && res.data) setData(res.data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  if (loading) return <View style={styles.loadingContainer}><PremiumLoader message="Loading analytics..." /></View>;

  const revenue = data?.revenue?.total || 0;
  const apptTotal = data?.appointments?.total || 0;
  const apptCompleted = parseInt(data?.appointments?.completed || 0);
  const apptScheduled = parseInt(data?.appointments?.scheduled || 0);
  const apptCancelled = parseInt(data?.appointments?.cancelled || 0);

  const pieData = [
    { name: 'Completed', count: apptCompleted, color: theme.success, legendFontColor: theme.textSecondary, legendFontSize: 12 },
    { name: 'Scheduled', count: apptScheduled, color: theme.info, legendFontColor: theme.textSecondary, legendFontSize: 12 },
    { name: 'Cancelled', count: apptCancelled, color: theme.error, legendFontColor: theme.textSecondary, legendFontSize: 12 },
  ].filter(d => d.count > 0);

  const artists = data?.artists || [];
  const barData = {
    labels: artists.length > 0 ? artists.slice(0, 5).map(a => (a.name || '').split(' ')[0]) : ['None'],
    datasets: [{ data: artists.length > 0 ? artists.slice(0, 5).map(a => a.revenue || 0) : [0] }],
  };

  const inventoryItems = data?.inventory || [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <AnimatedTouchable onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
          <ArrowLeft size={22} color={theme.textPrimary} />
        </AnimatedTouchable>
        <Text style={styles.headerTitle}>Analytics</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={theme.gold} />}>
        {/* Stat Cards */}
        <StaggerItem index={0}>
          <View style={styles.statsRow}>
            <StatCard icon={DollarSign} label="Revenue" value={`P${formatCurrency(revenue)}`} color={theme.success} bg={theme.successBg || 'rgba(16,185,129,0.1)'} styles={styles} />
            <StatCard icon={Calendar} label="Appointments" value={String(apptTotal)} color={theme.iconPurple} bg={theme.iconPurpleBg || 'rgba(168,85,247,0.1)'} styles={styles} />
          </View>
        </StaggerItem>

        {/* Appointment Status Pie */}
        <StaggerItem index={1}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Appointment Status</Text>
            {pieData.length > 0 ? (
              <PieChart data={pieData} width={CHART_W} height={180} chartConfig={chartConfig} accessor="count" backgroundColor="transparent" paddingLeft="15" absolute />
            ) : (
              <EmptyState icon={Calendar} title="No appointment data" />
            )}
          </View>
        </StaggerItem>

        {/* Artist Revenue Bar */}
        <StaggerItem index={2}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Top Artist Revenue</Text>
            <BarChart data={barData} width={CHART_W} height={220} yAxisLabel="P" chartConfig={chartConfig} style={{ borderRadius: 12 }} />
          </View>
        </StaggerItem>

        {/* Top Consumed Inventory */}
        <StaggerItem index={3}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Top Consumed Inventory</Text>
            {inventoryItems.length === 0 ? (
              <EmptyState icon={Package} title="No data yet" subtitle="Inventory transactions will appear here" />
            ) : (
              inventoryItems.slice(0, 8).map((item, i) => (
                <View key={i} style={styles.invRow}>
                  <View style={styles.invLeft}>
                    <View style={styles.invDot} />
                    <Text style={styles.invName}>{item.name}</Text>
                  </View>
                  <Text style={styles.invValue}>{item.used} {item.unit}</Text>
                </View>
              ))
            )}
          </View>
        </StaggerItem>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const StatCard = ({ icon: Icon, label, value, color, bg, styles }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: bg }]}>
      <Icon size={20} color={color} />
    </View>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const getStyles = (theme, insets) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: (insets?.top || 0) + 12, paddingBottom: 16,
    backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { ...typography.h2, color: theme.textPrimary },
  scrollContent: { padding: 16 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: theme.surface, borderRadius: borderRadius.xl,
    padding: 16, borderWidth: 1, borderColor: theme.borderLight, ...shadows.subtle,
  },
  statIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statLabel: { ...typography.bodyXSmall, color: theme.textSecondary, marginBottom: 4 },
  statValue: { ...typography.h3, color: theme.textPrimary },
  card: {
    backgroundColor: theme.surface, borderRadius: borderRadius.xl, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: theme.borderLight,
    ...shadows.subtle, alignItems: 'center',
  },
  cardTitle: { ...typography.h4, color: theme.textPrimary, alignSelf: 'flex-start', marginBottom: 16 },
  invRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    width: '100%', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.borderLight,
  },
  invLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  invDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.gold },
  invName: { ...typography.body, color: theme.textPrimary },
  invValue: { ...typography.bodySmall, color: theme.success, fontWeight: '700' },
});
