import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Crop, Check, Move } from 'lucide-react';
import './ImageCropper.css';

/**
 * Generates a cropped image from a source image URL using canvas.
 * Returns a base64 data URL of the cropped region.
 */
async function getCroppedImg(imageSrc, pixelCrop) {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Output image at the cropped pixel size
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    return canvas.toDataURL('image/jpeg', 0.92);
}

function createImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.addEventListener('load', () => resolve(img));
        img.addEventListener('error', (err) => reject(err));
        img.setAttribute('crossOrigin', 'anonymous');
        img.src = url;
    });
}

/**
 * ImageCropper — Reusable crop modal with configurable aspect ratio.
 *
 * Props:
 *   imageSrc   (string)   — base64 or URL of the image to crop
 *   onCropDone (function) — called with the cropped base64 data URL
 *   onCancel   (function) — called when user cancels the crop
 *   aspect     (number|'auto')  — crop aspect ratio (width/height). Defaults to 4/5.
 *                                  Pass 'auto' to use image's natural ratio.
 *                                  Pass 1 for a square crop.
 */
function ImageCropper({ imageSrc, onCropDone, onCancel, aspect: aspectProp = 4 / 5 }) {
    const [resolvedAspect, setResolvedAspect] = useState(aspectProp === 'auto' ? 1 : aspectProp);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    // When aspect is 'auto', resolve it from the image's natural dimensions
    React.useEffect(() => {
        if (aspectProp === 'auto' && imageSrc) {
            const img = new Image();
            img.onload = () => {
                setResolvedAspect(img.naturalWidth / img.naturalHeight);
            };
            img.src = imageSrc;
        } else if (aspectProp !== 'auto') {
            setResolvedAspect(aspectProp);
        }
    }, [aspectProp, imageSrc]);

    const onCropComplete = useCallback((_croppedArea, croppedPixels) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    const handleApply = async () => {
        if (!croppedAreaPixels) return;
        try {
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
            onCropDone(croppedImage);
        } catch (e) {
            console.error('Crop failed:', e);
        }
    };

    return (
        <div className="image-cropper-overlay" onClick={onCancel}>
            <div className="image-cropper-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="image-cropper-header">
                    <h3>
                        <span className="crop-icon"><Crop size={18} /></span>
                        Crop Image
                    </h3>
                    <button className="image-cropper-close" onClick={onCancel}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="image-cropper-body">
                    <div className="image-cropper-container">
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={resolvedAspect}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={onCropComplete}
                            cropShape="rect"
                            showGrid={true}
                            style={{
                                cropAreaStyle: {
                                    border: '2px solid #be9055',
                                    boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.6)'
                                }
                            }}
                        />
                    </div>

                    <p className="image-cropper-hint">
                        <Move size={14} /> Drag to reposition &bull; Pinch or scroll to zoom
                    </p>

                    {/* Zoom slider */}
                    <div className="image-cropper-zoom">
                        <label>Zoom</label>
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.05}
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="image-cropper-footer">
                    <button className="image-cropper-btn-cancel" onClick={onCancel}>
                        Cancel
                    </button>
                    <button className="image-cropper-btn-apply" onClick={handleApply}>
                        <Check size={16} />
                        Apply Crop
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ImageCropper;
