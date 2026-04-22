/**
 * AdminUserManagement.jsx -- Full User CRUD with premium styling
 * 1:1 parity with web's AdminUsers.js
 * Features: Search, role filter, add/edit modal, delete confirm, role badges
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, Modal, KeyboardAvoidingView, Platform, SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Search, Plus, Pencil, Trash2, X, UserPlus, Shield, ChevronDown, ChevronLeft } from 'lucide-react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../src/theme';
import { StatusBadge } from '../src/components/shared/StatusBadge';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { ConfirmModal } from '../src/components/shared/ConfirmModal';
import { getInitials } from '../src/utils/formatters';
import { getAllUsersForAdmin, deleteUserByAdmin, createUserByAdmin, updateUserByAdmin } from '../src/utils/api';

const ROLE_COLORS = {
  admin: { bg: colors.warningBg, text: colors.warning },
  artist: { bg: colors.iconPurpleBg, text: colors.iconPurple },
  customer: { bg: colors.iconBlueBg, text: colors.iconBlue },
  manager: { bg: colors.successBg, text: colors.success },
};

export const AdminUserManagement = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', type: 'customer', password: '', phone: '', status: 'active' });

  // Delete confirm
  const [deleteModal, setDeleteModal] = useState({ visible: false, userId: null, userName: '' });

  const loadUsers = async () => {
    setLoading(true);
    const result = await getAllUsersForAdmin({ search });
    if (result.success) {
      setUsers(result.data || result.users || []);
    }
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, [search]);

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name, email: user.email,
        type: user.user_type || 'customer', password: '',
        phone: user.phone || '', status: user.is_deleted ? 'suspended' : 'active',
      });
    } else {
      setEditingUser(null);
      setFormData({ name: '', email: '', type: 'customer', password: '', phone: '', status: 'active' });
    }
    setModalVisible(true);
  };

  const handleSaveUser = async () => {
    if (!formData.name?.trim() || !formData.email?.trim()) {
      Alert.alert('Validation Error', 'Name and Email are required');
      return;
    }
    if (!editingUser && !formData.password) {
      Alert.alert('Validation Error', 'Password is required for new users');
      return;
    }

    const result = editingUser
      ? await updateUserByAdmin(editingUser.id, formData)
      : await createUserByAdmin(formData);

    if (result.success) {
      Alert.alert('Success', editingUser ? 'User updated' : 'User created');
      setModalVisible(false);
      loadUsers();
    } else {
      Alert.alert('Error', result.message || 'Operation failed');
    }
  };

  const confirmDelete = (userId, userName) => {
    setDeleteModal({ visible: true, userId, userName });
  };

  const performDelete = async () => {
    const result = await deleteUserByAdmin(deleteModal.userId);
    setDeleteModal({ visible: false, userId: null, userName: '' });
    if (result.success) {
      Alert.alert('Success', 'User deleted');
      loadUsers();
    } else {
      Alert.alert('Error', result.message || 'Failed to delete user');
    }
  };

  // Filter
  const filteredUsers = users.filter(u => {
    if (roleFilter !== 'all' && u.user_type !== roleFilter) return false;
    return true;
  });

  const renderUser = ({ item }) => {
    const roleColor = ROLE_COLORS[item.user_type] || ROLE_COLORS.customer;
    return (
      <View style={styles.userCard}>
        <View style={styles.userLeft}>
          <View style={[styles.avatar, { backgroundColor: roleColor.bg }]}>
            <Text style={[styles.avatarText, { color: roleColor.text }]}>{getInitials(item.name)}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
            <View style={[styles.roleBadge, { backgroundColor: roleColor.bg }]}>
              <Text style={[styles.roleText, { color: roleColor.text }]}>
                {(item.user_type || 'customer').toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.userActions}>
          <TouchableOpacity style={[styles.iconBtn, styles.editBtn]} onPress={() => handleOpenModal(item)}>
            <Pencil size={16} color={colors.warning} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, styles.deleteBtn]} onPress={() => confirmDelete(item.id, item.name)}>
            <Trash2 size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>User Management</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => handleOpenModal(null)}>
          <Plus size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Search size={18} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Role Filters */}
      <View style={styles.filterRow}>
        {['all', 'customer', 'artist', 'admin', 'manager'].map(role => (
          <TouchableOpacity
            key={role}
            style={[styles.filterPill, roleFilter === role && styles.filterPillActive]}
            onPress={() => setRoleFilter(role)}
          >
            <Text style={[styles.filterText, roleFilter === role && styles.filterTextActive]}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* User Count */}
      <Text style={styles.countText}>{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}</Text>

      {/* List */}
      {loading ? (
        <PremiumLoader message="Loading users..." />
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUser}
          keyExtractor={item => (item.id || Math.random()).toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState icon={Shield} title="No users found" subtitle="Try adjusting your search or filters" />}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadUsers} tintColor={colors.primary} />}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingUser ? 'Edit User' : 'Create New User'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor={colors.textTertiary}
              value={formData.name}
              onChangeText={t => setFormData({ ...formData, name: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textTertiary}
              value={formData.email}
              onChangeText={t => setFormData({ ...formData, email: t })}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Phone (Optional)"
              placeholderTextColor={colors.textTertiary}
              value={formData.phone}
              onChangeText={t => setFormData({ ...formData, phone: t })}
              keyboardType="phone-pad"
            />

            {/* Role Selector */}
            <Text style={styles.inputLabel}>Role</Text>
            <View style={styles.typeRow}>
              {['customer', 'artist', 'admin', 'manager'].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeBtn, formData.type === type && styles.typeBtnActive]}
                  onPress={() => setFormData({ ...formData, type })}
                >
                  <Text style={[styles.typeText, formData.type === type && styles.typeTextActive]}>
                    {type.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Status (edit only) */}
            {editingUser && (
              <>
                <Text style={styles.inputLabel}>Status</Text>
                <View style={styles.typeRow}>
                  {['active', 'suspended'].map(status => (
                    <TouchableOpacity
                      key={status}
                      style={[styles.typeBtn, formData.status === status && {
                        backgroundColor: status === 'active' ? colors.success : colors.error,
                      }]}
                      onPress={() => setFormData({ ...formData, status })}
                    >
                      <Text style={[styles.typeText, formData.status === status && { color: '#ffffff' }]}>
                        {status.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Password (create only) */}
            {!editingUser && (
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.textTertiary}
                value={formData.password}
                onChangeText={t => setFormData({ ...formData, password: t })}
                secureTextEntry
              />
            )}

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveUser}>
                <Text style={styles.saveBtnText}>{editingUser ? 'Update' : 'Create'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        visible={deleteModal.visible}
        title="Delete User"
        message={`Are you sure you want to delete ${deleteModal.userName}? This action cannot be undone.`}
        confirmText="Delete"
        destructive
        onConfirm={performDelete}
        onCancel={() => setDeleteModal({ visible: false, userId: null, userName: '' })}
      />
    </SafeAreaView>
  );
};

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
    backgroundColor: colors.primary, padding: 10, borderRadius: borderRadius.md,
    ...shadows.button,
  },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#ffffff', margin: 16, marginBottom: 8,
    borderRadius: borderRadius.md, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, ...typography.body, color: colors.textPrimary },

  // Filters
  filterRow: {
    flexDirection: 'row', paddingHorizontal: 16, gap: 6, marginBottom: 8,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.round,
    backgroundColor: colors.lightBgSecondary,
  },
  filterPillActive: { backgroundColor: colors.primary },
  filterText: { ...typography.bodyXSmall, color: colors.textSecondary, fontWeight: '600' },
  filterTextActive: { color: '#ffffff' },

  countText: {
    ...typography.bodySmall, color: colors.textTertiary, paddingHorizontal: 16, marginBottom: 8,
  },

  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },

  // User Card
  userCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#ffffff', padding: 14, borderRadius: borderRadius.xl,
    marginBottom: 8, borderWidth: 1, borderColor: colors.border,
  },
  userLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  avatar: {
    width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { fontWeight: '700', fontSize: 15 },
  userInfo: { flex: 1 },
  userName: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  userEmail: { ...typography.bodyXSmall, color: colors.textSecondary, marginTop: 1 },
  roleBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: borderRadius.round, marginTop: 4,
  },
  roleText: { fontSize: 10, fontWeight: '700' },
  userActions: { flexDirection: 'row', gap: 6 },
  iconBtn: { padding: 8, borderRadius: borderRadius.md },
  editBtn: { backgroundColor: colors.warningBg },
  deleteBtn: { backgroundColor: colors.errorBg },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', padding: 20 },
  modalCard: {
    backgroundColor: '#ffffff', borderRadius: borderRadius.xxl, padding: 20,
    ...shadows.cardStrong,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  modalTitle: { ...typography.h3, color: colors.textPrimary },
  inputLabel: { ...typography.bodyXSmall, color: colors.textSecondary, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  input: {
    backgroundColor: colors.lightBgSecondary, color: colors.textPrimary,
    padding: 12, borderRadius: borderRadius.md, marginBottom: 12,
    ...typography.body, borderWidth: 1, borderColor: colors.border,
  },
  typeRow: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  typeBtn: {
    flex: 1, minWidth: '22%', padding: 10, alignItems: 'center',
    backgroundColor: colors.lightBgSecondary, borderRadius: borderRadius.md,
  },
  typeBtnActive: { backgroundColor: colors.primary },
  typeText: { ...typography.bodyXSmall, color: colors.textSecondary, fontWeight: '700' },
  typeTextActive: { color: '#ffffff' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: borderRadius.md,
    backgroundColor: colors.lightBgSecondary, alignItems: 'center',
  },
  cancelBtnText: { ...typography.button, color: colors.textSecondary },
  saveBtn: {
    flex: 1, paddingVertical: 12, borderRadius: borderRadius.md,
    backgroundColor: colors.primary, alignItems: 'center',
    ...shadows.button,
  },
  saveBtnText: { ...typography.button, color: '#ffffff' },
});
