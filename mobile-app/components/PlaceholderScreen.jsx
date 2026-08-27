/**
 * PlaceholderScreen.jsx -- Launches the embedded iOS AR tattoo preview.
 * Themed with lucide icons.
 */

import React, { useState } from 'react';
import { Alert, Platform, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Smartphone } from 'lucide-react-native';
import { colors, typography, borderRadius } from '../src/theme';
import { getTattooARCapabilities, presentTattooAR } from '../src/native/tattooAR';

const BODY_PARTS = [
  { id: 'general', label: 'General' },
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'neck', label: 'Neck' },
  { id: 'upperArms', label: 'Upper Arm' },
  { id: 'forearms', label: 'Forearm' },
  { id: 'hand', label: 'Hand' },
  { id: 'thighs', label: 'Thighs' },
  { id: 'calves', label: 'Calves' },
  { id: 'faceGeneral', label: 'Face' },
];

export default function PlaceholderScreen({ navigation, title }) {
  const [selectedPart, setSelectedPart] = useState('general');
  const [isLaunching, setIsLaunching] = useState(false);

  const openTattooAR = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('iOS Only', 'The AR tattoo preview is available only on compatible iOS devices.');
      return;
    }

    const capabilities = getTattooARCapabilities();
    const usesFaceTracking = selectedPart === 'faceGeneral';

    if (!capabilities.osSupported) {
      Alert.alert('iOS 26 Required', 'The current AR experience requires iOS 26 or newer. The rest of InkVistAR remains available on this device.');
      return;
    }

    if (usesFaceTracking && !capabilities.faceTracking) {
      Alert.alert('TrueDepth Required', 'Face tattoo preview requires an iPhone or iPad with a TrueDepth camera.');
      return;
    }

    if (!usesFaceTracking && !capabilities.lidar) {
      Alert.alert('LiDAR Required', 'This placement mode requires a LiDAR-capable iPhone or iPad.');
      return;
    }

    setIsLaunching(true);
    try {
      await presentTattooAR(selectedPart);
    } catch (error) {
      console.error('Failed to present embedded AR:', error);
      Alert.alert('AR Preview Unavailable', error?.message || 'The embedded AR preview could not be opened.');
    } finally {
      setIsLaunching(false);
    }
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
        <Text style={styles.title}>Tattoo AR Preview</Text>
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
          Open the built-in iOS AR experience to see how your tattoo will look in real time. No companion app is required.
        </Text>
        <TouchableOpacity
          style={[styles.btn, isLaunching && styles.btnDisabled]}
          onPress={openTattooAR}
          activeOpacity={0.8}
          disabled={isLaunching}
        >
          <Text style={styles.btnText}>{isLaunching ? 'Opening AR…' : 'Start AR Preview'}</Text>
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
  btnDisabled: { opacity: 0.65 },
  btnText: { ...typography.button, color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
});
