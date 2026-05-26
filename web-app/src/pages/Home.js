import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import Navbar from '../components/Navbar';
import ChatWidget from '../components/ChatWidget';
import Footer from '../components/Footer';
import ImageLightbox from '../components/ImageLightbox';
import { ChevronLeft, ChevronRight, ChevronDown, PenTool, Sparkles, Smartphone, Star, MapPin, ShieldCheck, ArrowRight, Plus, Minus } from 'lucide-react';
import { API_URL } from '../config';

const MagneticButton = ({ children, onClick, className }) => {
    const btnRef = useRef(null);
    const handleMouseMove = (e) => {
        const btn = btnRef.current;
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
    };
    const handleMouseLeave = () => {
        const btn = btnRef.current;
        if (!btn) return;
        btn.style.transform = `translate(0px, 0px)`;
    };
    return (
        <button 
            ref={btnRef} 
            className={className} 
            onClick={onClick} 
            onMouseMove={handleMouseMove} 
            onMouseLeave={handleMouseLeave}
            style={{ transition: 'background 0.4s ease, box-shadow 0.4s ease' }}
        >
            {children}
        </button>
    );
};

function Home() {
    const navigate = useNavigate();
    const [lightboxSrc, setLightboxSrc] = useState(null);
    const [scrollY, setScrollY] = useState(0);
    const [openFaq, setOpenFaq] = useState(null);

    const toggleFaq = (idx) => {
        setOpenFaq(openFaq === idx ? null : idx);
    };

    // Deep Parallax Scroll Tracking
    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Dynamic gallery works from API
    const [showcaseWorks, setShowcaseWorks] = useState([]);

    useEffect(() => {
        fetch(`${API_URL}/api/gallery/works`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.works && data.works.length > 0) {
                    // Randomize and take 4 pieces for the Bento-box grid
                    const shuffled = [...data.works].sort(() => 0.5 - Math.random());
                    setShowcaseWorks(shuffled.slice(0, 4));
                }
            })
            .catch(err => console.error('Error fetching works for home showcase:', err));
    }, []);


    // Intersection Observer for scroll animations (now handles staggered children)
    const useScrollFade = () => {
        const ref = useRef(null);
        useEffect(() => {
            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        // Also trigger staggered children
                        const staggers = entry.target.querySelectorAll('.fade-up');
                        staggers.forEach(el => el.classList.add('visible'));
                    }
                },
                { threshold: 0.15 }
            );
            const currentRef = ref.current;
            if (currentRef) observer.observe(currentRef);
            return () => {
                if (currentRef) observer.unobserve(currentRef);
            };
        }, []);
        return ref;
    };

    const artistsRef = useScrollFade();
    const matrixRef = useScrollFade();
    const servicesRef = useScrollFade();
    const processRef = useScrollFade();
    const hygieneRef = useScrollFade();
    const faqRef = useScrollFade();
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
                {/* Ambient Glowing Orbs */}
                <div className="ambient-wrapper" style={{ transform: `translateY(${scrollY * -0.15}px)` }}>
                    <div className="ambient-glow-1"></div>
                </div>
                <div className="ambient-wrapper" style={{ transform: `translateY(${scrollY * -0.2}px)` }}>
                    <div className="ambient-glow-2"></div>
                </div>
                
                {/* 1. Hero Section */}
                <header className="hero-header">
                    <div 
                        className="hero-parallax-bg"
                        style={{
                            transform: `translateY(${scrollY * 0.4}px)`,
                            filter: `blur(${Math.min(scrollY * 0.015, 8)}px) brightness(${Math.max(1 - scrollY * 0.001, 0.4)})`
                        }}
                    >
                        {/* Looping Hero Video */}
                        <video 
                            className="hero-parallax-img" 
                            autoPlay 
                            loop 
                            muted 
                            playsInline
                            style={{ objectFit: 'cover' }}
                        >
                            <source src="https://assets.mixkit.co/videos/preview/mixkit-tattoo-artist-working-on-a-clients-arm-43099-large.mp4" type="video/mp4" />
                        </video>
                    </div>
                    <div className="hero-overlay" style={{ opacity: Math.min(0.6 + scrollY * 0.001, 0.9) }}></div>
                    
                    <div className="hero-content">
                        <span className="hero-tagline blur-reveal delay-1">BGC's Premier Studio</span>
                        <h1 className="hero-title">
                            <span className="blur-reveal delay-2 inline-block" style={{color: 'var(--accent-gold)'}}>INKVICTUS</span>{' '}
                            <span className="blur-reveal delay-3 inline-block">TATTOO</span>
                        </h1>
                        <div className="blur-reveal delay-4">
                            <MagneticButton onClick={() => navigate('/book')} className="btn-gold-luxury">
                                Book Consultation
                            </MagneticButton>
                        </div>
                    </div>
                    
                    <div className="scroll-indicator fade-up visible">
                        <ChevronDown size={32} color="var(--accent-gold)" />
                    </div>

                </header>

                {/* 2. Art First Showcase */}
                <section className="premium-section" ref={artistsRef}>
                    <div className="section-header fade-up stagger-1">
                        <span className="section-subtitle">Portfolio Showcase</span>
                        <h2 className="section-title">Signatures in Ink</h2>
                    </div>

                    <div className="art-showcase-wrapper fade-up stagger-2">
                        {showcaseWorks.length > 0 ? (
                            <>
                                <div className="art-showcase-grid">
                                    {showcaseWorks.map((work, idx) => (
                                        <div 
                                            key={work.id || idx} 
                                            className={`showcase-item tilt-card ${idx === 0 ? 'showcase-hero' : ''}`}
                                            onClick={() => work.artist_id && navigate(`/artist/${work.artist_id}`)}
                                        >
                                            <img 
                                                src={work.image_url} 
                                                alt={work.title || 'Tattoo Artwork'} 
                                                className="showcase-img"
                                                loading="lazy"
                                            />
                                            <div className="showcase-overlay">
                                                <h3 className="showcase-title">{work.title || work.category || 'Custom Piece'}</h3>
                                                {work.artist_name && (
                                                    <span className="showcase-artist">Crafted by {work.artist_name}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="fade-up stagger-4" style={{ textAlign: 'center', marginTop: '1rem' }}>
                                    <button onClick={() => navigate('/gallery')} className="btn-gold-outline">
                                        Explore Full Gallery
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '4rem 0', opacity: 0.5 }}>
                                <Sparkles size={48} color="var(--accent-gold)" style={{ marginBottom: '1rem' }} />
                                <p style={{ fontSize: '1.2rem', letterSpacing: '1px' }}>Curating masterpieces...</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* 3. The Matrix / About Extravaganza */}
                <section id="about" className="premium-section" ref={matrixRef}>
                    <div className="glass-card-premium matrix-grid fade-up stagger-1">
                        <div className="matrix-content">
                            <span className="section-subtitle">Our Philosophy</span>
                            <h2 className="section-title" style={{ marginBottom: '2rem' }}>Crafting Timeless Art in BGC</h2>
                            <p className="matrix-text">
                                Inkvictus Tattoo is more than just a studio; it is a sanctuary for art and expression. Located in the heart of BGC, we offer a premium experience that combines world-class artistry with the highest standards of hygiene and comfort.
                            </p>
                            <p className="matrix-text">
                                Every session is designed to be an experience worth attending, set in a professional and relaxing atmosphere that elevates what getting a tattoo stands for.
                            </p>
                            <button onClick={() => navigate('/gallery')} className="btn-gold-luxury" style={{ marginTop: '1rem', background: 'transparent', border: '1px solid #be9055', color: '#be9055' }}>
                                View Gallery
                            </button>
                        </div>
                        <div className="matrix-images">
                            <div className="matrix-img-box">
                                <img src="/images/tattoos/studio_1.jpg" alt="Studio Dark Concept Wait Area" className="lightbox-trigger" onClick={() => setLightboxSrc('/images/tattoos/studio_1.jpg')} />
                            </div>
                            <div className="matrix-img-box">
                                <img src="/images/tattoos/studio_3.jpg" alt="Inkvictus Aesthetic Setup" className="lightbox-trigger" onClick={() => setLightboxSrc('/images/tattoos/studio_3.jpg')} />
                            </div>
                            <div className="matrix-img-box">
                                <img src="/images/tattoos/studio_2.jpg" alt="Luxurious Studio Chairs" className="lightbox-trigger" onClick={() => setLightboxSrc('/images/tattoos/studio_2.jpg')} />
                            </div>
                        </div>
                    </div>
                </section>

                {/* 4. Our Services */}
                <section className="premium-section" ref={servicesRef}>
                    <div className="section-header fade-up stagger-1">
                        <span className="section-subtitle">Expertise</span>
                        <h2 className="section-title">Specialized Services</h2>
                    </div>
                    <div className="services-container">
                        <div className="service-card cinematic-bg fade-up stagger-2" style={{backgroundImage: "url('https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&q=80&w=800')"}}>
                            <div className="service-card-overlay">
                                <div className="service-card-content">
                                    <div className="service-icon-glowing"><PenTool size={32} /></div>
                                    <h3 className="service-title">Custom Tattoo Art</h3>
                                    <div className="service-hidden-content">
                                        <p className="service-desc">From breathtaking hyper-realism and fine-line to bold traditional designs, our artists craft timeless ink tailored perfectly to your vision.</p>
                                        <button className="btn-text-gold" onClick={() => navigate('/book')}>Book Now <ArrowRight size={16} /></button>
                                    </div>
                                </div>
                            </div>
                            <div className="service-animated-border"></div>
                        </div>

                        <div className="service-card cinematic-bg fade-up stagger-3" style={{backgroundImage: "url('https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?auto=format&fit=crop&q=80&w=800')"}}>
                            <div className="service-card-overlay">
                                <div className="service-card-content">
                                    <div className="service-icon-glowing"><Sparkles size={32} /></div>
                                    <h3 className="service-title">Professional Piercing</h3>
                                    <div className="service-hidden-content">
                                        <p className="service-desc">Safe, precise body and ear piercing performed in a strictly sterile environment, featuring a curated selection of premium, hypoallergenic jewelry.</p>
                                        <button className="btn-text-gold" onClick={() => navigate('/book')}>Book Now <ArrowRight size={16} /></button>
                                    </div>
                                </div>
                            </div>
                            <div className="service-animated-border"></div>
                        </div>

                        <div className="service-card cinematic-bg fade-up stagger-4" style={{backgroundImage: "url('https://images.unsplash.com/photo-1562962230-16e4623d36e6?auto=format&fit=crop&q=80&w=800')"}}>
                            <div className="service-card-overlay">
                                <div className="service-card-content">
                                    <div className="service-icon-glowing"><Smartphone size={32} /></div>
                                    <h3 className="service-title">AR Tattoo Preview</h3>
                                    <div className="service-hidden-content">
                                        <p className="service-desc">Eliminate the guesswork before getting inked. Visualize your custom tattoo directly on your skin using our exclusive augmented reality platform.</p>
                                        <button className="btn-text-gold" onClick={() => navigate('/book')}>Try It <ArrowRight size={16} /></button>
                                    </div>
                                </div>
                            </div>
                            <div className="service-animated-border"></div>
                        </div>
                    </div>
                </section>

                {/* 5. The InkVistAR Process */}
                <section className="premium-section" ref={processRef}>
                    <div className="section-header fade-up stagger-1">
                        <span className="section-subtitle">How It Works</span>
                        <h2 className="section-title">The InkVistAR Journey</h2>
                    </div>
                    <div className="process-timeline">
                        <div className="process-step fade-up stagger-2">
                            <div className="process-number">01</div>
                            <h3 className="process-title">Consultation</h3>
                            <p className="process-desc">Collaborate with our resident artists to brainstorm and refine your custom design concepts.</p>
                        </div>
                        <div className="process-step fade-up stagger-3">
                            <div className="process-number">02</div>
                            <h3 className="process-title">AR Visualization</h3>
                            <p className="process-desc">Use our app to project the digital design onto your skin in real-time, ensuring perfect placement.</p>
                        </div>
                        <div className="process-step fade-up stagger-4">
                            <div className="process-number">03</div>
                            <h3 className="process-title">The Session</h3>
                            <p className="process-desc">Relax in our premium studio while our experts bring your vision to life with precision.</p>
                        </div>
                        <div className="process-step fade-up stagger-5">
                            <div className="process-number">04</div>
                            <h3 className="process-title">Aftercare</h3>
                            <p className="process-desc">Receive detailed aftercare instructions and premium products to ensure perfect healing.</p>
                        </div>
                    </div>
                </section>

                {/* 6. Hygiene & Standards */}
                <section className="premium-section hygiene-section" ref={hygieneRef}>
                    <div className="glass-card-premium hygiene-banner fade-up stagger-1">
                        <div className="hygiene-icon-wrapper"><ShieldCheck size={48} color="var(--accent-gold)" /></div>
                        <div className="hygiene-text">
                            <h2 className="hygiene-title">Uncompromising Safety Standards</h2>
                            <p className="hygiene-desc">We strictly adhere to international health protocols. All tools are hospital-grade sterilized, and we use only single-use, disposable needles and vegan-friendly, heavy-metal-free premium inks.</p>
                        </div>
                    </div>
                </section>

                {/* 5. Testimonials */}
                <section 
                    className="premium-section" 
                    ref={testimonialsRef}
                    style={testimonials.length === 0 ? { padding: '4rem 2rem 3rem' } : undefined}
                >
                    <div className="section-header fade-up stagger-1" style={testimonials.length === 0 ? { marginBottom: '2rem' } : undefined}>
                        <span className="section-subtitle">Reputation</span>
                        <h2 className="section-title">The Experience</h2>
                    </div>
                    
                    <div className="premium-carousel-container fade-up stagger-2" style={{ marginBottom: '2rem' }}>
                        {testimonials.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem 0', borderTop: '1px solid var(--border-glass)', borderBottom: '1px solid var(--border-glass)' }}>
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
                                                                <span key={s} className={`perspective-star ${s <= (testimony.rating || 5) ? 'filled' : ''}`}><Star size={14} fill={s <= (testimony.rating || 5) ? 'currentColor' : 'none'} /></span>
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

                {/* 7. FAQ Section */}
                <section className="premium-section" ref={faqRef}>
                    <div className="section-header fade-up stagger-1">
                        <span className="section-subtitle">Information</span>
                        <h2 className="section-title">Frequently Asked Questions</h2>
                    </div>
                    <div className="faq-container fade-up stagger-2">
                        {[
                            { q: "What is your minimum pricing?", a: "Our studio minimum is ₱2,500. Final pricing depends on the size, detail, and placement of the tattoo." },
                            { q: "Do you accept walk-ins?", a: "While we highly recommend booking an appointment to guarantee a spot, we do accept walk-ins subject to artist availability on the day." },
                            { q: "How do I prepare for my session?", a: "Get a good night's sleep, eat a full meal before arriving, and stay hydrated. Avoid alcohol and blood-thinning medications 24 hours prior." },
                            { q: "Is the AR preview free?", a: "Yes, the Augmented Reality preview is included as part of our standard consultation process for all custom designs." }
                        ].map((faq, idx) => (
                            <div key={idx} className={`faq-item glass-card-premium ${openFaq === idx ? 'open' : ''}`} onClick={() => toggleFaq(idx)}>
                                <div className="faq-question">
                                    <h3>{faq.q}</h3>
                                    <span className="faq-toggle-icon">{openFaq === idx ? <Minus size={20} /> : <Plus size={20} />}</span>
                                </div>
                                <div className="faq-answer">
                                    <p>{faq.a}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>


                <Footer />
            </div>
            <ChatWidget />
            <ImageLightbox src={lightboxSrc} alt="Inkvictus Studio" onClose={() => setLightboxSrc(null)} />
        </>
    );
}

export default Home;
