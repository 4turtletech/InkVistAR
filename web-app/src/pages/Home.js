import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Home.css';
import Navbar from '../components/Navbar';
import ChatWidget from '../components/ChatWidget';
import Footer from '../components/Footer';
import { ChevronLeft, ChevronRight, ChevronDown, PenTool, Crop, Aperture } from 'lucide-react';
import { API_URL } from '../config';

// Dynamic Artist List
const FEATURED_ARTISTS = [
    { name: 'Troy', style: 'Black & Grey Realism', image: '/images/tattoos/media__1775672821008.jpg' },
    { name: 'Lloid', style: 'Fine Line Geometry', image: '/images/tattoos/media__1775672821025.jpg' },
    { name: 'Ken', style: 'Traditional Japanese', image: '/images/tattoos/media__1775672821057.jpg' },
    { name: 'Mar', style: 'Neo-Traditional', image: '/images/tattoos/media__1775672821061.jpg' },
    { name: 'Brian', style: 'Surrealism', image: '/images/tattoos/media__1775671277040.jpg' },
    { name: 'JeaR', style: 'Dotwork & Mandala', image: '/images/tattoos/media__1775667820757.jpg' },
    { name: 'Lem', style: 'Watercolor', image: '/images/tattoos/media__1775667820770.jpg' },
    { name: 'Renz', style: 'Tribal / Polynesian', image: '/images/tattoos/media__1775667820781.jpg' },
    { name: 'Carl', style: 'Minimalist', image: '/images/tattoos/media__1775667820747.jpg' }
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

    // Artists Slider
    const sliderRef = useRef(null);

    // Auto-scroll Artists Slider every 10 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            if (sliderRef.current) {
                const slider = sliderRef.current;
                const scrollLeft = slider.scrollLeft;
                const scrollWidth = slider.scrollWidth;
                const clientWidth = slider.clientWidth;

                // If we've reached the end, scroll back to the beginning smoothly
                if (scrollLeft + clientWidth >= scrollWidth - 10) {
                    slider.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    // Otherwise scroll right by slightly less than the client width for overlap context
                    slider.scrollBy({ left: clientWidth * 0.8, behavior: 'smooth' });
                }
            }
        }, 10000); // 10 seconds

        return () => clearInterval(interval);
    }, []);

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
                        <h1 className="hero-title"><span>INKVICTUS</span> TATTOO</h1>
                        <button onClick={() => navigate('/book')} className="btn-gold-luxury">
                            Book Consultation
                        </button>
                    </div>
                    
                    <div className="scroll-indicator fade-up visible">
                        <ChevronDown size={32} color="var(--accent-gold)" />
                    </div>

                </header>

                {/* 2. Featured Artists */}
                <section className="premium-section fade-up" ref={artistsRef}>
                    <div className="section-header">
                        <span className="section-subtitle">Our Talent</span>
                        <h2 className="section-title">The Masters of Ink</h2>
                    </div>

                    <div className="home-slider-wrapper">
                        {/* Left Control */}
                        <button 
                            className="home-slider-btn left" 
                            onClick={() => sliderRef.current?.scrollBy({ left: -350, behavior: 'smooth' })}
                            aria-label="Scroll left"
                        >
                            <ChevronLeft size={28} />
                        </button>

                        <div className="home-artists-track" ref={sliderRef}>
                            {FEATURED_ARTISTS.map((artist, idx) => (
                                <div key={idx} className="home-artist-card" onClick={() => navigate(`/artist/${idx + 1}`)}>
                                    <img 
                                        src={artist.image} 
                                        alt={artist.name} 
                                        className="home-artist-img" 
                                    />
                                    <div className="home-artist-overlay">
                                        <h4 className="home-artist-name">{artist.name}</h4>
                                        <span className="home-artist-style">{artist.style}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Right Control */}
                        <button 
                            className="home-slider-btn right" 
                            onClick={() => sliderRef.current?.scrollBy({ left: 350, behavior: 'smooth' })}
                            aria-label="Scroll right"
                        >
                            <ChevronRight size={28} />
                        </button>
                    </div>
                </section>

                {/* 3. The Matrix / About Extravaganza */}
                <section className="premium-section fade-up" ref={matrixRef}>
                    <div className="glass-card-premium matrix-grid">
                        <div className="matrix-content">
                            <span className="section-subtitle">Our Philosophy</span>
                            <h2 className="section-title" style={{ marginBottom: '2rem' }}>Crafting Timeless Art in BGC</h2>
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
                                <img src="/images/tattoos/media__1775711211750.png" alt="Studio Dark Concept" />
                            </div>
                            <div className="matrix-img-box">
                                <img src="/images/tattoos/media__1775711217542.png" alt="Inkvictus V Logo" />
                            </div>
                            <div className="matrix-img-box">
                                <img src="/images/tattoos/media__1775711217566.png" alt="Luxurious Studio Setup" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* 4. Our Services */}
                <section className="premium-section fade-up" ref={servicesRef}>
                    <div className="section-header">
                        <span className="section-subtitle">Expertise</span>
                        <h2 className="section-title">Specialized Services</h2>
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
                        <h2 className="section-title">The Experience</h2>
                    </div>
                    
                    <div className="premium-carousel-container" style={{ marginBottom: '2rem' }}>
                        {testimonials.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem 0', borderTop: '1px solid var(--border-glass)', borderBottom: '1px solid var(--border-glass)' }}>
                                <PenTool size={32} color="var(--accent-gold)" style={{ opacity: 0.5, marginBottom: '1rem' }} />
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase' }}>No chronicles recorded yet. Be the first to leave a mark.</p>
                            </div>
                        ) : (
                            <>
                                <div className="perspective-carousel">
                                    {testimonials.map((testimony, idx) => {
                                        const total = testimonials.length;
                                        let offset = idx - currentSlide;
                                        // Wrap around for circular carousel
                                        if (offset > Math.floor(total / 2)) offset -= total;
                                        if (offset < -Math.floor(total / 2)) offset += total;

                                        const isActive = offset === 0;
                                        const isVisible = Math.abs(offset) <= 1;

                                        return (
                                            <div 
                                                key={testimony.id || idx} 
                                                className={`perspective-slide ${isActive ? 'active' : ''}`}
                                                style={{
                                                    transform: `translateX(${offset * 75}%) scale(${isActive ? 1 : 0.75})`,
                                                    opacity: isVisible ? (isActive ? 1 : 0.45) : 0,
                                                    zIndex: isActive ? 10 : 5 - Math.abs(offset),
                                                    pointerEvents: isActive ? 'auto' : 'none',
                                                    filter: isActive ? 'none' : 'blur(1.5px)',
                                                }}
                                                onClick={() => !isActive && setCurrentSlide(idx)}
                                            >
                                                <div className="perspective-card">
                                                    <div className="perspective-card-inner">
                                                        <div className="perspective-quote-mark">"</div>
                                                        <div className="perspective-stars">
                                                            {[1,2,3,4,5].map(s => (
                                                                <span key={s} className={`perspective-star ${s <= (testimony.rating || 5) ? 'filled' : ''}`}>★</span>
                                                            ))}
                                                        </div>
                                                        <p className="perspective-comment">{testimony.comment || testimony.content || 'Amazing experience!'}</p>
                                                        <div className="perspective-divider"></div>
                                                        <div className="perspective-author">
                                                            <div className="perspective-avatar">{(testimony.customer_name || 'C')[0].toUpperCase()}</div>
                                                            <div>
                                                                <h4 className="perspective-name">{testimony.customer_name || 'Inkvictus Client'}</h4>
                                                                <span className="perspective-label">Verified Client</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
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
                        <h2 className="cta-title">Ready to Make Your Mark?</h2>
                        <button onClick={() => navigate('/book')} className="btn-gold-luxury" style={{ padding: '1.5rem 4rem', fontSize: '1.2rem' }}>
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
