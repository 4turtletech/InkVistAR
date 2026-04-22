/**
 * ArtistSchedule.jsx -- Calendar + List Schedule for Artist
 * Themed with lucide icons. Filters, sort, calendar, appointment cards, detail & add modals.
 */

import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Calendar, CheckCircle2, ArrowUpDown, ChevronLeft, ChevronRight,
  Clock, User, PlayCircle, X,
} from 'lucide-react-native';
import { colors, typography, borderRadius, shadows } from '../src/theme';
import { getArtistAppointments, updateAppointmentStatus, createArtistAppointment, updateAppointmentDetails } from '../src/utils/api';

export function ArtistSchedule({ onBack, artistId, navigation }) {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('asc');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [visibleCount, setVisibleCount] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTime, setNewTime] = useState('10:00');
  const [newDesign, setNewDesign] = useState('');

  const filters = [
    { id: 'all', label: 'All' }, { id: 'today', label: 'Today' }, { id: 'upcoming', label: 'Upcoming' },
    { id: 'pending', label: 'Pending' }, { id: 'completed', label: 'Finished' }, { id: 'cancelled', label: 'Cancelled' },
  ];

  useEffect(() => { loadAppointments(); }, [artistId]);

  const loadAppointments = async () => {
    if (!artistId) return;
    setLoading(true);
    const r = await getArtistAppointments(artistId);
    if (r.success) setAppointments(r.appointments || []);
    setLoading(false);
  };

  const handleStatusUpdate = async (id, newStatus) => {
    const r = await updateAppointmentStatus(id, newStatus);
    r.success ? loadAppointments() : Alert.alert('Error', 'Failed to update status');
  };

  const handleAddAppointment = async () => {
    if (!newClientEmail || !newDate || !newTime) { Alert.alert('Missing Fields', 'Fill in all required fields.'); return; }
    const r = await createArtistAppointment({ artistId, clientEmail: newClientEmail, date: newDate, startTime: newTime, designTitle: newDesign || 'Consultation' });
    r.success ? (Alert.alert('Success', 'Appointment scheduled!'), setModalVisible(false), loadAppointments()) : Alert.alert('Error', r.message || 'Failed to schedule');
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
      if (appsOnDay.length > 0) { if (appsOnDay.some(a => a.status === 'confirmed')) dotColor = colors.primary; else if (appsOnDay.some(a => a.status === 'pending')) dotColor = colors.error; else dotColor = colors.textTertiary; }
      days.push(
        <TouchableOpacity key={i} style={[styles.dayCell, isSel && styles.selectedDay]} onPress={() => { setSelectedDate(isSel ? null : ds); if (selectedFilter === 'today') setSelectedFilter('all'); }}>
          <Text style={[styles.dayText, isSel && styles.selectedDayText]}>{i}</Text>
          {dotColor && <View style={[styles.calDot, { backgroundColor: dotColor }]} />}
        </TouchableOpacity>
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
      case 'confirmed': return { bg: colors.primaryLight, color: colors.primaryDark };
      case 'pending': return { bg: '#fee2e2', color: colors.error };
      case 'completed': return { bg: '#d1fae5', color: colors.success };
      case 'cancelled': return { bg: colors.lightBgSecondary, color: colors.textTertiary };
      default: return { bg: colors.lightBgSecondary, color: colors.textTertiary };
    }
  };

  const getPaymentColor = (ps) => ps === 'paid' ? colors.success : ps === 'pending' ? colors.warning : colors.textTertiary;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Header */}
        <LinearGradient colors={['#0f172a', colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onBack} style={styles.backBtn}><ArrowLeft size={20} color="#fff" /></TouchableOpacity>
            <Text style={styles.headerTitle}>My Schedule</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statBadge}><Calendar size={14} color="#fff" /><Text style={styles.statText}>{appointments.length} Total</Text></View>
            <View style={styles.statBadge}><CheckCircle2 size={14} color="#fff" /><Text style={styles.statText}>{appointments.filter(a => a.status === 'confirmed').length} Confirmed</Text></View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Sort */}
          <View style={styles.sortRow}>
            <TouchableOpacity style={styles.sortBtn} onPress={() => setSortOrder(p => p === 'asc' ? 'desc' : 'asc')}>
              <ArrowUpDown size={14} color={colors.textSecondary} />
              <Text style={styles.sortText}>Date: {sortOrder === 'asc' ? 'Oldest' : 'Newest'}</Text>
            </TouchableOpacity>
          </View>

          {/* Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {filters.map(f => (
              <TouchableOpacity key={f.id} onPress={() => {
                if (f.id === 'today') { const n = new Date(); setCurrentMonth(n); const ds = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`; setSelectedDate(ds); setSelectedFilter('today'); }
                else { setSelectedFilter(f.id); setSelectedDate(null); }
                setVisibleCount(10);
              }} style={[styles.filterChip, selectedFilter === f.id && styles.filterChipActive]}>
                <Text style={[styles.filterText, selectedFilter === f.id && styles.filterTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Calendar */}
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

          {loading && <ActivityIndicator size="large" color={colors.primary} />}

          {/* Appointments List */}
          <Text style={styles.sectionTitle}>Appointments</Text>
          {filteredAppointments.length === 0 && <Text style={{ color: colors.textTertiary, fontStyle: 'italic', marginTop: 8 }}>No appointments found for this filter.</Text>}
          {filteredAppointments.slice(0, visibleCount).map(apt => {
            const ss = getStatusStyle(apt.status);
            return (
              <TouchableOpacity key={apt.id} style={styles.aptCard} onPress={() => setSelectedAppointment(apt)} activeOpacity={0.85}>
                <View style={styles.aptHeader}>
                  <View style={styles.aptTimeRow}>
                    <Clock size={16} color={colors.primary} />
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
                    <TouchableOpacity style={styles.manageBtn} onPress={() => navigation.navigate('artist-active-session', { appointment: apt })}>
                      <PlayCircle size={16} color="#ffffff" /><Text style={styles.manageBtnText}>Manage Session</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
          {visibleCount < filteredAppointments.length && (
            <TouchableOpacity style={styles.loadMore} onPress={() => setVisibleCount(p => p + 10)}><Text style={styles.loadMoreText}>Load More</Text></TouchableOpacity>
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
            <TouchableOpacity style={modalS.saveBtn} onPress={handleAddAppointment}><LinearGradient colors={['#0f172a', colors.primary]} style={modalS.saveGradient}><Text style={modalS.saveBtnText}>Schedule</Text></LinearGradient></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={!!selectedAppointment} transparent animationType="slide" onRequestClose={() => setSelectedAppointment(null)}>
        <View style={modalS.overlay}>
          <View style={modalS.content}>
            <View style={modalS.header}><Text style={modalS.title}>Appointment Details</Text><TouchableOpacity onPress={() => setSelectedAppointment(null)}><X size={22} color={colors.textPrimary} /></TouchableOpacity></View>
            {selectedAppointment && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {[
                  ['Client', () => <><Text style={modalS.value}>{selectedAppointment.client_name}</Text><Text style={modalS.subValue}>{selectedAppointment.client_email}</Text></>],
                  ['Date & Time', () => <Text style={modalS.value}>{new Date(selectedAppointment.appointment_date).toDateString()} at {selectedAppointment.start_time}</Text>],
                  ['Service', () => <Text style={modalS.value}>{selectedAppointment.design_title}</Text>],
                  ['Price', () => <Text style={[modalS.value, { fontWeight: '700' }]}>P{parseFloat(selectedAppointment.price || 0).toLocaleString()}</Text>],
                  ['Status', () => <Text style={[modalS.value, { color: colors.primary, fontWeight: '700' }]}>{selectedAppointment.status?.toUpperCase()}</Text>],
                  ['Payment', () => <Text style={[modalS.value, { color: getPaymentColor(selectedAppointment.payment_status), fontWeight: '700' }]}>{(selectedAppointment.payment_status || 'unpaid').toUpperCase()}</Text>],
                  ...(selectedAppointment.notes ? [['Notes', () => <Text style={modalS.value}>{selectedAppointment.notes}</Text>]] : []),
                ].map(([label, render], i) => <View key={i} style={modalS.row}><Text style={modalS.label}>{label}</Text>{render()}</View>)}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 24, paddingTop: 56, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...typography.h2, color: '#ffffff' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: borderRadius.round },
  statText: { ...typography.bodySmall, color: '#ffffff', fontWeight: '600' },
  content: { padding: 16, paddingBottom: 60 },
  sortRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#ffffff', borderRadius: borderRadius.round, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  filterText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  filterTextActive: { color: '#ffffff' },
  calCard: { backgroundColor: '#ffffff', borderRadius: borderRadius.xl, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  monthBtn: { padding: 4 },
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
  sectionTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: 10 },
  aptCard: { backgroundColor: '#ffffff', borderRadius: borderRadius.xl, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  aptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  aptTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aptTime: { ...typography.body, fontWeight: '700', color: colors.textPrimary },
  aptDateBadge: { backgroundColor: colors.lightBgSecondary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.sm },
  aptDateText: { ...typography.bodyXSmall, color: colors.textSecondary, fontWeight: '600' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.md },
  statusPillText: { ...typography.bodyXSmall, fontWeight: '700' },
  aptDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  clientRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  clientAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.lightBgSecondary, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  clientName: { ...typography.body, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  aptType: { ...typography.bodySmall, color: colors.textSecondary },
  durationBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.lightBgSecondary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: borderRadius.md },
  durationText: { ...typography.bodyXSmall, color: colors.textTertiary, fontWeight: '600' },
  aptFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.borderLight },
  aptPrice: { ...typography.body, fontWeight: '700', color: colors.textPrimary },
  aptPayment: { ...typography.bodyXSmall, color: colors.textTertiary, textTransform: 'uppercase', fontWeight: '600' },
  aptActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  manageBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: borderRadius.md, backgroundColor: '#0f172a' },
  manageBtnText: { ...typography.bodySmall, color: '#ffffff', fontWeight: '600' },
  loadMore: { paddingVertical: 12, alignItems: 'center', marginTop: 8, backgroundColor: '#ffffff', borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
  loadMoreText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
});

const modalS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 20 },
  content: { backgroundColor: '#ffffff', borderRadius: borderRadius.xxl, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  title: { ...typography.h3, color: colors.textPrimary },
  label: { ...typography.bodySmall, fontWeight: '600', marginBottom: 6, color: colors.textSecondary },
  value: { ...typography.body, color: colors.textPrimary, marginBottom: 10 },
  subValue: { ...typography.bodySmall, color: colors.textTertiary, marginBottom: 10 },
  row: { marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: 12, marginBottom: 14, ...typography.body, color: colors.textPrimary },
  saveBtn: { borderRadius: borderRadius.xl, overflow: 'hidden', marginTop: 6 },
  saveGradient: { paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { ...typography.button, color: '#ffffff' },
});
