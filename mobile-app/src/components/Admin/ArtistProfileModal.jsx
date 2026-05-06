import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert, FlatList, Image } from 'react-native';
import { X, User, Calendar, Save, Palette, DollarSign, Globe, Lock } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { typography, borderRadius, shadows } from '../../theme';
import { fetchAPI } from '../../utils/api';
import { StatusBadge } from '../shared/StatusBadge';
import { formatDate, formatTime, formatCurrency } from '../../utils/formatters';
import { PremiumLoader } from '../shared/PremiumLoader';

export const ArtistProfileModal = ({ visible, artist, onClose, onRefreshUsers }) => {
  const { theme: colors } = useTheme();
  const styles = getStyles(colors);
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  
  const [artistData, setArtistData] = useState({ profile: {}, appointments: [], portfolio: [], stats: {} });
  const [formData, setFormData] = useState({ name: '', specialization: '', experience_years: '', commission_rate: '' });
  
  const [editingPortfolioItem, setEditingPortfolioItem] = useState(null);
  const [portfolioFormData, setPortfolioFormData] = useState({ title: '', category: '', description: '', priceEstimate: '', isPublic: true });

  const VisibilityToggle = ({ value, onToggle }) => (
    <TouchableOpacity style={styles.visToggle} onPress={onToggle} activeOpacity={0.8}>
      {value ? <Globe size={18} color={colors.gold} /> : <Lock size={18} color={colors.textTertiary} />}
      <Text style={[styles.visText, value && styles.visTextActive]}>{value ? 'Public Portfolio' : 'Private Portfolio'}</Text>
      <View style={[styles.toggleTrack, value && styles.toggleTrackActive]}><View style={[styles.toggleThumb, value && styles.toggleThumbActive]} /></View>
    </TouchableOpacity>
  );

  useEffect(() => {
    if (visible && artist) {
      loadArtistData();
      setActiveTab('profile');
    }
  }, [visible, artist]);

  const loadArtistData = async () => {
    setLoading(true);
    try {
      const [dashboardRes, portfolioRes] = await Promise.all([
        fetchAPI(`/artist/dashboard/${artist.id}`),
        fetchAPI(`/artist/${artist.id}/portfolio`)
      ]);

      if (dashboardRes.success && portfolioRes.success) {
        setArtistData({
          profile: dashboardRes.artist || {},
          appointments: dashboardRes.appointments || [],
          portfolio: portfolioRes.works || [],
          stats: dashboardRes.stats || {}
        });
        setFormData({
          name: dashboardRes.artist?.name || '',
          specialization: dashboardRes.artist?.specialization || '',
          experience_years: String(dashboardRes.artist?.experience_years || 0),
          commission_rate: String(dashboardRes.artist?.commission_rate || 0.3)
        });
      }
    } catch (e) {
      console.error("Error loading artist data:", e);
      Alert.alert("Error", "Failed to load artist details");
    }
    setLoading(false);
  };

  const handleSaveProfile = async () => {
    try {
      const result = await fetchAPI(`/artist/profile/${artist.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...formData,
          experience_years: parseInt(formData.experience_years) || 0,
        }),
      });

      if (result.success) {
        Alert.alert("Success", "Artist profile updated!");
        onRefreshUsers();
        onClose();
      } else {
        Alert.alert("Error", result.message || "Failed to update profile");
      }
    } catch (e) {
      Alert.alert("Error", "An unexpected error occurred.");
    }
  };

  const handleSavePortfolioItem = async () => {
    if (!portfolioFormData.title.trim() || !portfolioFormData.category.trim()) {
      Alert.alert("Validation Error", "Title and Category are required");
      return;
    }
    try {
      const res = await fetchAPI(`/artist/portfolio/${editingPortfolioItem.id}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          title: portfolioFormData.title, 
          category: portfolioFormData.category,
          description: portfolioFormData.description,
          priceEstimate: portfolioFormData.priceEstimate,
          isPublic: portfolioFormData.isPublic
        })
      });
      if (res.success) {
        Alert.alert("Success", "Portfolio item updated");
        setEditingPortfolioItem(null);
        loadArtistData();
      } else {
        Alert.alert("Error", res.message || "Failed to update item");
      }
    } catch(e) {
      Alert.alert("Error", "An unexpected error occurred.");
    }
  };

  const handleDeletePortfolioItem = () => {
    Alert.alert("Delete", "Are you sure you want to delete this portfolio item?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          const res = await fetchAPI(`/artist/portfolio/${editingPortfolioItem.id}`, { method: 'DELETE' });
          if (res.success) {
            Alert.alert("Success", "Portfolio item deleted");
            setEditingPortfolioItem(null);
            loadArtistData();
          } else {
            Alert.alert("Error", res.message || "Failed to delete item");
          }
        } catch(e) {
          Alert.alert("Error", "An unexpected error occurred.");
        }
      }}
    ]);
  };

  const renderScheduleItem = ({ item }) => (
    <View style={styles.scheduleCard}>
      <View style={styles.scheduleLeft}>
        <Text style={styles.scheduleDate}>{formatDate(item.appointment_date)}</Text>
        <Text style={styles.scheduleTime}>{item.start_time ? formatTime(item.start_time) : 'No time set'}</Text>
        <Text style={styles.scheduleClient} numberOfLines={1}>{item.client_name}</Text>
      </View>
      <View style={styles.scheduleRight}>
        <StatusBadge status={item.status} />
        <Text style={styles.scheduleService} numberOfLines={1}>{item.design_title}</Text>
      </View>
    </View>
  );

  const renderPortfolioItem = ({ item }) => {
    const imgUri = item.image_url || item.thumbnail_url || null;
    return (
      <TouchableOpacity 
        style={styles.portfolioItem} 
        onPress={() => {
          setEditingPortfolioItem(item);
          setPortfolioFormData({ 
            title: item.title || '', 
            category: item.category || '',
            description: item.description || '',
            priceEstimate: item.price_estimate ? String(item.price_estimate) : '',
            isPublic: item.is_public === 1 || item.is_public === true
          });
        }}
      >
        {imgUri ? (
          <Image source={{ uri: imgUri }} style={styles.portfolioImage} resizeMode="cover" />
        ) : (
          <View style={[styles.portfolioImage, { backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center' }]}>
            <Palette size={28} color={colors.textTertiary} />
          </View>
        )}
        <View style={styles.portfolioOverlay}>
          <Text style={styles.portfolioTitle} numberOfLines={1}>{item.title || 'Untitled'}</Text>
          <Text style={styles.portfolioCategory} numberOfLines={1}>{item.category || 'Uncategorized'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEarningsItem = ({ item }) => {
    const commissionRate = artistData.profile.commission_rate || 0.3;
    const amount = item.price || 0;
    const commission = amount * commissionRate;
    return (
      <View style={styles.earningCard}>
        <View style={styles.earningLeft}>
          <Text style={styles.earningDate}>{formatDate(item.appointment_date)}</Text>
          <Text style={styles.earningClient}>{item.client_name}</Text>
        </View>
        <View style={styles.earningRight}>
          <Text style={styles.earningAmount}>Total: P{formatCurrency(amount)}</Text>
          <Text style={styles.earningCommission}>Artist Cut: P{formatCurrency(commission)}</Text>
        </View>
      </View>
    );
  };

  if (!artist) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIcon}><User size={20} color={colors.primary} /></View>
              <View>
                <Text style={styles.headerTitle} numberOfLines={1}>{artist.name}</Text>
                <Text style={styles.headerSubtitle}>Staff ID: #STR-{artist.id.toString().padStart(4, '0')}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}><X size={22} color={colors.textSecondary} /></TouchableOpacity>
          </View>

          {/* Tabs */}
          {!editingPortfolioItem && (
            <View style={styles.tabContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                <TouchableOpacity style={[styles.tabBtn, activeTab === 'profile' && styles.tabBtnActive]} onPress={() => setActiveTab('profile')}>
                  <User size={16} color={activeTab === 'profile' ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabBtn, activeTab === 'schedule' && styles.tabBtnActive]} onPress={() => setActiveTab('schedule')}>
                  <Calendar size={16} color={activeTab === 'schedule' ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.tabText, activeTab === 'schedule' && styles.tabTextActive]}>Schedule</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabBtn, activeTab === 'portfolio' && styles.tabBtnActive]} onPress={() => setActiveTab('portfolio')}>
                  <Palette size={16} color={activeTab === 'portfolio' ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.tabText, activeTab === 'portfolio' && styles.tabTextActive]}>Portfolio</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabBtn, activeTab === 'earnings' && styles.tabBtnActive]} onPress={() => setActiveTab('earnings')}>
                  <DollarSign size={16} color={activeTab === 'earnings' ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.tabText, activeTab === 'earnings' && styles.tabTextActive]}>Earnings</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}

          {/* Body */}
          <View style={styles.body}>
            {editingPortfolioItem ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <TouchableOpacity onPress={() => setEditingPortfolioItem(null)} style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ ...typography.bodySmall, color: colors.gold }}>← Back to Portfolio</Text>
                </TouchableOpacity>
                <Image source={{ uri: editingPortfolioItem.image_url || editingPortfolioItem.thumbnail_url }} style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: 16 }} resizeMode="cover" />
                <Text style={styles.inputLabel}>Title</Text>
                <TextInput style={styles.input} value={portfolioFormData.title} onChangeText={t => setPortfolioFormData({ ...portfolioFormData, title: t })} />
                <Text style={styles.inputLabel}>Category</Text>
                <TextInput style={styles.input} value={portfolioFormData.category} onChangeText={t => setPortfolioFormData({ ...portfolioFormData, category: t })} />
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={portfolioFormData.description} onChangeText={t => setPortfolioFormData({ ...portfolioFormData, description: t })} multiline />
                <Text style={styles.inputLabel}>Price Estimate (P)</Text>
                <TextInput style={styles.input} value={portfolioFormData.priceEstimate} onChangeText={t => setPortfolioFormData({ ...portfolioFormData, priceEstimate: t })} keyboardType="numeric" />
                <Text style={styles.inputLabel}>Settings</Text>
                <VisibilityToggle value={portfolioFormData.isPublic} onToggle={() => setPortfolioFormData({ ...portfolioFormData, isPublic: !portfolioFormData.isPublic })} />
                
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                  <TouchableOpacity style={[styles.cancelBtn, { flex: 1, backgroundColor: colors.errorBg || 'rgba(239, 68, 68, 0.1)', borderColor: colors.error, borderWidth: 1 }]} onPress={handleDeletePortfolioItem}>
                    <Text style={[styles.cancelBtnText, { color: colors.error }]}>Delete Post</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSavePortfolioItem}>
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : loading ? <PremiumLoader message="Fetching performance metrics..." /> : (
              activeTab === 'profile' ? (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.inputLabel}>Name</Text>
                  <TextInput style={styles.input} value={formData.name} onChangeText={t => setFormData({ ...formData, name: t })} />
                  
                  <Text style={styles.inputLabel}>Specialization / Styles</Text>
                  <TextInput style={styles.input} value={formData.specialization} onChangeText={t => setFormData({ ...formData, specialization: t })} placeholder="e.g., Realism, Traditional" />
                  
                  <Text style={styles.inputLabel}>Experience (Years)</Text>
                  <TextInput style={styles.input} value={formData.experience_years} onChangeText={t => setFormData({ ...formData, experience_years: t })} keyboardType="numeric" />
                  
                  <Text style={styles.inputLabel}>Commission Rate (%) - Fixed</Text>
                  <TextInput style={[styles.input, styles.inputDisabled]} value={String((artistData.profile.commission_rate || 0.3) * 100) + '%'} editable={false} />

                  <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Total Appts</Text>
                      <Text style={styles.statValue}>{artistData.stats.total_appointments || 0}</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Est. Revenue</Text>
                      <Text style={styles.statValue}>P{formatCurrency(artistData.stats.total_earnings)}</Text>
                    </View>
                  </View>
                </ScrollView>
              ) : activeTab === 'schedule' ? (
                <FlatList
                  key="list-schedule"
                  data={artistData.appointments}
                  renderItem={renderScheduleItem}
                  keyExtractor={item => item.id.toString()}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={<Text style={styles.noData}>No appointments found.</Text>}
                />
              ) : activeTab === 'portfolio' ? (
                <FlatList
                  key="list-portfolio"
                  data={artistData.portfolio}
                  renderItem={renderPortfolioItem}
                  keyExtractor={(item, index) => (item.id != null ? item.id.toString() : `portfolio-${index}`)}
                  numColumns={2}
                  columnWrapperStyle={{ justifyContent: 'space-between' }}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={<Text style={styles.noData}>Portfolio is empty.</Text>}
                />
              ) : (
                <FlatList
                  key="list-earnings"
                  data={artistData.appointments.filter(a => a.status === 'completed')}
                  renderItem={renderEarningsItem}
                  keyExtractor={item => item.id.toString()}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  showsVerticalScrollIndicator={false}
                  ListHeaderComponent={() => {
                    const totalComm = artistData.appointments
                      .filter(a => a.status === 'completed')
                      .reduce((sum, a) => sum + ((a.price || 0) * (artistData.profile.commission_rate || 0.3)), 0);
                    return (
                      <View style={[styles.statBox, { marginBottom: 16, width: '100%', alignItems: 'center' }]}>
                        <Text style={styles.statLabel}>Total Commission Earned</Text>
                        <Text style={[styles.statValue, { color: colors.success }]}>P{formatCurrency(totalComm)}</Text>
                      </View>
                    );
                  }}
                  ListEmptyComponent={<Text style={styles.noData}>No completed sessions yet.</Text>}
                />
              )
            )}
          </View>

          {/* Footer */}
          {!editingPortfolioItem && (
            <View style={styles.footer}>
              <TouchableOpacity style={[styles.cancelBtn, activeTab !== 'profile' && { flex: 1 }]} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Close</Text>
              </TouchableOpacity>
              {activeTab === 'profile' && (
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}>
                  <Save size={18} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.saveBtnText}>Sync Account Updates</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const getStyles = (colors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface || '#1f1f2e', borderTopLeftRadius: borderRadius.xxl, borderTopRightRadius: borderRadius.xxl, maxHeight: '90%', minHeight: '50%', ...shadows.cardStrong },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  headerTitle: { ...typography.h3, color: colors.textPrimary },
  headerSubtitle: { ...typography.bodyXSmall, color: colors.textTertiary },
  closeBtn: { padding: 4 },

  tabContainer: { borderBottomWidth: 1, borderBottomColor: colors.border },
  tabBtn: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: colors.gold },
  tabText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: colors.gold },

  body: { flex: 1, padding: 20 },
  inputLabel: { ...typography.bodyXSmall, color: colors.textSecondary, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: colors.surfaceLight, color: colors.textPrimary, padding: 12, borderRadius: borderRadius.md, marginBottom: 16, ...typography.body, borderWidth: 1, borderColor: colors.border },
  inputDisabled: { opacity: 0.6 },

  statsRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  statBox: { flex: 1, backgroundColor: colors.surfaceLight, padding: 16, borderRadius: borderRadius.lg, alignItems: 'flex-start', borderWidth: 1, borderColor: colors.border },
  statLabel: { ...typography.bodyXSmall, color: colors.textTertiary, textTransform: 'uppercase', marginBottom: 4 },
  statValue: { ...typography.h3, color: colors.textPrimary },

  footer: { flexDirection: 'row', padding: 20, borderTopWidth: 1, borderTopColor: colors.border, gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: borderRadius.md, backgroundColor: colors.surfaceLight, alignItems: 'center' },
  cancelBtnText: { ...typography.button, color: colors.textSecondary },
  saveBtn: { flex: 2, flexDirection: 'row', paddingVertical: 14, borderRadius: borderRadius.md, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', ...shadows.button },
  saveBtnText: { ...typography.button, color: colors.backgroundDeep },

  scheduleCard: { backgroundColor: colors.surfaceLight, padding: 14, borderRadius: borderRadius.lg, marginBottom: 10, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scheduleLeft: { flex: 1 },
  scheduleDate: { ...typography.bodySmall, fontWeight: '600', color: colors.textPrimary },
  scheduleTime: { ...typography.bodyXSmall, color: colors.textSecondary, marginTop: 2 },
  scheduleClient: { ...typography.bodySmall, color: colors.textPrimary, marginTop: 6, fontWeight: '500' },
  scheduleRight: { alignItems: 'flex-end', gap: 6 },
  scheduleService: { ...typography.bodyXSmall, color: colors.textTertiary },

  portfolioItem: { width: '48%', aspectRatio: 1, marginBottom: 16, borderRadius: borderRadius.md, overflow: 'hidden', backgroundColor: colors.surfaceLight },
  portfolioImage: { width: '100%', height: '100%' },
  portfolioOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8 },
  portfolioTitle: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  portfolioCategory: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 2 },

  earningCard: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, marginBottom: 10 },
  earningLeft: { flex: 1 },
  earningDate: { ...typography.bodySmall, fontWeight: '600', color: colors.textPrimary },
  earningClient: { ...typography.bodyXSmall, color: colors.textSecondary, marginTop: 4 },
  earningRight: { alignItems: 'flex-end' },
  earningAmount: { ...typography.bodySmall, color: colors.textPrimary },
  earningCommission: { ...typography.bodySmall, color: colors.success, fontWeight: '600', marginTop: 4 },

  noData: { ...typography.body, color: colors.textTertiary, textAlign: 'center', marginTop: 40 },

  visToggle: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.surfaceLight, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 16 },
  visText: { flex: 1, marginLeft: 10, ...typography.bodySmall, color: colors.textTertiary },
  visTextActive: { color: colors.textPrimary, fontWeight: '600' },
  toggleTrack: { width: 40, height: 22, backgroundColor: colors.surfaceLight, borderRadius: 11, padding: 2 },
  toggleTrackActive: { backgroundColor: colors.gold },
  toggleThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#ffffff' },
  toggleThumbActive: { transform: [{ translateX: 18 }] },
});

