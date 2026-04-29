/**
 * AdminBilling.jsx -- Billing & Payments Management
 * Handles invoice tracking and artist payouts.
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, Modal, ScrollView, SafeAreaView,
  RefreshControl, KeyboardAvoidingView, Platform
} from 'react-native';
import {
  Search, FileText, Banknote, Plus, X, Pencil, Trash2, CheckCircle, ChevronLeft, ChevronRight, DollarSign
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/context/ThemeContext';
import { typography, spacing, borderRadius, shadows } from '../src/theme';
import { AnimatedTouchable } from '../src/components/shared/AnimatedTouchable';
import { StaggerItem } from '../src/components/shared/StaggerItem';
import { StatusBadge } from '../src/components/shared/StatusBadge';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { ConfirmModal } from '../src/components/shared/ConfirmModal';
import { formatCurrency, formatDate, getDisplayCode } from '../src/utils/formatters';
import { API_BASE_URL } from '../src/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AdminBilling = ({ navigation }) => {
  const { theme, hapticsEnabled } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(theme, insets);

  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' or 'payouts'
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [artists, setArtists] = useState([]);
  const [search, setSearch] = useState('');

  const [payoutModalVisible, setPayoutModalVisible] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ artistId: '', amount: '', method: 'Cash', reference: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };

      // Try fetching stats to populate tables (simulating AdminBilling.js calls)
      const resStats = await fetch(`${API_BASE_URL}/api/admin/billing/stats`, { headers });
      const statsData = await resStats.json();

      if (statsData.success) {
        // In a real scenario, these would be proper arrays from the backend.
        // Assuming the backend has `/api/admin/billing/invoices` and `/api/admin/payouts`
        
        // Let's fetch invoices and payouts
        const [resInvoices, resPayouts, resArtists] = await Promise.all([
          fetch(`${API_BASE_URL}/api/admin/billing/invoices`, { headers }),
          fetch(`${API_BASE_URL}/api/admin/payouts`, { headers }),
          fetch(`${API_BASE_URL}/api/admin/users?role=artist`, { headers })
        ]);
        
        const invData = await resInvoices.json();
        const payData = await resPayouts.json();
        const artData = await resArtists.json();
        
        setInvoices(invData.success ? (invData.invoices || invData.data || []) : []);
        setPayouts(payData.success ? (payData.payouts || payData.data || []) : []);
        setArtists(artData.success ? (artData.users?.filter(u => u.user_type === 'artist') || []) : []);
      }
    } catch (e) {
      console.warn('AdminBilling fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRecordPayout = async () => {
    if (!payoutForm.artistId || !payoutForm.amount) {
      Alert.alert('Validation Error', 'Please select an artist and enter an amount.');
      return;
    }
    
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/api/admin/payouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          artistId: payoutForm.artistId,
          amount: parseFloat(payoutForm.amount),
          paymentMethod: payoutForm.method,
          referenceNumber: payoutForm.reference,
        })
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Success', 'Payout recorded successfully.');
        setPayoutModalVisible(false);
        setPayoutForm({ artistId: '', amount: '', method: 'Cash', reference: '' });
        loadData();
      } else {
        Alert.alert('Error', data.message || 'Failed to record payout');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error.');
    }
  };

  const renderInvoice = ({ item, index }) => (
    <StaggerItem index={index}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.invoice_number || `INV-${item.id}`}</Text>
          <StatusBadge status={item.status || 'paid'} />
        </View>
        <Text style={styles.cardSub}>Client: {item.client_name}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>{formatDate(item.created_at || item.date)}</Text>
          <Text style={styles.cardAmount}>P{formatCurrency(item.amount)}</Text>
        </View>
      </View>
    </StaggerItem>
  );

  const renderPayout = ({ item, index }) => (
    <StaggerItem index={index}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.artist_name}</Text>
          <StatusBadge status={item.status || 'completed'} />
        </View>
        <Text style={styles.cardSub}>Method: {item.payment_method}</Text>
        {item.reference_number ? <Text style={styles.cardSub}>Ref: {item.reference_number}</Text> : null}
        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>{formatDate(item.created_at || item.payout_date)}</Text>
          <Text style={styles.cardAmount}>P{formatCurrency(item.amount)}</Text>
        </View>
      </View>
    </StaggerItem>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <AnimatedTouchable onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.textPrimary} />
        </AnimatedTouchable>
        <View style={{ flex: 1, paddingLeft: 12 }}>
          <Text style={styles.headerTitle}>Billing & Payouts</Text>
          <Text style={styles.headerSub}>Financial Ledger</Text>
        </View>
        {activeTab === 'payouts' && (
          <AnimatedTouchable style={styles.addBtn} onPress={() => setPayoutModalVisible(true)}>
            <Plus size={20} color={theme.backgroundDeep} />
          </AnimatedTouchable>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'invoices' && styles.activeTab]} onPress={() => setActiveTab('invoices')}>
          <FileText size={18} color={activeTab === 'invoices' ? theme.gold : theme.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'invoices' && styles.activeTabText]}>Invoices</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'payouts' && styles.activeTab]} onPress={() => setActiveTab('payouts')}>
          <Banknote size={18} color={activeTab === 'payouts' ? theme.gold : theme.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'payouts' && styles.activeTabText]}>Artist Payouts</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Search size={18} color={theme.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${activeTab}...`}
          placeholderTextColor={theme.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <PremiumLoader message="Loading financials..." />
      ) : (
        <FlatList
          data={activeTab === 'invoices' 
            ? invoices.filter(i => (i.client_name||'').toLowerCase().includes(search.toLowerCase()) || (i.invoice_number||'').toLowerCase().includes(search.toLowerCase()))
            : payouts.filter(p => (p.artist_name||'').toLowerCase().includes(search.toLowerCase()))}
          renderItem={activeTab === 'invoices' ? renderInvoice : renderPayout}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState icon={activeTab === 'invoices' ? FileText : Banknote} title={`No ${activeTab} found`} />}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={theme.gold} />}
        />
      )}

      {/* Record Payout Modal */}
      <Modal visible={payoutModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Payout</Text>
              <AnimatedTouchable onPress={() => setPayoutModalVisible(false)}>
                <X size={22} color={theme.textSecondary} />
              </AnimatedTouchable>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Select Artist</Text>
              <View style={styles.statusRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {artists.map(a => (
                    <AnimatedTouchable key={a.id} style={[styles.statusBtn, payoutForm.artistId === a.id && styles.statusBtnActive]} onPress={() => setPayoutForm({...payoutForm, artistId: a.id})}>
                      <Text style={[styles.statusBtnText, payoutForm.artistId === a.id && styles.statusBtnTextActive]}>{a.name}</Text>
                    </AnimatedTouchable>
                  ))}
                </ScrollView>
              </View>

              <Text style={styles.inputLabel}>Amount (PHP)</Text>
              <TextInput style={styles.input} value={payoutForm.amount} onChangeText={t => setPayoutForm({...payoutForm, amount: t})} keyboardType="numeric" placeholder="e.g. 5000" placeholderTextColor={theme.textTertiary} />

              <Text style={styles.inputLabel}>Payment Method</Text>
              <View style={styles.statusRow}>
                {['Cash', 'GCash', 'Bank Transfer'].map(m => (
                  <AnimatedTouchable key={m} style={[styles.statusBtn, payoutForm.method === m && styles.statusBtnActive]} onPress={() => setPayoutForm({...payoutForm, method: m})}>
                    <Text style={[styles.statusBtnText, payoutForm.method === m && styles.statusBtnTextActive]}>{m}</Text>
                  </AnimatedTouchable>
                ))}
              </View>

              <Text style={styles.inputLabel}>Reference Number (Optional)</Text>
              <TextInput style={styles.input} value={payoutForm.reference} onChangeText={t => setPayoutForm({...payoutForm, reference: t})} placeholder="Transaction ID..." placeholderTextColor={theme.textTertiary} />

              <AnimatedTouchable style={styles.saveBtn} onPress={handleRecordPayout}>
                <Text style={styles.saveBtnText}>Record Payout</Text>
              </AnimatedTouchable>
              <View style={{height: 20}} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const getStyles = (theme, insets) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: (insets?.top || 0) + 12, paddingBottom: 16,
    backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  headerTitle: { ...typography.h2, color: theme.textPrimary },
  headerSub: { ...typography.bodySmall, color: theme.gold, marginTop: 2 },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.gold, justifyContent: 'center', alignItems: 'center' },
  tabContainer: { flexDirection: 'row', backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: theme.gold },
  tabText: { ...typography.bodySmall, color: theme.textSecondary, fontWeight: '600' },
  activeTabText: { color: theme.gold },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, margin: 16, paddingHorizontal: 14, paddingVertical: 12, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: theme.border, gap: 10 },
  searchInput: { flex: 1, ...typography.body, color: theme.textPrimary },
  listContent: { padding: 16, paddingTop: 0, paddingBottom: 80 },
  card: { backgroundColor: theme.surface, padding: 16, borderRadius: borderRadius.xl, marginBottom: 12, borderWidth: 1, borderColor: theme.border, ...shadows.subtle },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { ...typography.h4, color: theme.textPrimary },
  cardSub: { ...typography.bodySmall, color: theme.textSecondary, marginBottom: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12 },
  cardDate: { ...typography.bodyXSmall, color: theme.textTertiary },
  cardAmount: { ...typography.h3, color: theme.success },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,13,14,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: theme.surface, borderTopLeftRadius: borderRadius.xxl, borderTopRightRadius: borderRadius.xxl, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: theme.border },
  modalTitle: { ...typography.h3, color: theme.textPrimary },
  modalBody: { padding: 20 },
  inputLabel: { ...typography.bodySmall, color: theme.textSecondary, marginBottom: 8, fontWeight: '600' },
  input: { backgroundColor: theme.surfaceLight, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.md, padding: 14, color: theme.textPrimary, ...typography.body, marginBottom: 20 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  statusBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: borderRadius.md, backgroundColor: theme.surfaceLight, borderWidth: 1, borderColor: theme.border },
  statusBtnActive: { backgroundColor: theme.primaryLight, borderColor: theme.gold },
  statusBtnText: { ...typography.bodySmall, color: theme.textSecondary, fontWeight: '600' },
  statusBtnTextActive: { color: theme.gold },
  saveBtn: { backgroundColor: theme.gold, padding: 16, borderRadius: borderRadius.lg, alignItems: 'center', marginTop: 10 },
  saveBtnText: { ...typography.body, color: theme.backgroundDeep, fontWeight: '700' },
});
