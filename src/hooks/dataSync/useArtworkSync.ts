import { Dispatch, SetStateAction, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Artwork, UserAccount } from '../../types';
import { IS_DEMO_MODE } from '../../constants';
import { mapFromSnakeCase } from '../../utils/supabaseUtils';
import { repairBase64Image } from '../../utils/imageValidator';
import {
  ARTWORK_SYNC_PAGE_SIZE,
  ARTWORK_SYNC_FAILURE_BACKOFF_MS,
  DASHBOARD_IMAGE_SYNC_LIMIT,
  DASHBOARD_ARTWORK_COLUMNS,
  fetchPagedRows,
  FULL_ARTWORK_COLUMNS,
  getGlobalSyncChannel,
  subscribeGlobalSyncChannel,
  unsubscribeGlobalSyncChannel
} from './shared';

interface UseArtworkSyncParams {
  currentUser: UserAccount | null;
  shouldLoadFullArtworks: boolean;
  setArtworks: Dispatch<SetStateAction<Artwork[]>>;
  setAllArtworksIncludingDeleted: Dispatch<SetStateAction<Artwork[]>>;
  setIsLoadingArtworks: Dispatch<SetStateAction<boolean>>;
  handleSyncError: (error: any, context: string) => void;
}

export const useArtworkSync = ({
  currentUser,
  shouldLoadFullArtworks,
  setArtworks,
  setAllArtworksIncludingDeleted,
  setIsLoadingArtworks,
  handleSyncError
}: UseArtworkSyncParams) => {
  useEffect(() => {
    if (IS_DEMO_MODE || !currentUser?.id) return;

    const artworkBackoffKey = `artisflow-artwork-sync-backoff:${currentUser.id}`;
    const artworkImageBackoffKey = `artisflow-artwork-image-sync-backoff:${currentUser.id}`;

    const syncArtworks = async () => {
      const lastFailureRaw = window.sessionStorage.getItem(artworkBackoffKey);
      const lastFailureAt = lastFailureRaw ? Number(lastFailureRaw) : 0;
      if (lastFailureAt && Date.now() - lastFailureAt < ARTWORK_SYNC_FAILURE_BACKOFF_MS) {
        setIsLoadingArtworks(false);
        return;
      }

      setIsLoadingArtworks(true);
      try {
        const artworkColumns = shouldLoadFullArtworks ? FULL_ARTWORK_COLUMNS : DASHBOARD_ARTWORK_COLUMNS;
        const pagedRows: any[] = [];
        let from = 0;
        while (true) {
          const page = await fetchPagedRows('artworks', artworkColumns, from, from + ARTWORK_SYNC_PAGE_SIZE - 1);
          pagedRows.push(...page);
          if (page.length < ARTWORK_SYNC_PAGE_SIZE) break;
          from += ARTWORK_SYNC_PAGE_SIZE;
        }

        const allMapped = mapFromSnakeCase(pagedRows) as Artwork[];
        const uniqueAllMapped = Array.from(new Map(allMapped.map(item => [String(item.id), item])).values());
        const activeArtworks = uniqueAllMapped.filter((a: any) => !a.deletedAt);

        if (shouldLoadFullArtworks) {
          setAllArtworksIncludingDeleted(uniqueAllMapped);
        }
        setArtworks(activeArtworks);

        void (async () => {
          try {
            const lastImageFailureRaw = window.sessionStorage.getItem(artworkImageBackoffKey);
            const lastImageFailureAt = lastImageFailureRaw ? Number(lastImageFailureRaw) : 0;
            if (lastImageFailureAt && Date.now() - lastImageFailureAt < ARTWORK_SYNC_FAILURE_BACKOFF_MS) {
              return;
            }

            let mappedImages: Array<Pick<Artwork, 'id' | 'imageUrl'>> = [];

            if (shouldLoadFullArtworks) {
              const imageColumns = 'id, image_url';
              const imageRows: any[] = [];
              let imageFrom = 0;

              while (true) {
                const page = await fetchPagedRows('artworks', imageColumns, imageFrom, imageFrom + ARTWORK_SYNC_PAGE_SIZE - 1);
                imageRows.push(...page);
                if (page.length < ARTWORK_SYNC_PAGE_SIZE) break;
                imageFrom += ARTWORK_SYNC_PAGE_SIZE;
              }

              mappedImages = mapFromSnakeCase(imageRows) as Array<Pick<Artwork, 'id' | 'imageUrl'>>;
            } else {
              const prioritizedIds = activeArtworks
                .slice(0, DASHBOARD_IMAGE_SYNC_LIMIT)
                .map(art => art.id)
                .filter(Boolean);

              if (prioritizedIds.length === 0) return;

              const { data, error } = await supabase
                .from('artworks')
                .select('id, image_url')
                .in('id', prioritizedIds);

              if (error) throw error;
              mappedImages = mapFromSnakeCase(data || []) as Array<Pick<Artwork, 'id' | 'imageUrl'>>;
            }

            const imageMap = new Map<string, string>();

            mappedImages.forEach(row => {
              const normalizedImage = row.imageUrl?.startsWith('data:image')
                ? repairBase64Image(row.imageUrl) || ''
                : row.imageUrl || '';
              imageMap.set(String(row.id), normalizedImage);
            });

            if (shouldLoadFullArtworks) {
              setAllArtworksIncludingDeleted(prev => prev.map(art => (
                imageMap.has(String(art.id))
                  ? { ...art, imageUrl: imageMap.get(String(art.id)) ?? '' }
                  : art
              )));
            }
            setArtworks(prev => prev.map(art => (
              imageMap.has(String(art.id))
                ? { ...art, imageUrl: imageMap.get(String(art.id)) ?? '' }
                : art
            )));
            window.sessionStorage.removeItem(artworkImageBackoffKey);
          } catch (error: any) {
            window.sessionStorage.setItem(artworkImageBackoffKey, String(Date.now()));
            console.warn('Deferred artwork image sync failed:', error?.message || error);
          }
        })();
        window.sessionStorage.removeItem(artworkBackoffKey);
      } catch (error: any) {
        window.sessionStorage.setItem(artworkBackoffKey, String(Date.now()));
        handleSyncError(error, 'Artworks');
      } finally {
        setIsLoadingArtworks(false);
      }
    };

    void syncArtworks();
    const globalChannel = getGlobalSyncChannel();
    globalChannel.on('postgres_changes', { event: '*', schema: 'public', table: 'artworks' }, (payload) => {
        const updatedItem = mapFromSnakeCase([payload.new || payload.old])[0] as Artwork;
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const normalized = updatedItem.imageUrl?.startsWith('data:image')
            ? { ...updatedItem, imageUrl: repairBase64Image(updatedItem.imageUrl) ?? '' }
            : { ...updatedItem, imageUrl: updatedItem.imageUrl ?? '' };
          
          const itemId = String(normalized.id);

          setAllArtworksIncludingDeleted(prev => {
            const exists = prev.some(a => String(a.id) === itemId);
            return exists 
              ? prev.map(a => String(a.id) === itemId ? normalized : a) 
              : [...prev, normalized];
          });
          setArtworks(prev => {
            if (normalized.deletedAt) return prev.filter(a => String(a.id) !== itemId);
            const exists = prev.some(a => String(a.id) === itemId);
            return exists 
              ? prev.map(a => String(a.id) === itemId ? normalized : a) 
              : [...prev, normalized];
          });
        } else if (payload.eventType === 'DELETE') {
          const itemId = String(payload.old.id);
          setArtworks(prev => prev.filter(a => String(a.id) !== itemId));
          setAllArtworksIncludingDeleted(prev => prev.filter(a => String(a.id) !== itemId));
        }
      });
      
    subscribeGlobalSyncChannel();
    return () => { unsubscribeGlobalSyncChannel(); };
  }, [currentUser?.id, shouldLoadFullArtworks, setAllArtworksIncludingDeleted, setArtworks, setIsLoadingArtworks, handleSyncError]);
};
