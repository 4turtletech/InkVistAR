/**
 * GlassCard -- Premium frosted-glass card component.
 * Replaces the web's `.glass-card` CSS class.
 * Works in Expo Go without native dependencies.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, shadows, spacing } from '../../theme';

export const GlassCard = ({
  children,
  style,
  variant = 'light', // 'light' | 'dark' | 'elevated'
  onLayout,
}) => {
  const baseStyle = variant === 'dark' ? styles.darkCard : variant === 'elevated' ? styles.elevatedCard : styles.lightCard;

  return (
    <View style={[styles.container, baseStyle, style]} onLayout={onLayout}>
      <LinearGradient
        colors={
          variant === 'dark'
            ? ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.01)']
            : variant === 'elevated'
            ? ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']
            : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  lightCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadows.card,
  },
  darkCard: {
    backgroundColor: colors.darkBg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    ...shadows.cardStrong,
  },
  elevatedCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
});
