/**
 * ArtistWorks.jsx -- Portfolio Manager with Upload, Edit, Visibility Toggle
 * Themed with lucide icons. Search, category chips, sort, grid, upload/detail modals.
 */

import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, Image, Alert, Modal, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Plus, Search, ArrowUpDown, Grid3x3, Eye, Palette, Brush,
  Flame, Pencil, X, Upload, Globe, Lock, Trash2, Edit3, Images, DollarSign,
} from 'lucide-react-native';
import { colors, typography, borderRadius, shadows } from '../src/theme';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { getArtistPortfolio, addArtistWork, deleteArtistWork, updateArtistWorkVisibility } from '../src/utils/api';
import { API_URL } from '../src/config';

const CAT_ICONS = { all: Grid3x3, Realism: Eye, Traditional: Palette, Japanese: Brush, Tribal: Flame, 'Fine Line': Pencil };

export function ArtistWorks({ onBack, artistId }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newWorkTitle, setNewWorkTitle] = useState('');
  const [titleError, setTitleError] = useState('');
  const [newWorkDescription, setNewWorkDescription] = useState('');
  const [newWorkCategory, setNewWorkCategory] = useState('Realism');
  const [isPublic, setIsPublic] = useState(true);
  const [newWorkImage, setNewWorkImage] = useState('');
  const [newWorkPriceEstimate, setNewWorkPriceEstimate] = useState('');
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadType, setUploadType] = useState('url');
  const [selectedWork, setSelectedWork] = useState(null);
  const [editingWorkId, setEditingWorkId] = useState(null);

  const categories = [
    { id: 'all', label: 'All' }, { id: 'Realism', label: 'Realism' }, { id: 'Traditional', label: 'Traditional' },
    { id: 'Japanese', label: 'Japanese' }, { id: 'Tribal', label: 'Tribal' }, { id: 'Fine Line', label: 'Fine Line' },
  ];

  useEffect(() => { loadPortfolio(); }, [artistId]);

  useEffect(() => {
    if (newWorkTitle.length > 0) {
      if (newWorkTitle.length < 3 || newWorkTitle.length > 50) setTitleError('Title must be between 3 and 50 characters.');
      else if (!/^[a-zA-Z0-9 ]+$/.test(newWorkTitle)) setTitleError('Only letters, numbers, and spaces allowed.');
      else setTitleError('');
    } else setTitleError('');
  }, [newWorkTitle]);

  const loadPortfolio = async () => { if (!artistId) return; setLoading(true); const r = await getArtistPortfolio(artistId); if (r.success) setWorks(r.works || []); setLoading(false); };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Photo access is required.'); return; }
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.5, base64: true });
    if (!result.canceled) setNewWorkImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
  };

  const resetForm = () => { setNewWorkTitle(''); setNewWorkImage(''); setNewWorkDescription(''); setNewWorkPriceEstimate(''); setTitleError(''); setIsPublic(true); setEditingWorkId(null); setUploadType('url'); };

  const handleUploadWork = async () => {
    if (!newWorkTitle.trim() || titleError) return;
    if (!newWorkImage.trim()) { Alert.alert('Missing Image', 'Please provide an image.'); return; }
    const sanitize = (t) => t.trim().replace(/<[^>]*>?/gm, '');
    const payload = { title: sanitize(newWorkTitle), description: sanitize(newWorkDescription), category: newWorkCategory, imageUrl: newWorkImage, isPublic, priceEstimate: newWorkPriceEstimate ? sanitize(newWorkPriceEstimate) : null };
    setLoading(true);
    let result;
    if (editingWorkId) { try { result = await (await fetch(`${API_URL}/artist/portfolio/${editingWorkId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })).json(); } catch (e) { result = { success: false, message: 'Network error.' }; } }
    else result = await addArtistWork(artistId, payload);
    setLoading(false);
    if (result.success) { Alert.alert('Success!', editingWorkId ? 'Work updated.' : 'Uploaded to portfolio.'); resetForm(); setShowUploadModal(false); loadPortfolio(); }
    else Alert.alert('Error', result.message || 'Failed.');
  };

  const handleEditWork = (w) => { setEditingWorkId(w.id); setNewWorkTitle(w.title); setNewWorkDescription(w.description || ''); setNewWorkCategory(w.category || 'Realism'); setIsPublic(w.is_public === 1 || w.is_public === true); setNewWorkImage(w.image_url); setNewWorkPriceEstimate(w.price_estimate ? String(w.price_estimate) : ''); setUploadType(w.image_url?.startsWith('data:') ? 'upload' : 'url'); setShowUploadModal(true); };

  const handleDeleteWork = (id) => { Alert.alert('Delete Work', 'Are you sure?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { const r = await deleteArtistWork(id); r.success ? loadPortfolio() : Alert.alert('Error', 'Failed.'); } }]); };

  const filteredWorks = works.filter(w => {
    const matchCat = selectedCategory === 'all' || (w.category || '').toLowerCase() === selectedCategory.toLowerCase();
    const matchSearch = (w.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  }).sort((a, b) => { if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at); if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at); if (sortBy === 'az') return a.title.localeCompare(b.title); return 0; });

  const toggleSort = () => { if (sortBy === 'newest') setSortBy('oldest'); else if (sortBy === 'oldest') setSortBy('az'); else setSortBy('newest'); };

  const VisibilityToggle = ({ value, onToggle }) => (
    <TouchableOpacity style={styles.visToggle} onPress={onToggle}>
      {value ? <Globe size={18} color={colors.primary} /> : <Lock size={18} color={colors.textTertiary} />}
      <Text style={[styles.visText, value && styles.visTextActive]}>{value ? 'Public Portfolio' : 'Private Portfolio'}</Text>
      <View style={[styles.toggleTrack, value && styles.toggleTrackActive]}><View style={[styles.toggleThumb, value && styles.toggleThumbActive]} /></View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Header */}
        <LinearGradient colors={['#0f172a', colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onBack} style={styles.backBtn}><ArrowLeft size={20} color="#fff" /></TouchableOpacity>
            <Text style={styles.headerTitle}>My Portfolio</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowUploadModal(true)}><Plus size={22} color="#fff" /></TouchableOpacity>
          </View>
          <View style={styles.statsRow}>
            {[['Total Works', works.length], ['Public', works.filter(w => w.is_public).length], ['Private', works.filter(w => !w.is_public).length]].map(([label, num]) => (
              <View key={label} style={styles.statCard}><Text style={styles.statNum}>{num}</Text><Text style={styles.statLabel}>{label}</Text></View>
            ))}
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Search */}
          <View style={styles.searchWrap}><Search size={18} color={colors.textTertiary} /><TextInput style={styles.searchInput} placeholder="Search your works..." placeholderTextColor={colors.textTertiary} value={searchQuery} onChangeText={setSearchQuery} /></View>

          {/* Sort */}
          <View style={styles.sortRow}><TouchableOpacity style={styles.sortBtn} onPress={toggleSort}><ArrowUpDown size={14} color={colors.textSecondary} /><Text style={styles.sortText}>Sort: {sortBy.toUpperCase()}</Text></TouchableOpacity></View>

          {/* Categories */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
            {categories.map(cat => { const Icon = CAT_ICONS[cat.id] || Grid3x3; return (
              <TouchableOpacity key={cat.id} onPress={() => setSelectedCategory(cat.id)} style={[styles.catChip, selectedCategory === cat.id && styles.catChipActive]}>
                <Icon size={14} color={selectedCategory === cat.id ? '#fff' : colors.textSecondary} />
                <Text style={[styles.catText, selectedCategory === cat.id && styles.catTextActive]}>{cat.label}</Text>
              </TouchableOpacity>
            ); })}
          </ScrollView>

          {loading && <PremiumLoader message="Loading portfolio..." />}

          {/* Grid */}
          <Text style={styles.sectionTitle}>Portfolio Items</Text>
          <View style={styles.grid}>
            {!loading && filteredWorks.length === 0 && <EmptyState icon={Search} title="No works found" subtitle="Try a different search or category" />}
            {filteredWorks.map(w => (
              <TouchableOpacity key={w.id} style={styles.workCard} onPress={() => setSelectedWork(w)} activeOpacity={0.85}>
                {w.image_url ? <Image source={{ uri: w.image_url }} style={styles.workImg} /> : (
                  <View style={[styles.workImg, { backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' }]}><Images size={36} color={colors.textTertiary} /></View>
                )}
                <View style={styles.workInfo}>
                  <Text style={styles.workTitle} numberOfLines={1}>{w.title}</Text>
                  <View style={styles.workMeta}>
                    <View style={styles.catBadge}><Text style={styles.catBadgeText}>{w.category || 'Art'}</Text></View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      {w.is_public ? <Globe size={10} color={colors.primary} /> : <Lock size={10} color={colors.textTertiary} />}
                      <Text style={styles.workDate}>{new Date(w.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity style={styles.editFloatBtn} onPress={() => handleEditWork(w)}><Edit3 size={14} color={colors.primary} /></TouchableOpacity>
                <TouchableOpacity style={styles.deleteFloatBtn} onPress={() => handleDeleteWork(w.id)}><Trash2 size={14} color={colors.error} /></TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Upload/Edit Modal */}
      <Modal visible={showUploadModal} transparent animationType="slide">
        <View style={modalS.overlay}>
          <View style={modalS.sheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={modalS.header}><Text style={modalS.title}>{editingWorkId ? 'Edit Work' : 'Add New Work'}</Text><TouchableOpacity onPress={() => { setShowUploadModal(false); resetForm(); }}><X size={22} color={colors.textPrimary} /></TouchableOpacity></View>

              {/* Image Source */}
              <View style={modalS.group}><Text style={modalS.label}>Image Source</Text>
                <View style={modalS.tabWrap}>
                  {['url', 'upload'].map(t => <TouchableOpacity key={t} style={[modalS.tab, uploadType === t && modalS.tabActive]} onPress={() => setUploadType(t)}><Text style={[modalS.tabText, uploadType === t && modalS.tabTextActive]}>{t === 'url' ? 'URL' : 'Upload'}</Text></TouchableOpacity>)}
                </View>
                {uploadType === 'url' ? <TextInput style={modalS.input} placeholder="https://example.com/image.jpg" placeholderTextColor={colors.textTertiary} value={newWorkImage} onChangeText={setNewWorkImage} /> : (
                  <TouchableOpacity style={modalS.imgPicker} onPress={pickImage}>
                    {newWorkImage ? <Image source={{ uri: newWorkImage }} style={modalS.imgPreview} /> : (
                      <View style={modalS.imgPlaceholder}><Upload size={28} color={colors.textTertiary} /><Text style={modalS.imgPickerText}>Select Image</Text></View>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              <View style={modalS.group}><Text style={modalS.label}>Title</Text><TextInput style={[modalS.input, titleError && { borderColor: colors.error }]} placeholder="Enter title" placeholderTextColor={colors.textTertiary} value={newWorkTitle} onChangeText={setNewWorkTitle} />{titleError ? <Text style={modalS.error}>{titleError}</Text> : null}</View>
              <View style={modalS.group}><Text style={modalS.label}>Description</Text><TextInput style={[modalS.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Tell more about this piece..." placeholderTextColor={colors.textTertiary} value={newWorkDescription} onChangeText={setNewWorkDescription} multiline /></View>

              <View style={modalS.group}><Text style={modalS.label}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {categories.slice(1).map(c => <TouchableOpacity key={c.id} style={[modalS.catOpt, newWorkCategory === c.id && modalS.catOptActive]} onPress={() => setNewWorkCategory(c.id)}><Text style={[modalS.catOptText, newWorkCategory === c.id && modalS.catOptTextActive]}>{c.label}</Text></TouchableOpacity>)}
                </ScrollView>
              </View>

              <View style={modalS.group}><Text style={modalS.label}>Price Estimate (P)</Text><TextInput style={modalS.input} placeholder="e.g. 2500" placeholderTextColor={colors.textTertiary} value={newWorkPriceEstimate} onChangeText={setNewWorkPriceEstimate} keyboardType="numeric" /></View>

              <View style={modalS.group}><Text style={modalS.label}>Settings</Text><VisibilityToggle value={isPublic} onToggle={() => setIsPublic(!isPublic)} /></View>

              <View style={modalS.actions}>
                <TouchableOpacity style={modalS.cancelBtn} onPress={() => { setShowUploadModal(false); resetForm(); }}><Text style={modalS.cancelText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[modalS.uploadBtn, (!newWorkTitle.trim() || !!titleError) && { opacity: 0.5 }]} onPress={handleUploadWork} disabled={!newWorkTitle.trim() || !!titleError}>
                  <LinearGradient colors={['#0f172a', colors.primary]} style={modalS.uploadGradient}><Text style={modalS.uploadText}>{editingWorkId ? 'Save Changes' : 'Upload Work'}</Text></LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={!!selectedWork} transparent animationType="slide">
        <View style={modalS.overlay}>
          <View style={modalS.sheet}>
            {selectedWork && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={modalS.header}><Text style={modalS.title}>Work Details</Text><TouchableOpacity onPress={() => setSelectedWork(null)}><X size={22} color={colors.textPrimary} /></TouchableOpacity></View>
                {selectedWork.image_url ? <Image source={{ uri: selectedWork.image_url }} style={{ width: '100%', height: 280, borderRadius: borderRadius.xl, marginBottom: 14 }} resizeMode="cover" /> : (
                  <View style={{ width: '100%', height: 280, borderRadius: borderRadius.xl, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center', marginBottom: 14 }}><Images size={48} color={colors.textTertiary} /></View>
                )}
                <Text style={{ ...typography.h2, color: colors.textPrimary, marginBottom: 8 }}>{selectedWork.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                  <View style={styles.catBadge}><Text style={styles.catBadgeText}>{selectedWork.category || 'Art'}</Text></View>
                  <Text style={{ marginLeft: 12, color: colors.textTertiary, ...typography.bodySmall }}>{new Date(selectedWork.created_at).toLocaleDateString()}</Text>
                </View>
                {selectedWork.description ? <Text style={{ ...typography.body, color: colors.textSecondary, marginBottom: 20, lineHeight: 22 }}>{selectedWork.description}</Text> : null}
                {selectedWork.price_estimate ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: colors.primaryLight, borderRadius: borderRadius.lg, marginBottom: 18, borderWidth: 1, borderColor: 'rgba(190,144,85,0.2)' }}>
                    <DollarSign size={16} color={colors.primaryDark} /><Text style={{ fontWeight: '700', color: colors.primaryDark, ...typography.body }}>Estimated: P{Number(selectedWork.price_estimate).toLocaleString()}</Text>
                  </View>
                ) : null}
                <View style={modalS.group}><Text style={modalS.label}>Visibility Settings</Text>
                  <VisibilityToggle value={selectedWork.is_public} onToggle={async () => {
                    const nv = !selectedWork.is_public; setSelectedWork({ ...selectedWork, is_public: nv });
                    const r = await updateArtistWorkVisibility(selectedWork.id, nv);
                    if (r.success) setWorks(works.map(w => w.id === selectedWork.id ? { ...w, is_public: nv } : w));
                    else { Alert.alert('Error', 'Failed to update.'); setSelectedWork({ ...selectedWork, is_public: !nv }); }
                  }} />
                </View>
                <TouchableOpacity style={modalS.editDetailBtn} onPress={() => { handleEditWork(selectedWork); setSelectedWork(null); }}><Text style={modalS.editDetailText}>Edit Work Details</Text></TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => { resetForm(); setShowUploadModal(true); }} activeOpacity={0.8}>
        <LinearGradient colors={['#0f172a', colors.primary]} style={styles.fabGradient}><Plus size={28} color="#fff" /></LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 24, paddingTop: 56, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...typography.h2, color: '#ffffff' },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: borderRadius.lg, padding: 10, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800', color: '#ffffff', marginBottom: 2 },
  statLabel: { ...typography.bodyXSmall, color: '#ffffff', opacity: 0.8 },
  content: { padding: 16, paddingBottom: 100 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: borderRadius.lg, paddingHorizontal: 14, marginBottom: 14, height: 46, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, marginLeft: 10, ...typography.body, color: colors.textPrimary },
  sortRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sortText: { ...typography.bodyXSmall, color: colors.textSecondary, fontWeight: '600' },
  catRow: { flexDirection: 'row', marginBottom: 20 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#ffffff', borderRadius: borderRadius.round, borderWidth: 1, borderColor: colors.border, marginRight: 8 },
  catChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  catText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  catTextActive: { color: '#ffffff' },
  sectionTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  workCard: { width: '47%', backgroundColor: '#ffffff', borderRadius: borderRadius.xl, overflow: 'hidden', marginBottom: 6, borderWidth: 1, borderColor: colors.border, position: 'relative' },
  workImg: { width: '100%', height: 140, resizeMode: 'cover' },
  workInfo: { padding: 10 },
  workTitle: { ...typography.bodySmall, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  workMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catBadge: { backgroundColor: colors.lightBgSecondary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.sm },
  catBadgeText: { ...typography.bodyXSmall, color: colors.textSecondary },
  workDate: { ...typography.bodyXSmall, color: colors.textTertiary },
  editFloatBtn: { position: 'absolute', top: 8, right: 38, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.92)', justifyContent: 'center', alignItems: 'center' },
  deleteFloatBtn: { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.92)', justifyContent: 'center', alignItems: 'center' },
  visToggle: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#f8fafc', borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border },
  visText: { flex: 1, marginLeft: 10, ...typography.bodySmall, color: colors.textTertiary },
  visTextActive: { color: colors.textPrimary, fontWeight: '600' },
  toggleTrack: { width: 40, height: 22, backgroundColor: colors.lightBgSecondary, borderRadius: 11, padding: 2 },
  toggleTrackActive: { backgroundColor: colors.primary },
  toggleThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#ffffff' },
  toggleThumbActive: { transform: [{ translateX: 18 }] },
  fab: { position: 'absolute', bottom: 28, right: 20, width: 60, height: 60, borderRadius: 30, overflow: 'hidden', ...shadows.button },
  fabGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
});

const modalS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  title: { ...typography.h3, color: colors.textPrimary },
  group: { marginBottom: 14 },
  label: { ...typography.bodySmall, fontWeight: '600', marginBottom: 6, color: colors.textSecondary },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, padding: 12, ...typography.body, color: colors.textPrimary },
  error: { ...typography.bodyXSmall, color: colors.error, marginTop: 4 },
  tabWrap: { flexDirection: 'row', marginBottom: 10, backgroundColor: colors.lightBgSecondary, borderRadius: borderRadius.lg, padding: 3 },
  tab: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: borderRadius.md },
  tabActive: { backgroundColor: '#ffffff' },
  tabText: { ...typography.bodyXSmall, color: colors.textTertiary },
  tabTextActive: { color: colors.textPrimary, fontWeight: '700' },
  imgPicker: { height: 140, backgroundColor: '#f8fafc', borderRadius: borderRadius.lg, borderStyle: 'dashed', borderWidth: 2, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  imgPreview: { width: '100%', height: '100%' },
  imgPlaceholder: { alignItems: 'center' },
  imgPickerText: { ...typography.bodyXSmall, color: colors.textTertiary, marginTop: 6 },
  catOpt: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: colors.lightBgSecondary, borderRadius: borderRadius.round, marginRight: 8 },
  catOptActive: { backgroundColor: '#0f172a' },
  catOptText: { ...typography.bodyXSmall, color: colors.textTertiary },
  catOptTextActive: { color: '#ffffff' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 20 },
  cancelBtn: { flex: 1, paddingVertical: 13, alignItems: 'center', backgroundColor: colors.lightBgSecondary, borderRadius: borderRadius.lg },
  cancelText: { ...typography.body, fontWeight: '600', color: colors.textTertiary },
  uploadBtn: { flex: 2, borderRadius: borderRadius.lg, overflow: 'hidden' },
  uploadGradient: { height: 48, justifyContent: 'center', alignItems: 'center' },
  uploadText: { ...typography.button, color: '#ffffff' },
  editDetailBtn: { paddingVertical: 13, alignItems: 'center', backgroundColor: colors.lightBgSecondary, borderRadius: borderRadius.lg, marginTop: 14, marginBottom: 20 },
  editDetailText: { ...typography.body, fontWeight: '600', color: colors.primary },
});