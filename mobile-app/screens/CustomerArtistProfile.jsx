/**
 * CustomerArtistProfile.jsx -- Public Artist Profile View
 * Themed with lucide icons, portfolio grid, detail modal, and booking CTA.
 */

import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, Image, Dimensions, Modal, Pressable, Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Calendar, Tag, X, DollarSign, Star, Briefcase } from 'lucide-react-native';
import { useTheme } from '../src/context/ThemeContext';
import { AnimatedTouchable } from '../src/components/shared/AnimatedTouchable';
import { typography, borderRadius, shadows } from '../src/theme';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { getInitials, formatCurrency } from '../src/utils/formatters';
import { fetchAPI, getArtistPortfolio } from '../src/utils/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function CustomerArtistProfile({ route, onBack, onNavigate }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const modalS = getModalStyles(theme);
  const { artistId } = route.params || {};
  const [artist, setArtist] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWork, setSelectedWork] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (!loading && artist) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [loading, artist]);

  useEffect(() => { if (artistId) loadData(); }, [artistId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const r = await fetchAPI(`/artist/profile/${artistId}`);
      if (r.success) setArtist(r.profile);
      const pr = await getArtistPortfolio(artistId);
      if (pr.success) setPortfolio(pr.works?.filter(w => w.is_public !== false) || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openDetail = (w) => { setSelectedWork(w); setModalVisible(true); };
  const closeDetail = () => { setModalVisible(false); setSelectedWork(null); };
  const handleBookSimilar = () => { closeDetail(); onNavigate('booking-create', { artistId, prefillNote: `I'm interested in a design similar to "${selectedWork?.title}".` }); };

  if (loading) return <SafeAreaView style={styles.container}><PremiumLoader message="Loading artist..." /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.heroWrap}>
          {artist?.profile_image ? (
            <Image source={{ uri: artist.profile_image }} style={styles.heroImage} />
          ) : (
            <LinearGradient colors={['#0f172a', '#1e293b']} style={[styles.heroImage, { justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ fontSize: 72, fontWeight: '800', color: colors.primary }}>{getInitials(artist?.name)}</Text>
            </LinearGradient>
          )}
          <LinearGradient colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(15,13,14,0.9)']} style={styles.heroGradient} />
          <AnimatedTouchable onPress={onBack} style={styles.backBtn}><ArrowLeft size={20} color={theme.backgroundDeep} /></AnimatedTouchable>
          <View style={styles.heroInfo}>
            <Text style={styles.artistName}>{artist?.name || 'Artist'}</Text>
            <Text style={styles.artistSpec}>{artist?.specialization || 'Master Artist'}</Text>
          </View>
        </View>

        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
          {/* Stats Bento Grid */}
          <View style={styles.bentoGrid}>
            <View style={[styles.bentoItem, { backgroundColor: theme.surface }]}>
              <View style={styles.bentoIcon}><Image source={require('../../assets/icon.png')} style={{width: 20, height: 20, tintColor: theme.gold}} /></View>
              <Text style={styles.statValue}>{portfolio.length}</Text>
              <Text style={styles.statLabel}>Works</Text>
            </View>
            <View style={[styles.bentoItem, { backgroundColor: theme.surface }]}>
              <View style={styles.bentoIcon}><Star size={18} color={theme.gold} fill={theme.gold} /></View>
              <Text style={styles.statValue}>{artist?.rating || '4.9'}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={[styles.bentoItem, { backgroundColor: theme.surface }]}>
              <View style={styles.bentoIcon}><Briefcase size={18} color={theme.gold} /></View>
              <Text style={styles.statValue}>{artist?.experience || '5'}+</Text>
              <Text style={styles.statLabel}>Years Active</Text>
            </View>
          </View>

          {/* Bio */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About Artist</Text>
            <Text style={styles.bioText}>{artist?.bio || 'Professional tattoo artist specializing in creating unique, custom designs. Committed to the highest standards of hygiene and artistic excellence.'}</Text>
          </View>

          {/* Portfolio */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Portfolio</Text>
            <View style={styles.grid}>
              {portfolio.length > 0 ? portfolio.map(w => (
                <AnimatedTouchable key={w.id} style={styles.portfolioCard} onPress={() => openDetail(w)}>
                  <Image source={{ uri: w.image_url }} style={styles.portfolioImg} />
                  <View style={styles.portfolioInfo}><Text style={styles.portfolioTitle} numberOfLines={1}>{w.title || 'Untitled'}</Text></View>
                </AnimatedTouchable>
              )) : <EmptyState icon={Calendar} title="No portfolio items" subtitle="This artist hasn't published works yet" />}
            </View>
          </View>

          {/* CTA */}
          <AnimatedTouchable style={styles.ctaWrap} onPress={() => onNavigate('booking-create', { artistId })}>
            <LinearGradient colors={['#0f172a', theme.gold]} style={styles.ctaGradient}>
              <Calendar size={18} color={theme.backgroundDeep} />
              <Text style={styles.ctaText}>Book Appointment</Text>
            </LinearGradient>
          </AnimatedTouchable>
        </Animated.View>
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
                  <Text style={modalS.title}>{selectedWork.title || 'Portfolio Work'}</Text>
                  {selectedWork.category && (
                    <View style={modalS.catBadge}><Tag size={12} color={theme.textSecondary} /><Text style={modalS.catText}>{selectedWork.category}</Text></View>
                  )}
                  {selectedWork.description && <Text style={modalS.desc}>{selectedWork.description}</Text>}
                  {selectedWork.price_estimate && (
                    <View style={modalS.priceRow}>
                      <DollarSign size={16} color={theme.gold} />
                      <Text style={modalS.priceText}>Estimated: ₱{formatCurrency(selectedWork.price_estimate)}</Text>
                    </View>
                  )}
                  <AnimatedTouchable style={modalS.bookBtn} onPress={handleBookSimilar}>
                    <LinearGradient colors={['#0f172a', theme.gold]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={modalS.bookGradient}>
                      <Calendar size={18} color={theme.backgroundDeep} />
                      <Text style={modalS.bookText}>Book Similar Tattoo</Text>
                    </LinearGradient>
                  </AnimatedTouchable>
                </View>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  heroWrap: { height: 320, width: '100%', position: 'relative' },
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  backBtn: { position: 'absolute', top: 56, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', zIndex: 10, ...shadows.subtle },
  heroInfo: { position: 'absolute', bottom: 24, left: 24 },
  artistName: { fontSize: 30, fontWeight: '800', color: theme.backgroundDeep, marginBottom: 4 },
  artistSpec: { ...typography.bodySmall, color: theme.gold, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  content: { padding: 20, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -28, backgroundColor: theme.background },
  bentoGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 28 },
  bentoItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: theme.border, ...shadows.subtle },
  bentoIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.surfaceLight, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { ...typography.h3, color: theme.textPrimary, fontWeight: '800', marginBottom: 2 },
  statLabel: { ...typography.bodyXSmall, color: theme.textSecondary, fontWeight: '600' },
  section: { marginBottom: 28 },
  sectionTitle: { ...typography.h4, color: theme.textPrimary, marginBottom: 14 },
  bioText: { ...typography.body, color: theme.textSecondary, lineHeight: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  portfolioCard: { width: '48%', backgroundColor: theme.surface, borderRadius: borderRadius.xl, overflow: 'hidden', marginBottom: 10, borderWidth: 1, borderColor: theme.border, ...shadows.subtle },
  portfolioImg: { width: '100%', height: 140, resizeMode: 'cover' },
  portfolioInfo: { padding: 10 },
  portfolioTitle: { ...typography.bodySmall, fontWeight: '700', color: theme.textPrimary },
  ctaWrap: { marginBottom: 40 },
  ctaGradient: { flexDirection: 'row', height: 54, borderRadius: borderRadius.xl, justifyContent: 'center', alignItems: 'center', gap: 10, ...shadows.button },
  ctaText: { ...typography.button, color: theme.backgroundDeep, fontSize: 16, fontWeight: '700' },
});

const getModalStyles = (theme) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%' },
  handle: { alignItems: 'center', paddingVertical: 12 },
  handleBar: { width: 40, height: 5, borderRadius: 3, backgroundColor: theme.border },
  closeBtn: { position: 'absolute', top: 18, right: 18, zIndex: 10, backgroundColor: theme.surfaceLight, borderRadius: 20, padding: 4 },
  image: { width: '100%', height: 320 },
  body: { padding: 22 },
  title: { ...typography.h2, color: theme.textPrimary, marginBottom: 12 },
  catBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surfaceLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.sm, alignSelf: 'flex-start', gap: 6, marginBottom: 16 },
  catText: { ...typography.bodySmall, color: theme.textSecondary, fontWeight: '600' },
  desc: { ...typography.body, color: theme.textSecondary, lineHeight: 24, marginBottom: 20 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, backgroundColor: theme.surfaceLight, borderRadius: borderRadius.lg, marginBottom: 20, borderWidth: 1, borderColor: theme.border },
  priceText: { ...typography.body, fontWeight: '700', color: theme.gold },
  bookBtn: { borderRadius: borderRadius.xl, overflow: 'hidden', marginTop: 4 },
  bookGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  bookText: { ...typography.button, color: theme.backgroundDeep, fontSize: 16, fontWeight: '700' },
});
