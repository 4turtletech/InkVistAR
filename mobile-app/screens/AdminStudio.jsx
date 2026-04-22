/**
 * AdminStudio.jsx -- Studio Command Center (hub for admin sub-screens)
 * Grid navigation to all operational modules.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import {
  Scissors, Users, Package, CheckSquare, ShoppingCart,
  MessageSquare, BarChart3, Settings, Star,
} from 'lucide-react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../src/theme';

const modules = [
  { id: 'admin-services', title: 'Services', Icon: Scissors, color: '#ec4899', desc: 'Tattoo types & pricing' },
  { id: 'admin-staff', title: 'Staff', Icon: Users, color: '#10b981', desc: 'Artist scheduling & roles' },
  { id: 'admin-inventory', title: 'Inventory', Icon: Package, color: '#3b82f6', desc: 'Session supplies tracking' },
  { id: 'admin-tasks', title: 'Tasks', Icon: CheckSquare, color: '#f59e0b', desc: 'Studio maintenance' },
  { id: 'admin-pos', title: 'Point of Sale', Icon: ShoppingCart, color: '#14b8a6', desc: 'Manual billing entry' },
  { id: 'admin-chat', title: 'Live Chat', Icon: MessageSquare, color: '#6366f1', desc: 'Customer support' },
  { id: 'admin-analytics', title: 'Analytics', Icon: BarChart3, color: '#8b5cf6', desc: 'Studio performance' },
  { id: 'admin-reviews', title: 'Reviews', Icon: Star, color: '#f97316', desc: 'Review moderation' },
  { id: 'admin-settings', title: 'Settings', Icon: Settings, color: '#64748b', desc: 'System configuration' },
];

export function AdminStudio({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Studio Command Center</Text>
        <Text style={styles.headerSub}>Manage all operational modules</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {modules.map((mod) => (
            <TouchableOpacity
              key={mod.id}
              style={styles.card}
              onPress={() => navigation?.navigate?.(mod.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: `${mod.color}18` }]}>
                <mod.Icon size={26} color={mod.color} />
              </View>
              <Text style={styles.cardTitle}>{mod.title}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>{mod.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  headerSub: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 4 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: {
    width: '48%', backgroundColor: '#ffffff', borderRadius: borderRadius.xl,
    padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border,
    ...shadows.subtle,
  },
  iconBox: {
    width: 48, height: 48, borderRadius: borderRadius.lg,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  cardTitle: { ...typography.body, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  cardDesc: { ...typography.bodyXSmall, color: colors.textTertiary, lineHeight: 16 },
});
