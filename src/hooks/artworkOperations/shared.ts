import { supabase } from '../../supabase';
import { mapToSnakeCase, mapFromSnakeCase } from '../../utils/supabaseUtils';
import { Artwork, ArtworkStatus, SaleRecord, SaleStatus } from '../../types';
import { IS_DEMO_MODE } from '../../constants';

export const findArtwork = (
  id: string,
  artworks: Artwork[],
  allArtworksIncludingDeleted: Artwork[]
) => {
  const artworkId = String(id);
  return artworks.find(a => String(a.id) === artworkId) ||
    allArtworksIncludingDeleted.find(a => String(a.id) === artworkId);
};

export const syncArtwork = async ({
  id,
  updates,
  expectedStatus,
  setArtworks,
  setAllArtworksIncludingDeleted,
  pushNotification
}: {
  id: string;
  updates: Partial<Artwork>;
  expectedStatus?: ArtworkStatus | ArtworkStatus[];
  setArtworks: React.Dispatch<React.SetStateAction<Artwork[]>>;
  setAllArtworksIncludingDeleted: React.Dispatch<React.SetStateAction<Artwork[]>>;
  pushNotification: (
    title: string,
    message: string,
    type?: 'inventory' | 'sales' | 'system',
    artworkId?: string,
    items?: any[]
  ) => void;
}) => {
  if (IS_DEMO_MODE) return true;
  try {
    const { type, ...updatesWithoutType } = updates;
    let query = supabase.from('artworks').update(mapToSnakeCase(updatesWithoutType)).eq('id', id);

    // Concurrency Guard: Only update if the status is still what we expect
    if (expectedStatus) {
      query = Array.isArray(expectedStatus)
        ? query.in('status', expectedStatus)
        : query.eq('status', expectedStatus);
    }

    const { data, error } = await query.select();
    if (error) throw error;

    // If no rows were updated (status 200 but empty data), someone else changed it first
    if (expectedStatus && (!data || data.length === 0)) {
      pushNotification('Action Denied', 'The artwork status has changed. Please refresh and try again.', 'system');
      // Re-fetch artworks to correct local state
      const { data: latest } = await supabase.from('artworks').select('*').eq('id', id).single();
      if (latest) {
        const mapped = mapFromSnakeCase([latest])[0] as Artwork;
        setAllArtworksIncludingDeleted(prev => prev.map(a => a.id === id ? mapped : a));
        setArtworks(prev => {
          if (mapped.deletedAt) return prev.filter(a => a.id !== id);
          const exists = prev.some(a => a.id === id);
          return exists ? prev.map(a => a.id === id ? mapped : a) : [...prev, mapped];
        });
      }
      return false;
    }
    return true;
  } catch (error) {
    console.error('Supabase Sync Error:', error);
    return false;
  }
};

export const getPendingSalesForArtwork = (artworkId: string, sales: SaleRecord[]) => {
  return sales.filter(s =>
    s.artworkId === artworkId &&
    s.status === SaleStatus.FOR_SALE_APPROVAL &&
    !s.isCancelled
  );
};
