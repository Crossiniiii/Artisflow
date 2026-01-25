import { Artwork, Branch } from '../types';

export const applyTransfer = (
  artworks: Artwork[],
  id: string,
  destination: Branch
): Artwork[] => {
  return artworks.map(a =>
    a.id === id ? { ...a, currentBranch: destination } : a
  );
};

export const applyBulkArtworkUpdate = (
  artworks: Artwork[],
  ids: string[],
  updates: Partial<Artwork>
): Artwork[] => {
  return artworks.map(a =>
    ids.includes(a.id) ? { ...a, ...updates } : a
  );
};

