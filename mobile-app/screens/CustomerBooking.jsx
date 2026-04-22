/**
 * CustomerBooking.jsx -- Appointment Request Form
 * Themed with lucide icons. Calendar, time slots, image picker, notes.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, Alert, Platform, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ChevronLeft, ChevronRight, Trash2, Camera, CalendarCheck } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, typography, borderRadius, shadows } from '../src/theme';
import { API_URL } from '../src/config';

export function CustomerBooking({ customerId, onBack }) {
  const [loading, setLoading] = useState(false);
  const [artists, setArtists] = useState([]);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [designTitle, setDesignTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookedDates, setBookedDates] = useState({});
  const [image, setImage] = useState(null);

  useEffect(() => { fetchArtists(); }, []);

  const fetchArtists = async () => {
    try {
      const r = await (await fetch(`${API_URL}/api/customer/artists`)).json();
      if (r.success) setArtists(r.artists);
    } catch (e) {
      setArtists([
        { id: 1, name: 'Mike Chen', studio_name: 'Ink Masters', specialization: 'Realism', hourly_rate: 150 },
        { id: 2, name: 'Sarah Jones', studio_name: 'Art & Soul', specialization: 'Traditional', hourly_rate: 120 },
      ]);
    }
  };

  useEffect(() => { if (selectedArtist) fetchAvailability(selectedArtist.id); }, [selectedArtist, currentMonth]);

  const fetchAvailability = async (artistId) => {
    try {
      const r = await (await fetch(`${API_URL}/api/artist/${artistId}/availability`)).json();
      if (r.success) {
        const bookings = {};
        r.bookings.forEach(b => {
          const ds = typeof b.appointment_date === 'string' ? b.appointment_date.substring(0, 10) : new Date(b.appointment_date).toISOString().split('T')[0];
          if (!bookings[ds]) bookings[ds] = { count: 0 };
          bookings[ds].count += 1;
        });
        setBookedDates(bookings);
      }
    } catch (e) { console.log('Availability error:', e); }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Denied', 'Camera roll permission is required.'); return; }
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.5, base64: true });
    if (!result.canceled) setImage('data:image/jpeg;base64,' + result.assets[0].base64);
  };

  const showTimePicker = designTitle !== 'Tattoo Session';

  const handleBook = async () => {
    if (!selectedDate) { Alert.alert('Missing Information', 'Please select a date.'); return; }
    if (showTimePicker && !selectedTime) { Alert.alert('Missing Information', 'Please select a time slot.'); return; }
    setLoading(true);
    try {
      const r = await (await fetch(`${API_URL}/api/customer/appointments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, artistId: 1, date: selectedDate, startTime: showTimePicker ? selectedTime : null, endTime: showTimePicker ? selectedTime : null, designTitle: designTitle || 'General Consultation', notes, referenceImage: image, price: 0 }),
      })).json();
      r.success ? Alert.alert('Booking Successful', 'Your appointment request has been sent.', [{ text: 'OK', onPress: onBack }]) : Alert.alert('Booking Failed', r.message || 'Please try again.');
    } catch (e) { Alert.alert('Error', 'Could not connect to server.'); }
    finally { setLoading(false); }
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const changeMonth = (inc) => { const d = new Date(currentMonth); d.setMonth(d.getMonth() + inc); setCurrentMonth(d); };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear(), month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const maxDate = new Date(); maxDate.setMonth(today.getMonth() + 3); maxDate.setHours(23, 59, 59, 999);
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<View key={`e-${i}`} style={styles.dayCell} />);
    for (let i = 1; i <= daysInMonth; i++) {
      const dateObj = new Date(year, month, i);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const isSelected = selectedDate === dateStr;
      const isPast = dateObj <= today;
      const isTooFar = dateObj > maxDate;
      const dd = bookedDates[dateStr] || { count: 0 };
      const isFull = dd.count >= 3;
      const isBusy = dd.count > 0;
      let statusColor = colors.success;
      if (isFull) statusColor = colors.error;
      else if (isBusy) statusColor = colors.warning;
      days.push(
        <TouchableOpacity key={i} style={[styles.dayCell, isSelected && styles.selectedDay, (isPast || isFull || isTooFar) && styles.disabledDay]} disabled={isPast || isFull || isTooFar} onPress={() => setSelectedDate(dateStr)}>
          <Text style={[styles.dayText, isSelected && styles.selectedDayText, (isPast || isFull || isTooFar) && styles.disabledDayText]}>{i}</Text>
          {!isPast && !isTooFar && <View style={[styles.availDot, { backgroundColor: statusColor }]} />}
        </TouchableOpacity>
      );
    }
    return days;
  };

  const timeSlots = [
    { label: '1:00 PM', value: '13:00' }, { label: '2:00 PM', value: '14:00' },
    { label: '3:00 PM', value: '15:00' }, { label: '4:00 PM', value: '16:00' },
    { label: '5:00 PM', value: '17:00' }, { label: '6:00 PM', value: '18:00' },
    { label: '7:00 PM', value: '19:00' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Consultation</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* 1. Date */}
        <Text style={styles.sectionTitle}>1. Select Preferred Date *</Text>
        <View style={styles.calCard}>
          <View style={styles.calHeader}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthBtn}><ChevronLeft size={18} color={colors.textPrimary} /></TouchableOpacity>
            <Text style={styles.monthText}>{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</Text>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthBtn}><ChevronRight size={18} color={colors.textPrimary} /></TouchableOpacity>
          </View>
          <View style={styles.weekRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <Text key={i} style={styles.weekDayText}>{d}</Text>)}
          </View>
          <View style={styles.daysGrid}>{renderCalendar()}</View>
          <View style={styles.legend}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.success }]} /><Text style={styles.legendText}>Available</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.warning }]} /><Text style={styles.legendText}>Busy</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.error }]} /><Text style={styles.legendText}>Full</Text></View>
          </View>
        </View>

        {/* 2. Time */}
        <Text style={styles.sectionTitle}>2. Select Preferred Time *</Text>
        <View style={styles.timeGrid}>
          {timeSlots.map(s => (
            <TouchableOpacity key={s.value} style={[styles.timeChip, selectedTime === s.value && styles.timeChipActive]} onPress={() => setSelectedTime(s.value)}>
              <Text style={[styles.timeText, selectedTime === s.value && styles.timeTextActive]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 3. Notes */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Design Idea & Notes</Text>
          <TextInput style={[styles.input, styles.textArea]} placeholder="Describe size, placement, style..." placeholderTextColor={colors.textTertiary} value={notes} onChangeText={setNotes} multiline numberOfLines={4} />
        </View>

        {/* 4. Image */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Reference Image (Optional)</Text>
          {image ? (
            <View style={styles.imgPreviewWrap}>
              <Image source={{ uri: image }} style={styles.previewImg} />
              <TouchableOpacity onPress={() => setImage(null)} style={styles.removeImgBtn}>
                <Trash2 size={18} color="#ffffff" />
                <Text style={styles.removeImgText}>Remove Image</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={pickImage} style={styles.imgPicker}>
              <Camera size={28} color={colors.textTertiary} />
              <Text style={styles.imgPickerText}>Tap to attach an image</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Submit */}
        <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleBook} disabled={loading} activeOpacity={0.8}>
          <LinearGradient colors={['#0f172a', colors.primary]} style={styles.submitGradient}>
            {loading ? <ActivityIndicator color="#ffffff" /> : (
              <>
                <CalendarCheck size={18} color="#ffffff" />
                <Text style={styles.submitText}>Request Appointment</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: Platform.OS === 'android' ? 52 : 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.lightBgSecondary, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...typography.h3, color: colors.textPrimary },
  sectionTitle: { ...typography.body, fontWeight: '700', color: colors.textPrimary, marginTop: 20, marginBottom: 12 },
  calCard: { backgroundColor: '#ffffff', borderRadius: borderRadius.xl, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
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
  disabledDay: { opacity: 0.3 },
  disabledDayText: { color: colors.textTertiary },
  availDot: { width: 4, height: 4, borderRadius: 2, marginTop: 3 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 14, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { ...typography.bodyXSmall, color: colors.textTertiary },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: { width: '23%', paddingVertical: 10, backgroundColor: '#ffffff', borderRadius: borderRadius.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  timeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  timeText: { ...typography.bodySmall, color: colors.textPrimary },
  timeTextActive: { color: '#ffffff', fontWeight: '700' },
  inputGroup: { marginBottom: 16 },
  label: { ...typography.bodySmall, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: 12, ...typography.body, color: colors.textPrimary },
  textArea: { height: 100, textAlignVertical: 'top' },
  imgPicker: { height: 140, backgroundColor: '#ffffff', borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', borderRadius: borderRadius.xl, justifyContent: 'center', alignItems: 'center', marginTop: 6 },
  imgPickerText: { ...typography.bodySmall, color: colors.textTertiary, marginTop: 8 },
  imgPreviewWrap: { marginTop: 6, borderRadius: borderRadius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  previewImg: { width: '100%', height: 200, resizeMode: 'cover' },
  removeImgBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.error, padding: 12, gap: 8 },
  removeImgText: { ...typography.bodySmall, color: '#ffffff', fontWeight: '700' },
  submitBtn: { borderRadius: borderRadius.xl, overflow: 'hidden', marginTop: 20 },
  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  submitText: { ...typography.button, color: '#ffffff', fontSize: 16 },
});