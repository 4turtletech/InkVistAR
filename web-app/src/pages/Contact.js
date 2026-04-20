import React, { useState } from 'react';
import Axios from 'axios';
import { MapPin, Mail, Clock, Phone, User, MessageSquare, Send, CheckCircle, AlertCircle, Navigation, Car, Train, Bus, Instagram, Facebook } from 'lucide-react';
import { filterName, filterDigits } from '../utils/validation';
import CountryCodeSelect from '../components/CountryCodeSelect';
import { API_URL } from '../config';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import './Contact.css';
import Navbar from '../components/Navbar';
import ChatWidget from '../components/ChatWidget';
import Footer from '../components/Footer';

const Contact = () => {
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    countryCode: '+63',
    phone: '',
    subject: '',
    message: ''
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { executeRecaptcha } = useGoogleReCaptcha();

  // Subject options
  const SUBJECT_OPTIONS = [
    'General Inquiry',
    'Booking Question',
    'Tattoo Consultation',
    'Piercing Inquiry',
    'Pricing Information',
    'Collaboration / Partnership',
    'Feedback / Complaint',
    'Other'
  ];

  const handleChange = (field, value) => {
    let sanitized = value;
    if (field === 'name') sanitized = filterName(value).substring(0, 100);
    else if (field === 'email') sanitized = value.substring(0, 254);
    else if (field === 'phone') sanitized = filterDigits(value).substring(0, 15);
    else if (field === 'subject') sanitized = value.substring(0, 150);
    else if (field === 'message') sanitized = value.substring(0, 2000);

    setFormData(prev => ({ ...prev, [field]: sanitized }));
    // Clear field error on change
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    if (serverError) setServerError('');
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      newErrors.name = 'Please enter your name (min 2 characters).';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }
    if (!formData.message.trim() || formData.message.trim().length < 10) {
      newErrors.message = 'Please enter a message (min 10 characters).';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (!executeRecaptcha) {
      setServerError('reCAPTCHA not loaded. Please try again.');
      return;
    }

    setSubmitting(true);
    setServerError('');
    
    try {
      const token = await executeRecaptcha('contact');
      if (!token) {
        setServerError('CAPTCHA verification failed to execute.');
        setSubmitting(false);
        return;
      }

      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone ? `${formData.countryCode} ${formData.phone}` : '',
        subject: formData.subject || '',
        message: formData.message.trim(),
        captchaToken: token
      };
      const res = await Axios.post(`${API_URL}/api/contact`, payload);
      if (res.data.success) {
        setSubmitted(true);
      } else {
        setServerError(res.data.message || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to send your message. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      email: '',
      countryCode: '+63',
      phone: '',
      subject: '',
      message: ''
    });
    setErrors({});
    setServerError('');
    setSubmitted(false);
  };

  return (
    <>
      <Navbar />

      <div className="contact-page page-transition-wrapper">
        {/* Hero Header */}
        <div className="contact-hero">
          <div className="contact-hero-badge">
            <MessageSquare size={14} />
            <span>Connect With Us</span>
          </div>
          <h1>Get In Touch</h1>
          <p>Have a question about a tattoo, piercing, or just want to say hello? We'd love to hear from you. Reach out and we'll get back to you shortly.</p>
        </div>

        {/* Main 2-Column: Form + Info */}
        <div className="contact-main">
          {/* Left: Contact Form */}
          <div className="contact-glass-card">
            {submitted ? (
              <div className="contact-success-state">
                <div className="contact-success-icon">
                  <CheckCircle size={30} color="#10b981" />
                </div>
                <h3>Message Sent!</h3>
                <p>Thank you for reaching out. We've sent a confirmation to your email. Our team will respond to your inquiry via email within 24 hours.</p>
                <button className="contact-reset-btn" onClick={handleReset}>
                  Send Another Message
                </button>
              </div>
            ) : (
              <>
                <div className="contact-form-header">
                  <h2>Send Us a Message</h2>
                  <p>Fill in the form below and we'll respond as soon as we can.</p>
                </div>

                {serverError && (
                  <div className="contact-server-error">
                    <AlertCircle size={16} />
                    {serverError}
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  {/* Name */}
                  <div className="contact-form-group">
                    <label className="contact-form-label">
                      <User size={14} /> Full Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className={`contact-input ${errors.name ? 'input-error' : ''}`}
                      placeholder="Your full name"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      maxLength={100}
                    />
                    {errors.name && <div className="contact-field-error"><AlertCircle size={13} /> {errors.name}</div>}
                  </div>

                  {/* Email */}
                  <div className="contact-form-group">
                    <label className="contact-form-label">
                      <Mail size={14} /> Email Address <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="email"
                      className={`contact-input ${errors.email ? 'input-error' : ''}`}
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      maxLength={254}
                    />
                    {errors.email && <div className="contact-field-error"><AlertCircle size={13} /> {errors.email}</div>}
                  </div>

                  {/* Phone (Optional) */}
                  <div className="contact-form-group">
                    <label className="contact-form-label">
                      <Phone size={14} /> Phone Number <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                    </label>
                    <div className="contact-phone-row">
                      <div className="contact-phone-code">
                        <CountryCodeSelect
                          value={formData.countryCode}
                          onChange={(code) => setFormData(prev => ({ ...prev, countryCode: code }))}
                        />
                      </div>
                      <input
                        type="tel"
                        className="contact-input contact-phone-number"
                        placeholder="9XX XXX XXXX"
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        maxLength={15}
                      />
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="contact-form-group">
                    <label className="contact-form-label">
                      <MessageSquare size={14} /> Subject
                    </label>
                    <select
                      className="contact-input"
                      value={formData.subject}
                      onChange={(e) => handleChange('subject', e.target.value)}
                    >
                      <option value="">Select a topic...</option>
                      {SUBJECT_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Message */}
                  <div className="contact-form-group">
                    <label className="contact-form-label">
                      <Mail size={14} /> Message <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <textarea
                      className={`contact-input contact-textarea ${errors.message ? 'input-error' : ''}`}
                      placeholder="Tell us what's on your mind..."
                      value={formData.message}
                      onChange={(e) => handleChange('message', e.target.value)}
                      maxLength={2000}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      {errors.message ? (
                        <div className="contact-field-error"><AlertCircle size={13} /> {errors.message}</div>
                      ) : <span />}
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)' }}>
                        {formData.message.length}/2000
                      </span>
                    </div>
                  </div>

                  <button type="submit" className="contact-submit-btn" disabled={submitting}>
                    {submitting ? (
                      <>Sending...</>
                    ) : (
                      <>
                        <Send size={18} /> Send Message
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Right: Info Column */}
          <div className="contact-glass-card">
            <div className="contact-form-header">
              <h2>Studio Information</h2>
              <p>Visit us, call, or drop by our studio in BGC, Taguig.</p>
            </div>

            <div className="contact-info-stack">
              <div className="contact-info-item">
                <div className="contact-info-icon">
                  <MapPin size={20} />
                </div>
                <div className="contact-info-text">
                  <h3>Studio Address</h3>
                  <p>32nd Street, corner 9th Ave,<br />Taguig, 1634 Metro Manila, Philippines</p>
                </div>
              </div>

              <div className="contact-info-item">
                <div className="contact-info-icon">
                  <Mail size={20} />
                </div>
                <div className="contact-info-text">
                  <h3>Email</h3>
                  <p><a href="mailto:info@inkvictus.com">info@inkvictus.com</a></p>
                </div>
              </div>

              <div className="contact-info-item">
                <div className="contact-info-icon">
                  <Phone size={20} />
                </div>
                <div className="contact-info-text">
                  <h3>Phone</h3>
                  <p><a href="tel:+639171234567">+63 917 123 4567</a></p>
                </div>
              </div>

              <div className="contact-info-item">
                <div className="contact-info-icon">
                  <Clock size={20} />
                </div>
                <div className="contact-info-text">
                  <h3>Business Hours</h3>
                  <p>Monday – Saturday: 1:00 PM – 8:00 PM<br />Sunday: Closed</p>
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="contact-socials">
              <a href="https://instagram.com/inkvictus" target="_blank" rel="noopener noreferrer" className="contact-social-link" title="Instagram">
                <Instagram size={18} />
              </a>
              <a href="https://facebook.com/inkvictus" target="_blank" rel="noopener noreferrer" className="contact-social-link" title="Facebook">
                <Facebook size={18} />
              </a>
              <a href="mailto:info@inkvictus.com" className="contact-social-link" title="Email">
                <Mail size={18} />
              </a>
            </div>
          </div>
        </div>

        {/* Map Section */}
        <div className="contact-map-section">
          <div className="contact-map-header">
            <div className="contact-map-header-icon">
              <Navigation size={18} />
            </div>
            <h2>Find Us</h2>
          </div>
          <div className="contact-map-wrapper">
            <iframe
              title="Studio Location"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3861.442111088198!2d121.0544491758839!3d14.55887038982025!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397c900427e03a9%3A0x619a86a0023020e0!2sInkvictus!5e0!3m2!1sen!2sus!4v1716321980123!5m2!1sen!2sus"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
            />
          </div>
        </div>

        {/* Directions Section */}
        <div className="contact-directions">
          <div className="contact-directions-header">
            <div className="contact-directions-header-icon">
              <MapPin size={18} />
            </div>
            <h2>Getting Here</h2>
          </div>
          <div className="contact-directions-grid">
            <div className="contact-direction-card">
              <div className="contact-direction-icon">
                <Car size={20} />
              </div>
              <h3>By Car</h3>
              <p>Street parking is available along 36th Street. Secure parking is also available at the 2nd Street garage, just a block away from W Tower.</p>
            </div>
            <div className="contact-direction-card">
              <div className="contact-direction-icon">
                <Train size={20} />
              </div>
              <h3>By Metro</h3>
              <p>Take the Red Line to Downtown Station. From there, it's a pleasant 5-minute walk past the High Street shops to our building.</p>
            </div>
            <div className="contact-direction-card">
              <div className="contact-direction-icon">
                <Bus size={20} />
              </div>
              <h3>By Bus</h3>
              <p>Bus lines 10, 20, and 45 all have stops within two blocks of the studio. Look for the W Tower stop.</p>
            </div>
          </div>
        </div>

        <Footer />
      </div>
      <ChatWidget />
    </>
  );
};

export default Contact;