import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import Navbar from '../components/Navbar';
import DeferredChatWidget from '../components/DeferredChatWidget';
import Footer from '../components/Footer';
import ImageLightbox from '../components/ImageLightbox';
import { ChevronLeft, ChevronRight, ChevronDown, PenTool, Sparkles, Star, ShieldCheck, ArrowRight, Plus, Minus } from 'lucide-react';
import { API_URL } from '../config';
import { navigateToBooking } from '../utils/bookingNavigation';

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
    const [openFaq, setOpenFaq] = useState(null);
    const [shouldLoadHeroVideo, setShouldLoadHeroVideo] = useState(false);
    const [isHeroVideoReady, setIsHeroVideoReady] = useState(false);
    const parallaxRootRef = useRef(null);

    const handleBookConsultation = () => {
        navigateToBooking(navigate);
    };

    const toggleFaq = (idx) => {
        setOpenFaq(openFaq === idx ? null : idx);
    };

    useEffect(() => {
        const root = parallaxRootRef.current;
        const motionDisabled = window.matchMedia('(max-width: 768px), (prefers-reduced-motion: reduce)').matches;
        if (!root || motionDisabled) return undefined;

        let frameId = null;
        const updateParallax = () => {
            const scrollPosition = window.scrollY;
            root.style.setProperty('--ambient-one-y', `${scrollPosition * -0.15}px`);
            root.style.setProperty('--ambient-two-y', `${scrollPosition * -0.2}px`);
            root.style.setProperty('--hero-parallax-y', `${scrollPosition * 0.4}px`);
            root.style.setProperty('--hero-overlay-opacity', Math.min(0.6 + scrollPosition * 0.001, 0.9));
            frameId = null;
        };
        const handleScroll = () => {
            if (frameId === null) frameId = window.requestAnimationFrame(updateParallax);
        };

        updateParallax();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (frameId !== null) window.cancelAnimationFrame(frameId);
        };
    }, []);

    useEffect(() => {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const constrainedConnection = connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType);

        if (reducedMotion || constrainedConnection) return undefined;

        let idleId;
        let timeoutId;
        const activateVideo = () => setShouldLoadHeroVideo(true);
        const isMobile = window.matchMedia('(max-width: 768px)').matches;

        if (isMobile) {
            // Keep decorative video out of the critical mobile load until the visitor interacts.
            window.addEventListener('pointerdown', activateVideo, { once: true, passive: true });
            window.addEventListener('touchstart', activateVideo, { once: true, passive: true });
            window.addEventListener('scroll', activateVideo, { once: true, passive: true });

            return () => {
                window.removeEventListener('pointerdown', activateVideo);
                window.removeEventListener('touchstart', activateVideo);
                window.removeEventListener('scroll', activateVideo);
            };
        }

        const scheduleVideo = () => {
            if ('requestIdleCallback' in window) {
                idleId = window.requestIdleCallback(activateVideo, { timeout: 2500 });
            } else {
                timeoutId = window.setTimeout(activateVideo, 1200);
            }
        };

        if (document.readyState === 'complete') {
            scheduleVideo();
        } else {
            window.addEventListener('load', scheduleVideo, { once: true });
        }

        return () => {
            window.removeEventListener('load', scheduleVideo);
            if (idleId !== undefined && 'cancelIdleCallback' in window) window.cancelIdleCallback(idleId);
            if (timeoutId !== undefined) window.clearTimeout(timeoutId);
        };
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
            <a className="skip-link" href="#main-content">Skip to main content</a>
            <Navbar />
            <main className="home-container" id="main-content" ref={parallaxRootRef} tabIndex="-1">
                {/* Ambient Glowing Orbs */}
                <div className="ambient-wrapper ambient-wrapper-one" aria-hidden="true">
                    <div className="ambient-glow-1"></div>
                </div>
                <div className="ambient-wrapper ambient-wrapper-two" aria-hidden="true">
                    <div className="ambient-glow-2"></div>
                </div>
                
                {/* 1. Hero Section */}
                <header className="hero-header">
                    <div className="hero-parallax-bg">
                        <picture className="hero-poster">
                            <source media="(max-width: 768px)" srcSet="/media/hero/hero-poster-mobile.webp" type="image/webp" />
                            <img
                                className="hero-parallax-img"
                                src="/media/hero/hero-poster-desktop.webp"
                                alt=""
                                width="720"
                                height="1280"
                                loading="eager"
                                decoding="async"
                                fetchPriority="high"
                            />
                        </picture>
                        {shouldLoadHeroVideo && (
                            <video
                                className={`hero-parallax-img hero-video ${isHeroVideoReady ? 'is-ready' : ''}`}
                                autoPlay
                                loop
                                muted
                                playsInline
                                preload="none"
                                aria-hidden="true"
                                onCanPlay={() => setIsHeroVideoReady(true)}
                            >
                                <source src="/media/hero/hero-mobile.webm" type="video/webm" media="(max-width: 768px)" />
                                <source src="/media/hero/hero-mobile.mp4" type="video/mp4" media="(max-width: 768px)" />
                                <source src="/media/hero/hero-desktop.webm" type="video/webm" />
                                <source src="/media/hero/hero-desktop.mp4" type="video/mp4" />
                            </video>
                        )}
                    </div>
                    <div className="hero-overlay"></div>
                    
                    <div className="hero-content">
                        <span className="hero-tagline blur-reveal delay-1">BGC's Premier Studio</span>
                        <h1 className="hero-title">
                            <span className="blur-reveal delay-2 inline-block" style={{color: 'var(--accent-gold)'}}>INKVICTUS</span>{' '}
                            <span className="blur-reveal delay-3 inline-block">TATTOO</span>
                        </h1>
                        <div className="blur-reveal delay-4">
                            <MagneticButton onClick={handleBookConsultation} className="btn-gold-luxury">
                                Book Consultation
                            </MagneticButton>
                        </div>
                    </div>
                    
                    <div className="scroll-indicator fade-up visible" aria-hidden="true">
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
                                        <button
                                            type="button"
                                            key={work.id || idx} 
                                            className={`showcase-item tilt-card ${idx === 0 ? 'showcase-hero' : ''}`}
                                            onClick={() => work.artist_id && navigate(`/artist/${work.artist_id}`)}
                                            disabled={!work.artist_id}
                                            aria-label={work.artist_id ? `View ${work.title || work.category || 'tattoo artwork'} by ${work.artist_name || 'an InkVictus artist'}` : undefined}
                                        >
                                            <img 
                                                src={work.image_url} 
                                                alt={work.title || 'Tattoo Artwork'} 
                                                className="showcase-img"
                                                loading="lazy"
                                                decoding="async"
                                            />
                                            <div className="showcase-overlay">
                                                <h3 className="showcase-title">{work.title || work.category || 'Custom Piece'}</h3>
                                                {work.artist_name && (
                                                    <span className="showcase-artist">Crafted by {work.artist_name}</span>
                                                )}
                                            </div>
                                        </button>
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
                            <button type="button" className="matrix-img-box" onClick={() => setLightboxSrc('/images/tattoos/studio_1.jpg')} aria-label="Open larger view of the studio waiting area">
                                <picture>
                                    <source srcSet="/images/tattoos/studio_1.webp" type="image/webp" />
                                    <img src="/images/tattoos/studio_1.jpg" alt="Studio Dark Concept Wait Area" className="lightbox-trigger" width="819" height="1024" loading="lazy" decoding="async" />
                                </picture>
                            </button>
                            <button type="button" className="matrix-img-box" onClick={() => setLightboxSrc('/images/tattoos/studio_3.jpg')} aria-label="Open larger view of the InkVictus studio setup">
                                <picture>
                                    <source srcSet="/images/tattoos/studio_3.webp" type="image/webp" />
                                    <img src="/images/tattoos/studio_3.jpg" alt="Inkvictus Aesthetic Setup" className="lightbox-trigger" width="819" height="1024" loading="lazy" decoding="async" />
                                </picture>
                            </button>
                            <button type="button" className="matrix-img-box" onClick={() => setLightboxSrc('/images/tattoos/studio_2.jpg')} aria-label="Open larger view of the studio chairs">
                                <picture>
                                    <source srcSet="/images/tattoos/studio_2.webp" type="image/webp" />
                                    <img src="/images/tattoos/studio_2.jpg" alt="Luxurious Studio Chairs" className="lightbox-trigger" width="819" height="1024" loading="lazy" decoding="async" />
                                </picture>
                            </button>
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
                                        <button className="btn-text-gold" onClick={handleBookConsultation}>Book Now <ArrowRight size={16} /></button>
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
                                        <button className="btn-text-gold" onClick={handleBookConsultation}>Book Now <ArrowRight size={16} /></button>
                                    </div>
                                </div>
                            </div>
                            <div className="service-animated-border"></div>
                        </div>

                        <div className="service-card cinematic-bg fade-up stagger-4" style={{backgroundImage: "url('https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&q=80&w=800')"}}>
                            <div className="service-card-overlay">
                                <div className="service-card-content">
                                    <div className="service-icon-glowing"><PenTool size={32} /></div>
                                    <h3 className="service-title">Cover-Ups & Restoration</h3>
                                    <div className="service-hidden-content">
                                        <p className="service-desc">Turn regret into a masterpiece. Our specialists seamlessly blend and rebuild existing tattoos into beautiful, refreshed works of art.</p>
                                        <button className="btn-text-gold" onClick={handleBookConsultation}>Consult Now <ArrowRight size={16} /></button>
                                    </div>
                                </div>
                            </div>
                            <div className="service-animated-border"></div>
                        </div>
                    </div>
                </section>

                {/* 5. The InkVictus Process */}
                <section className="premium-section" ref={processRef}>
                    <div className="section-header fade-up stagger-1">
                        <span className="section-subtitle">How It Works</span>
                        <h2 className="section-title">The InkVictus Journey</h2>
                    </div>
                    <div className="process-timeline">
                        <div className="process-step fade-up stagger-2">
                            <div className="process-number">01</div>
                            <h3 className="process-title">Consultation</h3>
                            <p className="process-desc">Collaborate with our resident artists to brainstorm and refine your custom design concepts.</p>
                        </div>
                        <div className="process-step fade-up stagger-3">
                            <div className="process-number">02</div>
                            <h3 className="process-title">Design Finalization</h3>
                            <p className="process-desc">We perfect your design, sizing, and placement to ensure it perfectly complements your body's natural anatomy.</p>
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
                                                aria-hidden={!isActive}
                                                style={{
                                                    transform: `translateX(${offset * 75}%) scale(${isActive ? 1 : 0.75})`,
                                                    opacity: isVisible ? (isActive ? 1 : 0.45) : 0,
                                                    zIndex: isActive ? 10 : 5 - Math.abs(offset),
                                                    pointerEvents: isActive ? 'auto' : 'none',
                                                }}
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
                                    <div className="carousel-controls" role="group" aria-label="Testimonial carousel controls">
                                        <button type="button" className="carousel-btn" onClick={prevSlide} aria-label="Previous testimonial"><ChevronLeft size={24} aria-hidden="true" /></button>
                                        <div className="carousel-indicators">
                                            {testimonials.map((_, idx) => (
                                                <button 
                                                    type="button"
                                                    key={idx} 
                                                    className={`indicator-dot ${idx === currentSlide ? 'active' : ''}`}
                                                    onClick={() => setCurrentSlide(idx)}
                                                    aria-label={`Show testimonial ${idx + 1}`}
                                                    aria-current={idx === currentSlide ? 'true' : undefined}
                                                />
                                            ))}
                                        </div>
                                        <button type="button" className="carousel-btn" onClick={nextSlide} aria-label="Next testimonial"><ChevronRight size={24} aria-hidden="true" /></button>
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
                            { q: "Do you do cover-ups?", a: "Yes, our artists specialize in cover-ups and restorations. We recommend booking a consultation first so we can assess the existing tattoo." }
                        ].map((faq, idx) => (
                            <div key={idx} className={`faq-item glass-card-premium ${openFaq === idx ? 'open' : ''}`}>
                                <button
                                    type="button"
                                    className="faq-question"
                                    id={`faq-question-${idx}`}
                                    onClick={() => toggleFaq(idx)}
                                    aria-expanded={openFaq === idx}
                                    aria-controls={`faq-answer-${idx}`}
                                >
                                    <h3>{faq.q}</h3>
                                    <span className="faq-toggle-icon" aria-hidden="true">{openFaq === idx ? <Minus size={20} /> : <Plus size={20} />}</span>
                                </button>
                                <div
                                    className="faq-answer"
                                    id={`faq-answer-${idx}`}
                                    role="region"
                                    aria-labelledby={`faq-question-${idx}`}
                                    aria-hidden={openFaq !== idx}
                                >
                                    <p>{faq.a}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
            <Footer />
            <DeferredChatWidget />
            <ImageLightbox src={lightboxSrc} alt="Inkvictus Studio" onClose={() => setLightboxSrc(null)} />
        </>
    );
}

export default Home;
