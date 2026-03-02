import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerSideNav from '../components/CustomerSideNav';
import CustomerBookingWizard from '../components/CustomerBookingWizard';
import './PortalStyles.css';

function CustomerBookingCreate() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));
    const customerId = user ? user.id : null;

    useEffect(() => {
        if (!customerId) {
            navigate('/login');
            return;
        }
    }, [customerId, navigate]);

    return (
        <div className="portal-layout">
            <CustomerSideNav />
            <div className="portal-container customer-portal">
                <header className="portal-header">
                    <h1>Book Appointment</h1>
                </header>
                <div className="portal-content">
                    <CustomerBookingWizard 
                        customerId={customerId} 
                        onBack={() => navigate('/customer')} 
                    />
                </div>
            </div>
        </div>
    );
}

export default CustomerBookingCreate;