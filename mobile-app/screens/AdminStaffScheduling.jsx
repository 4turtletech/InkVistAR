/**
 * AdminStaffScheduling.jsx -- Staff Roster & Artist List
 * Themed upgrade with role badges and avatar initials.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, RefreshControl,
} from 'react-native';
import { ArrowLeft, Users } from 'lucide-react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../src/theme';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { getInitials } from '../src/utils/formatters';
import { getAdminStaff } from '../src/utils/api';

const ROLE_COLORS = {
  artist: { bg: colors.iconPurpleBg, text: colors.iconPurple },
  admin: { bg: colors.warningBg, text: colors.warning },
  manager: { bg: colors.successBg, text: colors.success },
};

export const AdminStaffScheduling = ({ navigation }) => {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchArtists = async () => {
    setLoading(true);
    const res = await getAdminStaff();
    if (res.success && res.data) setArtists(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchArtists(); }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Staff Roster</Text>
          <Text style={styles.headerSub}>{artists.length} team member{artists.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {loading ? <PremiumLoader message="Loading staff..." /> : (
        <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchArtists} tintColor={colors.primary} />}>
          {artists.length === 0 ? (
            <EmptyState icon={Users} title="No staff found" subtitle="Add artists in User Management" />
          ) : (
            artists.map(staff => {
              const rc = ROLE_COLORS[staff.user_type] || ROLE_COLORS.artist;
              return (
                <View key={staff.id} style={styles.staffCard}>
                  <View style={[styles.avatar, { backgroundColor: rc.bg }]}>
                    <Text style={[styles.avatarText, { color: rc.text }]}>{getInitials(staff.name)}</Text>
                  </View>
                  <View style={styles.staffInfo}>
                    <Text style={styles.staffName}>{staff.name}</Text>
                    <Text style={styles.staffEmail}>{staff.email}</Text>
                  </View>
                  <View style={styles.staffMeta}>
                    <View style={[styles.roleBadge, { backgroundColor: rc.bg }]}>
                      <Text style={[styles.roleText, { color: rc.text }]}>{(staff.user_type || 'artist').toUpperCase()}</Text>
                    </View>
                    {staff.title && <Text style={styles.titleText} numberOfLines={1}>{staff.title}</Text>}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  headerSub: { ...typography.bodyXSmall, color: colors.textTertiary, marginTop: 2 },
  scrollContent: { padding: 16, paddingBottom: 30 },
  staffCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
    padding: 14, borderRadius: borderRadius.xl, marginBottom: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { fontWeight: '700', fontSize: 16 },
  staffInfo: { flex: 1 },
  staffName: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  staffEmail: { ...typography.bodyXSmall, color: colors.textSecondary, marginTop: 2 },
  staffMeta: { alignItems: 'flex-end', gap: 4 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.round },
  roleText: { fontSize: 10, fontWeight: '700' },
  titleText: { ...typography.bodyXSmall, color: colors.textTertiary, maxWidth: 80 },
});
