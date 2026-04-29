import { supabase } from '../supabase';
import { mapToSnakeCase } from '../utils/supabaseUtils';
import { Artwork, ActivityLog } from '../types';
import { IS_DEMO_MODE } from '../constants';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { generateUUID } from '../utils/idUtils';

const generateId = () => generateUUID();

export const useActivityLogs = () => {
  const { artworks, setLogs } = useData();
  const { currentUser } = useAuth();

  const resolveCurrentUserName = () => {
    const candidate = [
      currentUser?.name,
      currentUser?.fullName,
      currentUser?.firstName,
      currentUser?.email?.split('@')[0]
    ].find(value => typeof value === 'string' && value.trim().length > 0);

    return candidate?.trim() || 'Unknown User';
  };

  const logActivity = (artworkId: string | null, action: string, details?: string, snapshot?: Partial<Artwork>, customTimestamp?: string) => {
    const normalizedArtworkId = artworkId ?? 'SYS';
    const art = snapshot || (artworkId ? artworks.find(a => a.id === artworkId) : undefined);
    const logSnapshot = art ? {
      title: art.title,
      code: art.code,
      artist: art.artist,
      imageUrl: art.imageUrl && art.imageUrl.startsWith('data:image') ? '[Base64 Image]' : art.imageUrl,
      medium: art.medium,
      dimensions: art.dimensions,
      price: art.price,
      year: art.year,
      currentBranch: art.currentBranch
    } : undefined;

    const actorName = resolveCurrentUserName();

    const newLog: ActivityLog = {
      id: generateId(),
      artworkId: normalizedArtworkId,
      action,
      user: actorName,
      userId: currentUser?.id,
      userName: actorName,
      timestamp: customTimestamp || new Date().toISOString(),
      details,
      artworkSnapshot: logSnapshot
    };

    setLogs(prev => [newLog, ...prev]);

    if (IS_DEMO_MODE) return;
    const saveLog = async () => {
        try {
            const { error } = await supabase.from('activity_logs').insert(mapToSnakeCase({
                id: newLog.id,
                artworkId: normalizedArtworkId === 'SYS' ? null : normalizedArtworkId,
                action,
                userName: actorName,
                userId: currentUser?.id,
                timestamp: newLog.timestamp,
                details,
                artworkSnapshot: logSnapshot
            }));
            if (error) throw error;
        } catch (err) {
            console.error("Failed to save log to Supabase", err);
        }
    };
    saveLog();
  };

  const handleDeleteLogs = async (logIds: string[]) => {
    if (IS_DEMO_MODE) return;
    try {
      await supabase.from('activity_logs').delete().in('id', logIds);
      setLogs(prev => prev.filter(l => !logIds.includes(l.id)));
    } catch (error) {
      console.error('Error deleting activity logs', error);
    }
  };

  return { logActivity, handleDeleteLogs };
};
