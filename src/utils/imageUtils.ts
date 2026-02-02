
/**
 * Image Utils
 * Helper functions for image manipulation
 */

/**
 * Convert a File object to WebP format
 * @param file The original image file
 * @param quality Quality of the output image (0 to 1)
 * @returns Promise that resolves to a new File object in WebP format
 */
export const convertImageToWebP = (file: File, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
        // If already webp, return as is
        if (file.type === 'image/webp') {
            resolve(file);
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }
                ctx.drawImage(img, 0, 0);

                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('Failed to convert image to WebP'));
                        return;
                    }
                    const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                        type: 'image/webp',
                        lastModified: Date.now(),
                    });
                    resolve(newFile);
                }, 'image/webp', quality);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

/**
 * Convert a Data URL (base64) to a Blob object
 * @param dataURL The data URL string
 * @returns Blob object
 */
export const dataURLToBlob = (dataURL: string): Blob => {
    const parts = dataURL.split(',');
    if (parts.length < 2) throw new Error('Invalid data URL');

    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';

    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }

    return new Blob([u8arr], { type: mime });
};

/**
 * Fetch an image from a URL and convert it to a Base64 string
 * Useful for jsPDF which works better with Base64/locally cached data
 */
export const imageUrlToBase64 = async (url: string): Promise<string> => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Failed to convert image URL to base64:', error);
        throw error;
    }
};
/**
 * Flatten an image onto a white background and convert to JPEG
 * This solves transparency issues in PDF generation where transparent areas 
 * might be rendered as black boxes.
 */
export const flattenImageWithWhiteBackground = async (imageSource: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }

            // 1. Fill with solid white
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 2. Draw the image on top
            ctx.drawImage(img, 0, 0);

            // 3. Export as high quality JPEG (JPEG doesn't support transparency)
            resolve(canvas.toDataURL('image/jpeg', 0.95));
        };
        img.onerror = (err) => {
            console.error('Flattening error:', err);
            reject(err);
        };
        img.src = imageSource;
    });
};
