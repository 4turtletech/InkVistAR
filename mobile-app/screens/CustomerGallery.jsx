import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, StyleSheet, ScrollView, 
  SafeAreaView, Image, ActivityIndicator, TouchableOpacity 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getGalleryWorks } from '../src/utils/api';

export function CustomerGallery({ onBack }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // desc = newest first
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorks();
  }, []);

  const loadWorks = async () => {
    setLoading(true);
    const result = await getGalleryWorks();
    if (result.success) {
      setWorks(result.works || []);
    }
    setLoading(false);
  };

  const filteredWorks = works.filter(work => {
    const searchLower = searchQuery.toLowerCase();
    const titleMatch = (work.title || '').toLowerCase().includes(searchLower);
    const artistMatch = (work.artist_name || '').toLowerCase().includes(searchLower);
    const descriptionMatch = (work.description || '').toLowerCase().includes(searchLower);
    return titleMatch || artistMatch || descriptionMatch;
  }).sort((a, b) => {
    const dateA = new Date(a.created_at);
    const dateB = new Date(b.created_at);
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });

  return (
    <SafeAreaView style={styles.container}>
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
          <Text style={styles.headerTitle}>Inspiration Gallery</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by style, artist, or title..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.controlsRow}>
            <TouchableOpacity style={styles.sortButton} onPress={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}>
              <Ionicons name={sortOrder === 'asc' ? "arrow-up" : "arrow-down"} size={16} color="#6b7280" />
              <Text style={styles.sortButtonText}>{sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#daa520" style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.worksGrid}>
              {filteredWorks.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="images-outline" size={48} color="#d1d5db" />
                  <Text style={styles.emptyStateText}>No works found</Text>
                  <Text style={styles.emptyStateSubtext}>
                    {searchQuery ? `No matches for "${searchQuery}"` : "The gallery is currently empty."}
                  </Text>
                </View>
              ) : (
                filteredWorks.map((work) => (
                  <View key={work.id} style={styles.workCard}>
                    <Image source={{ uri: work.image_url }} style={styles.workImage} />
                    <View style={styles.workDetails}>
                      <Text style={styles.workTitle} numberOfLines={1}>{work.title}</Text>
                      <Text style={styles.workArtist} numberOfLines={1}>by {work.artist_name}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scrollView: { flex: 1 },
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
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
  content: { padding: 16 },
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
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
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
  worksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  workCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  workImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  workDetails: {
    padding: 12,
  },
  workTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  workArtist: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyState: {
    width: '100%',
    alignItems: 'center',
    padding: 32,
    marginTop: 20,
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
});