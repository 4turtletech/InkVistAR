/**
 * ArtistEarnings.jsx -- Earnings Ledger with Time Filters
 * Themed upgrade with lucide icons, commission calculations from live data.
 */

import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Download, Clock, DollarSign, CheckCircle, TrendingUp,
} from 'lucide-react-native';
import { colors, typography, borderRadius, shadows } from '../src/theme';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { StatusBadge } from '../src/components/shared/StatusBadge';
import { formatCurrency, getInitials } from '../src/utils/formatters';
import { getArtistAppointments } from '../src/utils/api';

export function ArtistEarnings({ onBack, artistId }) {
  const [timeFilter, setTimeFilter] = useState('month');
  const [loading, setLoading] = useState(true);
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
    } catch (e) {
      console.error('Earnings error:', e);
    } finally {
      setLoading(false);
    }
  };

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
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#0f172a', '#064e3b']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
              <ArrowLeft size={20} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Earnings</Text>
            <TouchableOpacity style={styles.headerBtn} onPress={() => Alert.alert('Report', 'Earnings report sent to your email.')}>
              <Download size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ height: 160, justifyContent: 'center' }}><PremiumLoader /></View>
          ) : (
            <>
              <View style={styles.earningsCenter}>
                <Text style={styles.earningsAmount}>P{formatCurrency(stats.totalEarnings)}</Text>
                <Text style={styles.earningsPeriod}>{periodLabel}</Text>
              </View>
              <View style={styles.miniStats}>
                <View style={styles.miniCard}>
                  <Clock size={16} color="#ffffff" />
                  <Text style={styles.miniValue}>P{formatCurrency(stats.pendingPayout)}</Text>
                  <Text style={styles.miniLabel}>Pending</Text>
                </View>
                <View style={styles.miniCard}>
                  <TrendingUp size={16} color="#ffffff" />
                  <Text style={styles.miniValue}>P{formatCurrency(stats.totalPotential)}</Text>
                  <Text style={styles.miniLabel}>Total Value</Text>
                </View>
              </View>
            </>
          )}
        </LinearGradient>

        <View style={styles.content}>
          {/* Filter Pills */}
          <View style={styles.filters}>
            {['week', 'month', 'year'].map(f => (
              <TouchableOpacity key={f} style={[styles.filterBtn, timeFilter === f && styles.filterBtnActive]} onPress={() => setTimeFilter(f)}>
                <Text style={[styles.filterText, timeFilter === f && styles.filterTextActive]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Transactions */}
          <Text style={styles.sectionTitle}>Completed Sessions</Text>
          {transactions.length > 0 ? (
            transactions.map(tx => (
              <View key={tx.id} style={styles.txCard}>
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
            ))
          ) : (
            <EmptyState icon={DollarSign} title="No sessions" subtitle={`No completed sessions for ${periodLabel.toLowerCase()}`} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 56, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...typography.h2, color: '#ffffff' },
  earningsCenter: { alignItems: 'center', marginBottom: 20 },
  earningsAmount: { fontSize: 40, fontWeight: '800', color: '#ffffff', marginBottom: 4 },
  earningsPeriod: { ...typography.body, color: 'rgba(255,255,255,0.8)' },
  miniStats: { flexDirection: 'row', gap: 10 },
  miniCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: borderRadius.xl, padding: 12, alignItems: 'center' },
  miniValue: { ...typography.h4, color: '#ffffff', marginTop: 4, marginBottom: 2 },
  miniLabel: { ...typography.bodyXSmall, color: 'rgba(255,255,255,0.8)' },
  content: { padding: 16, paddingBottom: 40 },
  filters: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  filterBtn: {
    flex: 1, paddingVertical: 10, backgroundColor: '#ffffff',
    borderRadius: borderRadius.round, borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  filterBtnActive: { backgroundColor: colors.darkBg, borderColor: colors.darkBg },
  filterText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  filterTextActive: { color: '#ffffff' },
  sectionTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: 14 },
  txCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
    borderRadius: borderRadius.xl, padding: 14, marginBottom: 10,
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