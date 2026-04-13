import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform, Modal, KeyboardAvoidingView, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAllUsersForAdmin, deleteUserByAdmin, createUserByAdmin, updateUserByAdmin } from '../src/utils/api';

export const AdminUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', type: 'customer', password: '', phone: '', status: 'active' });

  const loadUsers = async () => {
    setLoading(true);
    const result = await getAllUsersForAdmin({ search });
    if (result.success) {
      setUsers(result.data || []);
    } else {
      // Alert.alert('Error', 'Failed to load users'); // Optional: suppress initial load error
      console.log('Failed to load users', result);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, [search]);

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({ name: user.name, email: user.email, type: user.user_type || 'customer', password: '', phone: user.phone || '', status: user.is_deleted ? 'suspended' : 'active' });
    } else {
      setEditingUser(null);
      setFormData({ name: '', email: '', type: 'customer', password: '', phone: '', status: 'active' });
    }
    setModalVisible(true);
  };

  const handleSaveUser = async () => {
    if (!formData.name || !formData.email) {
      Alert.alert('Error', 'Name and Email are required');
      return;
    }

    let result;
    if (editingUser) {
      // Update
      result = await updateUserByAdmin(editingUser.id, formData);
    } else {
      // Create
      if (!formData.password) {
        Alert.alert('Error', 'Password is required for new users');
        return;
      }
      result = await createUserByAdmin(formData);
    }

    if (result.success) {
      Alert.alert('Success', editingUser ? 'User updated' : 'User created');
      setModalVisible(false);
      loadUsers();
    } else {
      Alert.alert('Error', result.message || 'Operation failed');
    }
  };

  const handleDelete = (userId, userName) => {
    // Web Support: Alert.alert doesn't support custom buttons well on Web
    if (Platform.OS === 'web') {
      if (confirm(`Are you sure you want to delete ${userName}?`)) {
        performDelete(userId);
      }
      return;
    }

    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => performDelete(userId)
        }
      ]
    );
  };

  const performDelete = async (userId) => {
    console.log('🗑️ Sending delete request...');
    const result = await deleteUserByAdmin(userId);
    console.log('🗑️ Delete result:', result);
    if (result.success) {
      if (Platform.OS !== 'web') Alert.alert('Success', 'User deleted');
      else alert('User deleted');
      loadUsers();
    } else {
      if (Platform.OS !== 'web') Alert.alert('Error', result.message || 'Failed to delete user');
      else alert(result.message || 'Failed to delete user');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.userRow}>
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name ? item.name[0].toUpperCase() : '?'}</Text>
        </View>
        <View>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <Text style={[styles.userType, { color: item.user_type === 'artist' ? '#8b5cf6' : (item.user_type === 'admin' ? '#f59e0b' : '#3b82f6') }]}>
            {(item.user_type || 'customer').toUpperCase()}
          </Text>
        </View>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity onPress={() => handleOpenModal(item)} style={[styles.iconButton, styles.editButton]}>
          <Ionicons name="pencil" size={20} color="#f59e0b" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={[styles.iconButton, styles.deleteButton]}>
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>User Management</Text>
        <TouchableOpacity onPress={() => handleOpenModal(null)} style={styles.addButton}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#f59e0b" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={users}
          renderItem={renderItem}
          keyExtractor={item => item.id ? item.id.toString() : Math.random().toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No users found</Text>}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingUser ? 'Edit User' : 'Add New User'}</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#9ca3af"
              value={formData.name}
              onChangeText={t => setFormData({...formData, name: t})}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#9ca3af"
              value={formData.email}
              onChangeText={t => setFormData({...formData, email: t})}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Phone Number (Optional)"
              placeholderTextColor="#9ca3af"
              value={formData.phone}
              onChangeText={t => setFormData({...formData, phone: t})}
            />
            
            {/* Simple Type Selector */}
            <View style={styles.typeRow}>
              {['customer', 'artist', 'admin'].map(type => (
                <TouchableOpacity 
                  key={type} 
                  style={[styles.typeButton, formData.type === type && styles.typeButtonActive]}
                  onPress={() => setFormData({...formData, type})}
                >
                  <Text style={[styles.typeText, formData.type === type && styles.typeTextActive]}>{type.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {editingUser && (
              <View style={styles.typeRow}>
                {['active', 'suspended'].map(status => (
                  <TouchableOpacity 
                    key={status} 
                    style={[styles.typeButton, formData.status === status && { backgroundColor: status === 'active' ? '#10b981' : '#ef4444' }]}
                    onPress={() => setFormData({...formData, status})}
                  >
                    <Text style={[styles.typeText, formData.status === status && styles.typeTextActive]}>{status.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {!editingUser && (
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#9ca3af"
                value={formData.password}
                onChangeText={t => setFormData({...formData, password: t})}
                secureTextEntry
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelButton}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveUser} style={styles.saveButton}>
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#1f2937' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  addButton: { backgroundColor: '#f59e0b', padding: 8, borderRadius: 8 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#374151', margin: 20, borderRadius: 10, paddingHorizontal: 10 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: 50, color: 'white' },
  listContent: { paddingHorizontal: 20 },
  userRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1f2937', padding: 15, borderRadius: 12, marginBottom: 10 },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4b5563', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  userName: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  userEmail: { color: '#9ca3af', fontSize: 12 },
  userType: { fontSize: 10, fontWeight: 'bold', marginTop: 2 },
  actionButtons: { flexDirection: 'row' },
  iconButton: { padding: 8, borderRadius: 8, marginLeft: 8 },
  editButton: { backgroundColor: 'rgba(245, 158, 11, 0.1)' },
  deleteButton: { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  emptyText: { color: '#9ca3af', textAlign: 'center', marginTop: 20 },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1f2937', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: 'white', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: '#374151', color: 'white', padding: 12, borderRadius: 8, marginBottom: 12 },
  typeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  typeButton: { flex: 1, padding: 10, alignItems: 'center', backgroundColor: '#374151', marginHorizontal: 4, borderRadius: 8 },
  typeButtonActive: { backgroundColor: '#f59e0b' },
  typeText: { color: '#9ca3af', fontSize: 12, fontWeight: 'bold' },
  typeTextActive: { color: 'white' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  cancelButton: { flex: 1, padding: 12, backgroundColor: '#4b5563', borderRadius: 8, marginRight: 8, alignItems: 'center' },
  saveButton: { flex: 1, padding: 12, backgroundColor: '#f59e0b', borderRadius: 8, marginLeft: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold' }
});