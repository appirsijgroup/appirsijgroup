
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
