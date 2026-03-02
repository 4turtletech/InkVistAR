import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export function ArtistProfile({ userName, userEmail, onBack, onLogout }) {
  const stats = [
    { label: 'Works', value: '0', icon: 'images' },
    { label: 'Clients', value: '0', icon: 'people' },
    { label: 'Reviews', value: '0', icon: 'star' },
  ];

  const personalInfo = [
    { label: 'Full Name', value: userName, icon: 'person' },
    { label: 'Email', value: userEmail, icon: 'mail' },
    { label: 'Phone', value: 'Placeholder Phone', icon: 'call' },
    { label: 'Studio', value: 'Placeholder Studio', icon: 'business' },
  ];

  const professionalInfo = [
    { label: 'Specialization', value: 'Placeholder Specialization', icon: 'color-palette' },
    { label: 'Experience', value: '0 Years', icon: 'time' },
    { label: 'Certifications', value: 'Placeholder Certification', icon: 'ribbon' },
    { label: 'Hourly Rate', value: '₱0/hr', icon: 'cash' },
  ];

  const settings = [
    { label: 'Availability Settings', icon: 'calendar', hasArrow: true },
    { label: 'Notification Preferences', icon: 'notifications', hasArrow: true },
    { label: 'Privacy & Security', icon: 'lock-closed', hasArrow: true },
    { label: 'Payment Settings', icon: 'card', hasArrow: true },
    { label: 'Help & Support', icon: 'help-circle', hasArrow: true },
  ];

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
            <Text style={styles.headerTitle}>My Profile</Text>
            <TouchableOpacity style={styles.editButton}>
              <Ionicons name="create-outline" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={48} color="#daa520" />
            </View>
            <Text style={styles.profileName}>{userName}</Text>
            <Text style={styles.profileEmail}>{userEmail}</Text>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={16} color="#daa520" />
              <Text style={styles.ratingText}>0.0 Rating</Text>
            </View>
          </View>

          <View style={styles.statsContainer}>
            {stats.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <Ionicons name={stat.icon} size={24} color="#ffffff" />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            {personalInfo.map((item, index) => (
              <View key={index} style={styles.infoCard}>
                <View style={styles.infoIcon}>
                  <Ionicons name={item.icon} size={20} color="#6b7280" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Details</Text>
            {professionalInfo.map((item, index) => (
              <View key={index} style={styles.infoCard}>
                <View style={styles.infoIcon}>
                  <Ionicons name={item.icon} size={20} color="#6b7280" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settings</Text>
            {settings.map((item, index) => (
              <TouchableOpacity key={index} style={styles.settingCard}>
                <Ionicons name={item.icon} size={24} color="#111827" />
                <Text style={styles.settingLabel}>{item.label}</Text>
                {item.hasArrow && <Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity onPress={onLogout}>
            <LinearGradient
              colors={['#dc2626', '#b91c1c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.logoutButton}
            >
              <Ionicons name="log-out" size={20} color="#ffffff" />
              <Text style={styles.logoutText}>Logout</Text>
            </LinearGradient>
          </TouchableOpacity>
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
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ratingText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.9,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  settingLabel: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
