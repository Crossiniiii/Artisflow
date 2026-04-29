
/**
 * Compresses a Base64 image string to ensure it fits within Firestore document limits.
 * 
 * @param base64Str The original Base64 string
 * @param maxWidth The maximum width of the image (default 1024px)
 * @param maxSizeBytes The maximum size in bytes (default 500KB to be safe for Firestore 1MB limit)
 * @returns A Promise resolving to the compressed Base64 string
 */
export const compressBase64Image = (base64Str: string, maxWidth: number = 1024, maxSizeBytes: number = 500 * 1024): Promise<string> => {
  return new Promise((resolve, reject) => {
    // If not an image or empty, return as is
    if (!base64Str || !base64Str.startsWith('data:image')) {
      resolve(base64Str);
      return;
    }

    // Check approximate size (base64 length * 0.75 gives approx byte size)
    // We add a buffer of 10% to avoid edge cases
    const approximateSize = base64Str.length * 0.75;
    if (approximateSize < maxSizeBytes) {
      resolve(base64Str);
      return;
    }



    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions keeping aspect ratio
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Start with quality 0.8
      let quality = 0.8;
      let newBase64 = canvas.toDataURL('image/jpeg', quality);

      // If still too big, reduce quality iteratively
      while (newBase64.length * 0.75 > maxSizeBytes && quality > 0.1) {
        quality -= 0.1;
        newBase64 = canvas.toDataURL('image/jpeg', quality);
      }

      const newSize = newBase64.length * 0.75;

      // Check if compression was successful
      if (newSize > maxSizeBytes) {
        reject(new Error(`Unable to compress image to required size. Current: ${Math.round(newSize / 1024)}KB, Max: ${Math.round(maxSizeBytes / 1024)}KB`));
        return;
      }

      resolve(newBase64);
    };

    img.onerror = (err) => {
      reject(new Error(`Image compression failed during loading: ${err}`));
    };
  });
};

/**
 * Fetches an external image URL and converts it to a Base64 string.
 * Uses a proxy-free approach by default, but warns about CORS.
 * 
 * @param url The external image URL
 * @returns A Promise resolving to a Base64 string or the original URL if fetch fails
 */
export const fetchExternalImageAsBase64 = async (url: string): Promise<string> => {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(url, { 
      mode: 'cors',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.warn(`Fetch timed out for external image: ${url}`);
    } else {
      console.warn(`Failed to fetch external image: ${url}. CORS or network issue?`, error);
    }
    return url; // Fallback to original URL
  }
};
