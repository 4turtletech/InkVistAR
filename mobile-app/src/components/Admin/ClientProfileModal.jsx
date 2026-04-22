import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert, FlatList } from 'react-native';
import { X, User, Calendar, Trash2, Save, FileText, ChevronDown, ChevronUp } from 'lucide-react-native';
import { colors, typography, borderRadius, shadows } from '../../theme';
import { fetchAPI } from '../../utils/api';
import { StatusBadge } from '../shared/StatusBadge';
import { formatDate, formatTime, formatCurrency, getDisplayCode } from '../../utils/formatters';
import { PremiumLoader } from '../shared/PremiumLoader';

export const ClientProfileModal = ({ visible, client, onClose, onRefreshUsers }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  
  const [clientData, setClientData] = useState({ profile: {}, appointments: [], notes: '' });
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', notes: '' });
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (visible && client) {
      loadClientData();
      setActiveTab('profile');
      setExpandedId(null);
    }
  }, [visible, client]);

  const loadClientData = async () => {
    setLoading(true);
    try {
      const [profileRes, historyRes, posRes] = await Promise.all([
        fetchAPI(`/customer/profile/${client.id}`),
        fetchAPI(`/customer/${client.id}/appointments`),
        fetchAPI(`/admin/invoices`)
      ]);

      const profile = profileRes.success ? profileRes.profile : {};
      const appointments = (historyRes.success ? historyRes.appointments : []).map(a => ({ ...a, recordType: 'Session' }));
      const posSales = (posRes.success ? posRes.data : [])
        .filter(inv => inv.customer_id === client.id)
        .map(inv => ({ ...inv, appointment_date: inv.created_at, design_title: inv.service_type, status: inv.status, recordType: 'Retail' }));

      const combinedHistory = [...appointments, ...posSales].sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));
      
      setClientData({ profile, appointments: combinedHistory, notes: profile.notes || '' });
      setFormData({
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        notes: profile.notes || '',
      });
    } catch (e) {
      console.error("Error loading client data:", e);
      Alert.alert("Error", "Failed to load client details");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      const result = await fetchAPI(`/customer/profile/${client.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      });

      if (result.success) {
        Alert.alert("Success", "Client profile updated!");
        onRefreshUsers();
        onClose();
      } else {
        Alert.alert("Error", result.message || "Failed to update profile");
      }
    } catch (e) {
      Alert.alert("Error", "An unexpected error occurred.");
    }
  };

  const renderHistoryItem = ({ item }) => {
    const isExpanded = expandedId === item.id;
    const isSession = item.recordType === 'Session';
    return (
      <View style={styles.historyCard}>
        <TouchableOpacity style={styles.historyRow} onPress={() => setExpandedId(isExpanded ? null : item.id)} activeOpacity={0.7}>
          <View style={styles.historyLeft}>
            <Text style={styles.historyDate}>{formatDate(item.appointment_date)}</Text>
            <View style={styles.historyMetaRow}>
              <View style={[styles.typeBadge, isSession ? styles.typeSession : styles.typeRetail]}>
                <Text style={[styles.typeBadgeText, isSession ? { color: colors.iconBlue } : { color: colors.success }]}>
                  {isSession ? 'Session' : 'Retail'}
                </Text>
              </View>
              <Text style={styles.historyTitle} numberOfLines={1}>{isSession ? item.design_title : (item.service_type || item.design_title || '—')}</Text>
            </View>
          </View>
          <View style={styles.historyRight}>
            <StatusBadge status={item.status} />
            {isExpanded ? <ChevronUp size={20} color={colors.primary} /> : <ChevronDown size={20} color={colors.textTertiary} />}
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.historyExpanded}>
            {isSession ? (
              <View style={styles.detailsGrid}>
                {item.booking_code && <DetailItem label="Booking Code" value={getDisplayCode(item.booking_code, item.id)} />}
                <DetailItem label="Artist" value={item.artist_name} />
                <DetailItem label="Service" value={item.service_type} />
                <DetailItem label="Time" value={item.start_time ? formatTime(item.start_time) : null} />
                <DetailItem label="Total Price" value={`P${formatCurrency(item.price)}`} />
                <DetailItem label="Paid" value={`P${formatCurrency(item.total_paid)}`} highlight />
                <DetailItem label="Payment Status" value={(item.payment_status || 'unpaid').toUpperCase()} />
                {item.notes && <DetailItem label="Notes" value={item.notes} fullWidth />}
              </View>
            ) : (
              <View style={styles.detailsGrid}>
                <DetailItem label="Invoice Date" value={formatDate(item.appointment_date)} />
                <DetailItem label="Description" value={item.service_type || item.design_title} />
                <DetailItem label="Amount" value={`P${formatCurrency(item.amount || item.price)}`} highlight />
                <DetailItem label="Payment Status" value={(item.status || 'unpaid').toUpperCase()} />
                {item.paymongo_payment_id && <DetailItem label="Reference" value={item.paymongo_payment_id} fullWidth />}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  if (!client) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIcon}><User size={20} color={colors.primary} /></View>
              <View>
                <Text style={styles.headerTitle} numberOfLines={1}>{client.name}</Text>
                <Text style={styles.headerSubtitle}>Account ID: #CLI-{client.id.toString().padStart(5, '0')}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}><X size={22} color={colors.textSecondary} /></TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'profile' && styles.tabBtnActive]} onPress={() => setActiveTab('profile')}>
              <User size={16} color={activeTab === 'profile' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>Profile Info</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]} onPress={() => setActiveTab('history')}>
              <Calendar size={16} color={activeTab === 'history' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>Visit History</Text>
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={styles.body}>
            {loading ? <PremiumLoader message="Loading client data..." /> : (
              activeTab === 'profile' ? (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.sectionTitle}>Personal Information</Text>
                  <Text style={styles.inputLabel}>Legal Name</Text>
                  <TextInput style={styles.input} value={formData.name} onChangeText={t => setFormData({ ...formData, name: t })} />
                  
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput style={styles.input} value={formData.email} onChangeText={t => setFormData({ ...formData, email: t })} keyboardType="email-address" autoCapitalize="none" />
                  
                  <Text style={styles.inputLabel}>Primary Contact</Text>
                  <TextInput style={styles.input} value={formData.phone} onChangeText={t => setFormData({ ...formData, phone: t })} keyboardType="phone-pad" />
                  
                  <Text style={styles.sectionTitle}>Internal Confidential Notes</Text>
                  <TextInput 
                    style={[styles.input, styles.textArea]} 
                    value={formData.notes} 
                    onChangeText={t => setFormData({ ...formData, notes: t })}
                    multiline
                    placeholder="Record specific sensitivities, design preferences, or billing history notes..."
                    placeholderTextColor={colors.textTertiary}
                  />
                </ScrollView>
              ) : (
                <FlatList
                  data={clientData.appointments}
                  renderItem={renderHistoryItem}
                  keyExtractor={item => `${item.recordType}-${item.id}`}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={<Text style={styles.noData}>This client has no recorded procedures.</Text>}
                />
              )
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            {activeTab === 'profile' && (
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Save size={18} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.saveBtnText}>Commit Changes</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const DetailItem = ({ label, value, highlight, fullWidth }) => {
  if (!value) return null;
  return (
    <View style={[styles.detailItem, fullWidth && { width: '100%' }]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, highlight && { color: colors.success }]}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#ffffff', borderTopLeftRadius: borderRadius.xxl, borderTopRightRadius: borderRadius.xxl, maxHeight: '85%', minHeight: '50%', ...shadows.cardStrong },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.lightBgSecondary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  headerTitle: { ...typography.h3, color: colors.textPrimary },
  headerSubtitle: { ...typography.bodyXSmall, color: colors.textTertiary },
  closeBtn: { padding: 4 },
  
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: colors.primary },
  tabText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: colors.primary },
  
  body: { flex: 1, padding: 20 },
  sectionTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: 12, marginTop: 4 },
  inputLabel: { ...typography.bodyXSmall, color: colors.textSecondary, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: colors.lightBgSecondary, color: colors.textPrimary, padding: 12, borderRadius: borderRadius.md, marginBottom: 16, ...typography.body, borderWidth: 1, borderColor: colors.border },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  
  footer: { flexDirection: 'row', padding: 20, borderTopWidth: 1, borderTopColor: colors.borderLight, gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: borderRadius.md, backgroundColor: colors.lightBgSecondary, alignItems: 'center' },
  cancelBtnText: { ...typography.button, color: colors.textSecondary },
  saveBtn: { flex: 2, flexDirection: 'row', paddingVertical: 14, borderRadius: borderRadius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadows.button },
  saveBtnText: { ...typography.button, color: '#ffffff' },

  historyCard: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, marginBottom: 10, overflow: 'hidden' },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  historyLeft: { flex: 1, marginRight: 10 },
  historyDate: { ...typography.bodySmall, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },
  historyMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.sm },
  typeSession: { backgroundColor: colors.iconBlueBg },
  typeRetail: { backgroundColor: colors.successBg },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  historyTitle: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 },
  historyRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  
  historyExpanded: { backgroundColor: colors.lightBgSecondary, padding: 14, borderTopWidth: 1, borderTopColor: colors.borderLight },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detailItem: { width: '45%', marginBottom: 4 },
  detailLabel: { ...typography.bodyXSmall, color: colors.textTertiary, textTransform: 'uppercase', marginBottom: 2 },
  detailValue: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '500' },
  noData: { ...typography.body, color: colors.textTertiary, textAlign: 'center', marginTop: 40 },
});
