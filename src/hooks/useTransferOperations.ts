import { supabase } from '../supabase';
import { generateUUID } from '../utils/idUtils';
import { mapToSnakeCase } from '../utils/supabaseUtils';
import {
  Artwork, ArtworkStatus, TransferRequest, TransferStatus,
  UserRole
} from '../types';
import { IS_DEMO_MODE } from '../constants';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { useNotifications } from './useNotifications';
import { useActivityLogs } from './useActivityLogs';

export const useTransferOperations = () => {
  const {
    artworks, setArtworks,
    setTransferRequests,
    exclusiveBranches
  } = useData();

  const { currentUser } = useAuth();
  const { setImportStatus } = useUI();
  const { pushNotification } = useNotifications();
  const { logActivity } = useActivityLogs();

  // 1. handleCreateTransferRequest
  const handleCreateTransferRequest = async (artworkIds: string[], toBranch: string, attachments?: { itdrUrl?: string | string[] }) => {
    if (!currentUser) return;

    const itdrUrl = attachments?.itdrUrl;
    if (!itdrUrl || (Array.isArray(itdrUrl) && itdrUrl.length === 0)) {
      pushNotification('Action Required', 'IT/DR attachment is mandatory for transfers.', 'system');
      return;
    }

    setImportStatus({
      isVisible: true,
      title: 'Requesting Transfers',
      message: 'Processing transfer requests...',
      progress: { current: 0, total: artworkIds.length }
    });

    const newRequests: TransferRequest[] = artworkIds.map(id => {
      const artwork = artworks.find(a => String(a.id) === String(id));
      if (!artwork) return null;

      if (currentUser.role !== UserRole.ADMIN && currentUser.branch !== artwork.currentBranch) {
        return null;
      }

      return {
        id: generateUUID(),
        artworkId: id,
        artworkTitle: artwork.title,
        artworkCode: artwork.code,
        artworkImage: artwork.imageUrl,
        fromBranch: artwork.currentBranch,
        toBranch: toBranch,
        status: 'Pending',
        requestedBy: currentUser.name,
        requestedAt: new Date().toISOString(),
        itdrUrl: itdrUrl
      };
    }).filter(Boolean) as TransferRequest[];

    if (newRequests.length === 0) {
      if (artworkIds.length > 0) {
        pushNotification('Action Failed', 'You are not authorized to transfer these items.', 'system');
      }
      setImportStatus({ isVisible: false });
      return;
    }

    if (IS_DEMO_MODE) {
      setTransferRequests(prev => [...prev, ...newRequests]);
      setImportStatus({ isVisible: false });
      return;
    }

    try {
      // Supabase supports bulk insert
      // Stripping metadata fields that don't exist in the transfer_requests table
      const dbRequests = newRequests.map(({ artworkTitle, artworkCode, artworkImage, ...rest }) => rest);
      
      const { error } = await supabase.from('transfer_requests').insert(mapToSnakeCase(dbRequests));
      if (error) throw error;

      setTransferRequests(prev => [...prev, ...newRequests]);
      newRequests.forEach(req => {
        const artwork = artworks.find(a => String(a.id) === String(req.artworkId));
        logActivity(req.artworkId, 'Transfer Requested', `To ${toBranch}`, artwork);
      });

      pushNotification('Transfer Requested', `${newRequests.length} items requested for transfer.`, 'inventory');
      setImportStatus({ isVisible: false });
    } catch (error: any) {
      console.error('Supabase Transfer Request Error:', error);
      pushNotification('Action Failed', `Failed to create transfer request: ${error.message || 'Unknown error'}`, 'system');
      setImportStatus({ isVisible: false });
    }
  };

  // 2. handleAcceptTransfer
  const handleAcceptTransfer = async (request: TransferRequest) => {
    if (!currentUser) return;

    if (currentUser.role !== UserRole.ADMIN && currentUser.branch !== request.toBranch) {
      pushNotification('Access Denied', 'Only the receiving branch can accept.', 'system');
      return;
    }

    setImportStatus({
      isVisible: true,
      title: 'Accepting Transfer',
      message: `Finalizing transfer for "${request.artworkTitle}"...`
    });

    try {
      const timestamp = new Date().toISOString();
      const artwork = artworks.find(a => String(a.id) === String(request.artworkId));
      let newStatus = artwork?.status || ArtworkStatus.AVAILABLE;
      const isDestExclusive = exclusiveBranches.includes(request.toBranch);

      if (isDestExclusive) {
        newStatus = ArtworkStatus.EXCLUSIVE_VIEW_ONLY;
      } else if (artwork?.status === ArtworkStatus.EXCLUSIVE_VIEW_ONLY) {
        newStatus = ArtworkStatus.AVAILABLE;
      }

      const updatedArtwork = artwork ? {
        ...artwork,
        currentBranch: request.toBranch,
        status: newStatus
      } as Artwork : null;

      if (!IS_DEMO_MODE) {
        // 1. Update transfer_request status
        const { error: reqError } = await supabase.from('transfer_requests').update(mapToSnakeCase({
          status: 'Accepted',
          respondedBy: currentUser.name,
          respondedAt: timestamp
        })).eq('id', request.id);
        if (reqError) throw reqError;

        // 2. Update artwork location and status
        const { error: artError } = await supabase.from('artworks').update(mapToSnakeCase({
          currentBranch: request.toBranch,
          status: newStatus
        })).eq('id', request.artworkId);
        if (artError) throw artError;

        // 3. Create completed transfer record
        const { error: transError } = await supabase.from('transfers').insert(mapToSnakeCase({
          id: generateUUID(),
          artworkId: request.artworkId,
          artworkTitle: artwork?.title || request.artworkTitle || 'Deleted Artwork',
          origin: request.fromBranch,
          destination: request.toBranch,
          timestamp: timestamp,
          performedBy: request.requestedBy,
          approvedBy: currentUser.name,
          notes: 'Accepted'
        }));
        if (transError) throw transError;
      }

      setTransferRequests(prev => prev.map(r => String(r.id) === String(request.id) ? { ...r, status: 'Accepted' as TransferStatus } : r));
      if (updatedArtwork) setArtworks(prev => prev.map(a => String(a.id) === String(artwork!.id) ? updatedArtwork : a));
      
      logActivity(request.artworkId, 'Transfer Accepted', `To ${request.toBranch}`, updatedArtwork || undefined);
      pushNotification('Transfer Accepted', request.artworkTitle, 'inventory');
    } catch (error: any) {
      console.error('Accept Transfer Error:', error);
      pushNotification('Action Failed', `Failed to accept transfer: ${error.message || 'Unknown error'}`, 'system');
    }
 finally {
      setTimeout(() => setImportStatus({ isVisible: false }), 500);
    }
  };

  // 3. handleDeclineTransfer
  const handleDeclineTransfer = async (request: TransferRequest) => {
    if (!currentUser) return;
    
    setImportStatus({
      isVisible: true,
      title: 'Declining Transfer',
      message: 'Updating request status...'
    });

    try {
      if (!IS_DEMO_MODE) {
        const { error } = await supabase.from('transfer_requests').update(mapToSnakeCase({
            status: 'Declined',
            respondedBy: currentUser.name,
            respondedAt: new Date().toISOString()
        })).eq('id', request.id);
        if (error) throw error;
      }
      
      setTransferRequests(prev => prev.map(r => String(r.id) === String(request.id) ? { ...r, status: 'Declined' as TransferStatus } : r));
      pushNotification('Transfer Declined', request.artworkTitle, 'inventory');
    } catch (error) {
      console.error('Decline Transfer Error:', error);
      pushNotification('Action Failed', 'Could not update request status.', 'system');
    } finally {
      setTimeout(() => setImportStatus({ isVisible: false }), 500);
    }
  };

  // 4. handleHoldTransfer
  const handleHoldTransfer = async (request: TransferRequest) => {
    if (!currentUser) return;

    setImportStatus({
      isVisible: true,
      title: 'Holding Transfer',
      message: 'Updating request status...'
    });

    try {
      if (!IS_DEMO_MODE) {
        const { error } = await supabase.from('transfer_requests').update(mapToSnakeCase({
            status: 'On Hold',
            respondedBy: currentUser.name,
            respondedAt: new Date().toISOString()
        })).eq('id', request.id);
        if (error) throw error;
      }

      setTransferRequests(prev => prev.map(r => String(r.id) === String(request.id) ? { ...r, status: 'On Hold' as TransferStatus } : r));
      pushNotification('Transfer On Hold', request.artworkTitle, 'inventory');
    } catch (error) {
      console.error('Hold Transfer Error:', error);
      pushNotification('Action Failed', 'Could not update request status.', 'system');
    } finally {
      setTimeout(() => setImportStatus({ isVisible: false }), 500);
    }
  };

  // 5. handleDeleteTransfer
  const handleDeleteTransfer = async (request: TransferRequest) => {
    if (!currentUser || !window.confirm(`Delete transfer request for "${request.artworkTitle}"?`)) return;

    setImportStatus({
      isVisible: true,
      title: 'Deleting Request',
      message: 'Removing from database...'
    });

    try {
      if (!IS_DEMO_MODE) {
        const { error } = await supabase.from('transfer_requests').delete().eq('id', request.id);
        if (error) throw error;
      }
      setTransferRequests(prev => prev.filter(r => String(r.id) !== String(request.id)));
      pushNotification('Transfer Deleted', request.artworkTitle, 'inventory');
    } catch (error) {
      console.error('Delete Request Error:', error);
      pushNotification('Action Failed', 'Could not remove request.', 'system');
    } finally {
      setTimeout(() => setImportStatus({ isVisible: false }), 500);
    }
  };

  return {
    handleCreateTransferRequest,
    handleAcceptTransfer,
    handleDeclineTransfer,
    handleHoldTransfer,
    handleDeleteTransfer
  };
};
