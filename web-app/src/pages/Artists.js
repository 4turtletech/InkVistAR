import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Artists.css';
import Navbar from '../components/Navbar';
import ChatWidget from '../components/ChatWidget';
import Footer from '../components/Footer';

function Artists() {
    const navigate = useNavigate();
    const [artists, setArtists] = useState([]);
    const [loading, setLoading] = useState(true);

    const STYLES = [
        'All',
        'Black & Grey Realism',
        'Fine Line Geometry',
        'Traditional Japanese',
        'Neo-Traditional',
        'Surrealism',
        'Dotwork & Mandala',
        'Watercolor',
        'Tribal / Polynesian',
        'Minimalist'
    ];
    const [activeFilter, setActiveFilter] = useState('All');

    const MOCK_ARTISTS = [
        { id: '1', name: 'Artist Troy', nickname: 'Troy', specialization: 'Black & Grey Realism', profile_image: '/images/tattoos/media__1775672821008.jpg' },
        { id: '2', name: 'Artist Lloid', nickname: 'Lloid', specialization: 'Fine Line Geometry', profile_image: '/images/tattoos/media__1775672821025.jpg' },
        { id: '3', name: 'Artist Ken', nickname: 'Ken', specialization: 'Traditional Japanese', profile_image: '/images/tattoos/media__1775672821057.jpg' },
        { id: '4', name: 'Artist Mar', nickname: 'Mar', specialization: 'Neo-Traditional', profile_image: '/images/tattoos/media__1775672821061.jpg' },
        { id: '5', name: 'Artist Brian', nickname: 'Brian', specialization: 'Surrealism', profile_image: '/images/tattoos/media__1775671277040.jpg' },
        { id: '6', name: 'Artist JeaR', nickname: 'JeaR', specialization: 'Dotwork & Mandala', profile_image: '/images/tattoos/media__1775667820757.jpg' },
        { id: '7', name: 'Artist Lem', nickname: 'Lem', specialization: 'Watercolor', profile_image: '/images/tattoos/media__1775667820770.jpg' },
        { id: '8', name: 'Artist Renz', nickname: 'Renz', specialization: 'Tribal / Polynesian', profile_image: '/images/tattoos/media__1775667820781.jpg' },
        { id: '9', name: 'Artist Carl', nickname: 'Carl', specialization: 'Minimalist', profile_image: '/images/tattoos/media__1775667820747.jpg' }
    ];

    useEffect(() => {
        // Mock API fetch delay for UX
        setLoading(true);
        const timer = setTimeout(() => {
            setArtists(MOCK_ARTISTS);
            setLoading(false);
        }, 600);
        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredArtists = artists.filter(artist => {
        if (activeFilter === 'All') return true;
        const spec = artist.specialization || '';
        return spec.toLowerCase().includes(activeFilter.toLowerCase());
    });

    return (
        <>
            <Navbar />
            <div className="artists-page page-transition-wrapper">

            {/* Hero Section */}
            <header className="artists-hero">
                <div className="artists-hero-overlay"></div>
                <div className="artists-hero-content">
                    <span className="artists-hero-tagline">The Inkvictus Collective</span>
                    <h1>Our Elite Artists</h1>
                    <p className="artists-hero-subtitle">
                        Nine world-class tattoo artists. One legendary studio.
                    </p>
                </div>
            </header>

            {/* Team Group Photo Placeholder (16:9 landscape) */}
            <section className="artists-team-photo-section">
                <div className="artists-team-photo-wrapper">
                    <img
                        src="/images/tattoos/media__1775711217566.png"
                        alt="Inkvictus Studio — Our Team"
                        className="artists-team-photo"
                    />
                    <div className="artists-team-photo-overlay">
                        <p className="artists-team-photo-caption">The Inkvictus Family</p>
                    </div>
                </div>
            </section>

            {/* Artist Portfolio Grid */}
            <section className="artists-grid-section">
                <p className="artists-intro">
                    Inkvictus would not be possible without the talent and creativity of our skilled artists.
                    Each one brings a unique style and vision to the craft.
                </p>

                <div className="artists-filter-container">
                    <span className="artists-filter-label">STYLE FILTER:</span>
                    <select
                        className="artists-filter-select"
                        value={activeFilter}
                        onChange={(e) => setActiveFilter(e.target.value)}
                    >
                        {STYLES.map(style => (
                            <option key={style} value={style}>{style}</option>
                        ))}
                    </select>
                </div>

                <div className="artists-grid-container">
                    {loading ? (
                        /* Skeleton loading cards for visual feedback */
                        Array.from({ length: 9 }).map((_, i) => (
                            <div key={i} className="artist-profile-card artist-card-skeleton">
                                <div className="artist-portrait-wrapper skeleton-shimmer"></div>
                                <div className="artist-profile-info">
                                    <div className="skeleton-line skeleton-shimmer" style={{ width: '60%', height: '22px', margin: '0 auto 10px' }}></div>
                                    <div className="skeleton-line skeleton-shimmer" style={{ width: '80%', height: '14px', margin: '0 auto 8px' }}></div>
                                    <div className="skeleton-line skeleton-shimmer" style={{ width: '50%', height: '12px', margin: '0 auto 20px' }}></div>
                                    <div className="skeleton-line skeleton-shimmer" style={{ width: '100%', height: '42px', borderRadius: '10px' }}></div>
                                </div>
                            </div>
                        ))
                    ) : (
                        filteredArtists.length > 0 ? (
                            filteredArtists.map((artist, index) => (
                                <div
                                    key={artist.id || index}
                                    className="artist-profile-card fade-in-up"
                                    style={{ animationDelay: `${index * 0.08}s` }}
                                >
                                    <div className="artist-portrait-wrapper">
                                        <img
                                            src={artist.profile_image}
                                            alt={`${artist.name} — ${artist.specialization}`}
                                            loading="lazy"
                                        />
                                        <div className="artist-portrait-brand">V</div>
                                    </div>
                                    <div className="artist-profile-info">
                                        <div className="artist-name-block">
                                            <h2>{artist.name}</h2>
                                            <p className="artist-aka">"{artist.nickname}"</p>
                                            <div className="artist-name-divider"></div>
                                        </div>
                                        <p className="artist-spec-label">{artist.specialization}</p>
                                        <div className="artist-profile-actions">
                                            <button
                                                className="artist-action-btn artist-action-primary"
                                                onClick={() => navigate(`/artist/${artist.id}`)}
                                            >
                                                View Profile
                                            </button>
                                            <button
                                                className="artist-action-btn artist-action-outline"
                                                onClick={() => navigate(`/gallery?artistId=${artist.id}&artistName=${encodeURIComponent(artist.name)}`)}
                                            >
                                                See Works
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="artists-empty-state">
                                <h3>No artists found matching "{activeFilter}" style.</h3>
                                <p>Try selecting a different filter or checking back later.</p>
                            </div>
                        )
                    )}
                </div>
            </section>
                <Footer />
            </div>
            <ChatWidget />
        </>
    );
}

export default Artists;