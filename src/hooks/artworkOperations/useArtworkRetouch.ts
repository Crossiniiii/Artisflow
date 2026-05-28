import { supabase } from '../../supabase';
import { mapToSnakeCase } from '../../utils/supabaseUtils';
import { Artwork, ArtworkStatus, Branch, ReturnRecord } from '../../types';
import { IS_DEMO_MODE } from '../../constants';
import { sanitizeArtworkSnapshot } from '../../services/salesService';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../useNotifications';
import { useActivityLogs } from '../useActivityLogs';
import { findArtwork, syncArtwork } from './shared';

const generateId = () => window.crypto.randomUUID();

export const useArtworkRetouch = () => {
  const {
    artworks, setArtworks,
    allArtworksIncludingDeleted, setAllArtworksIncludingDeleted,
    returnRecords, setReturnRecords
  } = useData();

  const { currentUser } = useAuth();
  const { pushNotification } = useNotifications();
  const { logActivity } = useActivityLogs();

  const handleReturnArtwork = async (
    id: string,
    reason: string,
    referenceNumber?: string,
    proofImage?: string | string[],
    remarks?: string,
    type: 'Artist Reclaim' | 'For Retouch' = 'Artist Reclaim'
  ) => {
    const art = artworks.find(a => a.id === id);
    if (!art) return;
    const status = type === 'Artist Reclaim' ? ArtworkStatus.RETURNED : ArtworkStatus.FOR_RETOUCH;
    const record: ReturnRecord = {
      id: generateId(), artworkId: id, reason, returnedBy: currentUser?.name || 'Unknown',
      returnDate: new Date().toISOString(), artworkSnapshot: sanitizeArtworkSnapshot(art), returnType: type, status: 'Open',
      referenceNumber, proofImage, remarks: remarks || art.remarks
    };
    setReturnRecords(prev => [...prev, record]);
    const updatedArt = {
      ...art,
      status,
      deletedAt: type === 'Artist Reclaim' ? new Date().toISOString() : art.deletedAt,
      remarks: '',
      reservedForEventId: undefined,
      reservedForEventName: undefined,
      reservationExpiry: undefined
    };
    setArtworks(prev => prev.map(a => String(a.id) === String(id) ? updatedArt : a));
    setAllArtworksIncludingDeleted(prev => prev.map(a => String(a.id) === String(id) ? updatedArt : a));
    logActivity(id, type === 'Artist Reclaim' ? 'Artist Reclaim' : 'Sent for Retouch', `Reason: ${reason}.${remarks ? ` Remarks: ${remarks}` : ''}`, updatedArt);
    try {
      if (IS_DEMO_MODE) return true;
      const artworkUpdates: any = { status };
      if (type === 'Artist Reclaim') {
        artworkUpdates.deletedAt = new Date().toISOString();
      }
      artworkUpdates.updatedAt = new Date().toISOString();
      const updatedArtworkOk = await syncArtwork({
        id,
        updates: artworkUpdates,
        expectedStatus: [ArtworkStatus.AVAILABLE, ArtworkStatus.EXCLUSIVE_VIEW_ONLY],
        setArtworks,
        setAllArtworksIncludingDeleted,
        pushNotification
      });
      if (!updatedArtworkOk) {
        setReturnRecords(prev => prev.filter(r => String(r.id) !== String(record.id)));
        setArtworks(prev => prev.map(a => String(a.id) === String(id) ? art : a));
        setAllArtworksIncludingDeleted(prev => prev.map(a => String(a.id) === String(id) ? art : a));
        return false;
      }

      const { error: returnError } = await supabase.from('returns').insert(mapToSnakeCase(record));
      if (returnError) {
        await supabase.from('artworks').update(mapToSnakeCase({
          status: art.status,
          deletedAt: art.deletedAt,
          updatedAt: new Date().toISOString()
        })).eq('id', id);
        throw new Error(`[Returns Table] ${returnError.message}`);
      }

      return true;

    } catch (err: any) {
      console.error("Return Operation Failed:", err);
      alert(`PROTOCOL FAILURE: ${err.message}`);
      setReturnRecords(prev => prev.filter(r => r.id !== record.id));
      setArtworks(prev => prev.map(a => a.id === id ? art : a));
      return false;
    }
  };

  const handleBulkReturnArtwork = async (
    ids: string[],
    reason: string,
    type: 'Artist Reclaim' | 'For Retouch' = 'Artist Reclaim',
    referenceNumber?: string,
    proofImage?: string | string[],
    remarks?: string
  ) => {
    const targetIds = ids.map(String);
    const validArtworks = artworks.filter(a => targetIds.includes(String(a.id)));
    if (validArtworks.length === 0) return false;

    const timestamp = new Date().toISOString();
    const status = type === 'Artist Reclaim' ? ArtworkStatus.RETURNED : ArtworkStatus.FOR_RETOUCH;

    const records: ReturnRecord[] = validArtworks.map(art => ({
      id: generateId(),
      artworkId: art.id,
      reason,
      returnedBy: currentUser?.name || 'Unknown',
      returnDate: timestamp,
      artworkSnapshot: sanitizeArtworkSnapshot(art),
      returnType: type,
      status: 'Open',
      referenceNumber,
      proofImage,
      remarks
    }));

    setReturnRecords(prev => [...records, ...prev]);
    const updatedArtworks = validArtworks.map(art => ({
      ...art,
      status,
      deletedAt: type === 'Artist Reclaim' ? timestamp : art.deletedAt,
      updatedAt: timestamp,
      remarks: '',
      reservedForEventId: undefined,
      reservedForEventName: undefined,
      reservationExpiry: undefined
    }));

    setArtworks(prev => prev.map(a => {
      const updated = updatedArtworks.find(ua => String(ua.id) === String(a.id));
      return updated ? updated : a;
    }));
    setAllArtworksIncludingDeleted(prev => prev.map(a => {
      const updated = updatedArtworks.find(ua => String(ua.id) === String(a.id));
      return updated ? updated : a;
    }));

    validArtworks.forEach(art => logActivity(art.id, type === 'Artist Reclaim' ? 'Artist Reclaim' : 'Sent for Retouch', `Reason: ${reason}.${remarks ? ` Remarks: ${remarks}` : ''}`, updatedArtworks.find(ua => ua.id === art.id)!));

    if (IS_DEMO_MODE) return true;

    try {
      const artworkUpdates: any = { status, updated_at: timestamp };
      if (type === 'Artist Reclaim') {
        artworkUpdates.deleted_at = timestamp;
      }

      const { error: artError } = await supabase
        .from('artworks')
        .update(mapToSnakeCase(artworkUpdates))
        .in('id', ids)
        .in('status', [ArtworkStatus.AVAILABLE, ArtworkStatus.EXCLUSIVE_VIEW_ONLY]);

      if (artError) throw artError;

      const { error: returnError } = await supabase
        .from('returns')
        .insert(records.map(mapToSnakeCase));

      if (returnError) throw returnError;

      return true;
    } catch (error: any) {
      console.error('Batch Return Error:', error);
      alert(`Batch Return Failed: ${error.message}`);

      setReturnRecords(prev => prev.filter(r => !records.some(nr => nr.id === r.id)));
      setArtworks(prev => prev.map(a => {
        const original = validArtworks.find(oa => oa.id === a.id);
        return original ? original : a;
      }));
      return false;
    }
  };

  const handleReturnToGallery = async (recordId: string, branch: Branch, resolvedAt?: string, remarks?: string) => {
    let artworkId: string;
    let isVirtual = recordId.startsWith('virtual-');
    let rec: ReturnRecord | undefined;

    if (isVirtual) {
      artworkId = recordId.replace('virtual-', '');
    } else {
      rec = returnRecords.find(r => r.id === recordId);
      if (!rec) return;
      artworkId = rec.artworkId;
    }

    const art = findArtwork(artworkId, artworks, allArtworksIncludingDeleted);
    if (!art) {
      alert(`DIAGNOSTIC FAILURE: Artwork [${artworkId}] not found in inventory state. Please refresh.`);
      return false;
    }

    const finalDate = resolvedAt || new Date().toISOString();

    if (!isVirtual && rec) {
      setReturnRecords(prev => prev.map(r => String(r.id) === String(recordId) ? { ...r, status: 'Resolved', resolvedAt: finalDate, resolvedToBranch: branch } : r));
      if (!IS_DEMO_MODE) {
        const { error } = await supabase.from('returns').update(mapToSnakeCase({ status: 'Resolved', resolvedAt: finalDate, resolvedToBranch: branch })).eq('id', recordId);
        if (error) {
          alert(`Database Error (Returns): ${error.message}`);
          setReturnRecords(prev => prev.map(r => String(r.id) === String(recordId) ? (rec as ReturnRecord) : r));
          return false;
        }
      }
    }

    const prevArtState = { ...art };
    const updatedArt = {
      ...art,
      status: ArtworkStatus.AVAILABLE,
      currentBranch: branch,
      deletedAt: undefined,
      remarks: '',
      reservedForEventId: undefined,
      reservedForEventName: undefined,
      reservationExpiry: undefined
    };

    setArtworks(prev => {
      const idStr = String(artworkId);
      const exists = prev.some(a => String(a.id) === idStr);
      if (exists) return prev.map(a => String(a.id) === idStr ? updatedArt : a);
      return [...prev, updatedArt];
    });
    setAllArtworksIncludingDeleted(prev => prev.map(a => String(a.id) === String(artworkId) ? updatedArt : a));

    logActivity(artworkId, 'Returned to Gallery', `Returned to ${branch}.${remarks ? ` Remarks: ${remarks}` : ''}`, { status: ArtworkStatus.AVAILABLE, currentBranch: branch }, finalDate);

    if (IS_DEMO_MODE) return true;

    const artworkOk = await syncArtwork({
      id: artworkId,
      updates: { status: ArtworkStatus.AVAILABLE, currentBranch: branch, deletedAt: null } as any,
      expectedStatus: [ArtworkStatus.FOR_RETOUCH, ArtworkStatus.RETURNED],
      setArtworks,
      setAllArtworksIncludingDeleted,
      pushNotification
    });

    if (!artworkOk) {
      alert("Inventory Sync Failure: The artwork status in the database doesn't match 'For Retouch' or 'Returned'. It might have been updated by another user.");
      setArtworks(prev => prev.map(a => String(a.id) === String(artworkId) ? prevArtState : a));
      setAllArtworksIncludingDeleted(prev => prev.map(a => String(a.id) === String(artworkId) ? prevArtState : a));
      return false;
    }

    return true;
  };

  const handleUpdateReturnRecord = async (id: string, u: Partial<ReturnRecord>) => {
    setReturnRecords(prev => prev.map(r => r.id === id ? { ...r, ...u } : r));
    if (IS_DEMO_MODE) return;
    await supabase.from('returns').update(mapToSnakeCase(u)).eq('id', id);
  };

  const handleBulkDeleteReturnRecords = async (ids: string[]) => {
    const virtualIds = ids.filter(id => id.startsWith('virtual-'));
    const realIds = ids.filter(id => !id.startsWith('virtual-'));

    if (virtualIds.length > 0) {
      const artworkIds = virtualIds.map(vId => vId.replace('virtual-', ''));
      setArtworks((prev: Artwork[]) => prev.filter((art: Artwork) => !artworkIds.includes(String(art.id))));
      setAllArtworksIncludingDeleted((prev: Artwork[]) => prev.filter((art: Artwork) => !artworkIds.includes(String(art.id))));

      if (!IS_DEMO_MODE) {
        const { error } = await supabase.from('artworks').delete().in('id', artworkIds);
        if (error) {
          alert(`Failed to hard-delete artwork: ${error.message}`);
          console.error("Virtual Delete Error", error);
        }
      }
    }

    if (realIds.length > 0) {
      setReturnRecords(prev => prev.filter(r => !realIds.includes(r.id)));
      if (!IS_DEMO_MODE) {
        const { error } = await supabase.from('returns').delete().in('id', realIds);
        if (error) {
          alert(`Failed to delete return record: ${error.message}`);
          console.error("Formal Delete Error", error);
        }
      }
    }
  };

  return {
    handleReturnArtwork,
    handleBulkReturnArtwork,
    handleReturnToGallery,
    handleUpdateReturnRecord,
    handleBulkDeleteReturnRecords
  };
};
