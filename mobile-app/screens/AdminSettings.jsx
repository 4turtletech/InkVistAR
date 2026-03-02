import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const AdminSettings = ({ navigation }) => {
  const renderSettingItem = (icon, title, type = 'arrow') => (
    <TouchableOpacity style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={24} color="#9ca3af" style={styles.settingIcon} />
        <Text style={styles.settingText}>{title}</Text>
      </View>
      {type === 'arrow' ? (
        <Ionicons name="chevron-forward" size={20} color="#6b7280" />
      ) : (
        <Switch trackColor={{ false: "#374151", true: "#f59e0b" }} thumbColor="white" value={type === 'switch-on'} />
      )}
    </TouchableOpacity>
  );

  return (
  <View style={styles.container}>
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Ionicons name="settings" size={24} color="#f59e0b" style={{ marginRight: 10 }} />
        <Text style={styles.headerTitle}>Settings</Text>
      </View>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.sectionHeader}>General</Text>
      {renderSettingItem('business', 'Studio Profile')}
      {renderSettingItem('time', 'Operating Hours')}
      
      <Text style={styles.sectionHeader}>App Configuration</Text>
      {renderSettingItem('notifications', 'Push Notifications', 'switch-on')}
      {renderSettingItem('lock-closed', 'Allow New Registrations', 'switch-on')}
      {renderSettingItem('construct', 'Maintenance Mode', 'switch-off')}

      <Text style={styles.sectionHeader}>Account</Text>
      {renderSettingItem('people', 'Admin Roles')}
      {renderSettingItem('log-out', 'Log Out')}
    </ScrollView>
  </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#1f2937', borderBottomWidth: 1, borderBottomColor: '#374151' },
  backButton: { padding: 8, marginRight: 8 },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  content: { padding: 20 },
  sectionHeader: { color: '#f59e0b', fontSize: 14, fontWeight: 'bold', marginTop: 16, marginBottom: 8, textTransform: 'uppercase' },
  settingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1f2937', padding: 16, borderRadius: 12, marginBottom: 8 },
  settingLeft: { flexDirection: 'row', alignItems: 'center' },
  settingIcon: { marginRight: 16 },
  settingText: { color: 'white', fontSize: 16 },
});
