import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Axios from 'axios';
import {
    User, Mail, Palette, Save, Lock, Clock, Camera,
    Phone, Building, Eye, EyeOff, CheckCircle, AlertCircle, Edit2, X, FileText
} from 'lucide-react';
import ArtistSideNav from '../components/ArtistSideNav';
import ImageCropper from '../components/ImageCropper';
import './PortalStyles.css';
import './ArtistStyles.css';
import { API_URL } from '../config';
import { TATTOO_STYLES } from '../constants/tattooStyles';
import { getPhoneParts } from '../constants/countryCodes';
import CountryCodeSelect from '../components/CountryCodeSelect';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import { filterName, filterDigits, clampNumber } from '../utils/validation';
const PasswordStrengthMeter = ({ feedback }) => {
  const steps = [
    { met: feedback.hasMinLength, hint: 'At least 8 characters' },
    { met: feedback.hasNumber, hint: 'Add a number' },
    { met: feedback.hasUppercase && feedback.hasLowercase, hint: 'Add upper & lowercase letters' },
    { met: feedback.hasSymbol, hint: 'Add a special characters: !@#$%^&*()_+' }
  ];

  const score = steps.filter(s => s.met).length;
  const nextHint = steps.find(s => !s.met);

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
        {[0, 1, 2, 3].map((index) => (
          <div key={index} style={{
            flex: 1,
            height: '4px',
            borderRadius: '2px',
            backgroundColor: index < score ? '#be9055' : '#e2e8f0',
            transition: 'background-color 0.3s ease'
          }} />
        ))}
      </div>
      {nextHint && (
        <div style={{ fontSize: '0.7rem', color: '#ef4444', transition: 'color 0.2s' }}>
          {nextHint.hint}
        </div>
      )}
    </div>
  );
};

function ArtistProfile() {
    const [profile, setProfile] = useState({
        name: '',
        email: '',
        phone: '',
        studio_name: '',
        specialization: '',
        hourly_rate: 0,
        experience_years: 0,
        commission_rate: 0,
        profile_image: '',
        bio: ''
    });

    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [passwordFeedback, setPasswordFeedback] = useState({
        hasMinLength: false, hasUppercase: false, hasLowercase: false,
        hasNumber: false, hasSymbol: false
    });
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [errors, setErrors] = useState({});
    const navigate = useNavigate();
    const [cropperImage, setCropperImage] = useState(null);

    const validateArtistField = (name, value) => {
        let errorMsg = '';
        if (name === 'name') {
            if (!value.trim()) errorMsg = 'Artist name is required.';
            else if (value.trim().length < 2) errorMsg = 'Name must be at least 2 characters.';
        }
        if (name === 'experience_years') {
            const num = Number(value);
            if (isNaN(num) || num < 0) errorMsg = 'Experience must be 0 or more.';
            else if (num > 50) errorMsg = 'Experience cannot exceed 50 years.';
        }
        setErrors(prev => ({ ...prev, [name]: errorMsg }));
        return !errorMsg;
    };

    // Email change state
    const [emailModal, setEmailModal] = useState({ open: false, step: 'enterEmail', newEmail: '', emailError: '', otp: Array(6).fill(''), otpError: '', sending: false, confirming: false, resendTimer: 300, resendAttempts: 0, resending: false });
    const otpRefs = useRef([]);

    // Success modal state (replaces alert)
    const [successModal, setSuccessModal] = useState({ mounted: false, visible: false, message: '' });

    // Get the real logged-in user ID
    const [user] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });
    const artistId = user ? user.id : 1;

    useEffect(() => {
        const fetch = async () => {
            try {
                setLoading(true);
                const res = await Axios.get(`${API_URL}/api/artist/dashboard/${artistId}`);
                if (res.data.success) {
                    const data = res.data.artist;
                    setProfile({
                        name: data.name || '',
                        email: data.email || '',
                        phone: data.phone || '',
                        studio_name: data.studio_name || '',
                        specialization: data.specialization || '',
                        hourly_rate: data.hourly_rate || 0,
                        experience_years: data.experience_years || 0,
                        commission_rate: (data.commission_rate || 0) * 100,
                        profile_image: data.profile_image || '',
                        bio: data.bio || ''
                    });
                }
                setLoading(false);
            } catch (e) {
                console.error(e);
                setLoading(false);
            }
        };
        fetch();
    }, [artistId]);

    useEffect(() => {
        let interval;
        if (emailModal.open && emailModal.step === 'enterOtp' && emailModal.resendTimer > 0) {
            interval = setInterval(() => {
                setEmailModal(prev => ({ ...prev, resendTimer: prev.resendTimer - 1 }));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [emailModal.open, emailModal.step, emailModal.resendTimer]);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setMessage({ type: 'error', text: 'Only image files are allowed.' });
                return;
            }
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                setMessage({ type: 'error', text: 'Image size must be less than 5MB' });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setCropperImage(reader.result);
            };
            reader.readAsDataURL(file);
            e.target.value = '';
        }
    };

    const handleCropDone = (croppedBase64) => {
        setProfile(prev => ({ ...prev, profile_image: croppedBase64 }));
        setCropperImage(null);
        setMessage({ type: '', text: '' });
    };

    const handleCropCancel = () => {
        setCropperImage(null);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });
        setSaving(true);

        // Validation
        const nameValid = validateArtistField('name', profile.name);
        const expValid = validateArtistField('experience_years', profile.experience_years);
        if (!nameValid || !expValid) {
            setMessage({ type: 'error', text: 'Please fix the highlighted validation errors.' });
            setSaving(false);
            return;
        }

        if (profile.experience_years < 0 || profile.experience_years > 50) {
            setMessage({ type: 'error', text: 'Experience years must be between 0 and 50' });
            setSaving(false);
            return;
        }



        // Password validation
        if (showChangePassword) {
            if (passwords.newPassword) {
                if (passwords.newPassword !== passwords.confirmPassword) {
                    setMessage({ type: 'error', text: 'New passwords do not match' });
                    setSaving(false);
                    return;
                }
                const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
                if (passwords.newPassword.length < 8) {
                    setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
                    setSaving(false);
                    return;
                } else if (!strongRegex.test(passwords.newPassword)) {
                    setMessage({ type: 'error', text: 'Password needs uppercase, lowercase, number, and symbol' });
                    setSaving(false);
                    return;
                }
            }
        }

        try {
            // Update profile
            await Axios.put(`${API_URL}/api/artist/profile/${artistId}`, {
                name: profile.name,
                phone: profile.phone,
                studio_name: profile.studio_name,
                specialization: profile.specialization,
                experience_years: profile.experience_years,
                commission_rate: 0.30,
                profileImage: profile.profile_image,
                bio: profile.bio
            });

            // Change password if requested
            if (showChangePassword && passwords.newPassword) {
                const pwRes = await Axios.post(`${API_URL}/api/artist/change-password`, {
                    artistId,
                    currentPassword: passwords.currentPassword,
                    newPassword: passwords.newPassword
                });

                // If backend requires re-verification, show success modal
                if (pwRes.data.requireReverification) {
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                    setSuccessModal({ mounted: true, visible: false, message: 'Password changed successfully! A verification email has been sent. Please verify your email to log in again.' });
                    setTimeout(() => setSuccessModal(prev => ({ ...prev, visible: true })), 10);
                    return;
                }
            }

            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setShowChangePassword(false);

            // Re-fetch profile
            const res = await Axios.get(`${API_URL}/api/artist/dashboard/${artistId}`);
            if (res.data.success) {
                const data = res.data.artist;
                setProfile({
                    name: data.name || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    studio_name: data.studio_name || '',
                    specialization: data.specialization || '',
                    hourly_rate: data.hourly_rate || 0,
                    experience_years: data.experience_years || 0,
                    commission_rate: (data.commission_rate || 0) * 100,
                    profile_image: data.profile_image || '',
                    bio: data.bio || ''
                });
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Failed to update profile';
            setMessage({ type: 'error', text: errorMessage });
            console.error('Profile update error:', error);
        }
        setSaving(false);
    };

    const formatCurrency = (value) => {
        return `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <>
        <div className="portal-layout">
            <ArtistSideNav />
            <div className="portal-container artist-portal">
                <header className="portal-header">
                    <h1>Profile Settings</h1>
                </header>
                <div className="portal-content">
                    {loading ? (
                        <div className="no-data">Loading profile...</div>
                    ) : (
                        <div className="data-card" style={{ maxWidth: '960px', margin: '0 auto', width: '100%' }}>
                            <form onSubmit={handleSave}>
                                {/* Profile Picture Section */}
                                <div className="artist-profile-picture-section">
                                    <div style={{ position: 'relative', display: 'inline-block' }}>
                                        <div style={{
                                            width: '100px',
                                            height: '100px',
                                            borderRadius: '50%',
                                            backgroundColor: '#e2e8f0',
                                            overflow: 'hidden',
                                            border: '4px solid white',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                        }}>
                                            {profile.profile_image ? (
                                                <img
                                                    src={profile.profile_image}
                                                    alt="Profile"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    height: '100%',
                                                    color: '#94a3b8',
                                                    backgroundColor: '#cbd5e1'
                                                }}>
                                                    <User size={56} strokeWidth={1.5} />
                                                </div>
                                            )}
                                        </div>
                                        <label style={{
                                            position: 'absolute',
                                            bottom: '4px',
                                            right: '4px',
                                            backgroundColor: '#be9055',
                                            color: 'white',
                                            padding: '10px',
                                            borderRadius: '50%',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: '3px solid white',
                                            transition: 'transform 0.2s',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                        }}
                                        onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
                                        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                        >
                                            <Camera size={20} />
                                            <input
                                                type="file"
                                                accept="image/*"
                                                hidden
                                                onChange={handleImageUpload}
                                            />
                                        </label>
                                    </div>
                                    <p style={{ marginTop: '12px', fontSize: '0.9rem', color: '#64748b' }}>
                                        Click the camera icon to upload a new photo
                                    </p>
                                    <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                        Max size: 5MB. Recommended: 400x400px
                                    </p>
                                </div>

                                {/* Message Alert */}
                                {message.text && (
                                    <div style={{
                                        padding: '12px 16px',
                                        borderRadius: '8px',
                                        marginBottom: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
                                        color: message.type === 'success' ? '#166534' : '#991b1b',
                                        border: `1px solid ${message.type === 'success' ? '#86efac' : '#fca5a5'}`
                                    }}>
                                        {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                                        <span>{message.text}</span>
                                    </div>
                                )}

                                {/* Section 1: Personal Information */}
                                <div style={{
                                    borderBottom: '2px solid #f1f5f9',
                                    paddingBottom: '16px',
                                    marginBottom: '16px'
                                }}>
                                    <h3 style={{
                                        color: '#1e293b',
                                        fontSize: '1.1rem',
                                        fontWeight: '600',
                                        marginBottom: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <User size={20} color="#be9055" />
                                        Personal Information
                                    </h3>
                                    <div className="grid-2col" style={{ gap: '16px' }}>
                                        <div className="form-group">
                                            <label className="artist-profile-form-label"><User size={16} /> Artist Name <span style={{ color: '#ef4444' }}>*</span></label>
                                            <input
                                                type="text"
                                                className="form-input artist-profile-input"
                                                value={profile.name}
                                                onChange={e => {
                                                    const val = filterName(e.target.value).slice(0, 50);
                                                    setProfile({ ...profile, name: val });
                                                    validateArtistField('name', val);
                                                }}
                                                placeholder="Your full name"
                                                maxLength={50}
                                                style={{ border: errors.name ? '1px solid #ef4444' : undefined }}
                                            />
                                            {errors.name && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>{errors.name}</span>}
                                        </div>
                                        <div className="form-group">
                                            <label className="artist-profile-form-label"><Mail size={16} /> Email</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type="email"
                                                    className="form-input artist-profile-input"
                                                    value={profile.email}
                                                    disabled
                                                    style={{ backgroundColor: '#f1f5f9', color: '#64748b', paddingRight: '44px' }}
                                                />
                                                <button
                                                    type="button"
                                                    title="Change email address"
                                                    onClick={() => setEmailModal({ open: true, step: 'enterEmail', newEmail: '', emailError: '', otp: Array(6).fill(''), otpError: '', sending: false, confirming: false, resendTimer: 300, resendAttempts: 0, resending: false })}
                                                    style={{
                                                        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                                                        background: 'none', border: 'none', cursor: 'pointer',
                                                        color: '#be9055', display: 'flex', alignItems: 'center'
                                                    }}
                                                >
                                                    <Edit2 size={15} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="artist-profile-form-label"><Phone size={16} /> Phone Number</label>
                                            {(() => {
                                                const { code, currentNo } = getPhoneParts(profile.phone);
                                                return (
                                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                                        <CountryCodeSelect
                                                            value={code}
                                                            onChange={newCode => {
                                                                const { currentNo: num } = getPhoneParts(profile.phone);
                                                                setProfile({ ...profile, phone: newCode + num });
                                                            }}
                                                        />
                                                        <input
                                                            type="tel"
                                                            className="form-input artist-profile-input"
                                                            style={{ flex: 1 }}
                                                            value={currentNo}
                                                            onChange={e => {
                                                                const digits = filterDigits(e.target.value).slice(0, 11);
                                                                const { code: currentCode } = getPhoneParts(profile.phone);
                                                                setProfile({ ...profile, phone: currentCode + digits });
                                                            }}
                                                            placeholder="9123456789"
                                                            maxLength={11}
                                                        />
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        <div className="form-group">
                                            <label className="artist-profile-form-label"><Building size={16} /> Studio Name</label>
                                            <input
                                                type="text"
                                                className="form-input artist-profile-input"
                                                value={profile.studio_name || ''}
                                                onChange={e => setProfile({ ...profile, studio_name: e.target.value })}
                                                placeholder="Your studio or shop name"
                                                style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}
                                                disabled
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Professional Details */}
                                <div style={{
                                    borderBottom: '2px solid #f1f5f9',
                                    paddingBottom: '16px',
                                    marginBottom: '16px'
                                }}>
                                    <h3 style={{
                                        color: '#1e293b',
                                        fontSize: '1.1rem',
                                        fontWeight: '600',
                                        marginBottom: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <Palette size={20} color="#be9055" />
                                        Professional Details
                                    </h3>
                                    <div className="grid-2col" style={{ gap: '16px' }}>
                                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                            <label className="artist-profile-form-label"><Palette size={16} /> Specialization / Styles</label>
                                            <MultiSelectDropdown 
                                                options={TATTOO_STYLES}
                                                selectedStr={profile.specialization}
                                                onChange={(newVal) => setProfile({ ...profile, specialization: newVal })}
                                                placeholder="Select your primary specialization(s)"
                                            />
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginTop: '8px' }}>Choose the tattoo styles that best represent your work</span>
                                        </div>
                                        <div className="form-group">
                                            <label className="artist-profile-form-label"><Clock size={16} /> Years of Experience</label>
                                            <input
                                                type="number"
                                                className="form-input artist-profile-input"
                                                value={profile.experience_years}
                                                onChange={e => {
                                                    const val = clampNumber(e.target.value, 0, 50);
                                                    setProfile({ ...profile, experience_years: val });
                                                    validateArtistField('experience_years', val);
                                                }}
                                                min="0"
                                                max="50"
                                                style={{ border: errors.experience_years ? '1px solid #ef4444' : undefined }}
                                            />
                                            {errors.experience_years && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>{errors.experience_years}</span>}
                                        </div>
                                        {/* Commission rate hidden from artist profile — visible in Earnings page */}
                                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                            <label className="artist-profile-form-label"><FileText size={16} /> About Me / Bio</label>
                                            <textarea
                                                className="form-input artist-profile-input"
                                                value={profile.bio}
                                                onChange={e => setProfile({ ...profile, bio: e.target.value.slice(0, 1000) })}
                                                placeholder="Tell clients about your artistic journey, style philosophy, and what inspires your work..."
                                                maxLength={1000}
                                                rows={4}
                                                style={{
                                                    resize: 'vertical',
                                                    minHeight: '80px',
                                                    maxHeight: '200px',
                                                    fontFamily: 'inherit',
                                                    lineHeight: '1.6'
                                                }}
                                            />
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginTop: '8px' }}>
                                                {profile.bio.length}/1000 characters — This will appear on your public profile
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: Password & Security */}
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '16px',
                                        borderBottom: '2px solid #f1f5f9',
                                        paddingBottom: '16px'
                                    }}>
                                        <h3 style={{
                                            color: '#1e293b',
                                            fontSize: '1.1rem',
                                            fontWeight: '600',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <Lock size={20} color="#be9055" />
                                            Password & Security
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={() => setShowChangePassword(!showChangePassword)}
                                            style={{
                                                padding: '8px 16px',
                                                backgroundColor: showChangePassword ? '#f1f5f9' : '#be9055',
                                                color: showChangePassword ? '#475569' : 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontSize: '0.875rem',
                                                fontWeight: '500',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {showChangePassword ? 'Cancel' : 'Change Password'}
                                        </button>
                                    </div>

                                    {showChangePassword && (
                                        <div style={{
                                            padding: '20px',
                                            backgroundColor: '#f8fafc',
                                            borderRadius: '8px',
                                            animation: 'slideDown 0.3s ease-out'
                                        }}>
                                            <div style={{ marginBottom: '16px' }}>
                                                <div className="form-group">
                                                    <label className="artist-profile-form-label">
                                                        <Lock size={16} /> Current Password
                                                    </label>
                                                    <div style={{ position: 'relative' }}>
                                                        <input
                                                            type={showPassword ? 'text' : 'password'}
                                                            className="form-input artist-profile-input"
                                                            value={passwords.currentPassword}
                                                            onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })}
                                                            placeholder="Enter current password"
                                                            style={{ paddingRight: '40px' }}
                                                            maxLength={128}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            style={{
                                                                position: 'absolute',
                                                                right: '12px',
                                                                top: '50%',
                                                                transform: 'translateY(-50%)',
                                                                background: 'none',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                color: '#64748b'
                                                            }}
                                                        >
                                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid-2col" style={{ gap: '16px' }}>
                                                <div className="form-group">
                                                    <label className="artist-profile-form-label">
                                                        <Lock size={16} /> New Password
                                                    </label>
                                                    <div style={{ position: 'relative' }}>
                                                        <input
                                                            type={showNewPassword ? "text" : "password"}
                                                            className="form-input artist-profile-input"
                                                            value={passwords.newPassword}
                                                            onChange={e => {
                                                                const val = e.target.value.slice(0, 50);
                                                                setPasswords({ ...passwords, newPassword: val });
                                                                setPasswordFeedback({
                                                                    hasMinLength: val.length >= 8,
                                                                    hasUppercase: /[A-Z]/.test(val),
                                                                    hasLowercase: /[a-z]/.test(val),
                                                                    hasNumber: /[0-9]/.test(val),
                                                                    hasSymbol: /[@$!%*?&#]/.test(val)
                                                                });
                                                            }}
                                                            onFocus={() => setPasswordFocused(true)}
                                                            onBlur={() => { if (!passwords.newPassword) setPasswordFocused(false); }}
                                                            placeholder="Min. 8 characters"
                                                            style={{ paddingRight: '40px' }}
                                                            maxLength={128}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                                            style={{
                                                                position: 'absolute',right: '12px',top: '50%',transform: 'translateY(-50%)',
                                                                background: 'none',border: 'none',cursor: 'pointer',color: '#64748b'
                                                            }}
                                                        >
                                                            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="form-group">
                                                    <label className="artist-profile-form-label">
                                                        <Lock size={16} /> Confirm New Password
                                                    </label>
                                                    <div style={{ position: 'relative' }}>
                                                        <input
                                                            type={showConfirmPassword ? "text" : "password"}
                                                            className="form-input artist-profile-input"
                                                            value={passwords.confirmPassword}
                                                            onChange={e => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                                            placeholder="Re-enter new password"
                                                            style={{ paddingRight: '40px' }}
                                                            maxLength={128}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                            style={{
                                                                position: 'absolute',right: '12px',top: '50%',transform: 'translateY(-50%)',
                                                                background: 'none',border: 'none',cursor: 'pointer',color: '#64748b'
                                                            }}
                                                        >
                                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ overflow: 'hidden', maxHeight: passwordFocused ? '200px' : '0', opacity: passwordFocused ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease', marginTop: passwordFocused ? '4px' : '0' }}>
                                              <PasswordStrengthMeter feedback={passwordFeedback} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Save Button */}
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={saving}
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        backgroundColor: saving ? '#94a3b8' : '#be9055',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: saving ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        transition: 'background-color 0.2s'
                                    }}
                                >
                                    {saving ? (
                                        <>
                                            <div style={{
                                                width: '18px',
                                                height: '18px',
                                                border: '2px solid rgba(255,255,255,0.3)',
                                                borderTopColor: 'white',
                                                borderRadius: '50%',
                                                animation: 'spin 1s linear infinite'
                                            }} />
                                            Saving Changes...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={18} />
                                            Save All Changes
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Email Change Modal */}
        {emailModal.open && (
            <div
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                }}
                onClick={() => setEmailModal(prev => ({ ...prev, open: false }))}
            >
                <div
                    style={{
                        background: '#fff', borderRadius: '20px', padding: '36px 32px 28px',
                        maxWidth: '440px', width: '92%', boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
                        fontFamily: "'Inter', sans-serif"
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                        <div>
                            <h2 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>
                                {emailModal.step === 'enterEmail' ? 'Change Email Address' : 'Enter Verification Code'}
                            </h2>
                            <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                                {emailModal.step === 'enterEmail' ? 'Enter your new email address below' : `Code sent to ${profile.email}`}
                            </p>
                        </div>
                        <button onClick={() => setEmailModal(prev => ({ ...prev, open: false }))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}>
                            <X size={20} />
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '24px' }}>
                        {['enterEmail', 'enterOtp'].map((s, i) => (
                            <div key={s} style={{
                                flex: 1, height: '3px', borderRadius: '2px',
                                background: (emailModal.step === 'enterOtp' ? true : i === 0) ? '#be9055' : '#e2e8f0'
                            }} />
                        ))}
                    </div>
                    {emailModal.step === 'enterEmail' ? (
                        <>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>New Email Address</label>
                                <input
                                    type="email"
                                    autoFocus
                                    value={emailModal.newEmail}
                                    onChange={e => setEmailModal(prev => ({ ...prev, newEmail: e.target.value, emailError: '' }))}
                                    placeholder="you@example.com"
                                    style={{
                                        width: '100%', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem',
                                        border: emailModal.emailError ? '1.5px solid #ef4444' : '1.5px solid #e2e8f0',
                                        outline: 'none', boxSizing: 'border-box', color: '#1e293b', transition: 'border-color 0.2s'
                                    }}
                                    onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
                                />
                                {emailModal.emailError && (
                                    <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <AlertCircle size={13} /> {emailModal.emailError}
                                    </p>
                                )}
                                <p style={{ margin: '8px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                                    A 6-digit authorization code will be sent to your <strong>current</strong> email to confirm this change.
                                </p>
                            </div>
                            <button
                                type="button"
                                disabled={emailModal.sending}
                                onClick={async () => {
                                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                    if (!emailModal.newEmail.trim()) return setEmailModal(prev => ({ ...prev, emailError: 'Please enter an email address.' }));
                                    if (!emailRegex.test(emailModal.newEmail)) return setEmailModal(prev => ({ ...prev, emailError: 'Please enter a valid email address.' }));
                                    if (emailModal.newEmail.toLowerCase() === profile.email.toLowerCase()) return setEmailModal(prev => ({ ...prev, emailError: 'New email must be different from your current email.' }));
                                    setEmailModal(prev => ({ ...prev, sending: true, emailError: '' }));
                                    try {
                                        const res = await Axios.post(`${API_URL}/api/request-email-change`, { userId: artistId, newEmail: emailModal.newEmail });
                                        if (res.data.success) setEmailModal(prev => ({ ...prev, sending: false, step: 'enterOtp' }));
                                    } catch (err) {
                                        const msg = err.response?.data?.message || 'Failed to request email change.';
                                        setEmailModal(prev => ({ ...prev, sending: false, emailError: msg }));
                                    }
                                }}
                                style={{
                                    width: '100%', padding: '11px', borderRadius: '8px',
                                    backgroundColor: emailModal.sending ? '#f1c44a' : '#be9055',
                                    color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.9rem',
                                    cursor: emailModal.sending ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {emailModal.sending ? 'Sending Code...' : 'Send Authorization Code'}
                            </button>
                        </>
                    ) : (
                        <>
                            <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '24px', lineHeight: 1.6 }}>
                                Enter the 6-digit code sent to <strong style={{ color: '#1e293b' }}>{profile.email}</strong> to confirm changing your address to <strong style={{ color: '#be9055' }}>{emailModal.newEmail}</strong>.
                            </p>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '16px' }}>
                                {emailModal.otp.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        ref={el => otpRefs.current[idx] = el}
                                        type="tel"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 1);
                                            const newOtp = [...emailModal.otp];
                                            newOtp[idx] = val;
                                            setEmailModal(prev => ({ ...prev, otp: newOtp, otpError: '' }));
                                            if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Backspace' && !emailModal.otp[idx] && idx > 0) {
                                                otpRefs.current[idx - 1]?.focus();
                                            }
                                        }}
                                        onPaste={(e) => {
                                            e.preventDefault();
                                            const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
                                            if (pasted) {
                                                const newOtp = [...emailModal.otp];
                                                for (let i = 0; i < 6; i++) newOtp[i] = pasted[i] || '';
                                                setEmailModal(prev => ({ ...prev, otp: newOtp, otpError: '' }));
                                                const focusIdx = Math.min(pasted.length, 5);
                                                otpRefs.current[focusIdx]?.focus();
                                            }
                                        }}
                                        style={{
                                            width: '46px',
                                            height: '56px',
                                            textAlign: 'center',
                                            fontSize: '1.4rem',
                                            fontWeight: '700',
                                            borderRadius: '10px',
                                            border: digit ? '2px solid #be9055' : (emailModal.otpError ? '1.5px solid #ef4444' : '1.5px solid #e2e8f0'),
                                            backgroundColor: 'white',
                                            color: '#1e293b',
                                            outline: 'none',
                                            transition: 'border-color 0.2s',
                                            boxSizing: 'border-box'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = '#be9055'}
                                        onBlur={(e) => { if (!digit) e.target.style.borderColor = emailModal.otpError ? '#ef4444' : '#e2e8f0'; }}
                                    />
                                ))}
                            </div>
                            {emailModal.otpError && (
                                <p style={{ margin: '0 0 12px', fontSize: '0.78rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <AlertCircle size={13} /> {emailModal.otpError}
                                </p>
                            )}
                            <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                                {emailModal.resendTimer > 0 ? (
                                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                                        Resend code in {Math.floor(emailModal.resendTimer / 60)}:{(emailModal.resendTimer % 60).toString().padStart(2, '0')}
                                    </p>
                                ) : emailModal.resendAttempts >= 3 ? (
                                    <p style={{ fontSize: '0.8rem', color: '#ef4444', margin: 0, fontWeight: 500 }}>
                                        Maximum resend attempts reached. Please try again later.
                                    </p>
                                ) : (
                                    <button
                                        type="button"
                                        disabled={emailModal.resending}
                                        onClick={async () => {
                                            setEmailModal(prev => ({ ...prev, resending: true, otpError: '' }));
                                            try {
                                                const res = await Axios.post(`${API_URL}/api/request-email-change`, { userId: artistId, newEmail: emailModal.newEmail });
                                                if (res.data.success) {
                                                    setEmailModal(prev => ({ ...prev, resending: false, resendTimer: 300, resendAttempts: prev.resendAttempts + 1 }));
                                                }
                                            } catch (err) {
                                                const msg = err.response?.data?.message || 'Failed to resend code.';
                                                setEmailModal(prev => ({ ...prev, resending: false, otpError: msg }));
                                            }
                                        }}
                                        style={{
                                            background: 'none', border: 'none', color: '#be9055', fontSize: '0.8rem',
                                            fontWeight: 600, cursor: emailModal.resending ? 'not-allowed' : 'pointer',
                                            padding: 0, textDecoration: 'underline'
                                        }}
                                    >
                                        {emailModal.resending ? 'Resending...' : 'Didn\'t receive it? Resend Code'}
                                    </button>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                <button type="button"
                                    onClick={() => setEmailModal(prev => ({ ...prev, step: 'enterEmail', otp: Array(6).fill(''), otpError: '', resendTimer: 300, resendAttempts: 0 }))}
                                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                                >← Back</button>
                                <button type="button"
                                    disabled={emailModal.confirming || emailModal.otp.join('').length !== 6}
                                    onClick={async () => {
                                        setEmailModal(prev => ({ ...prev, confirming: true, otpError: '' }));
                                        try {
                                            const res = await Axios.post(`${API_URL}/api/confirm-email-change`, { userId: artistId, otp: emailModal.otp.join(''), newEmail: emailModal.newEmail });
                                            if (res.data.requireReverification) {
                                                localStorage.removeItem('user');
                                                localStorage.removeItem('token');
                                                setEmailModal(prev => ({ ...prev, open: false }));
                                                setSuccessModal({ mounted: true, visible: false, message: 'Email changed successfully! A verification link has been sent to your new address. Please verify to log in again.' });
                                                setTimeout(() => setSuccessModal(prev => ({ ...prev, visible: true })), 10);
                                            }
                                        } catch (err) {
                                            const msg = err.response?.data?.message || 'Invalid or expired code.';
                                            setEmailModal(prev => ({ ...prev, confirming: false, otpError: msg }));
                                        }
                                    }}
                                    style={{
                                        flex: 2, padding: '10px', borderRadius: '8px',
                                        backgroundColor: (emailModal.confirming || emailModal.otp.join('').length !== 6) ? '#6ee7b7' : '#059669',
                                        color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.85rem',
                                        cursor: (emailModal.confirming || emailModal.otp.join('').length !== 6) ? 'not-allowed' : 'pointer'
                                    }}
                                >{emailModal.confirming ? 'Confirming...' : 'Confirm Email Change'}</button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        )}

        {/* Security Change Success Modal */}
        {successModal.mounted && (
            <div
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15,23,42,0.55)',
                    backdropFilter: 'blur(6px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999,
                    opacity: successModal.visible ? 1 : 0,
                    transition: 'opacity 0.35s ease'
                }}
            >
                <div
                    style={{
                        background: 'rgba(255,255,255,0.95)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.5)',
                        borderRadius: '24px',
                        padding: '40px 36px 32px',
                        maxWidth: '420px',
                        width: '90%',
                        textAlign: 'center',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                        transform: successModal.visible ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(20px)',
                        transition: 'transform 0.35s ease, opacity 0.35s ease',
                        fontFamily: "'Inter', sans-serif"
                    }}
                >
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '50%',
                        background: 'rgba(193,154,107,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 20px'
                    }}>
                        <CheckCircle size={32} style={{ color: '#be9055' }} />
                    </div>
                    <h2 style={{ color: '#1e293b', fontSize: '1.25rem', fontWeight: 700, margin: '0 0 8px' }}>Security Update Complete</h2>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 28px' }}>
                        {successModal.message}
                    </p>
                    <button
                        onClick={() => {
                            setSuccessModal(prev => ({ ...prev, visible: false }));
                            setTimeout(() => {
                                window.location.href = '/login';
                            }, 350);
                        }}
                        style={{
                            width: '100%',
                            padding: '12px 24px',
                            backgroundColor: '#be9055',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'background-color 0.2s, transform 0.15s',
                            fontFamily: "'Inter', sans-serif"
                        }}
                        onMouseEnter={e => e.target.style.backgroundColor = '#b08a5c'}
                        onMouseLeave={e => e.target.style.backgroundColor = '#be9055'}
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        )}

        {/* 1:1 Image Cropper Modal */}
        {cropperImage && (
            <ImageCropper
                imageSrc={cropperImage}
                aspect={1}
                onCropDone={handleCropDone}
                onCancel={handleCropCancel}
            />
        )}
        </>
    );
}

export default ArtistProfile;
