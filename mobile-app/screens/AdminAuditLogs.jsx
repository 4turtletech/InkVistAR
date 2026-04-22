/**
 * AdminAuditLogs.jsx -- Security Audit Trail
 * Themed with lucide icons, action color coding, and meta info.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { User, Globe, LogOut, Shield } from 'lucide-react-native';
import { colors, typography, borderRadius, shadows } from '../src/theme';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { getAuditLogs } from '../src/utils/api';

export function AdminAuditLogs({ onLogout }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadLogs(); }, []);

  const loadLogs = async () => {
    setLoading(true);
    const r = await getAuditLogs();
    if (r.success) setLogs(r.logs || []);
    setLoading(false);
  };

  const getActionColor = (action) => {
    if (action?.includes('LOGIN')) return colors.success;
    if (action?.includes('DELETE')) return colors.error;
    if (action?.includes('UPDATE')) return colors.warning;
    if (action?.includes('FAILED') || action?.includes('BLOCKED')) return '#dc2626';
    return colors.info;
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={[styles.indicator, { backgroundColor: getActionColor(item.action) }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.actionText}>{item.action}</Text>
          <Text style={styles.dateText}>{new Date(item.created_at).toLocaleString()}</Text>
        </View>
        <Text style={styles.detailsText}>{item.details}</Text>
        <View style={styles.metaRow}>
          <User size={11} color={colors.textTertiary} />
          <Text style={styles.metaText}>{item.user_name ? `${item.user_name} (${item.user_email})` : 'System / Guest'}</Text>
          <View style={styles.dot} />
          <Globe size={11} color={colors.textTertiary} />
          <Text style={styles.metaText}>{item.ip_address || 'Unknown IP'}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Security Audit Logs</Text>
        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
          <LogOut size={20} color={colors.error} />
        </TouchableOpacity>
      </View>
      {loading ? <PremiumLoader message="Loading logs..." /> : (
        <FlatList
          data={logs}
          renderItem={renderItem}
          keyExtractor={item => (item.id || Math.random()).toString()}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={loadLogs}
          ListEmptyComponent={<EmptyState icon={Shield} title="No logs" subtitle="Audit trail is empty" />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 52, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  logoutBtn: { padding: 8 },
  list: { padding: 16 },
  card: { flexDirection: 'row', backgroundColor: '#ffffff', borderRadius: borderRadius.lg, marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  indicator: { width: 5 },
  cardContent: { flex: 1, padding: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  actionText: { ...typography.bodySmall, fontWeight: '700', color: colors.textPrimary },
  dateText: { ...typography.bodyXSmall, color: colors.textTertiary },
  detailsText: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaText: { ...typography.bodyXSmall, color: colors.textTertiary, marginLeft: 3, marginRight: 8 },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textTertiary, marginRight: 8 },
});
