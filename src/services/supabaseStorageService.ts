import { supabase } from '../supabase';

/**
 * Uploads a Base64 image string to Supabase Storage and returns the public URL.
 * If the string is already a URL or empty, it returns it unchanged.
 * 
 * @param base64Str The Base64 string to upload
 * @param bucketName The Supabase Storage bucket name
 * @param folderName Optional folder subpath
 * @returns The public URL of the uploaded image
 */
export const uploadBase64ToStorage = async (
  base64Str: string | undefined | null,
  bucketName: string = 'images',
  folderName: string = 'artworks'
): Promise<string | undefined | null> => {
  if (!base64Str) return base64Str;
  
  // If it's already a URL (http/https/blob) or path, return as is
  if (!base64Str.startsWith('data:image')) return base64Str;

  try {
    const matches = base64Str.match(/^data:(.+?);base64,(.+)$/);
    if (!matches) {
      console.warn('Invalid base64 format');
      return base64Str; 
    }

    const mimeString = matches[1];
    const base64Data = matches[2];
    
    // Determine extension
    const extMatch = mimeString.match(/\/([a-zA-Z0-9]+)/);
    const ext = extMatch ? extMatch[1] : 'jpg';
    
    // Generate unique filename
    const fileName = `${folderName}/IMG_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;

    // Convert Base64 payload to Uint8Array for Supabase JS client
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeString });

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, blob, {
        contentType: mimeString,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage Upload Error:', uploadError);
      return base64Str; // Fallback to base64 if upload fails
    }

    // Get Public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;

  } catch (error) {
    console.error('Failed to convert and upload base64 image:', error);
    return base64Str; // Safe fallback
  }
};

/**
 * Handles bulk uploading of attachments (single or multiple).
 * Processes string or string[] and returns the same structure with public URLs.
 */
export const uploadAttachmentsToStorage = async (
  input: string | string[] | undefined | null,
  bucketName: string = 'images',
  folderName: string = 'attachments'
): Promise<string | string[] | undefined | null> => {
  if (!input) return input;

  if (Array.isArray(input)) {
    return Promise.all(input.map(item => uploadBase64ToStorage(item, bucketName, folderName))) as Promise<string[]>;
  }

  return uploadBase64ToStorage(input, bucketName, folderName);
};
