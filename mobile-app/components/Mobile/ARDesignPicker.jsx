import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  ScrollView, SafeAreaView, ActivityIndicator, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getGalleryWorks } from '../../src/utils/api';
import * as ImagePicker from 'expo-image-picker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

export function ARDesignPicker({ onSelectDesign, onBack }) {
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    fetchWorks();
  }, []);

  const fetchWorks = async () => {
    try {
      const result = await getGalleryWorks();
      if (result.success) {
        setWorks(result.works || []);
      }
    } catch (err) {
      console.error('Failed to load gallery:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', 'Realism', 'Traditional', 'Japanese', 'Tribal', 'Fine Line', 'Minimalist', 'Blackwork'];

  const filtered = works.filter(w => {
    if (selectedCategory === 'All') return true;
    return (w.category || '').toLowerCase() === selectedCategory.toLowerCase();
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#000000', '#1a1a2e']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Choose a Design</Text>
            <Text style={styles.headerSub}>Select a tattoo to preview in AR</Text>
          </View>
          <Ionicons name="sparkles" size={28} color="#daa520" />
        </View>
      </LinearGradient>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, selectedCategory === cat && styles.chipActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Pick from phone button */}
      <TouchableOpacity
        style={styles.phonePickBtn}
        onPress={async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
          });
          if (!result.canceled && result.assets?.[0]) {
            onSelectDesign({
              id: 'local-' + Date.now(),
              title: 'My Design',
              artist_name: 'You',
              image_url: result.assets[0].uri,
            });
          }
        }}
      >
        <LinearGradient
          colors={['#daa520', '#b8860b']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.phonePickGradient}
        >
          <Ionicons name="phone-portrait" size={20} color="#000" />
          <Text style={styles.phonePickText}>Pick from Phone Gallery</Text>
          <Ionicons name="chevron-forward" size={18} color="#000" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Gallery grid */}
      {loading ? (
        <ActivityIndicator size="large" color="#daa520" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="images-outline" size={48} color="#555" />
              <Text style={styles.emptyText}>No designs found</Text>
            </View>
          ) : (
            filtered.map(work => (
              <TouchableOpacity
                key={work.id}
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => onSelectDesign(work)}
              >
                <Image source={{ uri: work.image_url }} style={styles.cardImage} />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.8)']}
                  style={styles.cardGradient}
                >
                  <Text style={styles.cardTitle} numberOfLines={1}>{work.title}</Text>
                  <Text style={styles.cardArtist} numberOfLines={1}>by {work.artist_name}</Text>
                </LinearGradient>
                <View style={styles.arBadge}>
                  <Ionicons name="camera" size={12} color="#fff" />
                  <Text style={styles.arBadgeText}>AR</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  chipRow: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    marginRight: 8,
  },
  chipActive: { backgroundColor: '#daa520', borderColor: '#daa520' },
  chipText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  chipTextActive: { color: '#000' },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, paddingBottom: 40, gap: 12,
  },
  card: {
    width: CARD_WIDTH, borderRadius: 16, overflow: 'hidden',
    backgroundColor: '#1a1a2e',
  },
  cardImage: { width: '100%', height: CARD_WIDTH * 1.2, resizeMode: 'cover' },
  cardGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 12, paddingBottom: 12, paddingTop: 40,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#fff' },
  cardArtist: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  arBadge: {
    position: 'absolute', top: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(218,165,32,0.9)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  arBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  empty: { width: '100%', alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#555', fontSize: 16, marginTop: 12 },
});
