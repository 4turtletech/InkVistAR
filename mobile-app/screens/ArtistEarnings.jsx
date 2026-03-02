// screens/ArtistEarnings.jsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export function ArtistEarnings({ onBack }) {
  const [timeFilter, setTimeFilter] = useState('month'); // week, month, year
  
  const earningsData = {
    week: { total: 1250, sessions: 8, average: 156, change: '+12%' },
    month: { total: 2450, sessions: 18, average: 136, change: '+8%' },
    year: { total: 28900, sessions: 210, average: 138, change: '+15%' },
  };
  
  const transactions = [
    { id: 1, client: 'John Smith', amount: 350, date: 'Jan 24', type: 'Session 2/3', status: 'completed' },
    { id: 2, client: 'Emma Wilson', amount: 120, date: 'Jan 23', type: 'Consultation', status: 'completed' },
    { id: 3, client: 'Mike Johnson', amount: 450, date: 'Jan 22', type: 'Full Sleeve', status: 'pending' },
    { id: 4, client: 'Sarah Davis', amount: 200, date: 'Jan 21', type: 'Touch-up', status: 'completed' },
    { id: 5, client: 'Tom Wilson', amount: 180, date: 'Jan 20', type: 'Design', status: 'completed' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#000000', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={20} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Earnings</Text>
            <TouchableOpacity style={styles.downloadButton}>
              <Ionicons name="download" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.earningsOverview}>
            <Text style={styles.earningsAmount}>₱{earningsData[timeFilter].total}</Text>
            <Text style={styles.earningsPeriod}>
              {timeFilter === 'week' ? 'This Week' : timeFilter === 'month' ? 'This Month' : 'This Year'}
              <Text style={styles.earningsChange}> • {earningsData[timeFilter].change}</Text>
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="calendar" size={20} color="#ffffff" />
              <Text style={styles.statNumber}>{earningsData[timeFilter].sessions}</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="cash" size={20} color="#ffffff" />
              <Text style={styles.statNumber}>₱{earningsData[timeFilter].average}</Text>
              <Text style={styles.statLabel}>Average</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Time Filters */}
          <View style={styles.filters}>
            {['week', 'month', 'year'].map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterButton,
                  timeFilter === filter && styles.filterButtonActive
                ]}
                onPress={() => setTimeFilter(filter)}
              >
                <Text style={[
                  styles.filterText,
                  timeFilter === filter && styles.filterTextActive
                ]}>
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Recent Transactions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {transactions.map((tx) => (
              <View key={tx.id} style={styles.transactionCard}>
                <View style={styles.transactionIcon}>
                  <Ionicons name="cash" size={24} color="#059669" />
                </View>
                <View style={styles.transactionDetails}>
                  <Text style={styles.transactionClient}>{tx.client}</Text>
                  <Text style={styles.transactionType}>{tx.type}</Text>
                  <Text style={styles.transactionDate}>{tx.date}</Text>
                </View>
                <View style={styles.transactionAmount}>
                  <Text style={styles.amountText}>₱{tx.amount}</Text>
                  <View style={[
                    styles.statusBadge,
                    tx.status === 'completed' ? styles.statusCompleted : styles.statusPending
                  ]}>
                    <Text style={styles.statusText}>{tx.status}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Payment Methods */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Methods</Text>
            <TouchableOpacity style={styles.paymentCard}>
              <View style={styles.paymentIcon}>
                <Ionicons name="card" size={24} color="#3b82f6" />
              </View>
              <View style={styles.paymentDetails}>
                <Text style={styles.paymentTitle}>Bank Account</Text>
                <Text style={styles.paymentInfo}>**** 4321 • Primary</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {/* Withdrawal Button */}
          <TouchableOpacity style={styles.withdrawButton}>
            <LinearGradient
              colors={['#000000', '#059669']}
              style={styles.withdrawButtonGradient}
            >
              <Ionicons name="cash" size={24} color="#ffffff" />
              <Text style={styles.withdrawButtonText}>Withdraw Earnings</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scrollView: { flex: 1 },
  header: {
    padding: 24,
    paddingTop: 60,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  downloadButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  earningsOverview: {
    alignItems: 'center',
    marginBottom: 24,
  },
  earningsAmount: {
    fontSize: 48,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  earningsPeriod: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
  },
  earningsChange: {
    color: '#a7f3d0',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.9,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  filters: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  filterText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionClient: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  transactionType: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusCompleted: {
    backgroundColor: '#d1fae5',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  paymentDetails: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  paymentInfo: {
    fontSize: 14,
    color: '#6b7280',
  },
  withdrawButton: {
    marginTop: 8,
  },
  withdrawButtonGradient: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  withdrawButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});