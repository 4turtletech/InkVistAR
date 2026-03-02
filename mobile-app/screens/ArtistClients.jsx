import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, Modal, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getArtistClients, addArtistClient, deleteArtistClient } from '../src/utils/api';
import { API_URL } from '../src/config';

export function ArtistClients({ onBack, artistId }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Details Modal State
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
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
    if (!newName || !newEmail || !newPassword) {
      Alert.alert('Missing Fields', 'Name, Email, and Password are required');
      return;
    }

    const result = await addArtistClient({
      artistId: artistId,
      name: newName,
      email: newEmail,
      password: newPassword
    });

    if (result.success) {
      Alert.alert('Success', 'Client profile created!');
      setModalVisible(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      loadClients(); // Refresh the client list
    } else {
      Alert.alert('Error', result.message || 'Failed to add client');
    }
  };

  const handleDeleteClient = (clientId) => {
    Alert.alert(
      'Remove Client',
      'Are you sure you want to remove this client? This will delete their account permanently.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            const result = await deleteArtistClient(clientId);
            if (result.success) {
              loadClients();
            } else {
              Alert.alert('Error', 'Failed to remove client');
            }
          }
        }
      ]
    );
  };

  const handleViewClient = async (client) => {
    setSelectedClient(client);
    setDetailsModalVisible(true);
    setHistoryLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/customer/${client.id}/appointments`);
      const data = await response.json();
      if (data.success) {
        // Filter to show only appointments with this artist
        const history = data.appointments.filter(a => a.artist_id === artistId);
        setClientHistory(history);
      }
    } catch (error) {
      console.log('Error fetching history:', error);
    } finally {
      setHistoryLoading(false);
    }
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
            {/* <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="person-add" size={22} color="#ffffff" />
            </TouchableOpacity> */}
            <View style={{ width: 40 }} />
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
            {clients.map((client) => (
              <View key={client.id} style={styles.clientCard}>
                {/*<TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteClient(client.id)}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>*/}

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
          </View>
        </View>
      </ScrollView>

      {/* <TouchableOpacity 
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <LinearGradient
          colors={['#000000', '#daa520']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.fabGradient}
        >
          <Ionicons name="person-add" size={28} color="#ffffff" />
        </LinearGradient>
      </TouchableOpacity> */}

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
            
            <Text style={styles.label}>Full Name</Text>
            <TextInput 
              style={styles.input} 
              placeholder="John Doe" 
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={styles.label}>Email Address</Text>
            <TextInput 
              style={styles.input} 
              placeholder="client@email.com" 
              value={newEmail}
              onChangeText={setNewEmail}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Enter password" 
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleAddClient}>
              <Text style={styles.saveButtonText}>Create Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Client Details Modal */}
      <Modal
        visible={detailsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Client Details</Text>
              <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            {selectedClient && (
              <View style={{ flex: 1 }}>
                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                  <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                    <Ionicons name="person" size={32} color="#6b7280" />
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{selectedClient.name}</Text>
                  <Text style={{ color: '#6b7280' }}>{selectedClient.email}</Text>
                </View>

                <Text style={styles.sectionTitle}>History</Text>
                {historyLoading ? (
                  <ActivityIndicator size="small" color="#daa520" />
                ) : (
                  <ScrollView style={{ flex: 1 }}>
                    {clientHistory.length > 0 ? (
                      clientHistory.map((appt) => (
                        <View key={appt.id} style={{ backgroundColor: '#f9fafb', padding: 12, borderRadius: 8, marginBottom: 8 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontWeight: '600' }}>{appt.design_title || 'Session'}</Text>
                            <Text style={{ fontSize: 12, color: '#6b7280' }}>{new Date(appt.appointment_date).toLocaleDateString()}</Text>
                          </View>
                          <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Status: {appt.status}</Text>
                          {appt.notes ? <Text style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>Note: {appt.notes}</Text> : null}
                        </View>
                      ))
                    ) : (
                      <Text style={{ color: '#9ca3af', fontStyle: 'italic', textAlign: 'center' }}>No history found.</Text>
                    )}
                  </ScrollView>
                )}
              </View>
            )}
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
});
