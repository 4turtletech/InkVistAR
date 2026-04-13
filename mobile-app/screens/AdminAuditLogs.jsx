// mobile-app/screens/AdminAuditLogs.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getAuditLogs } from '../src/utils/api';

export function AdminAuditLogs({ onLogout }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    const result = await getAuditLogs();
    if (result.success) {
      setLogs(result.logs || []);
    }
    setLoading(false);
  };

  const getActionColor = (action) => {
    if (action.includes('LOGIN')) return '#10b981'; // Green
    if (action.includes('DELETE')) return '#ef4444'; // Red
    if (action.includes('UPDATE')) return '#f59e0b'; // Orange
    if (action.includes('FAILED') || action.includes('BLOCKED')) return '#dc2626'; // Dark Red
    return '#3b82f6'; // Blue default
  };

  const renderItem = ({ item }) => (
    <View style={styles.logCard}>
      <View style={[styles.indicator, { backgroundColor: getActionColor(item.action) }]} />
      <View style={styles.logContent}>
        <View style={styles.logHeader}>
          <Text style={styles.actionText}>{item.action}</Text>
          <Text style={styles.dateText}>
            {new Date(item.created_at).toLocaleString()}
          </Text>
        </View>
        <Text style={styles.detailsText}>{item.details}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="person" size={12} color="#6b7280" />
          <Text style={styles.metaText}>
            {item.user_name ? `${item.user_name} (${item.user_email})` : 'System / Guest'}
          </Text>
          <View style={styles.dot} />
          <Ionicons name="globe" size={12} color="#6b7280" />
          <Text style={styles.metaText}>{item.ip_address || 'Unknown IP'}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#ffffff', '#f9fafb']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Security Audit Logs</Text>
          <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#daa520" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={logs}
            renderItem={renderItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.list}
            refreshing={loading}
            onRefresh={loadLogs}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No logs found.</Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { padding: 20, paddingTop: 50, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  content: { flex: 1 },
  list: { padding: 16 },
  logCard: {
    flexDirection: 'row',
    backgroundcolor: '#111827',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  indicator: { width: 6 },
  logContent: { flex: 1, padding: 12 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  actionText: { fontWeight: 'bold', fontSize: 14, color: '#ffffff' },
  dateText: { fontSize: 12, color: '#6b7280' },
  detailsText: { fontSize: 14, color: '#4b5563', marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 12, color: '#6b7280', marginLeft: 4, marginRight: 8 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#4b5563', marginRight: 8 },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#6b7280' },
});


