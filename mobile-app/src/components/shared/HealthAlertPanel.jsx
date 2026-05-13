/**
 * HealthAlertPanel.jsx -- Reusable Client Health & Safety panel (Gilded Noir)
 * Displays collapsible condition chips + allergen chips.
 *
 * Props:
 *   conditions   {string[]}  – Array of health condition strings
 *   allergens    {string[]}  – Array of allergen strings
 *   initialOpen  {boolean}   – Whether the panel is open by default (default: false)
 *   compact      {boolean}   – Compact mode: smaller font, tighter padding (default: false)
 */
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { typography } from '../../theme';

export function HealthAlertPanel({ conditions = [], allergens = [], initialOpen = false, compact = false }) {
  const { theme: colors } = useTheme();
  const [open, setOpen] = useState(initialOpen);
  const styles = getStyles(colors, compact);

  const total = conditions.length + allergens.length;
  if (total === 0) return null;

  return (
    <View style={styles.wrapper} accessibilityRole="region" accessibilityLabel="Client health and safety information">
      {/* Header / Collapse toggle */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setOpen(p => !p)}
        accessibilityRole="button"
        accessibilityLabel={open ? 'Collapse health alert panel' : 'Expand health alert panel'}
        title={open ? 'Collapse client health info' : 'View client health info'}
      >
        <View style={styles.headerLeft}>
          <ShieldAlert size={compact ? 14 : 16} color="#ea580c" />
          <Text style={styles.headerTitle}>Client Health & Safety</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{total}</Text>
          </View>
        </View>
        {open
          ? <ChevronUp size={16} color="#ea580c" />
          : <ChevronDown size={16} color="#ea580c" />}
      </TouchableOpacity>

      {/* Expanded body */}
      {open && (
        <View style={styles.body}>
          {conditions.length > 0 && (
            <>
              <Text style={styles.subLabel}>HEALTH CONDITIONS</Text>
              <View style={styles.chipRow}>
                {conditions.map((c, i) => (
                  <View key={`c-${i}`} style={styles.conditionChip}>
                    <Text style={styles.conditionChipText}>{c}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {allergens.length > 0 && (
            <>
              <Text style={[styles.subLabel, conditions.length > 0 && { marginTop: 10 }]}>KNOWN ALLERGENS</Text>
              <View style={styles.chipRow}>
                {allergens.map((a, i) => (
                  <View key={`a-${i}`} style={styles.allergenChip}>
                    <Text style={styles.allergenChipText}>{a}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <Text style={styles.disclaimer}>
            Review this information before proceeding. Confirm with the client if any condition may affect the session.
          </Text>
        </View>
      )}
    </View>
  );
}

const getStyles = (colors, compact) => StyleSheet.create({
  wrapper: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(234,88,12,0.3)',
    backgroundColor: 'rgba(255,237,213,0.08)',
    marginBottom: compact ? 12 : 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: compact ? 10 : 12, paddingHorizontal: compact ? 12 : 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  headerTitle: {
    fontSize: compact ? 12 : 13, fontWeight: '800', color: '#9a3412',
    textTransform: 'uppercase', letterSpacing: 0.5, flex: 1,
  },
  countBadge: {
    minWidth: 22, height: 22, borderRadius: 11,
    backgroundColor: '#fed7aa', justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 6,
  },
  countText: { fontSize: 11, fontWeight: '800', color: '#9a3412' },

  body: {
    paddingHorizontal: compact ? 12 : 14,
    paddingBottom: compact ? 10 : 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(234,88,12,0.15)',
    paddingTop: compact ? 10 : 12,
  },
  subLabel: {
    fontSize: 10, fontWeight: '700', color: '#b45309',
    letterSpacing: 0.6, marginBottom: 7, textTransform: 'uppercase',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 2 },

  conditionChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    backgroundColor: 'rgba(190,144,85,0.15)',
    borderWidth: 1.5, borderColor: 'rgba(190,144,85,0.4)',
  },
  conditionChipText: { fontSize: 12, fontWeight: '600', color: '#92400e' },

  allergenChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.35)',
  },
  allergenChipText: { fontSize: 12, fontWeight: '600', color: '#b91c1c' },

  disclaimer: {
    ...typography.bodyXSmall,
    color: '#b45309',
    fontStyle: 'italic',
    marginTop: 10,
    lineHeight: 17,
  },
});
