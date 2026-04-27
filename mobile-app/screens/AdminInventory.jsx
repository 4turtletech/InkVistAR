/**
 * AdminInventory.jsx -- Full Inventory CRUD
 * 1:1 parity with web's AdminInventory.js
 * Features: Stock CRUD, low-stock alerts, search, filter, add/edit modal, stock transactions
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Alert, Modal, ScrollView, SafeAreaView, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import {
  Search, Plus, Pencil, Trash2, X, Package, AlertTriangle,
  TrendingDown, TrendingUp, Archive, ChevronLeft, ChevronRight,
} from 'lucide-react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../src/theme';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { ConfirmModal } from '../src/components/shared/ConfirmModal';
import { formatCurrency } from '../src/utils/formatters';
import {
  getAdminInventory, createAdminInventory, updateAdminInventory,
  deleteAdminInventory, fetchAPI,
} from '../src/utils/api';
import { sanitizeText, sanitizeNumeric } from '../src/utils/validators';

export const AdminInventory = ({ navigation }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all, low, out

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({
    name: '', category: 'Supplies', unit: 'pcs',
    current_stock: '', min_stock: '', cost_per_unit: '',
  });

  // Transaction modal
  const [txModalVisible, setTxModalVisible] = useState(false);
  const [txItem, setTxItem] = useState(null);
  const [txType, setTxType] = useState('in');
  const [txQty, setTxQty] = useState('');
  const [txNotes, setTxNotes] = useState('');

  // Delete
  const [deleteModal, setDeleteModal] = useState({ visible: false, itemId: null, itemName: '' });

  const loadData = async () => {
    setLoading(true);
    const result = await getAdminInventory();
    if (result.success) {
      setItems(result.data || result.inventory || []);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const openForm = (item = null) => {
    if (item) {
      setEditingItem(item);
      setForm({
        name: item.name, category: item.category || 'Supplies',
        unit: item.unit || 'pcs',
        current_stock: String(item.current_stock || 0),
        min_stock: String(item.min_stock || 0),
        cost_per_unit: String(item.cost_per_unit || 0),
      });
    } else {
      setEditingItem(null);
      setForm({ name: '', category: 'Supplies', unit: 'pcs', current_stock: '', min_stock: '', cost_per_unit: '' });
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    const sName = sanitizeText(form.name);
    if (!sName) {
      Alert.alert('Validation Error', 'Item name is required');
      return;
    }
    const payload = {
      ...form,
      name: sName,
      current_stock: parseInt(sanitizeNumeric(form.current_stock)) || 0,
      min_stock: parseInt(sanitizeNumeric(form.min_stock)) || 0,
      cost_per_unit: parseFloat(sanitizeNumeric(form.cost_per_unit, true)) || 0,
    };

    const result = editingItem
      ? await updateAdminInventory(editingItem.id, payload)
      : await createAdminInventory(payload);

    if (result.success) {
      Alert.alert('Success', editingItem ? 'Item updated' : 'Item added');
      setModalVisible(false);
      loadData();
    } else {
      Alert.alert('Error', result.message || 'Failed to save');
    }
  };

  const handleDelete = async () => {
    const result = await deleteAdminInventory(deleteModal.itemId);
    setDeleteModal({ visible: false, itemId: null, itemName: '' });
    if (result.success) {
      loadData();
    } else {
      Alert.alert('Error', result.message || 'Failed to delete');
    }
  };

  const openTxModal = (item) => {
    setTxItem(item);
    setTxType('in');
    setTxQty('');
    setTxNotes('');
    setTxModalVisible(true);
  };

  const handleTransaction = async () => {
    const sQty = parseInt(sanitizeNumeric(txQty));
    if (!sQty || isNaN(sQty) || sQty <= 0) {
      Alert.alert('Validation Error', 'Quantity must be greater than 0');
      return;
    }
    if (!sanitizeText(txNotes)) {
      Alert.alert('Validation Error', 'Reason/Notes is required');
      return;
    }
    const result = await fetchAPI(`/admin/inventory/${txItem.id}/transaction`, {
      method: 'POST',
      body: JSON.stringify({
        type: txType,
        quantity: sQty,
        notes: sanitizeText(txNotes),
      }),
    });
    if (result.success) {
      Alert.alert('Success', `Stock ${txType === 'in' ? 'added' : 'deducted'} successfully`);
      setTxModalVisible(false);
      loadData();
    } else {
      Alert.alert('Error', result.message || 'Transaction failed');
    }
  };

  // Filter
  const filtered = items.filter(item => {
    const matchSearch = (item.name || '').toLowerCase().includes(search.toLowerCase());
    if (filter === 'low') return matchSearch && item.current_stock <= item.min_stock && item.current_stock > 0;
    if (filter === 'out') return matchSearch && item.current_stock <= 0;
    return matchSearch;
  });

  const lowStockCount = items.filter(i => i.current_stock <= i.min_stock && i.current_stock > 0).length;
  const outOfStockCount = items.filter(i => i.current_stock <= 0).length;

  const renderItem = ({ item }) => {
    const isLow = item.current_stock <= item.min_stock && item.current_stock > 0;
    const isOut = item.current_stock <= 0;
    return (
      <View style={[styles.itemCard, isOut && styles.itemCardOut, isLow && styles.itemCardLow]}>
        <View style={styles.itemTop}>
          <View style={styles.itemTopLeft}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.itemCategory}>{item.category || 'General'}</Text>
          </View>
          <View style={styles.stockBadge}>
            <Text style={[
              styles.stockText,
              isOut ? { color: colors.error } :
              isLow ? { color: colors.warning } :
              { color: colors.success }
            ]}>
              {item.current_stock} {item.unit || 'pcs'}
            </Text>
            {isLow && <AlertTriangle size={14} color={colors.warning} />}
            {isOut && <AlertTriangle size={14} color={colors.error} />}
          </View>
        </View>

        <View style={styles.itemMeta}>
          <Text style={styles.metaText}>Min: {item.min_stock || 0}</Text>
          <Text style={styles.metaText}>Cost: P{formatCurrency(item.cost_per_unit || 0)}/{item.unit || 'pc'}</Text>
        </View>

        <View style={styles.itemActions}>
          <TouchableOpacity style={styles.txBtn} onPress={() => openTxModal(item)}>
            <TrendingUp size={14} color={colors.success} />
            <Text style={[styles.txBtnText, { color: colors.success }]}>Stock In/Out</Text>
          </TouchableOpacity>
          <View style={styles.iconActions}>
            <TouchableOpacity style={[styles.iconBtn, styles.editBtn]} onPress={() => openForm(item)}>
              <Pencil size={14} color={colors.warning} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, styles.delBtn]} onPress={() => setDeleteModal({ visible: true, itemId: item.id, itemName: item.name })}>
              <Trash2 size={14} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation?.goBack?.()} style={{ marginRight: 15 }}>
            <ChevronLeft size={24} color="#0f172a" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Inventory</Text>
            <Text style={styles.headerSub}>{items.length} items total</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => openForm(null)}>
          <Plus size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Alert banner */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <View style={styles.alertBanner}>
          <AlertTriangle size={16} color={colors.warning} />
          <Text style={styles.alertText}>
            {lowStockCount > 0 ? `${lowStockCount} low stock` : ''}
            {lowStockCount > 0 && outOfStockCount > 0 ? ' | ' : ''}
            {outOfStockCount > 0 ? `${outOfStockCount} out of stock` : ''}
          </Text>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchBar}>
        <Search size={18} color={colors.textTertiary} />
        <TextInput style={styles.searchInput} placeholder="Search items..." placeholderTextColor={colors.textTertiary} value={search} onChangeText={setSearch} />
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {[{ key: 'all', label: 'All' }, { key: 'low', label: 'Low Stock' }, { key: 'out', label: 'Out of Stock' }].map(f => (
          <TouchableOpacity key={f.key} style={[styles.filterPill, filter === f.key && styles.filterPillActive]} onPress={() => setFilter(f.key)}>
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading ? <PremiumLoader message="Loading inventory..." /> : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={item => (item.id || Math.random()).toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState icon={Package} title="No inventory items" subtitle="Add items to start tracking" actionLabel="Add Item" onAction={() => openForm(null)} />}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={colors.primary} />}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingItem ? 'Edit Item' : 'Add New Item'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><X size={22} color={colors.textSecondary} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Item Name</Text>
              <TextInput style={styles.input} value={form.name} onChangeText={t => setForm({ ...form, name: t })} placeholder="e.g. Disposable Gloves" placeholderTextColor={colors.textTertiary} />

              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.typeRow}>
                {['Supplies', 'Ink', 'Needles', 'Equipment', 'Other'].map(cat => (
                  <TouchableOpacity key={cat} style={[styles.typeBtn, form.category === cat && styles.typeBtnActive]} onPress={() => setForm({ ...form, category: cat })}>
                    <Text style={[styles.typeText, form.category === cat && styles.typeTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Unit</Text>
              <View style={styles.typeRow}>
                {['pcs', 'bottles', 'boxes', 'sets', 'ml', 'g'].map(u => (
                  <TouchableOpacity key={u} style={[styles.typeBtn, form.unit === u && styles.typeBtnActive]} onPress={() => setForm({ ...form, unit: u })}>
                    <Text style={[styles.typeText, form.unit === u && styles.typeTextActive]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Current Stock</Text>
              <TextInput style={styles.input} value={form.current_stock} onChangeText={t => setForm({ ...form, current_stock: t })} keyboardType="numeric" />

              <Text style={styles.inputLabel}>Minimum Stock (Alert Threshold)</Text>
              <TextInput style={styles.input} value={form.min_stock} onChangeText={t => setForm({ ...form, min_stock: t })} keyboardType="numeric" />

              <Text style={styles.inputLabel}>Cost per Unit (PHP)</Text>
              <TextInput style={styles.input} value={form.cost_per_unit} onChangeText={t => setForm({ ...form, cost_per_unit: t })} keyboardType="decimal-pad" />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveBtnText}>{editingItem ? 'Update' : 'Add Item'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Stock Transaction Modal */}
      <Modal visible={txModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Stock Transaction</Text>
              <TouchableOpacity onPress={() => setTxModalVisible(false)}><X size={22} color={colors.textSecondary} /></TouchableOpacity>
            </View>
            {txItem && (
              <View style={{ padding: 4 }}>
                <Text style={styles.txItemName}>{txItem.name}</Text>
                <Text style={styles.txItemStock}>Current: {txItem.current_stock} {txItem.unit}</Text>

                <Text style={styles.inputLabel}>Transaction Type</Text>
                <View style={styles.typeRow}>
                  <TouchableOpacity style={[styles.typeBtn, txType === 'in' && { backgroundColor: colors.success }]} onPress={() => setTxType('in')}>
                    <Text style={[styles.typeText, txType === 'in' && { color: '#fff' }]}>Stock In</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.typeBtn, txType === 'out' && { backgroundColor: colors.error }]} onPress={() => setTxType('out')}>
                    <Text style={[styles.typeText, txType === 'out' && { color: '#fff' }]}>Stock Out</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Quantity</Text>
                <TextInput style={styles.input} value={txQty} onChangeText={setTxQty} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textTertiary} />

                <Text style={styles.inputLabel}>Notes (Optional)</Text>
                <TextInput style={[styles.input, { height: 60 }]} value={txNotes} onChangeText={setTxNotes} multiline placeholder="Reason for transaction..." placeholderTextColor={colors.textTertiary} />

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setTxModalVisible(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.saveBtn, txType === 'out' && { backgroundColor: colors.error }]} onPress={handleTransaction}>
                    <Text style={styles.saveBtnText}>Submit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        visible={deleteModal.visible}
        title="Delete Item"
        message={`Delete "${deleteModal.itemName}" from inventory?`}
        confirmText="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ visible: false, itemId: null, itemName: '' })}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  headerSub: { ...typography.bodyXSmall, color: colors.textTertiary, marginTop: 2 },
  addBtn: { backgroundColor: colors.primary, padding: 10, borderRadius: borderRadius.md, ...shadows.button },

  // Alert
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.warningBg, margin: 16, marginBottom: 0,
    padding: 10, borderRadius: borderRadius.md,
  },
  alertText: { ...typography.bodySmall, color: colors.warning, fontWeight: '600' },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#ffffff', margin: 16, marginBottom: 8,
    borderRadius: borderRadius.md, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, ...typography.body, color: colors.textPrimary },

  // Filters
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  filterPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: borderRadius.round, backgroundColor: colors.lightBgSecondary },
  filterPillActive: { backgroundColor: colors.primary },
  filterText: { ...typography.bodyXSmall, color: colors.textSecondary, fontWeight: '600' },
  filterTextActive: { color: '#ffffff' },

  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },

  // Item Card
  itemCard: {
    backgroundColor: '#ffffff', padding: 14, borderRadius: borderRadius.xl,
    marginBottom: 8, borderWidth: 1, borderColor: colors.border,
  },
  itemCardLow: { borderLeftWidth: 3, borderLeftColor: colors.warning },
  itemCardOut: { borderLeftWidth: 3, borderLeftColor: colors.error },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemTopLeft: { flex: 1, marginRight: 8 },
  itemName: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  itemCategory: { ...typography.bodyXSmall, color: colors.textTertiary, marginTop: 2 },
  stockBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stockText: { ...typography.body, fontWeight: '700' },
  itemMeta: { flexDirection: 'row', gap: 16, marginTop: 8 },
  metaText: { ...typography.bodyXSmall, color: colors.textTertiary },
  itemActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  txBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
  txBtnText: { ...typography.bodyXSmall, fontWeight: '600' },
  iconActions: { flexDirection: 'row', gap: 6 },
  iconBtn: { padding: 7, borderRadius: borderRadius.sm },
  editBtn: { backgroundColor: colors.warningBg },
  delBtn: { backgroundColor: colors.errorBg },

  // Modal shared
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: borderRadius.xxl, padding: 20, maxHeight: '80%', ...shadows.cardStrong },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { ...typography.h3, color: colors.textPrimary },
  inputLabel: { ...typography.bodyXSmall, color: colors.textSecondary, fontWeight: '600', marginBottom: 4, marginTop: 4 },
  input: {
    backgroundColor: colors.lightBgSecondary, color: colors.textPrimary,
    padding: 12, borderRadius: borderRadius.md, marginBottom: 10,
    ...typography.body, borderWidth: 1, borderColor: colors.border,
  },
  typeRow: { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  typeBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: borderRadius.md, backgroundColor: colors.lightBgSecondary },
  typeBtnActive: { backgroundColor: colors.primary },
  typeText: { ...typography.bodyXSmall, color: colors.textSecondary, fontWeight: '700' },
  typeTextActive: { color: '#ffffff' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: borderRadius.md, backgroundColor: colors.lightBgSecondary, alignItems: 'center' },
  cancelBtnText: { ...typography.button, color: colors.textSecondary },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: borderRadius.md, backgroundColor: colors.primary, alignItems: 'center', ...shadows.button },
  saveBtnText: { ...typography.button, color: '#ffffff' },

  // TX modal
  txItemName: { ...typography.h4, color: colors.textPrimary, marginBottom: 4 },
  txItemStock: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: 12 },
});
