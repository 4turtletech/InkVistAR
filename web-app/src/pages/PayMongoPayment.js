import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';

const PayMongoPayment = () => {
    const [status, setStatus] = useState('pending');
    const [paymentIntent, setPaymentIntent] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { appointmentId, price } = location.state || { appointmentId: null, price: 50 };

    useEffect(() => {
        if (!appointmentId) {
            alert('Error: No appointment ID found. Cannot proceed with payment.');
            navigate('/customer/bookings');
            return;
        }

        const createPaymentIntent = async () => {
            try {
                const response = await axios.post(`${API_URL}/api/payments/create-payment-intent`, {
                    amount: price * 100, // PayMongo requires amount in centavos
                    currency: 'PHP',
                    description: `Payment for appointment ${appointmentId}`,
                });
                setPaymentIntent(response.data);
            } catch (error) {
                console.error('Failed to create payment intent:', error);
                setStatus('failed');
                alert('Failed to initialize payment. Please try again.');
            }
        };

        createPaymentIntent();
    }, [appointmentId, price, navigate]);

    const handlePayment = async () => {
        if (!paymentIntent) {
            alert('Payment is not yet initialized. Please wait.');
            return;
        }

        setStatus('processing');
        // This is a simplified simulation of redirecting to PayMongo's hosted checkout page
        // In a real-world scenario, you would redirect the user to the checkout URL provided by PayMongo
        // and handle the callback or webhook for payment status updates.
        setTimeout(async () => {
            try {
                // Simulate a successful payment
                await axios.post(`${API_URL}/api/payments/verify`, {
                    appointmentId,
                    paymentId: paymentIntent.data.id,
                });

                setStatus('success');
                navigate('/booking-confirmation', { state: { appointmentId } });
            } catch (error) {
                console.error('Payment verification failed:', error);
                setStatus('failed');
                alert('Payment Failed. Please try again or contact support.');
            }
        }, 2000);
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

    const buttonStyles = {
        width: '100%',
        padding: '12px',
        marginTop: '24px',
        backgroundColor: status === 'processing' ? '#60a5fa' : '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: status === 'processing' ? 'not-allowed' : 'pointer',
    };

    if (!paymentIntent) {
        return (
            <div style={pageStyles}>
                <div style={cardStyles}>
                    <p>Initializing payment...</p>
                </div>
            </div>
        );
    }

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
                    <h4 style={{ marginTop: 0, marginBottom: '16px' }}>Redirecting to PayMongo...</h4>
                    <p>You will be redirected to a secure payment page to complete your payment.</p>
                </div>

                <button onClick={() => window.location.href = paymentIntent.data.attributes.checkout_url} disabled={status === 'processing'} style={buttonStyles}>
                    {status === 'processing' ? 'Processing...' : `Pay PHP ${price.toFixed(2)}`}
                </button>
            </div>
        </div>
    );
};

export default PayMongoPayment;