// ArtistWorks.jsx - UPDATED WITH UPLOAD
import { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, SafeAreaView, Image, Alert, Modal, ActivityIndicator 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getArtistPortfolio, addArtistWork, deleteArtistWork } from '../src/utils/api';

export function ArtistWorks({ onBack, artistId }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'az'
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newWorkTitle, setNewWorkTitle] = useState('');
  const [titleError, setTitleError] = useState('');
  const [newWorkCategory, setNewWorkCategory] = useState('traditional');
  const [newWorkImage, setNewWorkImage] = useState(''); // Using URL for now
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadType, setUploadType] = useState('url'); // 'url' or 'upload'

  const categories = [
    { id: 'all', label: 'All', icon: 'grid' },
    { id: 'traditional', label: 'Traditional', icon: 'color-palette' },
    { id: 'minimalist', label: 'Minimalist', icon: 'brush' },
    { id: 'watercolor', label: 'Watercolor', icon: 'water' },
    { id: 'geometric', label: 'Geometric', icon: 'square' },
  ];

  useEffect(() => {
    loadPortfolio();
  }, [artistId]);

  useEffect(() => {
    if (newWorkTitle.length > 0) {
      // Validation: Length check
      if (newWorkTitle.length < 3 || newWorkTitle.length > 50) {
        setTitleError('Title must be between 3 and 50 characters.');
      }
      // Validation: No special characters (allow letters, numbers, spaces)
      else if (!/^[a-zA-Z0-9 ]+$/.test(newWorkTitle)) {
        setTitleError('Title can only contain letters, numbers, and spaces.');
      }
      else {
        setTitleError('');
      }
    } else {
      setTitleError(''); // Clear error if field is empty
    }
  }, [newWorkTitle]);

  const loadPortfolio = async () => {
    if (!artistId) return;
    setLoading(true);
    const result = await getArtistPortfolio(artistId);
    if (result.success) {
      setWorks(result.works || []);
    }
    setLoading(false);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need access to your photos to upload work.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      setNewWorkImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleUploadWork = async () => {
    // Final validation before submitting. Button is disabled, this is a safeguard.
    if (!newWorkTitle.trim() || titleError) {
      return;
    }

    if (!newWorkImage.trim()) {
      Alert.alert('Missing Image', 'Please provide an image (URL or Upload).');
      return;
    }

    // Validation: Simple URL check if using URL mode
    if (uploadType === 'url' && !newWorkImage.startsWith('http')) {
      Alert.alert('Invalid URL', 'Please enter a valid image URL starting with http:// or https://');
      return;
    }

    const result = await addArtistWork(artistId, {
      title: newWorkTitle,
      description: newWorkCategory, // Using description field for category for now
      imageUrl: newWorkImage
    });

    if (result.success) {
      Alert.alert('Success!', 'Your work has been uploaded to your portfolio.');
      setNewWorkTitle('');
      setNewWorkImage('');
      setTitleError('');
      setShowUploadModal(false);
      loadPortfolio();
    } else {
      Alert.alert('Error', result.message || 'Failed to upload work.');
    }
  };

  const handleDeleteWork = (id) => {
    Alert.alert(
      'Delete Work',
      'Are you sure you want to delete this work?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            const result = await deleteArtistWork(id);
            if (result.success) {
              loadPortfolio();
            } else {
              Alert.alert('Error', 'Failed to delete work');
            }
          }
        }
      ]
    );
  };

  const filteredWorks = works.filter(work => {
    const matchesCategory = selectedCategory === 'all' || (work.description || '').toLowerCase().includes(selectedCategory);
    const matchesSearch = (work.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
    if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
    if (sortBy === 'az') return a.title.localeCompare(b.title);
    return 0;
  });

  const toggleSort = () => {
    if (sortBy === 'newest') setSortBy('oldest');
    else if (sortBy === 'oldest') setSortBy('az');
    else setSortBy('newest');
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
            <Text style={styles.headerTitle}>My Portfolio</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowUploadModal(true)}
            >
              <Ionicons name="add" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{works.length}</Text>
              <Text style={styles.statLabel}>Total Works</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>1.8k</Text>
              <Text style={styles.statLabel}>Total Likes</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>4.9</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search your works..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.controlsRow}>
            <TouchableOpacity style={styles.sortButton} onPress={toggleSort}>
              <Ionicons name="filter" size={16} color="#6b7280" />
              <Text style={styles.sortButtonText}>Sort: {sortBy === 'newest' ? 'Newest' : sortBy === 'oldest' ? 'Oldest' : 'A-Z'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                onPress={() => setSelectedCategory(category.id)}
                style={[
                  styles.categoryButton,
                  selectedCategory === category.id && styles.categoryButtonActive
                ]}
              >
                <Ionicons 
                  name={category.icon} 
                  size={16} 
                  color={selectedCategory === category.id ? '#ffffff' : '#6b7280'} 
                />
                <Text style={[
                  styles.categoryText,
                  selectedCategory === category.id && styles.categoryTextActive
                ]}>
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loading && <ActivityIndicator size="large" color="#daa520" style={{ marginTop: 20 }} />}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Portfolio</Text>
            <View style={styles.worksGrid}>
              {!loading && filteredWorks.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={48} color="#d1d5db" />
                  <Text style={styles.emptyStateText}>No works found</Text>
                  <Text style={styles.emptyStateSubtext}>
                    {searchQuery ? `No matches for "${searchQuery}"` : "No works available in this category"}
                  </Text>
                </View>
              )}

              {filteredWorks.map((work) => (
                <View key={work.id} style={styles.workCard}>
                  {work.image_url ? (
                    <Image source={{ uri: work.image_url }} style={styles.workImage} />
                  ) : (
                    <LinearGradient
                      colors={['#000000', '#374151']}
                      style={styles.workImage}
                    >
                      <Ionicons name="images" size={40} color="#9ca3af" />
                    </LinearGradient>
                  )}
                  <View style={styles.workDetails}>
                    <Text style={styles.workTitle}>{work.title}</Text>
                    <View style={styles.workMeta}>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{work.description || 'Art'}</Text>
                      </View>
                      <Text style={styles.workDate}>
                        {new Date(work.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                    <View style={styles.workEngagement}>
                      <View style={styles.engagementItem}>
                        <Ionicons name="heart" size={16} color="#dc2626" />
                        <Text style={styles.engagementText}>{work.likes || 0}</Text>
                      </View>
                      <View style={styles.engagementItem}>
                        <Ionicons name="chatbubble" size={16} color="#6b7280" />
                        <Text style={styles.engagementText}>0</Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.workMenu}
                    onPress={() => handleDeleteWork(work.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Upload Modal */}
      <Modal
        visible={showUploadModal}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload New Work</Text>
              <TouchableOpacity onPress={() => setShowUploadModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            {/* Image Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Work Image</Text>
              
              <View style={styles.tabContainer}>
                <TouchableOpacity 
                  style={[styles.tabButton, uploadType === 'url' && styles.tabButtonActive]}
                  onPress={() => setUploadType('url')}
                >
                  <Text style={[styles.tabButtonText, uploadType === 'url' && styles.tabButtonTextActive]}>
                    Image URL
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tabButton, uploadType === 'upload' && styles.tabButtonActive]}
                  onPress={() => setUploadType('upload')}
                >
                  <Text style={[styles.tabButtonText, uploadType === 'upload' && styles.tabButtonTextActive]}>
                    Upload Photo
                  </Text>
                </TouchableOpacity>
              </View>

              {uploadType === 'url' ? (
                <TextInput
                  style={styles.input}
                  placeholder="https://example.com/image.jpg"
                  value={newWorkImage}
                  onChangeText={setNewWorkImage}
                />
              ) : (
                <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
                  {newWorkImage && newWorkImage.startsWith('data:') ? (
                    <Image source={{ uri: newWorkImage }} style={styles.imagePreview} />
                  ) : (
                    <View style={styles.imagePickerPlaceholder}>
                      <Ionicons name="cloud-upload-outline" size={32} color="#6b7280" />
                      <Text style={styles.imagePickerText}>Tap to select from gallery</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Title Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Work Title</Text>
              <TextInput
                style={[styles.input, titleError ? styles.inputError : null]}
                placeholder="Enter a descriptive title"
                value={newWorkTitle}
                onChangeText={setNewWorkTitle}
              />
              {titleError ? <Text style={styles.errorText}>{titleError}</Text> : null}
            </View>

            {/* Category Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.categorySelection}
              >
                {categories.slice(1).map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryOption,
                      newWorkCategory === cat.id && styles.categoryOptionActive
                    ]}
                    onPress={() => setNewWorkCategory(cat.id)}
                  >
                    <Text style={[
                      styles.categoryOptionText,
                      newWorkCategory === cat.id && styles.categoryOptionTextActive
                    ]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowUploadModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.uploadButton, (!!titleError || !newWorkTitle.trim()) && styles.disabledButton]}
                onPress={handleUploadWork}
                disabled={!!titleError || !newWorkTitle.trim()}
              >
                <LinearGradient
                  colors={['#000000', '#b8860b']}
                  style={styles.uploadButtonGradient}
                >
                  <Ionicons name="cloud-upload" size={20} color="#ffffff" />
                  <Text style={styles.uploadButtonText}>Upload</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setShowUploadModal(true)}
      >
        <LinearGradient
          colors={['#000000', '#daa520']}
          style={styles.fabGradient}
        >
          <Ionicons name="camera" size={28} color="#ffffff" />
        </LinearGradient>
      </TouchableOpacity>
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
    marginBottom: 24,
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
    paddingBottom: 100,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
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
  categoriesContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    paddingRight: 16,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 12,
  },
  categoryButtonActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  categoryText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#ffffff',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  emptyState: {
    width: '100%',
    alignItems: 'center',
    padding: 32,
    marginTop: 8,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  worksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  workCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  workImage: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
    justifyContent: 'center',
    alignItems: 'center',
  },
  workDetails: {
    padding: 12,
  },
  workTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  workMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 10,
    color: '#374151',
    fontWeight: '600',
  },
  workDate: {
    fontSize: 10,
    color: '#9ca3af',
  },
  workEngagement: {
    flexDirection: 'row',
    gap: 12,
  },
  engagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  engagementText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  workMenu: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 2,
  },
  categorySelection: {
    flexDirection: 'row',
    marginTop: 8,
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryOptionActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  categoryOptionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  categoryOptionTextActive: {
    color: '#ffffff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  uploadButton: {
    flex: 1,
  },
  disabledButton: {
    opacity: 0.5,
  },
  uploadButtonGradient: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#111827',
  },
  imagePickerButton: {
    height: 160,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    overflow: 'hidden',
  },
  imagePickerPlaceholder: {
    alignItems: 'center',
  },
  imagePickerText: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 14,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
});