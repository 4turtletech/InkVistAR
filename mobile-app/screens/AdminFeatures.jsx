import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Reusable Layout Component
const AdminPageLayout = ({ title, icon, children, onBack }) => (
  <View style={styles.container}>
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Ionicons name={icon} size={24} color="#f59e0b" style={{ marginRight: 10 }} />
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      {children}
    </ScrollView>
  </View>
);

export const AdminServices = ({ navigation }) => (
  <AdminPageLayout title="Services" icon="list" onBack={() => navigation.goBack()}>
    <Text style={styles.placeholder}>Manage tattoo styles, piercing services, and pricing.</Text>
    {/* Add Service List & CRUD here */}
  </AdminPageLayout>
);

export const AdminStaffScheduling = ({ navigation }) => (
  <AdminPageLayout title="Staff Scheduling" icon="time" onBack={() => navigation.goBack()}>
    <Text style={styles.placeholder}>Manage artist shifts, time off, and availability.</Text>
    {/* Add Calendar/Shift view here */}
  </AdminPageLayout>
);

export const AdminInventory = ({ navigation }) => (
  <AdminPageLayout title="Inventory" icon="cube" onBack={() => navigation.goBack()}>
    <Text style={styles.placeholder}>Track needles, ink, gloves, and other supplies.</Text>
    {/* Add Inventory List & Stock Levels here */}
  </AdminPageLayout>
);

export const AdminTasks = ({ navigation }) => (
  <AdminPageLayout title="Tasks" icon="checkbox" onBack={() => navigation.goBack()}>
    <Text style={styles.placeholder}>Assign and track studio tasks (cleaning, ordering, etc.).</Text>
    {/* Add Task List here */}
  </AdminPageLayout>
);

export const AdminNotifications = ({ navigation }) => (
  <AdminPageLayout title="Notifications" icon="notifications" onBack={() => navigation.goBack()}>
    <Text style={styles.placeholder}>View system alerts and send announcements.</Text>
    {/* Add Notification Center here */}
  </AdminPageLayout>
);

export const AdminAnalytics = ({ navigation }) => (
  <AdminPageLayout title="Analytics" icon="bar-chart" onBack={() => navigation.goBack()}>
    <Text style={styles.placeholder}>View revenue, appointment trends, and artist performance.</Text>
    {/* Add Charts/Graphs here */}
  </AdminPageLayout>
);

export const AdminSettings = ({ navigation }) => (
  <AdminPageLayout title="Settings" icon="settings" onBack={() => navigation.goBack()}>
    <Text style={styles.placeholder}>Configure app settings, studio details, and permissions.</Text>
    {/* Add Settings Form here */}
  </AdminPageLayout>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    padding: 20,
  },
  placeholder: {
    color: '#9ca3af',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
});