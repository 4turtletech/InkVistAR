/**
 * AdminAppointmentManagement.jsx -- Full Appointment CRUD
 * 1:1 parity with web's AdminAppointments.js
 * Features: Search, status filter, reference image, edit modal with date/time/status/price, delete
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, Modal, ScrollView, SafeAreaView,
  RefreshControl, Image,
} from 'react-native';
import {
  Search, Calendar, User, Palette, Clock, X, Plus,
  CheckCircle, AlertTriangle, FileText, Trash2, Save,
  ChevronLeft, ChevronRight, Filter,
} from 'lucide-react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../src/theme';
import { StatusBadge } from '../src/components/shared/StatusBadge';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { ConfirmModal } from '../src/components/shared/ConfirmModal';
import { formatCurrency, formatDate, formatTime, getDisplayCode } from '../src/utils/formatters';
import {
  getAdminAppointments, updateAppointmentByAdmin, deleteAppointmentByAdmin,
  createAppointmentByAdmin, API_BASE_URL
} from '../src/utils/api';
import { sanitizeNumeric } from '../src/utils/validators';

export const AdminAppointmentManagement = ({ navigation }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  // Edit modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editClientEmail, setEditClientEmail] = useState('');
  const [editDesignTitle, setEditDesignTitle] = useState('');

  // Delete confirm
  const [deleteModal, setDeleteModal] = useState({ visible: false });

  const loadData = async () => {
    setLoading(true);
    const result = await getAdminAppointments();
    if (result.success) {
      // Sort by most recent ID first (per gemini.md rule)
      const sorted = (result.data || result.appointments || []).sort((a, b) => (b.id || 0) - (a.id || 0));
      setAppointments(sorted);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const openModal = (appt) => {
    setSelectedAppt(appt);
    setEditDate(appt ? (appt.appointment_date ? appt.appointment_date.split('T')[0] : '') : '');
    setEditTime(appt ? appt.start_time || '' : '');
    setEditStatus(appt ? appt.status || 'pending' : 'pending');
    setEditPrice(appt ? String(appt.price || appt.total_price || '') : '');
    setEditClientEmail(appt ? appt.client_email || '' : '');
    setEditDesignTitle(appt ? appt.design_title || '' : '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    const sPrice = parseFloat(sanitizeNumeric(editPrice, true)) || 0;
    
    if (!selectedAppt) {
      if (!editClientEmail || !editDate || !editTime) {
        Alert.alert('Validation Error', 'Email, Date, and Time are required');
        return;
      }
      const result = await createAppointmentByAdmin({
        clientEmail: editClientEmail,
        designTitle: editDesignTitle,
        date: editDate,
        startTime: editTime,
        price: sPrice,
        status: editStatus,
      });
      if (result.success) {
        Alert.alert('Success', 'Appointment created');
        setModalVisible(false);
        loadData();
      } else {
        Alert.alert('Error', result.message || 'Failed to create');
      }
      return;
    }

    const result = await updateAppointmentByAdmin(selectedAppt.id, {
      status: editStatus,
      date: editDate,
      startTime: editTime,
      price: sPrice,
    });
    if (result.success) {
      Alert.alert('Success', 'Appointment updated');
      setModalVisible(false);
      loadData();
    } else if (result.status === 409 || result.message?.toLowerCase().includes('conflict')) {
      Alert.alert('Scheduling Conflict', 'This artist already has an appointment at this time.');
    } else {
      Alert.alert('Error', result.message || 'Failed to update');
    }
  };

  const handleDelete = async () => {
    const result = await deleteAppointmentByAdmin(selectedAppt.id);
    setDeleteModal({ visible: false });
    if (result.success) {
      setModalVisible(false);
      loadData();
    } else {
      Alert.alert('Error', 'Failed to delete appointment');
    }
  };

  // Filter & paginate
  const filteredData = appointments.filter(a => {
    const matchFilter = filter === 'all' || a.status === filter;
    const matchSearch = search === '' ||
      (a.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.artist_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.design_title || '').toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });
  const totalPages = Math.ceil(filteredData.length / perPage);
  const displayed = filteredData.slice((page - 1) * perPage, page * perPage);

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => openModal(item)} activeOpacity={0.7}>
      <View style={styles.cardTop}>
        <View style={styles.cardTopLeft}>
          <Text style={styles.bookingCode}>{getDisplayCode(item.booking_code, item.id)}</Text>
          <Text style={styles.cardDate}>{formatDate(item.appointment_date)}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>{item.design_title || 'Tattoo Session'}</Text>
      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <User size={13} color={colors.textTertiary} />
          <Text style={styles.metaText}>{item.client_name || 'N/A'}</Text>
        </View>
        <View style={styles.metaItem}>
          <Palette size={13} color={colors.textTertiary} />
          <Text style={styles.metaText}>{item.artist_name || 'Unassigned'}</Text>
        </View>
        {item.start_time && (
          <View style={styles.metaItem}>
            <Clock size={13} color={colors.textTertiary} />
            <Text style={styles.metaText}>{formatTime(item.start_time)}</Text>
          </View>
        )}
      </View>
      {item.price || item.total_price ? (
        <Text style={styles.cardPrice}>P{formatCurrency(item.price || item.total_price)}</Text>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Appointments</Text>
          <Text style={styles.headerCount}>{filteredData.length} total</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => openModal(null)}>
          <Plus size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Search size={18} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search client, artist, design..."
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={(t) => { setSearch(t); setPage(1); }}
          maxLength={100}
        />
      </View>

      {/* Status Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        {['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, filter === f && styles.filterPillActive]}
            onPress={() => { setFilter(f); setPage(1); }}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1).replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {loading ? (
        <PremiumLoader message="Loading appointments..." />
      ) : (
        <FlatList
          data={displayed}
          renderItem={renderItem}
          keyExtractor={item => (item.id || Math.random()).toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState icon={Calendar} title="No appointments found" />}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={colors.primary} />}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity disabled={page === 1} onPress={() => setPage(p => p - 1)} style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}>
            <ChevronLeft size={18} color={page === 1 ? colors.textTertiary : colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.pageText}>{page} / {totalPages}</Text>
          <TouchableOpacity disabled={page === totalPages} onPress={() => setPage(p => p + 1)} style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}>
            <ChevronRight size={18} color={page === totalPages ? colors.textTertiary : colors.textPrimary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Appointment</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Modal Scroll View */}
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Info Section */}
                {selectedAppt && selectedAppt.id ? (
                  <View style={styles.infoSection}>
                    <InfoRow label="Booking Code" value={getDisplayCode(selectedAppt.booking_code, selectedAppt.id)} />
                    <InfoRow label="Client" value={`${selectedAppt.client_name}${selectedAppt.client_email ? ` (${selectedAppt.client_email})` : ''}`} />
                    <InfoRow label="Artist" value={selectedAppt.artist_name || 'Unassigned'} />
                    <InfoRow label="Design" value={selectedAppt.design_title || 'Tattoo Session'} />
                    <InfoRow label="Notes" value={selectedAppt.notes || 'No notes'} />
                  </View>
                ) : (
                  <View style={styles.infoSection}>
                    <Text style={styles.inputLabel}>Client Email *</Text>
                    <TextInput style={styles.input} value={editClientEmail} onChangeText={setEditClientEmail} keyboardType="email-address" autoCapitalize="none" />
                    <Text style={styles.inputLabel}>Design Title</Text>
                    <TextInput style={styles.input} value={editDesignTitle} onChangeText={setEditDesignTitle} />
                  </View>
                )}

                {/* Reference Image */}
                {selectedAppt?.before_photo && (
                  <View style={styles.imgContainer}>
                    <Text style={styles.inputLabel}>Reference Image</Text>
                    <Image
                      source={{ uri: selectedAppt.before_photo.startsWith('http') ? selectedAppt.before_photo : `${API_BASE_URL}${selectedAppt.before_photo}` }}
                      style={styles.refImage}
                      resizeMode="contain"
                    />
                  </View>
                )}

                {/* Editable Fields */}
                <Text style={styles.sectionHeader}>Edit Details</Text>

                <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
                <TextInput style={styles.input} value={editDate} onChangeText={setEditDate} />

                <Text style={styles.inputLabel}>Time (HH:MM)</Text>
                <TextInput style={styles.input} value={editTime} onChangeText={setEditTime} />

                <Text style={styles.inputLabel}>Price (PHP)</Text>
                <TextInput style={styles.input} value={editPrice} onChangeText={setEditPrice} keyboardType="numeric" />

                <Text style={styles.inputLabel}>Status</Text>
                <View style={styles.statusRow}>
                  {['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.statusBtn, editStatus === s && styles.statusBtnActive]}
                      onPress={() => setEditStatus(s)}
                    >
                      <Text style={[styles.statusBtnText, editStatus === s && styles.statusBtnTextActive]}>
                        {s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Actions */}
                <View style={styles.actionRow}>
                  {selectedAppt?.id && (
                    <TouchableOpacity style={styles.deleteBtnModal} onPress={() => setDeleteModal({ visible: true })}>
                      <Trash2 size={18} color="#ffffff" />
                      <Text style={styles.actionBtnText}>Delete</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.saveBtnModal} onPress={handleSave}>
                    <Save size={18} color="#ffffff" />
                    <Text style={styles.actionBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        visible={deleteModal.visible}
        title="Delete Appointment"
        message="Are you sure you want to delete this appointment? This action cannot be undone."
        confirmText="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ visible: false })}
      />
    </SafeAreaView>
  );
};

const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || 'N/A'}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  addBtn: {
    width: 36, height: 36, borderRadius: borderRadius.round, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    ...shadows.sm,
  },
  headerCount: { ...typography.body, color: colors.textTertiary, marginTop: 4 },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#ffffff', margin: 16, marginBottom: 8,
    borderRadius: borderRadius.md, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, ...typography.body, color: colors.textPrimary },

  // Filters
  filterScroll: { marginBottom: 8 },
  filterContent: { paddingHorizontal: 16, gap: 6 },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: borderRadius.round,
    backgroundColor: colors.lightBgSecondary,
  },
  filterPillActive: { backgroundColor: colors.primary },
  filterText: { ...typography.bodyXSmall, color: colors.textSecondary, fontWeight: '600' },
  filterTextActive: { color: '#ffffff' },

  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 16 },

  // Card
  card: {
    backgroundColor: '#ffffff', padding: 14, borderRadius: borderRadius.xl,
    marginBottom: 10, borderWidth: 1, borderColor: colors.border, ...shadows.subtle,
  },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
  },
  cardTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bookingCode: { ...typography.bodyXSmall, color: colors.primary, fontWeight: '700' },
  cardDate: { ...typography.bodyXSmall, color: colors.textTertiary },
  cardTitle: { ...typography.body, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...typography.bodyXSmall, color: colors.textSecondary },
  cardPrice: { ...typography.bodySmall, color: colors.success, fontWeight: '700', marginTop: 6 },

  // Pagination
  pagination: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 14, paddingVertical: 10, backgroundColor: '#ffffff',
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  pageBtn: { padding: 6 },
  pageBtnDisabled: { opacity: 0.3 },
  pageText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#ffffff', borderTopLeftRadius: borderRadius.xxl, borderTopRightRadius: borderRadius.xxl,
    maxHeight: '85%', ...shadows.cardStrong,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 18, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { ...typography.h3, color: colors.textPrimary },
  modalBody: { padding: 18 },

  // Info Section
  infoSection: {
    backgroundColor: colors.lightBgSecondary, borderRadius: borderRadius.lg,
    padding: 14, marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 6,
  },
  infoLabel: { ...typography.bodyXSmall, color: colors.textTertiary, fontWeight: '600', width: '30%' },
  infoValue: { ...typography.bodySmall, color: colors.textPrimary, flex: 1, textAlign: 'right' },

  // Image
  imgContainer: { marginBottom: 16 },
  refImage: { width: '100%', height: 200, borderRadius: borderRadius.lg, marginTop: 6, backgroundColor: colors.lightBgSecondary },

  // Edit fields
  sectionHeader: { ...typography.h4, color: colors.primary, marginBottom: 12, marginTop: 4 },
  inputLabel: { ...typography.bodyXSmall, color: colors.textSecondary, fontWeight: '600', marginBottom: 4 },
  input: {
    backgroundColor: colors.lightBgSecondary, color: colors.textPrimary,
    padding: 12, borderRadius: borderRadius.md, marginBottom: 12,
    ...typography.body, borderWidth: 1, borderColor: colors.border,
  },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statusBtn: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: borderRadius.md,
    backgroundColor: colors.lightBgSecondary, minWidth: '30%', alignItems: 'center',
  },
  statusBtnActive: { backgroundColor: colors.primary },
  statusBtnText: { ...typography.bodyXSmall, color: colors.textSecondary, fontWeight: '700' },
  statusBtnTextActive: { color: '#ffffff' },

  // Actions
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  deleteBtnModal: {
    flex: 1, backgroundColor: colors.error, paddingVertical: 14, borderRadius: borderRadius.md,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  saveBtnModal: {
    flex: 1, backgroundColor: colors.success, paddingVertical: 14, borderRadius: borderRadius.md,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    ...shadows.button,
  },
  actionBtnText: { ...typography.button, color: '#ffffff' },
});
