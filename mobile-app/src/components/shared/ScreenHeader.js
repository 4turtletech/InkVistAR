/**
 * ScreenHeader -- Reusable screen header with title, subtitle, and action area.
 * Replaces the web's `.portal-header` pattern for mobile.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { colors, spacing, typography, layout } from '../../theme';

export const ScreenHeader = ({
  title,
  subtitle,
  onBack,
  rightContent,
  dark = false,
}) => {
  return (
    <View style={[styles.container, dark && styles.containerDark]}>
      <View style={styles.row}>
        {onBack ? (
          <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ArrowLeft size={22} color={dark ? colors.textWhite : colors.textPrimary} />
          </TouchableOpacity>
        ) : null}
        <View style={styles.titleArea}>
          <Text style={[styles.title, dark && styles.titleDark]} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, dark && styles.subtitleDark]}>{subtitle}</Text> : null}
        </View>
        {rightContent ? <View style={styles.rightArea}>{rightContent}</View> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: layout.screenPaddingTop,
    paddingBottom: spacing.md,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  containerDark: {
    backgroundColor: colors.darkBgSecondary,
    borderBottomColor: colors.borderDark,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    marginRight: spacing.md,
    padding: 4,
  },
  titleArea: {
    flex: 1,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  titleDark: {
    color: colors.textWhite,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  subtitleDark: {
    color: colors.textTertiary,
  },
  rightArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
