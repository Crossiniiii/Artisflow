import { Artwork, ArtworkStatus, Branch } from '../types';
import { generateUUID } from '../utils/idUtils';

/**
 * Validates if a string is a valid ArtworkStatus
 */
const isValidArtworkStatus = (status: string | undefined): status is ArtworkStatus => {
  if (!status) return false;
  return Object.values(ArtworkStatus).includes(status as ArtworkStatus);
};

/**
 * Generates a unique artwork code using timestamp and random suffix
 * Format: ART-YYYY-XXXXXX (timestamp-based to ensure uniqueness)
 */
const generateUniqueArtworkCode = (): string => {
  const currentYear = new Date().getFullYear();
  const timestamp = Date.now().toString(36).substr(-6).toUpperCase();
  const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ART-${currentYear}-${timestamp}${randomSuffix}`;
};

export const buildNewArtwork = (art: Partial<Artwork>, defaultBranch: Branch): Artwork => {
  return {
    id: generateUUID(),
    code: art.code || generateUniqueArtworkCode(),
    title: art.title || 'Untitled',
    artist: art.artist || 'Unknown',
    medium: art.medium || 'N/A',
    dimensions: art.dimensions || 'N/A',
    year: art.year || new Date().getFullYear().toString(),
    price: art.price || 0,
    status: isValidArtworkStatus(art.status) ? art.status : ArtworkStatus.AVAILABLE,
    currentBranch: art.currentBranch && art.currentBranch.trim() !== '' ? art.currentBranch : defaultBranch,
    imageUrl: art.imageUrl || '',
    createdAt: new Date().toISOString(),
    sheetName: art.sheetName,
    sizeFrame: art.sizeFrame,
    importPeriod: art.importPeriod,
    remarks: art.remarks
  };
};

