import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const AdminStaffScheduling = ({ navigation }) => {
  const shifts = [
    { id: '1', artist: 'Mike Chen', time: '10:00 AM - 6:00 PM', status: 'On Shift', station: 'Station 1' },
    { id: '2', artist: 'Sarah Lee', time: '12:00 PM - 8:00 PM', status: 'Scheduled', station: 'Station 3' },
    { id: '3', artist: 'David Kim', time: 'Off', status: 'Off', station: '-' },
  ];

  return (
  <View style={styles.container}>
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Ionicons name="time" size={24} color="#f59e0b" style={{ marginRight: 10 }} />
        <Text style={styles.headerTitle}>Staff Scheduling</Text>
      </View>
    </View>

    <View style={styles.dateSelector}>
      <Ionicons name="chevron-back" size={24} color="#9ca3af" />
      <Text style={styles.dateText}>Today, Oct 24</Text>
      <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
    </View>

    <ScrollView contentContainerStyle={styles.content}>
      {shifts.map(shift => (
        <View key={shift.id} style={styles.shiftCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{shift.artist.charAt(0)}</Text>
          </View>
          <View style={styles.shiftInfo}>
            <Text style={styles.artistName}>{shift.artist}</Text>
            <Text style={styles.shiftTime}>{shift.time}</Text>
          </View>
          <View style={styles.shiftMeta}>
            <View style={[styles.statusBadge, { backgroundColor: shift.status === 'On Shift' ? '#059669' : shift.status === 'Off' ? '#374151' : '#d97706' }]}>
              <Text style={styles.statusText}>{shift.status}</Text>
            </View>
            <Text style={styles.stationText}>{shift.station}</Text>
            <TouchableOpacity style={styles.manageButton}>
              <Text style={styles.manageButtonText}>Manage</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#1f2937', borderBottomWidth: 1, borderBottomColor: '#374151' },
  backButton: { padding: 8, marginRight: 8 },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  dateSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#1f2937', marginTop: 1 },
  dateText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  content: { padding: 20 },
  shiftCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f2937', padding: 16, borderRadius: 12, marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  shiftInfo: { flex: 1 },
  artistName: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  shiftTime: { color: '#9ca3af', fontSize: 14 },
  shiftMeta: { alignItems: 'flex-end' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginBottom: 4 },
  statusText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  stationText: { color: '#6b7280', fontSize: 12 },
  manageButton: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#374151', borderRadius: 6, alignItems: 'center' },
  manageButtonText: { color: '#9ca3af', fontSize: 12, fontWeight: '600' },
});
