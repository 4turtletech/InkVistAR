/**
 * ArtistActiveSession.jsx -- Live Tattoo Session Manager
 * Themed with lucide icons. Materials tracking, photos, notes, status transitions.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, Image, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Play, CheckCircle2, Camera, Package, Palette,
  XCircle, Briefcase, Zap, Plus, Save,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, typography, borderRadius, shadows } from '../src/theme';
import { API_URL } from '../src/config';

export function ArtistActiveSession({ appointment, onBack, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(appointment?.status || 'confirmed');
  const [sessionData, setSessionData] = useState({ notes: appointment?.notes || '', beforePhoto: null, afterPhoto: null });
  const [sessionMaterials, setSessionMaterials] = useState([]);
  const [sessionCost, setSessionCost] = useState(0);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [serviceKits, setServiceKits] = useState({});
  const [addingMaterial, setAddingMaterial] = useState(false);

  useEffect(() => { fetchInventory(); fetchServiceKits(); if (status === 'in_progress') fetchSessionMaterials(); }, [appointment?.id, status]);

  const fetchInventory = async () => { try { const r = await (await fetch(`${API_URL}/api/admin/inventory`)).json(); if (r.success && r.data) setInventoryItems(r.data.filter(i => i.current_stock > 0)); } catch (e) { console.error(e); } };
  const fetchServiceKits = async () => { try { const r = await (await fetch(`${API_URL}/api/admin/service-kits`)).json(); if (r.success) setServiceKits(r.data || {}); } catch (e) { console.error(e); } };
  const fetchSessionMaterials = async () => { if (!appointment?.id) return; try { const r = await (await fetch(`${API_URL}/api/appointments/${appointment.id}/materials`)).json(); if (r.success) { setSessionMaterials(r.materials || []); setSessionCost(r.totalCost || 0); } } catch (e) { console.error(e); } };

  const handleQuickAdd = async (inventoryId, quantity = 1) => {
    setAddingMaterial(true);
    try { const r = await (await fetch(`${API_URL}/api/appointments/${appointment.id}/materials`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inventory_id: inventoryId, quantity }) })).json(); if (r.success) fetchSessionMaterials(); else Alert.alert('Error', r.message || 'Failed. Check stock.'); }
    catch (e) { Alert.alert('Error', 'Connection failed'); } finally { setAddingMaterial(false); }
  };

  const handleQuickAddKit = async (kitItems) => {
    if (!appointment?.id || !kitItems?.length) return;
    setAddingMaterial(true);
    try { for (const item of kitItems) await fetch(`${API_URL}/api/appointments/${appointment.id}/materials`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inventory_id: item.inventory_id, quantity: item.default_quantity }) }); fetchSessionMaterials(); Alert.alert('Kit Added', 'All items added.'); }
    catch (e) { Alert.alert('Error', 'Failed to add kit.'); } finally { setAddingMaterial(false); }
  };

  const handleReleaseMaterial = (materialId) => {
    if (!appointment?.id || !materialId) return;
    Alert.alert('Return to Stock', 'Return this item to inventory?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Return Item', onPress: async () => {
        try { const r = await (await fetch(`${API_URL}/api/appointments/${appointment.id}/release-material`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ materialId: Number(materialId) }) })).json(); r.success ? Alert.alert('Success', 'Returned.') : Alert.alert('Error', r.message || 'Failed.'); }
        catch (e) { Alert.alert('Error', 'Connection failed'); } finally { fetchSessionMaterials(); }
      }},
    ]);
  };

  const pickImage = async (type) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Denied', 'Photo access is required.'); return; }
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.5, base64: true });
    if (!result.canceled) setSessionData(p => ({ ...p, [type]: `data:image/jpeg;base64,${result.assets[0].base64}` }));
  };

  const handleUpdateStatus = async (newStatus) => {
    setLoading(true);
    try {
      const r = await (await fetch(`${API_URL}/api/appointments/${appointment.id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) })).json();
      if (r.success) {
        setStatus(newStatus);
        if (newStatus === 'completed') Alert.alert('Session Completed', `Total material cost: P${sessionCost.toLocaleString()}.`, [{ text: 'OK', onPress: () => onComplete?.() }]);
        else if (newStatus === 'in_progress') setTimeout(fetchSessionMaterials, 1000);
      } else Alert.alert('Error', 'Failed to update status');
    } catch (e) { Alert.alert('Error', 'Connection failed'); } finally { setLoading(false); }
  };

  const handleSaveDetails = async () => {
    if (!appointment?.id) return;
    setLoading(true);
    try {
      const r = await (await fetch(`${API_URL}/api/appointments/${appointment.id}/details`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: sessionData.notes, beforePhoto: sessionData.beforePhoto, afterPhoto: sessionData.afterPhoto }) })).json();
      r.success ? Alert.alert('Success', 'Session details saved!') : Alert.alert('Error', 'Failed to save.');
    } catch (e) { Alert.alert('Error', 'Connection failed'); } finally { setLoading(false); }
  };

  const getStatusBg = (s) => { switch (s) { case 'confirmed': return colors.info; case 'in_progress': return colors.primary; case 'completed': return colors.success; default: return colors.textTertiary; } };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Header */}
        <LinearGradient colors={['#0f172a', colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onBack} style={styles.backBtn}><ArrowLeft size={20} color="#ffffff" /></TouchableOpacity>
            <Text style={styles.headerTitle}>Active Session</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.clientOverview}>
            <Text style={styles.clientName}>{appointment?.client_name}</Text>
            <Text style={styles.designTitle}>{appointment?.design_title}</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <Text style={{ color: '#fff', opacity: 0.8, fontSize: 13 }}>P{parseFloat(appointment?.price || 0).toLocaleString()}</Text>
              <Text style={{ color: appointment?.payment_status === 'paid' ? '#4ade80' : '#fbbf24', fontSize: 13, fontWeight: '700' }}>{(appointment?.payment_status || 'unpaid').toUpperCase()}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusBg(status) }]}><Text style={styles.statusText}>{status.toUpperCase()}</Text></View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Action Buttons */}
          <View style={styles.actionSection}>
            {status === 'confirmed' && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#0f172a' }]} onPress={() => handleUpdateStatus('in_progress')} disabled={loading} activeOpacity={0.8}>
                <Play size={18} color="#ffffff" /><Text style={styles.actionBtnText}>Start Session</Text>
              </TouchableOpacity>
            )}
            {status === 'in_progress' && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.success }]} onPress={() => handleUpdateStatus('completed')} disabled={loading} activeOpacity={0.8}>
                <CheckCircle2 size={18} color="#ffffff" /><Text style={styles.actionBtnText}>Complete Session</Text>
              </TouchableOpacity>
            )}
            {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 10 }} />}
          </View>

          {/* Photos */}
          <Text style={styles.sectionTitle}>Session Media</Text>
          <View style={styles.photoGrid}>
            {['beforePhoto', 'afterPhoto'].map(type => (
              <TouchableOpacity key={type} style={styles.photoBox} onPress={() => pickImage(type)}>
                {sessionData[type] ? <Image source={{ uri: sessionData[type] }} style={styles.uploadedPhoto} /> : (
                  <View style={styles.photoPlaceholder}><Camera size={28} color={colors.textTertiary} /><Text style={styles.photoLabel}>{type === 'beforePhoto' ? 'Before Photo' : 'After Photo'}</Text></View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Materials (only when in_progress) */}
          {status === 'in_progress' && (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <Text style={styles.sectionTitle}>Session Materials</Text>
                <View style={styles.costBadge}><Text style={styles.costBadgeText}>P{sessionCost.toLocaleString()}</Text></View>
              </View>

              <View style={styles.materialsWrap}>
                {sessionMaterials.length === 0 ? (
                  <View style={styles.emptyMat}><Package size={28} color={colors.textTertiary} /><Text style={styles.emptyMatText}>No materials logged.</Text></View>
                ) : (
                  <View style={styles.matList}>
                    {sessionMaterials.map(mat => (
                      <View key={mat.id} style={styles.matCard}>
                        <View style={styles.matIcon}><Palette size={16} color={colors.primaryDark} /></View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.matName}>{mat.item_name}</Text>
                          <Text style={styles.matUnit}>{mat.unit}</Text>
                        </View>
                        <View style={styles.matQty}><Text style={styles.matQtyText}>{mat.quantity}</Text></View>
                        {mat.status === 'hold' && <TouchableOpacity onPress={() => handleReleaseMaterial(mat.id)} style={{ marginLeft: 8 }}><XCircle size={18} color={colors.error} /></TouchableOpacity>}
                      </View>
                    ))}
                  </View>
                )}

                {/* Quick Add Section */}
                <View style={styles.quickSection}>
                  {Object.keys(serviceKits).length > 0 && (
                    <View style={{ marginBottom: 14 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}><Briefcase size={14} color={colors.primary} /><Text style={styles.quickTitle}>Apply Service Kit</Text></View>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
                        {Object.keys(serviceKits).map(kitName => (
                          <TouchableOpacity key={kitName} style={[styles.quickChip, { backgroundColor: '#0f172a' }]} onPress={() => handleQuickAddKit(serviceKits[kitName])}>
                            <Text style={[styles.quickChipText, { color: '#fff' }]}>{kitName}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}><Zap size={14} color={colors.primary} /><Text style={styles.quickTitle}>Quick Add Item (+1)</Text></View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
                    {inventoryItems.slice(0, 8).map(item => (
                      <TouchableOpacity key={item.id} style={styles.quickChip} onPress={() => handleQuickAdd(item.id, 1)} disabled={addingMaterial}>
                        <Text style={styles.quickChipText}>{item.name}</Text>
                        <View style={styles.quickPlusIcon}><Plus size={12} color="#ffffff" /></View>
                      </TouchableOpacity>
                    ))}
                    {inventoryItems.length === 0 && <Text style={{ color: colors.textTertiary, padding: 10 }}>No stock available</Text>}
                  </ScrollView>
                  {addingMaterial && <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8 }} />}
                </View>
              </View>
            </>
          )}

          {/* Notes */}
          <Text style={styles.sectionTitle}>Session Notes</Text>
          <View style={styles.notesCard}>
            <TextInput style={styles.notesInput} placeholder="Record session details, skin reaction, etc..." placeholderTextColor={colors.textTertiary} value={sessionData.notes} onChangeText={t => setSessionData(p => ({ ...p, notes: t }))} multiline numberOfLines={4} />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveDetails} disabled={loading} activeOpacity={0.8}>
              <LinearGradient colors={['#0f172a', colors.primary]} style={styles.saveGradient}>
                <Save size={18} color="#ffffff" /><Text style={styles.saveBtnText}>Save Details</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 24, paddingTop: 56, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...typography.h3, color: '#ffffff' },
  clientOverview: { alignItems: 'center', marginBottom: 8 },
  clientName: { fontSize: 24, fontWeight: '800', color: '#ffffff', marginBottom: 4 },
  designTitle: { ...typography.body, color: '#ffffff', opacity: 0.9, marginBottom: 10 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: borderRadius.round },
  statusText: { color: '#ffffff', ...typography.bodyXSmall, fontWeight: '700' },
  content: { padding: 20 },
  actionSection: { marginBottom: 28, alignItems: 'center' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 28, borderRadius: borderRadius.round, width: '100%', gap: 10, ...shadows.button },
  actionBtnText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  sectionTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: 14 },
  photoGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  photoBox: { width: '48%', aspectRatio: 1, backgroundColor: '#ffffff', borderRadius: borderRadius.xl, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  uploadedPhoto: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoPlaceholder: { alignItems: 'center' },
  photoLabel: { marginTop: 6, ...typography.bodyXSmall, color: colors.textTertiary, fontWeight: '600' },
  costBadge: { backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.md, borderWidth: 1, borderColor: 'rgba(190,144,85,0.2)' },
  costBadgeText: { color: colors.primaryDark, fontWeight: '700', ...typography.bodySmall },
  materialsWrap: { marginBottom: 28 },
  emptyMat: { backgroundColor: '#ffffff', borderRadius: borderRadius.xl, padding: 28, alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  emptyMatText: { color: colors.textTertiary, marginTop: 8, ...typography.bodySmall },
  matList: { backgroundColor: '#ffffff', borderRadius: borderRadius.xl, padding: 14, marginBottom: 14, ...shadows.subtle },
  matCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: borderRadius.lg, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: colors.borderLight },
  matIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  matName: { ...typography.bodySmall, fontWeight: '600', color: colors.textPrimary },
  matUnit: { ...typography.bodyXSmall, color: colors.textTertiary, marginTop: 1 },
  matQty: { backgroundColor: '#0f172a', width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  matQtyText: { color: '#ffffff', fontWeight: '700', ...typography.bodyXSmall },
  quickSection: { marginTop: 4 },
  quickTitle: { ...typography.bodySmall, fontWeight: '700', color: colors.textSecondary },
  quickChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', paddingLeft: 14, paddingRight: 6, paddingVertical: 7, borderRadius: borderRadius.round, marginRight: 8, borderWidth: 1, borderColor: colors.border },
  quickChipText: { color: colors.textPrimary, ...typography.bodyXSmall, fontWeight: '600', marginRight: 6 },
  quickPlusIcon: { backgroundColor: colors.success, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  notesCard: { backgroundColor: '#ffffff', borderRadius: borderRadius.xl, padding: 16, ...shadows.subtle, marginBottom: 40 },
  notesInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, padding: 12, ...typography.body, color: colors.textPrimary, height: 100, textAlignVertical: 'top', marginBottom: 14 },
  saveBtn: { borderRadius: borderRadius.xl, overflow: 'hidden' },
  saveGradient: { flexDirection: 'row', height: 52, justifyContent: 'center', alignItems: 'center', gap: 10 },
  saveBtnText: { color: '#ffffff', ...typography.button, fontSize: 16 },
});
