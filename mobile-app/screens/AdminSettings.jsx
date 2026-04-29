/**
 * AdminSettings.jsx -- App Settings with toggles
 * Themed upgrade matching web's AdminSettings controls.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, SafeAreaView, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import {
  ArrowLeft, Settings, Bell, Lock, Wrench, Building2, Save, FileText, FileCode2,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/context/ThemeContext';
import { typography, spacing, borderRadius, shadows } from '../src/theme';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { AnimatedTouchable } from '../src/components/shared/AnimatedTouchable';
import { getAdminSettings, updateAdminSettings } from '../src/utils/api';

export const AdminSettings = ({ navigation }) => {
  const { theme, hapticsEnabled } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(theme, insets);

  const [settings, setSettings] = useState({
    studio_name: 'InkVistAR Studio',
    allow_registrations: true,
    maintenance_mode: false,
    push_notifications: true,
    terms_of_service: '',
    cancellation_policy: '',
    reminder_template: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general'); // general, policies, templates

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

  const handleTextSave = async (key) => {
    setSaving(true);
    const res = await updateAdminSettings({ [key]: settings[key] });
    setSaving(false);
    if (res.success) {
      Alert.alert('Success', 'Settings updated successfully.');
    } else {
      Alert.alert('Error', 'Failed to save changes.');
    }
  };

  if (loading) return <View style={styles.loadingContainer}><PremiumLoader message="Loading settings..." /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <AnimatedTouchable onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
          <ArrowLeft size={22} color={theme.textPrimary} />
        </AnimatedTouchable>
        <Text style={styles.headerTitle}>System Settings</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'general' && styles.activeTab]} onPress={() => setActiveTab('general')}>
          <Settings size={18} color={activeTab === 'general' ? theme.gold : theme.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'general' && styles.activeTabText]}>General</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'policies' && styles.activeTab]} onPress={() => setActiveTab('policies')}>
          <FileText size={18} color={activeTab === 'policies' ? theme.gold : theme.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'policies' && styles.activeTabText]}>Policies</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'templates' && styles.activeTab]} onPress={() => setActiveTab('templates')}>
          <FileCode2 size={18} color={activeTab === 'templates' ? theme.gold : theme.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'templates' && styles.activeTabText]}>Templates</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          {activeTab === 'general' && (
            <>
              <Text style={styles.sectionHeader}>Studio Info</Text>
              <View style={styles.settingCard}>
                <View style={styles.settingLeft}>
                  <Building2 size={20} color={theme.textSecondary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingTitle}>Studio Name</Text>
                    <TextInput 
                      style={styles.textInput} 
                      value={settings.studio_name} 
                      onChangeText={t => setSettings({...settings, studio_name: t})} 
                    />
                  </View>
                </View>
                <AnimatedTouchable style={styles.saveIconBtn} onPress={() => handleTextSave('studio_name')}>
                  <Save size={18} color={theme.gold} />
                </AnimatedTouchable>
              </View>

              <Text style={styles.sectionHeader}>App Configuration</Text>
              <SettingToggle theme={theme} icon={Bell} title="Push Notifications" subtitle="Send alerts to mobile devices" value={settings.push_notifications} onToggle={() => handleToggle('push_notifications')} disabled={saving} />
              <SettingToggle theme={theme} icon={Lock} title="Allow New Registrations" subtitle="Let new users create accounts" value={settings.allow_registrations} onToggle={() => handleToggle('allow_registrations')} disabled={saving} />
              <SettingToggle theme={theme} icon={Wrench} title="Maintenance Mode" subtitle="Temporarily disable the platform" value={settings.maintenance_mode} onToggle={() => handleToggle('maintenance_mode')} disabled={saving} destructive />
            </>
          )}

          {activeTab === 'policies' && (
            <>
              <Text style={styles.sectionHeader}>Terms of Service</Text>
              <View style={styles.textAreaContainer}>
                <TextInput 
                  style={styles.textArea} 
                  multiline 
                  numberOfLines={6} 
                  value={settings.terms_of_service} 
                  onChangeText={t => setSettings({...settings, terms_of_service: t})} 
                  placeholder="Enter studio terms of service..."
                  placeholderTextColor={theme.textTertiary}
                />
                <AnimatedTouchable style={styles.saveBtn} onPress={() => handleTextSave('terms_of_service')}>
                  <Text style={styles.saveBtnText}>Save Terms</Text>
                </AnimatedTouchable>
              </View>

              <Text style={styles.sectionHeader}>Cancellation Policy</Text>
              <View style={styles.textAreaContainer}>
                <TextInput 
                  style={styles.textArea} 
                  multiline 
                  numberOfLines={6} 
                  value={settings.cancellation_policy} 
                  onChangeText={t => setSettings({...settings, cancellation_policy: t})} 
                  placeholder="Enter cancellation policy..."
                  placeholderTextColor={theme.textTertiary}
                />
                <AnimatedTouchable style={styles.saveBtn} onPress={() => handleTextSave('cancellation_policy')}>
                  <Text style={styles.saveBtnText}>Save Policy</Text>
                </AnimatedTouchable>
              </View>
            </>
          )}

          {activeTab === 'templates' && (
            <>
              <Text style={styles.sectionHeader}>Appointment Reminder Template</Text>
              <Text style={styles.helperText}>Use {'{client_name}'}, {'{date}'}, {'{time}'} as placeholders.</Text>
              <View style={styles.textAreaContainer}>
                <TextInput 
                  style={styles.textArea} 
                  multiline 
                  numberOfLines={6} 
                  value={settings.reminder_template} 
                  onChangeText={t => setSettings({...settings, reminder_template: t})} 
                  placeholder="Hi {client_name}, this is a reminder for your appointment on {date} at {time}..."
                  placeholderTextColor={theme.textTertiary}
                />
                <AnimatedTouchable style={styles.saveBtn} onPress={() => handleTextSave('reminder_template')}>
                  <Text style={styles.saveBtnText}>Save Template</Text>
                </AnimatedTouchable>
              </View>
            </>
          )}

          <View style={{height: 40}} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const SettingToggle = ({ theme, icon: Icon, title, subtitle, value, onToggle, disabled, destructive }) => (
  <View style={getStyles(theme).settingCard}>
    <View style={getStyles(theme).settingLeft}>
      <Icon size={20} color={destructive ? theme.error : theme.textSecondary} />
      <View style={{ flex: 1, paddingRight: 10 }}>
        <Text style={[getStyles(theme).settingTitle, destructive && { color: theme.error }]}>{title}</Text>
        {subtitle && <Text style={getStyles(theme).settingSub}>{subtitle}</Text>}
      </View>
    </View>
    <Switch
      trackColor={{ false: theme.surfaceLight, true: destructive ? theme.error : theme.primary }}
      thumbColor="#ffffff"
      value={value}
      onValueChange={onToggle}
      disabled={disabled}
    />
  </View>
);

const getStyles = (theme, insets) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: (insets?.top || 0) + 12, paddingBottom: 16,
    backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { ...typography.h2, color: theme.textPrimary },
  tabContainer: { flexDirection: 'row', backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: theme.gold },
  tabText: { ...typography.bodySmall, color: theme.textSecondary, fontWeight: '600' },
  activeTabText: { color: theme.gold },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionHeader: {
    ...typography.label, color: theme.gold, marginTop: 16, marginBottom: 8,
  },
  helperText: { ...typography.bodyXSmall, color: theme.textTertiary, marginBottom: 8 },
  settingCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.surface, padding: 16, borderRadius: borderRadius.xl,
    marginBottom: 8, borderWidth: 1, borderColor: theme.border,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingTitle: { ...typography.body, fontWeight: '600', color: theme.textPrimary },
  textInput: { ...typography.bodySmall, color: theme.textSecondary, marginTop: 4, padding: 0 },
  settingSub: { ...typography.bodyXSmall, color: theme.textTertiary, marginTop: 2 },
  saveIconBtn: { padding: 8, backgroundColor: theme.surfaceLight, borderRadius: borderRadius.md },
  textAreaContainer: { backgroundColor: theme.surface, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
  textArea: { ...typography.body, color: theme.textPrimary, padding: 16, minHeight: 120, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: theme.surfaceLight, padding: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.border },
  saveBtnText: { ...typography.bodySmall, color: theme.gold, fontWeight: '700' }
});
