import React from 'react';
import { Sparkles, Camera, Layers, Zap, Bell, ArrowLeft, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './PortalStyles.css';
import './TryOn.css';
import CustomerSideNav from '../components/CustomerSideNav';

function TryOn() {
    const navigate = useNavigate();

    return (
        <div className="portal-layout">
            <CustomerSideNav />
            <div className="portal-container customer-portal tryon-portal">
                <header className="portal-header">
                    <div className="header-title" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <button className="back-btn" onClick={() => navigate('/customer')}>
                            <ArrowLeft size={20} />
                        </button>
                        <h1>Virtual Try-On</h1>
                    </div>
                </header>

                <div className="portal-content tryon-content">
                    <div className="wip-container">
                        <div className="wip-badge">
                            <Sparkles size={16} />
                            <span>Beta Feature in Development</span>
                        </div>
                        
                        <h2 className="wip-title">The Future of InkVistAR is Coming</h2>
                        <p className="wip-description">
                            We're crafting a revolutionary Augmented Reality experience designed specifically for mobile hardware. 
                            Visualize any tattoo on your skin with precision 3D mapping and dynamic lighting.
                        </p>

                        <div className="mobile-notice">
                            <Smartphone size={20} />
                            <span>Launching soon on App Store & Google Play</span>
                        </div>

                        <div className="feature-teasers">
                            <div className="teaser-card">
                                <div className="teaser-icon">
                                    <Camera size={24} />
                                </div>
                                <h3>AR Instant Placement</h3>
                                <p>See designs in real-time as you move.</p>
                            </div>
                            <div className="teaser-card">
                                <div className="teaser-icon">
                                    <Layers size={24} />
                                </div>
                                <h3>3D Skin Mapping</h3>
                                <p>Perfect wrap around curves and muscles.</p>
                            </div>
                            <div className="teaser-card">
                                <div className="teaser-icon">
                                    <Zap size={24} />
                                </div>
                                <h3>Dynamic Lighting</h3>
                                <p>Realistic shadows and skin texture blending.</p>
                            </div>
                        </div>

                        <div className="wip-actions">
                            <button className="notify-btn">
                                <Bell size={18} />
                                Notify Me on Launch
                            </button>
                        </div>

                        <div className="progress-bar-container">
                            <div className="progress-label">
                                <span>Development Progress</span>
                                <span>75%</span>
                            </div>
                            <div className="progress-track">
                                <div className="progress-fill"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TryOn;
