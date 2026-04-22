/**
 * EmptyState -- Reusable "no data" placeholder with icon and message.
 * Matches web's `.empty-state-simple` pattern.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Inbox } from 'lucide-react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';

export const EmptyState = ({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  subtitle,
  actionLabel,
  onAction,
  iconSize = 48,
  iconColor = colors.textTertiary,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <Icon size={iconSize} color={iconColor} strokeWidth={1.5} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.actionBtn} onPress={onAction} activeOpacity={0.8}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: spacing.xl,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.lightBgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h4,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },
  actionBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
  },
  actionText: {
    ...typography.button,
    color: '#ffffff',
  },
});
