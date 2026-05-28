import { supabase } from '../../supabase';
import { mapToSnakeCase } from '../../utils/supabaseUtils';
import { Artwork, ArtworkStatus, Branch, ImportRecord, ImportFailedItem, UserRole, SaleStatus } from '../../types';
import { IS_DEMO_MODE } from '../../constants';
import { buildNewArtwork, getArtworkClassification } from '../../services/inventoryService';
import { buildMonthlyAudit } from '../../services/auditService';
import { uploadBase64ToStorage } from '../../services/supabaseStorageService';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { useNotifications } from '../useNotifications';
import { useActivityLogs } from '../useActivityLogs';
import { syncArtwork } from './shared';

const generateId = () => window.crypto.randomUUID();

export const useArtworkCrud = () => {
  const {
    artworks, setArtworks,
    allArtworksIncludingDeleted, setAllArtworksIncludingDeleted,
    sales, setSales,
    exclusiveBranches,
    setAudits,
    setImportLogs
  } = useData();

  const { currentUser } = useAuth();
  const userRole = currentUser?.role ?? UserRole.ADMIN;
  const { setImportStatus } = useUI();
  const { pushNotification } = useNotifications();
  const { logActivity } = useActivityLogs();

  const handleCreateArtwork = async (art: Partial<Artwork>) => {
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
      // Recalculate classification if dimensions changed
      if (updates.dimensions) {
        updates.type = getArtworkClassification(updates.dimensions);
      }

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
          const saleUpdate: any = {
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
      await syncArtwork({
        id,
        updates,
        setArtworks,
        setAllArtworksIncludingDeleted,
        pushNotification
      });
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

  const handleBulkImport = async (
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

    const getExistingDate = (art: Artwork): Date => {
      if (art.importPeriod) {
        const parts = art.importPeriod.split('-');
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(y) && !isNaN(m)) {
          return new Date(y, m - 1, 1);
        }
      }
      if (art.createdAt) {
        const d = new Date(art.createdAt);
        if (!isNaN(d.getTime())) return d;
      }
      return new Date(0);
    };

    const getNewDate = (dateStr: string): Date => {
      const d = new Date(dateStr);
      return !isNaN(d.getTime()) ? d : new Date();
    };

    const defaultBranch = '' as Branch;
    const newPeriod = importDate.substring(0, 7);
    const fullArtworks = newArtworks.map(art => buildNewArtwork({
      ...art,
      importPeriod: newPeriod
    }, defaultBranch));

    const duplicateCodeFailures: ImportFailedItem[] = [];
    const artworksToUpdateBranch: {
      id: string;
      code: string;
      title: string;
      newBranch: string;
      newImportPeriod: string;
    }[] = [];

    const existingCodes = new Set(
      artworks
        .map(a => String(a.code || '').trim().toLowerCase())
        .filter(Boolean)
    );
    const seenImportCodes = new Set<string>();
    const updatedIds: string[] = [];

    const artworksToImport = fullArtworks.filter((art, index) => {
      const normalizedCode = String(art.code || '').trim().toLowerCase();
      if (!normalizedCode) return true;

      // If we've already seen this code in this Excel file during this import pass
      if (seenImportCodes.has(normalizedCode)) {
        duplicateCodeFailures.push({
          rowNumber: (art as any).rowNumber || (index + 1),
          reason: `Skipped duplicate artwork code in same import: ${art.code}`,
          data: art
        });
        return false;
      }

      // If the code exists in the database
      if (existingCodes.has(normalizedCode)) {
        const existingArt = artworks.find(a => String(a.code || '').trim().toLowerCase() === normalizedCode);
        if (existingArt) {
          const existingDate = getExistingDate(existingArt);
          const incomingDate = getNewDate(importDate);

          if (incomingDate > existingDate) {
            artworksToUpdateBranch.push({
              id: existingArt.id,
              code: existingArt.code,
              title: existingArt.title,
              newBranch: art.currentBranch,
              newImportPeriod: newPeriod
            });
            updatedIds.push(existingArt.id);
          } else {
            duplicateCodeFailures.push({
              rowNumber: (art as any).rowNumber || (index + 1),
              reason: `Skipped duplicate artwork code: ${art.code} (Existing is newer or same date)`,
              data: art
            });
          }
        }
        seenImportCodes.add(normalizedCode);
        return false;
      }

      seenImportCodes.add(normalizedCode);
      return true;
    });

    const combinedFailedItems = [...failedItems, ...duplicateCodeFailures];

    // Update local state (optimistic)
    setArtworks(prev => {
      // 1. First, apply branch updates to existing artworks
      let updated = prev.map(a => {
        const update = artworksToUpdateBranch.find(u => u.id === a.id);
        if (update) {
          return {
            ...a,
            currentBranch: update.newBranch,
            importPeriod: update.newImportPeriod
          };
        }
        return a;
      });
      // 2. Add completely new artworks
      return [...updated, ...artworksToImport];
    });

    setAllArtworksIncludingDeleted(prev => {
      let updated = prev.map(a => {
        const update = artworksToUpdateBranch.find(u => u.id === a.id);
        if (update) {
          return {
            ...a,
            currentBranch: update.newBranch,
            importPeriod: update.newImportPeriod
          };
        }
        return a;
      });
      return [...updated, ...artworksToImport];
    });

    // Create Import Record
    const importRecord: ImportRecord = {
      id: generateId(),
      filename,
      importedBy: currentUser?.name || 'Unknown',
      timestamp: importDate,
      recordCount: artworksToImport.length + artworksToUpdateBranch.length,
      status: combinedFailedItems.length > 0 ? 'Partial' : 'Success',
      importedIds: artworksToImport.map(a => a.id),
      updatedIds,
      failedItems: combinedFailedItems
    };

    setImportLogs(prev => [importRecord, ...prev]);
    logActivity('SYS', 'Import', `Imported ${fullArtworks.length} items from ${filename}`, { title: filename } as any);

    const successfulIdsInThisSession = new Set<string>();
    const CHUNK_SIZE = 50; 
    let totalSuccessfullyImported = 0;
    let finalStatus = 'Processing';

    const syncImportLogState = (
      updates: Partial<ImportRecord> & { importedIds?: string[]; failedItems?: ImportFailedItem[] }
    ) => {
      setImportLogs(prev => prev.map(log => (
        log.id === importRecord.id ? { ...log, ...updates } : log
      )));
    };

    if (IS_DEMO_MODE) {
      setImportStatus({ isVisible: false });
      return;
    }

    try {
      const supabaseImportRecord = {
        id: importRecord.id,
        filename: importRecord.filename,
        imported_by: importRecord.importedBy,
        imported_at: importRecord.timestamp,
        total_items: artworksToImport.length + artworksToUpdateBranch.length,
        success_count: 0,
        fail_count: combinedFailedItems.length,
        status: artworksToImport.length > 0 || artworksToUpdateBranch.length > 0 ? 'Processing' : (combinedFailedItems.length > 0 ? 'Partial' : 'Success'),
        details: combinedFailedItems.length > 0
          ? `Skipped ${combinedFailedItems.length} duplicate or invalid item(s).`
          : importRecord.details,
        imported_ids: [],
        updated_ids: updatedIds,
        failed_items: combinedFailedItems
      };

      if (!IS_DEMO_MODE) {
        const { error: initialError } = await supabase.from('import_records').insert(mapToSnakeCase(supabaseImportRecord));
        if (initialError) throw initialError;
      }

      // 1. Perform database updates for modified branches first
      if (artworksToUpdateBranch.length > 0) {
        await Promise.all(artworksToUpdateBranch.map(async (update) => {
          const { error: updateError } = await supabase.from('artworks')
            .update({
              current_branch: update.newBranch,
              import_period: update.newImportPeriod
            })
            .eq('id', update.id);
          if (updateError) {
            console.error(`Database update failed for artwork ${update.code}:`, updateError);
          } else {
            logActivity(update.id, 'Updated', `Branch location updated to "${update.newBranch}" via newer Excel import duplicate`, { title: update.title } as any);
          }
        }));
      }

      if (artworksToImport.length === 0) {
        // No new items to insert, but updates were completed!
        await supabase.from('import_records')
          .update({
            success_count: artworksToUpdateBranch.length,
            fail_count: combinedFailedItems.length,
            status: combinedFailedItems.length > 0 ? 'Partial' : 'Success',
            updated_ids: updatedIds,
            failed_items: combinedFailedItems
          })
          .eq('id', importRecord.id);

        syncImportLogState({
          successCount: artworksToUpdateBranch.length,
          failCount: combinedFailedItems.length,
          status: combinedFailedItems.length > 0 ? 'Partial' : 'Success',
          updatedIds,
          failedItems: combinedFailedItems
        });

        pushNotification(
          'Import Complete', 
          artworksToUpdateBranch.length > 0 
            ? `Updated branch location for ${artworksToUpdateBranch.length} existing artwork(s).` 
            : 'No artworks were added or updated.', 
          'system'
        );
        return;
      }

      for (let i = 0; i < artworksToImport.length; i += CHUNK_SIZE) {
        const chunk = artworksToImport.slice(i, i + CHUNK_SIZE);

        if (!IS_DEMO_MODE) {
          try {
            await Promise.all(chunk.map(async (art) => {
              if (art.imageUrl?.startsWith('data:image/')) {
                try {
                  const uploadedUrl = await uploadBase64ToStorage(art.imageUrl, 'images', 'artworks');
                  if (uploadedUrl) art.imageUrl = uploadedUrl;
                } catch (e) {
                  console.error('Storage Upload failed for item:', art.title, e);
                }
              }
            }));

            const chunkToInsert = chunk.map(art => {
              const { type, unmapped, rowNumber, ...rest } = art;
              return mapToSnakeCase(rest);
            });

            const { error: chunkError } = await supabase.from('artworks').insert(chunkToInsert);
            if (chunkError) throw chunkError;

            totalSuccessfullyImported += chunk.length;
            chunk.forEach(a => successfulIdsInThisSession.add(a.id));

            const importedCount = Math.min(i + CHUNK_SIZE, artworksToImport.length);
            finalStatus = importedCount >= artworksToImport.length
              ? (combinedFailedItems.length > 0 ? 'Partial' : 'Success')
              : 'Processing';
            const displayStatus = finalStatus === 'Processing'
              ? importRecord.status
              : finalStatus as ImportRecord['status'];

            await supabase.from('import_records')
              .update({
                success_count: totalSuccessfullyImported + artworksToUpdateBranch.length,
                fail_count: combinedFailedItems.length,
                status: finalStatus,
                imported_ids: Array.from(successfulIdsInThisSession),
                updated_ids: updatedIds,
                failed_items: combinedFailedItems
              })
              .eq('id', importRecord.id);

            syncImportLogState({
              successCount: totalSuccessfullyImported + artworksToUpdateBranch.length,
              failCount: combinedFailedItems.length,
              status: displayStatus,
              importedIds: Array.from(successfulIdsInThisSession),
              updatedIds,
              failedItems: combinedFailedItems
            });
          } catch (chunkError: any) {
            console.warn(`Chunk import error at index ${i}, attempting item-by-item fallback:`, chunkError);

            let chunkSuccessCount = 0;
            const newFailedItems: ImportFailedItem[] = [];

            for (let j = 0; j < chunk.length; j++) {
              const singleArt = chunk[j];
              try {
                const { type, unmapped, rowNumber, ...rest } = singleArt;
                const { error: singleError } = await supabase.from('artworks').insert([mapToSnakeCase(rest)]);
                if (singleError) throw singleError;
                chunkSuccessCount++;
                successfulIdsInThisSession.add(singleArt.id);
              } catch (singleErr: any) {
                const errorMsg = singleErr?.message || singleErr?.details || 'Database rejected this item.';
                newFailedItems.push({
                  rowNumber: (singleArt as any).rowNumber || (i + j + 1),
                  reason: `DB Error: ${errorMsg}`,
                  data: singleArt as any
                });
                setArtworks(prev => prev.filter(a => a.id !== singleArt.id));
              }
            }

            totalSuccessfullyImported += chunkSuccessCount;
            combinedFailedItems.push(...newFailedItems);

            const importedCount = Math.min(i + CHUNK_SIZE, artworksToImport.length);
            finalStatus = importedCount >= artworksToImport.length
              ? (combinedFailedItems.length > 0 ? 'Partial' : 'Success')
              : 'Processing';
            const displayStatus = finalStatus === 'Processing'
              ? importRecord.status
              : finalStatus as ImportRecord['status'];

            await supabase.from('import_records')
              .update({
                success_count: totalSuccessfullyImported + artworksToUpdateBranch.length,
                fail_count: combinedFailedItems.length,
                status: finalStatus,
                details: newFailedItems.length > 0 ? `Item-by-item fallback recovered ${chunkSuccessCount} items. ${newFailedItems.length} failed permanently.` : null,
                imported_ids: Array.from(successfulIdsInThisSession),
                updated_ids: updatedIds,
                failed_items: combinedFailedItems
              })
              .eq('id', importRecord.id);

            syncImportLogState({
              successCount: totalSuccessfullyImported + artworksToUpdateBranch.length,
              failCount: combinedFailedItems.length,
              status: displayStatus,
              details: newFailedItems.length > 0 ? `Item-by-item fallback recovered ${chunkSuccessCount} items. ${newFailedItems.length} failed permanently.` : undefined,
              importedIds: Array.from(successfulIdsInThisSession),
              updatedIds,
              failedItems: combinedFailedItems
            });
          }
        } else {
          totalSuccessfullyImported += chunk.length;
          chunk.forEach(a => successfulIdsInThisSession.add(a.id));
          syncImportLogState({
            successCount: totalSuccessfullyImported + artworksToUpdateBranch.length,
            importedIds: Array.from(successfulIdsInThisSession),
            updatedIds,
            failedItems: combinedFailedItems
          });
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

    } catch (error: any) {
      console.error('Bulk Import Critical Error:', error);
      if (!IS_DEMO_MODE) {
        await supabase.from('import_records').update({ 
          status: 'Failed',
          details: `Critical sync failure: ${error.message || 'Unknown error'}`,
          imported_ids: Array.from(successfulIdsInThisSession),
          updated_ids: updatedIds,
          failed_items: combinedFailedItems
        }).eq('id', importRecord.id);
      }

      syncImportLogState({
        status: 'Failed',
        details: `Critical sync failure: ${error.message || 'Unknown error'}`,
        importedIds: Array.from(successfulIdsInThisSession),
        updatedIds,
        failedItems: combinedFailedItems
      });

      const allPendingIds = artworksToImport.map(a => a.id);
      setArtworks(prev => prev.filter(a => {
          const isPendingItem = allPendingIds.includes(a.id);
          if (!isPendingItem) return true;
          return successfulIdsInThisSession.has(a.id);
      }));

      pushNotification('Import Failed', error.message || 'Failed to sync imported items to the database.', 'system');
    } finally {
      setTimeout(() => setImportStatus({ isVisible: false }), 1500);
    }
  };

  const handleBulkUpdateArtworks = async (ids: string[], u: any) => {
    const finalUpdates = { ...u };
    if (finalUpdates.dimensions) {
      finalUpdates.type = getArtworkClassification(finalUpdates.dimensions);
    }

    setArtworks(prev => prev.map(a => ids.includes(a.id) ? { ...a, ...finalUpdates } : a));
    if (IS_DEMO_MODE) return;
    const { type, ...updatesWithoutType } = finalUpdates;
    await supabase.from('artworks').update(mapToSnakeCase(updatesWithoutType)).in('id', ids);
  };

  const handleConfirmAudit = async () => {
    const newAudit = buildMonthlyAudit(artworks, [], userRole);
    setAudits(prev => [newAudit, ...prev]);
    if (IS_DEMO_MODE) return;
    await supabase.from('audits').insert(mapToSnakeCase(newAudit));
  };

  return {
    handleCreateArtwork,
    handleBulkImport,
    handleUpdateArtwork,
    handleBulkUpdateArtworks,
    handleDeleteArtwork,
    handleBulkDelete,
    handleConfirmAudit
  };
};
