/**
 * CustomerProfilePage.jsx -- Customer Profile Editing
 * Themed with lucide icons, avatar initials, stats row, and edit modal.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  Modal, TextInput, Alert,
} from 'react-native';
import {
  LogOut, Edit3, X, Phone, MapPin, Palette, Heart, Users,
} from 'lucide-react-native';
import { colors, typography, borderRadius, shadows } from '../src/theme';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { getInitials } from '../src/utils/formatters';
import { getCustomerDashboard, updateCustomerProfile } from '../src/utils/api';

export function CustomerProfilePage({ userId, userName, userEmail, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({ name: userName || '', email: userEmail || '', phone: '', location: '' });
  const [stats, setStats] = useState({ tattoos: 0, designs: 0, artists: 0 });
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({});

  useEffect(() => { if (userId) fetchProfile(); }, [userId]);

  const fetchProfile = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await getCustomerDashboard(userId);
      if (res.success && res.customer) {
        setProfile({
          name: res.customer.name, email: res.customer.email,
          phone: res.customer.phone || '', location: res.customer.location || '',
        });
        setStats({
          tattoos: res.stats?.total_tattoos || 0,
          designs: res.stats?.saved_designs || 0,
          artists: res.stats?.artists || 0,
        });
      }
    } catch (e) { console.error('Profile error:', e); }
    finally { setLoading(false); }
  };

  const handleEdit = () => { setEditForm({ ...profile }); setEditModalVisible(true); };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await updateCustomerProfile(userId, editForm);
      if (res.success) {
        Alert.alert('Success', 'Profile updated'); setProfile(editForm); setEditModalVisible(false);
      } else {
        Alert.alert('Error', res.message || 'Failed to update');
      }
    } catch (e) { Alert.alert('Error', 'An error occurred'); }
    finally { setLoading(false); }
  };

  if (loading && !editModalVisible) return <SafeAreaView style={styles.container}><PremiumLoader message="Loading profile..." /></SafeAreaView>;

  const details = [
    { Icon: Phone, label: 'Phone', value: profile.phone || 'Not set' },
    { Icon: MapPin, label: 'Location', value: profile.location || 'Not set' },
  ];

  const statItems = [
    { Icon: Palette, label: 'Tattoos', value: stats.tattoos, color: colors.primary },
    { Icon: Heart, label: 'Designs', value: stats.designs, color: colors.error },
    { Icon: Users, label: 'Artists', value: stats.artists, color: colors.info },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Profile</Text>
          <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
            <LogOut size={20} color={colors.error} />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarText}>{getInitials(profile.name)}</Text>
          </View>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.email}>{profile.email}</Text>
          <TouchableOpacity style={styles.editBtn} onPress={handleEdit} activeOpacity={0.7}>
            <Edit3 size={14} color={colors.textSecondary} />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stats</Text>
          <View style={styles.statsRow}>
            {statItems.map((s, i) => (
              <View key={i} style={styles.statItem}>
                <View style={[styles.statIconWrap, { backgroundColor: `${s.color}15` }]}>
                  <s.Icon size={18} color={s.color} />
                </View>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Personal Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Details</Text>
          {details.map((d, i) => (
            <View key={i} style={styles.row}>
              <View style={styles.rowLeft}>
                <d.Icon size={16} color={colors.textTertiary} />
                <Text style={styles.rowLabel}>{d.label}</Text>
              </View>
              <Text style={styles.rowValue}>{d.value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { label: 'Full Name', key: 'name', kb: 'default' },
                { label: 'Phone Number', key: 'phone', kb: 'phone-pad' },
                { label: 'Location', key: 'location', kb: 'default' },
              ].map(f => (
                <View key={f.key}>
                  <Text style={styles.inputLabel}>{f.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={String(editForm[f.key] || '')}
                    onChangeText={t => setEditForm({ ...editForm, [f.key]: t })}
                    keyboardType={f.kb}
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
              ))}
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { paddingBottom: 40 },
  header: {
    padding: 16, paddingTop: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  logoutBtn: { padding: 8 },
  profileCard: {
    alignItems: 'center', paddingVertical: 24,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  avatarBox: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  avatarText: { fontSize: 34, color: '#ffffff', fontWeight: '800' },
  name: { ...typography.h2, color: colors.textPrimary, marginBottom: 4 },
  email: { ...typography.body, color: colors.textSecondary, marginBottom: 14 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 8, backgroundColor: colors.lightBgSecondary,
    borderRadius: borderRadius.round,
  },
  editBtnText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  section: { marginTop: 16, backgroundColor: '#ffffff', padding: 16 },
  sectionTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
  statItem: { alignItems: 'center', gap: 4 },
  statIconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  statValue: { ...typography.h3, color: colors.textPrimary, fontWeight: '800' },
  statLabel: { ...typography.bodyXSmall, color: colors.textSecondary },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { ...typography.body, color: colors.textSecondary },
  rowValue: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: borderRadius.xxl, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { ...typography.h3, color: colors.textPrimary },
  inputLabel: { ...typography.bodyXSmall, color: colors.textSecondary, fontWeight: '600', marginBottom: 4, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    padding: 12, ...typography.body, color: colors.textPrimary,
  },
  saveBtn: {
    marginTop: 24, backgroundColor: colors.primary, paddingVertical: 14,
    borderRadius: borderRadius.md, alignItems: 'center',
  },
  saveBtnText: { ...typography.button, color: '#ffffff', fontSize: 16 },
});
