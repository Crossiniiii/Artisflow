/**
 * Validates and repairs artwork images
 * Ensures all images are properly formatted and loadable
 */

import { Artwork } from '../types';


/**
 * Validates if a string is a valid Base64 image
 */
const isValidBase64Image = (str: string): boolean => {
  if (!str || !str.startsWith('data:image')) return false;
  
  // Check basic format - more lenient regex
  const pattern = /^data:image\/[a-zA-Z+.-]+;base64,/;
  if (!pattern.test(str)) return false;
  
  // Extract base64 part and check if it's valid
  const base64Part = str.split(',')[1];
  if (!base64Part || base64Part.length < 100) return false;
  
  // Check if it's valid base64
  try {
    atob(base64Part);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Checks if an image URL is valid and accessible
 */
export const validateImageUrl = (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!url) {
      resolve(false);
      return;
    }
    
    // Base64 images - validate format
    if (url.startsWith('data:image')) {
      resolve(isValidBase64Image(url));
      return;
    }
    
    // External URLs - try to load
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
    
    // Timeout after 5 seconds
    setTimeout(() => resolve(false), 5000);
  });
};

/**
 * Repairs corrupted or invalid Base64 images
 * Returns null if image cannot be repaired
 */
export const repairBase64Image = (str: string): string | null => {
  if (!str) return null;
  
  // If it's already valid, return as-is
  if (isValidBase64Image(str)) return str;
  
  // Try to fix common issues
  
  // Issue 1: Missing data URL prefix
  if (!str.startsWith('data:') && str.length > 100) {
    // Try adding JPEG prefix (most common)
    const withPrefix = `data:image/jpeg;base64,${str}`;
    if (isValidBase64Image(withPrefix)) {
      return withPrefix;
    }
  }
  
  // Issue 2: Wrong or missing mime type
  if (str.startsWith('data:') && !str.includes('image/')) {
    const parts = str.split(',');
    if (parts.length === 2) {
      const repaired = `data:image/jpeg;base64,${parts[1]}`;
      if (isValidBase64Image(repaired)) {
        return repaired;
      }
    }
  }
  
  // Issue 3: Truncated or corrupted base64
  const commaIndex = str.indexOf(',');
  if (commaIndex > 0) {
    const base64Part = str.substring(commaIndex + 1);
    // Check if it looks like base64
    if (/^[A-Za-z0-9+/=]+$/.test(base64Part.substring(0, 100))) {
      // Try to repair by ensuring proper padding
      let repaired = base64Part.replace(/[^A-Za-z0-9+/=]/g, '');
      const padding = repaired.length % 4;
      if (padding) {
        repaired += '='.repeat(4 - padding);
      }
      
      const prefix = str.substring(0, commaIndex + 1);
      const fullString = prefix + repaired;
      
      if (isValidBase64Image(fullString)) {
        return fullString;
      }
    }
  }
  
  return null;
};

