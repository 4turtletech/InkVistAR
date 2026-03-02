import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Gallery.css';
import ChatWidget from '../components/ChatWidget';

const Gallery = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All Styles');

  const categories = [
    'All Styles',
    'Black & Grey',
    'Color Realism',
    'Traditional',
    'Fine Line'
  ];

  // Placeholder data simulating the portfolio
  const portfolioItems = [
    { id: 1, category: 'Black & Grey', src: 'https://placehold.co/400x600/1a1a1a/C19A6B?text=Black+%26+Grey' },
    { id: 2, category: 'Color Realism', src: 'https://placehold.co/400x500/1a1a1a/C19A6B?text=Color+Realism' },
    { id: 3, category: 'Traditional', src: 'https://placehold.co/400x550/1a1a1a/C19A6B?text=Traditional' },
    { id: 4, category: 'Fine Line', src: 'https://placehold.co/400x600/1a1a1a/C19A6B?text=Fine+Line' },
    { id: 5, category: 'Black & Grey', src: 'https://placehold.co/400x450/1a1a1a/C19A6B?text=Portrait' },
    { id: 6, category: 'Traditional', src: 'https://placehold.co/400x600/1a1a1a/C19A6B?text=Dagger' },
  ];

  const filteredItems = activeCategory === 'All Styles'
    ? portfolioItems
    : portfolioItems.filter(item => item.category === activeCategory);

  return (
    <>
      {/* Navigation Bar */}
      <nav className="home-nav">
          <a href="/" className="home-logo">INKVICTUS</a>
          <div className="home-nav-links">
              <a href="/#about">About</a>
              <Link to="/artists">Artists</Link>
              <Link to="/gallery" className="active-link">Gallery</Link>
              <a href="/#booking">Booking</a>
              <Link to="/contact">Contact</Link>
          </div>
          <div className="home-auth-buttons">
              <a href="/login" className="login-link">Log In</a>
              <button onClick={() => navigate('/register')} className="signup-btn">Sign Up</button>
          </div>
      </nav>

      <div className="gallery-page">
      {/* Header Section */}
      <header className="gallery-header">
        <h1>OUR ARTWORK SPEAKS VOLUMES</h1>
        <div className="filter-nav">
          {categories.map(cat => (
            <button
              key={cat}
              className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* Portfolio Grid */}
      <section className="portfolio-grid">
        {filteredItems.map(item => (
          <div key={item.id} className="image-card">
            <img src={item.src} alt={item.category} />
            <div className="watermark">INKVICTUS</div>
            <div className="glow-overlay"></div>
          </div>
        ))}
      </section>

      <ChatWidget />
    </div>
    </>
  );
};

export default Gallery;