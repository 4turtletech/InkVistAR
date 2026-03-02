// components/Mobile/SimpleBooking.jsx
import { useState } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, ScrollView, 
  Alert, TextInput, Modal 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export function SimpleBooking({ onBack }) {
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [selectedDate, setSelectedDate] = useState('Tomorrow');
  const [selectedTime, setSelectedTime] = useState(null);
  const [notes, setNotes] = useState('');
  const [showDateModal, setShowDateModal] = useState(false);
  const [step, setStep] = useState(1);

  const artists = [
    { id: 1, name: 'Mike Chen', specialty: 'Traditional', rating: 4.9, rate: 150 },
    { id: 2, name: 'Sarah Lee', specialty: 'Minimalist', rating: 4.8, rate: 120 },
    { id: 3, name: 'Alex Kim', specialty: 'Geometric', rating: 4.7, rate: 130 },
  ];

  const dates = ['Today', 'Tomorrow', 'In 3 days', 'Next week'];
  const times = ['9:00 AM', '11:00 AM', '2:00 PM', '4:00 PM'];

  const handleBook = () => {
    if (!selectedArtist || !selectedTime) {
      Alert.alert('Missing Info', 'Please select artist and time');
      return;
    }

    Alert.alert(
      'Success!',
      `Booked with ${selectedArtist.name} on ${selectedDate} at ${selectedTime}`,
      [{ text: 'OK', onPress: onBack }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#000000', '#b8860b']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Book Appointment</Text>
          <View style={styles.headerPlaceholder} />
        </View>
      </LinearGradient>

      {/* Progress */}
      <View style={styles.progress}>
        {[1, 2, 3].map((num) => (
          <View key={num} style={styles.progressStep}>
            <View style={[
              styles.progressDot,
              step >= num && styles.progressDotActive
            ]}>
              <Text style={styles.progressNumber}>{num}</Text>
            </View>
            <Text style={styles.progressLabel}>
              {num === 1 && 'Artist'}
              {num === 2 && 'Time'}
              {num === 3 && 'Confirm'}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView style={styles.scrollView}>
        {step === 1 && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>Choose Artist</Text>
            {artists.map((artist) => (
              <TouchableOpacity
                key={artist.id}
                style={[
                  styles.artistCard,
                  selectedArtist?.id === artist.id && styles.artistSelected
                ]}
                onPress={() => {
                  setSelectedArtist(artist);
                  setStep(2);
                }}
              >
                <View style={styles.artistAvatar}>
                  <Ionicons name="person" size={28} color="#6b7280" />
                </View>
                <View style={styles.artistInfo}>
                  <Text style={styles.artistName}>{artist.name}</Text>
                  <Text style={styles.artistSpecialty}>{artist.specialty}</Text>
                  <View style={styles.artistStats}>
                    <View style={styles.rating}>
                      <Ionicons name="star" size={14} color="#daa520" />
                      <Text style={styles.ratingText}>{artist.rating}</Text>
                    </View>
                    <Text style={styles.rate}>${artist.rate}/hr</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 2 && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>Select Time</Text>
            
            {/* Date Selection */}
            <Text style={styles.sectionLabel}>Date</Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowDateModal(true)}
            >
              <Ionicons name="calendar" size={20} color="#daa520" />
              <Text style={styles.dateText}>{selectedDate}</Text>
              <Ionicons name="chevron-down" size={16} color="#9ca3af" />
            </TouchableOpacity>

            {/* Time Slots */}
            <Text style={styles.sectionLabel}>Available Times</Text>
            <View style={styles.timeGrid}>
              {times.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeSlot,
                    selectedTime === time && styles.timeSlotSelected
                  ]}
                  onPress={() => {
                    setSelectedTime(time);
                    setStep(3);
                  }}
                >
                  <Text style={[
                    styles.timeText,
                    selectedTime === time && styles.timeTextSelected
                  ]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>Confirm Booking</Text>
            
            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Ionicons name="person" size={18} color="#6b7280" />
                <Text style={styles.summaryLabel}>Artist:</Text>
                <Text style={styles.summaryValue}>{selectedArtist.name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Ionicons name="calendar" size={18} color="#6b7280" />
                <Text style={styles.summaryLabel}>Date:</Text>
                <Text style={styles.summaryValue}>{selectedDate}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Ionicons name="time" size={18} color="#6b7280" />
                <Text style={styles.summaryLabel}>Time:</Text>
                <Text style={styles.summaryValue}>{selectedTime}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Ionicons name="cash" size={18} color="#6b7280" />
                <Text style={styles.summaryLabel}>Est. Cost:</Text>
                <Text style={styles.summaryValue}>${selectedArtist.rate * 2}</Text>
              </View>
            </View>

            <Text style={styles.notesLabel}>Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Any special requests..."
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            <TouchableOpacity 
              style={styles.bookButton}
              onPress={handleBook}
            >
              <LinearGradient
                colors={['#000000', '#b8860b']}
                style={styles.bookButtonGradient}
              >
                <Ionicons name="checkmark" size={24} color="#ffffff" />
                <Text style={styles.bookButtonText}>Confirm Booking</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Date Modal */}
      <Modal
        visible={showDateModal}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Date</Text>
            {dates.map((date) => (
              <TouchableOpacity
                key={date}
                style={styles.modalOption}
                onPress={() => {
                  setSelectedDate(date);
                  setShowDateModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>{date}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowDateModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Back Button */}
      {step > 1 && (
        <TouchableOpacity 
          style={styles.bottomBack}
          onPress={() => setStep(step - 1)}
        >
          <Ionicons name="arrow-back" size={20} color="#000000" />
          <Text style={styles.bottomBackText}>Back</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    padding: 24,
    paddingTop: 60,
    borderBottomLeftRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerPlaceholder: { width: 40 },
  progress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  progressStep: { alignItems: 'center' },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressDotActive: {
    backgroundColor: '#000000',
  },
  progressNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  progressLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  scrollView: { flex: 1 },
  step: { padding: 24 },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
  },
  artistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  artistSelected: {
    borderWidth: 2,
    borderColor: '#daa520',
  },
  artistAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  artistInfo: { flex: 1 },
  artistName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  artistSpecialty: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  artistStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 12,
    color: '#b8860b',
    fontWeight: '600',
  },
  rate: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    marginTop: 16,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    marginLeft: 12,
    fontWeight: '600',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  timeSlot: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minWidth: '30%',
  },
  timeSlotSelected: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  timeText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
    textAlign: 'center',
  },
  timeTextSelected: {
    color: '#ffffff',
  },
  summary: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryLabel: {
    width: 80,
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 12,
  },
  summaryValue: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  notesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 80,
    fontSize: 16,
    color: '#111827',
    marginBottom: 24,
  },
  bookButton: {
    marginTop: 8,
  },
  bookButtonGradient: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  bookButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#111827',
    textAlign: 'center',
  },
  modalCancel: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomBack: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  bottomBackText: {
    fontSize: 16,
    color: '#000000',
    marginLeft: 8,
    fontWeight: '600',
  },
});