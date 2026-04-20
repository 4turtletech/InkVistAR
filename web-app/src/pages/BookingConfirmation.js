import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import { CheckCircle, Clock, ArrowRight, CreditCard, Calendar, AlertTriangle } from 'lucide-react';
import { getDisplayCode } from '../utils/formatters';
import CustomerSideNav from '../components/CustomerSideNav';
import './PortalStyles.css';

const BookingConfirmation = () => {
    const location = useLocation();
    const [appointmentId, setAppointmentId] = useState(null);
    const [bookingDisplayCode, setBookingDisplayCode] = useState(null);
    const [verificationStatus, setVerificationStatus] = useState('verifying');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const id = location.state?.appointmentId || params.get('appointmentId');
        const type = location.state?.paymentType || params.get('paymentType');
        const bookingCodeFromState = location.state?.bookingCode || params.get('bookingCode') || null;

        if (id) {
            setAppointmentId(id);
            if (bookingCodeFromState) {
                setBookingDisplayCode(getDisplayCode(decodeURIComponent(bookingCodeFromState), id));
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

                // Always try to resolve booking code from API response
                if (res.data.booking_code) {
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
        <div className="portal-layout">
            <CustomerSideNav />
            <div className="portal-container customer-portal">
                <header className="portal-header">
                    <div className="header-title">
                        <h1>Payment Confirmation</h1>
                    </div>
                </header>

                <div className="portal-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '40px' }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '520px',
                        background: 'white',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                        overflow: 'hidden',
                    }}>
                        {/* Top accent */}
                        <div style={{
                            height: '4px',
                            background: isPending ? 'linear-gradient(90deg, #6366f1, #818cf8)' :
                                        isTimeout ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' :
                                        'linear-gradient(90deg, #10b981, #34d399)',
                        }} />

                        <div style={{ padding: '48px 36px 40px', textAlign: 'center' }}>

                            {/* Status Icon */}
                            {isPending && (
                                <div style={{
                                    width: '80px', height: '80px',
                                    margin: '0 auto 28px',
                                    borderRadius: '50%',
                                    background: '#eef2ff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <div style={{
                                        width: '36px', height: '36px',
                                        border: '3px solid #e0e7ff',
                                        borderTop: '3px solid #6366f1',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite',
                                    }} />
                                </div>
                            )}
                            {isTimeout && (
                                <div style={{
                                    width: '80px', height: '80px',
                                    margin: '0 auto 28px',
                                    borderRadius: '50%',
                                    background: '#fffbeb',
                                    border: '2px solid #fde68a',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <AlertTriangle size={36} color="#f59e0b" strokeWidth={1.5} />
                                </div>
                            )}
                            {isSuccess && (
                                <div style={{
                                    width: '80px', height: '80px',
                                    margin: '0 auto 28px',
                                    borderRadius: '50%',
                                    background: '#ecfdf5',
                                    border: '2px solid #a7f3d0',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <CheckCircle size={40} color="#10b981" strokeWidth={1.5} />
                                </div>
                            )}

                            {/* Heading */}
                            {isPending && (
                                <>
                                    <h2 style={{
                                        fontSize: '1.5rem',
                                        fontWeight: '700',
                                        color: '#1e293b',
                                        margin: '0 0 10px',
                                    }}>Verifying Payment</h2>
                                    <p style={{
                                        color: '#64748b',
                                        fontSize: '0.92rem',
                                        lineHeight: '1.6',
                                        margin: '0',
                                    }}>Confirming your transaction with PayMongo. This only takes a moment.</p>
                                </>
                            )}
                            {isTimeout && (
                                <>
                                    <h2 style={{
                                        fontSize: '1.5rem',
                                        fontWeight: '700',
                                        color: '#1e293b',
                                        margin: '0 0 10px',
                                    }}>Taking a Moment</h2>
                                    <p style={{
                                        color: '#64748b',
                                        fontSize: '0.92rem',
                                        lineHeight: '1.6',
                                        margin: '0',
                                    }}>Your booking is safe — confirmation is taking longer than usual. Check your bookings shortly.</p>
                                </>
                            )}
                            {isSuccess && (
                                <>
                                    <h2 style={{
                                        fontSize: '1.5rem',
                                        fontWeight: '700',
                                        color: '#1e293b',
                                        margin: '0 0 10px',
                                    }}>Booking Confirmed</h2>
                                    <p style={{
                                        color: '#64748b',
                                        fontSize: '0.92rem',
                                        lineHeight: '1.6',
                                        margin: '0',
                                    }}>Payment successful. Your slot is now reserved at InkVistAR Studio.</p>
                                </>
                            )}

                            {/* Divider */}
                            <div style={{ height: '1px', background: '#e2e8f0', margin: '28px 0' }} />

                            {/* Booking Reference Card */}
                            {(bookingDisplayCode || appointmentId) && (
                                <div style={{
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    padding: '20px 24px',
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
                                            color: '#64748b',
                                            fontWeight: '600',
                                            letterSpacing: '0.1em',
                                            textTransform: 'uppercase',
                                        }}>Booking Reference</span>
                                        <span style={{
                                            fontSize: '1.05rem',
                                            fontWeight: '700',
                                            color: '#6366f1',
                                            letterSpacing: '0.03em',
                                            fontFamily: 'monospace',
                                        }}>{bookingDisplayCode || `#${appointmentId}`}</span>
                                    </div>
                                    {isSuccess && (
                                        <>
                                            <div style={{ height: '1px', background: '#e2e8f0', margin: '14px 0' }} />
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <Calendar size={14} color="#64748b" />
                                                    <span style={{ fontSize: '0.85rem', color: '#475569' }}>Check bookings for schedule details</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <CreditCard size={14} color="#10b981" />
                                                    <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>Payment confirmed</span>
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
                                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                    color: 'white',
                                    borderRadius: '10px',
                                    textDecoration: 'none',
                                    fontWeight: '600',
                                    fontSize: '0.92rem',
                                    border: 'none',
                                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                                    transition: 'all 0.2s ease',
                                }}>
                                    Manage My Bookings <ArrowRight size={16} />
                                </Link>
                            </div>

                            {/* Footer */}
                            <p style={{
                                fontSize: '0.78rem',
                                color: '#94a3b8',
                                marginTop: '24px',
                                marginBottom: '0',
                            }}>A confirmation has been sent to your registered email.</p>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default BookingConfirmation;
