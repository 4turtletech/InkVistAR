/**
 * ArtistProfile.jsx -- Premium Artist Profile & Settings (Gilded Noir v2)
 * Full theme support, animated interactions, haptic feedback, custom modals.
 */
import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  Modal, TextInput, RefreshControl, Image, Animated, KeyboardAvoidingView, Platform, Switch, Alert, Keyboard,
} from 'react-native';
import {
  LogOut, Edit3, X, ChevronDown, ChevronUp, ChevronRight, Lock, User, Phone, Briefcase,
  Clock, ShieldAlert, Palette, Activity, Check, Eye, EyeOff, Camera,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { typography, shadows } from '../src/theme';
import { useTheme } from '../src/context/ThemeContext';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { AnimatedTouchable } from '../src/components/shared/AnimatedTouchable';
import { getInitials, formatCurrency } from '../src/utils/formatters';
import { getArtistDashboard, updateArtistProfile, changeArtistPassword } from '../src/utils/api';
import { nationalPHPhone, artistPhoneError, artistPhonePayload, artistPasswordRules, artistPasswordErrors } from '../src/utils/artistProfileValidation';
import {
  artistProfileErrors,
  composeCustomerName,
  normalizeProfileName,
  normalizeProfileText,
  suggestCustomerNameParts,
} from '../src/utils/profileValidation';

export const ArtistProfile = ({ userId, userName, userEmail, onLogout }) => {
  const { theme, isDark, toggleTheme, hapticsEnabled, toggleHaptics } = useTheme();
  const styles = getStyles(theme);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState({
    name: userName || '', ...suggestCustomerNameParts({ name: userName || '' }), email: userEmail || '', phone: '',
    experience_years: 0, specialization: 'General', commission_rate: 0.60,
    profile_image: '',
  });
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [pwdForm, setPwdForm] = useState({ current: '', new: '', confirm: '' });
  const [pwdErrors, setPwdErrors] = useState({});
  const [profileErrors, setProfileErrors] = useState({});
  const [pwdTouched, setPwdTouched] = useState({});
  const [saveError, setSaveError] = useState('');
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [alertModal, setAlertModal] = useState({ visible: false, title: '', message: '' });
  const [specDropdownOpen, setSpecDropdownOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState(null); // holds newly picked image before save

  const avatarScale = useRef(new Animated.Value(1)).current;

  useEffect(() => { fetchProfile(); }, [userId]);

  const fetchProfile = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await getArtistDashboard(userId);
      if (res.success && res.artist) {
        const nameParts = suggestCustomerNameParts(res.artist);
        setProfile({
          name: res.artist.name, ...nameParts, email: res.artist.email, phone: res.artist.phone || '',
          experience_years: res.artist.experience_years, specialization: res.artist.specialization,
          commission_rate: res.artist.commission_rate,
          profile_image: res.artist.profile_image || '',
        });
      }
    } catch (e) { console.error('Profile load error:', e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = () => { setRefreshing(true); fetchProfile(); };

  const handleEdit = () => {
    setEditForm({
      ...profile,
      ...suggestCustomerNameParts(profile),
      phone: nationalPHPhone(profile.phone),
      profile_image: pendingImage || profile.profile_image || '',
    });
    setProfileErrors({});
    setSaveError('');
    setEditModalVisible(true);
  };

  const handlePasswordOpen = () => {
    setPwdForm({ current: '', new: '', confirm: '' });
    setPwdErrors({});
    setPwdTouched({});
    setShowPassword({ current: false, new: false, confirm: false });
    setSaveError('');
    setPasswordModalVisible(true);
  };

  const handlePasswordClose = () => {
    if (loading) return;
    setPasswordModalVisible(false);
    setPwdForm({ current: '', new: '', confirm: '' });
    setPwdErrors({});
    setPwdTouched({});
    setSaveError('');
  };

  const handleSave = async () => {
    if (loading) return;
    Keyboard.dismiss();
    setSaveError('');
    const fieldErrors = artistProfileErrors(editForm);
    setProfileErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setLoading(true);
    try {
      // Include pending image in the save payload
      const payload = {
        ...editForm,
        first_name: normalizeProfileName(editForm.first_name),
        middle_name: normalizeProfileName(editForm.middle_name) || null,
        last_name: normalizeProfileName(editForm.last_name),
        suffix: normalizeProfileName(editForm.suffix) || null,
        name: composeCustomerName(editForm),
        name_needs_review: false,
        phone: artistPhonePayload(editForm.phone),
        experience_years: Number(editForm.experience_years),
        specialization: normalizeProfileText(editForm.specialization),
      };
      if (pendingImage) payload.profileImage = pendingImage;
      const res = await updateArtistProfile(userId, payload);
      if (res.success) {
        const updatedProfile = { ...payload, profile_image: pendingImage || editForm.profile_image };
        setAlertModal({ visible: true, title: 'Success', message: 'Profile updated successfully' });
        setProfile(updatedProfile);
        setPendingImage(null);
        setEditModalVisible(false);
      } else {
        setSaveError(res.message || 'Failed to update profile');
      }
    } catch (e) {
      console.error('handleSave error:', e);
      setSaveError('An unexpected error occurred. Please try again.');
    }
    finally { setLoading(false); }
  };

  const handlePasswordSave = async () => {
    if (loading) return;
    Keyboard.dismiss();
    setSaveError('');
    const fieldErrors = artistPasswordErrors(pwdForm);
    setPwdTouched({ current: true, new: true, confirm: true });
    setPwdErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setLoading(true);
    try {
      const pwdRes = await changeArtistPassword(userId, pwdForm.current, pwdForm.new);
      if (!pwdRes.success) {
        if ((pwdRes.message || '').toLowerCase().includes('current password')) {
          setPwdErrors(prev => ({ ...prev, current: pwdRes.message }));
        }
        setSaveError(pwdRes.message || 'Failed to change password.');
        return;
      }
      setPwdForm({ current: '', new: '', confirm: '' });
      setPwdErrors({});
      setPasswordModalVisible(false);
      setAlertModal({
        visible: true,
        title: 'Password Changed',
        message: 'Your password was updated successfully. Please sign in with your new password.',
        onConfirm: onLogout,
      });
    } catch (e) {
      console.error('handlePasswordSave error:', e);
      setSaveError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarPress = () => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(avatarScale, { toValue: 1.15, useNativeDriver: true }),
      Animated.spring(avatarScale, { toValue: 1, friction: 3, tension: 100, useNativeDriver: true })
    ]).start();
    Alert.alert('Profile Picture', 'How would you like to update your photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickImage },
    ]);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is needed to take a photo.');
      return;
    }
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setPendingImage(base64Img);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera roll permission is needed.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setPendingImage(base64Img);
    }
  };

  if (loading && !editModalVisible && !passwordModalVisible && !refreshing) return <SafeAreaView style={styles.container}><PremiumLoader message="Loading profile..." /></SafeAreaView>;

  const SPECIALIZATIONS = ['General', 'Realism', 'Traditional', 'Japanese', 'Tribal', 'Fine Line', 'Watercolor', 'Minimalist', 'Blackwork', 'Neo-Traditional', 'Geometric', 'Dotwork'];

  const details = [
    { Icon: Briefcase, label: 'Specialization', value: profile.specialization },
    { Icon: Clock, label: 'Experience', value: `${profile.experience_years} Years` },
    { Icon: Phone, label: 'Phone', value: profile.phone || 'Not set' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.gold} />}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Profile</Text>
          <AnimatedTouchable onPress={() => setLogoutConfirmVisible(true)} style={styles.logoutBtn}>
            <LogOut size={22} color={theme.error} />
          </AnimatedTouchable>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <AnimatedTouchable onPress={handleAvatarPress} activeOpacity={1} title="Change profile picture">
            <Animated.View style={[styles.avatarBox, { transform: [{ scale: avatarScale }] }]}>
              {(pendingImage || profile.profile_image) ? (
                <Image source={{ uri: pendingImage || profile.profile_image }} style={{ width: 96, height: 96, borderRadius: 48 }} />
              ) : (
                <Text style={styles.avatarText}>{getInitials(profile.name)}</Text>
              )}
              <View style={styles.cameraBadge}>
                <Camera size={12} color="#fff" />
              </View>
            </Animated.View>
          </AnimatedTouchable>
          {pendingImage && (
            <View style={{ backgroundColor: 'rgba(190,144,85,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6 }}>
              <Text style={{ fontSize: 11, color: '#be9055', fontWeight: '600' }}>Photo staged — tap Save Changes to apply</Text>
            </View>
          )}
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.email}>{profile.email}</Text>
          <TouchableOpacity style={styles.editBtn} onPress={handleEdit} activeOpacity={0.8}>
            <View style={{ marginRight: 6 }}><Edit3 size={14} color={theme.gold} /></View>
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Details</Text>
          <View style={styles.detailsContainer}>
            {details.map((d, i) => (
              <View key={i} style={[styles.row, i === details.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.rowLeft}>
                  <View style={styles.iconWrap}><d.Icon size={16} color={theme.gold} /></View>
                  <Text style={styles.rowLabel}>{d.label}</Text>
                </View>
                <Text style={styles.rowValue}>{d.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          <View style={styles.detailsContainer}>
            <TouchableOpacity style={styles.row} onPress={handlePasswordOpen} activeOpacity={0.8}>
              <View style={styles.rowLeft}>
                <View style={styles.iconWrap}><Lock size={16} color={theme.gold} /></View>
                <Text style={styles.rowLabel}>Change Password</Text>
              </View>
              <ChevronRight size={18} color={theme.textTertiary} />
            </TouchableOpacity>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={styles.iconWrap}><Palette size={16} color={theme.gold} /></View>
                <Text style={styles.rowLabel}>Dark Mode (Gilded Noir)</Text>
              </View>
              <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: theme.border, true: theme.gold }} thumbColor={'#fff'} />
            </View>
            <View style={[styles.row, { borderBottomWidth: 0 }]}>
              <View style={styles.rowLeft}>
                <View style={styles.iconWrap}><Activity size={16} color={theme.gold} /></View>
                <Text style={styles.rowLabel}>Haptic Feedback</Text>
              </View>
              <Switch value={hapticsEnabled} onValueChange={toggleHaptics} trackColor={{ false: theme.border, true: theme.gold }} thumbColor={'#fff'} />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <X size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {[
                { label: 'First Name *', key: 'first_name', kb: 'default', max: 50 },
                { label: 'Middle Name (Optional)', key: 'middle_name', kb: 'default', max: 50 },
                { label: 'Last Name *', key: 'last_name', kb: 'default', max: 50 },
                { label: 'Suffix (Optional)', key: 'suffix', kb: 'default', max: 10 },
                { label: 'Phone Number (+63) (Optional)', key: 'phone', kb: 'number-pad' },
                { label: 'Experience (Years) *', key: 'experience_years', kb: 'numeric' },
              ].map(field => (
                <View key={field.key}>
                  <Text style={styles.inputLabel}>{field.label}</Text>
                  <TextInput
                    style={[styles.input, profileErrors[field.key] && styles.inputError]}
                    value={String(editForm[field.key] ?? '')}
                    onChangeText={t => {
                      if (field.key === 'phone') {
                        const digits = nationalPHPhone(t);
                        setEditForm({ ...editForm, [field.key]: digits });
                        setProfileErrors(prev => ({ ...prev, phone: artistPhoneError(digits) }));
                      } else if (['first_name', 'middle_name', 'last_name', 'suffix'].includes(field.key)) {
                        const next = { ...editForm, [field.key]: t.replace(/[^\p{L}\p{M} .'-]/gu, '').slice(0, field.max) };
                        setEditForm(next);
                        setProfileErrors(prev => ({ ...prev, [field.key]: artistProfileErrors(next)[field.key] || '' }));
                      } else if (field.key === 'experience_years') {
                        const next = { ...editForm, experience_years: t.replace(/\D/g, '').slice(0, 2) };
                        setEditForm(next);
                        setProfileErrors(prev => ({ ...prev, experience_years: artistProfileErrors(next).experience_years || '' }));
                      } else {
                        setEditForm({ ...editForm, [field.key]: t });
                      }
                    }}
                    keyboardType={field.kb}
                    placeholderTextColor={theme.textTertiary}
                    placeholder={field.key === 'phone' ? '9XXXXXXXXX' : ''}
                    onBlur={() => setProfileErrors(prev => ({ ...prev, [field.key]: artistProfileErrors(editForm)[field.key] || '' }))}
                    maxLength={field.key === 'phone' ? 20 : field.max || 2}
                  />
                  {!!profileErrors[field.key] && <Text style={styles.fieldErrorText}>{profileErrors[field.key]}</Text>}
                  {field.key === 'suffix' ? (
                    <Text style={styles.nameHelperText}>Your complete legal name is used throughout your artist profile and studio records.</Text>
                  ) : null}
                </View>
              ))}

              {editForm.name_needs_review ? (
                <Text style={styles.nameReviewText}>
                  We suggested these fields from your existing full name. Please confirm they are correct before saving.
                </Text>
              ) : null}

              {/* Specialization Multi-Select */}
              <Text style={styles.inputLabel}>Specialization *</Text>
              <TouchableOpacity style={[styles.specDropdownBtn, profileErrors.specialization && styles.inputError]} onPress={() => setSpecDropdownOpen(!specDropdownOpen)} activeOpacity={0.8}>
                <Text style={styles.specDropdownValue} numberOfLines={1}>{editForm.specialization || 'Select specializations...'}</Text>
                {specDropdownOpen ? <ChevronUp size={16} color={theme.gold} /> : <ChevronDown size={16} color={theme.gold} />}
              </TouchableOpacity>
              {specDropdownOpen && (
                <View style={styles.specDropdownList}>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                    {SPECIALIZATIONS.map(spec => {
                      const currentSpecs = (editForm.specialization || '').split(',').map(s => s.trim()).filter(Boolean);
                      const isSelected = currentSpecs.includes(spec);
                      return (
                        <TouchableOpacity key={spec} style={styles.specDropdownItem} onPress={() => {
                          let updated;
                          if (isSelected) {
                            updated = currentSpecs.filter(s => s !== spec);
                          } else {
                            updated = [...currentSpecs, spec];
                          }
                          const next = { ...editForm, specialization: updated.join(', ') };
                          setEditForm(next);
                          setProfileErrors(prev => ({ ...prev, specialization: artistProfileErrors(next).specialization || '' }));
                        }}>
                          <Text style={[styles.specDropdownItemText, isSelected && { color: theme.gold, fontWeight: '700' }]}>{spec}</Text>
                          <View style={[styles.specCheckbox, isSelected && styles.specCheckboxActive]}>
                            {isSelected && <Check size={12} color={theme.backgroundDeep} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
              {!!profileErrors.specialization && <Text style={styles.fieldErrorText}>{profileErrors.specialization}</Text>}

              {!!saveError && <Text accessibilityRole="alert" style={styles.fieldErrorText}>{saveError}</Text>}
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading} activeOpacity={0.8}>
                <Text style={styles.saveBtnText}>Save Changes</Text>
                <View style={{ marginLeft: 8 }}><Check size={18} color={theme.backgroundDeep} /></View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={passwordModalVisible}
        animationType="slide"
        transparent
        onRequestClose={handlePasswordClose}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={handlePasswordClose} disabled={loading}>
                <X size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.passwordModalContent}
            >
              <View style={styles.passwordIntro}>
                <View style={styles.iconWrap}><Lock size={16} color={theme.gold} /></View>
                <Text style={styles.passwordIntroText}>Enter your current password, then create a secure new password.</Text>
              </View>
              {[
                { label: 'Current Password', key: 'current' },
                { label: 'New Password', key: 'new' },
                { label: 'Confirm Password', key: 'confirm' },
              ].map(f => (
                <View key={f.key}>
                  <Text style={styles.inputLabel}>{f.label}</Text>
                  <View style={[styles.passwordFieldWrap, pwdErrors[f.key] && styles.inputError]}>
                    <TextInput
                      style={[styles.input, styles.passwordInput]}
                      secureTextEntry={!showPassword[f.key]}
                      value={pwdForm[f.key]}
                      onChangeText={t => {
                        const next = { ...pwdForm, [f.key]: t };
                        setPwdForm(next);
                        const validation = artistPasswordErrors(next);
                        setPwdErrors(prev => ({ ...prev,
                          [f.key]: pwdTouched[f.key] || t ? validation[f.key] : '',
                          ...(f.key === 'new' && (pwdTouched.confirm || next.confirm) ? { confirm: validation.confirm } : {}),
                        }));
                      }}
                      onBlur={() => {
                        setPwdTouched(prev => ({ ...prev, [f.key]: true }));
                        setPwdErrors(prev => ({ ...prev, [f.key]: artistPasswordErrors(pwdForm)[f.key] }));
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholderTextColor={theme.textTertiary}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(p => ({ ...p, [f.key]: !p[f.key] }))}
                      style={styles.passwordVisibilityButton}
                    >
                      {showPassword[f.key] ? <EyeOff size={18} color={theme.textTertiary} /> : <Eye size={18} color={theme.textTertiary} />}
                    </TouchableOpacity>
                  </View>
                  {pwdErrors[f.key] ? <Text style={styles.fieldErrorText}>{pwdErrors[f.key]}</Text> : null}
                  {f.key === 'new' && artistPasswordRules(pwdForm.new).map(rule => (
                    <Text key={rule.label} style={[styles.fieldErrorText, { color: rule.met ? theme.success : theme.textSecondary }]}>
                      {rule.met ? '✓' : '○'} {rule.label}
                    </Text>
                  ))}
                </View>
              ))}

              {!!saveError && <Text accessibilityRole="alert" style={styles.fieldErrorText}>{saveError}</Text>}
              <TouchableOpacity style={styles.saveBtn} onPress={handlePasswordSave} disabled={loading} activeOpacity={0.8}>
                <Text style={styles.saveBtnText}>{loading ? 'Updating...' : 'Update Password'}</Text>
                {!loading && <View style={{ marginLeft: 8 }}><Check size={18} color={theme.backgroundDeep} /></View>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Alert Modal */}
      <Modal visible={alertModal.visible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { alignItems: 'center', width: '85%' }]}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: `${theme.gold}20`, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <ShieldAlert size={24} color={theme.gold} />
            </View>
            <Text style={{ ...typography.h3, color: theme.textPrimary, marginBottom: 8, textAlign: 'center' }}>{alertModal.title}</Text>
            <Text style={{ ...typography.body, color: theme.textSecondary, marginBottom: 24, textAlign: 'center' }}>{alertModal.message}</Text>
            <AnimatedTouchable style={[styles.saveBtn, { width: '100%' }]} onPress={() => {
              const onConfirm = alertModal.onConfirm;
              setAlertModal({ ...alertModal, visible: false, onConfirm: undefined });
              if (onConfirm) onConfirm();
            }}>
              <Text style={styles.saveBtnText}>{alertModal.onConfirm ? 'CONTINUE TO LOGIN' : 'OK'}</Text>
            </AnimatedTouchable>
          </View>
        </View>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal visible={logoutConfirmVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { alignItems: 'center', width: '85%' }]}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: `${theme.error}20`, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <LogOut size={24} color={theme.error} />
            </View>
            <Text style={{ ...typography.h3, color: theme.textPrimary, marginBottom: 8, textAlign: 'center' }}>Sign Out</Text>
            <Text style={{ ...typography.body, color: theme.textSecondary, marginBottom: 24, textAlign: 'center' }}>Are you sure you want to sign out?</Text>
            <View style={{ flexDirection: 'row', width: '100%' }}>
              <TouchableOpacity style={[styles.saveBtn, { flex: 1, backgroundColor: theme.surfaceLight, marginRight: 6 }]} onPress={() => setLogoutConfirmVisible(false)} activeOpacity={0.8}>
                <Text style={[styles.saveBtnText, { color: theme.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { flex: 1, backgroundColor: theme.error, marginLeft: 6 }]} onPress={() => { setLogoutConfirmVisible(false); onLogout(); }} activeOpacity={0.8}>
                <Text style={[styles.saveBtnText, { color: '#ffffff' }]}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scrollContent: { paddingBottom: 40 },
  header: {
    padding: 16, paddingTop: Platform.OS === 'ios' ? 20 : 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { ...typography.h2, color: theme.textPrimary },
  logoutBtn: { padding: 8 },
  profileCard: {
    alignItems: 'center', paddingVertical: 24,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  avatarBox: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: theme.surface,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    borderWidth: 3, borderColor: theme.gold,
  },
  avatarText: { fontSize: 34, color: theme.gold, fontWeight: '800' },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14,
    backgroundColor: theme.gold, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: theme.background,
  },
  name: { ...typography.h2, color: theme.textPrimary, marginBottom: 4 },
  email: { ...typography.body, color: theme.textSecondary, marginBottom: 14 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 8, backgroundColor: theme.surface,
    borderRadius: 20, borderWidth: 1, borderColor: theme.borderGold,
  },
  editBtnText: { ...typography.bodySmall, color: theme.gold, fontWeight: '600' },
  section: { marginTop: 16, paddingHorizontal: 16 },
  sectionTitle: { ...typography.h4, color: theme.textPrimary, marginBottom: 12 },
  detailsContainer: {
    backgroundColor: theme.surface, borderRadius: 16,
    borderWidth: 1, borderColor: theme.border, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.iconGoldBg, justifyContent: 'center', alignItems: 'center' },
  rowLabel: { ...typography.body, color: theme.textSecondary },
  rowValue: { ...typography.body, color: theme.textPrimary, fontWeight: '700' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalCard: { backgroundColor: theme.surface, borderRadius: 20, padding: 20, maxHeight: '85%', width: '100%', borderWidth: 1, borderColor: theme.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { ...typography.h3, color: theme.textPrimary },
  inputLabel: { ...typography.bodyXSmall, color: theme.textSecondary, fontWeight: '600', marginBottom: 4, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: theme.border, borderRadius: 12,
    padding: 12, ...typography.body, color: theme.textPrimary,
    backgroundColor: theme.surfaceLight,
  },
  specDropdownBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: theme.border, borderRadius: 12,
    padding: 12, backgroundColor: theme.surfaceLight,
  },
  specDropdownValue: { ...typography.body, color: theme.textPrimary },
  specDropdownList: {
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 12, marginTop: 4, overflow: 'hidden',
  },
  specDropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  specDropdownItemText: { ...typography.body, color: theme.textSecondary },
  specCheckbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: theme.border,
    justifyContent: 'center', alignItems: 'center',
  },
  specCheckboxActive: { backgroundColor: theme.gold, borderColor: theme.gold },
  passwordModalContent: { paddingBottom: 12 },
  passwordIntro: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.surfaceLight, borderRadius: 12, padding: 12,
  },
  passwordIntroText: { ...typography.bodySmall, color: theme.textSecondary, flex: 1, lineHeight: 19 },
  passwordFieldWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.border, borderRadius: 12, backgroundColor: theme.surfaceLight },
  passwordInput: { flex: 1, borderWidth: 0, paddingRight: 44 },
  passwordVisibilityButton: { position: 'absolute', right: 12, padding: 4 },
  inputError: { borderWidth: 1.5, borderColor: theme.error, borderRadius: 12 },
  fieldErrorText: { ...typography.bodyXSmall, color: theme.error, marginTop: 4 },
  nameHelperText: { ...typography.bodyXSmall, color: theme.textSecondary, marginTop: 6 },
  nameReviewText: {
    ...typography.bodyXSmall, color: theme.warning, lineHeight: 18,
    marginTop: 12, padding: 10, borderRadius: 10, backgroundColor: `${theme.warning}12`,
  },
  saveBtn: {
    marginTop: 24, backgroundColor: theme.gold, paddingVertical: 14,
    borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
  },
  saveBtnText: { ...typography.button, color: theme.backgroundDeep, fontSize: 16 },
});
