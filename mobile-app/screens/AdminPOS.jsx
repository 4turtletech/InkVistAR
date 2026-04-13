import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAdminAppointments, createAdminManualPayment } from '../src/utils/api';

export const AdminPOS = ({ navigation }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const result = await getAdminAppointments({ status: 'completed' });
    // Also include 'confirmed' ones so they can pay downpayment manually
    const result2 = await getAdminAppointments({ status: 'confirmed' });
    
    let all = [];
    if (result.success && result.data) all = [...all, ...result.data];
    if (result2.success && result2.data) all = [...all, ...result2.data];
    
    // Sort by id descending
    all.sort((a, b) => b.id - a.id);
    
    setAppointments(all);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProcessPayment = async () => {
    if (!selectedAppt) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid positive amount.');
      return;
    }

    setIsProcessing(true);
    const result = await createAdminManualPayment(selectedAppt.id, {
      amount,
      method: paymentMethod
    });

    if (result.success) {
      Alert.alert('Success', 'Payment processed successfully.');
      setSelectedAppt(null); // Close modal
      setPaymentAmount('');
      loadData(); // Refresh to update balances
    } else {
      Alert.alert('Error', result.message || 'Failed to process payment');
    }
    setIsProcessing(false);
  };

  const filtered = appointments.filter(a => 
    search === '' || 
    (a.client_name || '').toLowerCase().includes(search.toLowerCase()) || 
    (a.design_title || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="cash" size={24} color="#8b5cf6" style={{ marginRight: 10 }} />
          <Text style={styles.headerTitle}>POS & Billing</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6b7280" style={{ marginRight: 10 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by client or design..."
          placeholderTextColor="#6b7280"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {filtered.length === 0 ? (
            <Text style={{color: '#6b7280', textAlign: 'center', marginTop: 20}}>No appointments awaiting payment.</Text>
          ) : (
            filtered.map(appt => {
              // Calculate rough remaining locally for UI filtering (backend strictly enforces exact amount)
              const statusPill = appt.payment_status === 'paid' ? '#10b981' : (appt.payment_status === 'downpayment_paid' ? '#f59e0b' : '#dc2626');
              return (
                <TouchableOpacity key={appt.id} style={styles.card} onPress={() => setSelectedAppt(appt)}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.clientName}>{appt.client_name}</Text>
                    <View style={[styles.badge, { backgroundColor: statusPill }]}><Text style={styles.badgeText}>{appt.payment_status?.toUpperCase() || 'UNPAID'}</Text></View>
                  </View>
                  <Text style={styles.designTitle}>{appt.design_title}</Text>
                  <Text style={styles.priceData}>Price: â‚±{appt.price}</Text>
                  <Text style={styles.artistData}>Artist: {appt.artist_name}</Text>
                </TouchableOpacity>
              )
            })
          )}
        </ScrollView>
      )}

      {/* Payment Modal */}
      <Modal visible={!!selectedAppt} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Process Payment</Text>
              <TouchableOpacity onPress={() => setSelectedAppt(null)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {selectedAppt && (
              <ScrollView>
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Client</Text>
                  <Text style={styles.infoValue}>{selectedAppt.client_name}</Text>
                  <Text style={styles.infoLabel}>Design</Text>
                  <Text style={styles.infoValue}>{selectedAppt.design_title}</Text>
                  <Text style={styles.infoLabel}>Total Price</Text>
                  <Text style={styles.infoValue}>â‚±{selectedAppt.price}</Text>
                  {/* Note: In a full app, we'd fetch exact remaining balance here. Relying on Admin constraint for now. */}
                </View>

                <Text style={styles.inputLabel}>Payment Method</Text>
                <View style={styles.methodRow}>
                  {['Cash', 'Card', 'Gcash'].map(m => (
                    <TouchableOpacity 
                      key={m} 
                      style={[styles.methodBtn, paymentMethod === m && styles.methodBtnActive]}
                      onPress={() => setPaymentMethod(m)}
                    >
                      <Text style={[styles.methodText, paymentMethod === m && styles.methodTextActive]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Amount (â‚±)</Text>
                <TextInput
                  style={styles.amountInput}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor="#6b7280"
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                />

                <TouchableOpacity 
                  style={styles.processBtn} 
                  onPress={handleProcessPayment}
                  disabled={isProcessing}
                >
                  {isProcessing ? <ActivityIndicator color="white" /> : <Text style={styles.processBtnText}>Record Payment</Text>}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backButton: { padding: 8, marginRight: 8 },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', margin: 15, marginBottom: 5, borderRadius: 10, paddingHorizontal: 10 },
  searchInput: { flex: 1, height: 50, color: '#111827' },
  
  content: { padding: 15 },
  card: { backgroundColor: '#ffffff', padding: 15, borderRadius: 12, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  clientName: { color: '#111827', fontWeight: 'bold', fontSize: 16 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { color: '#111827', fontSize: 10, fontWeight: 'bold' },
  designTitle: { color: '#6b7280', marginBottom: 5 },
  priceData: { color: '#8b5cf6', fontWeight: 'bold', marginBottom: 2 },
  artistData: { color: '#6b7280', fontSize: 12 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  
  infoBox: { backgroundColor: '#f3f4f6', padding: 15, borderRadius: 10, marginBottom: 20 },
  infoLabel: { color: '#6b7280', fontSize: 12, marginBottom: 2 },
  infoValue: { color: '#111827', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  
  inputLabel: { color: '#111827', fontSize: 14, marginBottom: 10 },
  methodRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  methodBtn: { flex: 1, padding: 12, backgroundColor: '#f3f4f6', borderRadius: 8, alignItems: 'center' },
  methodBtnActive: { backgroundColor: '#8b5cf6' },
  methodText: { color: '#6b7280', fontWeight: 'bold' },
  methodTextActive: { color: '#111827' },
  
  amountInput: { backgroundColor: '#f3f4f6', color: '#111827', padding: 15, borderRadius: 8, fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  
  processBtn: { backgroundColor: '#8b5cf6', padding: 15, borderRadius: 8, alignItems: 'center' },
  processBtnText: { color: '#111827', fontWeight: 'bold', fontSize: 16 }
});


