import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import './Artists.css';
import Navbar from '../components/Navbar';
import ChatWidget from '../components/ChatWidget';
import Footer from '../components/Footer';

function Artists() {
    const navigate = useNavigate();
    const [artists, setArtists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('All');

    // Fetch artists dynamically from the backend
    useEffect(() => {
        setLoading(true);
        fetch(`${API_URL}/api/customer/artists`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.artists) {
                    setArtists(data.artists);
                } else {
                    setArtists([]);
                }
            })
            .catch(err => {
                console.error('Error fetching artists:', err);
                setArtists([]);
            })
            .finally(() => setLoading(false));
    }, []);

    // Dynamically build unique style filters from fetched data
    const styleFilters = useMemo(() => {
        const uniqueSpecs = [...new Set(
            artists
                .map(a => a.specialization)
                .filter(s => s && s !== 'General Artist')
        )].sort();
        return ['All', ...uniqueSpecs];
    }, [artists]);

    const filteredArtists = artists.filter(artist => {
        if (activeFilter === 'All') return true;
        const spec = artist.specialization || '';
        return spec.toLowerCase().includes(activeFilter.toLowerCase());
    });

    // Resolve profile image: supports base64, URLs, or static file fallback
    const getProfileImage = (artist) => {
        if (artist.profile_image) {
            // Base64 data URIs or full URLs pass through directly
            if (artist.profile_image.startsWith('data:') || artist.profile_image.startsWith('http')) {
                return artist.profile_image;
            }
            // Static file paths
            return artist.profile_image;
        }
        // Fallback placeholder
        return '/images/tattoos/default_artist.jpg';
    };

    // Derive a short nickname from the artist's full name
    const getNickname = (artist) => {
        if (!artist.name) return '';
        // If name follows "Artist <Name>" pattern, extract the second part
        const parts = artist.name.split(' ');
        return parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
    };

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
                        {artists.length > 0
                            ? `${artists.length} world-class tattoo artists. One legendary studio.`
                            : 'World-class tattoo artists. One legendary studio.'}
                    </p>
                </div>
            </header>

            {/* Team Group Photo (16:9 landscape) */}
            <section className="artists-team-photo-section">
                <div className="artists-team-photo-wrapper">
                    <img
                        src="/images/tattoos/group_photo.jpg"
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
                        {styleFilters.map(style => (
                            <option key={style} value={style}>{style}</option>
                        ))}
                    </select>
                </div>

                <div className="artists-grid-container">
                    {loading ? (
                        /* Skeleton loading cards for visual feedback */
                        Array.from({ length: 6 }).map((_, i) => (
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
                                            src={getProfileImage(artist)}
                                            alt={`${artist.name} — ${artist.specialization}`}
                                            loading="lazy"
                                        />
                                        <div className="artist-portrait-brand">V</div>
                                    </div>
                                    <div className="artist-profile-info">
                                        <div className="artist-name-block">
                                            <h2>{artist.name}</h2>
                                            <p className="artist-aka">"{getNickname(artist)}"</p>
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