import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const AdminSystemHealth = () => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>System Health</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons name="server" size={24} color="#10b981" />
            <Text style={styles.statusTitle}>Server Status</Text>
          </View>
          <Text style={styles.statusValue}>Operational</Text>
          <Text style={styles.statusDetail}>Uptime: 99.9%</Text>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons name="shield-checkmark" size={24} color="#3b82f6" />
            <Text style={styles.statusTitle}>Security</Text>
          </View>
          <Text style={styles.statusValue}>Secure</Text>
          <Text style={styles.statusDetail}>Last scan: 10 mins ago</Text>
        </View>

        <View style={styles.logSection}>
          <Text style={styles.sectionTitle}>System Logs</Text>
          <View style={styles.logItem}>
            <Text style={styles.logTime}>10:42 AM</Text>
            <Text style={styles.logMessage}>Database backup completed</Text>
          </View>
          <View style={styles.logItem}>
            <Text style={styles.logTime}>10:30 AM</Text>
            <Text style={styles.logMessage}>New user registration (ID: 45)</Text>
          </View>
          <View style={styles.logItem}>
            <Text style={styles.logTime}>09:15 AM</Text>
            <Text style={styles.logMessage}>System update check</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 20, paddingTop: 50, backgroundColor: '#ffffff' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  content: { padding: 20 },
  statusCard: { backgroundColor: '#ffffff', padding: 20, borderRadius: 12, marginBottom: 15 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  statusTitle: { color: '#6b7280', marginLeft: 10, fontSize: 16 },
  statusValue: { color: '#111827', fontSize: 24, fontWeight: 'bold' },
  statusDetail: { color: '#10b981', marginTop: 5 },
  logSection: { marginTop: 20 },
  sectionTitle: { color: '#111827', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  logItem: { flexDirection: 'row', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 10 },
  logTime: { color: '#6b7280', width: 80, fontSize: 12 },
  logMessage: { color: '#111827', flex: 1, fontSize: 14 }
});

