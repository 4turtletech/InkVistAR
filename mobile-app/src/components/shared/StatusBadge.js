/**
 * StatusBadge -- Colored status pill matching web's `.status-badge-v2`.
 * Automatically picks color based on status string.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius } from '../../theme';

const statusMap = {
  confirmed: { bg: colors.statusConfirmedBg, text: colors.statusConfirmed },
  approved: { bg: colors.statusConfirmedBg, text: colors.statusConfirmed },
  pending: { bg: colors.statusPendingBg, text: colors.statusPending },
  cancelled: { bg: colors.statusCancelledBg, text: colors.statusCancelled },
  rejected: { bg: colors.statusCancelledBg, text: colors.statusCancelled },
  completed: { bg: colors.statusCompletedBg, text: colors.statusCompleted },
  in_progress: { bg: colors.statusInProgressBg, text: colors.statusInProgress },
  'in progress': { bg: colors.statusInProgressBg, text: colors.statusInProgress },
  paid: { bg: colors.statusPaidBg, text: colors.statusPaid },
  unpaid: { bg: colors.statusUnpaidBg, text: colors.statusUnpaid },
  partial: { bg: colors.warningBg, text: colors.warning },
  active: { bg: colors.successBg, text: colors.success },
  inactive: { bg: 'rgba(100,116,139,0.12)', text: '#64748b' },
};

export const StatusBadge = ({ status, style }) => {
  const key = (status || 'pending').toLowerCase().replace(/-/g, '_');
  const config = statusMap[key] || { bg: colors.statusPendingBg, text: colors.statusPending };

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, style]}>
      <Text style={[styles.text, { color: config.text }]}>
        {(status || 'Pending').charAt(0).toUpperCase() + (status || 'pending').slice(1).replace(/_/g, ' ')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
