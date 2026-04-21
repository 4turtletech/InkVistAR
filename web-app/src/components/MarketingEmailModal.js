import React, { useState, useRef } from 'react';
import Axios from 'axios';
import { X, Send, Mail, Users, AlertTriangle, ImagePlus, Trash2 } from 'lucide-react';
import { API_URL } from '../config';

export default function MarketingEmailModal({ isOpen, onClose }) {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [imageBase64, setImageBase64] = useState(null);
    const [imageName, setImageName] = useState('');
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState(null);
    const [confirmStep, setConfirmStep] = useState(false);
    const fileInputRef = useRef(null);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return;
        }

        // Validate file size (max 2MB for email)
        if (file.size > 2 * 1024 * 1024) {
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            setImageBase64(ev.target.result);
            setImageName(file.name);
        };
        reader.readAsDataURL(file);
    };

    const removeImage = () => {
        setImageBase64(null);
        setImageName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSend = async () => {
        if (!subject.trim() || !body.trim()) return;
        setSending(true);
        setResult(null);
        try {
            const response = await Axios.post(`${API_URL}/api/admin/broadcast-marketing-email`, {
                subject: subject.trim(),
                body: body.trim(),
                imageBase64: imageBase64 || null
            });
            setResult({ success: true, message: response.data.message, sent: response.data.sent });
        } catch (err) {
            setResult({ success: false, message: err.response?.data?.message || 'Failed to send broadcast.' });
        }
        setSending(false);
        setConfirmStep(false);
    };

    const handleClose = () => {
        setSubject('');
        setBody('');
        setImageBase64(null);
        setImageName('');
        setResult(null);
        setConfirmStep(false);
        setSending(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
            animation: 'tosFadeIn 0.25s ease'
        }} onClick={handleClose}>
            <div style={{
                background: '#ffffff', borderRadius: '20px', width: '94%', maxWidth: '580px',
                boxShadow: '0 24px 64px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column',
                animation: 'tosSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)', maxHeight: '90vh', overflow: 'hidden'
            }} onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div style={{
                    padding: '22px 28px 18px', borderBottom: '1px solid #e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '12px',
                            background: '#be9055',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Mail size={20} color="#fff" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>Broadcast Email</h3>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Send to all subscribed customers</p>
                        </div>
                    </div>
                    <button onClick={handleClose} style={{
                        background: '#f1f5f9', border: 'none', borderRadius: '10px', width: '36px', height: '36px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b'
                    }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
                    {result ? (
                        <div style={{ textAlign: 'center', padding: '24px 0' }}>
                            <div style={{
                                width: '56px', height: '56px', borderRadius: '50%',
                                background: result.success ? '#dcfce7' : '#fef2f2',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 16px'
                            }}>
                                {result.success ? <Send size={24} color="#16a34a" /> : <AlertTriangle size={24} color="#ef4444" />}
                            </div>
                            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                                {result.success ? 'Broadcast Sent!' : 'Send Failed'}
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>{result.message}</p>
                            <button onClick={handleClose} style={{
                                marginTop: '20px', padding: '10px 28px', borderRadius: '10px', border: 'none',
                                background: '#be9055', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem'
                            }}>
                                Done
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Subject */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Subject Line</label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value.substring(0, 150))}
                                    placeholder="e.g., 20% Off Your Next Tattoo Session!"
                                    maxLength={150}
                                    style={{
                                        width: '100%', padding: '11px 14px', borderRadius: '10px',
                                        border: '1px solid #e2e8f0', fontSize: '0.92rem', outline: 'none',
                                        transition: 'border 0.2s', boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#be9055'}
                                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                />
                            </div>

                            {/* Promo Image Upload */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                                    Promo Image <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional, max 2MB)</span>
                                </label>
                                {imageBase64 ? (
                                    <div style={{
                                        position: 'relative', borderRadius: '12px', overflow: 'hidden',
                                        border: '1px solid #e2e8f0', background: '#f8fafc'
                                    }}>
                                        <img
                                            src={imageBase64}
                                            alt="Promo preview"
                                            style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block' }}
                                        />
                                        <button
                                            onClick={removeImage}
                                            style={{
                                                position: 'absolute', top: '8px', right: '8px',
                                                background: 'rgba(239, 68, 68, 0.9)', border: 'none', borderRadius: '8px',
                                                width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: 'pointer', color: '#fff', backdropFilter: 'blur(4px)'
                                            }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <div style={{ padding: '8px 12px', fontSize: '0.75rem', color: '#64748b' }}>
                                            {imageName}
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{
                                            width: '100%', padding: '20px', borderRadius: '12px',
                                            border: '2px dashed #cbd5e1', background: '#f8fafc',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                                            cursor: 'pointer', transition: 'all 0.2s', color: '#64748b'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#be9055'; e.currentTarget.style.background = 'rgba(190, 144, 85, 0.04)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
                                    >
                                        <ImagePlus size={24} />
                                        <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Click to upload a promo image</span>
                                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>JPG, PNG, or WebP — displayed at the top of the email</span>
                                    </button>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    style={{ display: 'none' }}
                                />
                            </div>

                            {/* Email Body */}
                            <div style={{ marginBottom: '18px' }}>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Email Body</label>
                                <textarea
                                    value={body}
                                    onChange={(e) => setBody(e.target.value.substring(0, 5000))}
                                    placeholder="Write your promotional message here... You can use multiple lines."
                                    rows={6}
                                    maxLength={5000}
                                    style={{
                                        width: '100%', padding: '12px 14px', borderRadius: '10px',
                                        border: '1px solid #e2e8f0', fontSize: '0.9rem', outline: 'none',
                                        resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6,
                                        transition: 'border 0.2s', boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#be9055'}
                                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                />
                            </div>

                            {/* Confirmation Warning */}
                            {confirmStep && (
                                <div style={{
                                    padding: '14px 16px', borderRadius: '12px', background: '#fef3c7',
                                    border: '1px solid #fbbf24', marginBottom: '16px', display: 'flex',
                                    alignItems: 'flex-start', gap: '10px'
                                }}>
                                    <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
                                    <div>
                                        <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 600, color: '#92400e' }}>
                                            Are you sure you want to send this email to all subscribed users?
                                        </p>
                                        <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#a16207' }}>
                                            This action cannot be undone.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {!result && (
                    <div style={{
                        padding: '16px 28px 22px', borderTop: '1px solid #e2e8f0',
                        display: 'flex', justifyContent: 'flex-end', gap: '10px', flexShrink: 0
                    }}>
                        <button onClick={handleClose} style={{
                            padding: '10px 20px', borderRadius: '10px', border: '1px solid #e2e8f0',
                            background: 'transparent', color: '#64748b', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer'
                        }}>
                            Cancel
                        </button>
                        {confirmStep ? (
                            <button
                                onClick={handleSend}
                                disabled={sending}
                                style={{
                                    padding: '10px 24px', borderRadius: '10px', border: 'none',
                                    background: sending ? '#94a3b8' : '#ef4444', color: '#fff',
                                    fontSize: '0.88rem', fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '8px'
                                }}
                            >
                                <Send size={16} />
                                {sending ? 'Sending...' : 'Confirm & Send'}
                            </button>
                        ) : (
                            <button
                                onClick={() => setConfirmStep(true)}
                                disabled={!subject.trim() || !body.trim()}
                                style={{
                                    padding: '10px 24px', borderRadius: '10px', border: 'none',
                                    background: (!subject.trim() || !body.trim()) ? '#94a3b8' : 'linear-gradient(135deg, #be9055, #8a6c4a)',
                                    color: (!subject.trim() || !body.trim()) ? '#e2e8f0' : '#000',
                                    fontSize: '0.88rem', fontWeight: 700,
                                    cursor: (!subject.trim() || !body.trim()) ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '8px'
                                }}
                            >
                                <Users size={16} />
                                Send to Subscribers
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
