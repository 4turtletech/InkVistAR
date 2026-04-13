import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getServices } from '../src/utils/api';

export const AdminServices = ({ navigation }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    setLoading(true);
    const res = await getServices();
    if(res.success) {
      setServices(res.services || []);
    }
    setLoading(false);
  };

  const renderService = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <Ionicons name={item.category === 'Tattoo' ? 'color-palette' : 'medical'} size={24} color="#f59e0b" />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardSubtitle}>{item.duration} â€¢ {item.category}</Text>
      </View>
      <Text style={styles.cardPrice}>{item.price}</Text>
      <TouchableOpacity style={styles.moreButton}>
        <Ionicons name="ellipsis-vertical" size={20} color="#6b7280" />
      </TouchableOpacity>
    </View>
  );

  return (
  <View style={styles.container}>
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Ionicons name="list" size={24} color="#f59e0b" style={{ marginRight: 10 }} />
        <Text style={styles.headerTitle}>Services</Text>
      </View>
      <TouchableOpacity style={styles.addButton}>
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
    </View>
    
    <FlatList
      data={services}
      renderItem={renderService}
      keyExtractor={item => item.id.toString()}
      contentContainerStyle={styles.content}
      onRefresh={loadServices}
      refreshing={loading}
    />
  </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backButton: { padding: 8, marginRight: 8 },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  addButton: { padding: 8 },
  content: { padding: 20 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 12 },
  cardIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(245, 158, 11, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: '#6b7280' },
  cardPrice: { fontSize: 16, fontWeight: 'bold', color: '#10b981', marginRight: 12 },
  moreButton: { padding: 4 },
});


