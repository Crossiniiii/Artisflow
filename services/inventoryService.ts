import { Artwork, ArtworkStatus, Branch } from '../types';

export const buildNewArtwork = (art: Partial<Artwork>, defaultBranch: Branch): Artwork => {
  const currentYear = new Date().getFullYear();
  return {
    id: Math.random().toString(36).substr(2, 9),
    code: art.code || `ART-${currentYear}-${Math.floor(Math.random() * 900) + 100}`,
    title: art.title || 'Untitled',
    artist: art.artist || 'Unknown',
    medium: art.medium || 'N/A',
    dimensions: art.dimensions || 'N/A',
    year: art.year || currentYear.toString(),
    price: art.price || 0,
    status: (art.status as ArtworkStatus) || ArtworkStatus.AVAILABLE,
    currentBranch: (art.currentBranch as Branch) || defaultBranch,
    imageUrl: art.imageUrl || 'https://picsum.photos/800/600',
    createdAt: new Date().toISOString(),
    sheetName: art.sheetName,
    sizeFrame: art.sizeFrame,
    importPeriod: art.importPeriod,
    remarks: art.remarks
  };
};

