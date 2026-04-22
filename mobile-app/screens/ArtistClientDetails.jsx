/**
 * ArtistClientDetails.jsx -- Client Profile Card for Artists
 * Themed with lucide icons, session details, contact info, notes, and new appointment CTA.
 */

import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, Alert, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Phone, Mail, MessageSquare, Tag, Clock, FileText,
  MapPin, Calendar, Pencil,
} from 'lucide-react-native';
import { colors, typography, borderRadius, shadows } from '../src/theme';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { getInitials, formatCurrency } from '../src/utils/formatters';
import { fetchAPI } from '../src/utils/api';

export function ArtistClientDetails({ route, onBack }) {
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
    ph ? Linking.openURL(`tel:${ph}`) : Alert.alert('Not Available', 'No phone number provided.');
  };
  const handleEmail = () => Linking.openURL(`mailto:${displayEmail}`);

  const InfoRow = ({ icon: Icon, label, value, last }) => (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <View style={styles.infoIconWrap}><Icon size={18} color={colors.primary} /></View>
      <View><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value || 'Not provided'}</Text></View>
    </View>
  );

  if (loading) return <SafeAreaView style={styles.container}><PremiumLoader message="Loading client..." /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <ArrowLeft size={20} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.profileHeader}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
              </View>
              <View style={styles.statusDot} />
            </View>
            <Text style={styles.clientName}>{displayName}</Text>
            <Text style={styles.clientEmail}>{displayEmail}</Text>
            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.actionCircle} onPress={handleCall}>
                <Phone size={18} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionCircle} onPress={handleEmail}>
                <Mail size={18} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionCircle}>
                <MessageSquare size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

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
              <TouchableOpacity style={styles.editNotesBtn}>
                <Pencil size={14} color={colors.primary} />
                <Text style={styles.editNotesText}>Edit Notes</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* CTA */}
          <TouchableOpacity style={styles.ctaBtn} onPress={() => Alert.alert('Action', 'Initialize new appointment for this client.')} activeOpacity={0.8}>
            <LinearGradient colors={['#0f172a', colors.primary]} style={styles.ctaGradient}>
              <Calendar size={18} color="#ffffff" />
              <Text style={styles.ctaText}>Create New Appointment</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 24, paddingTop: 56, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, alignItems: 'center' },
  backBtn: { position: 'absolute', top: 56, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  profileHeader: { alignItems: 'center', marginTop: 16 },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  avatarText: { fontSize: 34, fontWeight: '800', color: colors.primary },
  statusDot: { position: 'absolute', bottom: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.success, borderWidth: 3, borderColor: '#0f172a' },
  clientName: { ...typography.h2, color: '#ffffff', marginBottom: 4 },
  clientEmail: { ...typography.bodySmall, color: 'rgba(255,255,255,0.7)', marginBottom: 16 },
  quickActions: { flexDirection: 'row', gap: 14 },
  actionCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  content: { padding: 20, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', gap: 14, marginBottom: 24, marginTop: -32 },
  statCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: borderRadius.xxl, padding: 18, alignItems: 'center', ...shadows.card },
  statNumber: { ...typography.h3, color: colors.textPrimary, fontWeight: '800', marginBottom: 4 },
  statLabel: { ...typography.bodyXSmall, color: colors.textSecondary, fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: 12 },
  infoCard: { backgroundColor: '#ffffff', borderRadius: borderRadius.xxl, padding: 16, borderWidth: 1, borderColor: colors.border },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  infoIconWrap: { width: 36, height: 36, borderRadius: borderRadius.md, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  infoLabel: { ...typography.bodyXSmall, color: colors.textTertiary, marginBottom: 2 },
  infoValue: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  notesCard: { backgroundColor: '#ffffff', borderRadius: borderRadius.xxl, padding: 18, borderWidth: 1, borderColor: colors.border },
  notesText: { ...typography.body, lineHeight: 22, color: colors.textSecondary, fontStyle: 'italic', marginBottom: 12 },
  editNotesBtn: { flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', gap: 4 },
  editNotesText: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' },
  ctaBtn: { marginTop: 8 },
  ctaGradient: { flexDirection: 'row', height: 54, borderRadius: borderRadius.xl, justifyContent: 'center', alignItems: 'center', gap: 10, ...shadows.button },
  ctaText: { ...typography.button, color: '#ffffff', fontSize: 16 },
});
