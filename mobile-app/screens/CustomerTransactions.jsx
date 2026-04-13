import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCustomerTransactions } from '../src/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const CustomerTransactions = ({ navigation }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const userStr = await AsyncStorage.getItem('user_data');
      if (userStr) {
        const user = JSON.parse(userStr);
        const res = await getCustomerTransactions(user.id);
        if (res.success && res.transactions) {
          setTransactions(res.transactions);
        }
      }
    } catch (error) {
      console.error('Error loading transactions', error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.typeTag}>
          <Ionicons name={item.type === 'digital' ? 'card-outline' : 'cash-outline'} size={14} color="#f59e0b" style={{marginRight: 4}} />
          <Text style={styles.typeText}>{item.type.toUpperCase()}</Text>
        </View>
        <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      <Text style={styles.title}>{item.description}</Text>
      <View style={styles.footer}>
        <Text style={styles.amount}>₱{item.amount}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction History</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#f59e0b" style={{ marginTop: 50 }} />
      ) : transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={48} color="#4b5563" />
          <Text style={styles.emptyText}>No transactions found.</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderItem}
          keyExtractor={(item, idx) => idx.toString()}
          contentContainerStyle={styles.listContent}
          onRefresh={loadTransactions}
          refreshing={loading}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#1f2937' },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  listContent: { padding: 20 },
  card: { backgroundColor: '#1f2937', padding: 16, borderRadius: 12, marginBottom: 15 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  typeTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#374151', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  typeText: { color: '#f59e0b', fontSize: 10, fontWeight: 'bold' },
  dateText: { color: '#9ca3af', fontSize: 12 },
  title: { fontSize: 16, color: 'white', fontWeight: 'bold', marginBottom: 12 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontSize: 20, color: '#10b981', fontWeight: 'bold' },
  statusBadge: { backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: '#10b981', fontSize: 12, fontWeight: 'bold' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#9ca3af', marginTop: 10, fontSize: 16 }
});
