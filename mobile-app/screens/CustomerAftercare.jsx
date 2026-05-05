/**
 * CustomerAftercare.jsx -- Healing Journey Tracker (Mobile)
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Dimensions
} from 'react-native';
import { ArrowLeft, AlertTriangle, Droplets, Heart, Clock, Shield, Sun, CheckCircle, Sparkles } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../src/context/ThemeContext';
import { typography, borderRadius, shadows } from '../src/theme';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { fetchAPI } from '../src/utils/api';

const PHASE_CONFIG = {
  initial: { label: 'Initial Healing', color: '#ff0000', icon: AlertTriangle },
  peeling: { label: 'Peeling & Itching', color: '#f59e0b', icon: Droplets },
  healing: { label: 'Final Healing', color: '#10b981', icon: Heart }
};

export const CustomerAftercare = ({ route }) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(false);
  const [aftercare, setAftercare] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [userId, setUserId] = useState(route.params?.userId);

  useEffect(() => {
    const loadUser = async () => {
      if (!userId) {
        const uStr = await AsyncStorage.getItem('user_session');
        if (uStr) setUserId(JSON.parse(uStr).id);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (userId) fetchAftercare();
  }, [userId]);

  const fetchAftercare = async () => {
    try {
      setLoading(true);
      const res = await fetchAPI(`/customer/aftercare/${userId}`);
      if (res.success) {
        setActive(res.active);
        setAftercare(res.aftercare);
        setTemplates(res.templates || []);
      }
    } catch (error) {
      console.error('Error fetching aftercare:', error);
    } finally {
      setLoading(false);
    }
  };

  const rules = [
    { icon: Droplets, text: 'Wash hands before touching your tattoo' },
    { icon: Sun, text: 'Avoid direct sunlight — use SPF 30+ once healed' },
    { icon: AlertTriangle, text: 'No swimming, baths, or hot tubs for 3-4 weeks' },
    { icon: Heart, text: 'Wear loose, breathable clothing' },
    { icon: Shield, text: 'Never scratch, pick, or peel flaking skin' },
    { icon: Clock, text: 'Use fragrance-free soap and lotion only' }
  ];

  const phaseGroups = [
    { phase: 'initial', label: 'Phase 1: Initial Healing', days: 'Days 1-3', desc: 'Red, swollen, tender skin. Focus on cleaning' },
    { phase: 'peeling', label: 'Phase 2: Peeling & Itching', days: 'Days 4-14', desc: 'Flaking and itching. Do NOT pick' },
    { phase: 'healing', label: 'Phase 3: Final Healing', days: 'Days 15-30', desc: 'Skin regeneration and settling' }
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <PremiumLoader message="Loading aftercare data..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', marginRight: 36 }}>
            <Text style={styles.headerTitle}>Healing Tracker</Text>
            <Text style={styles.headerSubtitle}>Your personalized journey</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {!active || !aftercare ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <Heart size={36} color={theme.gold} />
            </View>
            <Text style={styles.emptyTitle}>No Active Aftercare</Text>
            <Text style={styles.emptyDesc}>
              You don't have a recently completed tattoo session. Your personalized aftercare guide will appear here once a tattoo session is marked as complete.
            </Text>
            <TouchableOpacity style={styles.bookBtn} onPress={() => navigation.navigate('booking-create')}>
              <Text style={styles.bookBtnText}>Book a Session</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Hero Widget */}
            <View style={[styles.heroCard, { borderColor: PHASE_CONFIG[aftercare.phase]?.color + '40', backgroundColor: PHASE_CONFIG[aftercare.phase]?.color + '15' }]}>
              <View style={styles.heroTop}>
                <View style={styles.progressCircle}>
                   <Text style={[styles.progressNumber, { color: PHASE_CONFIG[aftercare.phase]?.color }]}>{aftercare.currentDay}</Text>
                   <Text style={styles.progressLabel}>of {aftercare.totalDays}</Text>
                </View>
                <View style={styles.heroInfo}>
                  <View style={[styles.phaseBadge, { backgroundColor: PHASE_CONFIG[aftercare.phase]?.color + '25' }]}>
                    {React.createElement(PHASE_CONFIG[aftercare.phase]?.icon || Heart, { size: 12, color: PHASE_CONFIG[aftercare.phase]?.color })}
                    <Text style={[styles.phaseBadgeText, { color: PHASE_CONFIG[aftercare.phase]?.color }]}>
                      {PHASE_CONFIG[aftercare.phase]?.label}
                    </Text>
                  </View>
                  <Text style={styles.designTitle} numberOfLines={2}>{aftercare.designTitle}</Text>
                  <Text style={styles.artistName}>Artist: {aftercare.artistName}</Text>
                </View>
              </View>

              <View style={styles.tipBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                   <Sparkles size={14} color={theme.textPrimary} />
                   <Text style={styles.tipTitle}>Today's Focus</Text>
                </View>
                <Text style={styles.tipText}>
                  {templates.find(t => t.day_number === aftercare.currentDay)?.message || 'Continue your daily aftercare routine.'}
                </Text>
              </View>
            </View>

            {/* General Rules */}
            <View style={styles.section}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Shield size={20} color={theme.gold} />
                <Text style={styles.sectionTitle}>General Aftercare Rules</Text>
              </View>
              <View style={styles.rulesGrid}>
                {rules.map((r, i) => (
                  <View key={i} style={styles.ruleCard}>
                    <View style={styles.ruleIconWrap}>
                      <r.icon size={20} color={theme.gold} />
                    </View>
                    <Text style={styles.ruleText}>{r.text}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* 30-Day Timeline */}
            <View style={styles.section}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Clock size={20} color={theme.gold} />
                <Text style={styles.sectionTitle}>30-Day Timeline</Text>
              </View>

              {phaseGroups.map((pg) => {
                const config = PHASE_CONFIG[pg.phase];
                const phaseDays = templates.filter(t => t.phase === pg.phase);

                return (
                  <View key={pg.phase} style={styles.phaseGroup}>
                    <View style={[styles.phaseHeader, { backgroundColor: config.color, borderColor: config.color }]}>
                      <config.icon size={18} color="#fff" />
                      <View style={{ marginLeft: 8 }}>
                        <Text style={styles.phaseHeaderText}>{pg.label}</Text>
                        <Text style={styles.phaseHeaderSub}>{pg.days} — {pg.desc}</Text>
                      </View>
                    </View>

                    <View style={[styles.timelineTrack, { borderLeftColor: config.color + '30' }]}>
                      {phaseDays.map(tpl => {
                        const isCurrent = tpl.day_number === aftercare.currentDay;
                        const isPast = tpl.day_number < aftercare.currentDay;
                        const isFuture = tpl.day_number > aftercare.currentDay;

                        return (
                          <View key={tpl.day_number} style={[styles.dayCard, isCurrent && { borderColor: theme.gold, backgroundColor: theme.surfaceLight }, isFuture && { opacity: 0.6 }]}>
                            <View style={[styles.dayIndicator, isPast ? { backgroundColor: '#10b981' } : isCurrent ? { backgroundColor: theme.gold } : { backgroundColor: theme.border }]}>
                              {isPast ? <CheckCircle size={16} color="#fff" /> : <Text style={styles.dayIndicatorText}>{tpl.day_number}</Text>}
                            </View>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <Text style={[styles.dayTitle, isCurrent && { color: theme.gold }]}>{tpl.title.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2700}-\u{27BF}]/gu, '').trim()}</Text>
                                {isCurrent && <View style={styles.todayBadge}><Text style={styles.todayBadgeText}>TODAY</Text></View>}
                              </View>
                              <Text style={styles.dayMessage}>{tpl.message}</Text>
                              {tpl.tips && <Text style={styles.dayTip}>Tip: {tpl.tips}</Text>}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>

          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, paddingTop: 16, backgroundColor: theme.surface,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.surfaceLight, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...typography.h3, color: theme.textPrimary },
  headerSubtitle: { ...typography.bodyXSmall, color: theme.textSecondary },
  content: { padding: 16, paddingBottom: 40 },
  
  // Empty
  emptyWrap: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: `${theme.gold}15`, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { ...typography.h2, color: theme.textPrimary, marginBottom: 10 },
  emptyDesc: { ...typography.body, color: theme.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  bookBtn: { backgroundColor: theme.gold, paddingHorizontal: 24, paddingVertical: 12, borderRadius: borderRadius.md },
  bookBtnText: { ...typography.button, color: theme.backgroundDeep },

  // Hero
  heroCard: { borderRadius: borderRadius.xl, padding: 20, marginBottom: 24, borderWidth: 1 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  progressCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: theme.border },
  progressNumber: { ...typography.h1, lineHeight: 32 },
  progressLabel: { ...typography.labelSmall, color: theme.textSecondary },
  heroInfo: { flex: 1 },
  phaseBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
  phaseBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  designTitle: { ...typography.h3, color: theme.textPrimary, marginBottom: 4 },
  artistName: { ...typography.bodySmall, color: theme.textSecondary },
  tipBox: { backgroundColor: theme.surface, padding: 12, borderRadius: borderRadius.md, borderWidth: 1, borderColor: theme.border },
  tipTitle: { ...typography.bodySmall, fontWeight: '700', color: theme.textPrimary },
  tipText: { ...typography.bodyXSmall, color: theme.textSecondary, lineHeight: 18 },

  // Rules
  section: { backgroundColor: theme.surface, borderRadius: borderRadius.xl, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: theme.border },
  sectionTitle: { ...typography.h3, color: theme.textPrimary },
  rulesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  ruleCard: { width: '48%', backgroundColor: theme.surfaceLight, borderRadius: borderRadius.lg, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  ruleIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: `${theme.gold}15`, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  ruleText: { ...typography.bodyXSmall, color: theme.textSecondary, textAlign: 'center', fontWeight: '600' },

  // Timeline
  phaseGroup: { marginBottom: 20 },
  phaseHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: borderRadius.md, borderWidth: 1, marginBottom: 12 },
  phaseHeaderText: { ...typography.bodySmall, fontWeight: '700', color: '#fff' },
  phaseHeaderSub: { fontSize: 10, color: 'rgba(255,255,255,0.8)' },
  timelineTrack: { marginLeft: 16, borderLeftWidth: 2, paddingLeft: 16, paddingBottom: 8 },
  dayCard: { flexDirection: 'row', gap: 12, padding: 12, backgroundColor: theme.surfaceLight, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: theme.border, marginBottom: 12 },
  dayIndicator: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  dayIndicatorText: { fontSize: 12, fontWeight: '700', color: theme.textPrimary },
  dayTitle: { ...typography.bodySmall, fontWeight: '700', color: theme.textPrimary },
  todayBadge: { backgroundColor: theme.gold, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  todayBadgeText: { fontSize: 8, fontWeight: '800', color: theme.backgroundDeep },
  dayMessage: { ...typography.bodyXSmall, color: theme.textSecondary, marginBottom: 4, lineHeight: 18 },
  dayTip: { fontSize: 11, color: theme.textTertiary, fontStyle: 'italic' },
});
