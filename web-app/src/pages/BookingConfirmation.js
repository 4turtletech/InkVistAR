import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import { CheckCircle, Clock, AlertCircle, ArrowRight, Home, Sparkles, Calendar, CreditCard } from 'lucide-react';

// Helper: compute the same display code used in CustomerBookings.js
// Derives sequential suffix from numeric ID (id % 10000, zero-padded to 4 digits)
const getDisplayCode = (bookingCode, id) => {
    const numericId = parseInt(id, 10);
    const seqNum = String(numericId % 10000).padStart(4, '0');
    if (bookingCode && typeof bookingCode === 'string') {
        const parts = bookingCode.split('-');
        if (parts.length >= 2) {
            const originCode = parts[0];
            const serviceCode = parts[1];
            return `${originCode}-${serviceCode}-${seqNum}`;
        }
    }
    // Fallback if no booking_code available
    return `BK-${seqNum}`;
};

const BookingConfirmation = () => {
    const location = useLocation();
    const [appointmentId, setAppointmentId] = useState(null);
    const [bookingDisplayCode, setBookingDisplayCode] = useState(null);
    const [verificationStatus, setVerificationStatus] = useState('verifying');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const id = location.state?.appointmentId || params.get('appointmentId');
        const type = location.state?.paymentType || params.get('paymentType');
        // Try to get booking_code from navigation state (only available if navigated via React Router)
        const bookingCodeFromState = location.state?.bookingCode || null;

        if (id) {
            setAppointmentId(id);
            if (bookingCodeFromState) {
                setBookingDisplayCode(getDisplayCode(bookingCodeFromState, id));
            }
            verifyPayment(id, type, bookingCodeFromState);
        } else {
            setVerificationStatus('idle');
        }
    }, [location]);

    const verifyPayment = async (id, expectedType, bookingCodeFromState) => {
        setVerificationStatus('verifying');
        let attempts = 0;
        const maxAttempts = 6;

        const poll = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/appointments/${id}/payment-status`);
                const currentStatus = res.data.payment_status;

                // If the API returns booking_code, use it to compute the display code
                if (res.data.booking_code && !bookingCodeFromState) {
                    setBookingDisplayCode(getDisplayCode(res.data.booking_code, id));
                } else if (!bookingCodeFromState) {
                    // Fallback: just use the sequential number
                    setBookingDisplayCode(getDisplayCode(null, id));
                }

                let isSuccess = false;
                if (res.data.success) {
                    if (expectedType === 'balance' || expectedType === 'full') {
                        isSuccess = (currentStatus === 'paid');
                    } else {
                        isSuccess = (currentStatus === 'paid' || currentStatus === 'downpayment_paid');
                    }
                }

                if (isSuccess) {
                    setVerificationStatus('success');
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(poll, 3000);
                } else {
                    setVerificationStatus('timeout');
                }
            } catch (err) {
                console.error("Verification error:", err);
                // Still compute display code even on error
                if (!bookingCodeFromState) {
                    setBookingDisplayCode(getDisplayCode(null, id));
                }
                setVerificationStatus('failed');
            }
        };

        poll();
    };

    const isSuccess = verificationStatus === 'success' || verificationStatus === 'idle';
    const isPending = verificationStatus === 'verifying';
    const isTimeout = verificationStatus === 'timeout' || verificationStatus === 'failed';

    return (
        <div style={styles.pageWrapper}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@700&display=swap');
                * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
                @keyframes blobFloat { from { transform: translate(0,0) scale(1); } to { transform: translate(30px, 30px) scale(1.05); } }
                @keyframes cardIn { from { opacity: 0; transform: translateY(30px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
                @keyframes iconBounce { 0% { transform: scale(0); opacity: 0; } 70% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                @keyframes shimmer { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
                @keyframes particleFloat { 0% { transform: translateY(0) rotate(0deg); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(-120px) rotate(720deg); opacity: 0; } }
                .confirm-primary-btn:hover { transform: translateY(-3px); box-shadow: 0 12px 30px rgba(193, 154, 107, 0.4) !important; }
                .confirm-secondary-btn:hover { background: rgba(255,255,255,0.08) !important; border-color: rgba(193,154,107,0.5) !important; color: #C19A6B !important; }
                .confirm-primary-btn, .confirm-secondary-btn { transition: all 0.25s ease; }
                .particle { position: absolute; width: 8px; height: 8px; border-radius: 50%; animation: particleFloat 2.5s ease-in infinite; }
            `}</style>

            {/* Background blobs */}
            <div style={{ ...styles.blob, top: '-15%', right: '-10%', width: '500px', height: '500px', background: 'rgba(193, 154, 107, 0.12)', animationDuration: '20s' }} />
            <div style={{ ...styles.blob, bottom: '-15%', left: '-10%', width: '450px', height: '450px', background: 'rgba(16, 185, 129, 0.06)', animationDuration: '25s', animationDirection: 'alternate-reverse' }} />
            <div style={{ ...styles.blob, top: '30%', left: '5%', width: '250px', height: '250px', background: 'rgba(193, 154, 107, 0.07)', animationDuration: '18s' }} />

            <div style={styles.card}>
                {/* Top accent line */}
                <div style={styles.accentBar} />

                {/* Icon area */}
                <div style={styles.iconAreaWrapper}>
                    {isPending && (
                        <div style={{ ...styles.iconRing, borderColor: 'rgba(59,130,246,0.3)' }}>
                            <div style={{ width: '44px', height: '44px', border: '3px solid rgba(59,130,246,0.2)', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        </div>
                    )}
                    {isTimeout && (
                        <div style={{ ...styles.iconRing, borderColor: 'rgba(245,158,11,0.3)', animation: 'iconBounce 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
                            <Clock size={42} color="#f59e0b" />
                        </div>
                    )}
                    {isSuccess && (
                        <>
                            {/* Particles for success */}
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="particle" style={{
                                    left: `${20 + i * 12}%`,
                                    bottom: '0',
                                    background: i % 2 === 0 ? '#C19A6B' : '#10b981',
                                    animationDelay: `${i * 0.3}s`,
                                    animationDuration: `${2 + i * 0.2}s`
                                }} />
                            ))}
                            <div style={{ ...styles.iconRing, borderColor: 'rgba(193,154,107,0.4)', background: 'rgba(193,154,107,0.08)', animation: 'iconBounce 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
                                <CheckCircle size={44} color="#C19A6B" strokeWidth={1.8} />
                            </div>
                        </>
                    )}
                </div>

                {/* Heading */}
                {isPending && (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', animation: 'shimmer 1s infinite 0s' }} />
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', animation: 'shimmer 1s infinite 0.2s' }} />
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', animation: 'shimmer 1s infinite 0.4s' }} />
                        </div>
                        <h1 style={styles.heading}>Verifying Payment</h1>
                        <p style={styles.subtext}>We're confirming your transaction with PayMongo. This only takes a moment.</p>
                    </>
                )}
                {isTimeout && (
                    <>
                        <div style={styles.pill('#f59e0b', 'rgba(245,158,11,0.1)')}>Processing</div>
                        <h1 style={styles.heading}>Taking a Moment</h1>
                        <p style={styles.subtext}>Your booking is safe — confirmation is just taking a little longer than usual. Check your bookings shortly.</p>
                    </>
                )}
                {isSuccess && (
                    <>
                        <div style={styles.pill('#10b981', 'rgba(16,185,129,0.1)')}>
                            <Sparkles size={12} /> Payment Successful
                        </div>
                        <h1 style={{ ...styles.heading, fontFamily: "'Playfair Display', serif" }}>Booking Confirmed!</h1>
                        <p style={styles.subtext}>Your slot is reserved. We can't wait to see you at InkVistAR Studio.</p>
                    </>
                )}

                {/* Divider */}
                <div style={styles.divider} />

                {/* Booking code badge */}
                {(bookingDisplayCode || appointmentId) && (
                    <div style={styles.bookingCodeCard}>
                        <div style={styles.bookingCodeRow}>
                            <span style={styles.bookingCodeLabel}>Booking Reference</span>
                            <span style={styles.bookingCodeValue}>{bookingDisplayCode || `#${appointmentId}`}</span>
                        </div>
                        {isSuccess && (
                            <>
                                <div style={styles.bookingDetailDivider} />
                                <div style={styles.bookingMeta}>
                                    <div style={styles.bookingMetaItem}>
                                        <Calendar size={14} color="#C19A6B" />
                                        <span>Check bookings for date & time</span>
                                    </div>
                                    <div style={styles.bookingMetaItem}>
                                        <CreditCard size={14} color="#10b981" />
                                        <span style={{ color: '#10b981' }}>Payment confirmed</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Action buttons */}
                <div style={styles.actions}>
                    <Link to="/customer/bookings" className="confirm-primary-btn" style={styles.primaryBtn}>
                        Manage My Bookings <ArrowRight size={18} />
                    </Link>
                    <Link to="/" className="confirm-secondary-btn" style={styles.secondaryBtn}>
                        <Home size={16} /> Back to Home
                    </Link>
                </div>

                {/* Footer note */}
                <p style={styles.footerNote}>
                    A confirmation has been sent to your registered email.
                </p>
            </div>
        </div>
    );
};

const styles = {
    pageWrapper: {
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f1f2e 100%)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
    },
    blob: {
        position: 'absolute',
        borderRadius: '50%',
        filter: 'blur(80px)',
        animation: 'blobFloat 20s ease-in-out infinite alternate',
        pointerEvents: 'none',
    },
    card: {
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        padding: '0',
        width: '100%',
        maxWidth: '480px',
        textAlign: 'center',
        boxShadow: '0 32px 64px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
        zIndex: 1,
        animation: 'cardIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        overflow: 'hidden',
    },
    accentBar: {
        height: '3px',
        background: 'linear-gradient(90deg, transparent, #C19A6B, #daa520, #C19A6B, transparent)',
        width: '100%',
    },
    iconAreaWrapper: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: '40px',
        paddingBottom: '8px',
        minHeight: '120px',
    },
    iconRing: {
        width: '88px',
        height: '88px',
        borderRadius: '50%',
        border: '2px solid',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255,255,255,0.04)',
        boxShadow: '0 8px 32px rgba(193,154,107,0.2)',
    },
    pill: (color, bg) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '0.75rem',
        fontWeight: '600',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color,
        background: bg,
        border: `1px solid ${color}40`,
        padding: '4px 14px',
        borderRadius: '99px',
        marginBottom: '16px',
    }),
    heading: {
        fontSize: '1.9rem',
        fontWeight: '800',
        color: '#f8fafc',
        margin: '0 0 12px 0',
        lineHeight: '1.2',
        padding: '0 32px',
    },
    subtext: {
        color: '#94a3b8',
        lineHeight: '1.65',
        fontSize: '0.95rem',
        margin: '0 0 0 0',
        padding: '0 32px',
        fontWeight: '400',
    },
    divider: {
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
        margin: '28px 32px',
    },
    bookingCodeCard: {
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(193,154,107,0.2)',
        borderRadius: '14px',
        padding: '16px 20px',
        margin: '0 32px 28px 32px',
    },
    bookingCodeRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    bookingCodeLabel: {
        fontSize: '0.78rem',
        color: '#64748b',
        fontWeight: '500',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
    },
    bookingCodeValue: {
        fontSize: '1.05rem',
        fontWeight: '700',
        color: '#C19A6B',
        letterSpacing: '0.06em',
        fontFamily: "'Inter', monospace",
    },
    bookingDetailDivider: {
        height: '1px',
        background: 'rgba(255,255,255,0.06)',
        margin: '12px 0',
    },
    bookingMeta: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    bookingMetaItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.83rem',
        color: '#94a3b8',
        fontWeight: '500',
    },
    actions: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '0 32px',
    },
    primaryBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '15px 28px',
        background: 'linear-gradient(135deg, #C19A6B 0%, #a07850 100%)',
        color: 'white',
        borderRadius: '12px',
        textDecoration: 'none',
        fontWeight: '700',
        fontSize: '0.95rem',
        boxShadow: '0 4px 20px rgba(193, 154, 107, 0.3)',
        border: 'none',
    },
    secondaryBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '14px 28px',
        background: 'rgba(255,255,255,0.05)',
        color: '#94a3b8',
        borderRadius: '12px',
        textDecoration: 'none',
        fontWeight: '600',
        fontSize: '0.9rem',
        border: '1px solid rgba(255,255,255,0.1)',
    },
    footerNote: {
        fontSize: '0.78rem',
        color: '#475569',
        margin: '20px 32px 32px 32px',
        lineHeight: '1.5',
    },
};

export default BookingConfirmation;
