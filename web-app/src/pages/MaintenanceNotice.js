import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Wrench, MessageSquare, ArrowLeft } from 'lucide-react';
import { MAINTENANCE_CONFIG } from '../maintenanceConfig';
import Navbar from '../components/Navbar';
import './MaintenanceNotice.css';

const MaintenanceNotice = ({ type }) => {
  const navigate = useNavigate();
  const isBooking = type === 'booking';

  const headingText = isBooking 
    ? 'Booking Temporarily Under Maintenance' 
    : 'Account Registration Temporarily Suspended';

  const descriptionText = isBooking
    ? 'We are currently optimizing our online booking system to provide you with a more seamless experience. To book a consultation or check scheduling options in the meantime, please message us directly on Facebook.'
    : 'Online account registration is temporarily offline as we perform system updates. You can still schedule appointments, request consultations, or ask questions by reaching out directly to our Facebook team.';

  const handleFacebookRedirect = () => {
    window.open(MAINTENANCE_CONFIG.facebookUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="maintenance-page-wrapper">
      <Navbar />
      <div className="maintenance-glass-overlay">
        <div className="maintenance-card">
          <div className="maintenance-icon-badge">
            {isBooking ? <Wrench size={40} className="pulse-icon" /> : <AlertTriangle size={40} className="pulse-icon" />}
          </div>
          
          <h1 className="maintenance-title">{headingText}</h1>
          <p className="maintenance-description">{descriptionText}</p>
          
          <div className="maintenance-cta-group">
            <button 
              onClick={handleFacebookRedirect} 
              className="maintenance-primary-btn"
              title="Redirect to InkVictus Facebook Page"
            >
              <MessageSquare size={18} />
              <span>Message Us on Facebook</span>
            </button>
            
            <button 
              onClick={() => navigate('/')} 
              className="maintenance-secondary-btn"
              title="Return to Home Page"
            >
              <ArrowLeft size={18} />
              <span>Back to Home</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceNotice;
