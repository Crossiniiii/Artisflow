import { supabase } from '../../supabase';
import { mapToSnakeCase } from '../../utils/supabaseUtils';
import { Artwork, ArtworkStatus, Branch, FramerRecord } from '../../types';
import { IS_DEMO_MODE } from '../../constants';
import { sanitizeArtworkSnapshot } from '../../services/salesService';
import { useData } from '../../contexts/DataContext';
import { useNotifications } from '../useNotifications';
import { useActivityLogs } from '../useActivityLogs';
import { syncArtwork } from './shared';

const generateId = () => window.crypto.randomUUID();

export const useArtworkFraming = () => {
  const {
    artworks, setArtworks,
    allArtworksIncludingDeleted, setAllArtworksIncludingDeleted,
    framerRecords, setFramerRecords
  } = useData();

  const { pushNotification } = useNotifications();
  const { logActivity } = useActivityLogs();

  const handleSendToFramer = async (id: string, details: string, attachmentUrl?: string | string[], remarks?: string) => {
    const art = artworks.find(a => a.id === id);
    if (!art) return;
    const record: FramerRecord = {
      id: generateId(), artworkId: id, damageDetails: details, sentDate: new Date().toISOString(),
      artworkSnapshot: sanitizeArtworkSnapshot(art), status: 'Open', attachmentUrl, remarks
    };
    setFramerRecords(prev => [...prev, record]);
    const updatedArt = { ...art, status: ArtworkStatus.FOR_FRAMING };
    setArtworks(prev => prev.map(a => a.id === id ? updatedArt : a));
    logActivity(id, 'Sent to Framer', `${details}.${remarks ? ` Remarks: ${remarks}` : ''}`, updatedArt);
    if (IS_DEMO_MODE) return true;

    const updatedArtworkOk = await syncArtwork({
      id,
      updates: { status: ArtworkStatus.FOR_FRAMING },
      expectedStatus: [
        ArtworkStatus.AVAILABLE,
        ArtworkStatus.EXCLUSIVE_VIEW_ONLY,
        ArtworkStatus.RESERVED,
        ArtworkStatus.FOR_SALE_APPROVAL
      ],
      setArtworks,
      setAllArtworksIncludingDeleted,
      pushNotification
    });
    if (!updatedArtworkOk) {
      setFramerRecords(prev => prev.filter(r => r.id !== record.id));
      setArtworks(prev => prev.map(a => a.id === id ? art : a));
      return false;
    }

    const { error } = await supabase.from('framer_records').insert(mapToSnakeCase(record));
    if (error) {
      await supabase.from('artworks').update(mapToSnakeCase({ status: art.status })).eq('id', id);
      setFramerRecords(prev => prev.filter(r => r.id !== record.id));
      setArtworks(prev => prev.map(a => a.id === id ? art : a));
      alert("Framer Insert Error: " + JSON.stringify(error));
      console.error("Framer Error", error);
      return false;
    }

    return true;
  };

  const handleBulkSendToFramer = async (ids: string[], details: string, attachmentUrl?: string | string[], remarks?: string) => {
    const validArtworks = artworks.filter(a => ids.includes(a.id));
    if (validArtworks.length === 0) return false;

    const timestamp = new Date().toISOString();
    const records: FramerRecord[] = validArtworks.map(art => ({
      id: generateId(),
      artworkId: art.id,
      damageDetails: details,
      sentDate: timestamp,
      artworkSnapshot: sanitizeArtworkSnapshot(art),
      status: 'Open',
      attachmentUrl,
      remarks
    }));

    setFramerRecords(prev => [...records, ...prev]);
    const targetIds = ids.map(String);
    setArtworks(prev => prev.map(a => targetIds.includes(String(a.id)) ? { ...a, status: ArtworkStatus.FOR_FRAMING } : a));
    setAllArtworksIncludingDeleted(prev => prev.map(a => targetIds.includes(String(a.id)) ? { ...a, status: ArtworkStatus.FOR_FRAMING } : a));

    validArtworks.forEach(art => logActivity(art.id, 'Sent to Framer', `${details}.${remarks ? ` Remarks: ${remarks}` : ''}`, { ...art, status: ArtworkStatus.FOR_FRAMING }));

    if (IS_DEMO_MODE) return true;

    try {
      const { error: artError } = await supabase
        .from('artworks')
        .update(mapToSnakeCase({ status: ArtworkStatus.FOR_FRAMING, updated_at: timestamp }))
        .in('id', ids)
        .in('status', [
          ArtworkStatus.AVAILABLE,
          ArtworkStatus.EXCLUSIVE_VIEW_ONLY,
          ArtworkStatus.RESERVED,
          ArtworkStatus.FOR_SALE_APPROVAL
        ]);

      if (artError) throw artError;

      const { error: framerError } = await supabase
        .from('framer_records')
        .insert(records.map(mapToSnakeCase));

      if (framerError) throw framerError;

      return true;
    } catch (error: any) {
      console.error('Batch Framing Error:', error);
      alert(`Batch Framing Failed: ${error.message}`);

      setFramerRecords(prev => prev.filter(r => !records.some(nr => nr.id === r.id)));
      setArtworks(prev => prev.map(a => {
        const original = validArtworks.find(oa => oa.id === a.id);
        return original ? original : a;
      }));
      return false;
    }
  };

  const handleReturnFromFramer = async (recordId: string, branch: Branch, resolvedAt?: string, remarks?: string) => {
    let artworkId: string;
    let rec: FramerRecord | undefined;
    const isVirtual = recordId.startsWith('virtual-');

    if (isVirtual) {
      artworkId = recordId.replace('virtual-', '');
    } else {
      rec = framerRecords.find(r => r.id === recordId);
      if (!rec) return false;
      artworkId = rec.artworkId;
    }

    const finalDate = resolvedAt || new Date().toISOString();
    const art = artworks.find(a => a.id === artworkId);
    if (!art) return false;

    if (!isVirtual && rec) {
      setFramerRecords(prev =>
        prev.map(r => String(r.id) === String(recordId) ? { ...r, status: 'Resolved', resolvedAt: finalDate, resolvedToBranch: branch } : r)
      );
    }

    const updatedArtFields = {
      status: ArtworkStatus.AVAILABLE,
      currentBranch: branch,
      remarks: '',
      reservedForEventId: undefined,
      reservedForEventName: undefined,
      reservationExpiry: undefined
    };

    setArtworks(prev =>
      prev.map(a => String(a.id) === String(artworkId) ? { ...a, ...updatedArtFields } : a)
    );
    setAllArtworksIncludingDeleted(prev =>
      prev.map(a => String(a.id) === String(artworkId) ? { ...a, ...updatedArtFields } : a)
    );
    logActivity(artworkId, 'Returned from Framer', `Returned to ${branch}.${remarks ? ` Remarks: ${remarks}` : ''}`, {
      ...updatedArtFields
    }, finalDate);

    if (IS_DEMO_MODE) return true;

    if (!isVirtual && rec) {
      const framerUpdate = await supabase
        .from('framer_records')
        .update(mapToSnakeCase({ status: 'Resolved', resolvedAt: finalDate, resolvedToBranch: branch }))
        .eq('id', recordId);

      if (framerUpdate.error) {
        setFramerRecords(prev => prev.map(r => String(r.id) === String(recordId) ? rec! : r));
        setArtworks(prev => prev.map(a => String(a.id) === String(artworkId) ? art : a));
        setAllArtworksIncludingDeleted(prev => prev.map(a => String(a.id) === String(artworkId) ? art : a));
        return false;
      }
    }

    const artworkOk = await syncArtwork({
      id: artworkId,
      updates: { status: ArtworkStatus.AVAILABLE, currentBranch: branch },
      expectedStatus: ArtworkStatus.FOR_FRAMING,
      setArtworks,
      setAllArtworksIncludingDeleted,
      pushNotification
    });

    if (!artworkOk) {
      if (!isVirtual && rec) {
        setFramerRecords(prev => prev.map(r => r.id === recordId ? rec! : r));
      }
      setArtworks(prev => prev.map(a => a.id === artworkId ? art : a));
      return false;
    }

    return true;
  };

  const handleDeleteFramerRecord = async (id: string) => {
    if (id.startsWith('virtual-')) {
      const artworkId = id.replace('virtual-', '');
      setArtworks((prev: Artwork[]) => prev.filter((art: Artwork) => String(art.id) !== artworkId));
      setAllArtworksIncludingDeleted((prev: Artwork[]) => prev.filter((art: Artwork) => String(art.id) !== artworkId));
      if (!IS_DEMO_MODE) {
        await supabase.from('artworks').delete().eq('id', artworkId);
      }
    } else {
      setFramerRecords(prev => prev.filter(r => r.id !== id));
      if (!IS_DEMO_MODE) {
        await supabase.from('framer_records').delete().eq('id', id);
      }
    }
  };

  return {
    handleSendToFramer,
    handleBulkSendToFramer,
    handleReturnFromFramer,
    handleDeleteFramerRecord
  };
};
