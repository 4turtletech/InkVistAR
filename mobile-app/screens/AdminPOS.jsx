/**
 * AdminPOS.jsx -- Point of Sale & Manual Billing
 * Themed upgrade with search, payment status badges, and modal flow.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  Alert, SafeAreaView, KeyboardAvoidingView, Platform, Modal, RefreshControl,
} from 'react-native';
import { Search, ArrowLeft, DollarSign, CreditCard, X, Banknote, Smartphone } from 'lucide-react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../src/theme';
import { StatusBadge } from '../src/components/shared/StatusBadge';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { formatCurrency, formatDate, getDisplayCode } from '../src/utils/formatters';
import { getAdminAppointments, createAdminManualPayment } from '../src/utils/api';

export const AdminPOS = ({ navigation }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const result = await getAdminAppointments();
    if (result.success) {
      const all = (result.data || result.appointments || [])
        .filter(a => ['confirmed', 'completed', 'in_progress'].includes(a.status))
        .sort((a, b) => (b.id || 0) - (a.id || 0));
      setAppointments(all);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleProcessPayment = async () => {
    if (!selectedAppt) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid positive amount.');
      return;
    }
    setIsProcessing(true);
    const result = await createAdminManualPayment(selectedAppt.id, { amount, method: paymentMethod });
    if (result.success) {
      Alert.alert('Success', 'Payment recorded successfully.');
      setSelectedAppt(null);
      setPaymentAmount('');
      loadData();
    } else {
      Alert.alert('Error', result.message || 'Failed to process payment');
    }
    setIsProcessing(false);
  };

  const filtered = appointments.filter(a =>
    search === '' ||
    (a.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.design_title || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.artist_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const methods = [
    { key: 'Cash', icon: Banknote },
    { key: 'Card', icon: CreditCard },
    { key: 'GCash', icon: Smartphone },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>POS & Billing</Text>
          <Text style={styles.headerSub}>{filtered.length} session{filtered.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Search size={18} color={colors.textTertiary} />
        <TextInput style={styles.searchInput} placeholder="Search client, artist, design..." placeholderTextColor={colors.textTertiary} value={search} onChangeText={setSearch} />
      </View>

      {loading ? <PremiumLoader message="Loading sessions..." /> : (
        <ScrollView contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={colors.primary} />}>
          {filtered.length === 0 ? (
            <EmptyState icon={DollarSign} title="No sessions found" subtitle="No appointments awaiting payment" />
          ) : (
            filtered.map(appt => (
              <TouchableOpacity key={appt.id} style={styles.card} onPress={() => { setSelectedAppt(appt); setPaymentAmount(''); }} activeOpacity={0.7}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardCode}>{getDisplayCode(appt.booking_code, appt.id)}</Text>
                  <StatusBadge status={appt.payment_status || 'unpaid'} />
                </View>
                <Text style={styles.cardClient} numberOfLines={1}>{appt.client_name}</Text>
                <Text style={styles.cardDesign} numberOfLines={1}>{appt.design_title || 'Tattoo Session'}</Text>
                <View style={styles.cardBottom}>
                  <Text style={styles.cardPrice}>P{formatCurrency(appt.price || appt.total_price || 0)}</Text>
                  <Text style={styles.cardArtist}>{appt.artist_name || 'Unassigned'}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* Payment Modal */}
      <Modal visible={!!selectedAppt} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Payment</Text>
              <TouchableOpacity onPress={() => setSelectedAppt(null)}><X size={22} color={colors.textSecondary} /></TouchableOpacity>
            </View>
            {selectedAppt && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Client</Text>
                  <Text style={styles.infoValue}>{selectedAppt.client_name}</Text>
                  <Text style={styles.infoLabel}>Design</Text>
                  <Text style={styles.infoValue}>{selectedAppt.design_title || 'Tattoo Session'}</Text>
                  <Text style={styles.infoLabel}>Total Price</Text>
                  <Text style={styles.infoValue}>P{formatCurrency(selectedAppt.price || selectedAppt.total_price || 0)}</Text>
                  <Text style={styles.infoLabel}>Payment Status</Text>
                  <StatusBadge status={selectedAppt.payment_status || 'unpaid'} style={{ marginTop: 4 }} />
                </View>

                <Text style={styles.inputLabel}>Payment Method</Text>
                <View style={styles.methodRow}>
                  {methods.map(m => (
                    <TouchableOpacity key={m.key} style={[styles.methodBtn, paymentMethod === m.key && styles.methodBtnActive]} onPress={() => setPaymentMethod(m.key)}>
                      <m.icon size={18} color={paymentMethod === m.key ? '#ffffff' : colors.textSecondary} />
                      <Text style={[styles.methodText, paymentMethod === m.key && styles.methodTextActive]}>{m.key}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Amount (PHP)</Text>
                <TextInput style={styles.amountInput} keyboardType="numeric" placeholder="0.00" placeholderTextColor={colors.textTertiary} value={paymentAmount} onChangeText={setPaymentAmount} />

                <TouchableOpacity style={[styles.processBtn, isProcessing && { opacity: 0.6 }]} onPress={handleProcessPayment} disabled={isProcessing} activeOpacity={0.8}>
                  <Text style={styles.processBtnText}>{isProcessing ? 'Processing...' : 'Record Payment'}</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  headerSub: { ...typography.bodyXSmall, color: colors.textTertiary, marginTop: 2 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#ffffff', margin: 16, marginBottom: 8,
    borderRadius: borderRadius.md, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, ...typography.body, color: colors.textPrimary },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    backgroundColor: '#ffffff', padding: 14, borderRadius: borderRadius.xl,
    marginBottom: 10, borderWidth: 1, borderColor: colors.border, ...shadows.subtle,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardCode: { ...typography.bodyXSmall, color: colors.primary, fontWeight: '700' },
  cardClient: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  cardDesign: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  cardPrice: { ...typography.h4, color: colors.success },
  cardArtist: { ...typography.bodyXSmall, color: colors.textTertiary },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#ffffff', borderTopLeftRadius: borderRadius.xxl, borderTopRightRadius: borderRadius.xxl,
    padding: 20, maxHeight: '80%', ...shadows.cardStrong,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { ...typography.h3, color: colors.textPrimary },
  infoBox: { backgroundColor: colors.lightBgSecondary, borderRadius: borderRadius.lg, padding: 14, marginBottom: 16 },
  infoLabel: { ...typography.bodyXSmall, color: colors.textTertiary, fontWeight: '600', marginBottom: 2, marginTop: 8 },
  infoValue: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  inputLabel: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600', marginBottom: 8 },
  methodRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  methodBtn: {
    flex: 1, paddingVertical: 12, backgroundColor: colors.lightBgSecondary,
    borderRadius: borderRadius.md, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  methodBtnActive: { backgroundColor: colors.primary },
  methodText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  methodTextActive: { color: '#ffffff' },
  amountInput: {
    backgroundColor: colors.lightBgSecondary, color: colors.textPrimary,
    padding: 16, borderRadius: borderRadius.md, ...typography.h3,
    textAlign: 'center', marginBottom: 16, borderWidth: 1, borderColor: colors.border,
  },
  processBtn: {
    backgroundColor: colors.primary, paddingVertical: 14, borderRadius: borderRadius.md,
    alignItems: 'center', ...shadows.button,
  },
  processBtnText: { ...typography.button, color: '#ffffff', fontSize: 16 },
});
