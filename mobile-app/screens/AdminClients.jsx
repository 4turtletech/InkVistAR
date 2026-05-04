/**
 * AdminClients.jsx -- Client CRM Management
 * Handles client profiles and appointment history.
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, Modal, ScrollView, SafeAreaView,
  RefreshControl, Image
} from 'react-native';
import {
  Search, Users, ChevronLeft, ChevronRight, X
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/context/ThemeContext';
import { typography, borderRadius, shadows } from '../src/theme';
import { AnimatedTouchable } from '../src/components/shared/AnimatedTouchable';
import { StaggerItem } from '../src/components/shared/StaggerItem';
import { StatusBadge } from '../src/components/shared/StatusBadge';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { formatDate, getInitials } from '../src/utils/formatters';
import { API_BASE_URL } from '../src/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AdminClients = ({ navigation }) => {
  const { theme, hapticsEnabled } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(theme, insets);

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientHistory, setClientHistory] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/api/admin/users?role=customer`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setClients(data.users || data.data || []);
      }
    } catch (e) {
      console.warn('AdminClients fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openProfile = async (item) => {
    setSelectedClient(item);
    setModalVisible(true);
    // Fetch their history
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/api/admin/appointments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const theirAppts = (data.data || data.appointments || []).filter(a => a.customer_id === item.id);
        setClientHistory(theirAppts);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const renderClient = ({ item, index }) => (
    <StaggerItem index={index}>
      <AnimatedTouchable style={styles.card} onPress={() => openProfile(item)}>
        <View style={styles.cardLeft}>
          {item.profile_image ? (
            <Image source={{ uri: item.profile_image.startsWith('http') ? item.profile_image : `${API_BASE_URL}${item.profile_image}` }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
            </View>
          )}
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardEmail}>{item.email}</Text>
            <View style={styles.badgeRow}>
              <StatusBadge status="active" />
            </View>
          </View>
        </View>
        <ChevronRight size={20} color={theme.textTertiary} />
      </AnimatedTouchable>
    </StaggerItem>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <AnimatedTouchable onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.textPrimary} />
        </AnimatedTouchable>
        <View style={{ flex: 1, paddingLeft: 12 }}>
          <Text style={styles.headerTitle}>Client Directory</Text>
          <Text style={styles.headerSub}>{clients.length} Registered Clients</Text>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Search size={18} color={theme.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search clients..."
          placeholderTextColor={theme.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <PremiumLoader message="Loading client records..." />
      ) : (
        <FlatList
          data={clients.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()))}
          renderItem={renderClient}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState icon={Users} title="No clients found" />}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={theme.gold} />}
        />
      )}

      {/* Profile Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Client Profile</Text>
              <AnimatedTouchable onPress={() => setModalVisible(false)}>
                <X size={22} color={theme.textSecondary} />
              </AnimatedTouchable>
            </View>
            {selectedClient && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.profileTop}>
                  {selectedClient.profile_image ? (
                    <Image source={{ uri: selectedClient.profile_image.startsWith('http') ? selectedClient.profile_image : `${API_BASE_URL}${selectedClient.profile_image}` }} style={styles.modalAvatar} />
                  ) : (
                    <View style={styles.modalAvatarPlaceholder}>
                      <Text style={styles.modalAvatarText}>{getInitials(selectedClient.name)}</Text>
                    </View>
                  )}
                  <Text style={styles.modalName}>{selectedClient.name}</Text>
                  <Text style={styles.modalRole}>Customer</Text>
                </View>

                <Text style={styles.sectionTitle}>Details</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{selectedClient.email}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{selectedClient.phone || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Joined Date</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedClient.created_at)}</Text>
                </View>

                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Appointment History</Text>
                {clientHistory.length > 0 ? (
                  clientHistory.map(appt => (
                    <View key={appt.id} style={styles.historyCard}>
                      <View style={styles.historyTop}>
                        <Text style={styles.historyService}>{appt.design_title || 'Tattoo Session'}</Text>
                        <StatusBadge status={appt.status} />
                      </View>
                      <Text style={styles.historyArtist}>with {appt.artist_name || 'Studio'}</Text>
                      <Text style={styles.historyDate}>{formatDate(appt.appointment_date)}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyHistory}>No appointments found.</Text>
                )}
                
                <View style={{height: 40}} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const getStyles = (theme, insets) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: (insets?.top || 0) + 12, paddingBottom: 16,
    backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  headerTitle: { ...typography.h2, color: theme.textPrimary },
  headerSub: { ...typography.bodySmall, color: theme.gold, marginTop: 2 },
  backBtn: { padding: 4 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, margin: 16, paddingHorizontal: 14, paddingVertical: 12, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: theme.border, gap: 10 },
  searchInput: { flex: 1, ...typography.body, color: theme.textPrimary },
  listContent: { padding: 16, paddingTop: 0, paddingBottom: 80 },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.surface, padding: 16, borderRadius: borderRadius.xl, marginBottom: 12, borderWidth: 1, borderColor: theme.border, ...shadows.subtle },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: theme.iconBlueBg, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { ...typography.h4, color: theme.iconBlue },
  cardInfo: { flex: 1 },
  cardName: { ...typography.body, fontWeight: '700', color: theme.textPrimary },
  cardEmail: { ...typography.bodySmall, color: theme.textSecondary, marginBottom: 6 },
  badgeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,13,14,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: theme.surface, borderTopLeftRadius: borderRadius.xxl, borderTopRightRadius: borderRadius.xxl, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: theme.border },
  modalTitle: { ...typography.h3, color: theme.textPrimary },
  modalBody: { padding: 20 },
  profileTop: { alignItems: 'center', marginBottom: 24 },
  modalAvatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  modalAvatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.iconBlueBg, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  modalAvatarText: { fontSize: 32, fontWeight: '700', color: theme.iconBlue },
  modalName: { ...typography.h3, color: theme.textPrimary, marginBottom: 4 },
  modalRole: { ...typography.bodySmall, color: theme.textSecondary, fontWeight: '600' },
  
  sectionTitle: { ...typography.h4, color: theme.textPrimary, marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border },
  detailLabel: { ...typography.bodySmall, color: theme.textSecondary, fontWeight: '600', textTransform: 'uppercase' },
  detailValue: { ...typography.body, color: theme.textPrimary, textAlign: 'right', fontWeight: '500' },
  
  historyCard: { backgroundColor: theme.surfaceLight, padding: 14, borderRadius: borderRadius.md, borderWidth: 1, borderColor: theme.border, marginBottom: 10 },
  historyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  historyService: { ...typography.body, fontWeight: '700', color: theme.textPrimary },
  historyArtist: { ...typography.bodySmall, color: theme.textSecondary, marginBottom: 6 },
  historyDate: { ...typography.bodyXSmall, color: theme.textTertiary },
  emptyHistory: { ...typography.bodySmall, color: theme.textTertiary, fontStyle: 'italic' }
});
