/**
 * Formats: jpeg (default), png
 * Targeted for Firestore base64 storage limits (1MB per doc)
 */
export const compressImage = async (
    file: File | string,
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const w = img.width;
            const h = img.height;
            const scale = Math.min(maxWidth / w, maxHeight / h, 1);

            const canvas = document.createElement('canvas');
            canvas.width = Math.round(w * scale);
            canvas.height = Math.round(h * scale);

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
            }

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Determine format
            let mime = 'image/jpeg';
            if (typeof file !== 'string' && file.type === 'image/png') {
                // Only keep PNG if specifically requested, otherwise JPEG is much smaller
                // for typical photos/documents.
                // mime = 'image/png'; 
            }

            const dataUrl = canvas.toDataURL(mime, quality);
            resolve(dataUrl);
        };

        img.onerror = (err) => reject(err);

        if (typeof file === 'string') {
            img.src = file;
        } else {
            img.src = URL.createObjectURL(file);
        }
    });
};
