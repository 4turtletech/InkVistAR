/**
 * AdminStaff.jsx -- Artist & Staff Management
 * Handles staff profiles, commission tracking, and schedule views.
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

export const AdminStaff = ({ navigation }) => {
  const { theme, hapticsEnabled } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(theme, insets);

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/api/admin/users?role=artist`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStaff(data.users || data.data || []);
      }
    } catch (e) {
      console.warn('AdminStaff fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openProfile = (item) => {
    setSelectedStaff(item);
    setModalVisible(true);
  };

  const renderStaff = ({ item, index }) => (
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
              <View style={styles.commissionBadge}>
                <Text style={styles.commissionText}>{((item.commission_rate || 0.3) * 100).toFixed(0)}% Commission</Text>
              </View>
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
          <Text style={styles.headerTitle}>Staff Directory</Text>
          <Text style={styles.headerSub}>{staff.length} Active Artists</Text>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Search size={18} color={theme.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search staff members..."
          placeholderTextColor={theme.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <PremiumLoader message="Loading staff records..." />
      ) : (
        <FlatList
          data={staff.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()))}
          renderItem={renderStaff}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState icon={Users} title="No staff found" />}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={theme.gold} />}
        />
      )}

      {/* Profile Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Staff Profile</Text>
              <AnimatedTouchable onPress={() => setModalVisible(false)}>
                <X size={22} color={theme.textSecondary} />
              </AnimatedTouchable>
            </View>
            {selectedStaff && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.profileTop}>
                  {selectedStaff.profile_image ? (
                    <Image source={{ uri: selectedStaff.profile_image.startsWith('http') ? selectedStaff.profile_image : `${API_BASE_URL}${selectedStaff.profile_image}` }} style={styles.modalAvatar} />
                  ) : (
                    <View style={styles.modalAvatarPlaceholder}>
                      <Text style={styles.modalAvatarText}>{getInitials(selectedStaff.name)}</Text>
                    </View>
                  )}
                  <Text style={styles.modalName}>{selectedStaff.name}</Text>
                  <Text style={styles.modalRole}>Resident Artist</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{selectedStaff.email}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{selectedStaff.phone || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Commission Rate</Text>
                  <Text style={styles.detailValue}>{((selectedStaff.commission_rate || 0.3) * 100).toFixed(0)}%</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Joined Date</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedStaff.created_at)}</Text>
                </View>
                
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
  avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: theme.iconPurpleBg, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { ...typography.h4, color: theme.iconPurple },
  cardInfo: { flex: 1 },
  cardName: { ...typography.body, fontWeight: '700', color: theme.textPrimary },
  cardEmail: { ...typography.bodySmall, color: theme.textSecondary, marginBottom: 6 },
  badgeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  commissionBadge: { backgroundColor: theme.gold + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  commissionText: { ...typography.bodyXSmall, color: theme.gold, fontWeight: '700' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,13,14,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: theme.surface, borderTopLeftRadius: borderRadius.xxl, borderTopRightRadius: borderRadius.xxl, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: theme.border },
  modalTitle: { ...typography.h3, color: theme.textPrimary },
  modalBody: { padding: 20 },
  profileTop: { alignItems: 'center', marginBottom: 24 },
  modalAvatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  modalAvatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.iconPurpleBg, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  modalAvatarText: { fontSize: 32, fontWeight: '700', color: theme.iconPurple },
  modalName: { ...typography.h3, color: theme.textPrimary, marginBottom: 4 },
  modalRole: { ...typography.bodySmall, color: theme.gold, fontWeight: '600' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border },
  detailLabel: { ...typography.bodySmall, color: theme.textSecondary, fontWeight: '600', textTransform: 'uppercase' },
  detailValue: { ...typography.body, color: theme.textPrimary, textAlign: 'right', fontWeight: '500' },
});
