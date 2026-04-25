import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Star, ArrowLeft, ArrowRight, CheckCircle, Image as ImageIcon, Clock, Award, Briefcase, MapPin, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ChatWidget from '../components/ChatWidget';
import { API_URL } from '../config';
import './PublicArtistProfile.css';

const PublicArtistProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [artist, setArtist] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [portfolio, setPortfolio] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('portfolio');
    const [lightboxIndex, setLightboxIndex] = useState(null);

    useEffect(() => {
        const fetchArtistData = async () => {
            try {
                setLoading(true);
                const [artistRes, reviewsRes, portfolioRes] = await Promise.all([
                    Axios.get(`${API_URL}/api/artists/${id}/public`),
                    Axios.get(`${API_URL}/api/artists/${id}/reviews`),
                    Axios.get(`${API_URL}/api/artist/${id}/portfolio`)
                ]);
                
                if (artistRes.data.success) setArtist(artistRes.data.artist);
                if (reviewsRes.data.success) setReviews(reviewsRes.data.reviews || []);
                if (portfolioRes.data.success) setPortfolio((portfolioRes.data.works || []).filter(w => w.is_public));
                
            } catch (error) {
                console.error("Error fetching artist details:", error);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchArtistData();
    }, [id]);

    // Resolve profile image
    const getProfileImage = (img) => {
        if (!img) return null;
        if (img.startsWith('data:') || img.startsWith('http')) return img;
        return img;
    };

    // Star renderer
    const renderStars = (rating, size = 16) => {
        return [...Array(5)].map((_, i) => (
            <Star key={i} size={size} color={i < Math.round(rating) ? '#fcd34d' : '#374151'} fill={i < Math.round(rating) ? '#fcd34d' : 'transparent'} />
        ));
    };

    // Lightbox navigation
    const publicPortfolio = portfolio;
    const openLightbox = (index) => setLightboxIndex(index);
    const closeLightbox = () => setLightboxIndex(null);
    const nextImage = () => setLightboxIndex(prev => (prev + 1) % publicPortfolio.length);
    const prevImage = () => setLightboxIndex(prev => (prev - 1 + publicPortfolio.length) % publicPortfolio.length);

    // Loading state
    if (loading) {
        return (
            <div className="pap-page">
                <Navbar />
                <div className="pap-loading-state">
                    <div className="premium-loader"></div>
                    <p>Loading artist profile...</p>
                </div>
                <Footer />
            </div>
        );
    }

    // Not found state
    if (!artist) {
        return (
            <div className="pap-page">
                <Navbar />
                <div className="pap-not-found">
                    <div className="pap-not-found-content">
                        <div className="pap-not-found-icon">?</div>
                        <h2>Artist Not Found</h2>
                        <p>The artist profile you are looking for does not exist or may have been removed.</p>
                        <Link to="/artists" className="pap-back-btn">
                            <ArrowLeft size={18} /> Back to Artists
                        </Link>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    const profileImg = getProfileImage(artist.profile_image);
    const avgRating = parseFloat(artist.rating) || 0;

    return (
        <div className="pap-page">
            <Navbar />

            {/* ═══════════ BACK NAVIGATION ═══════════ */}
            <div className="pap-back-nav">
                <div className="pap-back-nav-inner">
                    <Link to="/artists" className="pap-breadcrumb">
                        <ArrowLeft size={16} /> All Artists
                    </Link>
                </div>
            </div>

            {/* ═══════════ HERO BANNER ═══════════ */}
            <section className="pap-hero">
                <div className="pap-hero-bg"></div>
                <div className="pap-hero-overlay"></div>
                <div className="pap-hero-content">

                    <div className="pap-hero-profile">
                        <div className="pap-avatar-wrapper">
                            {profileImg ? (
                                <img src={profileImg} alt={artist.name} className="pap-avatar-img" />
                            ) : (
                                <div className="pap-avatar-fallback">
                                    {artist.name ? artist.name.charAt(0).toUpperCase() : 'A'}
                                </div>
                            )}
                            <div className="pap-avatar-ring"></div>
                        </div>

                        <div className="pap-hero-info">
                            <h1 className="pap-artist-name">{artist.name}</h1>
                            <p className="pap-artist-title">
                                {artist.specialization || 'Tattoo Artist'}
                                {artist.studio_name && artist.studio_name !== 'Independent Artist' && (
                                    <span className="pap-studio-tag">
                                        <MapPin size={13} /> {artist.studio_name}
                                    </span>
                                )}
                            </p>

                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="pap-stats-row">
                        {artist.experience_years > 0 && (
                            <div className="pap-stat-chip">
                                <Clock size={16} />
                                <div>
                                    <span className="pap-stat-value">{artist.experience_years}+</span>
                                    <span className="pap-stat-label">Years</span>
                                </div>
                            </div>
                        )}
                        {artist.completed_sessions > 0 && (
                            <div className="pap-stat-chip">
                                <Award size={16} />
                                <div>
                                    <span className="pap-stat-value">{artist.completed_sessions}</span>
                                    <span className="pap-stat-label">Sessions</span>
                                </div>
                            </div>
                        )}
                        <div className="pap-stat-chip">
                            <ImageIcon size={16} />
                            <div>
                                <span className="pap-stat-value">{publicPortfolio.length}</span>
                                <span className="pap-stat-label">Works</span>
                            </div>
                        </div>
                        </div>

                    <button className="pap-book-btn" onClick={() => navigate('/book')}>
                        Book a Session <ArrowRight size={18} />
                    </button>
                </div>
            </section>

            {/* ═══════════ CONTENT BODY ═══════════ */}
            <section className="pap-body">
                <div className="pap-container">

                    {/* Bio Section */}
                    {artist.bio && (
                        <div className="pap-bio-card">
                            <h3 className="pap-section-label">About the Artist</h3>
                            <p className="pap-bio-text">{artist.bio}</p>
                        </div>
                    )}

                    {/* Tab Navigation */}
                    <div className="pap-tabs">
                        <button
                            className={`pap-tab ${activeTab === 'portfolio' ? 'active' : ''}`}
                            onClick={() => setActiveTab('portfolio')}
                        >
                            <ImageIcon size={16} /> Portfolio
                            <span className="pap-tab-count">{publicPortfolio.length}</span>
                        </button>
                    </div>

                    {/* Portfolio Tab */}
                    {activeTab === 'portfolio' && (
                        <div className="pap-tab-content">
                            {publicPortfolio.length > 0 ? (
                                <div className="pap-gallery-grid">
                                    {publicPortfolio.map((work, index) => (
                                        <div
                                            key={work.id}
                                            className="pap-gallery-item"
                                            onClick={() => openLightbox(index)}
                                        >
                                            <img src={work.image_url} alt={work.title || 'Tattoo artwork'} loading="lazy" />
                                            <div className="pap-gallery-hover">
                                                <h4>{work.title}</h4>
                                                {work.category && <span className="pap-gallery-cat">{work.category}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="pap-empty-state">
                                    <ImageIcon size={48} />
                                    <h3>Portfolio Coming Soon</h3>
                                    <p>This artist has not published any portfolio works yet.</p>
                                </div>
                            )}
                        </div>
                    )}



                    {/* Bottom CTA */}
                    <div className="pap-bottom-cta">
                        <h3>Ready to get inked?</h3>
                        <p>Book a session with {artist.name?.split(' ')[0] || 'this artist'} and bring your vision to life.</p>
                        <button className="pap-book-btn" onClick={() => navigate('/book')}>
                            Book Now <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            </section>

            {/* ═══════════ LIGHTBOX ═══════════ */}
            {lightboxIndex !== null && publicPortfolio[lightboxIndex] && (
                <div className="pap-lightbox" onClick={closeLightbox}>
                    <div className="pap-lightbox-inner" onClick={e => e.stopPropagation()}>
                        <button className="pap-lb-close" onClick={closeLightbox}><X size={24} /></button>
                        {publicPortfolio.length > 1 && (
                            <>
                                <button className="pap-lb-nav pap-lb-prev" onClick={prevImage}><ChevronLeft size={28} /></button>
                                <button className="pap-lb-nav pap-lb-next" onClick={nextImage}><ChevronRight size={28} /></button>
                            </>
                        )}
                        <img src={publicPortfolio[lightboxIndex].image_url} alt={publicPortfolio[lightboxIndex].title || 'Artwork'} />
                        <div className="pap-lb-caption">
                            <h4>{publicPortfolio[lightboxIndex].title}</h4>
                            {publicPortfolio[lightboxIndex].description && (
                                <p>{publicPortfolio[lightboxIndex].description}</p>
                            )}
                            {publicPortfolio[lightboxIndex].category && (
                                <span className="pap-lb-category">{publicPortfolio[lightboxIndex].category}</span>
                            )}
                            <span className="pap-lb-counter">{lightboxIndex + 1} / {publicPortfolio.length}</span>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
            <ChatWidget />
        </div>
    );
};

export default PublicArtistProfile;
