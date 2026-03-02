import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const AdminInventory = ({ navigation }) => {
  const [items, setItems] = useState([
    { id: '1', name: 'Dynamic Black Ink (8oz)', stock: 12, min: 5, status: 'Good' },
    { id: '2', name: 'Needles 5RL Box', stock: 3, min: 10, status: 'Low' },
    { id: '3', name: 'Nitrile Gloves (M)', stock: 45, min: 20, status: 'Good' },
    { id: '4', name: 'Green Soap', stock: 0, min: 2, status: 'Out' },
  ]);

  return (
  <View style={styles.container}>
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Ionicons name="cube" size={24} color="#f59e0b" style={{ marginRight: 10 }} />
        <Text style={styles.headerTitle}>Inventory</Text>
      </View>
      <TouchableOpacity style={styles.addButton}>
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      {items.map(item => (
        <View key={item.id} style={styles.itemCard}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemStock}>Stock: {item.stock} (Min: {item.min})</Text>
          </View>
          <View style={[styles.statusBadge, { 
            backgroundColor: item.status === 'Good' ? 'rgba(16, 185, 129, 0.2)' : 
                             item.status === 'Low' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)' 
          }]}>
            <Text style={[styles.statusText, {
              color: item.status === 'Good' ? '#10b981' : 
                     item.status === 'Low' ? '#f59e0b' : '#ef4444'
            }]}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: '#1f2937', borderBottomWidth: 1, borderBottomColor: '#374151' },
  backButton: { padding: 8, marginRight: 8 },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  addButton: { padding: 8 },
  content: { padding: 20 },
  itemCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1f2937', padding: 16, borderRadius: 12, marginBottom: 12 },
  itemInfo: { flex: 1 },
  itemName: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  itemStock: { color: '#9ca3af', fontSize: 14 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
});
