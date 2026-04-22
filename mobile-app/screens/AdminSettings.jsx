/**
 * AdminSettings.jsx -- App Settings with toggles
 * Themed upgrade matching web's AdminSettings controls.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, SafeAreaView,
} from 'react-native';
import {
  ArrowLeft, Settings, Bell, Lock, Wrench, Building2, LogOut,
} from 'lucide-react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../src/theme';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { getAdminSettings, updateAdminSettings } from '../src/utils/api';

export const AdminSettings = ({ navigation }) => {
  const [settings, setSettings] = useState({
    studio_name: 'InkVistAR Studio',
    allow_registrations: true,
    maintenance_mode: false,
    push_notifications: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      const res = await getAdminSettings();
      if (res.success && res.data) {
        setSettings(prev => ({ ...prev, ...res.data }));
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleToggle = async (key) => {
    const prev = settings;
    const newVal = !settings[key];
    setSettings({ ...settings, [key]: newVal });
    setSaving(true);
    const res = await updateAdminSettings({ [key === 'allow_registrations' ? 'allowGuests' : key]: newVal });
    if (!res.success) {
      Alert.alert('Error', 'Failed to update setting');
      setSettings(prev);
    }
    setSaving(false);
  };

  if (loading) return <View style={styles.loadingContainer}><PremiumLoader message="Loading settings..." /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Studio Info */}
        <Text style={styles.sectionHeader}>General</Text>
        <View style={styles.settingCard}>
          <View style={styles.settingLeft}>
            <Building2 size={20} color={colors.textSecondary} />
            <View>
              <Text style={styles.settingTitle}>Studio Name</Text>
              <Text style={styles.settingValue}>{settings.studio_name}</Text>
            </View>
          </View>
        </View>

        {/* App Config */}
        <Text style={styles.sectionHeader}>App Configuration</Text>
        <SettingToggle icon={Bell} title="Push Notifications" subtitle="Send alerts to mobile devices" value={settings.push_notifications} onToggle={() => handleToggle('push_notifications')} disabled={saving} />
        <SettingToggle icon={Lock} title="Allow New Registrations" subtitle="Let new users create accounts" value={settings.allow_registrations} onToggle={() => handleToggle('allow_registrations')} disabled={saving} />
        <SettingToggle icon={Wrench} title="Maintenance Mode" subtitle="Temporarily disable the platform" value={settings.maintenance_mode} onToggle={() => handleToggle('maintenance_mode')} disabled={saving} destructive />
      </ScrollView>
    </SafeAreaView>
  );
};

const SettingToggle = ({ icon: Icon, title, subtitle, value, onToggle, disabled, destructive }) => (
  <View style={styles.settingCard}>
    <View style={styles.settingLeft}>
      <Icon size={20} color={destructive ? colors.error : colors.textSecondary} />
      <View>
        <Text style={[styles.settingTitle, destructive && { color: colors.error }]}>{title}</Text>
        {subtitle && <Text style={styles.settingSub}>{subtitle}</Text>}
      </View>
    </View>
    <Switch
      trackColor={{ false: colors.lightBgSecondary, true: destructive ? colors.error : colors.primary }}
      thumbColor="#ffffff"
      value={value}
      onValueChange={onToggle}
      disabled={disabled}
    />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionHeader: {
    ...typography.label, color: colors.primary, marginTop: 16, marginBottom: 8,
  },
  settingCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#ffffff', padding: 16, borderRadius: borderRadius.xl,
    marginBottom: 8, borderWidth: 1, borderColor: colors.border,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 12 },
  settingTitle: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  settingValue: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  settingSub: { ...typography.bodyXSmall, color: colors.textTertiary, marginTop: 2 },
});
