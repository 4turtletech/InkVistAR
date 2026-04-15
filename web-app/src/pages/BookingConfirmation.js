import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import { CheckCircle, Clock, ArrowRight, Home, CreditCard, Calendar } from 'lucide-react';

// Helper: compute the same display code used in CustomerBookings.js
const getDisplayCode = (bookingCode, id) => {
    const numericId = parseInt(id, 10);
    const seqNum = String(numericId % 10000).padStart(4, '0');
    if (bookingCode && typeof bookingCode === 'string') {
        const parts = bookingCode.split('-');
        if (parts.length >= 2) {
            return `${parts[0]}-${parts[1]}-${seqNum}`;
        }
    }
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

                if (res.data.booking_code && !bookingCodeFromState) {
                    setBookingDisplayCode(getDisplayCode(res.data.booking_code, id));
                } else if (!bookingCodeFromState) {
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
        <div style={{
            background: '#111111',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            fontFamily: "'Inter', sans-serif",
        }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap');
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>

            <div style={{
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '440px',
                textAlign: 'center',
                overflow: 'hidden',
            }}>
                {/* Gold top accent */}
                <div style={{ height: '2px', background: '#C19A6B' }} />

                <div style={{ padding: '48px 36px 40px' }}>

                    {/* Icon */}
                    {isPending && (
                        <div style={{
                            width: '72px', height: '72px',
                            margin: '0 auto 32px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <div style={{
                                width: '40px', height: '40px',
                                border: '2px solid #333',
                                borderTop: '2px solid #C19A6B',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                            }} />
                        </div>
                    )}
                    {isTimeout && (
                        <div style={{
                            width: '72px', height: '72px',
                            margin: '0 auto 32px',
                            borderRadius: '50%',
                            border: '1px solid #333',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Clock size={32} color="#C19A6B" strokeWidth={1.5} />
                        </div>
                    )}
                    {isSuccess && (
                        <div style={{
                            width: '72px', height: '72px',
                            margin: '0 auto 32px',
                            borderRadius: '50%',
                            border: '1px solid rgba(193,154,107,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <CheckCircle size={34} color="#C19A6B" strokeWidth={1.5} />
                        </div>
                    )}

                    {/* Heading */}
                    {isPending && (
                        <>
                            <h1 style={{
                                fontFamily: "'Playfair Display', serif",
                                fontSize: '1.6rem',
                                fontWeight: '600',
                                color: '#C19A6B',
                                margin: '0 0 12px',
                                letterSpacing: '0.02em',
                            }}>Verifying Payment</h1>
                            <p style={{
                                color: '#666',
                                fontSize: '0.88rem',
                                lineHeight: '1.6',
                                margin: '0',
                            }}>Confirming your transaction with PayMongo. This only takes a moment.</p>
                        </>
                    )}
                    {isTimeout && (
                        <>
                            <h1 style={{
                                fontFamily: "'Playfair Display', serif",
                                fontSize: '1.6rem',
                                fontWeight: '600',
                                color: '#C19A6B',
                                margin: '0 0 12px',
                                letterSpacing: '0.02em',
                            }}>Taking a Moment</h1>
                            <p style={{
                                color: '#666',
                                fontSize: '0.88rem',
                                lineHeight: '1.6',
                                margin: '0',
                            }}>Your booking is safe — confirmation is taking longer than usual. Check your bookings shortly.</p>
                        </>
                    )}
                    {isSuccess && (
                        <>
                            <h1 style={{
                                fontFamily: "'Playfair Display', serif",
                                fontSize: '1.7rem',
                                fontWeight: '600',
                                color: '#C19A6B',
                                margin: '0 0 12px',
                                letterSpacing: '0.02em',
                            }}>Booking Confirmed</h1>
                            <p style={{
                                color: '#666',
                                fontSize: '0.88rem',
                                lineHeight: '1.6',
                                margin: '0',
                            }}>Payment successful. Your slot is now reserved at InkVictus Studio.</p>
                        </>
                    )}

                    {/* Divider */}
                    <div style={{
                        height: '1px',
                        background: '#2a2a2a',
                        margin: '28px 0',
                    }} />

                    {/* Booking Reference */}
                    {(bookingDisplayCode || appointmentId) && (
                        <div style={{
                            background: '#151515',
                            border: '1px solid #2a2a2a',
                            borderRadius: '10px',
                            padding: '18px 20px',
                            marginBottom: '28px',
                            textAlign: 'left',
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <span style={{
                                    fontSize: '0.72rem',
                                    color: '#555',
                                    fontWeight: '600',
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                }}>Booking Reference</span>
                                <span style={{
                                    fontSize: '1rem',
                                    fontWeight: '700',
                                    color: '#C19A6B',
                                    letterSpacing: '0.05em',
                                }}>{bookingDisplayCode || `#${appointmentId}`}</span>
                            </div>
                            {isSuccess && (
                                <>
                                    <div style={{ height: '1px', background: '#222', margin: '14px 0' }} />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Calendar size={13} color="#555" />
                                            <span style={{ fontSize: '0.8rem', color: '#555' }}>Check bookings for schedule details</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <CreditCard size={13} color="#C19A6B" />
                                            <span style={{ fontSize: '0.8rem', color: '#C19A6B' }}>Payment confirmed</span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <Link to="/customer/bookings" style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '14px 24px',
                            background: '#C19A6B',
                            color: '#111',
                            borderRadius: '10px',
                            textDecoration: 'none',
                            fontWeight: '600',
                            fontSize: '0.9rem',
                            border: 'none',
                        }}>
                            Manage My Bookings <ArrowRight size={16} />
                        </Link>
                        <Link to="/" style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '14px 24px',
                            background: 'transparent',
                            color: '#666',
                            borderRadius: '10px',
                            textDecoration: 'none',
                            fontWeight: '500',
                            fontSize: '0.88rem',
                            border: '1px solid #2a2a2a',
                        }}>
                            <Home size={15} /> Back to Home
                        </Link>
                    </div>

                    {/* Footer */}
                    <p style={{
                        fontSize: '0.73rem',
                        color: '#444',
                        marginTop: '24px',
                        marginBottom: '0',
                    }}>A confirmation has been sent to your registered email.</p>
                </div>
            </div>
        </div>
    );
};

export default BookingConfirmation;
