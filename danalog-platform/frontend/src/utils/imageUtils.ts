/**
 * Compresses an image file to a base64 string with reduced size.
 * Uses URL.createObjectURL for better memory handling on iOS.
 * Max width: 1024px, Quality: 0.7 JPEG
 */
export const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        // Use createObjectURL instead of FileReader to save memory on iOS
        const blobUrl = URL.createObjectURL(file);
        const img = new Image();
        img.src = blobUrl;

        img.onload = () => {
            // Revoke URL immediately to free memory
            URL.revokeObjectURL(blobUrl);

            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Max width/height to 1024 while maintaining aspect ratio
            const MAX_dimension = 1024;
            if (width > height) {
                if (width > MAX_dimension) {
                    height *= MAX_dimension / width;
                    width = MAX_dimension;
                }
            } else {
                if (height > MAX_dimension) {
                    width *= MAX_dimension / height;
                    height = MAX_dimension;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
            }

            // Draw image to canvas
            ctx.drawImage(img, 0, 0, width, height);

            // Compress to JPEG 0.7
            // logic: quality 0.7 is usually good enough for mobile photos
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            resolve(dataUrl);
        };

        img.onerror = (error) => {
            URL.revokeObjectURL(blobUrl);
            reject(error);
        };
    });
};
