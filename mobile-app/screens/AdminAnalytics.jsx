import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const AdminAnalytics = ({ navigation }) => {
  const revenueData = [
    { label: 'Mon', value: 40 },
    { label: 'Tue', value: 65 },
    { label: 'Wed', value: 30 },
    { label: 'Thu', value: 80 },
    { label: 'Fri', value: 55 },
    { label: 'Sat', value: 90 },
    { label: 'Sun', value: 45 },
  ];

  return (
  <View style={styles.container}>
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Ionicons name="bar-chart" size={24} color="#f59e0b" style={{ marginRight: 10 }} />
        <Text style={styles.headerTitle}>Analytics</Text>
      </View>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Weekly Revenue</Text>
        <Text style={styles.bigNumber}>$4,250</Text>
        <View style={styles.chartContainer}>
          {revenueData.map((item, index) => (
            <View key={index} style={styles.barWrapper}>
              <View style={[styles.bar, { height: item.value }]} />
              <Text style={styles.barLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.card, styles.halfCard]}>
          <Text style={styles.cardTitle}>New Clients</Text>
          <Text style={styles.bigNumber}>+12</Text>
          <Text style={styles.subText}>vs last week</Text>
        </View>
        <View style={[styles.card, styles.halfCard]}>
          <Text style={styles.cardTitle}>Avg Rating</Text>
          <Text style={styles.bigNumber}>4.8</Text>
          <Text style={styles.subText}>stars</Text>
        </View>
      </View>
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
  card: { backgroundColor: '#1f2937', padding: 20, borderRadius: 12, marginBottom: 16 },
  cardTitle: { color: '#9ca3af', fontSize: 14, marginBottom: 8 },
  bigNumber: { color: 'white', fontSize: 32, fontWeight: 'bold', marginBottom: 16 },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 100 },
  barWrapper: { alignItems: 'center', width: 30 },
  bar: { width: 8, backgroundColor: '#f59e0b', borderRadius: 4 },
  barLabel: { color: '#6b7280', fontSize: 10, marginTop: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfCard: { width: '48%' },
  subText: { color: '#10b981', fontSize: 12 },
});
