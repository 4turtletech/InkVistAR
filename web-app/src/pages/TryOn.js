import React from 'react';
import { Sparkles, Camera, Layers, Zap, Bell, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './TryOn.css';
import CustomerSideNav from '../components/CustomerSideNav';

function TryOn() {
    const navigate = useNavigate();

    return (
        <div className="portal-layout">
            <CustomerSideNav />
            <div className="portal-container tryon-portal">
                <div className="tryon-overlay"></div>
                
                <header className="portal-header tryon-header">
                    <div className="header-title">
                        <button className="back-btn" onClick={() => navigate('/customer')}>
                            <ArrowLeft size={20} />
                        </button>
                        <h1>Virtual Try-On</h1>
                    </div>
                </header>

                <main className="tryon-content">
                    <div className="wip-container">
                        <div className="wip-badge">
                            <Sparkles size={16} />
                            <span>Beta Feature in Development</span>
                        </div>
                        
                        <h2 className="wip-title">The Future of InVistAR is Coming</h2>
                        <p className="wip-description">
                            We're crafting a revolutionary Augmented Reality experience that lets you 
                            visualize any tattoo on your body with precision lighting and 3D skin mapping.
                        </p>

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
                            <p className="privacy-note">Join 1,240+ users on the early-access list.</p>
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
                </main>
            </div>
        </div>
    );
}

export default TryOn;
