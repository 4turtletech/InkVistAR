/**
 * ArtistWorks.jsx -- Portfolio Manager (Gilded Noir v2)
 * Theme-aware, animated, haptic feedback. Search, category chips, sort, grid, upload/detail modals.
 */
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, Image, Modal, ActivityIndicator, RefreshControl,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Plus, Search, ArrowUpDown, Grid3x3, Eye, Palette, Brush,
  Flame, Pencil, X, Upload, Globe, Lock, Trash2, Edit3, Images, DollarSign, Check, XCircle,
} from 'lucide-react-native';
import { typography } from '../src/theme';
import { useTheme } from '../src/context/ThemeContext';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { AnimatedTouchable } from '../src/components/shared/AnimatedTouchable';
import { getArtistPortfolio, addArtistWork, deleteArtistWork, updateArtistWorkVisibility } from '../src/utils/api';
import { API_URL } from '../src/config';

const CAT_ICONS = { all: Grid3x3, Realism: Eye, Traditional: Palette, Japanese: Brush, Tribal: Flame, 'Fine Line': Pencil };

export function ArtistWorks({ onBack, artistId }) {
  const { theme: colors, hapticsEnabled } = useTheme();
  const styles = getStyles(colors);
  const modalS = getModalStyles(colors);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
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
  const [refreshing, setRefreshing] = useState(false);
  const [uploadType, setUploadType] = useState('url');
  const [selectedWork, setSelectedWork] = useState(null);
  const [editingWorkId, setEditingWorkId] = useState(null);
  const [alertModal, setAlertModal] = useState({ visible: false, title: '', message: '' });
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);

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
  
  const onRefresh = async () => { setRefreshing(true); await loadPortfolio(); setRefreshing(false); };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { setAlertModal({ visible: true, title: 'Permission needed', message: 'Photo access is required.' }); return; }
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.5, base64: true });
    if (!result.canceled) setNewWorkImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
  };

  const resetForm = () => { setNewWorkTitle(''); setNewWorkImage(''); setNewWorkDescription(''); setNewWorkPriceEstimate(''); setTitleError(''); setIsPublic(true); setEditingWorkId(null); setUploadType('url'); };

  const handleUploadWork = async () => {
    if (!newWorkTitle.trim() || titleError) return;
    if (!newWorkImage.trim()) { setAlertModal({ visible: true, title: 'Missing Image', message: 'Please provide an image.' }); return; }
    const sanitize = (t) => t.trim().replace(/<[^>]*>?/gm, '');
    const payload = { title: sanitize(newWorkTitle), description: sanitize(newWorkDescription), category: newWorkCategory, imageUrl: newWorkImage, isPublic, priceEstimate: newWorkPriceEstimate ? sanitize(newWorkPriceEstimate) : null };
    setLoading(true);
    let result;
    if (editingWorkId) { try { result = await (await fetch(`${API_URL}/artist/portfolio/${editingWorkId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })).json(); } catch (e) { result = { success: false, message: 'Network error.' }; } }
    else result = await addArtistWork(artistId, payload);
    setLoading(false);
    if (result.success) { setAlertModal({ visible: true, title: 'Success!', message: editingWorkId ? 'Work updated.' : 'Uploaded to portfolio.' }); resetForm(); setShowUploadModal(false); loadPortfolio(); }
    else setAlertModal({ visible: true, title: 'Error', message: result.message || 'Failed.' });
  };

  const handleEditWork = (w) => { setEditingWorkId(w.id); setNewWorkTitle(w.title); setNewWorkDescription(w.description || ''); setNewWorkCategory(w.category || 'Realism'); setIsPublic(w.is_public === 1 || w.is_public === true); setNewWorkImage(w.image_url); setNewWorkPriceEstimate(w.price_estimate ? String(w.price_estimate) : ''); setUploadType(w.image_url?.startsWith('data:') ? 'upload' : 'url'); setShowUploadModal(true); };

  const handleDeleteWork = (id) => { setConfirmDeleteId(id); };
  const confirmDelete = async () => { const id = confirmDeleteId; setConfirmDeleteId(null); const r = await deleteArtistWork(id); r.success ? loadPortfolio() : setAlertModal({ visible: true, title: 'Error', message: 'Failed.' }); };

  const handleCategoryToggle = (cat) => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (cat === 'all') { setSelectedCategories([]); }
    else { setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]); }
  };

  const filteredWorks = works.filter(w => {
    const matchCat = selectedCategories.length === 0 || selectedCategories.includes(w.category);
    const matchSearch = (w.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  }).sort((a, b) => { if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at); if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at); if (sortBy === 'az') return a.title.localeCompare(b.title); return 0; });

  const toggleSort = () => { if (sortBy === 'newest') setSortBy('oldest'); else if (sortBy === 'oldest') setSortBy('az'); else setSortBy('newest'); };

  const getSuggestions = () => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    const map = new Map();
    works.forEach(w => {
      if (w.title && w.title.toLowerCase().includes(q)) map.set(w.title, { type: 'Title', text: w.title });
      if (w.category && w.category.toLowerCase().includes(q)) map.set(w.category, { type: 'Category', text: w.category });
    });
    return Array.from(map.values()).slice(0, 5);
  };
  const suggestions = getSuggestions();

  const VisibilityToggle = ({ value, onToggle }) => (
    <TouchableOpacity style={styles.visToggle} onPress={onToggle} activeOpacity={0.8}>
      {value ? <Globe size={18} color={colors.gold} /> : <Lock size={18} color={colors.textTertiary} />}
      <Text style={[styles.visText, value && styles.visTextActive]}>{value ? 'Public Portfolio' : 'Private Portfolio'}</Text>
      <View style={[styles.toggleTrack, value && styles.toggleTrackActive]}><View style={[styles.toggleThumb, value && styles.toggleThumbActive]} /></View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <AnimatedTouchable onPress={onBack} style={styles.backBtn}><ArrowLeft size={20} color={colors.textPrimary} /></AnimatedTouchable>
          <Text style={styles.headerTitle}>My Portfolio</Text>
          <AnimatedTouchable style={styles.addBtn} onPress={() => setShowUploadModal(true)}><Plus size={22} color={colors.gold} /></AnimatedTouchable>
        </View>
        <View style={styles.statsRow}>
          {[['Total Works', works.length], ['Public', works.filter(w => w.is_public).length], ['Private', works.filter(w => !w.is_public).length]].map(([label, num]) => (
            <View key={label} style={styles.statCard}><Text style={styles.statNum}>{num}</Text><Text style={styles.statLabel}>{label}</Text></View>
          ))}
        </View>

        <View style={styles.content}>
          {/* Search with Autocomplete */}
          <View style={{ zIndex: 10, position: 'relative' }}>
            <View style={styles.searchWrap}>
              <Search size={18} color={colors.textTertiary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by title or category..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              />
              {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}><XCircle size={18} color={colors.textTertiary} /></TouchableOpacity>}
            </View>
            {searchFocused && searchQuery.length > 0 && suggestions.length > 0 && (
              <View style={styles.dropdownWrap}>
                {suggestions.map((s, i) => (
                  <TouchableOpacity key={i} style={styles.dropdownItem} onPress={() => { setSearchQuery(s.text); setSearchFocused(false); }}>
                    <View style={{ marginRight: 8 }}><Search size={14} color={colors.textTertiary} /></View>
                    <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={styles.dropdownText}>{s.text}</Text>
                      <Text style={styles.dropdownType}>{s.type}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Sort */}
          <View style={styles.sortRow}><TouchableOpacity style={styles.sortBtn} onPress={toggleSort}><ArrowUpDown size={14} color={colors.textSecondary} /><Text style={styles.sortText}>Sort: {sortBy.toUpperCase()}</Text></TouchableOpacity></View>

          {/* Category Checkboxes */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
            <TouchableOpacity style={[styles.catChip, selectedCategories.length === 0 && styles.catChipActive]} onPress={() => handleCategoryToggle('all')}>
              {selectedCategories.length === 0 ? <View style={{ marginRight: 4 }}><Check size={13} color={colors.backgroundDeep} /></View> : <View style={{ marginRight: 4 }}><X size={13} color={colors.textPrimary} /></View>}
              <Text style={[styles.catText, selectedCategories.length === 0 && styles.catTextActive]}>{selectedCategories.length === 0 ? 'All' : 'Clear'}</Text>
            </TouchableOpacity>
            {categories.filter(c => c.id !== 'all').map(cat => (
              <TouchableOpacity key={cat.id} onPress={() => handleCategoryToggle(cat.id)} style={[styles.catChip, selectedCategories.includes(cat.id) && styles.catChipActive]}>
                {selectedCategories.includes(cat.id) && <View style={{ marginRight: 4 }}><Check size={13} color={colors.backgroundDeep} /></View>}
                <Text style={[styles.catText, selectedCategories.includes(cat.id) && styles.catTextActive]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loading && <PremiumLoader message="Loading portfolio..." />}

          {/* Grid */}
          <Text style={styles.sectionTitle}>Portfolio Items</Text>
          <View style={styles.grid}>
            {!loading && filteredWorks.length === 0 && <EmptyState icon={Search} title="No works found" subtitle="Try a different search or category" />}
            {filteredWorks.map(w => (
              <AnimatedTouchable key={w.id} style={styles.workCard} onPress={() => setSelectedWork(w)} activeOpacity={0.85}>
                {w.image_url ? <Image source={{ uri: w.image_url }} style={styles.workImg} /> : (
                  <View style={[styles.workImg, { backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center' }]}><Images size={36} color={colors.textTertiary} /></View>
                )}
                <View style={styles.workInfo}>
                  <Text style={styles.workTitle} numberOfLines={1}>{w.title}</Text>
                  <View style={styles.workMeta}>
                    <View style={styles.catBadge}><Text style={styles.catBadgeText}>{w.category || 'Art'}</Text></View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      {w.is_public ? <Globe size={10} color={colors.gold} /> : <Lock size={10} color={colors.textTertiary} />}
                      <Text style={styles.workDate}>{new Date(w.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity style={styles.editFloatBtn} onPress={() => handleEditWork(w)}><Edit3 size={14} color={colors.gold} /></TouchableOpacity>
                <TouchableOpacity style={styles.deleteFloatBtn} onPress={() => handleDeleteWork(w.id)}><Trash2 size={14} color={colors.error} /></TouchableOpacity>
              </AnimatedTouchable>
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
                  {categories.filter(c => c.id !== 'all').map(c => (
                    <TouchableOpacity key={c.id} style={[modalS.catOpt, newWorkCategory === c.id && modalS.catOptActive]} onPress={() => setNewWorkCategory(c.id)}>
                      {newWorkCategory === c.id && <View style={{ marginRight: 4 }}><Check size={13} color={colors.backgroundDeep} /></View>}
                      <Text style={[modalS.catOptText, newWorkCategory === c.id && modalS.catOptTextActive]}>{c.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={modalS.group}><Text style={modalS.label}>Price Estimate (P)</Text><TextInput style={modalS.input} placeholder="e.g. 2500" placeholderTextColor={colors.textTertiary} value={newWorkPriceEstimate} onChangeText={setNewWorkPriceEstimate} keyboardType="numeric" /></View>

              <View style={modalS.group}><Text style={modalS.label}>Settings</Text><VisibilityToggle value={isPublic} onToggle={() => setIsPublic(!isPublic)} /></View>

              <View style={modalS.actions}>
                <AnimatedTouchable style={modalS.cancelBtn} onPress={() => { setShowUploadModal(false); resetForm(); }}><Text style={modalS.cancelText}>Cancel</Text></AnimatedTouchable>
                <AnimatedTouchable style={[modalS.uploadBtn, (!newWorkTitle.trim() || !!titleError) && { opacity: 0.5 }]} onPress={handleUploadWork} disabled={!newWorkTitle.trim() || !!titleError}>
                  <Text style={modalS.uploadText}>{editingWorkId ? 'Save Changes' : 'Upload Work'}</Text>
                </AnimatedTouchable>
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
                {selectedWork.image_url ? <Image source={{ uri: selectedWork.image_url }} style={{ width: '100%', height: 280, borderRadius: 16, marginBottom: 14 }} resizeMode="cover" /> : (
                  <View style={{ width: '100%', height: 280, borderRadius: 16, backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center', marginBottom: 14 }}><Images size={48} color={colors.textTertiary} /></View>
                )}
                <Text style={{ ...typography.h2, color: colors.textPrimary, marginBottom: 8 }}>{selectedWork.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                  <View style={styles.catBadge}><Text style={styles.catBadgeText}>{selectedWork.category || 'Art'}</Text></View>
                  <Text style={{ marginLeft: 12, color: colors.textTertiary, ...typography.bodySmall }}>{new Date(selectedWork.created_at).toLocaleDateString()}</Text>
                </View>
                {selectedWork.description ? <Text style={{ ...typography.body, color: colors.textSecondary, marginBottom: 20, lineHeight: 22 }}>{selectedWork.description}</Text> : null}
                {selectedWork.price_estimate ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: colors.iconGoldBg, borderRadius: 12, marginBottom: 18, borderWidth: 1, borderColor: colors.borderGold }}>
                    <DollarSign size={16} color={colors.gold} /><Text style={{ fontWeight: '700', color: colors.gold, ...typography.body }}>Estimated: P{Number(selectedWork.price_estimate).toLocaleString()}</Text>
                  </View>
                ) : null}
                <View style={modalS.group}><Text style={modalS.label}>Visibility Settings</Text>
                  <VisibilityToggle value={selectedWork.is_public} onToggle={async () => {
                    const nv = !selectedWork.is_public; setSelectedWork({ ...selectedWork, is_public: nv });
                    const r = await updateArtistWorkVisibility(selectedWork.id, nv);
                    if (r.success) setWorks(works.map(w => w.id === selectedWork.id ? { ...w, is_public: nv } : w));
                    else { setAlertModal({ visible: true, title: 'Error', message: 'Failed to update.' }); setSelectedWork({ ...selectedWork, is_public: !nv }); }
                  }} />
                </View>
                <TouchableOpacity style={modalS.editDetailBtn} onPress={() => { handleEditWork(selectedWork); setSelectedWork(null); }}><Text style={modalS.editDetailText}>Edit Work Details</Text></TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* FAB */}
      <AnimatedTouchable style={styles.fab} onPress={() => { resetForm(); setShowUploadModal(true); }}>
        <Plus size={28} color={colors.backgroundDeep} />
      </AnimatedTouchable>

      {/* Alert Modal */}
      <Modal visible={alertModal.visible} animationType="fade" transparent>
        <View style={styles.alertOverlay}>
          <View style={styles.alertCard}>
            <Text style={{ ...typography.h3, color: colors.textPrimary, marginBottom: 8, textAlign: 'center' }}>{alertModal.title}</Text>
            <Text style={{ ...typography.body, color: colors.textSecondary, marginBottom: 20, textAlign: 'center' }}>{alertModal.message}</Text>
            <AnimatedTouchable style={styles.alertBtn} onPress={() => setAlertModal({ ...alertModal, visible: false })}>
              <Text style={styles.alertBtnText}>OK</Text>
            </AnimatedTouchable>
          </View>
        </View>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal visible={!!confirmDeleteId} animationType="fade" transparent>
        <View style={styles.alertOverlay}>
          <View style={styles.alertCard}>
            <Text style={{ ...typography.h3, color: colors.textPrimary, marginBottom: 8, textAlign: 'center' }}>Delete Work</Text>
            <Text style={{ ...typography.body, color: colors.textSecondary, marginBottom: 20, textAlign: 'center' }}>Are you sure you want to delete this work?</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <AnimatedTouchable style={[styles.alertBtn, { flex: 1, backgroundColor: colors.surfaceLight }]} onPress={() => setConfirmDeleteId(null)}>
                <Text style={[styles.alertBtnText, { color: colors.textPrimary }]}>Cancel</Text>
              </AnimatedTouchable>
              <AnimatedTouchable style={[styles.alertBtn, { flex: 1, backgroundColor: colors.error }]} onPress={confirmDelete}>
                <Text style={[styles.alertBtnText, { color: '#ffffff' }]}>Delete</Text>
              </AnimatedTouchable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statNum: { fontSize: 20, fontWeight: '800', color: colors.gold, marginBottom: 2 },
  statLabel: { ...typography.bodyXSmall, color: colors.textSecondary },
  content: { padding: 16, paddingBottom: 100 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 14, marginBottom: 14, height: 48, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, height: 46, marginLeft: 10, ...typography.body, color: colors.textPrimary },
  dropdownWrap: { position: 'absolute', top: 52, left: 0, right: 0, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingVertical: 4, zIndex: 20 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  dropdownText: { ...typography.body, color: colors.textPrimary },
  dropdownType: { ...typography.bodyXSmall, color: colors.gold },
  sortRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sortText: { ...typography.bodyXSmall, color: colors.textSecondary, fontWeight: '600' },
  catRow: { flexDirection: 'row', marginBottom: 20 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, marginRight: 8 },
  catChipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  catText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  catTextActive: { color: colors.backgroundDeep },
  sectionTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  workCard: { width: '47%', backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden', marginBottom: 6, borderWidth: 1, borderColor: colors.border, position: 'relative' },
  workImg: { width: '100%', height: 140, resizeMode: 'cover' },
  workInfo: { padding: 10 },
  workTitle: { ...typography.bodySmall, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  workMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catBadge: { backgroundColor: colors.surfaceLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  catBadgeText: { ...typography.bodyXSmall, color: colors.textSecondary },
  workDate: { ...typography.bodyXSmall, color: colors.textTertiary },
  editFloatBtn: { position: 'absolute', top: 8, right: 38, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  deleteFloatBtn: { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  visToggle: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.surfaceLight, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  visText: { flex: 1, marginLeft: 10, ...typography.bodySmall, color: colors.textTertiary },
  visTextActive: { color: colors.textPrimary, fontWeight: '600' },
  toggleTrack: { width: 40, height: 22, backgroundColor: colors.surfaceLight, borderRadius: 11, padding: 2 },
  toggleTrackActive: { backgroundColor: colors.gold },
  toggleThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#ffffff' },
  toggleThumbActive: { transform: [{ translateX: 18 }] },
  fab: { position: 'absolute', bottom: 28, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.gold, justifyContent: 'center', alignItems: 'center' },
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  alertCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, width: '85%', borderWidth: 1, borderColor: colors.border },
  alertBtn: { backgroundColor: colors.gold, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  alertBtnText: { ...typography.button, color: colors.backgroundDeep, fontSize: 16 },
});

const getModalStyles = (colors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, maxHeight: '90%', borderWidth: 1, borderColor: colors.border },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  title: { ...typography.h3, color: colors.textPrimary },
  group: { marginBottom: 14 },
  label: { ...typography.bodySmall, fontWeight: '600', marginBottom: 6, color: colors.textSecondary },
  input: { backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, ...typography.body, color: colors.textPrimary },
  error: { ...typography.bodyXSmall, color: colors.error, marginTop: 4 },
  tabWrap: { flexDirection: 'row', marginBottom: 10, backgroundColor: colors.surfaceLight, borderRadius: 12, padding: 3 },
  tab: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: colors.surface },
  tabText: { ...typography.bodyXSmall, color: colors.textTertiary },
  tabTextActive: { color: colors.textPrimary, fontWeight: '700' },
  imgPicker: { height: 140, backgroundColor: colors.surfaceLight, borderRadius: 12, borderStyle: 'dashed', borderWidth: 2, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  imgPreview: { width: '100%', height: '100%' },
  imgPlaceholder: { alignItems: 'center' },
  imgPickerText: { ...typography.bodyXSmall, color: colors.textTertiary, marginTop: 6 },
  catOpt: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, backgroundColor: colors.surfaceLight, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: colors.border },
  catOptActive: { backgroundColor: colors.gold },
  catOptText: { ...typography.bodyXSmall, color: colors.textTertiary },
  catOptTextActive: { color: colors.backgroundDeep },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 20 },
  cancelBtn: { flex: 1, paddingVertical: 13, alignItems: 'center', backgroundColor: colors.surfaceLight, borderRadius: 12 },
  cancelText: { ...typography.body, fontWeight: '600', color: colors.textTertiary },
  uploadBtn: { flex: 2, borderRadius: 12, backgroundColor: colors.gold, paddingVertical: 14, alignItems: 'center' },
  uploadText: { ...typography.button, color: colors.backgroundDeep },
  editDetailBtn: { paddingVertical: 13, alignItems: 'center', backgroundColor: colors.surfaceLight, borderRadius: 12, marginTop: 14, marginBottom: 20 },
  editDetailText: { ...typography.body, fontWeight: '600', color: colors.gold },
});