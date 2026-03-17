// screens/CustomerArtistDirectory.jsx
import { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, SafeAreaView, Image, ActivityIndicator 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getCustomerArtists } from '../src/utils/api';

export function CustomerArtistDirectory({ onBack, onNavigate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArtists();
  }, []);

  const loadArtists = async () => {
    try {
      setLoading(true);
      const result = await getCustomerArtists();
      if (result.success) {
        setArtists(result.artists || []);
      }
    } catch (error) {
      console.error('Error loading artists:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredArtists = artists.filter(artist => 
    artist.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    artist.specialization?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <Text style={styles.headerTitle}>Our Artists</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or specialty..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#daa520" style={{ marginTop: 40 }} />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.artistGrid}>
              {filteredArtists.length > 0 ? filteredArtists.map((artist) => (
                <TouchableOpacity 
                  key={artist.id} 
                  style={styles.artistCard}
                  onPress={() => onNavigate('CustomerArtistProfile', { artistId: artist.id })}
                >
                  <View style={styles.imageOverlay}>
                    <Image 
                      source={{ uri: artist.profile_image || 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&q=80&w=600' }} 
                      style={styles.artistImage} 
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.8)']}
                      style={styles.cardGradient}
                    />
                    <View style={styles.artistBadge}>
                      <Text style={styles.badgeText}>V</Text>
                    </View>
                  </View>
                  <View style={styles.artistInfo}>
                    <Text style={styles.artistName}>{artist.name}</Text>
                    <Text style={styles.artistSpecialty}>{artist.specialization || 'Master Artist'}</Text>
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={14} color="#daa520" />
                      <Text style={styles.ratingText}>{artist.rating || '4.9'} • {artist.review_count || '120'} reviews</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.viewButton}
                      onPress={() => onNavigate('CustomerArtistProfile', { artistId: artist.id })}
                    >
                      <Text style={styles.viewButtonText}>View Portfolio</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              )) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No artists found matching your search.</Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
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
  content: { flex: 1, padding: 16 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
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
  artistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  artistCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  imageOverlay: {
    height: 180,
    position: 'relative',
  },
  artistImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  artistBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#daa520',
  },
  badgeText: { color: '#daa520', fontSize: 12, fontWeight: 'bold' },
  artistInfo: {
    padding: 12,
  },
  artistName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  artistSpecialty: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },
  viewButton: {
    backgroundColor: '#000',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    width: '100%',
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#9ca3af',
    textAlign: 'center',
  },
});
