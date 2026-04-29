import { Artwork, ArtworkStatus, SaleRecord, SaleStatus } from '../types';
import { generateUUID } from '../utils/idUtils';

export const buildBulkSale = (
  artworks: Artwork[],
  ids: string[],
  client: string,
  clientEmail: string | undefined,
  clientContact: string | undefined,
  agentName: string,
  delivered: boolean,
  eventInfo?: { id: string; name: string },
  attachments?: {
    itdrUrl?: string | string[];
    rsaUrl?: string | string[];
    orCrUrl?: string | string[];
    itdrUrls?: string[];
    rsaUrls?: string[];
    orCrUrls?: string[];
  },
  totalDownpayment?: number,
  agentId?: string,
  perArtworkDownpayments?: Record<string, number>
): { updatedArtworks: Artwork[]; newSales: SaleRecord[] } => {
  const now = new Date().toISOString();
  const normalizeAttachmentList = (value?: string | string[]) =>
    Array.isArray(value) ? value.filter(Boolean) : value ? [value] : undefined;

  const normalizedItdrUrls = attachments?.itdrUrls ?? normalizeAttachmentList(attachments?.itdrUrl);
  const normalizedRsaUrls = attachments?.rsaUrls ?? normalizeAttachmentList(attachments?.rsaUrl);
  const normalizedOrCrUrls = attachments?.orCrUrls ?? normalizeAttachmentList(attachments?.orCrUrl);

  // Convert to Set for O(1) lookups
  const idSet = new Set(ids);
  // Create artwork lookup map for O(1) access
  const artworkMap = new Map(artworks.map(a => [String(a.id), a]));

  // Calculate total price for proportional distribution of downpayment
  const selectedArtworks = ids.map(id => artworkMap.get(String(id))).filter(a => a !== undefined) as Artwork[];
  const totalPrice = selectedArtworks.reduce((sum, art) => sum + (art.price || 0), 0);

  // Find index of last priced item to absorb rounding differences
  let lastPricedIndex = -1;
  for (let i = ids.length - 1; i >= 0; i--) {
    const art = artworkMap.get(String(ids[i]));
    if (art && art.price && art.price > 0) {
      lastPricedIndex = i;
      break;
    }
  }

  let distributedDownpayment = 0;

  const newSales: SaleRecord[] = ids.map((id, index) => {
    const art = artworkMap.get(String(id));

    // Calculate proportional downpayment
    let itemDownpayment: number | undefined = undefined;
    const explicitItemDownpayment = perArtworkDownpayments?.[id];

    if (explicitItemDownpayment !== undefined) {
      itemDownpayment = explicitItemDownpayment;
    } else if (totalDownpayment !== undefined && art && art.price && totalPrice > 0) {
      if (index === lastPricedIndex) {
        // Last priced item gets the remainder to ensure exact total
        itemDownpayment = Math.round((totalDownpayment - distributedDownpayment) * 100) / 100;
      } else {
        const ratio = art.price / totalPrice;
        itemDownpayment = Math.round((totalDownpayment * ratio) * 100) / 100;
        distributedDownpayment += itemDownpayment;
      }
    } else if (totalDownpayment !== undefined && totalPrice === 0) {
      // Edge case: if total price is 0, split equally or assign to first? 
      // Assuming price > 0 for sales usually. If 0, downpayment is likely 0.
      itemDownpayment = 0;
    }

    return {
      id: generateUUID(),
      artworkId: id,
      clientName: client,
      clientEmail,
      clientContact,
      agentName,
      agentId,
      saleDate: now,
      status: SaleStatus.FOR_SALE_APPROVAL,
      isDelivered: delivered,
      deliveryDate: delivered ? now : undefined,
      soldAtEventId: eventInfo?.id,
      soldAtEventName: eventInfo?.name,
      itdrUrl: normalizedItdrUrls,
      rsaUrl: normalizedRsaUrls,
      orCrUrl: normalizedOrCrUrls,
      downpayment: itemDownpayment,
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
    idSet.has(String(a.id))
      ? {
        ...a,
        status: ArtworkStatus.FOR_SALE_APPROVAL,
        soldAtBranch: a.currentBranch, // Lock in the branch at time of sale
        reservedForEventId: undefined, // Clear reservation
        reservedForEventName: undefined
      }
      : a
  );

  return { updatedArtworks, newSales };
};

export const applySingleSale = (
  artworks: Artwork[],
  artworkId: string,
  clientName: string,
  clientEmail: string | undefined,
  clientContact: string | undefined,
  agentName: string,
  isDelivered: boolean,
  eventInfo?: any,
  attachmentUrl?: string,
  itdrUrls?: string[],
  rsaUrls?: string[],
  orCrUrls?: string[],
  downpayment?: number,
  agentId?: string
): { updatedArtworks: Artwork[]; newSale: SaleRecord | null } => {
  const now = new Date().toISOString();
  const art = artworks.find(a => String(a.id) === String(artworkId));
  if (!art) {
    return { updatedArtworks: artworks, newSale: null };
  }

  const newSale: SaleRecord = {
    id: generateUUID(),
    artworkId,
    clientName,
    clientEmail,
    clientContact,
    agentName,
    agentId,
    status: SaleStatus.FOR_SALE_APPROVAL,
    saleDate: now,
    isDelivered: isDelivered,
    deliveryDate: isDelivered ? now : undefined,
    soldAtEventId: eventInfo?.id,
    soldAtEventName: eventInfo?.name,
    attachmentUrl,
    itdrUrl: itdrUrls,
    rsaUrl: rsaUrls,
    orCrUrl: orCrUrls,
    downpayment,
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
    String(a.id) === String(artworkId) ? {
      ...a,
      status: ArtworkStatus.FOR_SALE_APPROVAL,
      soldAtBranch: a.currentBranch, // Lock in the branch at time of sale
      reservedForEventId: undefined, // Clear reservation
      reservedForEventName: undefined
    } : a
  );

  return { updatedArtworks, newSale };
};

export const applyCancelSale = (
  artworks: Artwork[],
  sales: SaleRecord[],
  artworkId: string
): { updatedArtworks: Artwork[]; updatedSales: SaleRecord[] } => {
  const updatedArtworks = artworks.map(a =>
    String(a.id) === String(artworkId) ? { ...a, status: ArtworkStatus.AVAILABLE } : a
  );

  const updatedSales = sales.map(s =>
    String(s.artworkId) === String(artworkId) ? { ...s, isCancelled: true } : s
  );

  return { updatedArtworks, updatedSales };
};

export const applyDelivery = (
  artworks: Artwork[],
  sales: SaleRecord[],
  artworkId: string,
  itdr?: string,
  rsa?: string,
  orcr?: string
): { updatedArtworks: Artwork[]; updatedSales: SaleRecord[] } => {
  const now = new Date().toISOString();

  const updatedArtworks = artworks.map(a =>
    String(a.id) === String(artworkId) ? {
      ...a,
      status: ArtworkStatus.DELIVERED,
      itdrImageUrl: itdr || a.itdrImageUrl,
      rsaImageUrl: rsa || a.rsaImageUrl,
      orCrImageUrl: orcr || a.orCrImageUrl
    } : a
  );

  const updatedSales = sales.map(s =>
    String(s.artworkId) === String(artworkId)
      ? {
        ...s,
        isDelivered: true,
        deliveryDate: now,
        itdrUrl: itdr ? [...(s.itdrUrl || []), itdr] : s.itdrUrl,
        rsaUrl: rsa ? [...(s.rsaUrl || []), rsa] : s.rsaUrl,
        orCrUrl: orcr ? [...(s.orCrUrl || []), orcr] : s.orCrUrl
      }
      : s
  );

  return { updatedArtworks, updatedSales };
};
