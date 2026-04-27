/**
 * CustomerArtistDirectory.jsx -- Browse Studio Artists
 * Themed with lucide icons, search bar, filter inputs, and artist cards.
 */

import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, Image, Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Search, Star, Users } from 'lucide-react-native';
import { useTheme } from '../src/context/ThemeContext';
import { AnimatedTouchable } from '../src/components/shared/AnimatedTouchable';
import { typography, borderRadius, shadows } from '../src/theme';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { getInitials } from '../src/utils/formatters';
import { getCustomerArtists } from '../src/utils/api';

export function CustomerArtistDirectory({ onBack, onNavigate }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [searchQuery, setSearchQuery] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState('');
  const [minRate, setMinRate] = useState('');
  const [maxRate, setMaxRate] = useState('');
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const listAnim = useState(new Animated.Value(20))[0];

  useEffect(() => {
    if (!loading && artists.length > 0) {
      fadeAnim.setValue(0);
      listAnim.setValue(20);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(listAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true })
      ]).start();
    }
  }, [loading, artists]);

  useEffect(() => { loadArtists(); }, [specializationFilter, minRate, maxRate]);

  const loadArtists = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (specializationFilter.trim()) filters.specialization = specializationFilter.trim();
      if (!isNaN(Number(minRate)) && minRate.trim()) filters.min_rate = Number(minRate);
      if (!isNaN(Number(maxRate)) && maxRate.trim()) filters.max_rate = Number(maxRate);
      const result = await getCustomerArtists(filters);
      if (result.success) setArtists(result.artists || []);
    } catch (e) { console.error('Artists error:', e); }
    finally { setLoading(false); }
  };

  const filtered = artists.filter(a =>
    a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.specialization?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
            <ArrowLeft size={20} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Our Artists</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Search */}
        <View style={styles.searchWrap}>
          <Search size={18} color={theme.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or specialty..."
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filters */}
        <View style={styles.filterRow}>
          <TextInput style={styles.filterInput} placeholder="Specialty" placeholderTextColor={theme.textTertiary} value={specializationFilter} onChangeText={setSpecializationFilter} />
          <TextInput style={styles.filterInput} placeholder="Min Rate" placeholderTextColor={theme.textTertiary} keyboardType="numeric" value={minRate} onChangeText={setMinRate} />
          <TextInput style={[styles.filterInput, { marginRight: 0 }]} placeholder="Max Rate" placeholderTextColor={theme.textTertiary} keyboardType="numeric" value={maxRate} onChangeText={setMaxRate} />
        </View>

        {loading ? <PremiumLoader message="Loading artists..." /> : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Animated.View style={[styles.grid, { opacity: fadeAnim, transform: [{ translateY: listAnim }] }]}>
              {filtered.length > 0 ? filtered.map((artist, index) => (
                <AnimatedTouchable
                  key={artist.id}
                  style={styles.artistCard}
                  onPress={() => onNavigate('CustomerArtistProfile', { artistId: artist.id })}
                >
                  {artist.profile_image ? (
                    <View style={styles.imageWrap}>
                      <Image source={{ uri: artist.profile_image }} style={styles.artistImage} />
                      <LinearGradient colors={['transparent', 'rgba(15,13,14,0.8)']} style={styles.imgGradient} />
                    </View>
                  ) : (
                    <View style={[styles.imageWrap, styles.placeholderImage]}>
                      <Text style={styles.placeholderText}>{getInitials(artist.name)}</Text>
                    </View>
                  )}

                  <View style={styles.artistInfo}>
                    <Text style={styles.artistName} numberOfLines={1}>{artist.name}</Text>
                    <Text style={styles.artistSpecialty} numberOfLines={1}>{artist.specialization || 'Master Artist'}</Text>
                    <View style={styles.ratingRow}>
                      <Star size={12} color={theme.gold} fill={theme.gold} />
                      <Text style={styles.ratingText}>{artist.rating || '4.9'} • {artist.review_count || '0'} reviews</Text>
                    </View>
                    <View style={styles.viewBtn}>
                      <Text style={styles.viewBtnText}>View Portfolio</Text>
                    </View>
                  </View>
                </AnimatedTouchable>
              )) : (
                <View style={{ width: '100%' }}>
                  <EmptyState icon={Users} title="No artists found" subtitle="Try adjusting your search or filters" />
                </View>
              )}
            </Animated.View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { padding: 20, paddingTop: 52, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...typography.h2, color: '#ffffff' },
  content: { flex: 1, padding: 16 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface,
    borderRadius: borderRadius.lg, paddingHorizontal: 14, marginBottom: 12,
    borderWidth: 1, borderColor: theme.border,
  },
  searchInput: { flex: 1, height: 46, marginLeft: 10, ...typography.body, color: theme.textPrimary },
  filterRow: { flexDirection: 'row', marginBottom: 16 },
  filterInput: {
    flex: 1, height: 40, marginRight: 8, paddingHorizontal: 12,
    borderRadius: borderRadius.md, backgroundColor: theme.surface,
    borderWidth: 1, borderColor: theme.border, ...typography.bodySmall, color: theme.textPrimary,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 40 },
  artistCard: {
    width: '48%', backgroundColor: theme.surface, borderRadius: borderRadius.xl,
    overflow: 'hidden', marginBottom: 14,
    borderWidth: 1, borderColor: theme.border, ...shadows.subtle,
  },
  imageWrap: { height: 160, position: 'relative' },
  artistImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imgGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60 },
  placeholderImage: { backgroundColor: theme.surfaceLight, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 36, fontWeight: '800', color: theme.gold },
  artistInfo: { padding: 10 },
  artistName: { ...typography.body, fontWeight: '700', color: theme.textPrimary, marginBottom: 2 },
  artistSpecialty: { ...typography.bodyXSmall, color: theme.textSecondary, marginBottom: 6 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  ratingText: { ...typography.bodyXSmall, color: theme.textSecondary, fontWeight: '500' },
  viewBtn: { backgroundColor: theme.surfaceLight, paddingVertical: 7, borderRadius: borderRadius.sm, alignItems: 'center' },
  viewBtnText: { ...typography.bodyXSmall, color: theme.textPrimary, fontWeight: '600' },
});
