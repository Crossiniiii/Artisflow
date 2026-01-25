import { Artwork, ArtworkStatus, SaleRecord } from '../types';

export const buildBulkSale = (
  artworks: Artwork[],
  ids: string[],
  client: string,
  agentName: string,
  delivered: boolean
): { updatedArtworks: Artwork[]; newSales: SaleRecord[] } => {
  const now = new Date().toISOString();
  const newSales: SaleRecord[] = ids.map(id => {
    const art = artworks.find(a => a.id === id);
    return {
      id: Math.random().toString(36).substr(2, 9),
      artworkId: id,
      clientName: client,
      agentName,
      saleDate: now,
      isDelivered: delivered,
      deliveryDate: delivered ? now : undefined,
      artworkSnapshot: art ? {
        title: art.title,
        artist: art.artist,
        code: art.code,
        imageUrl: art.imageUrl,
        price: art.price,
        currentBranch: art.currentBranch,
        medium: art.medium,
        dimensions: art.dimensions,
        year: art.year
      } : undefined
    };
  });

  const updatedArtworks = artworks.map(a =>
    ids.includes(a.id)
      ? { ...a, status: delivered ? ArtworkStatus.DELIVERED : ArtworkStatus.SOLD }
      : a
  );

  return { updatedArtworks, newSales };
};

export const applySingleSale = (
  artworks: Artwork[],
  id: string,
  client: string,
  agentName: string
): { updatedArtworks: Artwork[]; newSale: SaleRecord | null } => {
  const now = new Date().toISOString();
  const art = artworks.find(a => a.id === id);
  if (!art) {
    return { updatedArtworks: artworks, newSale: null };
  }

  const newSale: SaleRecord = {
    id: Math.random().toString(36).substr(2, 9),
    artworkId: id,
    clientName: client,
    agentName,
    saleDate: now,
    isDelivered: false,
    artworkSnapshot: {
      title: art.title,
      artist: art.artist,
      code: art.code,
      imageUrl: art.imageUrl,
      price: art.price,
      currentBranch: art.currentBranch,
      medium: art.medium,
      dimensions: art.dimensions,
      year: art.year
    }
  };

  const updatedArtworks = artworks.map(a =>
    a.id === id ? { ...a, status: ArtworkStatus.SOLD } : a
  );

  return { updatedArtworks, newSale };
};

export const applyCancelSale = (
  artworks: Artwork[],
  sales: SaleRecord[],
  artworkId: string
): { updatedArtworks: Artwork[]; updatedSales: SaleRecord[] } => {
  const updatedArtworks = artworks.map(a =>
    a.id === artworkId ? { ...a, status: ArtworkStatus.AVAILABLE } : a
  );

  const updatedSales = sales.map(s =>
    s.artworkId === artworkId ? { ...s, isCancelled: true } : s
  );

  return { updatedArtworks, updatedSales };
};

export const applyDelivery = (
  artworks: Artwork[],
  sales: SaleRecord[],
  artworkId: string
): { updatedArtworks: Artwork[]; updatedSales: SaleRecord[] } => {
  const now = new Date().toISOString();

  const updatedArtworks = artworks.map(a =>
    a.id === artworkId ? { ...a, status: ArtworkStatus.DELIVERED } : a
  );

  const updatedSales = sales.map(s =>
    s.artworkId === artworkId
      ? { ...s, isDelivered: true, deliveryDate: now }
      : s
  );

  return { updatedArtworks, updatedSales };
};

