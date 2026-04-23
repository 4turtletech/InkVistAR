import React, { useState, useRef, useEffect } from 'react';
import Axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import { API_URL } from '../config';
import Navbar from '../components/Navbar';
import './Login.css';

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isLockedOut, setIsLockedOut] = useState(false);
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [errors, setErrors] = useState({}); // Field-specific inline errors
    const [showResend, setShowResend] = useState(false);
    const [resendMessage, setResendMessage] = useState({ text: '', type: 'error' });
    const [loading, setLoading] = useState(false);
    
    // Forgot Password States
    const [view, setView] = useState('login'); // 'login', 'forgot-email', 'forgot-otp', 'reset-password', 'verify-account'
    const [verificationEmail, setVerificationEmail] = useState('');
    const [resetEmail, setResetEmail] = useState("");
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const otpRefs = useRef([]);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
    const [resetPasswordFocused, setResetPasswordFocused] = useState(false);
    const [resetPwFeedback, setResetPwFeedback] = useState({
        hasMinLength: false, hasUppercase: false, hasLowercase: false,
        hasNumber: false, hasSymbol: false
    });

    // OTP resend cooldown state
    const [resendTimer, setResendTimer] = useState(300);
    const [resendAttempts, setResendAttempts] = useState(0);
    const [resending, setResending] = useState(false);

    // Success modal state
    const [successModal, setSuccessModal] = useState({ mounted: false, visible: false });

    // Timer countdown for OTP views
    useEffect(() => {
        if ((view === 'forgot-otp' || view === 'verify-account') && resendTimer > 0) {
            const interval = setInterval(() => setResendTimer(prev => prev - 1), 1000);
            return () => clearInterval(interval);
        }
    }, [view, resendTimer]);
    
    const navigate = useNavigate();

    const validateField = (name, value) => {
        let errorMsg = "";
        if (name === 'email' || name === 'resetEmail') {
            if (!value) errorMsg = "Email is required";
            else {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) errorMsg = "Please enter a valid email format";
            }
        }
        if (name === 'password' && !value) {
            errorMsg = "Password is required";
        }
        if (name === 'newPassword' && value) {
            const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
            if (value.length < 8) errorMsg = "Password must be at least 8 characters";
            else if (!strongRegex.test(value)) errorMsg = "Password needs uppercase, lowercase, number, and symbol";
        }
        if (name === 'confirmPassword' && value) {
            if (value !== newPassword) errorMsg = "Passwords do not match";
        }
        setErrors(prev => ({ ...prev, [name]: errorMsg }));
        return errorMsg === "";
    };

    const handleBlur = (e) => {
        validateField(e.target.name, e.target.value);
    };

    const handleChange = (setter, fieldName) => (e) => {
        let val = e.target.value;
        if (fieldName === 'email' || fieldName === 'resetEmail') {
            val = val.replace(/\s/g, ''); // Strip spaces in email
        } else if (fieldName === 'newPassword' || fieldName === 'confirmPassword') {
            val = val.slice(0, 50);
        }
        setter(val);
        if (failedAttempts > 0) setFailedAttempts(0);
        if (fieldName === 'newPassword') {
            setResetPwFeedback({
                hasMinLength: val.length >= 8,
                hasUppercase: /[A-Z]/.test(val),
                hasLowercase: /[a-z]/.test(val),
                hasNumber: /[0-9]/.test(val),
                hasSymbol: /[@$!%*?&#]/.test(val)
            });
        }
        validateField(fieldName, val);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        const isEmailValid = validateField('email', email);
        const isPasswordValid = validateField('password', password);
        if (!isEmailValid || !isPasswordValid) return;

        setError("");
        setIsLockedOut(false);
        setShowResend(false);
        setResendMessage({ text: '' });
        setLoading(true);
        try {
            const orphanAppointmentId = sessionStorage.getItem('orphanAppointmentId');
            const response = await Axios.post(`${API_URL}/api/login`, {
                email: email,
                password: password,
                orphanAppointmentId: orphanAppointmentId
            });

            if (response.data.success) {
                localStorage.setItem('user', JSON.stringify(response.data.user));
                const user = response.data.user;

                // Clear any guest chat session data so logged-in users start fresh
                sessionStorage.removeItem('chat_sessionId');
                sessionStorage.removeItem('chat_botMessages');
                sessionStorage.removeItem('chat_humanMessages');
                sessionStorage.removeItem('chat_isHumanMode');

                // Store migration count for the customer portal to pick up
                if (response.data.migratedAppointments > 0) {
                    localStorage.setItem('migratedAppointments', response.data.migratedAppointments);
                }
                
                const role = user.type;
                if (role === 'admin') navigate('/admin/dashboard', { replace: true });
                else if (role === 'manager') navigate('/manager', { replace: true });
                else if (role === 'artist') navigate('/artist', { replace: true });
                else {
                    const pendingBooking = sessionStorage.getItem('pendingBooking');
                    if (sessionStorage.getItem('orphanAppointmentId')) {
                        sessionStorage.removeItem('orphanAppointmentId');
                        navigate('/customer', { replace: true });
                    }
                    else if (pendingBooking) {
                        navigate('/customer/book', { replace: true });
                    } else {
                        navigate('/customer', { replace: true });
                    }
                }
            }
        } catch (error) {
            const errData = error.response?.data;
            if (errData?.lockedOut) {
                setError(errData.message);
                setIsLockedOut(true);
            } else if (errData?.requireVerification && errData?.verificationEmail) {
                // Auto-send OTP and route to verify-account view
                setVerificationEmail(errData.verificationEmail);
                setError('');
                setOtp(['', '', '', '', '', '']);
                try {
                    await Axios.post(`${API_URL}/api/send-otp`, {
                        email: errData.verificationEmail,
                        purpose: 'account-verification'
                    });
                    setResendTimer(300);
                    setResendAttempts(0);
                    setView('verify-account');
                } catch (otpErr) {
                    setError('Failed to send verification OTP. Please try again.');
                }
            } else {
                const attempts = errData?.failedAttempts || 0;
                setFailedAttempts(attempts);
                setPassword("");
                
                if (errData?.requireVerification) {
                    setShowResend(true);
                    setError(errData?.message || "Error logging in");
                } else {
                    setError('');
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResendVerification = async () => {
        setResendMessage({ text: 'Sending...', type: 'info' });
        try {
            const response = await Axios.post(`${API_URL}/api/resend-verification`, { email });
            if (response.data.success) {
                setResendMessage({ text: "Verification email sent! Please check your inbox.", type: 'success' });
            } else {
                setResendMessage({ text: response.data.message || "Failed to resend email.", type: 'error' });
            }
        } catch (err) {
            setResendMessage({ 
                text: err.response?.data?.message || "An error occurred.",
                type: 'error'
            });
        }
    };

    const sendResetOTP = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const response = await Axios.post(`${API_URL}/api/send-otp`, {
                email: resetEmail
            });
            if (response.data.success) {
                setResendTimer(300);
                setResendAttempts(0);
                setView('forgot-otp');
            } else {
                setError(response.data.message);
            }
        } catch (error) {
            setError("Error sending OTP");
        } finally {
            setLoading(false);
        }
    };

    const verifyResetOTP = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const response = await Axios.post(`${API_URL}/api/verify-otp`, {
                email: resetEmail,
                otp: otp.join('')
            });
            if (response.data.success) {
                setView('reset-password');
            } else {
                setError('Incorrect OTP');
                setOtp(['', '', '', '', '', '']);
                otpRefs.current[0]?.focus();
            }
        } catch (error) {
            setError('Incorrect OTP');
            setOtp(['', '', '', '', '', '']);
            otpRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        setError("");
        
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
        if (!strongRegex.test(newPassword)) {
            setError("Password needs uppercase, lowercase, number, and special character.");
            return;
        }

        setLoading(true);
        try {
            const response = await Axios.post(`${API_URL}/api/reset-password`, {
                email: resetEmail,
                newPassword: newPassword
            });
            if (response.data.success) {
                setResetEmail("");
                setOtp(['', '', '', '', '', '']);
                setNewPassword("");
                setConfirmPassword("");
                setSuccessModal({ mounted: true, visible: false });
                setTimeout(() => setSuccessModal({ mounted: true, visible: true }), 10);
            } else {
                setError(response.data.message);
            }
        } catch (error) {
            setError(error.response?.data?.message || "Error resetting password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar />

            <div className="login-page-wrapper" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="login-card" style={{ width: '90%', maxWidth: '520px', margin: '0 auto' }}>
                <div className="login-header">
                    <h1 className="login-logo" style={{ fontSize: '1.2rem' }}>INKVICTUS TATTOO</h1>
                    <p className="login-tagline">BGC’s Premier Luxury Tattoo Studio</p>
                </div>
                
                {view === 'login' && (
                    <>
                    <h2 className="login-title" style={{ fontSize: '1.1rem', marginTop: '1.5rem' }}>Login</h2>
                    {error && <p className="error-message">{error}</p>}
                    {showResend && (
                        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                            <button type="button" onClick={handleResendVerification} style={{background: 'none', border: 'none', color: '#be9055', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', textDecoration: 'underline'}}>
                                Resend Verification Email
                            </button>
                            {resendMessage.text && (
                                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: resendMessage.type === 'success' ? '#10b981' : '#ef4444' }}>
                                    {resendMessage.text}
                                </p>
                            )}
                        </div>
                    )}
                    
                    <form onSubmit={handleLogin} className="login-form">
                        <div className="form-group" style={{ position: 'relative' }}>
                            <input 
                                type="email" 
                                name="email"
                                className={`form-input ${errors.email ? 'error' : ''}`} 
                                placeholder="Email Address"
                                value={email}
                                onChange={handleChange(setEmail, 'email')} maxLength={254}
                                onBlur={handleBlur}
                                required 
                            />
                            {errors.email && <small style={{color: '#ef4444', display: 'block', marginTop: '4px', fontSize: '0.8rem'}}>{errors.email}</small>}
                        </div>
                        <div className="form-group" style={{ position: 'relative' }}>
                            <input 
                                type={showPassword ? 'text' : 'password'} 
                                name="password"
                                className={`form-input ${errors.password ? 'error' : ''}`} 
                                placeholder="Password"
                                value={password}
                                onChange={handleChange(setPassword, 'password')} maxLength={128}
                                onBlur={handleBlur}
                                required 
                            />
                            <div className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </div>
                            {errors.password && <small style={{color: '#ef4444', display: 'block', marginTop: '4px', fontSize: '0.8rem'}}>{errors.password}</small>}
                            {failedAttempts > 0 && <small style={{color: '#ef4444', display: 'block', marginTop: '6px', fontSize: '0.8rem'}}>Email or password is incorrect. {failedAttempts} incorrect attempt{failedAttempts === 1 ? '' : 's'}.</small>}
                        </div>
                        <button type="submit" className="login-btn" disabled={loading}>
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>

                    <div className="login-footer">
                        <p>Don't have an account? <Link to="/register">Register now</Link>.</p>
                        <p style={{ marginTop: '0.5rem' }}>
                            <button type="button" onClick={() => { setView('forgot-email'); setError(''); setIsLockedOut(false); }} style={{
                                background: isLockedOut ? 'rgba(239, 68, 68, 0.15)' : 'none', 
                                border: 'none',
                                padding: isLockedOut ? '4px 8px' : '0',
                                borderRadius: isLockedOut ? '4px' : '0',
                                color: '#be9055', 
                                cursor: 'pointer', 
                                fontWeight: '600', 
                                fontSize: '0.9rem',
                                transition: 'all 0.3s ease'
                            }}>
                                {isLockedOut ? 'Change Password to Unlock Account' : 'Forgot Password?'}
                            </button>
                        </p>
                    </div>
                    </>
                )}

                {view === 'forgot-email' && (
                    <>
                    <h2 className="login-title" style={{ fontSize: '1.1rem', marginTop: '1.5rem' }}>Reset Password</h2>
                    {error && <p className="error-message">{error}</p>}
                    <form onSubmit={sendResetOTP} className="login-form">
                        <div className="form-group" style={{ position: 'relative' }}>
                            <input type="email" name="resetEmail" className={`form-input ${errors.resetEmail ? 'error' : ''}`} placeholder="Enter your email" value={resetEmail} onChange={handleChange(setResetEmail, 'resetEmail')} onBlur={handleBlur} required maxLength={254} />
                            {errors.resetEmail && <small style={{color: '#ef4444', display: 'block', marginTop: '4px', fontSize: '0.8rem'}}>{errors.resetEmail}</small>}
                        </div>
                        <button type="submit" className="login-btn" disabled={loading}>{loading ? 'Sending...' : 'Send OTP'}</button>
                        <div className="login-footer">
                            <button type="button" onClick={() => { setView('login'); setError(''); }} style={{background: 'none', border: 'none', color: '#999', cursor: 'pointer'}}>Back to Login</button>
                        </div>
                    </form>
                    </>
                )}

                {view === 'forgot-otp' && (
                    <>
                    <h2 className="login-title" style={{ fontSize: '1.1rem', marginTop: '1.5rem' }}>Verify OTP</h2>
                    {error && <p className="error-message">{error}</p>}
                    <form onSubmit={verifyResetOTP} className="login-form">
                        <div className="form-group">
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                {otp.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        ref={el => otpRefs.current[idx] = el}
                                        type="tel"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 1);
                                            const newOtp = [...otp];
                                            newOtp[idx] = val;
                                            setOtp(newOtp);
                                            if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
                                                otpRefs.current[idx - 1]?.focus();
                                            }
                                        }}
                                        onPaste={(e) => {
                                            e.preventDefault();
                                            const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
                                            if (pasted) {
                                                const newOtp = [...otp];
                                                for (let i = 0; i < 6; i++) newOtp[i] = pasted[i] || '';
                                                setOtp(newOtp);
                                                const focusIdx = Math.min(pasted.length, 5);
                                                otpRefs.current[focusIdx]?.focus();
                                            }
                                        }}
                                        style={{
                                            width: '44px',
                                            height: '52px',
                                            textAlign: 'center',
                                            fontSize: '1.4rem',
                                            fontWeight: '700',
                                            borderRadius: '10px',
                                            border: digit ? '2px solid #be9055' : '1px solid #ddd',
                                            backgroundColor: 'white',
                                            color: '#1e293b',
                                            outline: 'none',
                                            transition: 'border-color 0.2s'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = '#be9055'}
                                        onBlur={(e) => { if (!digit) e.target.style.borderColor = '#ddd'; }}
                                    />
                                ))}
                            </div>
                        </div>
                        <p style={{ textAlign: 'center', fontSize: '0.78rem', color: '#94a3b8', margin: '12px 0 4px', lineHeight: 1.5 }}>
                            📧 Please also check your <strong>Spam</strong> or <strong>Junk</strong> folder.
                        </p>
                        <button type="submit" className="login-btn" disabled={loading || otp.join('').length < 6}>{loading ? 'Verifying...' : 'Verify OTP'}</button>
                        <div className="login-footer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            {resendTimer > 0 ? (
                                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                                    Resend code in {Math.floor(resendTimer / 60)}:{(resendTimer % 60).toString().padStart(2, '0')}
                                </p>
                            ) : resendAttempts >= 3 ? (
                                <p style={{ fontSize: '0.8rem', color: '#ef4444', margin: 0, fontWeight: 500 }}>
                                    Maximum resend attempts reached. Please try again later.
                                </p>
                            ) : (
                                <button type="button" disabled={resending} onClick={async () => {
                                    setResending(true);
                                    setError('');
                                    try {
                                        await Axios.post(`${API_URL}/api/send-otp`, { email: resetEmail });
                                        setResendTimer(300);
                                        setResendAttempts(prev => prev + 1);
                                        setOtp(['', '', '', '', '', '']);
                                        otpRefs.current[0]?.focus();
                                    } catch (err) {
                                        setError('Failed to resend OTP.');
                                    } finally {
                                        setResending(false);
                                    }
                                }} style={{background: 'none', border: 'none', color: '#be9055', cursor: resending ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '0.85rem', textDecoration: 'underline', padding: 0}}>
                                    {resending ? 'Resending...' : "Didn't receive it? Resend Code"}
                                </button>
                            )}
                            <button type="button" onClick={() => { setView('forgot-email'); setError(''); }} style={{background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '0.85rem'}}>Back</button>
                        </div>
                    </form>
                    </>
                )}

                {view === 'reset-password' && (
                    <>
                    <h2 className="login-title" style={{ fontSize: '1.1rem', marginTop: '1.5rem' }}>New Password</h2>
                    {error && <p className="error-message">{error}</p>}
                    <form onSubmit={handlePasswordReset} className="login-form">
                        <div className="form-group" style={{ position: 'relative' }}>
                            <input type={showNewPassword ? 'text' : 'password'} name="newPassword" className={`form-input ${errors.newPassword ? 'error' : ''}`} placeholder="New Password" value={newPassword} onChange={handleChange(setNewPassword, 'newPassword')} onFocus={() => setResetPasswordFocused(true)} onBlur={(e) => { handleBlur(e); if (!newPassword) setResetPasswordFocused(false); }} onPaste={(e) => e.preventDefault()} required maxLength={128} />
                            <div className="password-toggle" onClick={() => setShowNewPassword(!showNewPassword)}>
                                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </div>
                            {errors.newPassword && <small style={{color: '#ef4444', display: 'block', marginTop: '4px', fontSize: '0.8rem'}}>{errors.newPassword}</small>}
                        </div>
                        <div className="form-group" style={{ position: 'relative' }}>
                            <input type={showConfirmNewPassword ? 'text' : 'password'} name="confirmPassword" className={`form-input ${errors.confirmPassword ? 'error' : ''}`} placeholder="Confirm Password" value={confirmPassword} onChange={handleChange(setConfirmPassword, 'confirmPassword')} onBlur={handleBlur} onPaste={(e) => e.preventDefault()} required maxLength={128} />
                            <div className="password-toggle" onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}>
                                {showConfirmNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </div>
                            {errors.confirmPassword && <small style={{color: '#ef4444', display: 'block', marginTop: '4px', fontSize: '0.8rem'}}>{errors.confirmPassword}</small>}
                        </div>
                        {/* Password Strength Meter */}
                        <div style={{ overflow: 'hidden', maxHeight: resetPasswordFocused ? '200px' : '0', opacity: resetPasswordFocused ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease', marginTop: resetPasswordFocused ? '4px' : '0', marginBottom: '1rem' }}>
                            <div>
                                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                                    {[resetPwFeedback.hasMinLength, resetPwFeedback.hasNumber, resetPwFeedback.hasUppercase && resetPwFeedback.hasLowercase, resetPwFeedback.hasSymbol].map((met, i) => (
                                        <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', backgroundColor: met ? '#be9055' : '#e2e8f0', transition: 'background-color 0.3s ease' }} />
                                    ))}
                                </div>
                                {(() => {
                                    const steps = [
                                        { met: resetPwFeedback.hasMinLength, hint: 'At least 8 characters' },
                                        { met: resetPwFeedback.hasNumber, hint: 'Add a number' },
                                        { met: resetPwFeedback.hasUppercase && resetPwFeedback.hasLowercase, hint: 'Add upper & lowercase letters' },
                                        { met: resetPwFeedback.hasSymbol, hint: 'Add a special characters: !@#$%^&*()_+' }
                                    ];
                                    const nextHint = steps.find(s => !s.met);
                                    return nextHint ? <div style={{ fontSize: '0.7rem', color: '#ef4444' }}>{nextHint.hint}</div> : null;
                                })()}
                            </div>
                        </div>
                        <button type="submit" className="login-btn" disabled={loading}>
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                    </>
                )}

                {view === 'verify-account' && (
                    <>
                    <h2 className="login-title" style={{ fontSize: '1.1rem', marginTop: '1.5rem' }}>Verify Your Account</h2>
                    <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                        An OTP has been sent to <strong>{verificationEmail}</strong>.
                        Please enter it below to activate your account.
                    </p>
                    {error && <p className="error-message">{error}</p>}
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        setError('');
                        setLoading(true);
                        try {
                            const response = await Axios.post(`${API_URL}/api/verify-otp`, {
                                email: verificationEmail,
                                otp: otp.join(''),
                                purpose: 'account-verification'
                            });
                            if (response.data.success) {
                                setSuccessModal({ mounted: true, visible: false });
                                setTimeout(() => setSuccessModal({ mounted: true, visible: true }), 10);
                            } else {
                                setError('Incorrect OTP. Please try again.');
                                setOtp(['', '', '', '', '', '']);
                                otpRefs.current[0]?.focus();
                            }
                        } catch (err) {
                            setError('Incorrect OTP. Please try again.');
                            setOtp(['', '', '', '', '', '']);
                            otpRefs.current[0]?.focus();
                        } finally {
                            setLoading(false);
                        }
                    }} className="login-form">
                        <div className="form-group">
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                {otp.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        ref={el => otpRefs.current[idx] = el}
                                        type="tel"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 1);
                                            const newOtp = [...otp];
                                            newOtp[idx] = val;
                                            setOtp(newOtp);
                                            if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
                                                otpRefs.current[idx - 1]?.focus();
                                            }
                                        }}
                                        onPaste={(e) => {
                                            e.preventDefault();
                                            const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
                                            if (pasted) {
                                                const newOtp = [...otp];
                                                for (let i = 0; i < 6; i++) newOtp[i] = pasted[i] || '';
                                                setOtp(newOtp);
                                                const focusIdx = Math.min(pasted.length, 5);
                                                otpRefs.current[focusIdx]?.focus();
                                            }
                                        }}
                                        style={{
                                            width: '44px', height: '52px', textAlign: 'center',
                                            fontSize: '1.4rem', fontWeight: '700', borderRadius: '10px',
                                            border: digit ? '2px solid #be9055' : '1px solid #ddd',
                                            backgroundColor: 'white', color: '#1e293b', outline: 'none',
                                            transition: 'border-color 0.2s'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = '#be9055'}
                                        onBlur={(e) => { if (!digit) e.target.style.borderColor = '#ddd'; }}
                                    />
                                ))}
                            </div>
                        </div>
                        <p style={{ textAlign: 'center', fontSize: '0.78rem', color: '#94a3b8', margin: '12px 0 4px', lineHeight: 1.5 }}>
                            📧 Please also check your <strong>Spam</strong> or <strong>Junk</strong> folder.
                        </p>
                        <button type="submit" className="login-btn" disabled={loading || otp.join('').length < 6}>
                            {loading ? 'Verifying...' : 'Verify Account'}
                        </button>
                        <div className="login-footer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            {resendTimer > 0 ? (
                                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                                    Resend code in {Math.floor(resendTimer / 60)}:{(resendTimer % 60).toString().padStart(2, '0')}
                                </p>
                            ) : resendAttempts >= 3 ? (
                                <p style={{ fontSize: '0.8rem', color: '#ef4444', margin: 0, fontWeight: 500 }}>
                                    Maximum resend attempts reached. Please try again later.
                                </p>
                            ) : (
                                <button type="button" disabled={resending} onClick={async () => {
                                    setResending(true);
                                    setError('');
                                    try {
                                        await Axios.post(`${API_URL}/api/send-otp`, { email: verificationEmail, purpose: 'account-verification' });
                                        setResendTimer(300);
                                        setResendAttempts(prev => prev + 1);
                                        setOtp(['', '', '', '', '', '']);
                                        otpRefs.current[0]?.focus();
                                    } catch (err) {
                                        setError('Failed to resend OTP.');
                                    } finally {
                                        setResending(false);
                                    }
                                }} style={{background: 'none', border: 'none', color: '#be9055', cursor: resending ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '0.85rem', textDecoration: 'underline', padding: 0}}>
                                    {resending ? 'Resending...' : "Didn't receive it? Resend Code"}
                                </button>
                            )}
                            <button type="button" onClick={() => { setView('login'); setError(''); }} style={{background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '0.85rem'}}>Back to Login</button>
                        </div>
                    </form>
                    </>
                )}
            </div>
        </div>

        {/* Password Reset Success Modal */}
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
                        maxWidth: '380px',
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
                    <h2 style={{ color: '#1e293b', fontSize: '1.25rem', fontWeight: 700, margin: '0 0 8px' }}>{view === 'verify-account' ? 'Account Verified!' : 'Password Reset Successful'}</h2>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 28px' }}>
                        {view === 'verify-account'
                            ? 'Your account has been successfully verified. You can now log in.'
                            : 'Your password has been updated. You can now log in with your new password.'}
                    </p>
                    <button
                        onClick={() => {
                            setSuccessModal(prev => ({ ...prev, visible: false }));
                            setTimeout(() => {
                                setSuccessModal({ mounted: false, visible: false });
                                setView('login');
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
                        Back to Login
                    </button>
                </div>
            </div>
        )}
        </>
    );
}

export default Login;