import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getNotifications, markNotificationAsRead } from '../src/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const timeAgo = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.round((now - date) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

export const AdminNotifications = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const userStr = await AsyncStorage.getItem('user');
      const userId = userStr ? JSON.parse(userStr).id : 1;
      
      const result = await getNotifications(userId, { limit: 50 });
      if (result.success) {
        setNotifications(result.notifications || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePress = async (notif) => {
    if (!notif.is_read) {
      await markNotificationAsRead(notif.id);
      setNotifications(notifications.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    }
    // If it's a payment success, nav to billing/pos
    if (notif.type === 'payment_success' || notif.path === '/admin/billing') {
        // Just mock nav to Dashboard if Billing is missing, or do nothing gracefully
        // navigation.navigate('AdminPOS');
    }
  };

  const getNotifStyle = (type) => {
    switch(type) {
      case 'payment_success': return { icon: 'cash', color: '#10b981', bg: 'rgba(16, 185, 129, 0.2)' };
      case 'appointment_request': return { icon: 'calendar', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.2)' };
      default: return { icon: 'information-circle', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.2)' };
    }
  };

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
      {loading ? (
        <ActivityIndicator size="large" color="#f59e0b" style={{ marginTop: 50 }} />
      ) : notifications.length === 0 ? (
        <Text style={{ color: '#9ca3af', textAlign: 'center', marginTop: 50 }}>No new notifications.</Text>
      ) : (
        notifications.map(notif => {
          const style = getNotifStyle(notif.type);
          return (
            <TouchableOpacity key={notif.id} style={[styles.card, !notif.is_read && { borderLeftWidth: 4, borderLeftColor: style.color }]} onPress={() => handlePress(notif)}>
              <View style={[styles.iconContainer, { backgroundColor: style.bg }]}>
                <Ionicons name={style.icon} size={24} color={style.color} />
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, !notif.is_read && { fontWeight: '900', color: '#f59e0b' }]}>{notif.title}</Text>
                  <Text style={styles.cardTime}>{timeAgo(notif.created_at)}</Text>
                </View>
                <Text style={styles.cardMessage}>{notif.message}</Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}
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
