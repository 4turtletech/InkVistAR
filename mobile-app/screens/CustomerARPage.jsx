import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export function CustomerARPage({ onBack }) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#000000', '#b8860b']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={20} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>3D & AR View</Text>
          </View>
          <Text style={styles.headerSubtitle}>Visualize your tattoo before you ink</Text>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.placeholderCard}>
            <View style={styles.placeholderIcon}>
              <Ionicons name="sparkles" size={48} color="#b8860b" />
            </View>
            <Text style={styles.placeholderTitle}>AR Feature Coming Soon</Text>
            <Text style={styles.placeholderText}>
              Experience augmented rezality tattoo visualization. See how designs look on your body in real-time using your camera.
            </Text>
            <View style={styles.badge}>
              <Ionicons name="sparkles" size={16} color="#b8860b" />
              <Text style={styles.badgeText}>In Development</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What to Expect</Text>
            
            <View style={styles.featureCard}>
              <View style={[styles.featureIcon, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="camera" size={24} color="#b8860b" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Live Camera View</Text>
                <Text style={styles.featureText}>
                  Point your camera at your body to see tattoos in real-time
                </Text>
              </View>
            </View>

            <View style={styles.featureCard}>
              <View style={[styles.featureIcon, { backgroundColor: '#000000' }]}>
                <Ionicons name="cloud-upload" size={24} color="#ffffff" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Upload Your Design</Text>
                <Text style={styles.featureText}>
                  Choose from your saved designs or upload new ones
                </Text>
              </View>
            </View>

            <View style={styles.featureCard}>
              <View style={[styles.featureIcon, { backgroundColor: '#1f1f1f' }]}>
                <Ionicons name="resize" size={24} color="#daa520" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Adjust & Preview</Text>
                <Text style={styles.featureText}>
                  Resize, rotate, and position tattoos perfectly
                </Text>
              </View>
            </View>
          </View>

          <LinearGradient
            colors={['#000000', '#b8860b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaCard}
          >
            <Text style={styles.ctaTitle}>Get Notified</Text>
            <Text style={styles.ctaText}>Be the first to know when AR features launch</Text>
            <TouchableOpacity style={styles.ctaButton}>
              <Text style={styles.ctaButtonText}>Notify Me</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 60,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
  },
  content: {
    padding: 16,
  },
  placeholderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  placeholderIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  placeholderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fef3c7',
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 14,
    color: '#b8860b',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  featureText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  ctaCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  ctaText: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 16,
  },
  ctaButton: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
});
