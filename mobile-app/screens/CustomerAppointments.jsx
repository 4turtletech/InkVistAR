import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  SafeAreaView, ActivityIndicator, Modal, Platform 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../src/config';

export function CustomerAppointments({ customerId, onBack, onBookNew }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  useEffect(() => {
    if (customerId) fetchAppointments();
  }, [customerId]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/customer/${customerId}/appointments`);
      const data = await response.json();
      if (data.success) {
        setAppointments(data.appointments);
      }
    } catch (error) {
      console.log('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeMonth = (increment) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + increment);
    setCurrentMonth(newDate);
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const isSelected = selectedDate === dateStr;
      
      const appsOnDay = appointments.filter(a => {
        if (!a.appointment_date) return false;
        const apptDate = typeof a.appointment_date === 'string' ? a.appointment_date.substring(0, 10) : new Date(a.appointment_date).toISOString().split('T')[0];
        return apptDate === dateStr;
      });

      let dotColor = null;
      if (appsOnDay.length > 0) {
        if (appsOnDay.some(a => a.status === 'confirmed')) dotColor = '#10b981';
        else if (appsOnDay.some(a => a.status === 'pending')) dotColor = '#f59e0b';
        else dotColor = '#9ca3af';
      }

      days.push(
        <TouchableOpacity 
          key={i} 
          style={[styles.dayCell, isSelected && styles.selectedDayCell]}
          onPress={() => setSelectedDate(isSelected ? null : dateStr)}
        >
          <Text style={[styles.dayText, isSelected && styles.selectedDayText]}>{i}</Text>
          {dotColor && <View style={[styles.calendarDot, { backgroundColor: dotColor }]} />}
        </TouchableOpacity>
      );
    }
    return days;
  };

  const filteredAppointments = appointments.filter(apt => {
    if (viewMode === 'calendar' && selectedDate) {
      const apptDate = typeof apt.appointment_date === 'string' ? apt.appointment_date.substring(0, 10) : new Date(apt.appointment_date).toISOString().split('T')[0];
      return apptDate === selectedDate;
    }
    return true;
  });

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'confirmed': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'completed': return '#3b82f6';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#000000', '#b8860b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Appointments</Text>
          <TouchableOpacity onPress={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')} style={styles.iconButton}>
            <Ionicons name={viewMode === 'list' ? 'calendar' : 'list'} size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        {viewMode === 'calendar' && (
          <View style={styles.calendarContainer}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthButton}>
                <Ionicons name="chevron-back" size={20} color="#374151" />
              </TouchableOpacity>
              <Text style={styles.monthText}>
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthButton}>
                <Ionicons name="chevron-forward" size={20} color="#374151" />
              </TouchableOpacity>
            </View>
            <View style={styles.weekRow}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                <Text key={index} style={styles.weekDayText}>{day}</Text>
              ))}
            </View>
            <View style={styles.daysGrid}>
              {renderCalendar()}
            </View>
            {selectedDate && (
              <TouchableOpacity onPress={() => setSelectedDate(null)} style={styles.clearDateButton}>
                <Text style={styles.clearDateText}>Clear Date Filter</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color="#daa520" style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.listContainer}>
            {filteredAppointments.length > 0 ? (
              filteredAppointments.map((apt) => (
                <TouchableOpacity 
                  key={apt.id} 
                  style={styles.appointmentCard}
                  onPress={() => setSelectedAppointment(apt)}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.dateText}>
                      {new Date(apt.appointment_date).toLocaleDateString()} • {apt.start_time}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(apt.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(apt.status) }]}>
                        {apt.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.artistName}>{apt.artist_name}</Text>
                  <Text style={styles.serviceText}>{apt.design_title}</Text>
                  <View style={styles.cardFooter}>
                    <Text style={styles.studioText}>{apt.studio_name}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyText}>No appointments found.</Text>
                <TouchableOpacity style={styles.bookButton} onPress={onBookNew}>
                  <Text style={styles.bookButtonText}>Book New Appointment</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button for New Booking */}
      <TouchableOpacity style={styles.fab} onPress={onBookNew}>
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>

      {/* Details Modal */}
      <Modal
        visible={!!selectedAppointment}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedAppointment(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Appointment Details</Text>
              <TouchableOpacity onPress={() => setSelectedAppointment(null)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            
            {selectedAppointment && (
              <ScrollView>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedAppointment.status) + '20', alignSelf: 'flex-start' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(selectedAppointment.status) }]}>
                      {selectedAppointment.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date & Time</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedAppointment.appointment_date).toLocaleDateString()} at {selectedAppointment.start_time}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Artist</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.artist_name}</Text>
                  <Text style={styles.detailSubValue}>{selectedAppointment.studio_name}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Service / Design</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.design_title}</Text>
                </View>

                {selectedAppointment.notes && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Notes</Text>
                    <Text style={styles.detailValue}>{selectedAppointment.notes}</Text>
                  </View>
                )}
              </ScrollView>
            )}

            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setSelectedAppointment(null)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    padding: 24, paddingTop: Platform.OS === 'android' ? 50 : 24,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  iconButton: { padding: 8 },
  content: { flex: 1, padding: 16 },
  
  // Calendar Styles
  calendarContainer: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  monthButton: { padding: 8 },
  monthText: { fontSize: 16, fontWeight: 'bold', color: '#111' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  weekDayText: { width: '14.28%', textAlign: 'center', fontSize: 12, color: '#9ca3af', fontWeight: '600' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 20, marginBottom: 4 },
  selectedDayCell: { backgroundColor: '#daa520' },
  dayText: { fontSize: 14, color: '#374151' },
  selectedDayText: { color: 'white', fontWeight: 'bold' },
  calendarDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  clearDateButton: { marginTop: 12, alignItems: 'center', padding: 8 },
  clearDateText: { color: '#daa520', fontSize: 14, fontWeight: '600' },

  // List Styles
  listContainer: { paddingBottom: 20 },
  appointmentCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dateText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  artistName: { fontSize: 16, fontWeight: 'bold', color: '#111', marginBottom: 4 },
  serviceText: { fontSize: 14, color: '#4b5563', marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 8 },
  studioText: { fontSize: 12, color: '#9ca3af' },

  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#9ca3af', fontSize: 16, marginTop: 10, marginBottom: 20 },
  bookButton: { backgroundColor: '#daa520', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  bookButtonText: { color: 'white', fontWeight: 'bold' },

  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#daa520', justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  detailRow: { marginBottom: 16 },
  detailLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' },
  detailValue: { fontSize: 16, color: '#111', fontWeight: '500' },
  detailSubValue: { fontSize: 14, color: '#6b7280' },
  closeButton: { backgroundColor: '#f3f4f6', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  closeButtonText: { color: '#374151', fontWeight: 'bold' },
});