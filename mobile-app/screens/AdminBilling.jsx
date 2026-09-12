/**
 * AdminBilling.jsx -- Billing & Payments Management
 * Handles invoice tracking and artist payouts.
 */

import { invoiceFormErrors, payoutFormErrors, sanitizeCurrencyInput } from '../src/utils/adminFormValidation';
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, Modal, ScrollView, SafeAreaView,
  RefreshControl, KeyboardAvoidingView, Platform, Keyboard
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
import { fetchAPI } from '../src/utils/api';

const isEditableInvoiceRecord = (invoice) =>
  (invoice?.record_source === 'invoice' || Boolean(invoice?.invoice_number)) &&
  (invoice?.status || '').toLowerCase() === 'pending' &&
  !invoice?.payment_id && !invoice?.appointment_id;
const getInvoicePaymentMethod = (invoice) => invoice?.payment_method || 'Not recorded';

const getInvoiceSourceId = (invoice) => {
  if (invoice?.source_id) return invoice.source_id;
  if (invoice?.invoice_number && Number(invoice.id) >= 100000) return Number(invoice.id) - 100000;
  return invoice?.id;
};

export const AdminBilling = ({ navigation, route }) => {
  const { theme, hapticsEnabled } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(theme, insets);

  const [activeTab, setActiveTab] = useState(route?.params?.tab === 'payouts' ? 'payouts' : 'invoices'); // 'invoices' or 'payouts'
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [payoutBalances, setPayoutBalances] = useState([]);
  const [payoutBalanceLoading, setPayoutBalanceLoading] = useState(true);
  const [payoutBalanceError, setPayoutBalanceError] = useState('');
  const [artists, setArtists] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');

  const [invoiceDetail, setInvoiceDetail] = useState(null);
  const [periodFilter, setPeriodFilter] = useState('all'); // all | weekly | monthly | yearly | custom
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all'); // all | session | pos
  const [payoutModalVisible, setPayoutModalVisible] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ artistId: '', amount: '', method: 'Cash', reference: '' });
  const [payoutErrors, setPayoutErrors] = useState({});
  const [payoutFeedback, setPayoutFeedback] = useState(null);
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);
  const payoutSubmittingRef = useRef(false);
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [payoutDetail, setPayoutDetail] = useState(null);
  const [billingFeedback, setBillingFeedback] = useState(null);

  // Create Invoice
  const [createInvoiceModal, setCreateInvoiceModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ customerId: '', clientName: '', serviceType: 'Tattoo Session', amount: '' });
  const [invoiceClientFocused, setInvoiceClientFocused] = useState(false);

  const [invoiceErrors, setInvoiceErrors] = useState({});
  const [invoiceAttempted, setInvoiceAttempted] = useState(false);
  const changeInvoiceField = (field, value) => {
    const next = {
      ...invoiceForm,
      [field]: value,
      ...(field === 'clientName' ? { customerId: '' } : {}),
    };
    setInvoiceForm(next);
    if (invoiceAttempted) setInvoiceErrors(invoiceFormErrors(next));
  };
  const selectInvoiceCustomer = (customer) => {
    const next = { ...invoiceForm, customerId: String(customer.id), clientName: customer.name };
    setInvoiceForm(next);
    setInvoiceClientFocused(false);
    if (invoiceAttempted) setInvoiceErrors(invoiceFormErrors(next));
  };
  const invoiceClientSuggestions = invoiceClientFocused
    ? customers.filter(customer => {
      const query = invoiceForm.clientName.trim().toLowerCase();
      return !query
        || String(customer.name || '').toLowerCase().includes(query)
        || String(customer.email || '').toLowerCase().includes(query);
    }).slice(0, 6)
    : [];
  const closeCreateInvoice = () => {
    Keyboard.dismiss();
    setCreateInvoiceModal(false);
    setInvoiceClientFocused(false);
    setInvoiceErrors({});
    setInvoiceAttempted(false);
    setInvoiceForm({ customerId: '', clientName: '', serviceType: 'Tattoo Session', amount: '' });
  };

  // Custom Date Range
  const [customDateModal, setCustomDateModal] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [pendingCustomStart, setPendingCustomStart] = useState('');
  const [pendingCustomEnd, setPendingCustomEnd] = useState('');

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
    if (periodFilter === 'custom' && customStart && customEnd) {
      const start = new Date(customStart);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      return d >= start && d <= end;
    }
    return true;
  };

  const loadPayoutBalances = async () => {
    setPayoutBalanceLoading(true);
    setPayoutBalanceError('');
    try {
      const result = await fetchAPI('/admin/payout-balances');
      if (!result.success) throw new Error(result.message || 'Unable to load payout balances.');
      setPayoutBalances(result.data || []);
      return true;
    } catch (error) {
      setPayoutBalances([]);
      setPayoutBalanceError(error.message || 'Unable to load payout balances.');
      return false;
    } finally {
      setPayoutBalanceLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [invData, payData, artData] = await Promise.all([
        fetchAPI('/admin/invoices'),
        fetchAPI('/admin/payouts'),
        fetchAPI('/admin/users?role=artist'),
        loadPayoutBalances(),
      ]);

      setInvoices(invData.success ? (invData.data || invData.invoices || []) : []);
      setPayouts(payData.success ? (payData.data || payData.payouts || []) : []);
      const allArtUsers = artData.success ? (artData.users || artData.data || []) : [];
      setArtists(allArtUsers.filter(u => u.user_type === 'artist' || u.role === 'artist'));
      setCustomers(allArtUsers.filter(u => (
        (u.user_type === 'customer' || u.role === 'customer')
        && ![true, 1, '1'].includes(u.is_deleted)
        && String(u.account_status || 'active').toLowerCase() === 'active'
      )));
    } catch (e) {
      console.warn('AdminBilling fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadArtists = async () => {
    try {
      const data = await fetchAPI('/admin/users?role=artist');
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

  useEffect(() => {
    if (route?.params?.tab === 'payouts') setActiveTab('payouts');
  }, [route?.params?.tab]);


  const selectedPayoutBalance = payoutBalances.find(balance => String(balance.artistId) === String(payoutForm.artistId));

  const openPayoutModal = (balance = null) => {
    setPayoutForm({
      artistId: balance ? String(balance.artistId) : '',
      amount: balance && balance.availableBalance > 0 ? Number(balance.availableBalance).toFixed(2) : '',
      method: 'Cash',
      reference: '',
    });
    setPayoutErrors({});
    setPayoutFeedback(null);
    setPayoutModalVisible(true);
  };

  const selectPayoutArtist = (artistId) => {
    const balance = payoutBalances.find(item => String(item.artistId) === String(artistId));
    setPayoutForm(previous => ({
      ...previous,
      artistId: String(artistId),
      amount: balance && balance.availableBalance > 0 ? Number(balance.availableBalance).toFixed(2) : '',
    }));
    setPayoutErrors({});
    setPayoutFeedback(null);
  };

  const handleRecordPayout = async () => {
    if (payoutSubmittingRef.current) return;
    const available = Number(selectedPayoutBalance?.availableBalance || 0);
    if (payoutBalanceLoading || payoutBalanceError) {
      setPayoutFeedback({ type: 'error', message: payoutBalanceLoading ? 'Payout balance is still loading.' : payoutBalanceError });
      return;
    }
    const errors = payoutFormErrors(payoutForm, available);
    if (Object.keys(errors).length) {
      setPayoutErrors(errors);
      setPayoutFeedback({ type: 'error', message: 'Please fix the highlighted fields.' });
      return;
    }
    const parsedAmount = Number(payoutForm.amount);
    try {
      payoutSubmittingRef.current = true;
      setPayoutSubmitting(true);
      setPayoutFeedback(null);
      const data = await fetchAPI('/admin/payouts', {
        method: 'POST',
        body: JSON.stringify({
          artistId: payoutForm.artistId,
          amount: parsedAmount,
          method: payoutForm.method,
          reference: payoutForm.reference,
        })
      });
      if (data.success) {
        await loadData();
        setPayoutFeedback({ type: 'success', message: `Payout recorded. Remaining balance: P${formatCurrency(data.remainingBalance || 0)}.` });
        setPayoutForm(previous => ({ ...previous, amount: '', reference: '' }));
        setPayoutErrors({});
      } else {
        setPayoutFeedback({ type: 'error', message: data.message || 'Failed to record payout.' });
      }
    } catch (e) {
      setPayoutFeedback({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      payoutSubmittingRef.current = false;
      setPayoutSubmitting(false);
    }
  };

  const handleCreateInvoice = async () => {
    const { clientName, serviceType, amount } = invoiceForm;
    Keyboard.dismiss();
    const errors = invoiceFormErrors(invoiceForm);
    setInvoiceAttempted(true);
    setInvoiceErrors(errors);
    if (Object.keys(errors).length) return;
    const parsedAmount = Number(amount);
    try {
      const data = await fetchAPI('/admin/invoices', {
        method: 'POST',
        body: JSON.stringify({
          customerId: invoiceForm.customerId || null,
          client: clientName.trim(),
          type: serviceType,
          amount: parsedAmount,
          status: 'Pending',
        })
      });
      if (data.success) {
        setBillingFeedback({ type: 'success', message: `${data.invoiceNumber} was saved as a draft invoice.` });
        closeCreateInvoice();
        loadData();
      } else {
        setBillingFeedback({ type: 'error', message: data.message || 'Failed to create invoice.' });
      }
    } catch (e) {
      setBillingFeedback({ type: 'error', message: 'Network error. Please try again.' });
    }
  };

  const handleUpdateInvoice = async () => {
    if (!isEditableInvoiceRecord(invoiceDetail)) {
      setBillingFeedback({ type: 'error', message: 'Payment transactions cannot be edited as invoices.' });
      return;
    }
    try {
      const data = await fetchAPI(`/admin/invoices/${getInvoiceSourceId(invoiceDetail)}`, {
        method: 'PUT',
        body: JSON.stringify({
          client: invoiceDetail.client_name,
          type: invoiceDetail.service_type,
          amount: invoiceDetail.amount,
          status: invoiceDetail.status
        })
      });
      if (data.success) {
        setBillingFeedback({ type: 'success', message: 'Invoice updated successfully.' });
        setInvoiceDetail(null);
        loadData();
      } else {
        setBillingFeedback({ type: 'error', message: data.message || 'Failed to update invoice.' });
      }
    } catch (e) {
      setBillingFeedback({ type: 'error', message: 'Network error. Please try again.' });
    }
  };

  const renderInvoice = ({ item, index }) => (
    <StaggerItem index={index}>
      <AnimatedTouchable style={styles.card} onPress={() => { setInvoiceDetail(item); setIsEditingInvoice(false); }}>
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
      <AnimatedTouchable style={styles.card} onPress={() => setPayoutDetail(item)}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.artist_name}</Text>
          <StatusBadge status={item.status || 'completed'} />
        </View>
        <Text style={styles.cardSub}>Method: {item.payment_method || item.payout_method || item.method || 'N/A'}</Text>
        {item.reference_number || item.reference_no ? <Text style={styles.cardSub}>Ref: {item.reference_number || item.reference_no}</Text> : null}
        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>{formatDate(item.created_at || item.payout_date)}</Text>
          <Text style={styles.cardAmount}>P{formatCurrency(item.amount)}</Text>
        </View>
      </AnimatedTouchable>
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
        {activeTab === 'invoices' && (
          <AnimatedTouchable style={styles.addBtn} onPress={() => setCreateInvoiceModal(true)} title="Create new invoice">
            <Plus size={20} color={theme.backgroundDeep} />
          </AnimatedTouchable>
        )}
        {activeTab === 'payouts' && (
          <AnimatedTouchable style={styles.addBtn} onPress={() => openPayoutModal()} title="Record payout">
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

      {billingFeedback ? (
        <View style={[styles.inlineFeedback, billingFeedback.type === 'success' ? styles.inlineFeedbackSuccess : styles.inlineFeedbackError, { marginHorizontal: 16, marginTop: 10 }]}>
          <Text style={[styles.inlineFeedbackText, { color: billingFeedback.type === 'success' ? theme.success : theme.error }]}>{billingFeedback.message}</Text>
        </View>
      ) : null}

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
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingVertical: 12, gap: 10 }}>
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
        </View>
      )}

      {/* Period Filters */}
      <View style={styles.filtersRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 8 }}>
          {['all', 'weekly', 'monthly', 'yearly', 'custom'].map(p => (
            <AnimatedTouchable
              key={p}
              style={[styles.filterPill, periodFilter === p && styles.filterPillActive]}
              onPress={() => {
                if (p === 'custom') {
                  setPendingCustomStart(customStart);
                  setPendingCustomEnd(customEnd);
                  setCustomDateModal(true);
                } else {
                  setPeriodFilter(p);
                }
              }}
            >
              <Text style={[styles.filterPillText, periodFilter === p && styles.filterPillTextActive]}>
                {p === 'all' ? 'All Time' : p === 'custom' && customStart && customEnd ? `${customStart} → ${customEnd}` : p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </AnimatedTouchable>
          ))}
        </ScrollView>
      </View>

      {/* Status Filters */}
      {activeTab === 'invoices' && (
        <View style={styles.filtersRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 8 }}>
            {['all', 'paid', 'pending', 'cancelled'].map(s => (
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
            <View style={{ width: 1, backgroundColor: theme.border, marginVertical: 4, marginHorizontal: 4 }} />
            {['all', 'session', 'pos'].map(src => (
              <AnimatedTouchable
                key={`src-${src}`}
                style={[styles.filterPill, sourceFilter === src && { backgroundColor: 'rgba(190,144,85,0.15)', borderColor: theme.gold }]}
                onPress={() => setSourceFilter(src)}
              >
                <Text style={[styles.filterPillText, sourceFilter === src && { color: theme.gold }]}>
                  {src === 'all' ? 'All Sources' : src === 'pos' ? 'POS' : 'Session'}
                </Text>
              </AnimatedTouchable>
            ))}
          </ScrollView>
        </View>
      )}

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
                const isPos = /retail|pos/i.test(i.service_type || '');
                const matchesSource = sourceFilter === 'all' || (sourceFilter === 'pos' ? isPos : !isPos);
                return matchesSearch && matchesStatus && matchesPer && matchesSource;
              })
            : payouts.filter(p => {
                const q = search.toLowerCase();
                const matchesSearch = (p.artist_name||'').toLowerCase().includes(q) || (p.reference_number||p.reference_no||'').toLowerCase().includes(q);
                const matchesPer = matchesPeriod(p.created_at || p.payout_date);
                return matchesSearch && matchesPer;
              })
          }
          renderItem={activeTab === 'invoices' ? renderInvoice : renderPayout}
          keyExtractor={item => `${item.record_source || 'record'}-${item.id}`}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={activeTab === 'payouts' ? (
            <View style={styles.balanceSection}>
              <Text style={styles.balanceSectionTitle}>Artists to Pay</Text>
              <Text style={styles.balanceSectionSubtitle}>Completed and fully paid commissions, minus recorded payouts.</Text>
              {payoutBalanceLoading ? (
                <Text style={styles.noBalancesText}>Loading payout balances...</Text>
              ) : payoutBalanceError ? (
                <View style={styles.balanceErrorBox}>
                  <Text style={styles.balanceErrorText}>{payoutBalanceError}</Text>
                  <AnimatedTouchable style={styles.retryButton} onPress={loadPayoutBalances}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </AnimatedTouchable>
                </View>
              ) : payoutBalances.filter(balance => Number(balance.availableBalance) > 0).map(balance => (
                <View key={String(balance.artistId)} style={styles.balanceCard}>
                  <View style={styles.balanceCardText}>
                    <Text style={styles.balanceArtistName}>{balance.artistName}</Text>
                    <Text style={styles.balanceLabel}>Available balance</Text>
                    <Text style={styles.balanceAmount}>P{formatCurrency(balance.availableBalance)}</Text>
                  </View>
                  <AnimatedTouchable style={styles.balancePayButton} onPress={() => openPayoutModal(balance)}>
                    <Text style={styles.balancePayButtonText}>Pay</Text>
                  </AnimatedTouchable>
                </View>
              ))}
              {!payoutBalanceLoading && !payoutBalanceError && payoutBalances.filter(balance => Number(balance.availableBalance) > 0).length === 0 && (
                <Text style={styles.noBalancesText}>No artist payouts are currently due.</Text>
              )}
              <Text style={styles.historyHeading}>Payout History</Text>
            </View>
          ) : null}
          ListEmptyComponent={<EmptyState icon={activeTab === 'invoices' ? FileText : Banknote} title={`No ${activeTab} found`} />}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={theme.gold} />}
        />
      )}

      {/* Invoice Detail Modal */}
      <Modal visible={!!invoiceDetail} transparent animationType="slide" onRequestClose={() => setInvoiceDetail(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEditingInvoice ? 'Update Billing Record' : 'Invoice Detail'}</Text>
              <AnimatedTouchable onPress={() => setInvoiceDetail(null)}>
                <X size={22} color={theme.textSecondary} />
              </AnimatedTouchable>
            </View>
            {invoiceDetail && (
              <ScrollView style={styles.modalBody}>
                {!isEditingInvoice ? (
                  <>
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
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Payment Method</Text>
                      <Text style={styles.detailValue}>{getInvoicePaymentMethod(invoiceDetail)}</Text>
                    </View>
                    {invoiceDetail.appointment_id && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Booking</Text>
                        <Text style={styles.detailValue}>#{invoiceDetail.appointment_id}</Text>
                      </View>
                    )}
                    
                    {isEditableInvoiceRecord(invoiceDetail) ? (
                      <AnimatedTouchable style={[styles.saveBtn, { marginTop: 20 }]} onPress={() => {
                        setInvoiceDetail(prev => ({
                          ...prev,
                          amount: prev.amount ? parseFloat(prev.amount).toFixed(2) : ''
                        }));
                        setIsEditingInvoice(true);
                      }}>
                        <Text style={styles.saveBtnText}>Edit Invoice</Text>
                      </AnimatedTouchable>
                    ) : (
                      <Text style={{ ...typography.bodyXSmall, color: theme.textTertiary, marginTop: 20, textAlign: 'center' }}>
                        Payment transactions are read-only. Edit the generated invoice record instead.
                      </Text>
                    )}
                    <View style={{ height: 30 }} />
                  </>
                ) : (
                  <>
                    <View style={{ marginBottom: 20 }}>
                      <Text style={{ ...typography.bodySmall, color: theme.textSecondary, marginBottom: 4 }}>Invoice Number</Text>
                      <Text style={{ ...typography.h4, color: theme.gold }}>{invoiceDetail.invoice_number || `INV-${String(invoiceDetail.id).padStart(6,'0')}`}</Text>
                    </View>

                    <Text style={styles.inputLabel}>Client Name (Locked)</Text>
                    <TextInput style={[styles.input, { backgroundColor: theme.surfaceLight, color: theme.textSecondary }]} value={invoiceDetail.client_name || 'Walk-in Customer'} editable={false} />

                    <Text style={styles.inputLabel}>Service Type</Text>
                    <View style={styles.statusRow}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {['Tattoo Session', 'Consultation', 'Touch-up', 'Retail / POS', 'Other'].map(srv => (
                          <AnimatedTouchable key={srv} style={[styles.statusBtn, invoiceDetail.service_type === srv && styles.statusBtnActive]} onPress={() => setInvoiceDetail({...invoiceDetail, service_type: srv})}>
                            <Text style={[styles.statusBtnText, invoiceDetail.service_type === srv && styles.statusBtnTextActive]}>{srv}</Text>
                          </AnimatedTouchable>
                        ))}
                      </ScrollView>
                    </View>

                    <Text style={[styles.inputLabel, { marginTop: 12 }]}>Amount (Locked)</Text>
                    <TextInput 
                      style={[styles.input, { backgroundColor: theme.surfaceLight, color: theme.textSecondary }]} 
                      value={invoiceDetail.amount ? `P${parseFloat(invoiceDetail.amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''} 
                      editable={false} 
                    />

                    <Text style={styles.inputLabel}>Payment Status</Text>
                    <View style={styles.statusRow}>
                      {['Pending', 'Cancelled'].map(s => (
                        <AnimatedTouchable key={s} style={[styles.statusBtn, invoiceDetail.status?.toLowerCase() === s.toLowerCase() && styles.statusBtnActive]} onPress={() => setInvoiceDetail({...invoiceDetail, status: s})}>
                          <Text style={[styles.statusBtnText, invoiceDetail.status?.toLowerCase() === s.toLowerCase() && styles.statusBtnTextActive]}>{s}</Text>
                        </AnimatedTouchable>
                      ))}
                    </View>

                    <AnimatedTouchable style={styles.saveBtn} onPress={handleUpdateInvoice}>
                      <Text style={styles.saveBtnText}>Update Record</Text>
                    </AnimatedTouchable>
                    <AnimatedTouchable style={[styles.saveBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.border, marginTop: 10 }]} onPress={() => { setIsEditingInvoice(false); loadData(); }}>
                      <Text style={[styles.saveBtnText, { color: theme.textPrimary }]}>Cancel</Text>
                    </AnimatedTouchable>
                    <View style={{ height: 30 }} />
                  </>
                )}
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Payout Detail Modal (Read-Only) */}
      <Modal visible={!!payoutDetail} transparent animationType="slide" onRequestClose={() => setPayoutDetail(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payout Detail</Text>
              <AnimatedTouchable onPress={() => setPayoutDetail(null)}>
                <X size={22} color={theme.textSecondary} />
              </AnimatedTouchable>
            </View>
            {payoutDetail && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Artist</Text>
                  <Text style={styles.detailValue}>{payoutDetail.artist_name || 'Unknown Artist'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Method</Text>
                  <Text style={styles.detailValue}>{payoutDetail.payment_method || payoutDetail.payout_method || payoutDetail.method || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>{formatDate(payoutDetail.created_at || payoutDetail.payout_date)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Amount</Text>
                  <Text style={[styles.detailValue, { color: theme.success, fontWeight: '800' }]}>P{formatCurrency(payoutDetail.amount)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <StatusBadge status={payoutDetail.status || 'completed'} />
                </View>
                {(payoutDetail.reference_number || payoutDetail.reference_no) ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Reference No.</Text>
                    <Text style={styles.detailValue}>{payoutDetail.reference_number || payoutDetail.reference_no}</Text>
                  </View>
                ) : null}
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
                      onPress={() => selectPayoutArtist(a.id)}
                    >
                      <Text style={[styles.statusBtnText, String(payoutForm.artistId) === String(a.id) && styles.statusBtnTextActive]}>{a.name}</Text>
                    </AnimatedTouchable>
                  ))}
                </ScrollView>
              </View>
              {payoutErrors.artistId ? <Text style={styles.inlineError}>{payoutErrors.artistId}</Text> : null}

              {payoutForm.artistId && payoutBalanceLoading ? (
                <View style={styles.availableBalanceBox}>
                  <Text style={styles.availableBalanceLabel}>Loading payout balance...</Text>
                </View>
              ) : payoutForm.artistId && payoutBalanceError ? (
                <View style={styles.balanceErrorBox}>
                  <Text style={styles.balanceErrorText}>{payoutBalanceError}</Text>
                  <AnimatedTouchable style={styles.retryButton} onPress={loadPayoutBalances}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </AnimatedTouchable>
                </View>
              ) : payoutForm.artistId ? (
                <View style={styles.availableBalanceBox}>
                  <Text style={styles.availableBalanceLabel}>Available to pay</Text>
                  <Text style={styles.availableBalanceValue}>P{formatCurrency(selectedPayoutBalance?.availableBalance || 0)}</Text>
                </View>
              ) : null}

              <Text style={styles.inputLabel}>Amount (PHP)</Text>
              <TextInput
                style={[styles.input, payoutErrors.amount && styles.inputError]}
                value={payoutForm.amount}
                onChangeText={t => {
                  const amount = sanitizeCurrencyInput(t);
                  const next = { ...payoutForm, amount };
                  setPayoutForm(next);
                  setPayoutErrors(previous => ({ ...previous, amount: payoutFormErrors(next, selectedPayoutBalance?.availableBalance).amount || '' }));
                  setPayoutFeedback(null);
                }}
                keyboardType="numeric"
                placeholder="e.g. 5000"
                placeholderTextColor={theme.textTertiary}
              />
              {payoutErrors.amount ? <Text style={styles.inlineError}>{payoutErrors.amount}</Text> : null}

              <Text style={styles.inputLabel}>Payment Method</Text>
              <View style={styles.statusRow}>
                {['Cash', 'GCash', 'Bank Transfer'].map(m => (
                  <AnimatedTouchable key={m} style={[styles.statusBtn, payoutForm.method === m && styles.statusBtnActive]} onPress={() => {
                    const next = { ...payoutForm, method: m };
                    setPayoutForm(next);
                    setPayoutErrors(previous => ({ ...previous, method: '', reference: payoutFormErrors(next, selectedPayoutBalance?.availableBalance).reference || '' }));
                    setPayoutFeedback(null);
                  }}>
                    <Text style={[styles.statusBtnText, payoutForm.method === m && styles.statusBtnTextActive]}>{m}</Text>
                  </AnimatedTouchable>
                ))}
              </View>
              {payoutErrors.method ? <Text style={styles.inlineError}>{payoutErrors.method}</Text> : null}

              <Text style={styles.inputLabel}>Reference Number {payoutForm.method === 'Cash' ? '(Optional)' : '*'}</Text>
              <TextInput
                style={[styles.input, payoutErrors.reference && styles.inputError]}
                value={payoutForm.reference}
                onChangeText={t => {
                  const next = { ...payoutForm, reference: t.replace(/[<>\r\n]/g, '').slice(0, 100) };
                  setPayoutForm(next);
                  setPayoutErrors(previous => ({ ...previous, reference: payoutFormErrors(next, selectedPayoutBalance?.availableBalance).reference || '' }));
                  setPayoutFeedback(null);
                }}
                placeholder="Transaction ID..."
                placeholderTextColor={theme.textTertiary}
                maxLength={100}
              />
              {payoutErrors.reference ? <Text style={styles.inlineError}>{payoutErrors.reference}</Text> : null}

              <Text style={styles.payoutExternalNote}>Record this only after the cash, GCash, or bank transfer has been completed outside the system.</Text>

              {payoutFeedback ? (
                <View style={[styles.inlineFeedback, payoutFeedback.type === 'success' ? styles.inlineFeedbackSuccess : styles.inlineFeedbackError]}>
                  <Text style={[styles.inlineFeedbackText, { color: payoutFeedback.type === 'success' ? theme.success : theme.error }]}>{payoutFeedback.message}</Text>
                </View>
              ) : null}

              <AnimatedTouchable
                style={[styles.saveBtn, (payoutSubmitting || payoutBalanceLoading || !!payoutBalanceError || !payoutForm.artistId || !payoutForm.amount || Number(selectedPayoutBalance?.availableBalance || 0) <= 0) && styles.disabledButton]}
                onPress={handleRecordPayout}
                disabled={payoutSubmitting || payoutBalanceLoading || !!payoutBalanceError || !payoutForm.artistId || !payoutForm.amount || Number(selectedPayoutBalance?.availableBalance || 0) <= 0}
              >
                <Text style={styles.saveBtnText}>{payoutSubmitting ? 'Recording...' : 'Record Payout'}</Text>
              </AnimatedTouchable>
              <View style={{height: 20}} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Invoice Modal */}
      <Modal visible={createInvoiceModal} transparent animationType="slide" onRequestClose={closeCreateInvoice}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Draft Invoice</Text>
              <AnimatedTouchable onPress={closeCreateInvoice}>
                <X size={22} color={theme.textSecondary} />
              </AnimatedTouchable>
            </View>
            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
              <Text style={styles.inputLabel}>Client Name <Text style={{ color: theme.error }}>*</Text></Text>
              <TextInput
                style={[styles.input, invoiceErrors.clientName && { borderColor: theme.error }]}
                accessibilityLabel="Client name, required"
                placeholder="e.g. Juan Dela Cruz"
                placeholderTextColor={theme.textTertiary}
                value={invoiceForm.clientName}
                onChangeText={t => { changeInvoiceField('clientName', t.slice(0, 255)); setInvoiceClientFocused(true); }}
                onFocus={() => setInvoiceClientFocused(true)}
                onBlur={() => setTimeout(() => setInvoiceClientFocused(false), 180)}
                maxLength={255}
              />
              {invoiceErrors.clientName ? <Text accessibilityLiveRegion="polite" style={styles.fieldError}>{invoiceErrors.clientName}</Text> : null}
              {invoiceClientSuggestions.length > 0 ? (
                <View style={styles.clientSuggestionList}>
                  {invoiceClientSuggestions.map((customer, index) => (
                    <TouchableOpacity
                      key={String(customer.id)}
                      style={[styles.clientSuggestionItem, index === invoiceClientSuggestions.length - 1 && styles.clientSuggestionItemLast]}
                      onPressIn={() => selectInvoiceCustomer(customer)}
                    >
                      <View style={styles.clientSuggestionAvatar}>
                        <Text style={styles.clientSuggestionInitial}>{String(customer.name || '?').trim().charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={styles.clientSuggestionTextWrap}>
                        <Text style={styles.clientSuggestionName} numberOfLines={1}>{customer.name}</Text>
                        <Text style={styles.clientSuggestionEmail} numberOfLines={1}>{customer.email}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
              <Text style={styles.inputLabel}>Service Type</Text>
              <View style={styles.statusRow}>
                {['Tattoo Session', 'Consultation', 'Touch-up', 'Other'].map(srv => (
                  <AnimatedTouchable
                    key={srv}
                    style={[styles.statusBtn, invoiceForm.serviceType === srv && styles.statusBtnActive]}
                    onPress={() => setInvoiceForm({...invoiceForm, serviceType: srv})}
                  >
                    <Text style={[styles.statusBtnText, invoiceForm.serviceType === srv && styles.statusBtnTextActive]}>{srv}</Text>
                  </AnimatedTouchable>
                ))}
              </View>

              <Text style={styles.inputLabel}>Amount (PHP) <Text style={{ color: theme.error }}>*</Text></Text>
              <TextInput
                style={[styles.input, invoiceErrors.amount && { borderColor: theme.error }]}
                accessibilityLabel="Amount, required"
                placeholder="e.g. 3500"
                placeholderTextColor={theme.textTertiary}
                value={invoiceForm.amount}
                onChangeText={t => changeInvoiceField('amount', t)}
                keyboardType="numeric"
              />
              {invoiceErrors.amount ? <Text accessibilityLiveRegion="polite" style={styles.fieldError}>{invoiceErrors.amount}</Text> : null}

              <AnimatedTouchable style={styles.saveBtn} onPress={handleCreateInvoice}>
                <Text style={styles.saveBtnText}>Save Draft Invoice</Text>
              </AnimatedTouchable>
              <View style={{height: 20}} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Custom Date Range Modal */}
      <Modal visible={customDateModal} transparent animationType="fade" onRequestClose={() => setCustomDateModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.modalOverlay, { justifyContent: 'center' }]}>
          <View style={[styles.modalCard, { borderRadius: 24 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Custom Date Range</Text>
              <AnimatedTouchable onPress={() => setCustomDateModal(false)}>
                <X size={22} color={theme.textSecondary} />
              </AnimatedTouchable>
            </View>
            <View style={[styles.modalBody, { paddingBottom: 24 }]}>
              <Text style={{ ...styles.inputLabel, marginBottom: 8 }}>Enter dates in YYYY-MM-DD format.</Text>
              <Text style={styles.inputLabel}>Start Date</Text>
              <TextInput
                style={styles.input}
                placeholder="2025-01-01"
                placeholderTextColor={theme.textTertiary}
                value={pendingCustomStart}
                onChangeText={setPendingCustomStart}
              />
              <Text style={styles.inputLabel}>End Date</Text>
              <TextInput
                style={styles.input}
                placeholder="2025-12-31"
                placeholderTextColor={theme.textTertiary}
                value={pendingCustomEnd}
                onChangeText={setPendingCustomEnd}
              />
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <AnimatedTouchable
                  style={[styles.saveBtn, { flex: 1, backgroundColor: theme.surfaceLight, borderWidth: 1, borderColor: theme.border }]}
                  onPress={() => setCustomDateModal(false)}
                >
                  <Text style={[styles.saveBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                </AnimatedTouchable>
                <AnimatedTouchable
                  style={[styles.saveBtn, { flex: 1 }]}
                  onPress={() => {
                    if (!pendingCustomStart || !pendingCustomEnd) {
                      Alert.alert('Incomplete', 'Please enter both start and end dates.');
                      return;
                    }
                    setCustomStart(pendingCustomStart);
                    setCustomEnd(pendingCustomEnd);
                    setPeriodFilter('custom');
                    setCustomDateModal(false);
                  }}
                >
                  <Text style={styles.saveBtnText}>Apply</Text>
                </AnimatedTouchable>
              </View>
            </View>
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
  balanceSection: { marginBottom: 8 },
  balanceSectionTitle: { ...typography.h3, color: theme.textPrimary, marginBottom: 4 },
  balanceSectionSubtitle: { ...typography.bodySmall, color: theme.textSecondary, marginBottom: 12 },
  balanceCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.xl, padding: 16, marginBottom: 10, ...shadows.subtle },
  balanceCardText: { flex: 1, paddingRight: 12 },
  balanceArtistName: { ...typography.h4, color: theme.textPrimary },
  balanceLabel: { ...typography.bodyXSmall, color: theme.textSecondary, marginTop: 4 },
  balanceAmount: { ...typography.h3, color: theme.success, marginTop: 2 },
  balancePayButton: { backgroundColor: theme.gold, minWidth: 68, paddingVertical: 10, paddingHorizontal: 16, borderRadius: borderRadius.md, alignItems: 'center' },
  balancePayButtonText: { ...typography.bodySmall, color: theme.backgroundDeep, fontWeight: '800' },
  noBalancesText: { ...typography.bodySmall, color: theme.textSecondary, textAlign: 'center', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.lg, padding: 18 },
  balanceErrorBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: theme.errorBg || 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: theme.error, borderRadius: borderRadius.lg, padding: 14, marginBottom: 12 },
  balanceErrorText: { ...typography.bodySmall, color: theme.error, flex: 1 },
  retryButton: { borderWidth: 1, borderColor: theme.error, borderRadius: borderRadius.md, paddingHorizontal: 14, paddingVertical: 8 },
  retryButtonText: { ...typography.bodySmall, color: theme.error, fontWeight: '700' },
  historyHeading: { ...typography.h3, color: theme.textPrimary, marginTop: 22, marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border },
  detailLabel: { ...typography.bodySmall, color: theme.textSecondary, fontWeight: '600', textTransform: 'uppercase' },
  detailValue: { ...typography.body, color: theme.textPrimary, textAlign: 'right', fontWeight: '500', flex: 1, marginLeft: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,13,14,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: theme.surface, borderTopLeftRadius: borderRadius.xxl, borderTopRightRadius: borderRadius.xxl, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: theme.border },
  modalTitle: { ...typography.h3, color: theme.textPrimary },
  modalBody: { padding: 20 },
  fieldError: { color: theme.error, fontSize: 12, marginTop: -8, marginBottom: 14 },
  inputLabel: { ...typography.bodySmall, color: theme.textSecondary, marginBottom: 8, fontWeight: '600' },
  input: { backgroundColor: theme.surfaceLight, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.md, padding: 14, color: theme.textPrimary, ...typography.body, marginBottom: 20 },
  clientSuggestionList: { backgroundColor: theme.surfaceLight, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.md, marginTop: -14, marginBottom: 20, overflow: 'hidden' },
  clientSuggestionItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: theme.borderLight },
  clientSuggestionItemLast: { borderBottomWidth: 0 },
  clientSuggestionAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  clientSuggestionInitial: { ...typography.bodySmall, color: theme.gold, fontWeight: '800' },
  clientSuggestionTextWrap: { flex: 1 },
  clientSuggestionName: { ...typography.bodySmall, color: theme.textPrimary, fontWeight: '700' },
  clientSuggestionEmail: { ...typography.bodyXSmall, color: theme.textTertiary, marginTop: 2 },
  inputError: { borderColor: theme.error },
  inlineError: { ...typography.bodyXSmall, color: theme.error, marginTop: -14, marginBottom: 14 },
  availableBalanceBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.successBg || 'rgba(16,185,129,0.12)', borderRadius: borderRadius.md, padding: 12, marginBottom: 18 },
  availableBalanceLabel: { ...typography.bodySmall, color: theme.textSecondary, fontWeight: '600' },
  availableBalanceValue: { ...typography.h4, color: theme.success },
  inlineFeedback: { borderWidth: 1, borderRadius: borderRadius.md, padding: 12, marginBottom: 8 },
  inlineFeedbackSuccess: { backgroundColor: theme.successBg || 'rgba(16,185,129,0.12)', borderColor: theme.success },
  inlineFeedbackError: { backgroundColor: theme.errorBg || 'rgba(239,68,68,0.1)', borderColor: theme.error },
  inlineFeedbackText: { ...typography.bodySmall, fontWeight: '600' },
  payoutExternalNote: { ...typography.bodyXSmall, color: theme.textSecondary, lineHeight: 18, marginTop: -8, marginBottom: 14 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  statusBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: borderRadius.md, backgroundColor: theme.surfaceLight, borderWidth: 1, borderColor: theme.border },
  statusBtnActive: { backgroundColor: theme.primaryLight, borderColor: theme.gold },
  statusBtnText: { ...typography.bodySmall, color: theme.textSecondary, fontWeight: '600' },
  statusBtnTextActive: { color: theme.gold },
  saveBtn: { backgroundColor: theme.gold, padding: 16, borderRadius: borderRadius.lg, alignItems: 'center', marginTop: 10 },
  saveBtnText: { ...typography.body, color: theme.backgroundDeep, fontWeight: '700' },
  disabledButton: { opacity: 0.45 },
  emptyArtistText: { ...typography.bodySmall, color: theme.textTertiary, fontStyle: 'italic', padding: 8 },
});
