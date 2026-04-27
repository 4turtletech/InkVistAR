/**
 * InkVistAR Mobile -- Color Palette (Gilded Noir v2 & Gilded Pearl)
 * Brand Gold: #be9055 (warm bronze)
 * Automatically adapts to System Light/Dark mode on app load.
 */

import { Appearance } from 'react-native';

const sharedColors = {
  // Brand -- Warm Bronze Gold (Identical in both modes to maintain brand identity)
  primary: '#be9055',
  primaryDark: '#a67c3d',
  primaryGold: '#be9055',
  gold: '#be9055',
  goldLight: '#d4a870',
  goldMuted: '#8a7055',

  // Status badges
  statusConfirmed: '#10b981',
  statusPending: '#f59e0b',
  statusCancelled: '#ef4444',
  statusCompleted: '#8b5cf6',
  statusInProgress: '#3b82f6',
  statusPaid: '#10b981',
  statusUnpaid: '#ef4444',

  // Semantic
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Icons
  iconBlue: '#3b82f6',
  iconGold: '#be9055',
  iconPurple: '#8b5cf6',
  iconRose: '#f43f5e',
  iconGreen: '#10b981',
};

export const darkColors = {
  ...sharedColors,

  // Backgrounds -- Deep Noir
  background: '#171516',
  backgroundDeep: '#0f0d0e',
  surface: '#262022',
  surfaceLight: '#302a2c',
  surfaceElevated: '#1f1b1d',
  darkBg: '#171516',
  darkBgSecondary: '#1f1b1d',
  darkBgTertiary: '#262022',
  lightBg: '#f8fafc',
  lightBgSecondary: '#f1f5f9',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#a0978e',
  textTertiary: '#6b6560',
  textWhite: '#ffffff',
  textDark: '#1e293b',

  // Tints & Backgrounds
  primaryLight: 'rgba(190, 144, 85, 0.15)',
  statusConfirmedBg: 'rgba(16, 185, 129, 0.15)',
  statusPendingBg: 'rgba(245, 158, 11, 0.15)',
  statusCancelledBg: 'rgba(239, 68, 68, 0.15)',
  statusCompletedBg: 'rgba(139, 92, 246, 0.15)',
  statusInProgressBg: 'rgba(59, 130, 246, 0.15)',
  statusPaidBg: 'rgba(16, 185, 129, 0.15)',
  statusUnpaidBg: 'rgba(239, 68, 68, 0.15)',
  successBg: 'rgba(16, 185, 129, 0.15)',
  warningBg: 'rgba(245, 158, 11, 0.15)',
  errorBg: 'rgba(239, 68, 68, 0.15)',
  infoBg: 'rgba(59, 130, 246, 0.15)',
  iconBlueBg: 'rgba(59, 130, 246, 0.18)',
  iconGoldBg: 'rgba(190, 144, 85, 0.18)',
  iconPurpleBg: 'rgba(139, 92, 246, 0.18)',
  iconRoseBg: 'rgba(244, 63, 94, 0.18)',
  iconGreenBg: 'rgba(16, 185, 129, 0.18)',

  // Borders & dividers
  border: '#332d2f',
  borderLight: '#3e3638',
  borderDark: '#1f1b1d',
  borderGold: 'rgba(190, 144, 85, 0.2)',

  // Shadows
  shadow: 'rgba(0, 0, 0, 0.4)',
  shadowDark: 'rgba(0, 0, 0, 0.6)',

  // Tab bar
  tabActive: '#be9055',
  tabInactive: '#6b6560',
};

export const lightColors = {
  ...sharedColors,

  // Backgrounds -- Gilded Pearl (Light)
  background: '#f8fafc',
  backgroundDeep: '#f1f5f9',
  surface: '#ffffff',
  surfaceLight: '#f8fafc',
  surfaceElevated: '#ffffff',
  darkBg: '#f8fafc', // Mapped for backwards compat
  darkBgSecondary: '#f1f5f9',
  darkBgTertiary: '#ffffff',
  lightBg: '#f8fafc',
  lightBgSecondary: '#f1f5f9',

  // Text -- Inverted for light mode
  textPrimary: '#171516',
  textSecondary: '#6b6560',
  textTertiary: '#a0978e',
  textWhite: '#ffffff',
  textDark: '#1e293b',

  // Tints & Backgrounds (Slightly more opaque for light mode)
  primaryLight: 'rgba(190, 144, 85, 0.12)',
  statusConfirmedBg: 'rgba(16, 185, 129, 0.12)',
  statusPendingBg: 'rgba(245, 158, 11, 0.12)',
  statusCancelledBg: 'rgba(239, 68, 68, 0.12)',
  statusCompletedBg: 'rgba(139, 92, 246, 0.12)',
  statusInProgressBg: 'rgba(59, 130, 246, 0.12)',
  statusPaidBg: 'rgba(16, 185, 129, 0.12)',
  statusUnpaidBg: 'rgba(239, 68, 68, 0.12)',
  successBg: 'rgba(16, 185, 129, 0.12)',
  warningBg: 'rgba(245, 158, 11, 0.12)',
  errorBg: 'rgba(239, 68, 68, 0.12)',
  infoBg: 'rgba(59, 130, 246, 0.12)',
  iconBlueBg: 'rgba(59, 130, 246, 0.12)',
  iconGoldBg: 'rgba(190, 144, 85, 0.12)',
  iconPurpleBg: 'rgba(139, 92, 246, 0.12)',
  iconRoseBg: 'rgba(244, 63, 94, 0.12)',
  iconGreenBg: 'rgba(16, 185, 129, 0.12)',

  // Borders & dividers (Lighter for light mode)
  border: '#e2e8f0',
  borderLight: '#cbd5e1',
  borderDark: '#94a3b8',
  borderGold: 'rgba(190, 144, 85, 0.3)',

  // Shadows
  shadow: 'rgba(0, 0, 0, 0.08)',
  shadowDark: 'rgba(0, 0, 0, 0.12)',

  // Tab bar
  tabActive: '#be9055',
  tabInactive: '#94a3b8',
};

// Evaluate system preference on boot
const isLightMode = Appearance.getColorScheme() === 'light';

// Export the active color set, so no other files need to change their imports
export const colors = isLightMode ? lightColors : darkColors;
