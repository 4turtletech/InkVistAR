/**
 * AdminServices.jsx -- Service Kit Management
 * Lists service kits with pricing. Fixed missing useEffect import from original.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, RefreshControl,
} from 'react-native';
import { ArrowLeft, Scissors, Tag, Clock } from 'lucide-react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../src/theme';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { EmptyState } from '../src/components/shared/EmptyState';
import { formatCurrency } from '../src/utils/formatters';
import { getServices } from '../src/utils/api';

export const AdminServices = ({ navigation }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadServices = async () => {
    setLoading(true);
    const res = await getServices();
    if (res.success) {
      setServices(res.services || res.data || []);
    }
    setLoading(false);
  };

  useEffect(() => { loadServices(); }, []);

  const renderService = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.iconBox}>
        <Scissors size={22} color={colors.primary} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <View style={styles.metaRow}>
          {item.duration && (
            <View style={styles.metaItem}>
              <Clock size={12} color={colors.textTertiary} />
              <Text style={styles.metaText}>{item.duration}</Text>
            </View>
          )}
          {item.category && (
            <View style={styles.metaItem}>
              <Tag size={12} color={colors.textTertiary} />
              <Text style={styles.metaText}>{item.category}</Text>
            </View>
          )}
        </View>
      </View>
      <Text style={styles.cardPrice}>P{formatCurrency(item.price || 0)}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Services</Text>
      </View>

      {loading ? <PremiumLoader message="Loading services..." /> : (
        <FlatList
          data={services}
          renderItem={renderService}
          keyExtractor={item => (item.id || Math.random()).toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState icon={Scissors} title="No services found" subtitle="Service kits will appear here" />}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadServices} tintColor={colors.primary} />}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  listContent: { padding: 16, paddingBottom: 30 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
    padding: 14, borderRadius: borderRadius.xl, marginBottom: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: borderRadius.lg, backgroundColor: colors.warningBg,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  cardContent: { flex: 1 },
  cardTitle: { ...typography.body, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },
  metaRow: { flexDirection: 'row', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...typography.bodyXSmall, color: colors.textTertiary },
  cardPrice: { ...typography.h4, color: colors.success, marginLeft: 8 },
});
