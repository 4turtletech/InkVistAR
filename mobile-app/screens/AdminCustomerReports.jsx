import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, RefreshControl, Alert } from 'react-native';
import { ArrowLeft, MessageSquare, Bug, Sparkles, Clock, CheckCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/context/ThemeContext';
import { typography, borderRadius, shadows } from '../src/theme';
import { AnimatedTouchable } from '../src/components/shared/AnimatedTouchable';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { fetchAPI } from '../src/utils/api';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'investigating', label: 'Investigating' },
  { key: 'resolved', label: 'Resolved' },
];

export const AdminCustomerReports = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(theme, insets);
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const loadReports = async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const result = await fetchAPI('/admin/reports');
      if (result.success) setReports(result.reports || []);
      else Alert.alert('Error', result.message || 'Unable to load customer feedback.');
    } catch (error) {
      Alert.alert('Error', 'Unable to load customer feedback.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadReports(); }, []);

  const visibleReports = useMemo(
    () => filter === 'all' ? reports : reports.filter(report => report.status === filter),
    [reports, filter]
  );

  const updateStatus = async (report, status) => {
    setUpdatingId(report.id);
    try {
      const result = await fetchAPI(`/admin/reports/${report.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      if (result.success) {
        setReports(current => current.map(item => item.id === report.id ? { ...item, status, is_read_by_admin: 1 } : item));
      } else {
        Alert.alert('Update Failed', result.message || 'Unable to update this report.');
      }
    } catch (error) {
      Alert.alert('Update Failed', 'Unable to update this report.');
    } finally {
      setUpdatingId(null);
    }
  };

  const renderReport = ({ item }) => {
    const isFeedback = item.report_type === 'general';
    const TypeIcon = isFeedback ? Sparkles : Bug;
    const statusColor = item.status === 'resolved' ? theme.success : item.status === 'investigating' ? theme.warning : (theme.info || '#3b82f6');
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.typeIcon, { backgroundColor: `${isFeedback ? theme.gold : theme.error}18` }]}>
            <TypeIcon size={18} color={isFeedback ? theme.gold : theme.error} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.meta}>{item.report_code} - {item.customer_name || 'Customer'}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: `${statusColor}18` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{(item.status || 'open').toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.description}>{item.description}</Text>
        <Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text>
        <View style={styles.actions}>
          {item.status === 'open' && (
            <AnimatedTouchable style={[styles.actionBtn, { backgroundColor: theme.warning }]} disabled={updatingId === item.id} onPress={() => updateStatus(item, 'investigating')}>
              <Clock size={14} color={theme.backgroundDeep} />
              <Text style={styles.actionText}>Investigate</Text>
            </AnimatedTouchable>
          )}
          {!['resolved', 'closed'].includes(item.status) && (
            <AnimatedTouchable style={[styles.actionBtn, { backgroundColor: theme.success }]} disabled={updatingId === item.id} onPress={() => updateStatus(item, 'resolved')}>
              <CheckCircle size={14} color={theme.backgroundDeep} />
              <Text style={styles.actionText}>Resolve</Text>
            </AnimatedTouchable>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <AnimatedTouchable onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
          <ArrowLeft size={22} color={theme.textPrimary} />
        </AnimatedTouchable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Customer Feedback</Text>
          <Text style={styles.headerSub}>Reports and studio feedback from customers</Text>
        </View>
      </View>
      <View style={styles.filters}>
        {FILTERS.map(item => (
          <AnimatedTouchable key={item.key} style={[styles.filter, filter === item.key && styles.filterActive]} onPress={() => setFilter(item.key)}>
            <Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>{item.label}</Text>
          </AnimatedTouchable>
        ))}
      </View>
      {loading ? <PremiumLoader message="Loading customer feedback..." /> : (
        <FlatList
          data={visibleReports}
          renderItem={renderReport}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadReports(true)} tintColor={theme.gold} />}
          ListEmptyComponent={<EmptyState icon={MessageSquare} title="No customer feedback" subtitle="Customer reports and feedback will appear here." />}
        />
      )}
    </SafeAreaView>
  );
};

const getStyles = (theme, insets) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: (insets?.top || 0) + 12, paddingBottom: 16, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border },
  backBtn: { padding: 5 },
  headerTitle: { ...typography.h2, color: theme.textPrimary },
  headerSub: { ...typography.bodyXSmall, color: theme.textTertiary, marginTop: 2 },
  filters: { flexDirection: 'row', gap: 7, padding: 12, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border },
  filter: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: borderRadius.md, backgroundColor: theme.surfaceLight },
  filterActive: { backgroundColor: theme.gold },
  filterText: { ...typography.bodyXSmall, color: theme.textSecondary, fontWeight: '700' },
  filterTextActive: { color: theme.backgroundDeep },
  list: { padding: 16, paddingBottom: 40 },
  card: { padding: 16, marginBottom: 12, borderRadius: borderRadius.xl, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, ...shadows.subtle },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  typeIcon: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { ...typography.body, color: theme.textPrimary, fontWeight: '700' },
  meta: { ...typography.bodyXSmall, color: theme.textTertiary, marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: borderRadius.md },
  statusText: { fontSize: 9, fontWeight: '800' },
  description: { ...typography.bodySmall, color: theme.textSecondary, lineHeight: 20, marginTop: 14 },
  date: { ...typography.bodyXSmall, color: theme.textTertiary, marginTop: 10 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.borderLight },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: borderRadius.md },
  actionText: { ...typography.bodyXSmall, color: theme.backgroundDeep, fontWeight: '800' },
});
