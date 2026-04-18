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

    const STYLES = ['All', 'Traditional', 'Realism', 'Watercolor', 'Tribal', 'New School', 'Neo Traditional', 'Japanese', 'Blackwork', 'Minimalist'];
    const [activeFilter, setActiveFilter] = useState('All');

    const MOCK_ARTISTS = [
        { id: '1', name: 'Jaxson', nickname: 'The Needle', specialization: 'Realism, Blackwork', profile_image: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?q=80&w=800&auto=format&fit=crop' },
        { id: '2', name: 'Elena', nickname: 'Viper', specialization: 'Traditional, Neo Traditional', profile_image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop' },
        { id: '3', name: 'Marcus', nickname: 'Ghost', specialization: 'Blackwork, Minimalist', profile_image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=800&auto=format&fit=crop' },
        { id: '4', name: 'Sarah', nickname: 'Lotus', specialization: 'Watercolor, Japanese', profile_image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=800&auto=format&fit=crop' },
        { id: '5', name: 'David', nickname: 'Iron Hand', specialization: 'Tribal, Japanese', profile_image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=800&auto=format&fit=crop' },
        { id: '6', name: 'Maya', nickname: 'Ink Weaver', specialization: 'New School, Realism', profile_image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=800&auto=format&fit=crop' },
        { id: '7', name: 'Leo', nickname: 'Shadow', specialization: 'Blackwork, Dotwork', profile_image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800&auto=format&fit=crop' },
        { id: '8', name: 'Chloe', nickname: 'Siren', specialization: 'Traditional, Linework', profile_image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800&auto=format&fit=crop' },
        { id: '9', name: 'Victor', nickname: 'The Chief', specialization: 'Tribal, Neo Traditional', profile_image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=800&auto=format&fit=crop' }
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
                    <h1>Our Elite Artists</h1>
                    <p className="artists-hero-subtitle">
                        Nine world-class tattoo artists. One legendary studio.
                    </p>
                </div>
            </header>

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
                            <div key={i} className="artist-card artist-card-skeleton">
                                <div className="artist-image-wrapper skeleton-shimmer"></div>
                                <div className="artist-info">
                                    <div className="skeleton-line skeleton-shimmer" style={{ width: '70%', height: '24px', margin: '0 auto 12px' }}></div>
                                    <div className="skeleton-line skeleton-shimmer" style={{ width: '50%', height: '14px', margin: '0 auto 20px' }}></div>
                                    <div className="skeleton-line skeleton-shimmer" style={{ width: '100%', height: '44px', borderRadius: '10px' }}></div>
                                </div>
                            </div>
                        ))
                    ) : (
                        filteredArtists.length > 0 ? (
                            filteredArtists.map((artist, index) => (
                                <div
                                    key={artist.id || index}
                                    className="artist-card fade-in-up"
                                    style={{ animationDelay: `${index * 0.08}s` }}
                                >
                                    <div className="artist-image-wrapper">
                                        <img 
                                            src={artist.profile_image || "https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&q=80&w=600"} 
                                            alt={`${artist.name} - ${artist.specialization}`}
                                            loading="lazy"
                                        />
                                        <div className="artist-brand-overlay">V</div>
                                    </div>
                                    <div className="artist-info">
                                        <div className="artist-name-group">
                                            <h2>{artist.name}</h2>
                                            <p className="artist-nickname">"{artist.nickname}"</p>
                                            <div className="name-underline"></div>
                                        </div>
                                        <p className="artist-specialty">{artist.specialization || 'Tattoo Artist'}</p>
                                        <div className="artist-actions">
                                            <button 
                                                className="artist-btn artist-btn-primary" 
                                                onClick={() => navigate(`/artist/${artist.id}`)}
                                            >
                                                View Profile
                                            </button>
                                            <button 
                                                className="artist-btn artist-btn-outline"
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