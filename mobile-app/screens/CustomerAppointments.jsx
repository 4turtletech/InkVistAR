/**
 * CustomerAppointments.jsx -- My Consultations (List + Calendar)
 * Themed with lucide icons. Preserves filters, pagination, detail modal, payment WebView.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, ActivityIndicator, Modal, Platform, Alert, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Calendar, List, ChevronLeft, ChevronRight, ChevronRight as ChevronR,
  X, Plus, CreditCard,
} from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { colors, typography, borderRadius, shadows } from '../src/theme';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { getCustomerAppointments, updateAppointmentStatus, createCheckoutSession, getPaymentStatus } from '../src/utils/api';

const ITEMS_PER_PAGE = 5;

export function CustomerAppointments({ customerId, onBack, onBookNew }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => { if (customerId) fetchAppointments(); }, [customerId]);

  const fetchAppointments = async () => {
    try {
      if (!refreshing) setLoading(true);
      const r = await getCustomerAppointments(customerId);
      if (r.success) { setAppointments(r.appointments || []); checkPaymentStatuses(r.appointments || []); }
    } catch (e) { console.log('Fetch error:', e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const checkPaymentStatuses = async (list) => {
    const toCheck = list.filter(a => a.payment_status !== 'paid' && parseFloat(a.price || 0) > 0);
    for (const apt of toCheck) {
      try {
        const r = await getPaymentStatus(apt.id);
        if (r.success && r.payment_status === 'paid') setAppointments(p => p.map(x => x.id === apt.id ? { ...x, payment_status: 'paid' } : x));
      } catch (e) { /* silent */ }
    }
  };

  const handlePayment = async () => {
    if (!selectedAppointment) return;
    setPaymentLoading(true);
    try {
      const r = await createCheckoutSession(selectedAppointment.id, selectedAppointment.price);
      if (r.success && r.checkoutUrl) { setPaymentUrl(r.checkoutUrl); setShowPaymentModal(true); }
      else Alert.alert('Payment Error', r.message || 'Could not initiate payment.');
    } catch (e) { Alert.alert('Error', 'Failed to connect to payment gateway.'); }
    finally { setPaymentLoading(false); }
  };

  const handlePaymentClose = () => { setShowPaymentModal(false); setPaymentUrl(null); setSelectedAppointment(null); fetchAppointments(); };
  const onRefresh = () => { setRefreshing(true); fetchAppointments(); };
  const changeMonth = (inc) => { const d = new Date(currentMonth); d.setMonth(d.getMonth() + inc); setCurrentMonth(d); };

  const handleCancel = (id) => {
    Alert.alert('Cancel Appointment', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
        try {
          const r = await updateAppointmentStatus(id, 'cancelled');
          if (r.success) { Alert.alert('Cancelled', 'Your appointment has been cancelled.'); setSelectedAppointment(null); fetchAppointments(); }
          else Alert.alert('Error', r.message || 'Failed.');
        } catch (e) { Alert.alert('Error', 'Could not connect.'); }
      }},
    ]);
  };

  // Calendar
  const renderCalendar = () => {
    const year = currentMonth.getFullYear(), month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<View key={`e-${i}`} style={styles.dayCell} />);
    for (let i = 1; i <= daysInMonth; i++) {
      const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const isSel = selectedDate === ds;
      const appsOnDay = appointments.filter(a => { if (!a.appointment_date) return false; const ad = typeof a.appointment_date === 'string' ? a.appointment_date.substring(0, 10) : new Date(a.appointment_date).toISOString().split('T')[0]; return ad === ds; });
      let dotColor = null;
      if (appsOnDay.length > 0) { if (appsOnDay.some(a => a.status === 'confirmed')) dotColor = colors.success; else if (appsOnDay.some(a => a.status === 'pending')) dotColor = colors.warning; else dotColor = colors.textTertiary; }
      days.push(
        <TouchableOpacity key={i} style={[styles.dayCell, isSel && styles.selectedDay]} onPress={() => setSelectedDate(isSel ? null : ds)}>
          <Text style={[styles.dayText, isSel && styles.selectedDayText]}>{i}</Text>
          {dotColor && <View style={[styles.calDot, { backgroundColor: dotColor }]} />}
        </TouchableOpacity>
      );
    }
    return days;
  };

  // Filter + Paginate
  const getFiltered = () => {
    let f = appointments;
    if (statusFilter !== 'all') f = f.filter(a => a.status?.toLowerCase() === statusFilter);
    if (viewMode === 'calendar' && selectedDate) f = f.filter(a => { const ad = typeof a.appointment_date === 'string' ? a.appointment_date.substring(0, 10) : new Date(a.appointment_date).toISOString().split('T')[0]; return ad === selectedDate; });
    return f;
  };
  const allFiltered = getFiltered();
  const totalPages = Math.ceil(allFiltered.length / ITEMS_PER_PAGE) || 1;
  const displayed = viewMode === 'list' ? allFiltered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE) : allFiltered;
  useEffect(() => { setCurrentPage(1); }, [statusFilter, viewMode]);

  const getStatusColor = (s) => { switch (s?.toLowerCase()) { case 'confirmed': return colors.success; case 'pending': return colors.warning; case 'completed': return colors.info; case 'cancelled': return colors.error; default: return colors.textTertiary; } };

  const renderItem = (item, index) => (
    <TouchableOpacity key={`appt-${item.id || index}`} style={styles.card} onPress={() => setSelectedAppointment(item)} activeOpacity={0.8}>
      <View style={styles.cardLeft}>
        <View style={styles.dateBox}>
          <Text style={styles.dateDay}>{new Date(item.appointment_date).getDate()}</Text>
          <Text style={styles.dateMonth}>{new Date(item.appointment_date).toLocaleString('default', { month: 'short' })}</Text>
        </View>
      </View>
      <View style={styles.cardCenter}>
        <Text style={styles.serviceText}>{item.design_title || 'Appointment'}</Text>
        <Text style={styles.artistText}>with {item.artist_name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
          <Text style={styles.timeText}>{item.start_time ? item.start_time.substring(0, 5) : 'TBD'}</Text>
          <Text style={styles.priceText}>P{parseFloat(item.price || 0).toLocaleString()}</Text>
        </View>
      </View>
      <View style={styles.cardRight}>
        <View style={[styles.statusPill, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusPillText, { color: getStatusColor(item.status) }]}>{item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Pending'}</Text>
        </View>
        <ChevronR size={14} color={colors.primary} style={{ marginTop: 6 }} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Consultations</Text>
        <TouchableOpacity onPress={() => setViewMode(v => v === 'list' ? 'calendar' : 'list')} style={styles.headerBtn}>
          {viewMode === 'list' ? <Calendar size={20} color={colors.textPrimary} /> : <List size={20} color={colors.textPrimary} />}
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabs}>
        {['all', 'pending', 'confirmed'].map(f => (
          <TouchableOpacity key={f} style={[styles.tab, statusFilter === f && styles.tabActive]} onPress={() => setStatusFilter(f)}>
            <Text style={[styles.tabText, statusFilter === f && styles.tabTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: 100, paddingTop: 14 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <View style={styles.calCard}>
            <View style={styles.calHeader}>
              <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthBtn}><ChevronLeft size={18} color={colors.textPrimary} /></TouchableOpacity>
              <Text style={styles.monthText}>{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
              <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthBtn}><ChevronRight size={18} color={colors.textPrimary} /></TouchableOpacity>
            </View>
            <View style={styles.weekRow}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <Text key={i} style={styles.weekDayText}>{d}</Text>)}</View>
            <View style={styles.daysGrid}>{renderCalendar()}</View>
            {selectedDate && <TouchableOpacity onPress={() => setSelectedDate(null)} style={styles.clearDate}><Text style={styles.clearDateText}>Clear Date Filter</Text></TouchableOpacity>}
          </View>
        )}

        {/* List */}
        {loading ? <PremiumLoader message="Loading appointments..." /> : (
          <View>
            {displayed.length > 0 ? displayed.map((item, i) => renderItem(item, i)) : (
              <EmptyState icon={Calendar} title="No consultation requests found" subtitle="Tap + to create a new one" />
            )}
          </View>
        )}

        {/* Pagination */}
        {viewMode === 'list' && allFiltered.length > 0 && (
          <View style={styles.pagination}>
            <TouchableOpacity style={[styles.pageBtn, currentPage === 1 && { opacity: 0.4 }]} onPress={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
              <ChevronLeft size={18} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.pageInfo}>Page {currentPage} of {totalPages}</Text>
            <TouchableOpacity style={[styles.pageBtn, currentPage === totalPages && { opacity: 0.4 }]} onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
              <ChevronRight size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={onBookNew} activeOpacity={0.8}>
        <LinearGradient colors={['#0f172a', colors.primary]} style={styles.fabGradient}>
          <Plus size={24} color="#ffffff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Detail Modal */}
      <Modal visible={!!selectedAppointment} transparent animationType="slide" onRequestClose={() => setSelectedAppointment(null)}>
        <View style={modalS.overlay}>
          <View style={modalS.content}>
            <View style={modalS.header}>
              <Text style={modalS.title}>Appointment Details</Text>
              <TouchableOpacity onPress={() => setSelectedAppointment(null)}><X size={22} color={colors.textSecondary} /></TouchableOpacity>
            </View>
            {selectedAppointment && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {[
                  ['Status', () => <View style={[modalS.badge, { backgroundColor: getStatusColor(selectedAppointment.status) + '20' }]}><Text style={[modalS.badgeText, { color: getStatusColor(selectedAppointment.status) }]}>{selectedAppointment.status?.toUpperCase()}</Text></View>],
                  ['Payment Status', () => <View style={[modalS.badge, { backgroundColor: selectedAppointment.payment_status === 'paid' ? '#dcfce7' : '#fef3c7' }]}><Text style={[modalS.badgeText, { color: selectedAppointment.payment_status === 'paid' ? '#059669' : '#b45309' }]}>{(selectedAppointment.payment_status || 'unpaid').toUpperCase()}</Text></View>],
                  ['Date & Time', () => <Text style={modalS.value}>{new Date(selectedAppointment.appointment_date).toLocaleDateString()} at {selectedAppointment.start_time}</Text>],
                  ['Artist', () => <><Text style={modalS.value}>{selectedAppointment.artist_name}</Text><Text style={modalS.subValue}>{selectedAppointment.studio_name}</Text></>],
                  ['Price', () => <Text style={[modalS.value, { color: colors.primaryDark, fontWeight: '700' }]}>P{parseFloat(selectedAppointment.price || 0).toLocaleString()}</Text>],
                  ['Service / Design', () => <Text style={modalS.value}>{selectedAppointment.design_title}</Text>],
                  ...(selectedAppointment.notes ? [['Notes', () => <Text style={modalS.value}>{selectedAppointment.notes}</Text>]] : []),
                ].map(([label, render], i) => <View key={i} style={modalS.row}><Text style={modalS.label}>{label}</Text>{render()}</View>)}
              </ScrollView>
            )}

            {(selectedAppointment?.status === 'confirmed' || selectedAppointment?.status === 'completed') && selectedAppointment?.payment_status !== 'paid' && (
              <TouchableOpacity style={modalS.payBtn} onPress={handlePayment} disabled={paymentLoading} activeOpacity={0.8}>
                <LinearGradient colors={['#0f172a', colors.primary]} style={modalS.payGradient}>
                  {paymentLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                    <><CreditCard size={18} color="#fff" /><Text style={modalS.payText}>Pay Now (P{parseFloat(selectedAppointment?.price || 0).toLocaleString()})</Text></>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}

            {['pending', 'confirmed', 'pending_schedule'].includes(selectedAppointment?.status) && (
              <TouchableOpacity style={modalS.cancelBtn} onPress={() => handleCancel(selectedAppointment.id)}>
                <Text style={modalS.cancelText}>Cancel Appointment</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={modalS.closeBtn} onPress={() => setSelectedAppointment(null)}>
              <Text style={modalS.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Payment WebView Modal */}
      <Modal visible={showPaymentModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <TouchableOpacity onPress={handlePaymentClose} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <X size={22} color={colors.textPrimary} />
              <Text style={{ marginLeft: 8, ...typography.body, fontWeight: '700', color: colors.textPrimary }}>Close Checkout</Text>
            </TouchableOpacity>
          </View>
          {paymentUrl && <WebView source={{ uri: paymentUrl }} style={{ flex: 1 }} startInLoadingState renderLoading={() => <ActivityIndicator style={{ position: 'absolute', top: '50%', left: '50%' }} size="large" color={colors.primary} />} />}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: Platform.OS === 'android' ? 52 : 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  headerBtn: { padding: 8 },
  tabs: { flexDirection: 'row', padding: 14, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: borderRadius.round, marginHorizontal: 3, backgroundColor: colors.lightBgSecondary },
  tabActive: { backgroundColor: '#0f172a' },
  tabText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: colors.primary },
  calCard: { backgroundColor: '#ffffff', borderRadius: borderRadius.xl, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.border },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  monthBtn: { padding: 6 },
  monthText: { ...typography.body, fontWeight: '700', color: colors.textPrimary },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  weekDayText: { width: '14.28%', textAlign: 'center', ...typography.bodyXSmall, color: colors.textTertiary, fontWeight: '600' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 20, marginBottom: 4 },
  selectedDay: { backgroundColor: colors.primary },
  dayText: { ...typography.bodySmall, color: colors.textPrimary },
  selectedDayText: { color: '#ffffff', fontWeight: '700' },
  calDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  clearDate: { marginTop: 10, alignItems: 'center', padding: 6 },
  clearDateText: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' },
  card: { flexDirection: 'row', backgroundColor: '#ffffff', borderRadius: borderRadius.xl, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  cardLeft: { marginRight: 12, justifyContent: 'center' },
  dateBox: { alignItems: 'center', backgroundColor: colors.primaryLight, padding: 8, borderRadius: borderRadius.md, width: 48 },
  dateDay: { fontSize: 18, fontWeight: '800', color: colors.primaryDark },
  dateMonth: { ...typography.bodyXSmall, color: colors.primaryDark, textTransform: 'uppercase' },
  cardCenter: { flex: 1, justifyContent: 'center' },
  serviceText: { ...typography.body, fontWeight: '700', color: colors.textPrimary },
  artistText: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  timeText: { ...typography.bodyXSmall, color: colors.textTertiary },
  priceText: { ...typography.bodyXSmall, color: colors.textPrimary, fontWeight: '700', marginLeft: 8 },
  cardRight: { alignItems: 'flex-end', justifyContent: 'space-between' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.sm },
  statusPillText: { ...typography.bodyXSmall, fontWeight: '700', textTransform: 'capitalize' },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.borderLight },
  pageBtn: { padding: 8, borderRadius: borderRadius.md, backgroundColor: colors.lightBgSecondary },
  pageInfo: { ...typography.bodySmall, color: colors.textTertiary },
  fab: { position: 'absolute', bottom: 24, right: 24, borderRadius: 28, overflow: 'hidden', ...shadows.button },
  fabGradient: { width: 56, height: 56, justifyContent: 'center', alignItems: 'center' },
});

const modalS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 20 },
  content: { backgroundColor: '#ffffff', borderRadius: borderRadius.xxl, padding: 20, maxHeight: '80%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottomWidth: 1, borderBottomColor: colors.borderLight, paddingBottom: 10 },
  title: { ...typography.h3, color: colors.textPrimary },
  row: { marginBottom: 14 },
  label: { ...typography.bodyXSmall, color: colors.textTertiary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { ...typography.body, color: colors.textPrimary, fontWeight: '500' },
  subValue: { ...typography.bodySmall, color: colors.textSecondary },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.sm, alignSelf: 'flex-start' },
  badgeText: { ...typography.bodyXSmall, fontWeight: '700' },
  payBtn: { borderRadius: borderRadius.xl, overflow: 'hidden', marginTop: 8, marginBottom: 8 },
  payGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  payText: { ...typography.button, color: '#ffffff' },
  cancelBtn: { backgroundColor: '#fee2e2', padding: 12, borderRadius: borderRadius.md, alignItems: 'center', marginBottom: 8 },
  cancelText: { ...typography.body, color: colors.error, fontWeight: '700' },
  closeBtn: { backgroundColor: colors.lightBgSecondary, padding: 12, borderRadius: borderRadius.md, alignItems: 'center', marginTop: 4 },
  closeBtnText: { ...typography.body, color: colors.textSecondary, fontWeight: '600' },
});