/**
 * AdminFeatures.jsx -- Placeholder Admin Pages
 * Themed with lucide icons. These are scaffold screens for future features.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, List, Clock, Package, CheckSquare, Bell, BarChart3, Settings } from 'lucide-react-native';
import { colors, typography, borderRadius } from '../src/theme';

const ICON_MAP = {
  Services: List, 'Staff Scheduling': Clock, Inventory: Package,
  Tasks: CheckSquare, Notifications: Bell, Analytics: BarChart3, Settings: Settings,
};

const AdminPageLayout = ({ title, children, onBack }) => (
  <View style={styles.container}>
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <ArrowLeft size={20} color={colors.textPrimary} />
      </TouchableOpacity>
      <View style={styles.headerTitleWrap}>
        {ICON_MAP[title] && React.createElement(ICON_MAP[title], { size: 20, color: colors.primary })}
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
    </View>
    <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
  </View>
);

export const AdminServices = ({ navigation }) => (
  <AdminPageLayout title="Services" onBack={() => navigation.goBack()}>
    <Text style={styles.placeholder}>Manage tattoo styles, piercing services, and pricing.</Text>
  </AdminPageLayout>
);

export const AdminStaffScheduling = ({ navigation }) => (
  <AdminPageLayout title="Staff Scheduling" onBack={() => navigation.goBack()}>
    <Text style={styles.placeholder}>Manage artist shifts, time off, and availability.</Text>
  </AdminPageLayout>
);

export const AdminInventory = ({ navigation }) => (
  <AdminPageLayout title="Inventory" onBack={() => navigation.goBack()}>
    <Text style={styles.placeholder}>Track needles, ink, gloves, and other supplies.</Text>
  </AdminPageLayout>
);

export const AdminTasks = ({ navigation }) => (
  <AdminPageLayout title="Tasks" onBack={() => navigation.goBack()}>
    <Text style={styles.placeholder}>Assign and track studio tasks (cleaning, ordering, etc.).</Text>
  </AdminPageLayout>
);

export const AdminNotifications = ({ navigation }) => (
  <AdminPageLayout title="Notifications" onBack={() => navigation.goBack()}>
    <Text style={styles.placeholder}>View system alerts and send announcements.</Text>
  </AdminPageLayout>
);

export const AdminAnalytics = ({ navigation }) => (
  <AdminPageLayout title="Analytics" onBack={() => navigation.goBack()}>
    <Text style={styles.placeholder}>View revenue, appointment trends, and artist performance.</Text>
  </AdminPageLayout>
);

export const AdminSettings = ({ navigation }) => (
  <AdminPageLayout title="Settings" onBack={() => navigation.goBack()}>
    <Text style={styles.placeholder}>Configure app settings, studio details, and permissions.</Text>
  </AdminPageLayout>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 52, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.lightBgSecondary, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  headerTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { ...typography.h3, color: colors.textPrimary },
  content: { padding: 20 },
  placeholder: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: 50 },
});
