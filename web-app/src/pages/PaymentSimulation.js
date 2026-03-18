import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';

const PaymentSimulation = () => {
    const [status, setStatus] = useState('pending');
    const [checkoutUrl, setCheckoutUrl] = useState(null);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { appointmentId, price } = location.state || { appointmentId: null, price: 50 };

    useEffect(() => {
        if (!appointmentId) {
            alert('Error: No appointment ID found. Cannot proceed with payment.');
            navigate('/customer/bookings');
            return;
        }

        const initCheckout = async () => {
            setStatus('processing');
            try {
                const response = await axios.post(`${API_URL}/api/payments/create-checkout-session`, {
                    appointmentId,
                });

                if (response.data?.checkoutUrl) {
                    setCheckoutUrl(response.data.checkoutUrl);
                    setStatus('ready');
                } else {
                    throw new Error('No checkout URL returned');
                }
            } catch (err) {
                console.error('Failed to start payment:', err);
                setError('Failed to start payment. Please try again or contact support.');
                setStatus('failed');
            }
        };

        initCheckout();
    }, [appointmentId, navigate]);

    const handleRedirect = () => {
        if (!checkoutUrl) return;
        setStatus('redirecting');
        window.location.href = checkoutUrl;
    };

    const pageStyles = {
        backgroundColor: '#f7f8fa',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    };

    const cardStyles = {
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        padding: '32px',
        width: '100%',
        maxWidth: '400px',
    };

    const headerStyles = {
        textAlign: 'center',
        marginBottom: '24px',
    };
    
    const inputStyles = {
        width: '100%',
        padding: '12px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '16px',
        boxSizing: 'border-box', // Important for padding and width to work together
    };

    const buttonStyles = {
        width: '100%',
        padding: '12px',
        marginTop: '24px',
        backgroundColor: status === 'ready' ? '#3b82f6' : '#9ca3af',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: status === 'ready' ? 'pointer' : 'not-allowed',
        transition: 'background-color 0.2s ease',
    };

    return (
        <div style={pageStyles}>
            <div style={cardStyles}>
                <div style={headerStyles}>
                    <h2 style={{ margin: '0 0 8px 0' }}>InkVistAR</h2>
                    <p style={{ margin: 0, color: '#6b7280' }}>Appointment ID: {appointmentId || 'N/A'}</p>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '16px 0 0 0' }}>
                        PHP {price.toFixed(2)}
                    </p>
                </div>

                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
                    <h4 style={{ marginTop: 0, marginBottom: '12px' }}>Secure payment</h4>
                    <p style={{ margin: 0, color: '#6b7280' }}>
                        You will be redirected to PayMongo's hosted checkout to complete your payment.
                    </p>
                    {error && <p style={{ color: '#dc2626', marginTop: '12px' }}>{error}</p>}
                </div>

                <button
                    onClick={handleRedirect}
                    disabled={status !== 'ready'}
                    style={buttonStyles}
                >
                    {status === 'ready' && `Pay PHP ${price.toFixed(2)}`}
                    {status === 'redirecting' && 'Redirecting...'}
                    {status === 'failed' && 'Try Again'}
                    {status !== 'ready' && status !== 'redirecting' && status !== 'failed' && 'Initializing...'}
                </button>
            </div>
        </div>
    );
};

export default PaymentSimulation;
