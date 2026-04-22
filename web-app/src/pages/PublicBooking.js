import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerBookingWizard from '../components/CustomerBookingWizard';
import Navbar from '../components/Navbar';
import ChatWidget from '../components/ChatWidget';

function PublicBooking() {
    const navigate = useNavigate();
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <div style={{ backgroundColor: '#0D0D0D', minHeight: '100vh', color: '#fff', paddingBottom: isMobile ? '30px' : '50px' }}>
            <Navbar />

            <div style={{ maxWidth: '1050px', margin: isMobile ? '80px auto 0' : '140px auto 0', padding: isMobile ? '0 12px' : '0 20px' }}>
                <header style={{ textAlign: 'center', marginBottom: isMobile ? '24px' : '40px' }}>
                    <h1 style={{ color: '#be9055', fontFamily: '"Playfair Display", serif', fontSize: 'clamp(1.4rem, 5vw, 3rem)', margin: '0 0 10px 0' }}>BOOK A CONSULTATION</h1>
                    <p style={{ color: '#aaa', fontSize: 'clamp(0.82rem, 2.5vw, 1.1rem)', padding: isMobile ? '0 8px' : '0' }}>Share your vision and secure a time to discuss your next masterpiece with our specialist team.</p>
                </header>

                <div style={{ borderRadius: isMobile ? '12px' : '15px', color: '#000', overflow: 'hidden' }}>
                    <CustomerBookingWizard 
                        customerId={null} 
                        isPublic={true}
                        onBack={() => navigate(-1)} 
                    />
                </div>
            </div>

            <ChatWidget />
        </div>
    );
}

export default PublicBooking;
