import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ActivityIndicator,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Moon,
  Phone,
  Shield,
  Sun,
  User,
  X,
} from 'lucide-react-native';
import { colors, shadows } from '../src/theme';
import { CAPTCHA_WEB_URL } from '../src/config';
import { useTheme } from '../src/context/ThemeContext';
import { useToast } from '../src/context/ToastContext';
import { useShakeAnimation } from '../src/utils/animations';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BG_IMAGES = [
  require('../assets/bg_tattoo_1.png'),
  require('../assets/bg_tattoo_2.png'),
  require('../assets/bg_tattoo_3.png'),
];

const PRESET_CONDITIONS = [
  'Diabetes',
  'Hypertension',
  'Heart Condition',
  'Epilepsy',
  'Keloid-prone Skin',
  'Psoriasis',
  'Eczema',
  'Hemophilia',
  'Pregnancy',
  'Immunocompromised',
  'Blood Thinners Medication',
];

const PRESET_ALLERGENS = [
  'Latex',
  'Nickel',
  'Tattoo Ink',
  'Penicillin',
  'Aspirin',
  'Ibuprofen',
  'Adhesive/Bandage',
];

const COUNTRY_CODES = [
  { code: '+63', label: 'Philippines (+63)' },
  { code: '+1', label: 'US/Canada (+1)' },
  { code: '+44', label: 'UK (+44)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+81', label: 'Japan (+81)' },
];

const filterName = (value) => value.replace(/[^a-zA-Z\s.'-]/g, '');
const filterDigits = (value) => value.replace(/\D/g, '');

const allowedPasswordSymbolRegex = /[!@#$%^&*()_+]/;
const invalidPasswordSymbolRegex = /[^A-Za-z0-9!@#$%^&*()_+]/g;

const getPasswordFeedback = (password) => ({
  hasMinLength: password.length >= 8,
  hasUppercase: /[A-Z]/.test(password),
  hasLowercase: /[a-z]/.test(password),
  hasNumber: /[0-9]/.test(password),
  hasSymbol: allowedPasswordSymbolRegex.test(password),
});

const getInvalidPasswordSymbols = (password) =>
  Array.from(new Set(password.match(invalidPasswordSymbolRegex) || []));

const strengthSteps = [
  { key: 'hasMinLength', hint: 'At least 8 characters' },
  { key: 'hasNumber', hint: 'Add a number' },
  { key: (feedback) => feedback.hasUppercase && feedback.hasLowercase, hint: 'Add upper & lowercase letters' },
  { key: 'hasSymbol', hint: 'Add a special character: !@#$%^&*()_+' },
];

export function RegisterPage({ onRegister, onSwitchToLogin }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    suffix: '',
    email: '',
    phone: '',
    phoneCode: '+63',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [passwordFeedback, setPasswordFeedback] = useState(getPasswordFeedback(''));
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [healthExpanded, setHealthExpanded] = useState(false);
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [selectedAllergens, setSelectedAllergens] = useState([]);
  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);
  const [captchaVisible, setCaptchaVisible] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [captchaRequestKey, setCaptchaRequestKey] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const bgOpacity = useRef(new Animated.Value(1)).current;
  const captchaHandledRef = useRef(false);
  const { shakeAnim, triggerShake } = useShakeAnimation();

  const { isDark, theme, toggleTheme } = useTheme();
  const { showToast } = useToast();

  const overlayColor = isDark ? 'rgba(15,13,14,0.88)' : 'rgba(248,250,252,0.88)';
  const strengthScore = useMemo(
    () => Object.values(passwordFeedback).filter(Boolean).length,
    [passwordFeedback],
  );
  const nextHint = useMemo(
    () =>
      strengthSteps.find((step) =>
        typeof step.key === 'function' ? !step.key(passwordFeedback) : !passwordFeedback[step.key],
      ),
    [passwordFeedback],
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, damping: 18, useNativeDriver: true }),
    ]).start();

    const bgInterval = setInterval(() => {
      Animated.timing(bgOpacity, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        setBgIndex((prev) => (prev + 1) % BG_IMAGES.length);
        Animated.timing(bgOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();
      });
    }, 5000);

    return () => clearInterval(bgInterval);
  }, [bgOpacity, fadeAnim, slideAnim]);

  useEffect(() => {
    if (!captchaVisible) return undefined;

    const timeout = setTimeout(() => {
      if (captchaHandledRef.current) return;
      captchaHandledRef.current = true;
      setCaptchaVisible(false);
      setCaptchaLoading(false);
      setSubmitted(false);
      showToast('CAPTCHA timed out. Check your connection and try again.', 'error');
    }, 20000);

    return () => clearTimeout(timeout);
  }, [captchaRequestKey, captchaVisible, showToast]);

  const validateField = (name, value, nextPassword = null) => {
    let errorMsg = '';

    if (name === 'firstName' && !value.trim()) errorMsg = 'First name is required';
    if (name === 'lastName' && !value.trim()) errorMsg = 'Last name is required';

    if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!value) errorMsg = 'Email is required';
      else if (!emailRegex.test(value)) errorMsg = 'Invalid email format';
    }

    if (name === 'phone') {
      if (!value) errorMsg = 'Phone number is required';
      else if (form.phoneCode === '+63' && !value.startsWith('9')) errorMsg = 'PH numbers must start with 9 (e.g. 9171234567)';
      else if (form.phoneCode === '+63' && value.length !== 10) errorMsg = 'Phone number must be exactly 10 digits (e.g. 9171234567)';
      else if (form.phoneCode !== '+63' && value.length < 7) errorMsg = 'Phone number is too short';
    }

    if (name === 'password') {
      const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z0-9!@#$%^&*()_+]{8,}$/;
      const invalidSymbols = getInvalidPasswordSymbols(value);

      if (!value) errorMsg = 'Password is required';
      else if (value.length < 8) errorMsg = 'Password must be at least 8 characters';
      else if (invalidSymbols.length > 0) errorMsg = `Contains unsupported symbols: ${invalidSymbols.join(', ')}`;
      else if (!strongRegex.test(value)) errorMsg = 'Needs uppercase, lowercase, number & symbol';
    }

    if (name === 'confirmPassword') {
      const passwordToMatch = nextPassword ?? form.password;
      if (!value) errorMsg = 'Confirm password is required';
      else if (value !== passwordToMatch) errorMsg = 'Passwords do not match';
    }

    setErrors((prev) => ({ ...prev, [name]: errorMsg }));
    return errorMsg === '';
  };

  const handleChange = (name, raw) => {
    let value = raw;

    if (name === 'firstName' || name === 'lastName') {
      value = filterName(raw).replace(/^\s+/, '').slice(0, 50);
    } else if (name === 'suffix') {
      value = raw.replace(/[^a-zA-Z.\s]/g, '').replace(/^\s+/, '').slice(0, 5);
    } else if (name === 'email') {
      value = raw.replace(/\s/g, '').slice(0, 254);
    } else if (name === 'phone') {
      value = filterDigits(raw).replace(/^0+/, '').slice(0, 10);
    } else if (name === 'password' || name === 'confirmPassword') {
      value = raw.slice(0, 128);
    }

    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === 'password') {
      const nextFeedback = getPasswordFeedback(value);
      setPasswordFeedback(nextFeedback);
      validateField('confirmPassword', form.confirmPassword, value);
    }

    validateField(name, value, name === 'password' ? value : null);
  };

  const handleBlur = (name) => {
    setFocusedField(null);
    if (name !== 'password') return validateField(name, form[name]);
    setPasswordFocused(false);
    return validateField(name, form[name]);
  };

  const validateForm = () => {
    const checks = [
      validateField('firstName', form.firstName),
      validateField('lastName', form.lastName),
      validateField('email', form.email),
      validateField('phone', form.phone),
      validateField('password', form.password),
      validateField('confirmPassword', form.confirmPassword),
    ];

    if (!agreedToTerms) {
      setErrors((prev) => ({ ...prev, terms: 'You must accept the Terms of Service' }));
      checks.push(false);
    } else {
      setErrors((prev) => ({ ...prev, terms: null }));
    }

    return checks.every(Boolean);
  };

  const completeRegistration = async (captchaToken) => {
    try {
      const orphanStr = await AsyncStorage.getItem('orphanAppointmentId');
      const orphanId = orphanStr ? parseInt(orphanStr, 10) : null;
      const fullPhone = `${form.phoneCode} ${form.phone.trim()}`;
      const fullName = [form.firstName.trim(), form.lastName.trim(), form.suffix.trim()]
        .filter(Boolean)
        .join(' ');

      const result = await onRegister(
        fullName,
        form.email.toLowerCase().trim(),
        form.password,
        fullPhone,
        'customer',
        orphanId,
        selectedConditions,
        selectedAllergens,
        captchaToken,
      );

      if (!result?.success) setSubmitted(false);
    } catch (error) {
      showToast(error?.message || 'Registration Failed', 'error');
      setSubmitted(false);
    }
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      triggerShake();
      return;
    }

    Keyboard.dismiss();
    captchaHandledRef.current = false;
    setSubmitted(true);
    setCaptchaLoading(true);
    setCaptchaRequestKey((current) => current + 1);
    setCaptchaVisible(true);
  };

  const cancelCaptcha = () => {
    if (captchaHandledRef.current) return;
    captchaHandledRef.current = true;
    setCaptchaVisible(false);
    setCaptchaLoading(false);
    setSubmitted(false);
  };

  const failCaptcha = (message = 'CAPTCHA could not load. Check your connection and try again.') => {
    if (captchaHandledRef.current) return;
    captchaHandledRef.current = true;
    setCaptchaVisible(false);
    setCaptchaLoading(false);
    setSubmitted(false);
    showToast(message, 'error');
  };

  const handleCaptchaMessage = async (event) => {
    if (captchaHandledRef.current) return;

    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload.type === 'captcha-error') {
        failCaptcha(payload.message || 'CAPTCHA verification failed. Please try again.');
        return;
      }
      if (payload.type !== 'captcha-token' || typeof payload.token !== 'string' || !payload.token.trim()) {
        return;
      }

      captchaHandledRef.current = true;
      setCaptchaVisible(false);
      setCaptchaLoading(false);
      await completeRegistration(payload.token.trim());
    } catch {
      failCaptcha('CAPTCHA returned an invalid response. Please try again.');
    }
  };

  const toggleTag = (setter, tag) => {
    setter((prev) => (prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]));
  };

  const renderInput = (key, placeholder, Icon, options = {}) => {
    const isFocused = focusedField === key;
    const hasError = !!errors[key];

    return (
      <View
        style={[
          styles.inputWrap,
          { backgroundColor: theme.darkBgSecondary, borderColor: theme.border },
          isFocused && { borderColor: theme.gold, backgroundColor: isDark ? '#1E1B1C' : '#FFFFFF' },
          hasError && { borderColor: theme.error },
          options.style,
        ]}
      >
        <Icon
          size={17}
          color={isFocused ? theme.gold : theme.textTertiary}
          style={styles.inputIcon}
        />

        {options.prefix ? (
          <TouchableOpacity
            onPress={options.onPrefixPress}
            disabled={!options.onPrefixPress}
            style={styles.prefixButton}
          >
            <Text
              style={[
                styles.phonePrefix,
                { color: theme.textSecondary, borderRightColor: theme.border },
              ]}
            >
              {options.prefix}
              {options.onPrefixPress ? ' ▾' : ''}
            </Text>
          </TouchableOpacity>
        ) : null}

        <TextInput
          style={[styles.input, { color: theme.textPrimary }]}
          placeholder={placeholder}
          placeholderTextColor={theme.textTertiary}
          value={form[key]}
          onChangeText={(value) => handleChange(key, value)}
          onFocus={() => {
            setFocusedField(key);
            if (key === 'password') setPasswordFocused(true);
          }}
          onBlur={() => handleBlur(key)}
          secureTextEntry={options.secure && !options.show}
          selectionColor={theme.gold}
          {...(options.extra || {})}
        />

        {options.secure ? (
          <TouchableOpacity onPress={options.toggle} style={styles.eyeBtn}>
            {options.show ? (
              <EyeOff size={17} color={theme.textTertiary} />
            ) : (
              <Eye size={17} color={theme.textTertiary} />
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundDeep }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.backgroundDeep}
      />

      <Animated.Image
        source={BG_IMAGES[bgIndex]}
        style={[styles.bgImage, { opacity: bgOpacity }]}
        blurRadius={2}
      />
      <View style={[styles.bgOverlay, { backgroundColor: overlayColor }]} />

      <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme}>
        {isDark ? (
          <Sun size={22} color={theme.textPrimary} />
        ) : (
          <Moon size={22} color={theme.textPrimary} />
        )}
      </TouchableOpacity>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.brandSection,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Text style={[styles.brandSubtitle, { color: theme.goldMuted }]}>BGC'S PREMIER STUDIO</Text>
            <Text style={[styles.brandTitle, { color: theme.gold }]}>INKVICTUS</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.formSection,
              { opacity: fadeAnim, transform: [{ translateX: shakeAnim }] },
            ]}
          >
            <Text style={[styles.welcomeText, { color: theme.textPrimary }]}>Create Account</Text>
            <Text style={[styles.welcomeSub, { color: theme.textSecondary }]}>
              Begin your tattoo journey today
            </Text>

            <View style={styles.nameRow}>
              <View style={styles.nameCol}>
                {renderInput('firstName', 'First Name', User, {
                  extra: { autoCapitalize: 'words' },
                })}
                {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}
              </View>

              <View style={styles.nameSpacer} />

              <View style={styles.nameCol}>
                {renderInput('lastName', 'Last Name', User, {
                  extra: { autoCapitalize: 'words' },
                })}
                {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>SUFFIX (OPTIONAL)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                {['None', 'Jr.', 'Sr.', 'II', 'III', 'IV'].map((option) => {
                  const value = option === 'None' ? '' : option;
                  const active = form.suffix === value;

                  return (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.pill,
                        { borderColor: theme.border },
                        active && { borderColor: theme.gold, backgroundColor: 'rgba(190,144,85,0.1)' },
                      ]}
                      onPress={() => handleChange('suffix', value)}
                    >
                      <Text
                        style={[
                          styles.pillTxt,
                          { color: theme.textSecondary },
                          active && { color: theme.gold, fontWeight: '700' },
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              {renderInput('email', 'Email address', Mail, {
                extra: { keyboardType: 'email-address', autoCapitalize: 'none' },
              })}
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              {renderInput('phone', '9XXXXXXXXX', Phone, {
                prefix: form.phoneCode,
                onPrefixPress: () => setShowPhoneDropdown(true),
                extra: {
                  keyboardType: 'number-pad',
                  returnKeyType: 'done',
                  maxLength: 10,
                  onSubmitEditing: Keyboard.dismiss,
                },
              })}
              {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              {renderInput('password', 'Create password', Lock, {
                secure: true,
                show: showPassword,
                toggle: () => setShowPassword((prev) => !prev),
              })}
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            {(passwordFocused || form.password.length > 0) && (
              <View style={styles.strengthSection}>
                <View style={styles.strengthBarRow}>
                  {[0, 1, 2, 3, 4].map((index) => (
                    <View
                      key={index}
                      style={[
                        styles.strengthSegment,
                        {
                          backgroundColor:
                            index < strengthScore
                              ? ['#3A3A3A', '#EF4444', '#F59E0B', '#3B82F6', '#22C55E', '#22C55E'][strengthScore]
                              : '#2B2B2B',
                        },
                      ]}
                    />
                  ))}
                </View>

                <View style={styles.strengthLabelRow}>
                  <Text
                    style={[
                      styles.strengthLabel,
                      { color: ['', '#EF4444', '#F59E0B', '#3B82F6', '#22C55E', '#22C55E'][strengthScore] },
                    ]}
                  >
                    {['', 'Weak', 'Fair', 'Good', 'Strong', 'Strong'][strengthScore]}
                  </Text>
                  {nextHint ? (
                    <Text style={[styles.strengthHint, { color: theme.textTertiary }]}>{nextHint.hint}</Text>
                  ) : null}
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              {renderInput('confirmPassword', 'Confirm password', Shield, {
                secure: true,
                show: showConfirmPassword,
                toggle: () => setShowConfirmPassword((prev) => !prev),
              })}
              {errors.confirmPassword ? (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.checkRow}
              activeOpacity={0.75}
              onPress={() => {
                const next = !agreedToTerms;
                setAgreedToTerms(next);
                setErrors((prev) => ({
                  ...prev,
                  terms: next ? null : 'You must accept the Terms of Service',
                }));
              }}
            >
              <View
                style={[
                  styles.checkbox,
                  { borderColor: theme.border },
                  agreedToTerms && { borderColor: theme.gold, backgroundColor: theme.gold },
                  errors.terms && { borderColor: theme.error },
                ]}
              >
                {agreedToTerms ? <Check size={11} color={colors.backgroundDeep} /> : null}
              </View>
              <Text style={[styles.checkLabel, { color: theme.textSecondary }]}>
                I agree to the <Text style={[styles.checkLink, { color: theme.gold }]}>Terms of Service</Text> and{' '}
                <Text style={[styles.checkLink, { color: theme.gold }]}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>
            {errors.terms ? (
              <Text style={[styles.errorText, styles.termsError]}>{errors.terms}</Text>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setHealthExpanded((prev) => !prev)}
              style={[
                styles.healthToggle,
                { backgroundColor: theme.darkBgSecondary, borderColor: theme.border },
              ]}
            >
              <View style={styles.healthToggleLeft}>
                <Shield size={15} color={theme.gold} />
                <Text style={[styles.healthTitle, { color: theme.textSecondary }]}>Health Info (Optional)</Text>
                {selectedConditions.length + selectedAllergens.length > 0 ? (
                  <View style={[styles.healthBadge, { backgroundColor: `${theme.gold}25` }]}>
                    <Text style={[styles.healthBadgeText, { color: theme.gold }]}>
                      {selectedConditions.length + selectedAllergens.length}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.healthToggleIcon, { color: theme.textTertiary }]}>
                {healthExpanded ? '−' : '+'}
              </Text>
            </TouchableOpacity>

            {healthExpanded ? (
              <View style={styles.healthSection}>
                <Text style={[styles.healthLabel, { color: theme.textTertiary }]}>Health Conditions</Text>
                <View style={styles.tagWrap}>
                  {PRESET_CONDITIONS.map((condition) => {
                    const active = selectedConditions.includes(condition);
                    return (
                      <TouchableOpacity
                        key={condition}
                        onPress={() => toggleTag(setSelectedConditions, condition)}
                        style={[
                          styles.tag,
                          {
                            borderColor: active ? theme.gold : 'rgba(150,150,150,0.3)',
                            backgroundColor: active ? `${theme.gold}18` : 'transparent',
                          },
                        ]}
                      >
                        <Text style={[styles.tagText, { color: active ? theme.gold : theme.textSecondary }]}>
                          {condition}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.healthLabel, styles.healthLabelSecondary, { color: theme.textTertiary }]}>
                  Known Allergens
                </Text>
                <View style={styles.tagWrap}>
                  {PRESET_ALLERGENS.map((allergen) => {
                    const active = selectedAllergens.includes(allergen);
                    return (
                      <TouchableOpacity
                        key={allergen}
                        onPress={() => toggleTag(setSelectedAllergens, allergen)}
                        style={[
                          styles.tag,
                          {
                            borderColor: active ? '#DC2626' : 'rgba(150,150,150,0.3)',
                            backgroundColor: active ? 'rgba(239,68,68,0.1)' : 'transparent',
                          },
                        ]}
                      >
                        <Text style={[styles.tagText, { color: active ? '#DC2626' : theme.textSecondary }]}>
                          {allergen}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                activeOpacity={1}
                disabled={submitted}
                onPress={handleSubmit}
                onPressIn={() => {
                  Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true }).start();
                }}
                onPressOut={() => {
                  Animated.spring(buttonScale, { toValue: 1, damping: 15, useNativeDriver: true }).start();
                }}
              >
                <View style={[styles.button, submitted && styles.buttonDisabled]}>
                  <Text style={styles.buttonText}>
                    {submitted ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
                  </Text>
                  {!submitted ? (
                    <ArrowRight size={17} color={colors.backgroundDeep} style={styles.buttonArrow} />
                  ) : null}
                </View>
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: theme.textSecondary }]}>Already have an account? </Text>
              <TouchableOpacity onPress={onSwitchToLogin}>
                <Text style={[styles.link, { color: theme.gold }]}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {showPhoneDropdown ? (
        <View style={styles.dropdownOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowPhoneDropdown(false)} />
          <View
            style={[
              styles.dropdownCard,
              { backgroundColor: theme.darkBgSecondary, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.dropdownTitle, { color: theme.textPrimary }]}>Select Country Code</Text>
            {COUNTRY_CODES.map((country, index) => (
              <TouchableOpacity
                key={country.code}
                style={[
                  styles.dropdownItem,
                  index !== COUNTRY_CODES.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                ]}
                onPress={() => {
                  setForm((prev) => ({ ...prev, phoneCode: country.code }));
                  setShowPhoneDropdown(false);
                }}
              >
                <Text style={[styles.dropdownLabel, { color: theme.textPrimary }]}>{country.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      <Modal
        visible={captchaVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={cancelCaptcha}
      >
        <View style={styles.captchaOverlay}>
          <View style={[styles.captchaCard, { backgroundColor: theme.darkBgSecondary, borderColor: theme.border }]}>
            <View style={styles.captchaHeader}>
              <View>
                <Text style={[styles.captchaTitle, { color: theme.textPrimary }]}>Security Check</Text>
                <Text style={[styles.captchaSubtitle, { color: theme.textSecondary }]}>Verifying you are not a bot...</Text>
              </View>
              <TouchableOpacity onPress={cancelCaptcha} accessibilityRole="button" accessibilityLabel="Cancel CAPTCHA">
                <X size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.captchaWebViewWrap}>
              <WebView
                key={captchaRequestKey}
                source={{ uri: `${CAPTCHA_WEB_URL}${CAPTCHA_WEB_URL.includes('?') ? '&' : '?'}request=${captchaRequestKey}` }}
                originWhitelist={['https://*']}
                javaScriptEnabled
                domStorageEnabled
                thirdPartyCookiesEnabled
                sharedCookiesEnabled
                setSupportMultipleWindows={false}
                onLoadStart={() => setCaptchaLoading(true)}
                onLoadEnd={() => setCaptchaLoading(false)}
                onMessage={handleCaptchaMessage}
                onError={() => failCaptcha()}
                onHttpError={() => failCaptcha('CAPTCHA service is temporarily unavailable. Please try again.')}
                style={styles.captchaWebView}
              />
              {captchaLoading ? (
                <View style={[styles.captchaLoader, { backgroundColor: theme.darkBgSecondary }]}>
                  <ActivityIndicator size="large" color={theme.gold} />
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.backgroundDeep },
  bgImage: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    resizeMode: 'cover',
  },
  bgOverlay: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  themeToggle: {
    position: 'absolute',
    top: 50,
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingTop: 60,
    paddingBottom: 40,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 4,
    marginBottom: 6,
  },
  brandTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 8,
  },
  formSection: {
    paddingBottom: 20,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  welcomeSub: {
    fontSize: 13,
    marginBottom: 20,
  },
  nameRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  nameCol: {
    flex: 1,
  },
  nameSpacer: {
    width: 8,
  },
  inputGroup: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  pillRow: {
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillTxt: {
    fontSize: 13,
    fontWeight: '500',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
  },
  inputIcon: {
    marginRight: 10,
  },
  prefixButton: {
    paddingRight: 6,
  },
  phonePrefix: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
    paddingRight: 8,
    borderRightWidth: 1,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
  },
  eyeBtn: {
    padding: 4,
  },
  errorText: {
    fontSize: 11,
    color: colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
  strengthSection: {
    marginTop: -6,
    marginBottom: 14,
  },
  strengthBarRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 6,
  },
  strengthSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  strengthLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  strengthHint: {
    fontSize: 11,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 18,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  checkLink: {
    fontWeight: '500',
  },
  termsError: {
    marginTop: -8,
    marginBottom: 12,
  },
  healthToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  healthToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  healthTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  healthBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  healthBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  healthToggleIcon: {
    fontSize: 18,
    lineHeight: 22,
  },
  healthSection: {
    marginBottom: 14,
  },
  healthLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  healthLabelSecondary: {
    marginTop: 8,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 12,
  },
  tag: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  button: {
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 18,
    ...shadows.button,
  },
  buttonDisabled: {
    backgroundColor: '#3A3A3A',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: colors.backgroundDeep,
  },
  buttonArrow: {
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 13,
  },
  link: {
    fontSize: 13,
    fontWeight: '600',
  },
  dropdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  dropdownCard: {
    width: '80%',
    borderRadius: 16,
    padding: 20,
    zIndex: 10000,
    borderWidth: 1,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  dropdownItem: {
    paddingVertical: 14,
  },
  dropdownLabel: {
    fontSize: 16,
  },
  captchaOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  captchaCard: {
    height: 230,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    overflow: 'hidden',
  },
  captchaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  captchaTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  captchaSubtitle: {
    fontSize: 12,
    marginTop: 3,
  },
  captchaWebViewWrap: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  captchaWebView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  captchaLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
