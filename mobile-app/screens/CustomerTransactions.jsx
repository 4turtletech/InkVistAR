/**
 * CustomerTransactions.jsx -- Payment History
 * Themed with lucide icons, StatusBadge, and proper currency formatting.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Animated, Easing
} from 'react-native';
import { ArrowLeft, CreditCard, Banknote, Receipt, ChevronDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../src/context/ThemeContext';
import { AnimatedTouchable } from '../src/components/shared/AnimatedTouchable';
import { typography, borderRadius, shadows } from '../src/theme';
import { StatusBadge } from '../src/components/shared/StatusBadge';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { formatCurrency, formatDate } from '../src/utils/formatters';
import { getCustomerTransactions } from '../src/utils/api';

const ExpandableTransactionCard = ({ item, theme, styles, initiallyExpanded = false }) => {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const animValue = useRef(new Animated.Value(initiallyExpanded ? 1 : 0)).current;

  useEffect(() => {
    if (!initiallyExpanded || expanded) return;
    setExpanded(true);
    Animated.timing(animValue, {
      toValue: 1,
      duration: 300,
      easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      useNativeDriver: false,
    }).start();
  }, [initiallyExpanded]);

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
    <AnimatedTouchable style={[styles.card, initiallyExpanded && styles.targetedCard]} onPress={toggleExpand}>
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
        <Text style={styles.amount}>₱{formatCurrency(item.amount / 100)}</Text>
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
            <Text style={styles.receiptValue}>{item.materials_cost ? `₱${formatCurrency(item.materials_cost / 100)}` : '₱0.00'}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Downpayment</Text>
            <Text style={styles.receiptValue}>{item.downpayment ? `-₱${formatCurrency(item.downpayment / 100)}` : '₱0.00'}</Text>
          </View>
          <View style={[styles.receiptRow, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 8, marginTop: 4 }]}>
            <Text style={[styles.receiptLabel, { fontWeight: '700', color: theme.textPrimary }]}>Total Paid</Text>
            <Text style={[styles.receiptValue, { fontWeight: '800', color: theme.gold }]}>₱{formatCurrency(item.amount / 100)}</Text>
          </View>
        </View>
      </Animated.View>
    </AnimatedTouchable>
  );
};

const hasMatchingId = (left, right) => left !== undefined && left !== null
  && right !== undefined && right !== null
   && String(left) === String(right);

const findNotificationTransaction = (transactions, route) => {
  const appointmentId = route?.params?.openAppointmentId;
  if (appointmentId !== undefined && appointmentId !== null) {
    return transactions.find(item => hasMatchingId(item.appointment_id, appointmentId));
  }

  // Backward compatibility for notifications created by older app versions.
  const legacyId = route?.params?.openTransactionId;
  if (legacyId === undefined || legacyId === null) return null;
  return transactions.find(item => [item.id, item.ledger_id, item.invoice_number].some(value => hasMatchingId(value, legacyId))) || null;
};

export const CustomerTransactions = ({ navigation, route, customerId }) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const listRef = useRef(null);
  const targetedTransaction = findNotificationTransaction(transactions, route);
  const targetedLedgerId = targetedTransaction?.ledger_id;

  useEffect(() => { loadTransactions(); }, [customerId]);

  useEffect(() => {
    if (!targetedLedgerId) return undefined;
    const targetIndex = transactions.findIndex(item => item.ledger_id === targetedLedgerId);
    if (targetIndex < 0) return undefined;
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({ index: targetIndex, animated: true, viewPosition: 0.15 });
    }, 150);
    return () => clearTimeout(timer);
  }, [targetedLedgerId, transactions]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setLoadError('');
      if (!customerId) {
        setTransactions([]);
        setLoadError('Your customer account could not be identified. Please sign in again.');
        return;
      }
      const res = await getCustomerTransactions(customerId);
      if (res.success && Array.isArray(res.transactions)) {
        setTransactions(res.transactions);
      } else {
        setTransactions([]);
        setLoadError(res.message || 'Your transactions could not be loaded. Please try again.');
      }
    } catch (e) {
      console.error('Transactions error:', e);
      setTransactions([]);
      setLoadError('Your transactions could not be loaded. Please try again.');
    }
    finally { setLoading(false); }
  };

  const renderItem = ({ item }) => (
    <ExpandableTransactionCard
      item={item}
      theme={theme}
      styles={styles}
      initiallyExpanded={item.ledger_id === targetedLedgerId}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction Ledger</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? <PremiumLoader message="Loading transactions..." /> : loadError ? (
        <View style={styles.errorState}>
          <Text accessibilityRole="alert" style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity onPress={loadTransactions} style={styles.retryBtn}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : transactions.length === 0 ? (
        <EmptyState icon={Receipt} title="No transactions" subtitle="Your payment history will appear here" />
      ) : (
        <FlatList
          ref={listRef}
          data={transactions}
          renderItem={renderItem}
          keyExtractor={(item, idx) => String(item.ledger_id || item.id || idx)}
          contentContainerStyle={styles.listContent}
          onRefresh={loadTransactions}
          refreshing={loading}
          showsVerticalScrollIndicator={false}
          onScrollToIndexFailed={({ index, averageItemLength }) => {
            listRef.current?.scrollToOffset({ offset: Math.max(0, index * averageItemLength), animated: true });
          }}
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
  targetedCard: { borderColor: theme.gold, borderWidth: 2 },
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
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { ...typography.body, color: theme.error, textAlign: 'center', marginBottom: 14 },
  retryBtn: { backgroundColor: theme.surfaceLight, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.md, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { ...typography.button, color: theme.textPrimary },
});
