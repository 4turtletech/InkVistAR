/**
 * ArtistClientDetails.jsx -- Client Profile Card (Gilded Noir v2)
 * Theme-aware, animated, gold accents, contact actions.
 */
import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, Linking,
} from 'react-native';
import {
  ArrowLeft, Phone, Mail, MessageSquare, Tag, Clock, FileText,
  MapPin, Calendar, Pencil,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { typography } from '../src/theme';
import { useTheme } from '../src/context/ThemeContext';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { AnimatedTouchable } from '../src/components/shared/AnimatedTouchable';
import { getInitials, formatCurrency } from '../src/utils/formatters';
import { fetchAPI } from '../src/utils/api';

export function ArtistClientDetails({ route, onBack }) {
  const { theme: colors, hapticsEnabled } = useTheme();
  const styles = getStyles(colors);
  const { client, session } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState(null);

  const targetId = client?.id || session?.customer_id;
  const displayName = client?.name || session?.client_name || 'Client Name';
  const displayEmail = client?.email || session?.client_email || 'email@example.com';

  useEffect(() => { if (targetId) fetchDetails(targetId); }, [targetId]);

  const fetchDetails = async (id) => {
    try {
      setLoading(true);
      const r = await fetchAPI(`/customer/profile/${id}`);
      if (r.success) setDetails(r.profile);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleCall = () => {
    const ph = details?.phone || client?.phone;
    if (ph) Linking.openURL(`tel:${ph}`);
  };
  const handleEmail = () => Linking.openURL(`mailto:${displayEmail}`);

  const InfoRow = ({ icon: Icon, label, value, last }) => (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <View style={styles.infoIconWrap}><Icon size={18} color={colors.gold} /></View>
      <View><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value || 'Not provided'}</Text></View>
    </View>
  );

  if (loading) return <SafeAreaView style={styles.container}><PremiumLoader message="Loading client..." /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <AnimatedTouchable onPress={onBack} style={styles.backBtn}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </AnimatedTouchable>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
            </View>
            <View style={styles.statusDot} />
          </View>
          <Text style={styles.clientName}>{displayName}</Text>
          <Text style={styles.clientEmail}>{displayEmail}</Text>
          <View style={styles.quickActions}>
            <AnimatedTouchable style={styles.actionCircle} onPress={handleCall}>
              <Phone size={18} color={colors.gold} />
            </AnimatedTouchable>
            <AnimatedTouchable style={styles.actionCircle} onPress={handleEmail}>
              <Mail size={18} color={colors.gold} />
            </AnimatedTouchable>
            <AnimatedTouchable style={styles.actionCircle}>
              <MessageSquare size={18} color={colors.gold} />
            </AnimatedTouchable>
          </View>
        </View>

        <View style={styles.content}>
          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{details?.appointment_count || client?.appointment_count || 0}</Text>
              <Text style={styles.statLabel}>Total Sessions</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>P{formatCurrency(details?.total_spent || client?.total_spent || 0)}</Text>
              <Text style={styles.statLabel}>Total Paid</Text>
            </View>
          </View>

          {/* Session Details */}
          {session && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Session Details</Text>
              <View style={styles.infoCard}>
                <InfoRow icon={Tag} label="Session Price" value={`P${formatCurrency(session.price)}`} />
                <InfoRow icon={Clock} label="Time" value={`${session.start_time} - ${session.appointment_date}`} />
                <InfoRow icon={FileText} label="Design" value={session.design_title} last />
              </View>
            </View>
          )}

          {/* Contact */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <View style={styles.infoCard}>
              <InfoRow icon={Phone} label="Phone Number" value={details?.phone || client?.phone} />
              <InfoRow icon={MapPin} label="Location" value={details?.location} />
              <InfoRow icon={Calendar} label="Member Since" value={client?.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A'} last />
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Client Notes</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>
                {details?.notes || 'No specific notes recorded for this client yet. Notes help in providing personalized service during tattoo sessions.'}
              </Text>
              <AnimatedTouchable style={styles.editNotesBtn}>
                <Pencil size={14} color={colors.gold} />
                <Text style={styles.editNotesText}>Edit Notes</Text>
              </AnimatedTouchable>
            </View>
          </View>

          {/* CTA */}
          <AnimatedTouchable style={styles.ctaBtn}>
            <Calendar size={18} color={colors.backgroundDeep} />
            <Text style={styles.ctaText}>Create New Appointment</Text>
          </AnimatedTouchable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: 52, paddingHorizontal: 20 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  profileCard: { alignItems: 'center', paddingVertical: 24 },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatar: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: colors.gold,
  },
  avatarText: { fontSize: 34, fontWeight: '800', color: colors.gold },
  statusDot: {
    position: 'absolute', bottom: 4, right: 4, width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.success, borderWidth: 3, borderColor: colors.background,
  },
  clientName: { ...typography.h2, color: colors.textPrimary, marginBottom: 4 },
  clientEmail: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: 16 },
  quickActions: { flexDirection: 'row', gap: 14 },
  actionCircle: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.borderGold,
  },
  content: { padding: 20, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', gap: 14, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 18,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  statNumber: { ...typography.h3, color: colors.gold, fontWeight: '800', marginBottom: 4 },
  statLabel: { ...typography.bodyXSmall, color: colors.textSecondary, fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: 12 },
  infoCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  infoIconWrap: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: colors.iconGoldBg,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  infoLabel: { ...typography.bodyXSmall, color: colors.textTertiary, marginBottom: 2 },
  infoValue: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  notesCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: colors.border,
  },
  notesText: { ...typography.body, lineHeight: 22, color: colors.textSecondary, fontStyle: 'italic', marginBottom: 12 },
  editNotesBtn: { flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', gap: 4 },
  editNotesText: { ...typography.bodySmall, color: colors.gold, fontWeight: '600' },
  ctaBtn: {
    flexDirection: 'row', height: 54, borderRadius: 12, backgroundColor: colors.gold,
    justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 8,
  },
  ctaText: { ...typography.button, color: colors.backgroundDeep, fontSize: 16 },
});
