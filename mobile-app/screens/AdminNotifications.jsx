import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const AdminNotifications = ({ navigation }) => {
  const notifications = [
    { id: 1, title: 'System Update', message: 'Server maintenance scheduled for tonight at 2 AM.', time: '2h ago', type: 'system' },
    { id: 2, title: 'New Artist Application', message: 'John Doe has applied to join the studio.', time: '5h ago', type: 'user' },
    { id: 3, title: 'Low Stock Alert', message: 'Black Ink is running low (3 bottles left).', time: '1d ago', type: 'alert' },
  ];

  return (
  <View style={styles.container}>
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Ionicons name="notifications" size={24} color="#f59e0b" style={{ marginRight: 10 }} />
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      {notifications.map(notif => (
        <View key={notif.id} style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: notif.type === 'alert' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)' }]}>
            <Ionicons name={notif.type === 'alert' ? 'warning' : 'information-circle'} size={24} color={notif.type === 'alert' ? '#ef4444' : '#3b82f6'} />
          </View>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{notif.title}</Text>
              <Text style={styles.cardTime}>{notif.time}</Text>
            </View>
            <Text style={styles.cardMessage}>{notif.message}</Text>
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
  content: { padding: 20 },
  card: { flexDirection: 'row', backgroundColor: '#1f2937', padding: 16, borderRadius: 12, marginBottom: 12 },
  iconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  cardTime: { color: '#9ca3af', fontSize: 12 },
  cardMessage: { color: '#d1d5db', fontSize: 14, lineHeight: 20 },
});
