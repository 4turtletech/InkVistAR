/**
 * ConfirmModal -- Glassmorphism-styled confirmation dialog.
 * Replaces web's modal-overlay pattern for destructive/confirm actions.
 */

import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, borderRadius, spacing, shadows, typography } from '../../theme';

export const ConfirmModal = ({
  visible,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor,
  destructive = false,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const btnColor = confirmColor || (destructive ? colors.error : colors.primary);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={styles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: btnColor }]}
              onPress={onConfirm}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmText}>
                {loading ? 'Processing...' : confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: borderRadius.xxl,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 380,
    ...shadows.cardStrong,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xxl,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    backgroundColor: colors.lightBgSecondary,
    alignItems: 'center',
  },
  cancelText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    ...shadows.button,
  },
  confirmText: {
    ...typography.button,
    color: '#ffffff',
  },
});
