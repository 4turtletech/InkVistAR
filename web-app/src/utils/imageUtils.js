/**
 * Compress an image file to a base64 string based on file size constraints.
 * - > 5MB: quality 0.3
 * - > 1MB: quality 0.5
 * - <= 1MB: quality 1.0 (uncompressed/max)
 * - Max Width: 1024px
 */
export const compressImage = (file, maxWidth = 1024) => {
    return new Promise((resolve, reject) => {
        const sizeMB = file.size / (1024 * 1024);
        let quality = 1.0;
        
        if (sizeMB > 5) {
            quality = 0.3;
        } else if (sizeMB > 1) {
            quality = 0.5;
        }

        const img = new Image();
        const reader = new FileReader();
        
        reader.onload = (e) => {
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Only resize if > 1MB (as per compression logic) or if extremely wide
                if ((sizeMB > 1 || width > maxWidth) && width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};
