/**
 * CustomerGallery.jsx -- Inspiration Gallery with Favorites & My Tattoos
 * Themed with lucide icons, search, category chips, sort, detail modal.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  SafeAreaView, Image, TouchableOpacity,
  Modal, Dimensions, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Search, XCircle, ArrowUpDown, Check, Images, Heart, X, User, Tag,
  Calendar, DollarSign, Maximize2,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, typography, borderRadius, shadows } from '../src/theme';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { formatCurrency } from '../src/utils/formatters';
import { getGalleryWorks } from '../src/utils/api';
import { getCustomerFavoriteWorks, getCustomerMyTattoos, toggleFavoriteWork } from '../src/api/customerAPI';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function CustomerGallery({ onBack, userId }) {
  const navigation = useNavigation();
  const route = useRoute();
  const initialQuery = route.params?.searchQuery || '';
  const initialViewMode = route.params?.initialViewMode || 'All';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortOrder, setSortOrder] = useState('desc');
  const [works, setWorks] = useState([]);
  const [viewMode, setViewMode] = useState(initialViewMode);
  const [favorites, setFavorites] = useState([]);
  const [myTattoos, setMyTattoos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWork, setSelectedWork] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState(false);

  useEffect(() => {
    if (!userId && viewMode !== 'All') { setViewMode('All'); return; }
    fetchWorks();
  }, [viewMode, userId]);

  useEffect(() => {
    if (route.params?.searchQuery) setSearchQuery(route.params.searchQuery);
    if (route.params?.initialViewMode && route.params.initialViewMode !== viewMode) setViewMode(route.params.initialViewMode);
  }, [route.params?.searchQuery, route.params?.initialViewMode]);

  const fetchWorks = async () => {
    setLoading(true);
    try {
      if (viewMode === 'All') {
        const r = await getGalleryWorks();
        if (r.success) setWorks(r.works || []);
        if (userId) { const fr = await getCustomerFavoriteWorks(userId); if (fr.success) setFavorites((fr.favorites || []).map(i => i.id)); }
      } else if (viewMode === 'Favorites') {
        if (!userId) { setWorks([]); setFavorites([]); return; }
        const fr = await getCustomerFavoriteWorks(userId);
        if (fr.success) { setWorks(fr.favorites || []); setFavorites((fr.favorites || []).map(i => i.id)); }
      } else if (viewMode === 'My Tattoos') {
        if (!userId) { setMyTattoos([]); return; }
        const tr = await getCustomerMyTattoos(userId);
        if (tr.success) setMyTattoos(tr.tattoos || []);
      }
    } catch (e) { console.error('Gallery load error:', e); }
    finally { setLoading(false); }
  };

  const handleToggleFavorite = async (workId) => {
    if (!userId) { navigation.navigate('login'); return; }
    setTogglingFavorite(true);
    try {
      const r = await toggleFavoriteWork(userId, workId);
      if (r.success) {
        if (r.favorited) {
          setFavorites(p => [...new Set([...p, workId])]);
          if (viewMode === 'Favorites') { const u = await getCustomerFavoriteWorks(userId); if (u.success) setWorks(u.favorites || []); }
        } else {
          setFavorites(p => p.filter(id => id !== workId));
          if (viewMode === 'Favorites') setWorks(p => p.filter(i => i.id !== workId));
        }
      }
    } catch (e) { console.error(e); }
    finally { setTogglingFavorite(false); }
  };

  const displayItems = viewMode === 'My Tattoos' ? myTattoos : works;
  const filteredWorks = displayItems.filter(w => {
    const q = searchQuery.toLowerCase();
    const matchSearch = (w.title || '').toLowerCase().includes(q) || (w.artist_name || '').toLowerCase().includes(q) || (w.description || '').toLowerCase().includes(q) || (w.category || '').toLowerCase().includes(q);
    const matchCat = selectedCategory === 'All' || (w.category || '').toLowerCase() === selectedCategory.toLowerCase();
    return matchSearch && matchCat;
  }).sort((a, b) => {
    const dA = new Date(a.created_at || a.appointment_date || 0);
    const dB = new Date(b.created_at || b.appointment_date || 0);
    return sortOrder === 'asc' ? dA - dB : dB - dA;
  });

  const openDetail = (w) => { setSelectedWork(w); setModalVisible(true); };
  const closeDetail = () => { setModalVisible(false); setSelectedWork(null); };
  const handleBookSimilar = () => { closeDetail(); navigation.navigate('booking-create', { prefillNote: `I'm interested in a design similar to "${selectedWork?.title}".` }); };

  const categories = ['All', 'Realism', 'Traditional', 'Japanese', 'Tribal', 'Fine Line', 'Watercolor', 'Minimalist', 'Blackwork'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inspiration Gallery</Text>
        <TouchableOpacity onPress={onBack}><Text style={styles.headerBack}>Back</Text></TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Search */}
          <View style={styles.searchWrap}>
            <Search size={18} color={colors.textTertiary} />
            <TextInput style={styles.searchInput} placeholder="Search by style, artist, or title..." placeholderTextColor={colors.textTertiary} value={searchQuery} onChangeText={setSearchQuery} />
            {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}><XCircle size={18} color={colors.textTertiary} /></TouchableOpacity>}
          </View>

          {/* Sort */}
          <View style={styles.sortRow}>
            <TouchableOpacity style={styles.sortBtn} onPress={() => setSortOrder(p => p === 'asc' ? 'desc' : 'asc')}>
              <ArrowUpDown size={14} color={colors.textSecondary} />
              <Text style={styles.sortText}>{sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}</Text>
            </TouchableOpacity>
          </View>

          {/* View Mode */}
          <View style={styles.viewModeRow}>
            {['All', 'Favorites', 'My Tattoos'].map(mode => (
              <TouchableOpacity key={mode} style={[styles.viewModeBtn, viewMode === mode && styles.viewModeBtnActive]} onPress={() => setViewMode(mode)}>
                <Text style={[styles.viewModeText, viewMode === mode && styles.viewModeTextActive]}>{mode}{mode === 'Favorites' ? ` (${favorites.length})` : ''}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Category Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
            {categories.map(cat => (
              <TouchableOpacity key={cat} style={[styles.catChip, selectedCategory === cat && styles.catChipActive]} onPress={() => setSelectedCategory(cat)}>
                {selectedCategory === cat && <Check size={13} color="#ffffff" />}
                <Text style={[styles.catText, selectedCategory === cat && styles.catTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Grid */}
          {loading ? <PremiumLoader message="Loading gallery..." /> : (
            <View style={styles.grid}>
              {filteredWorks.length === 0 ? (
                <EmptyState icon={Images} title="No works found" subtitle={searchQuery ? `No matches for "${searchQuery}"` : 'The gallery is currently empty.'} />
              ) : filteredWorks.map(w => (
                <TouchableOpacity key={w.id} style={styles.workCard} onPress={() => openDetail(w)} activeOpacity={0.85}>
                  <Image source={{ uri: w.image_url }} style={styles.workImg} />
                  <TouchableOpacity style={styles.favBtn} onPress={() => handleToggleFavorite(w.id)} disabled={togglingFavorite}>
                    <Heart size={16} color={favorites.includes(w.id) ? '#ff4d4d' : '#d1d5db'} fill={favorites.includes(w.id) ? '#ff4d4d' : 'none'} />
                  </TouchableOpacity>
                  <View style={styles.workInfo}>
                    <Text style={styles.workTitle} numberOfLines={1}>{w.title}</Text>
                    <Text style={styles.workArtist} numberOfLines={1}>by {w.artist_name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeDetail}>
        <Pressable style={modalS.overlay} onPress={closeDetail}>
          <Pressable style={modalS.sheet} onPress={e => e.stopPropagation()}>
            <View style={modalS.handle}><View style={modalS.handleBar} /></View>
            <TouchableOpacity style={modalS.closeBtn} onPress={closeDetail}><X size={22} color={colors.textSecondary} /></TouchableOpacity>
            {selectedWork && (
              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                <Image source={{ uri: selectedWork.image_url }} style={modalS.image} resizeMode="cover" />
                <View style={modalS.body}>
                  <Text style={modalS.title}>{selectedWork.title || 'Untitled Work'}</Text>
                  <View style={modalS.artistRow}>
                    <View style={modalS.artistBadge}><User size={13} color={colors.primary} /></View>
                    <Text style={modalS.artistName}>{selectedWork.artist_name || 'Unknown Artist'}</Text>
                  </View>
                  {selectedWork.category && (
                    <View style={modalS.catWrap}><Tag size={12} color={colors.textSecondary} /><Text style={modalS.catText}>{selectedWork.category}</Text></View>
                  )}
                  {selectedWork.description ? (
                    <View style={modalS.descWrap}>
                      <Text style={modalS.descLabel}>About this piece</Text>
                      <Text style={modalS.descText}>{selectedWork.description}</Text>
                    </View>
                  ) : null}
                  {selectedWork.price_estimate ? (
                    <View style={modalS.priceRow}>
                      <DollarSign size={16} color={colors.primaryDark} />
                      <Text style={modalS.priceText}>Estimated: P{formatCurrency(selectedWork.price_estimate)}</Text>
                    </View>
                  ) : null}
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                    <TouchableOpacity style={[modalS.actionBtn, { flex: 1 }]} onPress={handleBookSimilar} activeOpacity={0.8}>
                      <LinearGradient colors={['#0f172a', colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={modalS.actionGradient}>
                        <Calendar size={18} color="#ffffff" />
                        <Text style={modalS.actionText}>Request Consultation</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={modalS.favActionBtn} onPress={() => handleToggleFavorite(selectedWork.id)} disabled={togglingFavorite}>
                      <Heart size={18} color={favorites.includes(selectedWork.id) ? '#ff4d4d' : colors.textSecondary} fill={favorites.includes(selectedWork.id) ? '#ff4d4d' : 'none'} />
                      <Text style={modalS.favActionText}>{favorites.includes(selectedWork.id) ? 'Saved' : 'Save'}</Text>
                    </TouchableOpacity>
                  </View>
                  {viewMode === 'My Tattoos' && selectedWork.appointment_date && (
                    <View style={modalS.sessionInfo}>
                      <Text style={{ fontWeight: '700', marginBottom: 6, color: colors.textPrimary }}>Tattoo Session</Text>
                      <Text style={{ color: colors.textSecondary }}>Date: {new Date(selectedWork.appointment_date).toLocaleDateString()}</Text>
                      <Text style={{ color: colors.textSecondary }}>Artist: {selectedWork.artist_name || 'N/A'}</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 52, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  headerBack: { ...typography.body, color: colors.textSecondary },
  content: { padding: 16 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, paddingHorizontal: 14, marginBottom: 14, height: 48 },
  searchInput: { flex: 1, height: 46, marginLeft: 10, ...typography.body, color: colors.textPrimary },
  sortRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  viewModeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, gap: 6 },
  viewModeBtn: { flex: 1, paddingVertical: 8, borderRadius: borderRadius.round, borderWidth: 1, borderColor: colors.border, alignItems: 'center', backgroundColor: '#fff' },
  viewModeBtnActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  viewModeText: { ...typography.bodyXSmall, color: colors.textSecondary, fontWeight: '600' },
  viewModeTextActive: { color: colors.primary },
  catRow: { flexDirection: 'row', marginBottom: 16, paddingRight: 16 },
  catChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: borderRadius.round, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, marginRight: 8, gap: 4 },
  catChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  catText: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '500' },
  catTextActive: { color: '#ffffff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  workCard: { width: '48%', backgroundColor: '#ffffff', borderRadius: borderRadius.xl, overflow: 'hidden', marginBottom: 14, borderWidth: 1, borderColor: colors.border, position: 'relative' },
  workImg: { width: '100%', height: 170, resizeMode: 'cover' },
  favBtn: { position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.95)', justifyContent: 'center', alignItems: 'center', zIndex: 10, ...shadows.subtle },
  workInfo: { padding: 10 },
  workTitle: { ...typography.bodySmall, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  workArtist: { ...typography.bodyXSmall, color: colors.textTertiary },
});

const modalS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', minHeight: '50%' },
  handle: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border },
  closeBtn: { position: 'absolute', top: 14, right: 14, width: 36, height: 36, borderRadius: 18, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  image: { width: '100%', height: 280, backgroundColor: '#f3f4f6' },
  body: { padding: 20, paddingBottom: 40 },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: 8 },
  artistRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  artistBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  artistName: { ...typography.body, color: colors.textSecondary, fontWeight: '500' },
  catWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.lightBgSecondary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: borderRadius.sm, alignSelf: 'flex-start', gap: 5, marginBottom: 16 },
  catText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  descWrap: { backgroundColor: '#f8fafc', borderRadius: borderRadius.lg, padding: 14, marginBottom: 16 },
  descLabel: { ...typography.bodyXSmall, fontWeight: '600', color: colors.textTertiary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  descText: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: colors.primaryLight, borderRadius: borderRadius.lg, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(190,144,85,0.2)' },
  priceText: { ...typography.body, fontWeight: '700', color: colors.primaryDark },
  actionBtn: { borderRadius: borderRadius.xl, overflow: 'hidden' },
  actionGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  actionText: { ...typography.button, color: '#ffffff', fontSize: 15 },
  favActionBtn: { paddingHorizontal: 16, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', gap: 4 },
  favActionText: { ...typography.bodyXSmall, color: colors.textSecondary, fontWeight: '600' },
  sessionInfo: { padding: 12, borderColor: colors.border, borderWidth: 1, borderRadius: borderRadius.lg, marginBottom: 16 },
});
