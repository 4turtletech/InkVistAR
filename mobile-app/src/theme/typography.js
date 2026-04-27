/**
 * InkVistAR Mobile -- Typography System (Gilded Noir v2)
 * Primary: Inter (sans-serif, modern weights)
 * Display: Platform serif fallback for brand wordmark only
 */

import { Platform } from 'react-native';

// Inter is loaded via expo-google-fonts or falls back to system sans-serif
const fontFamily = Platform.select({
  ios: 'Inter',
  android: 'Inter',
  default: 'System',
});

// Used only for the INKVICTUS brand wordmark
const fontFamilyDisplay = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

export const typography = {
  fontFamily,
  fontFamilyDisplay,

  // Heading sizes -- Inter bold weights
  h1: {
    fontFamily,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  h3: {
    fontFamily,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  h4: {
    fontFamily,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },

  // Body text -- Inter regular/medium
  body: {
    fontFamily,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  bodyMedium: {
    fontFamily,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },
  bodySmall: {
    fontFamily,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  bodyXSmall: {
    fontFamily,
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 16,
  },

  // Labels -- Inter semibold
  label: {
    fontFamily,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  labelSmall: {
    fontFamily,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Special
  stat: {
    fontFamily,
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
  },
  statSmall: {
    fontFamily,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  button: {
    fontFamily,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  caption: {
    fontFamily,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  tabLabel: {
    fontFamily,
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 14,
  },

  // Brand display -- serif for INKVICTUS wordmark only
  display: {
    fontFamily: fontFamilyDisplay,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 6,
  },
  displaySmall: {
    fontFamily: fontFamilyDisplay,
    fontSize: 26,
    fontWeight: '600',
    letterSpacing: 5,
  },
};
