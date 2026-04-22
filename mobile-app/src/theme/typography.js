/**
 * InkVistAR Mobile -- Typography System
 * Consistent font sizing and weights across all portals.
 */

import { Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
});

export const typography = {
  fontFamily,

  // Heading sizes
  h1: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  h4: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },

  // Body text
  body: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  bodyXSmall: {
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 16,
  },

  // Labels
  label: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  labelSmall: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Special
  stat: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
  },
  statSmall: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  button: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 14,
  },
};
