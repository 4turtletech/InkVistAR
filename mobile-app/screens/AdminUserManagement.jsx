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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/context/ThemeContext';
import { typography, spacing, borderRadius, shadows } from '../src/theme';
import { AnimatedTouchable } from '../src/components/shared/AnimatedTouchable';
import { StaggerItem } from '../src/components/shared/StaggerItem';
import { StatusBadge } from '../src/components/shared/StatusBadge';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { ConfirmModal } from '../src/components/shared/ConfirmModal';
import { ClientProfileModal } from '../src/components/Admin/ClientProfileModal';
import { ArtistProfileModal } from '../src/components/Admin/ArtistProfileModal';
import { getInitials } from '../src/utils/formatters';
import { getAllUsersForAdmin, deleteUserByAdmin, createUserByAdmin, updateUserByAdmin } from '../src/utils/api';
import { sanitizeText, sanitizeEmail, isValidEmail, sanitizePhone } from '../src/utils/validators';

const getRoleColors = (theme) => ({
  admin: { bg: theme.warningBg || 'rgba(245, 158, 11, 0.15)', text: theme.warning || '#f59e0b' },
  artist: { bg: theme.iconPurpleBg || 'rgba(168, 85, 247, 0.15)', text: theme.iconPurple || '#a855f7' },
  customer: { bg: theme.iconBlueBg || 'rgba(59, 130, 246, 0.15)', text: theme.iconBlue || '#3b82f6' },
  manager: { bg: theme.successBg || 'rgba(16, 185, 129, 0.15)', text: theme.success || '#10b981' },
});

export const AdminUserManagement = ({ navigation }) => {
  const { theme, hapticsEnabled } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(theme, insets);
  const ROLE_COLORS = getRoleColors(theme);
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
    const sName = sanitizeText(formData.name);
    const sEmail = sanitizeEmail(formData.email);
    const sPhone = sanitizePhone(formData.phone);

    if (!sName || !sEmail) {
      Alert.alert('Validation Error', 'Name and Email are required');
      return;
    }
    if (!isValidEmail(sEmail)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return;
    }
    if (!editingUser && !formData.password) {
      Alert.alert('Validation Error', 'Password is required for new users');
      return;
    }

    const payload = { ...formData, name: sName, email: sEmail, phone: sPhone };

    const result = editingUser
      ? await updateUserByAdmin(editingUser.id, payload)
      : await createUserByAdmin(payload);

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

  const renderUser = ({ item, index }) => {
    const roleColor = ROLE_COLORS[item.user_type] || ROLE_COLORS.customer;
    return (
      <StaggerItem index={index}>
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
            <AnimatedTouchable style={[styles.iconBtn, styles.editBtn]} onPress={() => handleOpenModal(item)}>
              <Pencil size={16} color={theme.warning} />
            </AnimatedTouchable>
            <AnimatedTouchable style={[styles.iconBtn, styles.deleteBtn]} onPress={() => confirmDelete(item.id, item.name)}>
              <Trash2 size={16} color={theme.error} />
            </AnimatedTouchable>
          </View>
        </View>
      </StaggerItem>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>User Roster</Text>
        <AnimatedTouchable style={styles.addBtn} onPress={() => handleOpenModal(null)}>
          <Plus size={20} color={theme.backgroundDeep} />
        </AnimatedTouchable>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Search size={18} color={theme.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          placeholderTextColor={theme.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Role Filters */}
      <View style={styles.filterRow}>
        {['all', 'customer', 'artist', 'admin', 'manager'].map(role => (
          <AnimatedTouchable
            key={role}
            style={[styles.filterPill, roleFilter === role && styles.filterPillActive]}
            onPress={() => setRoleFilter(role)}
          >
            <Text style={[styles.filterText, roleFilter === role && styles.filterTextActive]}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </Text>
          </AnimatedTouchable>
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
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadUsers} tintColor={theme.gold} />}
        />
      )}

      {/* Customer Modal */}
      <ClientProfileModal
        visible={modalVisible && editingUser?.user_type === 'customer'}
        client={editingUser}
        onClose={() => setModalVisible(false)}
        onRefreshUsers={loadUsers}
      />

      {/* Artist Modal */}
      <ArtistProfileModal
        visible={modalVisible && editingUser?.user_type === 'artist'}
        artist={editingUser}
        onClose={() => setModalVisible(false)}
        onRefreshUsers={loadUsers}
      />

      {/* Add/Edit Modal for Admins & Managers */}
      <Modal visible={modalVisible && (!editingUser || ['admin', 'manager'].includes(editingUser.user_type))} animationType="fade" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingUser ? 'Edit User' : 'New User'}</Text>
              <AnimatedTouchable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color={theme.textSecondary} />
              </AnimatedTouchable>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor={theme.textTertiary}
              value={formData.name}
              onChangeText={t => setFormData({ ...formData, name: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={theme.textTertiary}
              value={formData.email}
              onChangeText={t => setFormData({ ...formData, email: t })}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Phone (Optional)"
              placeholderTextColor={theme.textTertiary}
              value={formData.phone}
              onChangeText={t => setFormData({ ...formData, phone: t })}
              keyboardType="phone-pad"
            />

            {/* Role Selector */}
            <Text style={styles.inputLabel}>Role</Text>
            <View style={styles.typeRow}>
              {['customer', 'artist', 'admin', 'manager'].map(type => (
                <AnimatedTouchable
                  key={type}
                  style={[styles.typeBtn, formData.type === type && styles.typeBtnActive]}
                  onPress={() => setFormData({ ...formData, type })}
                >
                  <Text style={[styles.typeText, formData.type === type && styles.typeTextActive]}>
                    {type.toUpperCase()}
                  </Text>
                </AnimatedTouchable>
              ))}
            </View>

            {/* Status (edit only) */}
            {editingUser && (
              <>
                <Text style={styles.inputLabel}>Status</Text>
                <View style={styles.typeRow}>
                  {['active', 'suspended'].map(status => (
                    <AnimatedTouchable
                      key={status}
                      style={[styles.typeBtn, formData.status === status && {
                        backgroundColor: status === 'active' ? theme.success : theme.error,
                        borderColor: status === 'active' ? theme.success : theme.error,
                      }]}
                      onPress={() => setFormData({ ...formData, status })}
                    >
                      <Text style={[styles.typeText, formData.status === status && { color: theme.backgroundDeep }]}>
                        {status.toUpperCase()}
                      </Text>
                    </AnimatedTouchable>
                  ))}
                </View>
              </>
            )}

            {/* Password (create only) */}
            {!editingUser && (
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={theme.textTertiary}
                value={formData.password}
                onChangeText={t => setFormData({ ...formData, password: t })}
                secureTextEntry
              />
            )}

            {/* Actions */}
            <View style={styles.modalActions}>
              <AnimatedTouchable style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </AnimatedTouchable>
              <AnimatedTouchable style={styles.saveBtn} onPress={handleSaveUser}>
                <Text style={styles.saveBtnText}>{editingUser ? 'Update' : 'Create'}</Text>
              </AnimatedTouchable>
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

const getStyles = (theme, insets) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16,
    backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  headerTitle: { ...typography.h2, color: theme.textPrimary },
  addBtn: {
    backgroundColor: theme.gold, padding: 10, borderRadius: borderRadius.md,
    ...shadows.button,
  },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.surfaceLight, margin: 16, marginBottom: 8,
    borderRadius: borderRadius.md, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: theme.border,
  },
  searchInput: { flex: 1, ...typography.body, color: theme.textPrimary },

  // Filters
  filterRow: {
    flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: borderRadius.round,
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.borderLight,
  },
  filterPillActive: { backgroundColor: theme.gold, borderColor: theme.gold },
  filterText: { ...typography.bodyXSmall, color: theme.textSecondary, fontWeight: '600' },
  filterTextActive: { color: theme.backgroundDeep },

  countText: {
    ...typography.bodySmall, color: theme.textTertiary, paddingHorizontal: 16, marginBottom: 8,
  },

  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },

  // User Card
  userCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: theme.surface, padding: 16, borderRadius: borderRadius.xl,
    marginBottom: 10, borderWidth: 1, borderColor: theme.borderLight, ...shadows.subtle,
  },
  userLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  avatar: {
    width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  avatarText: { fontWeight: '700', fontSize: 16 },
  userInfo: { flex: 1 },
  userName: { ...typography.body, fontWeight: '700', color: theme.textPrimary },
  userEmail: { ...typography.bodyXSmall, color: theme.textSecondary, marginTop: 2 },
  roleBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: borderRadius.round, marginTop: 6,
  },
  roleText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  userActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 10, borderRadius: borderRadius.md, borderWidth: 1, borderColor: theme.borderLight },
  editBtn: { backgroundColor: theme.surfaceLight },
  deleteBtn: { backgroundColor: theme.surfaceLight },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalCard: {
    backgroundColor: theme.surface, borderRadius: borderRadius.xxl, padding: 24,
    ...shadows.cardStrong, borderWidth: 1, borderColor: theme.borderLight,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { ...typography.h3, color: theme.textPrimary },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: theme.surfaceLight,
    justifyContent: 'center', alignItems: 'center',
  },
  inputLabel: { ...typography.bodyXSmall, color: theme.textSecondary, fontWeight: '600', marginBottom: 8, marginTop: 8 },
  input: {
    backgroundColor: theme.surfaceLight, color: theme.textPrimary,
    padding: 14, borderRadius: borderRadius.md, marginBottom: 16,
    ...typography.body, borderWidth: 1, borderColor: theme.border,
  },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  typeBtn: {
    flex: 1, minWidth: '22%', padding: 12, alignItems: 'center',
    backgroundColor: theme.surfaceLight, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: theme.borderLight,
  },
  typeBtnActive: { backgroundColor: theme.gold, borderColor: theme.gold },
  typeText: { ...typography.bodyXSmall, color: theme.textSecondary, fontWeight: '700' },
  typeTextActive: { color: theme.backgroundDeep },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  cancelBtn: {
    flex: 1, paddingVertical: 16, borderRadius: borderRadius.md,
    backgroundColor: theme.surfaceLight, alignItems: 'center', borderWidth: 1, borderColor: theme.borderLight,
  },
  cancelBtnText: { ...typography.button, color: theme.textSecondary },
  saveBtn: {
    flex: 1, paddingVertical: 16, borderRadius: borderRadius.md,
    backgroundColor: theme.gold, alignItems: 'center',
    ...shadows.button,
  },
  saveBtnText: { ...typography.button, color: theme.backgroundDeep },
});
