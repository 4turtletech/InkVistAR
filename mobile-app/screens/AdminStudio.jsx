/**
 * AdminStudio.jsx -- Studio Command Center (hub for admin sub-screens)
 * Grid navigation to all operational modules.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import {
  Package, ShoppingCart,
  MessageSquare, BarChart3, Settings, Star,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/context/ThemeContext';
import { typography, spacing, borderRadius, shadows } from '../src/theme';
import { AnimatedTouchable } from '../src/components/shared/AnimatedTouchable';
import { StaggerItem } from '../src/components/shared/StaggerItem';

const getModules = (theme) => [
  { id: 'admin-inventory', title: 'Inventory', Icon: Package, color: theme.iconBlue || '#3b82f6', desc: 'Session supplies' },
  { id: 'admin-pos', title: 'Point of Sale', Icon: ShoppingCart, color: theme.gold || '#be9055', desc: 'Manual billing' },
  { id: 'admin-chat', title: 'Live Chat', Icon: MessageSquare, color: theme.primary || '#3b82f6', desc: 'Customer support' },
  { id: 'admin-analytics', title: 'Analytics', Icon: BarChart3, color: theme.iconPurple || '#a855f7', desc: 'Studio performance' },
  { id: 'admin-reviews', title: 'Reviews', Icon: Star, color: theme.gold || '#be9055', desc: 'Review moderation' },
  { id: 'admin-settings', title: 'Settings', Icon: Settings, color: theme.textSecondary || '#64748b', desc: 'System config' },
];

export function AdminStudio({ navigation }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(theme, insets);
  const modules = getModules(theme);
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Studio Command Center</Text>
        <Text style={styles.headerSub}>Manage all operational modules</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {modules.map((mod, index) => (
            <StaggerItem key={mod.id} index={index} style={styles.cardWrapper}>
              <AnimatedTouchable
                style={styles.card}
                onPress={() => navigation?.navigate?.(mod.id)}
                activeOpacity={0.9}
              >
                <View style={[styles.iconBox, { backgroundColor: `${mod.color}15` }]}>
                  <mod.Icon size={24} color={mod.color} />
                </View>
                <Text style={styles.cardTitle}>{mod.title}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{mod.desc}</Text>
              </AnimatedTouchable>
            </StaggerItem>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme, insets) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20,
    backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  headerTitle: { ...typography.h2, color: theme.textPrimary },
  headerSub: { ...typography.bodySmall, color: theme.textSecondary, marginTop: 4 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16 },
  cardWrapper: {
    width: '48%',
  },
  card: {
    backgroundColor: theme.surface, borderRadius: borderRadius.xl,
    padding: 16, borderWidth: 1, borderColor: theme.borderLight,
    ...shadows.subtle,
  },
  iconBox: {
    width: 46, height: 46, borderRadius: borderRadius.lg,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  cardTitle: { ...typography.body, fontWeight: '700', color: theme.textPrimary, marginBottom: 4 },
  cardDesc: { ...typography.bodyXSmall, color: theme.textTertiary, lineHeight: 16 },
});
