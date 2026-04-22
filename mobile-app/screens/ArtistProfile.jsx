/**
 * ArtistProfile.jsx -- Profile Editing & Password Change
 * Themed upgrade with lucide icons and proper theme tokens.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  Modal, TextInput, Alert,
} from 'react-native';
import {
  LogOut, Edit3, X, ChevronDown, ChevronUp, Lock, User, Phone, Briefcase,
  Clock, DollarSign, Percent,
} from 'lucide-react-native';
import { colors, typography, borderRadius, shadows } from '../src/theme';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { getInitials, formatCurrency } from '../src/utils/formatters';
import { getArtistDashboard, updateArtistProfile, changeArtistPassword } from '../src/utils/api';

export const ArtistProfile = ({ userId, userName, userEmail, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    name: userName || '', email: userEmail || '', phone: '',
    experience_years: 0, specialization: 'General', hourly_rate: 0, commission_rate: 0.60,
  });
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [showPwd, setShowPwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: '', new: '', confirm: '' });

  useEffect(() => { fetchProfile(); }, [userId]);

  const fetchProfile = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await getArtistDashboard(userId);
      if (res.success && res.artist) {
        setProfile({
          name: res.artist.name, email: res.artist.email, phone: res.artist.phone || '',
          experience_years: res.artist.experience_years, specialization: res.artist.specialization,
          hourly_rate: res.artist.hourly_rate, commission_rate: res.artist.commission_rate,
        });
      }
    } catch (e) { console.error('Profile load error:', e); }
    finally { setLoading(false); }
  };

  const handleEdit = () => {
    setEditForm({ ...profile }); setShowPwd(false);
    setPwdForm({ current: '', new: '', confirm: '' }); setEditModalVisible(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (showPwd && pwdForm.current) {
        if (pwdForm.new !== pwdForm.confirm) {
          Alert.alert('Error', 'New passwords do not match.'); setLoading(false); return;
        }
        const pwdRes = await changeArtistPassword(userId, pwdForm.current, pwdForm.new);
        if (!pwdRes.success) {
          Alert.alert('Security Error', pwdRes.message || 'Failed to change password.'); setLoading(false); return;
        }
      }
      const res = await updateArtistProfile(userId, editForm);
      if (res.success) {
        Alert.alert('Success', 'Profile updated'); setProfile(editForm); setEditModalVisible(false);
      } else {
        Alert.alert('Error', res.message || 'Failed to update profile');
      }
    } catch (e) { Alert.alert('Error', 'An error occurred'); }
    finally { setLoading(false); }
  };

  if (loading && !editModalVisible) return <SafeAreaView style={styles.container}><PremiumLoader message="Loading profile..." /></SafeAreaView>;

  const details = [
    { Icon: Briefcase, label: 'Specialization', value: profile.specialization },
    { Icon: Clock, label: 'Experience', value: `${profile.experience_years} Years` },
    { Icon: DollarSign, label: 'Hourly Rate', value: `P${formatCurrency(profile.hourly_rate || 0)}/hr` },
    { Icon: Percent, label: 'Commission', value: `${((profile.commission_rate || 0) * 100).toFixed(0)}%` },
    { Icon: Phone, label: 'Phone', value: profile.phone || 'Not set' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
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

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Details</Text>
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
                { label: 'Specialization', key: 'specialization', kb: 'default' },
                { label: 'Experience (Years)', key: 'experience_years', kb: 'numeric' },
                { label: 'Hourly Rate (PHP)', key: 'hourly_rate', kb: 'numeric' },
              ].map(field => (
                <View key={field.key}>
                  <Text style={styles.inputLabel}>{field.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={String(editForm[field.key] || '')}
                    onChangeText={t => setEditForm({ ...editForm, [field.key]: t })}
                    keyboardType={field.kb}
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
              ))}

              <TouchableOpacity style={styles.pwdToggle} onPress={() => setShowPwd(!showPwd)}>
                <Lock size={16} color={colors.primary} />
                <Text style={styles.pwdToggleText}>{showPwd ? 'Hide Password Settings' : 'Change Password'}</Text>
                {showPwd ? <ChevronUp size={16} color={colors.primary} /> : <ChevronDown size={16} color={colors.primary} />}
              </TouchableOpacity>

              {showPwd && (
                <View style={styles.pwdSection}>
                  <Text style={styles.inputLabel}>Current Password</Text>
                  <TextInput style={styles.input} secureTextEntry value={pwdForm.current} onChangeText={t => setPwdForm({ ...pwdForm, current: t })} placeholder="Required" placeholderTextColor={colors.textTertiary} />
                  <Text style={styles.inputLabel}>New Password</Text>
                  <TextInput style={styles.input} secureTextEntry value={pwdForm.new} onChangeText={t => setPwdForm({ ...pwdForm, new: t })} placeholder="At least 6 characters" placeholderTextColor={colors.textTertiary} />
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <TextInput style={[styles.input, pwdForm.new !== pwdForm.confirm && pwdForm.confirm !== '' && { borderColor: colors.error }]} secureTextEntry value={pwdForm.confirm} onChangeText={t => setPwdForm({ ...pwdForm, confirm: t })} placeholderTextColor={colors.textTertiary} />
                </View>
              )}

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

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
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { ...typography.body, color: colors.textSecondary },
  rowValue: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: borderRadius.xxl, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { ...typography.h3, color: colors.textPrimary },
  inputLabel: { ...typography.bodyXSmall, color: colors.textSecondary, fontWeight: '600', marginBottom: 4, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    padding: 12, ...typography.body, color: colors.textPrimary,
  },
  pwdToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  pwdToggleText: { ...typography.bodySmall, color: colors.primary, fontWeight: '700' },
  pwdSection: { backgroundColor: colors.lightBgSecondary, padding: 12, borderRadius: borderRadius.md, marginTop: 6 },
  saveBtn: {
    marginTop: 24, backgroundColor: colors.primary, paddingVertical: 14,
    borderRadius: borderRadius.md, alignItems: 'center', ...shadows.button,
  },
  saveBtnText: { ...typography.button, color: '#ffffff', fontSize: 16 },
});
