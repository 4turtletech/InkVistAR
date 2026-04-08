import { Mail, Phone, MapPin, Instagram, Facebook } from 'lucide-react';
import './Footer.css';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-content">
                <div className="footer-section">
                    <h2 className="footer-logo">
                        <img src="/images/logo.png" alt="InkVistAR Logo" style={{ width: '40px', height: 'auto', marginRight: '15px' }} />
                        INKVICTUS
                    </h2>
                    <p className="footer-description">
                        BGC's Premier Luxury Tattoo Studio. 
                        Elevating the art of tattooing through 
                        sophistication and elite craftsmanship.
                    </p>
                </div>

                <div className="footer-section">
                    <h3>Quick Links</h3>
                    <ul>
                        <li><a href="/">Home</a></li>
                        <li><a href="/about">About Us</a></li>
                        <li><a href="/artists">Artists</a></li>
                        <li><a href="/gallery">Gallery</a></li>
                        <li><a href="/book">Book Consultation</a></li>
                    </ul>
                </div>

                <div className="footer-section">
                    <h3>Contact Us</h3>
                    <div className="contact-item">
                        <MapPin size={18} />
                        <span>W Tower, 5th Ave, BGC, Taguig</span>
                    </div>
                    <div className="contact-item">
                        <Phone size={18} />
                        <span>+63 915 758 5949</span>
                    </div>
                    <div className="contact-item">
                        <Mail size={18} />
                        <span>inkvictustattoo03@gmail.com</span>
                    </div>
                </div>

                <div className="footer-section">
                    <h3>Follow Us</h3>
                    <div className="social-links">
                        <a href="https://www.instagram.com/inkvictustattoo.ph?igsh=dnV3NnE5ZnNnYzFo" target="_blank" rel="noopener noreferrer"><Instagram size={24} /></a>
                        <a href="https://www.facebook.com/share/1KHRA3cY6P/" target="_blank" rel="noopener noreferrer"><Facebook size={24} /></a>
                    </div>
                    <div className="footer-hours">
                        <h4>Studio Hours</h4>
                        <p>Monday - Saturday: 1:00 PM - 8:00 PM</p>
                        <p>Sunday: Closed</p>
                    </div>
                </div>
            </div>
            
            <div className="footer-bottom">
                <p>&copy; {new Date().getFullYear()} InkVistAR / Inkvictus Tattoo Studio. All Rights Reserved.</p>
                <div className="footer-legal">
                    <a href="#" style={{ pointerEvents: 'none', opacity: 0.5, cursor: 'default' }}>Privacy Policy</a>
                    <a href="#" style={{ pointerEvents: 'none', opacity: 0.5, cursor: 'default' }}>Terms of Service</a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
