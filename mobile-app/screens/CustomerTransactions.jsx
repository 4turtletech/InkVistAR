/**
 * CustomerTransactions.jsx -- Payment History
 * Themed with lucide icons, StatusBadge, and proper currency formatting.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView,
} from 'react-native';
import { ArrowLeft, CreditCard, Banknote, Receipt } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, borderRadius, shadows } from '../src/theme';
import { StatusBadge } from '../src/components/shared/StatusBadge';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { formatCurrency, formatDate } from '../src/utils/formatters';
import { getCustomerTransactions } from '../src/utils/api';

export const CustomerTransactions = ({ navigation }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadTransactions(); }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const userStr = await AsyncStorage.getItem('user_data');
      if (userStr) {
        const user = JSON.parse(userStr);
        const res = await getCustomerTransactions(user.id);
        if (res.success && res.transactions) setTransactions(res.transactions);
      }
    } catch (e) { console.error('Transactions error:', e); }
    finally { setLoading(false); }
  };

  const renderItem = ({ item }) => {
    const isDigital = item.type === 'digital';
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.typeTag, { backgroundColor: isDigital ? colors.infoBg : colors.warningBg }]}>
            {isDigital ? <CreditCard size={12} color={colors.info} /> : <Banknote size={12} color={colors.warning} />}
            <Text style={[styles.typeText, { color: isDigital ? colors.info : colors.warning }]}>
              {(item.type || 'payment').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>{item.description}</Text>
        <View style={styles.footer}>
          <Text style={styles.amount}>P{formatCurrency(item.amount)}</Text>
          <StatusBadge status={item.status || 'paid'} />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? <PremiumLoader message="Loading transactions..." /> : transactions.length === 0 ? (
        <EmptyState icon={Receipt} title="No transactions" subtitle="Your payment history will appear here" />
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderItem}
          keyExtractor={(item, idx) => (item.id || idx).toString()}
          contentContainerStyle={styles.listContent}
          onRefresh={loadTransactions}
          refreshing={loading}
        />
      )}
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingTop: 52, backgroundColor: '#ffffff',
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.lightBgSecondary, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...typography.h3, color: colors.textPrimary },
  listContent: { padding: 16 },
  card: {
    backgroundColor: '#ffffff', padding: 16, borderRadius: borderRadius.xl,
    marginBottom: 12, borderWidth: 1, borderColor: colors.border, ...shadows.subtle,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  typeTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: borderRadius.sm,
  },
  typeText: { ...typography.bodyXSmall, fontWeight: '700' },
  dateText: { ...typography.bodyXSmall, color: colors.textTertiary },
  title: { ...typography.body, color: colors.textPrimary, fontWeight: '600', marginBottom: 10 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { ...typography.h3, color: colors.success, fontWeight: '800' },
});
