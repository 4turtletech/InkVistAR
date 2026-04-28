/**
 * ArtistSchedule.jsx -- Calendar + List Schedule (Gilded Noir v2)
 * Theme-aware, animated, gold accents. Filters, sort, calendar, appointment cards, detail & add modals.
 */
import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, Modal, TextInput, Animated, Pressable, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import {
  ArrowLeft, Calendar, CheckCircle2, ArrowUpDown, ChevronLeft, ChevronRight,
  Clock, User, X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { typography } from '../src/theme';
import { useTheme } from '../src/context/ThemeContext';
import { AnimatedTouchable } from '../src/components/shared/AnimatedTouchable';
import { getArtistAppointments, updateAppointmentStatus, createArtistAppointment, updateAppointmentDetails } from '../src/utils/api';

export function ArtistSchedule({ onBack, artistId, navigation, route }) {
  const { theme: colors, hapticsEnabled } = useTheme();
  const styles = getStyles(colors);
  const modalS = getModalStyles(colors);

  const [selectedFilter, setSelectedFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('asc');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [visibleCount, setVisibleCount] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTime, setNewTime] = useState('10:00');
  const [newDesign, setNewDesign] = useState('');
  const [alertModal, setAlertModal] = useState({ visible: false, title: '', message: '' });

  // Detail modal animation
  const slideAnim = useRef(new Animated.Value(800)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const openDetail = (apt) => {
    setSelectedAppointment(apt);
    setDetailModalVisible(true);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, damping: 18, stiffness: 120, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const closeDetail = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 800, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => { setDetailModalVisible(false); setSelectedAppointment(null); });
  };

  useEffect(() => {
    if (route?.params?.openAppointmentId && appointments.length > 0) {
      const apt = appointments.find(a => a.id === route.params.openAppointmentId);
      if (apt) {
        openDetail(apt);
        navigation.setParams({ openAppointmentId: undefined });
      }
    }
  }, [route?.params?.openAppointmentId, appointments]);

  const filters = [
    { id: 'all', label: 'All' }, { id: 'today', label: 'Today' }, { id: 'upcoming', label: 'Upcoming' },
    { id: 'pending', label: 'Pending' }, { id: 'completed', label: 'Finished' }, { id: 'cancelled', label: 'Cancelled' },
  ];

  useFocusEffect(
    useCallback(() => {
      loadAppointments();
    }, [artistId])
  );

  const loadAppointments = async () => {
    if (!artistId) return;
    setLoading(true);
    const r = await getArtistAppointments(artistId);
    if (r.success) setAppointments(r.appointments || []);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  };

  const handleStatusUpdate = async (id, newStatus) => {
    const r = await updateAppointmentStatus(id, newStatus);
    r.success ? loadAppointments() : setAlertModal({ visible: true, title: 'Error', message: 'Failed to update status' });
  };

  const handleAddAppointment = async () => {
    if (!newClientEmail || !newDate || !newTime) { setAlertModal({ visible: true, title: 'Missing Fields', message: 'Fill in all required fields.' }); return; }
    const r = await createArtistAppointment({ artistId, clientEmail: newClientEmail, date: newDate, startTime: newTime, designTitle: newDesign || 'Consultation' });
    if (r.success) { setAlertModal({ visible: true, title: 'Success', message: 'Appointment scheduled!' }); setModalVisible(false); loadAppointments(); }
    else { setAlertModal({ visible: true, title: 'Error', message: r.message || 'Failed to schedule' }); }
  };

  const changeMonth = (inc) => { const d = new Date(currentMonth); d.setMonth(d.getMonth() + inc); setCurrentMonth(d); };

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
      if (appsOnDay.length > 0) {
        if (appsOnDay.some(a => a.status === 'in_progress')) dotColor = colors.info;
        else if (appsOnDay.some(a => a.status === 'confirmed')) dotColor = colors.success;
        else if (appsOnDay.some(a => a.status === 'pending')) dotColor = colors.warning;
        else if (appsOnDay.some(a => a.status === 'completed')) dotColor = colors.gold;
        else if (appsOnDay.some(a => a.status === 'cancelled')) dotColor = colors.error;
        else dotColor = colors.textTertiary;
      }
      days.push(
        <AnimatedTouchable key={i} style={[styles.dayCell, isSel && styles.selectedDay, !isSel && dotColor && { backgroundColor: dotColor + '15', borderWidth: 1, borderColor: dotColor + '40' }]} onPress={() => { if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedDate(isSel ? null : ds); if (selectedFilter === 'today') setSelectedFilter('all'); }}>
          <Text style={[styles.dayText, isSel && styles.selectedDayText, !isSel && dotColor && { color: dotColor, fontWeight: '800' }]}>{i}</Text>
        </AnimatedTouchable>
      );
    }
    return days;
  };

  const filteredAppointments = appointments.filter(apt => {
    if (selectedFilter === 'today') { const now = new Date(); const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; return apt.appointment_date?.startsWith(ts); }
    if (selectedDate && (!apt.appointment_date || !apt.appointment_date.startsWith(selectedDate))) return false;
    if (selectedFilter === 'all') return true;
    const s = (apt.status || 'pending').toLowerCase();
    if (selectedFilter === 'upcoming') return s === 'confirmed';
    if (selectedFilter === 'pending') return s === 'pending';
    if (selectedFilter === 'completed') return s === 'completed';
    if (selectedFilter === 'cancelled') return s === 'cancelled';
    return true;
  }).sort((a, b) => {
    const gd = (ds, ts) => { const d = new Date(ds); if (ts) { const [h, m] = ts.split(':'); d.setHours(parseInt(h || 0), parseInt(m || 0)); } return d; };
    return sortOrder === 'asc' ? gd(a.appointment_date, a.start_time) - gd(b.appointment_date, b.start_time) : gd(b.appointment_date, b.start_time) - gd(a.appointment_date, a.start_time);
  });

  const getStatusStyle = (s) => {
    switch (s?.toLowerCase()) {
      case 'confirmed': return { bg: colors.iconGoldBg, color: colors.gold };
      case 'pending': return { bg: colors.warningBg, color: colors.warning };
      case 'completed': return { bg: colors.successBg, color: colors.success };
      case 'cancelled': return { bg: colors.errorBg, color: colors.error };
      default: return { bg: colors.surfaceLight, color: colors.textTertiary };
    }
  };

  const getPaymentColor = (ps) => ps === 'paid' ? colors.success : ps === 'pending' ? colors.warning : colors.textTertiary;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <AnimatedTouchable onPress={onBack} style={styles.backBtn}><ArrowLeft size={20} color={colors.textPrimary} /></AnimatedTouchable>
          <Text style={styles.headerTitle}>My Schedule</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBadge}><Calendar size={14} color={colors.gold} /><Text style={styles.statText}>{appointments.length} Total</Text></View>
          <View style={styles.statBadge}><CheckCircle2 size={14} color={colors.success} /><Text style={styles.statText}>{appointments.filter(a => a.status === 'confirmed').length} Confirmed</Text></View>
        </View>

        <View style={styles.content}>
          {/* Sort */}
          <View style={styles.sortRow}>
            <AnimatedTouchable style={styles.sortBtn} onPress={() => { if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSortOrder(p => p === 'asc' ? 'desc' : 'asc'); }}>
              <ArrowUpDown size={14} color={colors.textSecondary} />
              <Text style={styles.sortText}>Date: {sortOrder === 'asc' ? 'Oldest' : 'Newest'}</Text>
            </AnimatedTouchable>
          </View>

          {/* Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {filters.map(f => (
              <AnimatedTouchable key={f.id} onPress={() => {
                if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (f.id === 'today') { const n = new Date(); setCurrentMonth(n); const ds = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`; setSelectedDate(ds); setSelectedFilter('today'); }
                else { setSelectedFilter(f.id); setSelectedDate(null); }
                setVisibleCount(10);
              }} style={[styles.filterChip, selectedFilter === f.id && styles.filterChipActive]}>
                <Text style={[styles.filterText, selectedFilter === f.id && styles.filterTextActive]}>{f.label}</Text>
              </AnimatedTouchable>
            ))}
          </ScrollView>

          {/* Calendar */}
          <View style={styles.calCard}>
            <View style={styles.calHeader}>
              <AnimatedTouchable onPress={() => changeMonth(-1)} style={styles.monthBtn}><ChevronLeft size={18} color={colors.textPrimary} /></AnimatedTouchable>
              <Text style={styles.monthText}>{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
              <AnimatedTouchable onPress={() => changeMonth(1)} style={styles.monthBtn}><ChevronRight size={18} color={colors.textPrimary} /></AnimatedTouchable>
            </View>
            <View style={styles.weekRow}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <Text key={i} style={styles.weekDayText}>{d}</Text>)}</View>
            <View style={styles.daysGrid}>{renderCalendar()}</View>
            {/* Color Legend */}
            <View style={styles.legendRow}>
              {[
                { label: 'Confirmed', color: colors.success },
                { label: 'Pending', color: colors.warning },
                { label: 'In Progress', color: colors.info },
                { label: 'Completed', color: colors.gold },
                { label: 'Cancelled', color: colors.error },
              ].map(l => (
                <View key={l.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                  <Text style={styles.legendText}>{l.label}</Text>
                </View>
              ))}
            </View>
            {selectedDate && <AnimatedTouchable onPress={() => setSelectedDate(null)} style={styles.clearDate}><Text style={styles.clearDateText}>Clear Date Filter</Text></AnimatedTouchable>}
          </View>

          {loading && <ActivityIndicator size="large" color={colors.gold} />}

          {/* Appointments List */}
          <Text style={styles.sectionTitle}>Appointments</Text>
          {filteredAppointments.length === 0 && <Text style={{ color: colors.textTertiary, fontStyle: 'italic', marginTop: 8 }}>No appointments found for this filter.</Text>}
          {filteredAppointments.slice(0, visibleCount).map(apt => {
            const ss = getStatusStyle(apt.status);
            return (
              <AnimatedTouchable key={apt.id} style={styles.aptCard} onPress={() => openDetail(apt)} activeOpacity={0.85}>
                <View style={styles.aptHeader}>
                  <View style={styles.aptTimeRow}>
                    <Clock size={16} color={colors.gold} />
                    <Text style={styles.aptTime}>{apt.start_time}</Text>
                    <View style={styles.aptDateBadge}><Text style={styles.aptDateText}>{new Date(apt.appointment_date).toLocaleDateString()}</Text></View>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: ss.bg }]}><Text style={[styles.statusPillText, { color: ss.color }]}>{apt.status ? apt.status.charAt(0).toUpperCase() + apt.status.slice(1) : 'Pending'}</Text></View>
                </View>
                <View style={styles.aptDetails}>
                  <View style={styles.clientRow}>
                    <View style={styles.clientAvatar}><User size={18} color={colors.textTertiary} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clientName}>{apt.client_name}</Text>
                      <Text style={styles.aptType}>{apt.design_title || 'Consultation'}</Text>
                    </View>
                  </View>
                  <View style={styles.durationBadge}><Clock size={12} color={colors.textTertiary} /><Text style={styles.durationText}>1h</Text></View>
                </View>
                <View style={styles.aptFooter}>
                  <Text style={styles.aptPrice}>P{parseFloat(apt.price || 0).toLocaleString()}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: getPaymentColor(apt.payment_status), marginRight: 4 }} />
                    <Text style={styles.aptPayment}>{apt.payment_status || 'unpaid'}</Text>
                  </View>
                </View>
                {(apt.status === 'confirmed' || apt.status === 'in_progress') && (
                  <View style={styles.aptActions}>
                    <AnimatedTouchable style={styles.manageBtn} onPress={() => navigation.navigate('artist-active-session', { appointment: apt })}>
                      <Text style={styles.manageBtnText}>Manage Session</Text>
                    </AnimatedTouchable>
                  </View>
                )}
              </AnimatedTouchable>
            );
          })}
          {visibleCount < filteredAppointments.length && (
            <AnimatedTouchable style={styles.loadMore} onPress={() => setVisibleCount(p => p + 10)}><Text style={styles.loadMoreText}>Load More</Text></AnimatedTouchable>
          )}
        </View>
      </ScrollView>

      {/* Add Appointment Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={modalS.overlay}>
          <View style={modalS.content}>
            <View style={modalS.header}><Text style={modalS.title}>New Appointment</Text><TouchableOpacity onPress={() => setModalVisible(false)}><X size={22} color={colors.textPrimary} /></TouchableOpacity></View>
            <Text style={modalS.label}>Client Email</Text><TextInput style={modalS.input} placeholder="client@email.com" placeholderTextColor={colors.textTertiary} value={newClientEmail} onChangeText={setNewClientEmail} autoCapitalize="none" />
            <Text style={modalS.label}>Date (YYYY-MM-DD)</Text><TextInput style={modalS.input} placeholder="2024-01-30" placeholderTextColor={colors.textTertiary} value={newDate} onChangeText={setNewDate} />
            <Text style={modalS.label}>Time (HH:MM)</Text><TextInput style={modalS.input} placeholder="14:00" placeholderTextColor={colors.textTertiary} value={newTime} onChangeText={setNewTime} />
            <Text style={modalS.label}>Design / Type</Text><TextInput style={modalS.input} placeholder="Sleeve, Touch-up..." placeholderTextColor={colors.textTertiary} value={newDesign} onChangeText={setNewDesign} />
            <AnimatedTouchable style={modalS.saveBtn} onPress={handleAddAppointment}><Text style={modalS.saveBtnText}>Schedule</Text></AnimatedTouchable>
          </View>
        </View>
      </Modal>

      {/* Detail Modal with Spring Animation */}
      <Modal visible={detailModalVisible} transparent animationType="none" onRequestClose={closeDetail}>
        <Animated.View style={[modalS.overlay, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDetail} />
          <Animated.View style={[modalS.content, { transform: [{ translateY: slideAnim }] }]}>
            <View style={modalS.handle}><View style={modalS.handleBar} /></View>
            <View style={modalS.header}><Text style={modalS.title}>Appointment Details</Text><TouchableOpacity onPress={closeDetail}><X size={22} color={colors.textPrimary} /></TouchableOpacity></View>
            {selectedAppointment && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {[
                  ['Client', () => <><Text style={modalS.value}>{selectedAppointment.client_name}</Text><Text style={modalS.subValue}>{selectedAppointment.client_email}</Text></>],
                  ['Date & Time', () => <Text style={modalS.value}>{new Date(selectedAppointment.appointment_date).toDateString()} at {selectedAppointment.start_time}</Text>],
                  ['Service', () => <Text style={modalS.value}>{selectedAppointment.design_title}</Text>],
                  ['Price', () => <Text style={[modalS.value, { fontWeight: '700', color: colors.gold }]}>P{parseFloat(selectedAppointment.price || 0).toLocaleString()}</Text>],
                  ['Status', () => <Text style={[modalS.value, { color: colors.gold, fontWeight: '700' }]}>{selectedAppointment.status?.toUpperCase()}</Text>],
                  ['Payment', () => <Text style={[modalS.value, { color: getPaymentColor(selectedAppointment.payment_status), fontWeight: '700' }]}>{(selectedAppointment.payment_status || 'unpaid').toUpperCase()}</Text>],
                  ...(selectedAppointment.notes ? [['Notes', () => <Text style={modalS.value}>{selectedAppointment.notes}</Text>]] : []),
                ].map(([label, render], i) => <View key={i} style={modalS.row}><Text style={modalS.label}>{label}</Text>{render()}</View>)}
              </ScrollView>
            )}
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Alert Modal */}
      <Modal visible={alertModal.visible} animationType="fade" transparent>
        <View style={modalS.overlay}>
          <View style={[modalS.content, { alignItems: 'center' }]}>
            <Text style={{ ...typography.h3, color: colors.textPrimary, marginBottom: 8 }}>{alertModal.title}</Text>
            <Text style={{ ...typography.body, color: colors.textSecondary, marginBottom: 20, textAlign: 'center' }}>{alertModal.message}</Text>
            <AnimatedTouchable style={[modalS.saveBtn, { width: '100%' }]} onPress={() => setAlertModal({ ...alertModal, visible: false })}>
              <Text style={modalS.saveBtnText}>OK</Text>
            </AnimatedTouchable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 16 },
  statBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: colors.border,
  },
  statText: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '600' },
  content: { padding: 16, paddingBottom: 60 },
  sortRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.surface,
    borderRadius: 20, borderWidth: 1, borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  filterText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  filterTextActive: { color: colors.backgroundDeep },
  calCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: colors.border,
  },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  monthBtn: { padding: 4 },
  monthText: { ...typography.body, fontWeight: '700', color: colors.textPrimary },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  weekDayText: { width: '14.28%', textAlign: 'center', ...typography.bodyXSmall, color: colors.textTertiary, fontWeight: '600' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 20, marginBottom: 4 },
  selectedDay: { backgroundColor: colors.gold },
  dayText: { ...typography.bodySmall, color: colors.textPrimary },
  selectedDayText: { color: colors.backgroundDeep, fontWeight: '700' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { ...typography.bodyXSmall, color: colors.textTertiary },
  clearDate: { marginTop: 10, alignItems: 'center', padding: 6 },
  clearDateText: { ...typography.bodySmall, color: colors.gold, fontWeight: '600' },
  sectionTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: 10 },
  aptCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  aptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  aptTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aptTime: { ...typography.body, fontWeight: '700', color: colors.gold },
  aptDateBadge: { backgroundColor: colors.surfaceLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  aptDateText: { ...typography.bodyXSmall, color: colors.textSecondary, fontWeight: '600' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPillText: { ...typography.bodyXSmall, fontWeight: '700' },
  aptDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  clientRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  clientAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceLight,
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  clientName: { ...typography.body, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  aptType: { ...typography.bodySmall, color: colors.textSecondary },
  durationBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  durationText: { ...typography.bodyXSmall, color: colors.textTertiary, fontWeight: '600' },
  aptFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  aptPrice: { ...typography.body, fontWeight: '700', color: colors.textPrimary },
  aptPayment: { ...typography.bodyXSmall, color: colors.textTertiary, textTransform: 'uppercase', fontWeight: '600' },
  aptActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  manageBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 11, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.gold,
  },
  manageBtnText: { ...typography.bodySmall, color: colors.backgroundDeep, fontWeight: '700' },
  loadMore: {
    paddingVertical: 12, alignItems: 'center', marginTop: 8,
    backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
  },
  loadMoreText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
});

const getModalStyles = (colors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  content: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%', borderWidth: 1, borderColor: colors.border },
  handle: { alignItems: 'center', paddingTop: 4, paddingBottom: 8 },
  handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  title: { ...typography.h3, color: colors.textPrimary },
  label: { ...typography.bodySmall, fontWeight: '600', marginBottom: 6, color: colors.textSecondary },
  value: { ...typography.body, color: colors.textPrimary, marginBottom: 10 },
  subValue: { ...typography.bodySmall, color: colors.textTertiary, marginBottom: 10 },
  row: { marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginBottom: 14,
    ...typography.body, color: colors.textPrimary, backgroundColor: colors.surfaceLight,
  },
  saveBtn: { borderRadius: 12, backgroundColor: colors.gold, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  saveBtnText: { ...typography.button, color: colors.backgroundDeep },
});
