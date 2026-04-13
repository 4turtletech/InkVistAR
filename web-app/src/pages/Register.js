import React, { useState, useEffect, useRef } from 'react';
import Axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../config';
import Navbar from '../components/Navbar';
import './Login.css'; // Using Login styles for consistency

const PasswordStrengthMeter = ({ feedback }) => {
  const criteria = [
    feedback.hasUppercase && feedback.hasLowercase, // Bar 1: Upper & lowercase
    feedback.hasNumber,                             // Bar 2: Numbers
    feedback.hasSymbol,                             // Bar 3: Special characters
    feedback.hasMinLength                           // Bar 4: Min length 8+
  ];
  
  const score = criteria.filter(Boolean).length;
  
  // Calculate color based on score for a dynamic premium feel
  let color = '#e2e8f0'; // Gray (0 met)
  let text = '';
  if (score === 1) { color = '#ef4444'; text = 'Weak'; }        // Red
  else if (score === 2) { color = '#f59e0b'; text = 'Fair'; }   // Orange
  else if (score === 3) { color = '#eab308'; text = 'Good'; }   // Yellow
  else if (score === 4) { color = '#10b981'; text = 'Strong'; } // Green

  return (
    <div style={{
      backgroundColor: '#f8fafc',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '1rem',
      border: '1px solid #e2e8f0'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <p style={{ fontSize: '0.8rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>Password Strength</p>
        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: color }}>{text}</span>
      </div>
      
      {/* 4 Horizontal Bars */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        {[0, 1, 2, 3].map((index) => (
          <div key={index} style={{
            flex: 1,
            height: '4px',
            borderRadius: '2px',
            backgroundColor: index < score ? color : '#e2e8f0',
            transition: 'background-color 0.3s ease'
          }} />
        ))}
      </div>
      
      {/* Criteria Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.7rem', color: '#64748b' }}>
        <div style={{ color: criteria[0] ? '#10b981' : '#64748b', transition: 'color 0.2s' }}>• Upper & lowercase</div>
        <div style={{ color: criteria[1] ? '#10b981' : '#64748b', transition: 'color 0.2s' }}>• Number (0-9)</div>
        <div style={{ color: criteria[2] ? '#10b981' : '#64748b', transition: 'color 0.2s' }}>• Special character</div>
        <div style={{ color: criteria[3] ? '#10b981' : '#64748b', transition: 'color 0.2s' }}>• 8+ characters</div>
      </div>
    </div>
  );
};

function Register() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    suffix: '',
    email: '',
    phone: '',
    countryCode: '+63',
    password: '',
    confirmPassword: ''
  });

  const [passwordFeedback, setPasswordFeedback] = useState({
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSymbol: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    let sanitizedValue = value;

    // Hard sanitization for names (letters, spaces, hyphens only)
    if (name === 'firstName' || name === 'lastName') {
      sanitizedValue = value.replace(/[^a-zA-Z\s-]/g, '').replace(/^\s+/, '');
    } else if (name === 'suffix') {
      // Allow letters, periods, and spaces
      sanitizedValue = value.replace(/[^a-zA-Z.\s]/g, '').replace(/^\s+/, '');
    } else if (name === 'email') {
      sanitizedValue = value.replace(/\s/g, ''); // No spaces in email
    } else if (name === 'phone') {
      sanitizedValue = value.replace(/[^0-9]/g, '').slice(0, 11); // Only numbers, max 11
    } else {
      sanitizedValue = value.replace(/^\s+/, '');
    }

    setFormData({ ...formData, [name]: sanitizedValue });
    setApiError(''); // Clear API error on change

    // Live password feedback
    if (name === 'password') {
      setPasswordFeedback({
        hasMinLength: value.length >= 8,
        hasUppercase: /[A-Z]/.test(value),
        hasLowercase: /[a-z]/.test(value),
        hasNumber: /[0-9]/.test(value),
        hasSymbol: /[@$!%*?&#]/.test(value)
      });
    }

    // Auto-clear specific error as user types
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateField = (name, value) => {
    let errorMsg = "";
    if (name === 'firstName' && !value.trim()) errorMsg = "First name is required";
    if (name === 'lastName' && !value.trim()) errorMsg = "Last name is required";
    
    if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!value) errorMsg = "Email is required";
      else if (!emailRegex.test(value)) errorMsg = "Invalid email format";
    }

    if (name === 'password') {
      const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
      if (!value) errorMsg = "Password is required";
      else if (value.length < 8) errorMsg = "Password must be at least 8 characters";
      else if (!strongRegex.test(value)) errorMsg = "Password needs uppercase, lowercase, number, and symbol";
    }

    if (name === 'confirmPassword') {
      if (value !== formData.password) errorMsg = "Passwords do not match";
    }

    if (name === 'phone') {
      if (!value) errorMsg = "Phone number is required";
      else if (value.length < 11) errorMsg = "Phone number must be exactly 11 digits";
    }

    setErrors(prev => ({ ...prev, [name]: errorMsg }));
    return errorMsg === "";
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    validateField(name, value);
  };

  const validate = () => {
    const isFirstNameValid = validateField('firstName', formData.firstName);
    const isLastNameValid = validateField('lastName', formData.lastName);
    const isEmailValid = validateField('email', formData.email);
    const isPhoneValid = validateField('phone', formData.phone);
    const isPasswordValid = validateField('password', formData.password);
    const isConfirmValid = validateField('confirmPassword', formData.confirmPassword);

    return isFirstNameValid && isLastNameValid && isEmailValid && isPhoneValid && isPasswordValid && isConfirmValid;
  };

  const isPasswordValid = () => {
    return (
      passwordFeedback.hasMinLength &&
      passwordFeedback.hasUppercase &&
      passwordFeedback.hasLowercase &&
      passwordFeedback.hasNumber &&
      passwordFeedback.hasSymbol
    );
  };

  const registerUser = async (e) => {
    e.preventDefault();
    
    setApiError('');
    if (!validate()) return;

    try {
      const orphanAppointmentId = sessionStorage.getItem('orphanAppointmentId');
      const response = await Axios.post(`${API_URL}/api/register`, {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.countryCode + formData.phone.trim(),
        password: formData.password,
        type: 'customer', // Defaulting to customer for public registration
        orphanAppointmentId: orphanAppointmentId
      });

      if (response.data.success) {
          setShowSuccessModal(true);
      }
    } catch (error) {
      console.error(error);
      const message = error.response?.data?.message || "An error occurred during registration.";
      if (message.toLowerCase().includes('email')) {
        setErrors(prev => ({ ...prev, email: message }));
      } else {
        setApiError(message);
      }
    }
  };

  return (
    <>
      <Navbar />

    <div className="login-page-wrapper" style={{ minHeight: '100vh', boxSizing: 'border-box', padding: '80px 20px 40px' }}>
      <div className="login-card" style={{ width: '90%', maxWidth: '520px', margin: '0 auto' }}>
        <div className="login-header">
            <h1 className="login-logo" style={{ fontSize: '1.2rem' }}>INKVICTUS TATTOO</h1>
            <p className="login-tagline">BGC’s Premier Luxury Tattoo Studio</p>
        </div>

        <h2 className="login-title" style={{ fontSize: '1.1rem', marginTop: '1.5rem' }}>Create Account</h2>
        {apiError && <p className="error-message" style={{textAlign: 'center'}}>{apiError}</p>}

        <form onSubmit={registerUser} className="login-form">
            <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1, position: 'relative' }}>
                    <input type="text" name="firstName" className={`form-input ${errors.firstName ? 'error' : ''}`} placeholder="First Name" value={formData.firstName} onChange={handleChange} onBlur={handleBlur} />
                    {errors.firstName && <small style={{color: '#ef4444', display: 'block', marginTop: '4px', fontSize: '0.8rem'}}>{errors.firstName}</small>}
                </div>
                <div className="form-group" style={{ flex: 1, position: 'relative' }}>
                    <input type="text" name="lastName" className={`form-input ${errors.lastName ? 'error' : ''}`} placeholder="Last Name" value={formData.lastName} onChange={handleChange} onBlur={handleBlur} />
                    {errors.lastName && <small style={{color: '#ef4444', display: 'block', marginTop: '4px', fontSize: '0.8rem'}}>{errors.lastName}</small>}
                </div>
            </div>
            <div className="form-group" style={{ position: 'relative' }}>
                <input type="text" name="suffix" className="form-input" placeholder="Suffix (Optional, e.g. Jr., Sr., III)" value={formData.suffix} onChange={handleChange} />
            </div>
            <div className="form-group" style={{ position: 'relative' }}>
                <input type="email" name="email" className={`form-input ${errors.email ? 'error' : ''}`} placeholder="Email Address" value={formData.email} onChange={handleChange} onBlur={handleBlur} />
                {errors.email && <small style={{color: '#ef4444', display: 'block', marginTop: '4px', fontSize: '0.8rem'}}>{errors.email}</small>}
            </div>
            <div className="form-group" style={{ display: 'flex', gap: '10px' }}>
                <select
                    name="countryCode"
                    className="form-input"
                    style={{ width: '110px' }}
                    value={formData.countryCode}
                    onChange={handleChange}
                >
                    <option value="+63">PH (+63)</option>
                    <option value="+1">US/CA (+1)</option>
                    <option value="+44">UK (+44)</option>
                    <option value="+61">AU (+61)</option>
                    <option value="+81">JP (+81)</option>
                    <option value="+82">KR (+82)</option>
                    <option value="+65">SG (+65)</option>
                    <option value="+64">NZ (+64)</option>
                </select>
                <input type="tel" name="phone" className={`form-input ${errors.phone ? 'error' : ''}`} style={{ flex: 1 }} value={formData.phone} onChange={handleChange} placeholder="Phone Number" />
            </div>
            {errors.phone && <small style={{color: '#ef4444', display: 'block', marginTop: '4px', fontSize: '0.8rem'}}>{errors.phone}</small>}
            <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1, position: 'relative' }}>
                    <input type={showPassword ? "text" : "password"} name="password" className={`form-input ${errors.password ? 'error' : ''}`} placeholder="Password" value={formData.password} onChange={handleChange} onBlur={handleBlur} />
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
                            padding: '4px',
                            color: '#64748b'
                        }}
                    >
                        {showPassword ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        )}
                    </button>
                    {errors.password && <small style={{color: '#ef4444', display: 'block', marginTop: '4px', fontSize: '0.8rem'}}>{errors.password}</small>}
                </div>
                <div className="form-group" style={{ flex: 1, position: 'relative' }}>
                    <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" className={`form-input ${errors.confirmPassword ? 'error' : ''}`} placeholder="Confirm Password" value={formData.confirmPassword} onChange={handleChange} onBlur={handleBlur} />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            color: '#64748b'
                        }}
                    >
                        {showConfirmPassword ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        )}
                    </button>
                    {errors.confirmPassword && <small style={{color: '#ef4444', display: 'block', marginTop: '4px', fontSize: '0.8rem'}}>{errors.confirmPassword}</small>}
                </div>
            </div>

            {/* Live Password Requirements Feedback */}
            <PasswordStrengthMeter feedback={passwordFeedback} />

            <button type="submit" className="login-btn" disabled={!isPasswordValid()}>Register</button>
        </form>
        
        <div className="login-footer">
            <p>Already have an account? <Link to="/login">Login here</Link>.</p>
        </div>
      </div>

      {/* Custom Success Modal */}
      {showSuccessModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{display: 'flex', justifyContent: 'center', marginBottom: '1rem'}}>
              <div style={{backgroundColor: '#dcfce7', padding: '1rem', borderRadius: '50%'}}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
            </div>
            <h2 style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '0.5rem'}}>Account Created!</h2>
            <p style={{color: '#64748b', marginBottom: '1.5rem'}}>
              Registration successful. Please check your email to verify your account before logging in.
            </p>
            <button 
              onClick={() => navigate('/login', { replace: true })}
              className="btn btn-primary"
              style={{width: '100%'}}
            >
              Continue to Login
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

export default Register;