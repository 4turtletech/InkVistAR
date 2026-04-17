import './CustomerStyles.css';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Axios from 'axios';
import { User, Mail, Phone, MapPin, Save, Edit2, X, FileText, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Camera } from 'lucide-react';
import './PortalStyles.css';
import { API_URL } from '../config';
import CustomerSideNav from '../components/CustomerSideNav';
import { getPhoneParts } from '../constants/countryCodes';
import CountryCodeSelect from '../components/CountryCodeSelect';

const PasswordStrengthMeter = ({ feedback }) => {
    const steps = [
        { met: feedback.hasMinLength, hint: 'New Password' },
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

function CustomerProfile() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const customerId = user ? user.id : null;

    const [profile, setProfile] = useState({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        location: user.location || '',
        preferences: user.notes || '',
        profile_image: user.profile_image || ''
    });
    const [isEditing, setIsEditing] = useState(false);
    const [originalProfile, setOriginalProfile] = useState(null);
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
    const navigate = useNavigate();

    // Email change state
    const [showChangeEmail, setShowChangeEmail] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [emailOtp, setEmailOtp] = useState('');
    const [emailOtpSent, setEmailOtpSent] = useState(false);
    const [emailChanging, setEmailChanging] = useState(false);

    // Success modal state (replaces alert)
    const [successModal, setSuccessModal] = useState({ mounted: false, visible: false, message: '' });

    useEffect(() => {
        const fetch = async () => {
            try {
                if (!customerId) return;
                setLoading(true);
                const res = await Axios.get(`${API_URL}/api/customer/profile/${customerId}`);
                if (res.data.success) {
                    setProfile({
                        name: res.data.profile.name || '',
                        email: res.data.profile.email || '',
                        phone: res.data.profile.phone || '',
                        location: res.data.profile.location || '',
                        preferences: res.data.profile.notes || '',
                        profile_image: res.data.profile.profile_image || ''
                    });
                }
                setLoading(false);
            } catch (e) {
                console.error(e);
                setLoading(false);
            }
        };
        fetch();
    }, [customerId]);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfile({ ...profile, profile_image: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });
        setSaving(true);

        // Profile validation
        if (!profile.name.trim()) {
            setMessage({ type: 'error', text: 'Name is required' });
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
            // Update profile details
            await Axios.put(`${API_URL}/api/customer/profile/${customerId}`, {
                ...profile,
                notes: profile.preferences,
                profileImage: profile.profile_image
            });

            // Change password if requested and new password is provided
            if (showChangePassword && passwords.newPassword) {
                const pwRes = await Axios.post(`${API_URL}/api/customer/change-password`, {
                    customerId,
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

            // Update localStorage with new profile image
            const updatedUser = { ...user, profile_image: profile.profile_image };
            localStorage.setItem('user', JSON.stringify(updatedUser));

            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setShowChangePassword(false);
            setIsEditing(false);
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Failed to update profile';
            setMessage({ type: 'error', text: errorMessage });
            console.error('Profile update error:', error);
        }
        setSaving(false);
    };

    return (
        <>
            <div className="portal-layout">
                <CustomerSideNav />
                <div className="portal-container customer-portal">
                    <header className="portal-header"><h1>My Profile</h1></header>
                    <div className="portal-content customer-st-252946b6" >
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
                        {loading ? <div className="no-data">Loading...</div> : (
                            <div className="data-card">
                                {!isEditing ? (
                                    <div className="profile-view">
                                        <div className="customer-st-97d05a8d" >
                                            <div className="customer-st-72b7213b" >
                                                <div style={{
                                                    width: '100px', height: '100px', borderRadius: '50%',
                                                    backgroundColor: '#f1f5f9', overflow: 'hidden',
                                                    border: '3px solid white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    {profile.profile_image ? (
                                                        <img className="customer-st-81466193" src={profile.profile_image} alt="Profile" />
                                                    ) : (
                                                        <span className="customer-st-f1b3ed19" >{profile.name.charAt(0)}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <h2 className="customer-st-f26d6ce7" >{profile.name}</h2>
                                                    <p className="customer-st-211acdfd" >
                                                        <Mail size={16} /> {profile.email}
                                                    </p>
                                                </div>
                                            </div>
                                            <button className="btn btn-secondary customer-st-929a545b" onClick={() => { setOriginalProfile({ ...profile }); setIsEditing(true); }} >
                                                <Edit2 size={16} /> Edit Profile
                                            </button>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                                            <div className="info-group">
                                                <label><Phone size={16} /> Phone Number</label>
                                                <p>{profile.phone || 'Not provided'}</p>
                                            </div>
                                            <div className="info-group">
                                                <label><MapPin size={16} /> Location</label>
                                                <p>{profile.location || 'Not provided'}</p>
                                            </div>
                                            <div className="info-group customer-st-d5e576b0" >
                                                <label><FileText size={16} /> Tattoo Preferences</label>
                                                <p>{profile.preferences || 'No preferences listed'}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSave}>
                                        {/* Profile Picture Upload Section */}
                                        <div className="customer-st-e48abace" >
                                            <div className="customer-st-7293b2f9" >
                                                <div style={{
                                                    width: '120px', height: '120px', borderRadius: '50%',
                                                    backgroundColor: '#e2e8f0', overflow: 'hidden',
                                                    border: '4px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    {profile.profile_image ? (
                                                        <img className="customer-st-81466193" src={profile.profile_image} alt="Profile" />
                                                    ) : (
                                                        <User size={48} color="#94a3b8" />
                                                    )}
                                                </div>
                                                <label style={{
                                                    position: 'absolute', bottom: '0', right: '0',
                                                    backgroundColor: '#daa520', color: 'white',
                                                    padding: '8px', borderRadius: '50%', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                                }}>
                                                    <Camera size={18} />
                                                    <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
                                                </label>
                                            </div>
                                            <p className="customer-st-75b1ab67" >Update profile picture</p>
                                        </div>

                                        <div className="customer-st-a65ac038" >
                                            <h2 className="customer-st-03930596" >Edit Profile</h2>
                                            <button type="button" className="close-btn" onClick={() => { if (originalProfile) setProfile(originalProfile); setIsEditing(false); }}><X size={24} /></button>
                                        </div>

                                        {/* Section 1: Personal Information */}
                                        <div className="customer-st-11391c33" >
                                            <h3 className="customer-st-001ffef5" >
                                                <User size={20} color="#daa520" />
                                                Personal Information
                                            </h3>
                                            <div className="customer-st-e66d54ba" >
                                                <div className="form-group">
                                                    <label style={formLabel}><User size={16} /> Name</label>
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        value={profile.name}
                                                        onChange={e => setProfile({ ...profile, name: e.target.value })}
                                                        style={inputStyle}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label style={formLabel}><Mail size={16} /> Email</label>
                                                    <input className="form-input customer-st-59f58c25" type="email" value={profile.email} disabled />
                                                    <button
                                                        type="button"
                                                        onClick={() => { setShowChangeEmail(!showChangeEmail); setEmailOtpSent(false); setNewEmail(''); setEmailOtp(''); }}
                                                        style={{
                                                            fontSize: '0.75rem', color: '#daa520', background: 'none', border: 'none',
                                                            cursor: 'pointer', padding: '4px 0', fontWeight: '600', textAlign: 'left'
                                                        }}
                                                    >
                                                        {showChangeEmail ? 'Cancel Email Change' : 'Change Email Address'}
                                                    </button>

                                                    {showChangeEmail && (
                                                        <div style={{ marginTop: '10px', padding: '16px', backgroundColor: '#fffbeb', borderRadius: '8px', border: '1px solid #fbbf24' }}>
                                                            {!emailOtpSent ? (
                                                                <>
                                                                    <div className="form-group" style={{ marginBottom: '10px' }}>
                                                                        <label style={{ ...formLabel, fontSize: '0.8rem' }}><Mail size={14} /> New Email Address</label>
                                                                        <input
                                                                            type="email"
                                                                            className="form-input"
                                                                            value={newEmail}
                                                                            onChange={e => setNewEmail(e.target.value)}
                                                                            placeholder="Enter new email address"
                                                                            style={inputStyle}
                                                                        />
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        disabled={emailChanging || !newEmail}
                                                                        onClick={async () => {
                                                                            setEmailChanging(true);
                                                                            try {
                                                                                const res = await Axios.post(`${API_URL}/api/request-email-change`, { userId: customerId, newEmail });
                                                                                if (res.data.success) {
                                                                                    setEmailOtpSent(true);
                                                                                    setMessage({ type: 'success', text: 'An authorization code has been sent to your current email address.' });
                                                                                }
                                                                            } catch (err) {
                                                                                setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to request email change' });
                                                                            }
                                                                            setEmailChanging(false);
                                                                        }}
                                                                        style={{
                                                                            width: '100%', padding: '10px', backgroundColor: '#daa520', color: 'white',
                                                                            border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem'
                                                                        }}
                                                                    >
                                                                        {emailChanging ? 'Sending...' : 'Send Authorization Code'}
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <p style={{ fontSize: '0.8rem', color: '#92400e', marginBottom: '10px', fontWeight: '500' }}>
                                                                        A 6-digit code was sent to <strong>{profile.email}</strong>. Enter it below to confirm the change.
                                                                    </p>
                                                                    <div className="form-group" style={{ marginBottom: '10px' }}>
                                                                        <input
                                                                            type="text"
                                                                            className="form-input"
                                                                            value={emailOtp}
                                                                            onChange={e => setEmailOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                                                            placeholder="Enter 6-digit code"
                                                                            maxLength={6}
                                                                            style={{ ...inputStyle, letterSpacing: '6px', textAlign: 'center', fontSize: '1.2rem', fontWeight: '700' }}
                                                                        />
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        disabled={emailChanging || emailOtp.length !== 6}
                                                                        onClick={async () => {
                                                                            setEmailChanging(true);
                                                                            try {
                                                                                const res = await Axios.post(`${API_URL}/api/confirm-email-change`, { userId: customerId, otp: emailOtp, newEmail });
                                                                                if (res.data.requireReverification) {
                                                                                    localStorage.removeItem('user');
                                                                                    localStorage.removeItem('token');
                                                                                    setSuccessModal({ mounted: true, visible: false, message: 'Email changed successfully! A verification link has been sent to your new email. Please verify to log in again.' });
                                                                                    setTimeout(() => setSuccessModal(prev => ({ ...prev, visible: true })), 10);
                                                                                    return;
                                                                                }
                                                                            } catch (err) {
                                                                                setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to confirm email change' });
                                                                            }
                                                                            setEmailChanging(false);
                                                                        }}
                                                                        style={{
                                                                            width: '100%', padding: '10px', backgroundColor: '#059669', color: 'white',
                                                                            border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem'
                                                                        }}
                                                                    >
                                                                        {emailChanging ? 'Confirming...' : 'Confirm Email Change'}
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="form-group">
                                                    <label style={formLabel}><Phone size={16} /> Phone</label>
                                                    <div className="customer-st-4557600f" style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                                        {(() => {
                                                            const { code, currentNo } = getPhoneParts(profile.phone);
                                                            return (
                                                                <>
                                                                    <CountryCodeSelect
                                                                        value={code}
                                                                        onChange={newCode => {
                                                                            const { currentNo: num } = getPhoneParts(profile.phone);
                                                                            setProfile({ ...profile, phone: newCode + num });
                                                                        }}
                                                                    />
                                                                    <input className="form-input customer-st-282aded5" type="tel"
                                                                        style={{ flex: 1 }}
                                                                        value={currentNo}
                                                                        onChange={e => {
                                                                            const digits = e.target.value.replace(/[^\d]/g, '');
                                                                            const { code: currentCode } = getPhoneParts(profile.phone);
                                                                            setProfile({ ...profile, phone: currentCode + digits });
                                                                        }}
                                                                        placeholder="9123456789" />
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                                <div className="form-group">
                                                    <label style={formLabel}><MapPin size={16} /> Location</label>
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        value={profile.location}
                                                        onChange={e => setProfile({ ...profile, location: e.target.value })}
                                                        placeholder="City, Country"
                                                        style={inputStyle}
                                                    />
                                                </div>
                                                <div className="form-group customer-st-d5e576b0" >
                                                    <label style={formLabel}><FileText size={16} /> Tattoo Preferences</label>
                                                    <textarea
                                                        className="form-input"
                                                        value={profile.preferences}
                                                        onChange={e => setProfile({ ...profile, preferences: e.target.value })}
                                                        placeholder="E.g. Realism, Blackwork, Sleeve ideas..."
                                                        rows="3"
                                                        style={inputStyle}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section 2: Password & Security */}
                                        <div className="customer-st-654b1414" >
                                            <div className="customer-st-cea57272" >
                                                <h3 className="customer-st-81119ad0" >
                                                    <Lock size={20} color="#daa520" />
                                                    Password & Security
                                                </h3>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowChangePassword(!showChangePassword)}
                                                    style={{
                                                        padding: '8px 16px',
                                                        backgroundColor: showChangePassword ? '#f1f5f9' : '#daa520',
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
                                                <div className="customer-st-7cf173a4" >
                                                    <div className="form-group">
                                                        <label style={formLabel}><Lock size={16} /> Current Password</label>
                                                        <div style={{ position: 'relative' }}>
                                                            <input
                                                                className="form-input"
                                                                type={showPassword ? 'text' : 'password'}
                                                                value={passwords.currentPassword}
                                                                onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })}
                                                                placeholder="Enter current password"
                                                                style={{ ...inputStyle, paddingRight: '40px' }}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowPassword(!showPassword)}
                                                                style={{
                                                                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                                                    background: 'none', border: 'none', cursor: 'pointer', color: '#64748b'
                                                                }}
                                                            >
                                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="customer-st-e66d54ba" style={{ display: 'flex', gap: '1rem' }} >
                                                        <div className="form-group" style={{ flex: 1 }}>
                                                            <label style={formLabel}><Lock size={16} /> New Password</label>
                                                            <div style={{ position: 'relative' }}>
                                                                <input
                                                                    type={showNewPassword ? "text" : "password"}
                                                                    className="form-input"
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
                                                                    style={{ ...inputStyle, paddingRight: '40px' }}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                                    style={{
                                                                        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                                                        background: 'none', border: 'none', cursor: 'pointer', color: '#64748b'
                                                                    }}
                                                                >
                                                                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="form-group" style={{ flex: 1 }}>
                                                            <label style={formLabel}><Lock size={16} /> Confirm New Password</label>
                                                            <div style={{ position: 'relative' }}>
                                                                <input
                                                                    type={showConfirmPassword ? "text" : "password"}
                                                                    className="form-input"
                                                                    value={passwords.confirmPassword}
                                                                    onChange={e => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                                                    placeholder="Re-enter new password"
                                                                    style={{ ...inputStyle, paddingRight: '40px' }}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                                    style={{
                                                                        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                                                        background: 'none', border: 'none', cursor: 'pointer', color: '#64748b'
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

                                        <div className="customer-st-9ef284c9" >
                                            <button className="btn btn-secondary customer-st-282aded5" type="button" onClick={() => { if (originalProfile) setProfile(originalProfile); setIsEditing(false); }} >
                                                Cancel
                                            </button>
                                            <button className="btn btn-primary customer-st-68632107" type="submit" disabled={saving} >
                                                {saving ? 'Saving...' : <><Save className="customer-st-b4fa5b5e" size={18} /> Save All Changes</>}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

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
                            <CheckCircle size={32} style={{ color: '#C19A6B' }} />
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
                                backgroundColor: '#C19A6B',
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
                            onMouseLeave={e => e.target.style.backgroundColor = '#C19A6B'}
                        >
                            Go to Login
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

// Inline styles
const formLabel = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#334155',
    marginBottom: '6px'
};

const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '0.95rem',
    color: '#1e293b',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box'
};

export default CustomerProfile;
