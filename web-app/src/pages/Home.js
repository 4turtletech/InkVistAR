import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Home.css';
import Navbar from '../components/Navbar';
import ChatWidget from '../components/ChatWidget';
import Footer from '../components/Footer';
import { ChevronLeft, ChevronRight, PenTool, Crop, Aperture } from 'lucide-react';
import { API_URL } from '../config';

// Dynamic Artist List
const FEATURED_ARTISTS = [
    { name: 'Troy', style: 'Black & Grey Realism', image: '/images/tattoos/media__1775660017173.jpg' },
    { name: 'Lloid', style: 'Fine Line Geometry', image: '/images/tattoos/media__1775660017196.jpg' },
    { name: 'Ken', style: 'Traditional Japanese', image: '/images/tattoos/media__1775660017816.jpg' },
    { name: 'Mar', style: 'Neo-Traditional', image: '/images/tattoos/media__1775667820736.jpg' },
    { name: 'Brian', style: 'Surrealism', image: '/images/tattoos/media__1775667820747.jpg' },
    { name: 'JeaR', style: 'Dotwork & Mandala', image: '/images/tattoos/media__1775667820757.jpg' },
    { name: 'Lem', style: 'Watercolor', image: '/images/tattoos/media__1775667820770.jpg' },
    { name: 'Renz', style: 'Tribal / Polynesian', image: '/images/tattoos/media__1775667820781.jpg' },
    { name: 'Carl', style: 'Minimalist', image: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&q=80&w=600' } // Fallback to premium unsplash for the 9th
];

function Home() {
    const navigate = useNavigate();
    const location = useLocation();

    // Intersection Observer for scroll animations
    const useScrollFade = () => {
        const ref = useRef(null);
        useEffect(() => {
            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                    }
                },
                { threshold: 0.1 }
            );
            if (ref.current) observer.observe(ref.current);
            return () => {
                if (ref.current) observer.unobserve(ref.current);
            };
        }, []);
        return ref;
    };

    const artistsRef = useScrollFade();
    const servicesRef = useScrollFade();
    const matrixRef = useScrollFade();
    const testimonialsRef = useScrollFade();

    // Testimonials State
    const [testimonials, setTestimonials] = useState([]);
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        fetch(`${API_URL}/api/reviews`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.reviews && data.reviews.length > 0) {
                    // Filter approved is ideally done on the backend, but we'll ensure safety here
                    const approved = data.reviews.filter(r => r.status === 'approved' || r.status === undefined);
                    setTestimonials(approved);
                } else {
                    setTestimonials([]); // Start blank if no data
                }
            })
            .catch(err => {
                console.error("Error fetching reviews:", err);
                setTestimonials([]);
            });
    }, []);

    const nextSlide = useCallback(() => {
        setCurrentSlide(prev => (prev === testimonials.length - 1 ? 0 : prev + 1));
    }, [testimonials.length]);

    const prevSlide = useCallback(() => {
        setCurrentSlide(prev => (prev === 0 ? testimonials.length - 1 : prev - 1));
    }, [testimonials.length]);

    useEffect(() => {
        const interval = setInterval(nextSlide, 5000);
        return () => clearInterval(interval);
    }, [nextSlide]);

    return (
        <>
            <Navbar />
            <div className="home-container">
                
                {/* 1. Hero Section */}
                <header className="hero-header">
                    <div className="hero-parallax-bg">
                        {/* Parallax effect grid leveraging dark high-res Unsplash ink images */}
                        <img className="hero-parallax-img" src="https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?auto=format&fit=crop&q=80&w=1000" alt="Tattoo Art 1" />
                        <img className="hero-parallax-img" src="https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&q=80&w=1000" alt="Tattoo Art 2" />
                        <img className="hero-parallax-img" src="https://images.unsplash.com/photo-1562962230-16e4623d36e6?auto=format&fit=crop&q=80&w=1000" alt="Tattoo Art 3" />
                    </div>
                    <div className="hero-overlay"></div>
                    
                    <div className="hero-content fade-up visible">
                        <span className="hero-tagline">BGC's Premier Studio</span>
                        <h1 className="hero-title">INKVICTUS <span>TATTOO</span></h1>
                        <button onClick={() => navigate('/register')} className="btn-gold-luxury">
                            Book Consultation
                        </button>
                    </div>

                    <div className="scroll-indicator">
                        <span>Scroll</span>
                        <div className="line"></div>
                    </div>
                </header>

                {/* 2. Featured Artists */}
                <section className="premium-section fade-up" ref={artistsRef}>
                    <div className="section-header">
                        <span className="section-subtitle">Our Talent</span>
                        <h2 className="section-title">The <i>Masters</i> of Ink</h2>
                    </div>
                    <div className="artists-grid">
                        {FEATURED_ARTISTS.map((artist, idx) => (
                            <div key={idx} className="artist-card">
                                <img src={artist.image} alt={artist.name} className="artist-img" onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&q=80&w=600'; }} />
                                <div className="artist-overlay">
                                    <h4 className="artist-name">{artist.name}</h4>
                                    <span className="artist-style">{artist.style}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 3. The Matrix / About Extravaganza */}
                <section className="premium-section fade-up" ref={matrixRef}>
                    <div className="glass-card-premium matrix-grid">
                        <div className="matrix-content">
                            <span className="section-subtitle">Our Philosophy</span>
                            <h2 className="section-title" style={{ marginBottom: '2rem' }}>Crafting <i>Timeless</i> Art in BGC</h2>
                            <p className="matrix-text">
                                Inkvictus Tattoo is more than just a studio; it is a sanctuary for art and expression. Located in the heart of BGC, we offer a premium experience that combines world-class artistry with the highest standards of hygiene and comfort.
                            </p>
                            <p className="matrix-text">
                                Every session is designed to be an experience worth attending, set in a professional and relaxing atmosphere that elevates what getting a tattoo stands for.
                            </p>
                            <button onClick={() => navigate('/gallery')} className="btn-gold-luxury" style={{ marginTop: '1rem', background: 'transparent', border: '1px solid #C19A6B', color: '#C19A6B' }}>
                                View Gallery
                            </button>
                        </div>
                        <div className="matrix-images">
                            <div className="matrix-img-box">
                                <img src="/images/tattoos/media__1775660017196.jpg" alt="Fine Line Work" onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?auto=format&fit=crop&q=80&w=800'; }} />
                            </div>
                            <div className="matrix-img-box">
                                <img src="https://images.unsplash.com/photo-1605218427368-35b0f99846b1?auto=format&fit=crop&q=80&w=800" alt="Studio Interior" />
                            </div>
                            <div className="matrix-img-box">
                                <img src="/images/tattoos/media__1775667820757.jpg" alt="Detail Work" onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?auto=format&fit=crop&q=80&w=800'; }} />
                            </div>
                        </div>
                    </div>
                </section>

                {/* 4. Our Services */}
                <section className="premium-section fade-up" ref={servicesRef}>
                    <div className="section-header">
                        <span className="section-subtitle">Expertise</span>
                        <h2 className="section-title">Specialized <i>Services</i></h2>
                    </div>
                    <div className="services-container">
                        <div className="service-item glass-card-premium">
                            <div className="service-icon"><PenTool size={30} /></div>
                            <h3 className="service-title">Hyper-Realism</h3>
                            <p className="service-desc">Immaculate detail and shading mimicking photograph quality across skin canvases.</p>
                        </div>
                        <div className="service-item glass-card-premium">
                            <div className="service-icon"><Crop size={30} /></div>
                            <h3 className="service-title">Fine-Line / Geometric</h3>
                            <p className="service-desc">Precision line work resulting in delicate, highly structural, and minimalist designs.</p>
                        </div>
                        <div className="service-item glass-card-premium">
                            <div className="service-icon"><Aperture size={30} /></div>
                            <h3 className="service-title">Custom Concept</h3>
                            <p className="service-desc">Collaborative ideation bridging your vision strictly with our artists' signature aesthetics.</p>
                        </div>
                    </div>
                </section>

                {/* 5. Testimonials */}
                <section className="premium-section fade-up" ref={testimonialsRef}>
                    <div className="section-header">
                        <span className="section-subtitle">Reputation</span>
                        <h2 className="section-title">The <i>Experience</i></h2>
                    </div>
                    
                    <div className="premium-carousel-container">
                        {testimonials.length === 0 ? (
                            <div className="glass-card-premium" style={{ textAlign: 'center', padding: '4rem 2rem', opacity: 0.7 }}>
                                <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>There are currently no reviews available. Be the first to leave a mark!</p>
                            </div>
                        ) : (
                            <>
                                <div className="carousel-track" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                                    {testimonials.map((testimony, idx) => (
                                        <div key={testimony.id || idx} className={`carousel-slide ${idx === currentSlide ? 'active' : ''}`}>
                                            <div className="premium-testimonial-card glass-card-premium">
                                                <div className="testimonial-stars">
                                                    {'★'.repeat(testimony.rating || 5)}{'☆'.repeat(5 - (testimony.rating || 5))}
                                                </div>
                                                <h4 className="testimonial-author">{testimony.customer_name || 'Inkvictus Valued Client'}</h4>
                                                <p className="testimonial-body">"{testimony.comment || testimony.content}"</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {testimonials.length > 1 && (
                                    <div className="carousel-controls">
                                        <button className="carousel-btn" onClick={prevSlide}><ChevronLeft size={24} /></button>
                                        <div className="carousel-indicators">
                                            {testimonials.map((_, idx) => (
                                                <button 
                                                    key={idx} 
                                                    className={`indicator-dot ${idx === currentSlide ? 'active' : ''}`}
                                                    onClick={() => setCurrentSlide(idx)}
                                                />
                                            ))}
                                        </div>
                                        <button className="carousel-btn" onClick={nextSlide}><ChevronRight size={24} /></button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </section>

                {/* 6. Final CTA */}
                <section className="final-cta-section fade-up">
                    <div className="cta-bg"></div>
                    <div className="cta-content">
                        <h2 className="cta-title">Ready to Make Your <i>Mark?</i></h2>
                        <button onClick={() => navigate('/register')} className="btn-gold-luxury" style={{ padding: '1.5rem 4rem', fontSize: '1.2rem' }}>
                            Begin Your Journey
                        </button>
                    </div>
                </section>

                <Footer />
            </div>
            <ChatWidget />
        </>
    );
}

export default Home;
