/**
 * CustomerTransactions.jsx -- Payment History
 * Themed with lucide icons, StatusBadge, and proper currency formatting.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Animated, Easing
} from 'react-native';
import { ArrowLeft, CreditCard, Banknote, Receipt, ChevronDown } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../src/context/ThemeContext';
import { AnimatedTouchable } from '../src/components/shared/AnimatedTouchable';
import { typography, borderRadius, shadows } from '../src/theme';
import { StatusBadge } from '../src/components/shared/StatusBadge';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { formatCurrency, formatDate } from '../src/utils/formatters';
import { getCustomerTransactions } from '../src/utils/api';

const ExpandableTransactionCard = ({ item, theme, styles }) => {
  const [expanded, setExpanded] = useState(false);
  const animValue = useRef(new Animated.Value(0)).current;

  const toggleExpand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(!expanded);
    Animated.timing(animValue, {
      toValue: expanded ? 0 : 1,
      duration: 300,
      easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      useNativeDriver: false,
    }).start();
  };

  const isDigital = item.type === 'digital';
  const contentHeight = animValue.interpolate({ inputRange: [0, 1], outputRange: [0, 140] });
  const rotateChevron = animValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <AnimatedTouchable style={styles.card} onPress={toggleExpand}>
      <View style={styles.cardHeader}>
        <View style={[styles.typeTag, { backgroundColor: isDigital ? theme.surfaceLight : theme.gold + '20' }]}>
          {isDigital ? <CreditCard size={12} color={theme.textSecondary} /> : <Banknote size={12} color={theme.gold} />}
          <Text style={[styles.typeText, { color: isDigital ? theme.textSecondary : theme.gold }]}>
            {(item.type || 'payment').toUpperCase()}
          </Text>
        </View>
        <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
      </View>
      <Text style={styles.title} numberOfLines={2}>{item.description}</Text>
      <View style={styles.footer}>
        <Text style={styles.amount}>₱{formatCurrency(item.amount)}</Text>
        <View style={styles.footerRight}>
          <StatusBadge status={item.status || 'paid'} />
          <Animated.View style={{ transform: [{ rotate: rotateChevron }] }}>
            <ChevronDown size={20} color={theme.textTertiary} />
          </Animated.View>
        </View>
      </View>

      <Animated.View style={{ height: contentHeight, overflow: 'hidden' }}>
        <View style={styles.receiptDetails}>
          <Text style={styles.receiptHeader}>Receipt Details</Text>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Transaction ID</Text>
            <Text style={styles.receiptValue}>{item.id || 'N/A'}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Materials Used</Text>
            <Text style={styles.receiptValue}>{item.materials_cost ? `₱${formatCurrency(item.materials_cost)}` : '₱0.00'}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Downpayment</Text>
            <Text style={styles.receiptValue}>{item.downpayment ? `-₱${formatCurrency(item.downpayment)}` : '₱0.00'}</Text>
          </View>
          <View style={[styles.receiptRow, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 8, marginTop: 4 }]}>
            <Text style={[styles.receiptLabel, { fontWeight: '700', color: theme.textPrimary }]}>Total Paid</Text>
            <Text style={[styles.receiptValue, { fontWeight: '800', color: theme.gold }]}>₱{formatCurrency(item.amount)}</Text>
          </View>
        </View>
      </Animated.View>
    </AnimatedTouchable>
  );
};

export const CustomerTransactions = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
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

  const renderItem = ({ item }) => <ExpandableTransactionCard item={item} theme={theme} styles={styles} />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction Ledger</Text>
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
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingTop: 52, backgroundColor: theme.surface,
    borderBottomWidth: 1, borderBottomColor: theme.border, ...shadows.subtle
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.surfaceLight, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...typography.h3, color: theme.textPrimary },
  listContent: { padding: 16 },
  card: {
    backgroundColor: theme.surface, padding: 16, borderRadius: borderRadius.xl,
    marginBottom: 12, borderWidth: 1, borderColor: theme.border, ...shadows.subtle,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  typeTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: borderRadius.sm,
  },
  typeText: { ...typography.bodyXSmall, fontWeight: '700' },
  dateText: { ...typography.bodyXSmall, color: theme.textTertiary },
  title: { ...typography.body, color: theme.textPrimary, fontWeight: '600', marginBottom: 10 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amount: { ...typography.h3, color: theme.gold, fontWeight: '800' },
  receiptDetails: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.border, gap: 8 },
  receiptHeader: { ...typography.bodySmall, fontWeight: '700', color: theme.textSecondary, marginBottom: 4 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptLabel: { ...typography.bodySmall, color: theme.textSecondary },
  receiptValue: { ...typography.bodySmall, color: theme.textPrimary, fontWeight: '500' },
});
