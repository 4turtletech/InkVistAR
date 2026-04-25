import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import './ImageLightbox.css';

/**
 * ImageLightbox — A global, reusable fullscreen image viewer.
 *
 * Usage:
 *   import ImageLightbox from '../components/ImageLightbox';
 *
 *   // In your component state:
 *   const [lightboxSrc, setLightboxSrc] = useState(null);
 *
 *   // Trigger: add onClick and className to any <img>
 *   <img
 *     src={someUrl}
 *     alt="Photo"
 *     className="lightbox-trigger"
 *     onClick={() => setLightboxSrc(someUrl)}
 *   />
 *
 *   // Render once at root of your component's return:
 *   <ImageLightbox
 *     src={lightboxSrc}
 *     alt="Photo description"
 *     onClose={() => setLightboxSrc(null)}
 *   />
 *
 * Props:
 *   - src (string|null)   : The image URL to display. `null` hides the lightbox.
 *   - alt (string)        : Optional caption/alt text.
 *   - onClose (function)  : Called when the user closes the lightbox.
 */
function ImageLightbox({ src, alt, onClose }) {
  const [visible, setVisible] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Mount/unmount lifecycle with animation
  useEffect(() => {
    if (src) {
      setMounted(true);
      setImageLoaded(false);
      // Trigger enter animation on next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
      // Prevent background scrolling
      document.body.style.overflow = 'hidden';
    } else {
      setVisible(false);
      const timer = setTimeout(() => {
        setMounted(false);
        setImageLoaded(false);
      }, 350); // Match CSS transition duration
      document.body.style.overflow = '';
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [src]);

  // Keyboard: Escape to close
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && src) {
      onClose();
    }
  }, [src, onClose]);

  useEffect(() => {
    if (mounted) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [mounted, handleKeyDown]);

  if (!mounted) return null;

  return (
    <div
      className={`lightbox-overlay ${visible ? 'lightbox-visible' : ''}`}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        className="lightbox-close-btn"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        title="Close (Esc)"
        aria-label="Close lightbox"
      >
        <X size={22} />
      </button>

      {/* Image container */}
      <div
        className="lightbox-image-wrapper"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading spinner (shown until image loads) */}
        {!imageLoaded && <div className="lightbox-spinner" />}

        <img
          className="lightbox-image"
          src={src}
          alt={alt || 'Full-size image'}
          onLoad={() => setImageLoaded(true)}
          style={{ display: imageLoaded ? 'block' : 'none' }}
          draggable={false}
        />
      </div>

      {/* Caption */}
      {alt && imageLoaded && (
        <div className="lightbox-caption">{alt}</div>
      )}
    </div>
  );
}

export default ImageLightbox;
