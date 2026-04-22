/**
 * AdminSystemHealth.jsx -- Server & Security Status
 * Themed with lucide icons and theme tokens.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Server, ShieldCheck, ChevronLeft } from 'lucide-react-native';
import { colors, typography, borderRadius, shadows } from '../src/theme';

export const AdminSystemHealth = ({ navigation }) => (
  <View style={styles.container}>
    <View style={styles.header}>
      <Text style={styles.headerTitle}>System Health</Text>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Server size={22} color={colors.success} />
          <Text style={styles.cardTitle}>Server Status</Text>
        </View>
        <Text style={styles.cardValue}>Operational</Text>
        <Text style={styles.cardDetail}>Uptime: 99.9%</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <ShieldCheck size={22} color={colors.info} />
          <Text style={styles.cardTitle}>Security</Text>
        </View>
        <Text style={styles.cardValue}>Secure</Text>
        <Text style={styles.cardDetail}>Last scan: 10 mins ago</Text>
      </View>

      <View style={styles.logSection}>
        <Text style={styles.sectionTitle}>System Logs</Text>
        {[
          { time: '10:42 AM', msg: 'Database backup completed' },
          { time: '10:30 AM', msg: 'New user registration (ID: 45)' },
          { time: '09:15 AM', msg: 'System update check' },
        ].map((log, i) => (
          <View key={i} style={styles.logItem}>
            <Text style={styles.logTime}>{log.time}</Text>
            <Text style={styles.logMsg}>{log.msg}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, paddingTop: 52, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  content: { padding: 16 },
  card: { backgroundColor: '#ffffff', padding: 18, borderRadius: borderRadius.xl, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  cardTitle: { ...typography.body, color: colors.textSecondary },
  cardValue: { ...typography.h2, color: colors.textPrimary },
  cardDetail: { ...typography.bodySmall, color: colors.success, marginTop: 4 },
  logSection: { marginTop: 16 },
  sectionTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: 14 },
  logItem: { flexDirection: 'row', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight, paddingBottom: 10 },
  logTime: { ...typography.bodyXSmall, color: colors.textTertiary, width: 80 },
  logMsg: { ...typography.bodySmall, color: colors.textPrimary, flex: 1 },
});
