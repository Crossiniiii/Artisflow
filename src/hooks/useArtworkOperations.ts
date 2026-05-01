import { supabase } from '../supabase';
import { mapToSnakeCase, mapFromSnakeCase } from '../utils/supabaseUtils';
import {
  Artwork, ArtworkStatus, Branch, SaleRecord,
  ImportRecord, ImportFailedItem, UserRole,
  FramerRecord, ReturnRecord, SaleStatus
} from '../types';
import { IS_DEMO_MODE } from '../constants';
import { buildNewArtwork } from '../services/inventoryService';
import { buildMonthlyAudit } from '../services/auditService';
import { buildBulkSale, applyCancelSale, applySingleSale, applyDelivery } from '../services/salesService';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { useNotifications } from './useNotifications';
import { useActivityLogs } from './useActivityLogs';
import { uploadBase64ToStorage, uploadAttachmentsToStorage } from '../services/supabaseStorageService';

const generateId = () => window.crypto.randomUUID();

export const useArtworkOperations = () => {
  const {
    artworks, setArtworks,
    allArtworksIncludingDeleted, setAllArtworksIncludingDeleted,
    sales, setSales,
    exclusiveBranches,
    framerRecords, setFramerRecords,
    returnRecords, setReturnRecords,
    setAudits,
    setImportLogs
  } = useData();

  // Helper to find artwork across BOTH active and deleted lists
  const findArtwork = (id: string) => {
    const artworkId = String(id);
    return artworks.find(a => String(a.id) === artworkId) || 
           allArtworksIncludingDeleted.find(a => String(a.id) === artworkId);
  };

  const { currentUser } = useAuth();
  const userRole = currentUser?.role ?? UserRole.ADMIN;
  const { setImportStatus } = useUI();
  const { pushNotification } = useNotifications();
  const { logActivity } = useActivityLogs();
  const currentUserName = currentUser?.name || currentUser?.fullName || 'Admin';

  const sendDeclineFeedbackToAgent = async (sale: SaleRecord, reason?: string) => {
    if (IS_DEMO_MODE || !currentUser || !sale.agentId || sale.agentId === currentUser.id) return;

    try {
      const artworkTitle = sale.artworkSnapshot?.title || artworks.find(a => a.id === sale.artworkId)?.title || 'the artwork';
      const feedback = reason?.trim() || 'The sale declaration needs revision before it can be approved.';
      const messageText = `Sale declaration for "${artworkTitle}" was declined.\n\nAdmin comment: ${feedback}`;
      const now = new Date().toISOString();

      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('*')
        .contains('participant_ids', [currentUser.id, sale.agentId])
        .limit(1)
        .maybeSingle();

      let conversationId = existingConversation?.id as string | undefined;

      if (!conversationId) {
        const newConversation = {
          participantIds: [currentUser.id, sale.agentId],
          participantNames: {
            [currentUser.id]: currentUserName,
            [sale.agentId]: sale.agentName || 'Agent'
          },
          updatedAt: now,
          unreadCount: {
            [currentUser.id]: 0,
            [sale.agentId]: 0
          }
        };

        const { data: createdConversation, error: createConversationError } = await supabase
          .from('conversations')
          .insert(mapToSnakeCase(newConversation))
          .select()
          .single();

        if (createConversationError) throw createConversationError;
        conversationId = createdConversation.id;
      }

      const newMessage = {
        conversationId,
        senderId: currentUser.id,
        senderName: currentUserName,
        text: messageText,
        timestamp: now,
        readBy: [currentUser.id]
      };

      const { error: messageError } = await supabase
        .from('messages')
        .insert(mapToSnakeCase(newMessage));

      if (messageError) throw messageError;

      const unreadCount = { ...(existingConversation?.unread_count || {}) };
      unreadCount[currentUser.id] = 0;
      unreadCount[sale.agentId] = (unreadCount[sale.agentId] || 0) + 1;

      const { error: updateConversationError } = await supabase
        .from('conversations')
        .update(mapToSnakeCase({
          lastMessage: {
            text: messageText,
            senderName: currentUserName,
            timestamp: now
          },
          updatedAt: now,
          unreadCount
        }))
        .eq('id', conversationId);

      if (updateConversationError) throw updateConversationError;
    } catch (error) {
      console.error('Failed to send sale decline feedback to agent inbox:', error);
    }
  };

  // Helper for Supabase operations with Concurrency Guard
  const syncArtwork = async (id: string, updates: Partial<Artwork>, expectedStatus?: ArtworkStatus | ArtworkStatus[]) => {
    if (IS_DEMO_MODE) return true;
    try {
      let query = supabase.from('artworks').update(mapToSnakeCase(updates)).eq('id', id);

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

  const getPendingSalesForArtwork = (artworkId: string, sourceSales: SaleRecord[] = sales) => {
    return sourceSales.filter(s =>
      s.artworkId === artworkId &&
      s.status === SaleStatus.FOR_SALE_APPROVAL &&
      !s.isCancelled
    );
  };

  const handleAddArtwork = async (art: Partial<Artwork>) => {
    setImportStatus({
      isVisible: true,
      title: 'Adding Artwork',
      message: `Saving "${art.title || 'New Artwork'}" to database...`
    });
    try {
      const newArt = buildNewArtwork(art, '' as Branch);
      if (exclusiveBranches.includes(newArt.currentBranch)) {
        newArt.status = ArtworkStatus.EXCLUSIVE_VIEW_ONLY;
      }
      setArtworks(prev => [...prev, newArt]);
      logActivity(newArt.id, 'Created', `Added to ${newArt.currentBranch}`, newArt);
      if (!IS_DEMO_MODE) {
        // Upload any base64 image to Storage before saving
        if (newArt.imageUrl?.startsWith('data:image/')) {
          newArt.imageUrl = await uploadBase64ToStorage(newArt.imageUrl, 'images', 'artworks') || newArt.imageUrl;
        }

        const { error } = await supabase.from('artworks').insert(mapToSnakeCase(newArt));
        if (error) throw error;
      }
    } catch (error) {
      console.error('Add Artwork Error:', error);
      pushNotification('Error Adding Artwork', 'Could not save to database.', 'system');
    } finally {
      setTimeout(() => setImportStatus({ isVisible: false }), 500);
    }
  };

  const handleUpdateArtwork = async (id: string, updates: Partial<Artwork>) => {
    const existing = artworks.find(a => a.id === id);
    if (!existing) return;

    setImportStatus({
      isVisible: true,
      title: 'Updating Artwork',
      message: `Syncing changes for "${existing.title}"...`
    });

    try {
      // Upload any new base64 image to Storage before saving
      if (updates.imageUrl?.startsWith('data:image/')) {
        updates.imageUrl = await uploadBase64ToStorage(updates.imageUrl, 'images', 'artworks') || updates.imageUrl;
      }

      // Check for re-submission of requested attachments
      const isReupload = updates.itdrImageUrl || updates.rsaImageUrl || updates.orCrImageUrl;
      if (isReupload) {
        const declinedSale = sales.find(s => 
          String(s.artworkId) === String(id) && 
          s.status === SaleStatus.DECLINED && 
          s.requestedAttachments && s.requestedAttachments.length > 0
        );

        if (declinedSale) {
          const saleUpdate: Partial<SaleRecord> = {
            status: SaleStatus.FOR_SALE_APPROVAL,
            itdrUrl: (updates.itdrImageUrl as string[]) || (Array.isArray(declinedSale.itdrUrl) ? declinedSale.itdrUrl : []),
            rsaUrl: (updates.rsaImageUrl as string[]) || (Array.isArray(declinedSale.rsaUrl) ? declinedSale.rsaUrl : []),
            orCrUrl: (updates.orCrImageUrl as string[]) || (Array.isArray(declinedSale.orCrUrl) ? declinedSale.orCrUrl : [])
          };

          setSales(prev => prev.map(s => s.id === declinedSale.id ? { ...s, ...saleUpdate } : s));
          
          if (!IS_DEMO_MODE) {
            const dbSaleUpdate = {
              status: SaleStatus.FOR_SALE_APPROVAL,
              itdr_url: JSON.stringify(saleUpdate.itdrUrl),
              rsa_url: JSON.stringify(saleUpdate.rsaUrl),
              or_cr_url: JSON.stringify(saleUpdate.orCrUrl)
            };
            await supabase.from('sales').update(dbSaleUpdate).eq('id', declinedSale.id);
            // Re-set artwork status to pending
            updates.status = ArtworkStatus.FOR_SALE_APPROVAL;
          } else {
            updates.status = ArtworkStatus.FOR_SALE_APPROVAL;
          }
        }
      }

      const updated = { ...existing, ...updates };
      setArtworks(prev => prev.map(a => String(a.id) === String(id) ? updated : a));
      setAllArtworksIncludingDeleted(prev => prev.map(a => String(a.id) === String(id) ? updated : a));
      logActivity(id, 'Updated', 'Metadata changes', updated);
      await syncArtwork(id, updates);
    } catch (error) {
      console.error('Update Artwork Error:', error);
      pushNotification('Update Failed', 'Changes could not be synced to database.', 'system');
    } finally {
      setTimeout(() => setImportStatus({ isVisible: false }), 500);
    }
  };

  const handleDeleteArtwork = async (id: string) => {
    const artwork = artworks.find(a => a.id === id);
    if (!artwork || !window.confirm(`Are you sure you want to delete "${artwork.title}"?`)) return;

    setImportStatus({
      isVisible: true,
      title: 'Deleting Artwork',
      message: `Removing record from database...`
    });

    try {
      if (!IS_DEMO_MODE) {
        const { error } = await supabase.from('artworks').delete().eq('id', id);
        if (error) throw error;
      }
      setArtworks(prev => prev.filter(a => String(a.id) !== String(id)));
      setAllArtworksIncludingDeleted(prev => prev.filter(a => String(a.id) !== String(id)));
      logActivity(id, 'Deleted', `Artwork "${artwork.title}" was removed`, artwork);
    } catch (error) {
      console.error('Delete Artwork Error:', error);
      pushNotification('Delete Failed', 'Record could not be removed from database.', 'system');
    } finally {
      setTimeout(() => setImportStatus({ isVisible: false }), 500);
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    if (ids.length === 0) return;

    setImportStatus({
      isVisible: true,
      title: 'Bulk Deleting',
      message: `Removing ${ids.length} items from database...`,
      progress: { current: 0, total: ids.length }
    });

    try {
      if (!IS_DEMO_MODE) {
        const { error } = await supabase.from('artworks').delete().in('id', ids);
        if (error) throw error;
      }
      setArtworks(prev => prev.filter(a => !ids.includes(a.id)));
      setAllArtworksIncludingDeleted(prev => prev.filter(a => !ids.includes(a.id)));
      setImportStatus({
        isVisible: true,
        title: 'Bulk Deleting',
        message: 'Records removed successfully.',
        progress: { current: ids.length, total: ids.length }
      });
    } catch (error) {
      console.error('Bulk Delete Error:', error);
      pushNotification('Bulk Delete Failed', 'Some records could not be removed.', 'system');
    } finally {
      setTimeout(() => setImportStatus({ isVisible: false }), 1000);
    }
  };

  const handleReserveArtwork = async (id: string, details: string, expiryDate?: string, reservedForEventId?: string, reservedForEventName?: string) => {
    const art = artworks.find(a => a.id === id);
    if (!art) return;
    const updates = { status: ArtworkStatus.RESERVED, remarks: details, reservationExpiry: expiryDate, reservedForEventId, reservedForEventName };
    const updated = { ...art, ...updates };
    setArtworks(prev => prev.map(a => String(a.id) === String(id) ? updated : a));
    setAllArtworksIncludingDeleted(prev => prev.map(a => String(a.id) === String(id) ? updated : a));
    logActivity(id, 'Reserved', details, updated);
    const success = await syncArtwork(id, updates, ArtworkStatus.AVAILABLE);
    if (!success) {
      setArtworks(prev => prev.map(a => String(a.id) === String(id) ? art : a));
      setAllArtworksIncludingDeleted(prev => prev.map(a => String(a.id) === String(id) ? art : a));
      return false;
    }
    return true;
  };

  const handleBulkReserve = async (ids: string[], details: string, expiryDate?: string, reservedForEventId?: string, reservedForEventName?: string) => {
    const updates = { status: ArtworkStatus.RESERVED, remarks: details, reservationExpiry: expiryDate, reservedForEventId, reservedForEventName };
    const targetIds = ids.map(String);
    setArtworks(prev => prev.map(a => targetIds.includes(String(a.id)) ? { ...a, ...updates } : a));
    setAllArtworksIncludingDeleted(prev => prev.map(a => targetIds.includes(String(a.id)) ? { ...a, ...updates } : a));
    if (IS_DEMO_MODE) return true;
    await supabase.from('artworks').update(mapToSnakeCase(updates)).in('id', ids);
    return true;
  };

  const handleCancelReservation = async (id: string) => {
    const art = artworks.find(a => String(a.id) === String(id));
    if (!art) return;
    const updates = { 
      status: ArtworkStatus.AVAILABLE, 
      remarks: '', 
      reservationExpiry: undefined,
      reservedForEventId: undefined,
      reservedForEventName: undefined
    };
    setArtworks(prev => prev.map(a => String(a.id) === String(id) ? { ...a, ...updates } : a));
    setAllArtworksIncludingDeleted(prev => prev.map(a => String(a.id) === String(id) ? { ...a, ...updates } : a));
    logActivity(id, 'Reservation Cancelled', '', { ...art, ...updates });
    const success = await syncArtwork(id, updates, ArtworkStatus.RESERVED);
    if (!success) {
      setArtworks(prev => prev.map(a => String(a.id) === String(id) ? art : a));
      setAllArtworksIncludingDeleted(prev => prev.map(a => String(a.id) === String(id) ? art : a));
      return false;
    }
    return true;
  };

  const handleBulkCancelReservation = async (ids: string[]) => {
    const updates = { 
      status: ArtworkStatus.AVAILABLE, 
      remarks: '', 
      reservationExpiry: undefined,
      reservedForEventId: undefined,
      reservedForEventName: undefined
    };
    const targetIds = ids.map(String);
    setArtworks(prev => prev.map(a => targetIds.includes(String(a.id)) ? { ...a, ...updates } : a));
    setAllArtworksIncludingDeleted(prev => prev.map(a => targetIds.includes(String(a.id)) ? { ...a, ...updates } : a));
    if (IS_DEMO_MODE) return true;
    await supabase.from('artworks').update(mapToSnakeCase(updates)).in('id', ids);
    return true;
  };

  const handleSale = async (id: string, clientName: string, clientEmail: string, clientContact: string, delivered: boolean, eventInfo?: any, attachment?: string, itdr?: string[], rsa?: string[], orcr?: string[], downpayment?: number) => {
    const existingPendingSales = getPendingSalesForArtwork(id);
    if (existingPendingSales.length > 0) {
      pushNotification('Sale Already Pending', 'This artwork already has a sale waiting for approval.', 'system');
      return false;
    }

    const previousArtworks = artworks;
    const previousArtwork = artworks.find(a => String(a.id) === String(id));
    const agentName = currentUser?.name || 'Unknown';
    const agentId = currentUser?.id;
    const { updatedArtworks, newSale } = applySingleSale(artworks, id, clientName, clientEmail, clientContact, agentName, delivered, eventInfo, attachment, itdr, rsa, orcr, downpayment, agentId);
    if (!newSale) return;
    setSales(prev => [...prev, newSale]);
    setArtworks(updatedArtworks);
    setAllArtworksIncludingDeleted(prev => prev.map(a => String(a.id) === String(id) ? (updatedArtworks.find(ua => String(ua.id) === String(id)) || a) : a));
    logActivity(id, 'Sale Submitted', `For ${clientName}`, updatedArtworks.find(a => String(a.id) === String(id)));
    if (IS_DEMO_MODE) return true;

    // Upload Attachments to Storage
    const secureItdr = await uploadAttachmentsToStorage(itdr, 'images', 'attachments') as string[] | undefined;
    const secureRsa = await uploadAttachmentsToStorage(rsa, 'images', 'attachments') as string[] | undefined;
    const secureOrcr = await uploadAttachmentsToStorage(orcr, 'images', 'attachments') as string[] | undefined;

    // Guard: Only allow sale if currently AVAILABLE
    const success = await syncArtwork(id, { 
      status: ArtworkStatus.FOR_SALE_APPROVAL,
      itdrImageUrl: secureItdr ? JSON.stringify(secureItdr) : undefined,
      rsaImageUrl: secureRsa ? JSON.stringify(secureRsa) : undefined,
      orCrImageUrl: secureOrcr ? JSON.stringify(secureOrcr) : undefined
    }, ArtworkStatus.AVAILABLE);
    if (!success) {
      setSales(prev => prev.filter(s => String(s.id) !== String(newSale.id)));
      setArtworks(previousArtworks);
      setAllArtworksIncludingDeleted(previousArtworks);
      return false;
    }

    const { agentId: _ignoredAgentId, ...persistedSale } = newSale;
    const serializedSale = {
      ...persistedSale,
      itdrUrl: secureItdr && secureItdr.length > 0 ? JSON.stringify(secureItdr) : null,
      rsaUrl: secureRsa && secureRsa.length > 0 ? JSON.stringify(secureRsa) : null,
      orCrUrl: secureOrcr && secureOrcr.length > 0 ? JSON.stringify(secureOrcr) : null,
      artworkSnapshot: persistedSale.artworkSnapshot ? JSON.stringify(persistedSale.artworkSnapshot) : null
    };
    const { error } = await supabase.from('sales').insert(mapToSnakeCase(serializedSale));
    if (error) {
      console.error('Create Sale Error:', error);
      setSales(prev => prev.filter(s => s.id !== newSale.id));
      setArtworks(previousArtworks);
      pushNotification('Sale Submission Failed', 'The sale could not be submitted. No approval request was created.', 'system');

      if (previousArtwork) {
        await supabase
          .from('artworks')
          .update(mapToSnakeCase({
            status: previousArtwork.status,
            soldAtBranch: previousArtwork.soldAtBranch ?? null,
            reservedForEventId: previousArtwork.reservedForEventId ?? null,
            reservedForEventName: previousArtwork.reservedForEventName ?? null
          }))
          .eq('id', id);
      }

      return false;
    }

    return true;
  };

  const handleBulkSale = async (
    ids: string[],
    client: string,
    delivered: boolean,
    eventInfo?: any,
    attachments?: any,
    downpayment?: number,
    clientEmail?: string,
    clientContact?: string,
    perArtworkDownpayments?: Record<string, number>
  ) => {
    const duplicateIds = ids.filter(id => getPendingSalesForArtwork(id).length > 0);
    if (duplicateIds.length > 0) {
      pushNotification('Pending Sales Found', `${duplicateIds.length} selected artwork${duplicateIds.length === 1 ? '' : 's'} already have a sale awaiting approval.`, 'system');
      return false;
    }

    const agentName = currentUser?.name || 'Unknown';
    const agentId = currentUser?.id;
    const { updatedArtworks, newSales } = buildBulkSale(
      artworks,
      ids,
      client,
      clientEmail,
      clientContact,
      agentName,
      delivered,
      eventInfo,
      attachments,
      downpayment,
      agentId,
      perArtworkDownpayments
    );
    setArtworks(updatedArtworks);
    setAllArtworksIncludingDeleted(updatedArtworks);
    setSales(prev => [...prev, ...newSales]);
    if (IS_DEMO_MODE) return true;

    // Upload attachments to storage for all sales
    const processedNewSales = await Promise.all(newSales.map(async (sale) => {
      const itdrUpload = await uploadAttachmentsToStorage(sale.itdrUrl, 'images', 'attachments') as string[] | undefined;
      const rsaUpload = await uploadAttachmentsToStorage(sale.rsaUrl, 'images', 'attachments') as string[] | undefined;
      const orcrUpload = await uploadAttachmentsToStorage(sale.orCrUrl, 'images', 'attachments') as string[] | undefined;
      return { ...sale, itdrUrl: itdrUpload, rsaUrl: rsaUpload, orCrUrl: orcrUpload };
    }));

    await supabase.from('artworks').update(mapToSnakeCase({ status: ArtworkStatus.FOR_SALE_APPROVAL })).in('id', ids);
    const persistedSales = processedNewSales.map(({ agentId: _ignoredAgentId, ...sale }) => ({
      ...sale,
      // Serialize attachment arrays to JSON strings for text columns
      itdrUrl: sale.itdrUrl && sale.itdrUrl.length > 0 ? JSON.stringify(sale.itdrUrl) : null,
      rsaUrl: sale.rsaUrl && sale.rsaUrl.length > 0 ? JSON.stringify(sale.rsaUrl) : null,
      orCrUrl: sale.orCrUrl && sale.orCrUrl.length > 0 ? JSON.stringify(sale.orCrUrl) : null,
      // Serialize nested snapshot object
      artworkSnapshot: sale.artworkSnapshot ? JSON.stringify(sale.artworkSnapshot) : null
    }));
    await supabase.from('sales').insert(mapToSnakeCase(persistedSales));
  };

  const handleCancelSale = async (artworkId: string) => {
    if (!window.confirm('Cancel this sale?')) return;
    const { updatedArtworks, updatedSales } = applyCancelSale(artworks, sales, artworkId);
    setArtworks(updatedArtworks);
    setAllArtworksIncludingDeleted(updatedArtworks);
    setSales(updatedSales);
    const sale = updatedSales.find(s => String(s.artworkId) === String(artworkId) && s.isCancelled);
    
    // Audit Logging
    logActivity(artworkId, 'Sale Cancelled', `Sale to ${sale?.clientName || 'Unknown'} was cancelled`, updatedArtworks.find(a => String(a.id) === String(artworkId)));

    if (IS_DEMO_MODE) return true;
    if (!sale) return false;
    await supabase.from('artworks').update(mapToSnakeCase({ status: ArtworkStatus.AVAILABLE })).eq('id', artworkId);
    await supabase.from('sales').update(mapToSnakeCase({ isCancelled: true })).eq('id', sale.id);
  };

  const handleDeleteSaleRecord = async (saleId: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return false;

    const artworkTitle = sale.artworkSnapshot?.title || findArtwork(sale.artworkId)?.title || 'this sale record';
    if (!window.confirm(`Delete the sale record for "${artworkTitle}"? This removes it from the sales dashboard only.`)) {
      return false;
    }

    const previousSales = sales;
    setSales(prev => prev.filter(s => String(s.id) !== String(saleId)));
    logActivity(
      sale.artworkId,
      'Sale Record Deleted',
      `Removed sale record for ${sale.clientName}`,
      findArtwork(sale.artworkId)
    );

    if (IS_DEMO_MODE) return true;

    const { error } = await supabase.from('sales').delete().eq('id', saleId);
    if (error) {
      console.error('Delete Sale Record Error:', error);
      setSales(previousSales);
      pushNotification('Delete Failed', 'The sale record could not be removed.', 'system');
      return false;
    }

    return true;
  };

  const handleApproveSale = async (saleId: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    const previousSales = sales;
    const previousArtworks = artworks;

    setImportStatus({
      isVisible: true,
      title: 'Approving Sale',
      message: `Finalizing sale for "${sale.clientName}"...`,
      progress: { current: 0, total: 100 }
    });

    try {
      const isDelivered = sale.isDelivered;
      const siblingPendingSales = getPendingSalesForArtwork(sale.artworkId).filter(s => s.id !== saleId);
      const siblingPendingSaleIds = siblingPendingSales.map(s => s.id);

      // 1. Optimistic UI Updates
      const updatedSale = { 
        ...sale, 
        status: SaleStatus.APPROVED, 
        requestedAttachments: undefined, 
        declineReason: undefined 
      };
      setSales(prev => prev.map(s => {
        if (String(s.id) === String(saleId)) return updatedSale;
        if (siblingPendingSaleIds.map(String).includes(String(s.id))) return { ...s, status: SaleStatus.DECLINED };
        return s;
      }));

      const updatedStatus = isDelivered ? ArtworkStatus.DELIVERED : ArtworkStatus.SOLD;
      setArtworks(prev => prev.map(a => String(a.id) === String(sale.artworkId) ? {
        ...a,
        status: updatedStatus,
        itdrImageUrl: (Array.isArray(sale.itdrUrl) ? sale.itdrUrl[0] : sale.itdrUrl) || a.itdrImageUrl,
        rsaImageUrl: (Array.isArray(sale.rsaUrl) ? sale.rsaUrl[0] : sale.rsaUrl) || a.rsaImageUrl,
        orCrImageUrl: (Array.isArray(sale.orCrUrl) ? sale.orCrUrl[0] : sale.orCrUrl) || a.orCrImageUrl
      } : a));
      setAllArtworksIncludingDeleted(prev => prev.map(a => String(a.id) === String(sale.artworkId) ? {
        ...a,
        status: updatedStatus,
        itdrImageUrl: (Array.isArray(sale.itdrUrl) ? sale.itdrUrl[0] : sale.itdrUrl) || a.itdrImageUrl,
        rsaImageUrl: (Array.isArray(sale.rsaUrl) ? sale.rsaUrl[0] : sale.rsaUrl) || a.rsaImageUrl,
        orCrImageUrl: (Array.isArray(sale.orCrUrl) ? sale.orCrUrl[0] : sale.orCrUrl) || a.orCrImageUrl
      } : a));

      setImportStatus(prev => ({ ...prev, progress: { current: 50, total: 100 } }));

      if (!IS_DEMO_MODE) {
        // 2. Database Updates
        const { error: saleError } = await supabase.from('sales').update(mapToSnakeCase({ 
          status: SaleStatus.APPROVED,
          requestedAttachments: null,
          declineReason: null
        })).eq('id', saleId);
        if (saleError) throw saleError;

        if (siblingPendingSaleIds.length > 0) {
          const { error: siblingsError } = await supabase.from('sales').update(mapToSnakeCase({ status: SaleStatus.DECLINED })).in('id', siblingPendingSaleIds);
          if (siblingsError) throw siblingsError;
        }

        // 3. Sync Artwork Status (Concurrency Guard)
        const success = await syncArtwork(sale.artworkId, {
          status: updatedStatus,
          itdrImageUrl: Array.isArray(sale.itdrUrl) ? sale.itdrUrl[0] : sale.itdrUrl,
          rsaImageUrl: Array.isArray(sale.rsaUrl) ? sale.rsaUrl[0] : sale.rsaUrl,
          orCrImageUrl: Array.isArray(sale.orCrUrl) ? sale.orCrUrl[0] : sale.orCrUrl
        }, ArtworkStatus.FOR_SALE_APPROVAL);

        if (!success) throw new Error('Artwork status sync failed. It may have been updated by another process.');
      }

      logActivity(sale.artworkId, 'Sale Approved', `Approved sale to ${sale.clientName}`, artworks.find(a => String(a.id) === String(sale.artworkId)));
      setImportStatus(prev => ({ ...prev, message: 'Sale approved successfully!', progress: { current: 100, total: 100 } }));
      return true;
    } catch (error: any) {
      console.error('Approve Sale Error:', error);
      // Database Fallback: Revert local state
      setSales(previousSales);
      setArtworks(previousArtworks);
      pushNotification('Approval Failed', error.message || 'Could not complete the approval process.', 'system');
      return false;
    } finally {
      setTimeout(() => setImportStatus({ isVisible: false }), 800);
    }
  };

  const handleAddInstallment = async (saleId: string, amount: number, date: string, reference?: string, proofImage?: string | string[]) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    setImportStatus({
      isVisible: true,
      title: 'Recording Payment',
      message: `Adding payment of ₱${amount.toLocaleString()}...`,
      progress: { current: 0, total: 100 }
    });

    try {
      const art = findArtwork(sale.artworkId);
      const totalPaid = (sale.downpayment || 0) + (sale.installments || []).reduce((sum, inst) => sum + inst.amount, 0);
      const isOverpayment = (totalPaid + amount) > (art?.price || 0) + 0.01;

      // Handle Proof Upload first if not demo
      let secureProof: string | string[] | undefined = proofImage;
      if (!IS_DEMO_MODE && proofImage) {
        setImportStatus(prev => ({ ...prev, message: 'Uploading receipt proof...' }));
        secureProof = (await uploadAttachmentsToStorage(proofImage, 'images', 'attachments')) as string | string[] | undefined;
      }

      const installment = {
        id: generateId(),
        amount,
        date,
        recordedBy: currentUser?.name || 'Unknown',
        reference,
        proofImage: secureProof,
        createdAt: new Date().toISOString(),
        isPending: userRole !== UserRole.ADMIN // Every installment needs approval unless added by admin
      };

      const updatedInstallments = [...(sale.installments || []), installment];
      const updatedSale = { ...sale, installments: updatedInstallments };

      // Optimistic update
      setSales(prev => prev.map(s => String(s.id) === String(saleId) ? updatedSale : s));
      setImportStatus(prev => ({ ...prev, progress: { current: 50, total: 100 } }));

      if (!IS_DEMO_MODE) {
        const { error } = await supabase
          .from('sales')
          .update(mapToSnakeCase({ installments: updatedInstallments }))
          .eq('id', saleId);
        
        if (error) throw error;
      }

      setImportStatus(prev => ({ ...prev, progress: { current: 100, total: 100 }, message: 'Payment recorded successfully!' }));
      
      // Audit Logging
      logActivity(sale.artworkId, 'Payment Recorded', `₱${amount.toLocaleString()} payment received (Ref: ${reference || 'N/A'})`, findArtwork(sale.artworkId));

      setTimeout(() => setImportStatus({ isVisible: false }), 800);
      pushNotification('Payment Recorded', `₱${amount.toLocaleString()} has been added to the payment history for ${sale.clientName}.`, 'system');
      
    } catch (err: any) {
      console.error('Error recording installment:', err);
      // Rollback
      setSales(prev => prev.map(s => String(s.id) === String(saleId) ? sale : s));
      setImportStatus({ isVisible: false });
      pushNotification('Payment Failed', `Could not record payment: ${err.message}`, 'system');
    }
  };

  const handleEditPayment = async (saleId: string, paymentId: string, updates: { amount: number; date?: string; reference?: string }) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    const isDownpayment = paymentId === 'downpayment';
    const createdAt = isDownpayment ? sale.downpaymentRecordedAt : sale.installments?.find(i => i.id === paymentId)?.createdAt;
    
    const isNew = createdAt && (new Date().getTime() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000);
    const isAdmin = userRole === UserRole.ADMIN;

    const art = findArtwork(sale.artworkId);
    const totalOthers = isDownpayment 
      ? (sale.installments || []).filter(i => !i.isPending).reduce((sum, inst) => sum + inst.amount, 0)
      : (sale.downpayment || 0) + (sale.installments || []).filter(i => i.id !== paymentId && !i.isPending).reduce((sum, inst) => sum + inst.amount, 0);
    const isOverpayment = (totalOthers + updates.amount) > (art?.price || 0) + 0.01;

    if ((isNew && !isOverpayment) || isAdmin) {
      const previousSales = sales;
      let updatedSale: SaleRecord;

      if (isDownpayment) {
        updatedSale = { ...sale, downpayment: updates.amount };
      } else {
        const updatedInstallments = (sale.installments || []).map(i => 
          i.id === paymentId ? { ...i, amount: updates.amount, date: updates.date || i.date, reference: updates.reference || i.reference } : i
        );
        updatedSale = { ...sale, installments: updatedInstallments };
      }

      setSales(prev => prev.map(s => s.id === saleId ? updatedSale : s));
      logActivity(sale.artworkId, 'Payment Edited', `Updated ${isDownpayment ? 'downpayment' : 'installment'} to ₱${updates.amount.toLocaleString()}`, findArtwork(sale.artworkId));

      if (!IS_DEMO_MODE) {
        await supabase.from('sales').update(mapToSnakeCase({
          downpayment: updatedSale.downpayment,
          installments: updatedSale.installments
        })).eq('id', saleId);
      }
    } else {
      const previousSales = sales;
      let updatedSale: SaleRecord;

      const pendingEdit = {
        amount: updates.amount,
        date: updates.date || '',
        reference: updates.reference || '',
        requestedAt: new Date().toISOString(),
        requestedBy: currentUserName,
        status: 'Pending' as const
      };

      if (isDownpayment) {
        updatedSale = { ...sale, pendingDownpaymentEdit: pendingEdit };
      } else {
        const updatedInstallments = (sale.installments || []).map(i => 
          i.id === paymentId ? { ...i, pendingEdit } : i
        );
        updatedSale = { ...sale, installments: updatedInstallments };
      }

      setSales(prev => prev.map(s => s.id === saleId ? updatedSale : s));
      pushNotification('Edit Requested', 'Change submitted for admin approval.', 'system');

      if (!IS_DEMO_MODE) {
        await supabase.from('sales').update(mapToSnakeCase({
          pendingDownpaymentEdit: updatedSale.pendingDownpaymentEdit,
          installments: updatedSale.installments
        })).eq('id', saleId);
      }
    }
  };

  const handleApprovePaymentEdit = async (saleId: string, paymentId: string) => {
    if (userRole !== UserRole.ADMIN) return;
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    let updatedSale: SaleRecord;
    const isDownpayment = paymentId === 'downpayment';

    if (isDownpayment && sale.pendingDownpaymentEdit) {
      updatedSale = { 
        ...sale, 
        downpayment: sale.pendingDownpaymentEdit.amount,
        pendingDownpaymentEdit: undefined 
      };
    } else {
      const updatedInstallments = (sale.installments || []).map(i => {
        if (i.id === paymentId) {
          if (i.isPending) return { ...i, isPending: false };
          if (i.pendingEdit) {
            return { 
              ...i, 
              amount: i.pendingEdit.amount,
              date: i.pendingEdit.date || i.date,
              reference: i.pendingEdit.reference || i.reference,
              pendingEdit: undefined 
            };
          }
        }
        return i;
      });
      updatedSale = { ...sale, installments: updatedInstallments };
    }

    setSales(prev => prev.map(s => s.id === saleId ? updatedSale : s));
    logActivity(sale.artworkId, 'Payment Edit Approved', `Approved edit for ${isDownpayment ? 'downpayment' : 'installment'}`, findArtwork(sale.artworkId));

    if (!IS_DEMO_MODE) {
      await supabase.from('sales').update(mapToSnakeCase({
        downpayment: updatedSale.downpayment,
        pendingDownpaymentEdit: null,
        installments: updatedSale.installments
      })).eq('id', saleId);
    }
  };

  const handleDeclinePaymentEdit = async (saleId: string, paymentId: string) => {
    if (userRole !== UserRole.ADMIN) return;
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    let updatedSale: SaleRecord;
    const isDownpayment = paymentId === 'downpayment';

    if (isDownpayment) {
      updatedSale = { ...sale, pendingDownpaymentEdit: undefined };
    } else {
      const updatedInstallments = (sale.installments || []).filter(i => {
        if (i.id === paymentId && i.isPending) return false; // Remove pending new installment
        return true;
      }).map(i => 
        i.id === paymentId ? { ...i, pendingEdit: undefined } : i
      );
      updatedSale = { ...sale, installments: updatedInstallments };
    }

    setSales(prev => prev.map(s => s.id === saleId ? updatedSale : s));
    pushNotification('Edit Declined', 'Payment edit request has been declined.', 'system');

    if (!IS_DEMO_MODE) {
      await supabase.from('sales').update(mapToSnakeCase({
        pendingDownpaymentEdit: null,
        installments: updatedSale.installments
      })).eq('id', saleId);
    }
  };

  const handleDeclineSale = async (saleId: string, reason?: string, requestedFiles?: string[]) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    const previousSales = sales;
    const previousArtworks = artworks;

    setImportStatus({
      isVisible: true,
      title: 'Declining Sale',
      message: `Syncing decline for "${sale.clientName}"...`,
      progress: { current: 0, total: 100 }
    });

    try {
      // 1. Granular Decline: Only decline the specific sale
      const otherPendingSales = getPendingSalesForArtwork(sale.artworkId).filter(s => s.id !== saleId);
      const artworkShouldBeAvailable = otherPendingSales.length === 0;

      // Optimistic Update: Decline the specific sale
      setSales(prev => prev.map(s =>
        String(s.id) === String(saleId)
          ? { ...s, status: SaleStatus.DECLINED, declineReason: reason, requestedAttachments: requestedFiles as any }
          : s
      ));

      if (artworkShouldBeAvailable) {
        setArtworks(prev => prev.map(a => String(a.id) === String(sale.artworkId) ? { ...a, status: ArtworkStatus.AVAILABLE } : a));
        setAllArtworksIncludingDeleted(prev => prev.map(a => String(a.id) === String(sale.artworkId) ? { ...a, status: ArtworkStatus.AVAILABLE } : a));
      }

      setImportStatus(prev => ({ ...prev, progress: { current: 50, total: 100 } }));

      if (!IS_DEMO_MODE) {
        // 2. Database Updates
        console.log('[handleDeclineSale] Updating specific sale to DECLINED:', saleId);
        const { error: saleError } = await supabase
          .from('sales')
          .update(mapToSnakeCase({ 
            status: SaleStatus.DECLINED, 
            declineReason: reason,
            requestedAttachments: requestedFiles
          }))
          .eq('id', saleId);
        
        if (saleError) {
          console.error('[handleDeclineSale] Supabase Sale Update Error:', saleError);
          throw saleError;
        }
        
        if (artworkShouldBeAvailable) {
          console.log('[handleDeclineSale] No other pending sales. Updating artwork to AVAILABLE:', sale.artworkId);
          // Sync Artwork Status (Concurrency Guard)
          const success = await syncArtwork(sale.artworkId, { 
            status: ArtworkStatus.AVAILABLE 
          }, ArtworkStatus.FOR_SALE_APPROVAL);
          
          if (!success) {
             console.warn('[handleDeclineSale] Artwork status sync skipped or failed (possibly already updated).');
          }
        } else {
          console.log(`[handleDeclineSale] ${otherPendingSales.length} other pending sales remain. Artwork stays in FOR_SALE_APPROVAL.`);
        }

        // 3. Feedback to agent
        await sendDeclineFeedbackToAgent(sale, reason);
      }

      logActivity(sale.artworkId, 'Sale Declined', `Reason: ${reason || 'No reason provided'}`, findArtwork(sale.artworkId));
      setImportStatus(prev => ({ ...prev, message: 'Sale declined successfully.', progress: { current: 100, total: 100 } }));
      return true;
    } catch (error: any) {
      console.error('[handleDeclineSale] CRITICAL ERROR:', error);
      // Database Fallback: Revert local state
      setSales(previousSales);
      setArtworks(previousArtworks);
      pushNotification('Decline Failed', error.message || 'Could not sync decline status.', 'system');
      return false;
    } finally {
      setTimeout(() => setImportStatus({ isVisible: false }), 800);
    }
  };

  const handleDeliver = async (id: string, itdr: string | string[] = '', rsa: string | string[] = '', orcr: string | string[] = '') => {
    // Helper to serialize attachments
    const serializeAttachmentLocal = (val: string | string[] | undefined | null): string => {
      if (!val) return '';
      if (Array.isArray(val)) return val.length > 0 ? JSON.stringify(val) : '';
      return val;
    };

    // Upload attachment base64s to storage if applicable (handle arrays or strings)
    const secureItdrArr = await uploadAttachmentsToStorage(itdr, 'images', 'attachments');
    const secureRsaArr = await uploadAttachmentsToStorage(rsa, 'images', 'attachments');
    const secureOrcrArr = await uploadAttachmentsToStorage(orcr, 'images', 'attachments');

    // Normalize to string for storage (serialize arrays as JSON)
    const itdrStrFinal = serializeAttachmentLocal(secureItdrArr);
    const rsaStrFinal = serializeAttachmentLocal(secureRsaArr);
    const orcrStrFinal = serializeAttachmentLocal(secureOrcrArr);
    
    const { updatedArtworks, updatedSales } = applyDelivery(artworks, sales, id, itdrStrFinal, rsaStrFinal, orcrStrFinal);
    setArtworks(updatedArtworks);
    setSales(updatedSales);
    const art = updatedArtworks.find(a => a.id === id);
    const sale = updatedSales.find(s => s.artworkId === id);
    if (IS_DEMO_MODE) return true;
    if (!art || !sale) return false;

    await supabase.from('artworks').update(mapToSnakeCase({ 
      status: art.status, 
      itdrImageUrl: itdrStrFinal, 
      rsaImageUrl: rsaStrFinal, 
      orCrImageUrl: orcrStrFinal 
    })).eq('id', id);
    await supabase.from('sales').update(mapToSnakeCase(sale)).eq('id', sale.id);
  };

  const handleConfirmAudit = async () => {
    const newAudit = buildMonthlyAudit(artworks, [], userRole);
    setAudits(prev => [newAudit, ...prev]);
    if (IS_DEMO_MODE) return;
    await supabase.from('audits').insert(mapToSnakeCase(newAudit));
  };

  const handleAddToAuction = async (ids: string[], auctionId: string, auctionName: string) => {
    const updates = {
      status: ArtworkStatus.RESERVED,
      remarks: `[Reserved For Auction: ${auctionName}]`,
      reservedForEventId: auctionId,
      reservedForEventName: auctionName,
      currentBranch: 'Auction' as Branch,
      updatedAt: new Date().toISOString()
    };

    // 1. Optimistic Update Local Artworks
    const targetIds = ids.map(String);
    setArtworks(prev => prev.map(a => targetIds.includes(String(a.id)) ? { ...a, ...updates } : a));
    setAllArtworksIncludingDeleted(prev => prev.map(a => targetIds.includes(String(a.id)) ? { ...a, ...updates } : a));

    if (IS_DEMO_MODE) return true;

    try {
      // 2. Update Artworks in Supabase
      // Only allow if currently AVAILABLE or already RESERVED (idempotency)
      const { error: artError } = await supabase
        .from('artworks')
        .update(mapToSnakeCase(updates))
        .in('id', ids)
        .in('status', [ArtworkStatus.AVAILABLE, ArtworkStatus.RESERVED]);

      if (artError) throw artError;

      return true;
    } catch (error) {
      console.error('Auction Registration Error:', error);
      // Revert local state if possible (optional, but good for UX)
      return false;
    }
  };

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
      returnDate: new Date().toISOString(), artworkSnapshot: art, returnType: type, status: 'Open',
      referenceNumber, proofImage, remarks
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
    logActivity(id, type === 'Artist Reclaim' ? 'Artist Reclaim' : 'Sent for Retouch', reason, updatedArt);
    try {
      if (IS_DEMO_MODE) return true;
      const artworkUpdates: any = { status };
      if (type === 'Artist Reclaim') {
        artworkUpdates.deletedAt = new Date().toISOString();
      }
      artworkUpdates.updatedAt = new Date().toISOString();
      const updatedArtworkOk = await syncArtwork(id, artworkUpdates, [ArtworkStatus.AVAILABLE, ArtworkStatus.EXCLUSIVE_VIEW_ONLY]);
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
      artworkSnapshot: art,
      returnType: type,
      status: 'Open',
      referenceNumber,
      proofImage,
      remarks
    }));

    // Optimistic Update
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
    
    if (type === 'Artist Reclaim') {
      // Handled by the bulk update above for allArtworksIncludingDeleted
    }

    validArtworks.forEach(art => logActivity(art.id, type === 'Artist Reclaim' ? 'Artist Reclaim' : 'Sent for Retouch', reason, updatedArtworks.find(ua => ua.id === art.id)!));

    if (IS_DEMO_MODE) return true;

    try {
      // 1. Batch Update Artworks
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

      // 2. Batch Insert Return Records
      const { error: returnError } = await supabase
        .from('returns')
        .insert(records.map(mapToSnakeCase));

      if (returnError) throw returnError;

      return true;
    } catch (error: any) {
      console.error('Batch Return Error:', error);
      alert(`Batch Return Failed: ${error.message}`);
      
      // Revert local state
      setReturnRecords(prev => prev.filter(r => !records.some(nr => nr.id === r.id)));
      setArtworks(prev => prev.map(a => {
        const original = validArtworks.find(oa => oa.id === a.id);
        return original ? original : a;
      }));
      return false;
    }
  };

  const handleSendToFramer = async (id: string, details: string, attachmentUrl?: string | string[]) => {
    const art = artworks.find(a => a.id === id);
    if (!art) return;
    const record: FramerRecord = {
      id: generateId(), artworkId: id, damageDetails: details, sentDate: new Date().toISOString(),
      artworkSnapshot: art, status: 'Open', attachmentUrl
    };
    setFramerRecords(prev => [...prev, record]);
    const updatedArt = { ...art, status: ArtworkStatus.FOR_FRAMING };
    setArtworks(prev => prev.map(a => a.id === id ? updatedArt : a));
    logActivity(id, 'Sent to Framer', details, updatedArt);
    if (IS_DEMO_MODE) return true;

    const updatedArtworkOk = await syncArtwork(id, { status: ArtworkStatus.FOR_FRAMING }, [
      ArtworkStatus.AVAILABLE,
      ArtworkStatus.EXCLUSIVE_VIEW_ONLY,
      ArtworkStatus.RESERVED,
      ArtworkStatus.FOR_SALE_APPROVAL
    ]);
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

  const handleBulkSendToFramer = async (ids: string[], details: string, attachmentUrl?: string | string[]) => {
    const validArtworks = artworks.filter(a => ids.includes(a.id));
    if (validArtworks.length === 0) return false;

    const timestamp = new Date().toISOString();
    const records: FramerRecord[] = validArtworks.map(art => ({
      id: generateId(),
      artworkId: art.id,
      damageDetails: details,
      sentDate: timestamp,
      artworkSnapshot: art,
      status: 'Open',
      attachmentUrl
    }));

    // Optimistic Update
    setFramerRecords(prev => [...records, ...prev]);
    const targetIds = ids.map(String);
    setArtworks(prev => prev.map(a => targetIds.includes(String(a.id)) ? { ...a, status: ArtworkStatus.FOR_FRAMING } : a));
    setAllArtworksIncludingDeleted(prev => prev.map(a => targetIds.includes(String(a.id)) ? { ...a, status: ArtworkStatus.FOR_FRAMING } : a));
    
    // Log Activity for each
    validArtworks.forEach(art => logActivity(art.id, 'Sent to Framer', details, { ...art, status: ArtworkStatus.FOR_FRAMING }));

    if (IS_DEMO_MODE) return true;

    try {
      // 1. Batch Update Artworks Status
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

      // 2. Batch Insert Framer Records
      const { error: framerError } = await supabase
        .from('framer_records')
        .insert(records.map(mapToSnakeCase));

      if (framerError) throw framerError;

      return true;
    } catch (error: any) {
      console.error('Batch Framing Error:', error);
      alert(`Batch Framing Failed: ${error.message}`);
      
      // Revert local state
      setFramerRecords(prev => prev.filter(r => !records.some(nr => nr.id === r.id)));
      setArtworks(prev => prev.map(a => {
        const original = validArtworks.find(oa => oa.id === a.id);
        return original ? original : a;
      }));
      return false;
    }
  };

  const handleReturnFromFramer = async (recordId: string, branch: Branch, resolvedAt?: string) => {
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

    setArtworks(prev =>
      prev.map(a => String(a.id) === String(artworkId) ? { 
        ...a, 
        status: ArtworkStatus.AVAILABLE, 
        currentBranch: branch,
        remarks: '',
        reservedForEventId: undefined,
        reservedForEventName: undefined,
        reservationExpiry: undefined
      } : a)
    );
    setAllArtworksIncludingDeleted(prev =>
      prev.map(a => String(a.id) === String(artworkId) ? { 
        ...a, 
        status: ArtworkStatus.AVAILABLE, 
        currentBranch: branch,
        remarks: '',
        reservedForEventId: undefined,
        reservedForEventName: undefined,
        reservationExpiry: undefined
      } : a)
    );
    logActivity(artworkId, 'Returned from Framer', `Returned to ${branch}`, { 
      status: ArtworkStatus.AVAILABLE, 
      currentBranch: branch,
      remarks: '',
      reservedForEventId: undefined,
      reservedForEventName: undefined
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

    const artworkOk = await syncArtwork(
      artworkId,
      { status: ArtworkStatus.AVAILABLE, currentBranch: branch },
      ArtworkStatus.FOR_FRAMING
    );

    if (!artworkOk) {
      if (!isVirtual && rec) {
        setFramerRecords(prev => prev.map(r => r.id === recordId ? rec! : r));
      }
      setArtworks(prev => prev.map(a => a.id === artworkId ? art : a));
      return false;
    }

    return true;
  };

  const handleReturnToGallery = async (recordId: string, branch: Branch, resolvedAt?: string) => {
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

    const art = findArtwork(artworkId);
    if (!art) {
      alert(`DIAGNOSTIC FAILURE: Artwork [${artworkId}] not found in inventory state. Please refresh.`);
      return false;
    }

    const finalDate = resolvedAt || new Date().toISOString();

    // 1. Update Return Record (if not formal)
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

    // 2. Update Artwork Status & Branch (Both Lists)
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
    
    logActivity(artworkId, 'Returned to Gallery', `Returned to ${branch}`, { status: ArtworkStatus.AVAILABLE, currentBranch: branch }, finalDate);

    if (IS_DEMO_MODE) return true;

    // Use relaxed status guard: can return from FOR_RETOUCH or RETURNED
    // We pass null for deleted_at to explicitly clear it in the DB
    const artworkOk = await syncArtwork(artworkId, { status: ArtworkStatus.AVAILABLE, currentBranch: branch, deletedAt: null } as any, [ArtworkStatus.FOR_RETOUCH, ArtworkStatus.RETURNED]);
    
    if (!artworkOk) {
      alert("Inventory Sync Failure: The artwork status in the database doesn't match 'For Retouch' or 'Returned'. It might have been updated by another user.");
      setArtworks(prev => prev.map(a => String(a.id) === String(artworkId) ? prevArtState : a));
      setAllArtworksIncludingDeleted(prev => prev.map(a => String(a.id) === String(artworkId) ? prevArtState : a));
      return false;
    }

    return true;
  };

  return {
    handleAddArtwork,
    handleBulkAddArtworks: async (
      newArtworks: Partial<Artwork>[],
      filename: string = 'Imported',
      importDate: string = new Date().toISOString(),
      failedItems: ImportFailedItem[] = []
    ) => {
      setImportStatus({
        isVisible: true,
        title: 'Importing Artworks',
        message: `Processing ${newArtworks.length} items...`,
        progress: { current: 0, total: newArtworks.length }
      });

      const defaultBranch = '' as Branch;
      const fullArtworks = newArtworks.map(art => buildNewArtwork(art, defaultBranch));
      const duplicateCodeFailures: ImportFailedItem[] = [];

      const existingCodes = new Set(
        artworks
          .map(a => String(a.code || '').trim().toLowerCase())
          .filter(Boolean)
      );
      const seenImportCodes = new Set<string>();

      const artworksToImport = fullArtworks.filter((art, index) => {
        const normalizedCode = String(art.code || '').trim().toLowerCase();
        if (!normalizedCode) return true;

        if (existingCodes.has(normalizedCode) || seenImportCodes.has(normalizedCode)) {
          duplicateCodeFailures.push({
            rowNumber: index + 1,
            reason: `Skipped duplicate artwork code: ${art.code}`,
            data: art
          });
          return false;
        }

        seenImportCodes.add(normalizedCode);
        return true;
      });

      const combinedFailedItems = [...failedItems, ...duplicateCodeFailures];

      // Update local state (optimistic)
      setArtworks(prev => [...prev, ...artworksToImport]);

      // Create Import Record
      const importRecord: ImportRecord = {
        id: generateId(),
        filename,
        importedBy: currentUser?.name || 'Unknown',
        timestamp: importDate,
        recordCount: artworksToImport.length,
        status: combinedFailedItems.length > 0 ? 'Partial' : 'Success',
        importedIds: artworksToImport.map(a => a.id),
        failedItems: combinedFailedItems
      };

      setImportLogs(prev => [importRecord, ...prev]);
      // Log one global activity for the import
      logActivity('SYS', 'Import', `Imported ${fullArtworks.length} items from ${filename}`, { title: filename } as any);

      if (IS_DEMO_MODE) {
        setImportStatus({ isVisible: false });
        return;
      }

      try {
        // Create Initial Import Record in DB with 'Processing' status
        const supabaseImportRecord = {
          id: importRecord.id,
          filename: importRecord.filename,
          imported_by: importRecord.importedBy,
          imported_at: importRecord.timestamp,
          total_items: artworksToImport.length,
          success_count: 0,
          fail_count: combinedFailedItems.length,
          status: artworksToImport.length > 0 ? 'Processing' : (combinedFailedItems.length > 0 ? 'Partial' : 'Success'),
          details: importRecord.details
        };

        if (!IS_DEMO_MODE) {
          const { error: initialError } = await supabase.from('import_records').insert(mapToSnakeCase(supabaseImportRecord));
          if (initialError) throw initialError;
        }

        if (artworksToImport.length === 0) {
          pushNotification('Import Complete', 'No new artworks were added. All detected rows were duplicates or invalid.', 'system');
          return;
        }

        // Supabase Bulk Insert Artworks
        const CHUNK_SIZE = 50; // Smaller chunks for more frequent updates
        let totalSuccessfullyImported = 0;
        let finalStatus = 'Processing';

        for (let i = 0; i < artworksToImport.length; i += CHUNK_SIZE) {
          const chunk = artworksToImport.slice(i, i + CHUNK_SIZE);

          if (!IS_DEMO_MODE) {
            try {
              // Upload Base64 images to Storage in parallel for the chunk
              await Promise.all(chunk.map(async (art) => {
                if (art.imageUrl?.startsWith('data:image/')) {
                  art.imageUrl = await uploadBase64ToStorage(art.imageUrl, 'images', 'artworks') || art.imageUrl;
                }
              }));

              const { error } = await supabase.from('artworks').insert(chunk.map(mapToSnakeCase));
              if (error) throw error;
              
              totalSuccessfullyImported += chunk.length;

              // Update Import Record Progress in DB
              const importedCount = Math.min(i + CHUNK_SIZE, artworksToImport.length);
              finalStatus = importedCount >= artworksToImport.length
                ? (combinedFailedItems.length > 0 ? 'Partial' : 'Success')
                : 'Processing';

              await supabase.from('import_records')
                .update({
                  success_count: importedCount,
                  status: finalStatus
                })
                .eq('id', importRecord.id);
            } catch (chunkError) {
              console.warn(`Chunk import error at index ${i}, attempting item-by-item fallback:`, chunkError);
              
              let chunkSuccessCount = 0;
              const newFailedItems: ImportFailedItem[] = [];
              
              // Fallback: Try inserting one by one to save the valid ones in this chunk
              for (let j = 0; j < chunk.length; j++) {
                const singleArt = chunk[j];
                try {
                  const { error: singleError } = await supabase.from('artworks').insert([mapToSnakeCase(singleArt)]);
                  if (singleError) throw singleError;
                  chunkSuccessCount++;
                } catch (singleErr: any) {
                  newFailedItems.push({
                    rowNumber: i + j + 1,
                    reason: singleErr?.message || 'Database rejected this item.',
                    data: singleArt as any
                  });
                  // Remove this single failed item from the UI
                  setArtworks(prev => prev.filter(a => a.id !== singleArt.id));
                }
              }
              
              totalSuccessfullyImported += chunkSuccessCount;
              combinedFailedItems.push(...newFailedItems);
               
              const importedCount = Math.min(i + CHUNK_SIZE, artworksToImport.length);
              finalStatus = importedCount >= artworksToImport.length
                ? (combinedFailedItems.length > 0 ? 'Partial' : 'Success')
                : 'Processing';

              await supabase.from('import_records')
                .update({
                  success_count: totalSuccessfullyImported,
                  fail_count: combinedFailedItems.length,
                  status: finalStatus,
                  details: newFailedItems.length > 0 ? `Item-by-item fallback recovered ${chunkSuccessCount} items. ${newFailedItems.length} failed permanently.` : null
                })
                .eq('id', importRecord.id);
            }
          }

          setImportStatus({
            isVisible: true,
            title: 'Importing Artworks',
            message: `Synchronizing collection... (${Math.min(i + CHUNK_SIZE, artworksToImport.length)} / ${artworksToImport.length})`,
            progress: { current: Math.min(i + CHUNK_SIZE, artworksToImport.length), total: artworksToImport.length }
          });
        }

        if (duplicateCodeFailures.length > 0) {
          pushNotification('Import Partial', `Skipped ${duplicateCodeFailures.length} duplicate artwork code(s).`, 'system');
        }

      } catch (error) {
        console.error('Bulk Import Supabase Error:', error);
        if (!IS_DEMO_MODE) {
          await supabase.from('import_records').update({ status: 'Failed' }).eq('id', importRecord.id);
        }
        
        // Rollback EVERYTHING if it failed before the loop
        const allPendingIds = artworksToImport.map(a => a.id);
        setArtworks(prev => prev.filter(a => !allPendingIds.includes(a.id)));

        pushNotification('Import Failed', 'Failed to sync imported items to the cloud database.', 'system');
      } finally {
        setTimeout(() => setImportStatus({ isVisible: false }), 1500); // Leave it visible for a moment
      }
    },
    handleUpdateArtwork, handleBulkUpdateArtworks: async (ids: string[], u: any) => {
      setArtworks(prev => prev.map(a => ids.includes(a.id) ? { ...a, ...u } : a));
      if (IS_DEMO_MODE) return;
      await supabase.from('artworks').update(mapToSnakeCase(u)).in('id', ids);
    },
    handleDeleteArtwork, handleBulkDelete,
    handleReserveArtwork, handleBulkReserve,
    handleCancelReservation, handleBulkCancelReservation,
    handleAddToAuction,
    handleSale,
    handleBulkSale,
    handleCancelSale,
    handleDeleteSaleRecord,
    handleApproveSale,
    handleDeclineSale,
    handleEditPayment,
    handleApprovePaymentEdit,
    handleDeclinePaymentEdit,
    handleAddInstallment,
    handleDeliver,
    handleConfirmAudit,
    handleReturnArtwork, handleBulkReturnArtwork, handleReturnToGallery,
    handleSendToFramer, handleBulkSendToFramer, handleReturnFromFramer,
    handleDeleteFramerRecord: async (id: string) => {
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
    },
    handleUpdateReturnRecord: async (id: string, u: Partial<ReturnRecord>) => {
      setReturnRecords(prev => prev.map(r => r.id === id ? { ...r, ...u } : r));
      if (IS_DEMO_MODE) return;
      await supabase.from('returns').update(mapToSnakeCase(u)).eq('id', id);
    },
    handleBulkDeleteReturnRecords: async (ids: string[]) => {
      const virtualIds = ids.filter(id => id.startsWith('virtual-'));
      const realIds = ids.filter(id => !id.startsWith('virtual-'));

      // Handle Virtual Records (System Detected) - Hard Delete the Artwork
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

      // Handle Formal Return Records
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
    }
  };
};
