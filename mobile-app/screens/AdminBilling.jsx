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
  Search, FileText, Banknote, Plus, X, ChevronLeft, Eye, Filter, CheckCircle, Clock, AlertCircle,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/context/ThemeContext';
import { typography, borderRadius, shadows } from '../src/theme';
import { AnimatedTouchable } from '../src/components/shared/AnimatedTouchable';
import { StaggerItem } from '../src/components/shared/StaggerItem';
import { StatusBadge } from '../src/components/shared/StatusBadge';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { ConfirmModal } from '../src/components/shared/ConfirmModal';
import { formatCurrency, formatDate } from '../src/utils/formatters';
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

  const [invoiceDetail, setInvoiceDetail] = useState(null);
  const [periodFilter, setPeriodFilter] = useState('all'); // all | weekly | monthly | yearly
  const [statusFilter, setStatusFilter] = useState('all');
  const [payoutModalVisible, setPayoutModalVisible] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ artistId: '', amount: '', method: 'Cash', reference: '' });

  const matchesPeriod = (dateStr) => {
    if (periodFilter === 'all') return true;
    const d = new Date(dateStr);
    const now = new Date();
    if (periodFilter === 'weekly') {
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - mondayOffset);
      weekStart.setHours(0, 0, 0, 0);
      return d >= weekStart;
    }
    if (periodFilter === 'monthly') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (periodFilter === 'yearly') return d.getFullYear() === now.getFullYear();
    return true;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [resInvoices, resPayouts, resArtists] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/invoices`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/payouts`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/users?role=artist`, { headers }),
      ]);

      const invData = await resInvoices.json().catch(() => ({}));
      const payData = await resPayouts.json().catch(() => ({}));
      const artData = await resArtists.json().catch(() => ({}));

      setInvoices(invData.success ? (invData.data || invData.invoices || []) : []);
      setPayouts(payData.success ? (payData.data || payData.payouts || []) : []);
      const allArtUsers = artData.success ? (artData.users || artData.data || []) : [];
      setArtists(allArtUsers.filter(u => u.user_type === 'artist' || u.role === 'artist'));
    } catch (e) {
      console.warn('AdminBilling fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadArtists = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/api/admin/users?role=artist`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setArtists((data.users || data.data || []).filter(u => u.user_type === 'artist' || u.role === 'artist'));
      }
    } catch (e) {
      console.warn('AdminBilling artists fetch error:', e);
    }
  };

  useEffect(() => {
    loadData();
    loadArtists();
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
      <AnimatedTouchable style={styles.card} onPress={() => setInvoiceDetail(item)}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.invoice_number || `INV-${String(item.id).padStart(6,'0')}`}</Text>
          <StatusBadge status={item.status || 'paid'} />
        </View>
        <Text style={styles.cardSub}>Client: {item.client_name || 'Walk-in Customer'}</Text>
        {item.service_type ? <Text style={styles.cardSub}>Service: {item.service_type}</Text> : null}
        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>{formatDate(item.created_at || item.date)}</Text>
          <Text style={styles.cardAmount}>P{formatCurrency(item.amount)}</Text>
        </View>
      </AnimatedTouchable>
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

      {/* Stats Row - Invoices */}
      {activeTab === 'invoices' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 10 }}>
          <View style={[styles.statChip, { backgroundColor: theme.successBg || 'rgba(16,185,129,0.12)' }]}>
            <CheckCircle size={14} color={theme.success} />
            <Text style={[styles.statChipText, { color: theme.success }]}>
              {invoices.filter(i => (i.status || '').toLowerCase() === 'paid').length} Paid
            </Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: theme.warningBg || 'rgba(245,158,11,0.12)' }]}>
            <Clock size={14} color={theme.warning} />
            <Text style={[styles.statChipText, { color: theme.warning }]}>
              {invoices.filter(i => (i.status || '').toLowerCase() === 'pending').length} Pending
            </Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: theme.surfaceLight }]}>
            <FileText size={14} color={theme.textSecondary} />
            <Text style={[styles.statChipText, { color: theme.textSecondary }]}>{invoices.length} Total</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: 'rgba(190,144,85,0.12)' }]}>
            <Text style={[styles.statChipText, { color: theme.gold, fontWeight: '800' }]}>
              P{formatCurrency(invoices.filter(i => (i.status||'').toLowerCase() === 'paid').reduce((s,i) => s + parseFloat(i.amount||0), 0))}
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Period + Status Filters */}
      <View style={styles.filtersRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 8 }}>
          {['all', 'weekly', 'monthly', 'yearly'].map(p => (
            <AnimatedTouchable
              key={p}
              style={[styles.filterPill, periodFilter === p && styles.filterPillActive]}
              onPress={() => setPeriodFilter(p)}
            >
              <Text style={[styles.filterPillText, periodFilter === p && styles.filterPillTextActive]}>
                {p === 'all' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </AnimatedTouchable>
          ))}
          {activeTab === 'invoices' && ['all', 'paid', 'pending', 'cancelled'].map(s => (
            <AnimatedTouchable
              key={s}
              style={[styles.filterPill, statusFilter === s && styles.filterPillActive]}
              onPress={() => setStatusFilter(s)}
            >
              <Text style={[styles.filterPillText, statusFilter === s && styles.filterPillTextActive]}>
                {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </AnimatedTouchable>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <PremiumLoader message="Loading financials..." />
      ) : (
        <FlatList
          data={activeTab === 'invoices'
            ? invoices.filter(i => {
                const q = search.toLowerCase();
                const matchesSearch = (i.client_name||'').toLowerCase().includes(q) || (i.invoice_number||'').toLowerCase().includes(q) || (i.service_type||'').toLowerCase().includes(q);
                const matchesStatus = statusFilter === 'all' || (i.status||'').toLowerCase() === statusFilter;
                const matchesPer = matchesPeriod(i.created_at || i.date);
                return matchesSearch && matchesStatus && matchesPer;
              })
            : payouts.filter(p => {
                const q = search.toLowerCase();
                const matchesSearch = (p.artist_name||'').toLowerCase().includes(q) || (p.reference_number||p.reference_no||'').toLowerCase().includes(q);
                const matchesPer = matchesPeriod(p.created_at || p.payout_date);
                return matchesSearch && matchesPer;
              })
          }
          renderItem={activeTab === 'invoices' ? renderInvoice : renderPayout}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState icon={activeTab === 'invoices' ? FileText : Banknote} title={`No ${activeTab} found`} />}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={theme.gold} />}
        />
      )}

      {/* Invoice Detail Modal */}
      <Modal visible={!!invoiceDetail} transparent animationType="slide" onRequestClose={() => setInvoiceDetail(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invoice Detail</Text>
              <AnimatedTouchable onPress={() => setInvoiceDetail(null)}>
                <X size={22} color={theme.textSecondary} />
              </AnimatedTouchable>
            </View>
            {invoiceDetail && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Invoice No.</Text>
                  <Text style={styles.detailValue}>{invoiceDetail.invoice_number || `INV-${String(invoiceDetail.id).padStart(6,'0')}`}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Client</Text>
                  <Text style={styles.detailValue}>{invoiceDetail.client_name || 'Walk-in Customer'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Service</Text>
                  <Text style={styles.detailValue}>{invoiceDetail.service_type || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>{formatDate(invoiceDetail.created_at || invoiceDetail.date)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Amount</Text>
                  <Text style={[styles.detailValue, { color: theme.success, fontWeight: '800' }]}>P{formatCurrency(invoiceDetail.amount)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <StatusBadge status={invoiceDetail.status || 'paid'} />
                </View>
                {invoiceDetail.appointment_id && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Booking</Text>
                    <Text style={styles.detailValue}>#{invoiceDetail.appointment_id}</Text>
                  </View>
                )}
                <View style={{ height: 30 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

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
                  {artists.length === 0 ? (
                    <Text style={styles.emptyArtistText}>No artists found. Please try again.</Text>
                  ) : artists.map(a => (
                    <AnimatedTouchable
                      key={String(a.id)}
                      style={[styles.statusBtn, String(payoutForm.artistId) === String(a.id) && styles.statusBtnActive]}
                      onPress={() => setPayoutForm({...payoutForm, artistId: String(a.id)})}
                    >
                      <Text style={[styles.statusBtnText, String(payoutForm.artistId) === String(a.id) && styles.statusBtnTextActive]}>{a.name}</Text>
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
  backBtn: { padding: 4 },
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
  filtersRow: { borderBottomWidth: 1, borderBottomColor: theme.border },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: theme.surfaceLight, borderWidth: 1, borderColor: theme.border,
  },
  filterPillActive: { backgroundColor: theme.gold, borderColor: theme.gold },
  filterPillText: { ...typography.bodyXSmall, color: theme.textSecondary, fontWeight: '700' },
  filterPillTextActive: { color: theme.backgroundDeep },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  statChipText: { ...typography.bodyXSmall, fontWeight: '700' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border },
  detailLabel: { ...typography.bodySmall, color: theme.textSecondary, fontWeight: '600', textTransform: 'uppercase' },
  detailValue: { ...typography.body, color: theme.textPrimary, textAlign: 'right', fontWeight: '500', flex: 1, marginLeft: 12 },
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
  emptyArtistText: { ...typography.bodySmall, color: theme.textTertiary, fontStyle: 'italic', padding: 8 },
});
