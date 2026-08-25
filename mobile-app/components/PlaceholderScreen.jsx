/**
 * PlaceholderScreen.jsx -- Used for AR Tattoo Preview Launcher
 * Themed with lucide icons.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Smartphone } from 'lucide-react-native';
import { colors, typography, borderRadius } from '../src/theme';
import * as Linking from 'expo-linking';

const BODY_PARTS = [
  { id: 'general', label: 'General' },
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'neck', label: 'Neck' },
  { id: 'upper_arm', label: 'Upper Arm' },
  { id: 'forearm', label: 'Forearm' },
  { id: 'hand', label: 'Hand' },
  { id: 'thighs', label: 'Thighs' },
  { id: 'calves', label: 'Calves' },
  { id: 'face', label: 'Face' },
];

export default function PlaceholderScreen({ navigation, title, feature }) {
  const [selectedPart, setSelectedPart] = useState('general');

  const openTattooAR = () => {
    // Launch the Swift app with the mode parameter
    Linking.openURL(`tattooar://?mode=${selectedPart}`).catch((err) => {
      console.error('Failed to open AR app:', err);
      alert('Tattoo AR app is not installed or could not be opened.');
    });
  };

  return (
    <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title || 'AR Tattoo Preview'}</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <Smartphone size={64} color={colors.primary} style={{ marginBottom: 16 }} />
        <Text style={styles.title}>Launch AR App</Text>
        <Text style={styles.subtitle}>Visualize designs on your skin</Text>
        
        <View style={styles.pickerSection}>
          <Text style={styles.sectionLabel}>Select Body Placement:</Text>
          <View style={styles.chipContainer}>
            {BODY_PARTS.map((part) => {
              const isSelected = selectedPart === part.id;
              return (
                <TouchableOpacity
                  key={part.id}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => setSelectedPart(part.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {part.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Text style={styles.desc}>
          Tap the button below to open the companion Augmented Reality app and see how your tattoo will look in real-time!
        </Text>
        <TouchableOpacity style={styles.btn} onPress={openTattooAR} activeOpacity={0.8}>
          <Text style={styles.btnText}>Open Tattoo AR</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 56 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...typography.h3, color: '#ffffff' },
  content: { alignItems: 'center', padding: 30, paddingBottom: 60 },
  title: { fontSize: 30, fontWeight: '800', color: '#ffffff', marginBottom: 8 },
  subtitle: { ...typography.body, color: colors.primary, marginBottom: 30, textAlign: 'center', fontWeight: '600' },
  pickerSection: { width: '100%', marginBottom: 10 },
  sectionLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '600', marginBottom: 16 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  chip: { 
    backgroundColor: 'rgba(255,255,255,0.08)', 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    borderRadius: 20, 
    marginRight: 10, 
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  chipSelected: {
    backgroundColor: 'rgba(212,175,55,0.15)', // Slight gold tint based on primary color assumed
    borderColor: colors.primary
  },
  chipText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500' },
  chipTextSelected: { color: colors.primary, fontWeight: '700' },
  desc: { ...typography.body, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 24, marginBottom: 30, marginTop: 10 },
  btn: { backgroundColor: colors.primary, paddingHorizontal: 28, paddingVertical: 16, borderRadius: borderRadius.lg, width: '100%', alignItems: 'center' },
  btnText: { ...typography.button, color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
});