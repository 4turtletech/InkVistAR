/**
 * PlaceholderScreen.jsx -- Used for AR Tattoo Preview Launcher
 * Themed with lucide icons.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Smartphone } from 'lucide-react-native';
import { colors, typography, borderRadius } from '../src/theme';
import * as Linking from 'expo-linking';

export default function PlaceholderScreen({ navigation, title, feature }) {
  const openTattooAR = () => {
    // This will open the Swift app
    Linking.openURL('tattooar://').catch((err) => {
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
      <View style={styles.content}>
        <Smartphone size={64} color={colors.primary} />
        <Text style={styles.title}>Launch AR App</Text>
        <Text style={styles.subtitle}>Visualize designs on your skin</Text>
        <Text style={styles.desc}>Tap the button below to open the companion Augmented Reality app and see how your tattoo will look in real-time!</Text>
        <TouchableOpacity style={styles.btn} onPress={openTattooAR} activeOpacity={0.8}>
          <Text style={styles.btnText}>Open Tattoo AR</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 56 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...typography.h3, color: '#ffffff' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  title: { fontSize: 30, fontWeight: '800', color: '#ffffff', marginTop: 18, marginBottom: 8 },
  subtitle: { ...typography.body, color: colors.primary, marginBottom: 18, textAlign: 'center', fontWeight: '600' },
  desc: { ...typography.body, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 24, marginBottom: 28 },
  btn: { backgroundColor: colors.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: borderRadius.lg },
  btnText: { ...typography.button, color: '#ffffff', fontSize: 16 },
});