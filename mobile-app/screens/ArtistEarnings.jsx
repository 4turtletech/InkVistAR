/**
 * ArtistEarnings.jsx -- Earnings Ledger (Gilded Noir v2)
 * Theme-aware, animated, gold accents, filter pills, haptic feedback.
 */
import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, RefreshControl, Animated, Platform,
} from 'react-native';
import {
  ArrowLeft, Download, Clock, DollarSign, CheckCircle, TrendingUp,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { typography, shadows } from '../src/theme';
import { useTheme } from '../src/context/ThemeContext';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { StatusBadge } from '../src/components/shared/StatusBadge';
import { AnimatedTouchable } from '../src/components/shared/AnimatedTouchable';
import { formatCurrency } from '../src/utils/formatters';
import { getArtistAppointments } from '../src/utils/api';

const StaggerItem = ({ index, children }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 400, delay: index * 80, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
      {children}
    </Animated.View>
  );
};

export function ArtistEarnings({ onBack, artistId }) {
  const { theme: colors, hapticsEnabled } = useTheme();
  const styles = getStyles(colors);
  const [timeFilter, setTimeFilter] = useState('month');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ totalEarnings: 0, sessionsCount: 0, average: 0, pendingPayout: 0, totalPotential: 0 });
  const [transactions, setTransactions] = useState([]);
  const [allData, setAllData] = useState([]);

  useEffect(() => { fetchEarnings(); }, [artistId]);
  useEffect(() => { if (allData.length > 0) calculateStats(allData, timeFilter); }, [timeFilter, allData]);

  const fetchEarnings = async () => {
    if (!artistId) return;
    try {
      setLoading(true);
      const result = await getArtistAppointments(artistId, 'completed');
      if (result.success) {
        const rate = result.appointments?.[0]?.commission_rate || 0.6;
        const data = (result.appointments || []).map(a => ({
          ...a,
          artistShare: (a.price || 0) * rate,
          displayDate: new Date(a.appointment_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        }));
        setAllData(data);
        calculateStats(data, timeFilter);
      }
    } catch (e) { console.error('Earnings error:', e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = () => { setRefreshing(true); fetchEarnings(); };

  const calculateStats = (data, filter) => {
    const now = new Date();
    let filtered = [];
    if (filter === 'week') {
      const ago = new Date(); ago.setDate(now.getDate() - 7);
      filtered = data.filter(a => new Date(a.appointment_date) >= ago);
    } else if (filter === 'month') {
      filtered = data.filter(a => { const d = new Date(a.appointment_date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    } else {
      filtered = data.filter(a => new Date(a.appointment_date).getFullYear() === now.getFullYear());
    }
    const paid = filtered.filter(a => a.payment_status === 'paid');
    const unpaid = filtered.filter(a => a.payment_status !== 'paid');
    const total = paid.reduce((s, a) => s + a.artistShare, 0);
    const pending = unpaid.reduce((s, a) => s + a.artistShare, 0);
    setStats({
      totalEarnings: total,
      sessionsCount: filtered.length,
      average: paid.length > 0 ? total / paid.length : 0,
      pendingPayout: pending,
      totalPotential: total + pending,
    });
    setTransactions(filtered.slice(0, 8));
  };

  const periodLabel = timeFilter === 'week' ? 'Past 7 Days' : timeFilter === 'month' ? 'This Month' : 'This Year';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
        {/* Header */}
        <View style={styles.header}>
          <AnimatedTouchable onPress={onBack} style={styles.headerBtn}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </AnimatedTouchable>
          <Text style={styles.headerTitle}>Earnings</Text>
          <View style={styles.headerBtn}>
            <Download size={20} color={colors.textTertiary} />
          </View>
        </View>

        {/* Earnings Hero */}
        <StaggerItem index={0}>
          <View style={styles.heroCard}>
            <View style={styles.heroGoldStripe} />
            {loading ? (
              <View style={{ height: 160, justifyContent: 'center' }}><PremiumLoader /></View>
            ) : (
              <View style={styles.heroContent}>
                <Text style={styles.heroLabel}>{periodLabel}</Text>
                <Text style={styles.heroAmount}>P{formatCurrency(stats.totalEarnings)}</Text>
                <View style={styles.heroRow}>
                  <View style={styles.heroMini}>
                    <Clock size={14} color={colors.warning} />
                    <Text style={styles.heroMiniValue}>P{formatCurrency(stats.pendingPayout)}</Text>
                    <Text style={styles.heroMiniLabel}>Pending</Text>
                  </View>
                  <View style={styles.heroMiniDivider} />
                  <View style={styles.heroMini}>
                    <TrendingUp size={14} color={colors.success} />
                    <Text style={styles.heroMiniValue}>P{formatCurrency(stats.totalPotential)}</Text>
                    <Text style={styles.heroMiniLabel}>Total Value</Text>
                  </View>
                  <View style={styles.heroMiniDivider} />
                  <View style={styles.heroMini}>
                    <DollarSign size={14} color={colors.info} />
                    <Text style={styles.heroMiniValue}>{stats.sessionsCount}</Text>
                    <Text style={styles.heroMiniLabel}>Sessions</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </StaggerItem>

        <View style={styles.content}>
          {/* Filter Pills */}
          <StaggerItem index={1}>
            <View style={styles.filters}>
              {['week', 'month', 'year'].map(f => (
                <AnimatedTouchable
                  key={f}
                  style={[styles.filterBtn, timeFilter === f && styles.filterBtnActive]}
                  onPress={() => { if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTimeFilter(f); }}
                >
                  <Text style={[styles.filterText, timeFilter === f && styles.filterTextActive]}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </AnimatedTouchable>
              ))}
            </View>
          </StaggerItem>

          {/* Transactions */}
          <StaggerItem index={2}>
            <Text style={styles.sectionTitle}>Completed Sessions</Text>
          </StaggerItem>
          {transactions.length > 0 ? (
            transactions.map((tx, i) => (
              <StaggerItem key={tx.id} index={i + 3}>
                <View style={styles.txCard}>
                  <View style={[styles.txIcon, { backgroundColor: colors.successBg }]}>
                    <CheckCircle size={20} color={colors.success} />
                  </View>
                  <View style={styles.txDetails}>
                    <Text style={styles.txClient}>{tx.client_name || 'Client'}</Text>
                    <Text style={styles.txDesign} numberOfLines={1}>{tx.design_title || 'Tattoo Session'}</Text>
                    <Text style={styles.txDate}>{tx.displayDate}</Text>
                  </View>
                  <View style={styles.txAmountWrap}>
                    <Text style={[styles.txAmount, tx.payment_status !== 'paid' && { color: colors.warning }]}>
                      P{formatCurrency(tx.artistShare)}
                    </Text>
                    <StatusBadge status={tx.payment_status === 'paid' ? 'paid' : 'unpaid'} />
                  </View>
                </View>
              </StaggerItem>
            ))
          ) : (
            <EmptyState icon={DollarSign} title="No sessions" subtitle={`No completed sessions for ${periodLabel.toLowerCase()}`} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  // Hero
  heroCard: {
    marginHorizontal: 20, borderRadius: 16, overflow: 'hidden',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: 20,
  },
  heroGoldStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: colors.gold },
  heroContent: { padding: 20 },
  heroLabel: { ...typography.bodyXSmall, color: colors.textTertiary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  heroAmount: { fontSize: 36, fontWeight: '800', color: colors.gold, marginTop: 4, marginBottom: 16, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  heroRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  heroMini: { alignItems: 'center', gap: 4 },
  heroMiniValue: { ...typography.body, color: colors.textPrimary, fontWeight: '700' },
  heroMiniLabel: { ...typography.bodyXSmall, color: colors.textTertiary },
  heroMiniDivider: { width: 1, height: 30, backgroundColor: colors.border },
  // Content
  content: { padding: 16, paddingBottom: 40 },
  filters: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  filterBtn: {
    flex: 1, paddingVertical: 10, backgroundColor: colors.surface,
    borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  filterBtnActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  filterText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  filterTextActive: { color: colors.backgroundDeep },
  sectionTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: 14 },
  txCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  txIcon: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txDetails: { flex: 1 },
  txClient: { ...typography.body, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  txDesign: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: 2 },
  txDate: { ...typography.bodyXSmall, color: colors.textTertiary },
  txAmountWrap: { alignItems: 'flex-end', gap: 4 },
  txAmount: { ...typography.h4, color: colors.success, fontWeight: '700' },
});