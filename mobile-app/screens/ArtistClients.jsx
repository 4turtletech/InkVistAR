import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, Modal, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getArtistClients, addArtistClient } from '../src/utils/api';

export function ArtistClients({ onBack, artistId, navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(10);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPassword, setNewClientPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [clientHistory, setClientHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    loadClients();
  }, [artistId]);

  const loadClients = async () => {
    if (!artistId) return;
    setLoading(true);
    const result = await getArtistClients(artistId);
    if (result.success) {
      setClients(result.clients || []);
    }
    setLoading(false);
  };

  const handleAddClient = async () => {
    if (!newClientName || !newClientEmail || !newClientPassword) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    setIsSaving(true);
    const result = await addArtistClient({
      name: newClientName,
      email: newClientEmail,
      password: newClientPassword
    });

    if (result.success) {
      Alert.alert('Success', 'New client profile created.');
      setModalVisible(false);
      setNewClientName('');
      setNewClientEmail('');
      setNewClientPassword('');
      loadClients();
    } else {
      Alert.alert('Error', result.message || 'Failed to add client.');
    }
    setIsSaving(false);
  };

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 10);
  };

  const handleViewClient = (client) => {
    navigation.navigate('artist-client-details', { client });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#000000', '#b8860b']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={20} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Clients</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="person-add" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{clients.length}</Text>
              <Text style={styles.statLabel}>Total Clients</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>-</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search clients..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {loading && <ActivityIndicator size="large" color="#daa520" />}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Client Directory</Text>
            {clients.filter(c => (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (c.email || '').toLowerCase().includes(searchQuery.toLowerCase())).slice(0, visibleCount).map((client) => (
              <View key={client.id} style={styles.clientCard}>
                <View style={styles.clientHeader}>
                  <View style={styles.clientAvatar}>
                    <Ionicons name="person" size={24} color="#6b7280" />
                  </View>
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{client.name}</Text>
                    <Text style={styles.clientEmail}>{client.email}</Text>
                  </View>
                </View>

                <View style={styles.clientDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="call-outline" size={16} color="#6b7280" />
                    <Text style={styles.detailText}>-</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                    <Text style={styles.detailText}>Last: {new Date(client.last_appointment).toLocaleDateString()}</Text>
                  </View>
                </View>

                <View style={styles.clientStats}>
                  <View style={styles.statBadge}>
                    <Ionicons name="color-palette" size={14} color="#daa520" />
                    <Text style={styles.statBadgeText}>{client.appointment_count} sessions</Text>
                  </View>
                  <View style={styles.statBadge}>
                    <Ionicons name="cash" size={14} color="#16a34a" />
                    <Text style={styles.statBadgeText}>-</Text>
                  </View>
                </View>

                <View style={styles.clientActions}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.actionButtonPrimary]}
                    onPress={() => handleViewClient(client)}
                  >
                    <Ionicons name="eye" size={18} color="#ffffff" />
                    <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>View Client</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {visibleCount < clients.filter(c => (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (c.email || '').toLowerCase().includes(searchQuery.toLowerCase())).length && (
              <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore}>
                <Text style={styles.loadMoreText}>Load More</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Add Client Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Client</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.label}>Client Full Name</Text>
            <TextInput 
              style={styles.input} 
              placeholder="John Smith" 
              value={newClientName}
              onChangeText={setNewClientName}
            />

            <Text style={styles.label}>Client Email</Text>
            <TextInput 
              style={styles.input} 
              placeholder="client@email.com" 
              value={newClientEmail}
              onChangeText={setNewClientEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Temporary Password</Text>
            <TextInput 
              style={styles.input} 
              placeholder="A secure password for the client" 
              value={newClientPassword}
              onChangeText={setNewClientPassword}
              secureTextEntry
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleAddClient} disabled={isSaving}>
              <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Create Client Profile'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
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
    marginBottom: 20,
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.9,
  },
  content: {
    padding: 16,
    paddingBottom: 80,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    height: 48,
    marginLeft: 12,
    fontSize: 16,
    color: '#111827',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  clientCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  deleteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  clientAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  clientEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  clientDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
  },
  clientStats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statBadgeText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  clientActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f3f4f6',
  },
  actionButtonPrimary: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  actionButtonTextPrimary: {
    color: '#ffffff',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#333' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  loadMoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  loadMoreText: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '600',
  },
});
