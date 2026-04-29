import { useCallback, useEffect, useState } from 'react';
import {
  ActivityLog,
  AppNotification,
  Artwork,
  ChatMessage,
  Conversation,
  ExhibitionEvent,
  FramerRecord,
  ImportRecord,
  InventoryAudit,
  ReturnRecord,
  SaleRecord,
  TransferRecord,
  TransferRequest,
  UserAccount
} from '../types';
import { IS_DEMO_MODE } from '../constants';
import {
  compactArtworkForCache,
  hydrateCachedArtwork,
  readCache,
  writeCache
} from './dataSync/shared';
import { useAccountsSync } from './dataSync/useAccountsSync';
import { useArtworkSync } from './dataSync/useArtworkSync';
import { useBusinessSync } from './dataSync/useBusinessSync';
import { useBranchAndOperationsSync } from './dataSync/useBranchAndOperationsSync';
import { useMessagingSync } from './dataSync/useMessagingSync';

interface UseDataSyncProps {
  activeTab: string;
  currentUser: UserAccount | null;
  selectedArtworkId?: string | null;
}

export const useDataSync = ({ activeTab, currentUser, selectedArtworkId }: UseDataSyncProps) => {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [allArtworksIncludingDeleted, setAllArtworksIncludingDeleted] = useState<Artwork[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [branchAddresses, setBranchAddresses] = useState<Record<string, string>>({});
  const [branchCategories, setBranchCategories] = useState<Record<string, string>>({});
  const [branchLogos, setBranchLogos] = useState<Record<string, string>>({});
  const [exclusiveBranches, setExclusiveBranches] = useState<string[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [isLoadingArtworks, setIsLoadingArtworks] = useState(!IS_DEMO_MODE);
  const [isLoadingSales, setIsLoadingSales] = useState(!IS_DEMO_MODE);
  const [isLoadingEvents, setIsLoadingEvents] = useState(!IS_DEMO_MODE);
  const [isLoadingUsers, setIsLoadingUsers] = useState(!IS_DEMO_MODE);
  const [transferRequests, setTransferRequests] = useState<TransferRequest[]>([]);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [events, setEvents] = useState<ExhibitionEvent[]>([]);
  const [audits, setAudits] = useState<InventoryAudit[]>([]);
  const [importLogs, setImportLogs] = useState<ImportRecord[]>([]);
  const [preventDuplicateImports, setPreventDuplicateImports] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [returnRecords, setReturnRecords] = useState<ReturnRecord[]>([]);
  const [framerRecords, setFramerRecords] = useState<FramerRecord[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const shouldLoadFullArtworks = ['inventory', 'operations', 'master-view', 'galleria', 'analytics', 'sales-history', 'sales-approval', 'snapshots', 'audit-logs', 'import-history', 'framer', 'returned'].includes(activeTab) || !!selectedArtworkId;
  const shouldLoadFullBusinessData = ['inventory', 'operations', 'master-view', 'galleria', 'analytics', 'sales-history', 'sales-approval', 'snapshots', 'framer', 'returned'].includes(activeTab) || !!selectedArtworkId;
  const shouldSyncOperationalData = ['operations', 'audit-logs', 'import-history', 'analytics', 'snapshots', 'master-view', 'framer', 'returned'].includes(activeTab);
  const shouldSyncMessaging = activeTab === 'chat';

  const handleSyncError = useCallback((error: any, context: string) => {
    if (!currentUser && error?.status === 401) return;
    console.error(`Sync Error (${context}):`, error.message);
    setSyncError(`Sync Error (${context}): ${error.message}`);
  }, [currentUser]);

  useEffect(() => {
    if (IS_DEMO_MODE || !currentUser?.id) return;

    const cachedArtworksRaw = readCache<Partial<Artwork>[]>(currentUser.id, 'artworks');
    const cachedAllArtworksRaw = readCache<Partial<Artwork>[]>(currentUser.id, 'all-artworks');
    const cachedSales = readCache<SaleRecord[]>(currentUser.id, 'sales');
    const cachedEvents = readCache<ExhibitionEvent[]>(currentUser.id, 'events');
    const cachedAccounts = readCache<UserAccount[]>(currentUser.id, 'accounts');
    const cachedBranches = readCache<{
      branches: string[];
      branchAddresses: Record<string, string>;
      branchCategories: Record<string, string>;
      branchLogos: Record<string, string>;
      exclusiveBranches: string[];
    }>(currentUser.id, 'branches');
    const cachedFramerRecords = readCache<FramerRecord[]>(currentUser.id, 'framer-records');
    const cachedReturnRecords = readCache<ReturnRecord[]>(currentUser.id, 'return-records');

    const cachedAllArtworks = (cachedAllArtworksRaw || []).map(hydrateCachedArtwork).filter(Boolean) as Artwork[];
    const cachedArtworks = (cachedArtworksRaw || []).map(hydrateCachedArtwork).filter(Boolean) as Artwork[];

    if (cachedAllArtworks.length) setAllArtworksIncludingDeleted(cachedAllArtworks);
    if (cachedArtworks.length) setArtworks(cachedArtworks);
    if (cachedSales?.length) setSales(cachedSales);
    if (cachedEvents?.length) setEvents(cachedEvents);
    if (cachedAccounts?.length) setAccounts(cachedAccounts);
    if (cachedBranches) {
      setBranches(cachedBranches.branches || []);
      setBranchAddresses(cachedBranches.branchAddresses || {});
      setBranchCategories(cachedBranches.branchCategories || {});
      setBranchLogos(cachedBranches.branchLogos || {});
      setExclusiveBranches(cachedBranches.exclusiveBranches || []);
    }
    if (cachedFramerRecords?.length) setFramerRecords(cachedFramerRecords);
    if (cachedReturnRecords?.length) setReturnRecords(cachedReturnRecords);
  }, [currentUser?.id]);

  useEffect(() => {
    if (IS_DEMO_MODE || !currentUser?.id || artworks.length === 0) return;
    writeCache(currentUser.id, 'artworks', artworks.map(compactArtworkForCache));
  }, [currentUser?.id, artworks]);

  useEffect(() => {
    if (IS_DEMO_MODE || !currentUser?.id || allArtworksIncludingDeleted.length === 0) return;
    writeCache(currentUser.id, 'all-artworks', allArtworksIncludingDeleted.map(compactArtworkForCache));
  }, [currentUser?.id, allArtworksIncludingDeleted]);

  useEffect(() => {
    if (IS_DEMO_MODE || !currentUser?.id || sales.length === 0) return;
    writeCache(currentUser.id, 'sales', sales);
  }, [currentUser?.id, sales]);

  useEffect(() => {
    if (IS_DEMO_MODE || !currentUser?.id || events.length === 0) return;
    writeCache(currentUser.id, 'events', events);
  }, [currentUser?.id, events]);

  useEffect(() => {
    if (IS_DEMO_MODE || !currentUser?.id || accounts.length === 0) return;
    writeCache(currentUser.id, 'accounts', accounts);
  }, [currentUser?.id, accounts]);

  useEffect(() => {
    if (IS_DEMO_MODE || !currentUser?.id || branches.length === 0) return;
    writeCache(currentUser.id, 'branches', {
      branches,
      branchAddresses,
      branchCategories,
      branchLogos,
      exclusiveBranches
    });
  }, [currentUser?.id, branches, branchAddresses, branchCategories, branchLogos, exclusiveBranches]);

  useEffect(() => {
    if (IS_DEMO_MODE || !currentUser?.id || framerRecords.length === 0) return;
    writeCache(currentUser.id, 'framer-records', framerRecords);
  }, [currentUser?.id, framerRecords]);

  useEffect(() => {
    if (IS_DEMO_MODE || !currentUser?.id || returnRecords.length === 0) return;
    writeCache(currentUser.id, 'return-records', returnRecords);
  }, [currentUser?.id, returnRecords]);

  useAccountsSync({
    currentUser,
    activeTab,
    accounts,
    setAccounts,
    setIsLoadingUsers
  });

  useArtworkSync({
    currentUser,
    shouldLoadFullArtworks,
    setArtworks,
    setAllArtworksIncludingDeleted,
    setIsLoadingArtworks,
    handleSyncError
  });

  useBusinessSync({
    currentUser,
    shouldLoadFullBusinessData,
    setSales,
    setEvents,
    setIsLoadingSales,
    setIsLoadingEvents
  });

  useBranchAndOperationsSync({
    currentUser,
    shouldSyncOperationalData,
    setBranches,
    setBranchAddresses,
    setBranchCategories,
    setBranchLogos,
    setExclusiveBranches,
    setLogs,
    setAudits,
    setImportLogs,
    setReturnRecords,
    setFramerRecords,
    setTransfers
  });

  useMessagingSync({
    currentUser,
    shouldSyncMessaging,
    conversations,
    setNotifications,
    setConversations,
    setMessages
  });

  useEffect(() => {
    if (!IS_DEMO_MODE) return;
    import('../data').then(data => {
      setArtworks(data.INITIAL_ARTWORKS);
      setAccounts(data.INITIAL_ACCOUNTS);
      setEvents(data.INITIAL_EVENTS);
      setSales(data.INITIAL_SALES);
      setLogs(data.INITIAL_LOGS);
      setIsLoadingArtworks(false);
      setIsLoadingUsers(false);
      setIsLoadingEvents(false);
      setIsLoadingSales(false);
    });
  }, []);

  return {
    artworks, allArtworksIncludingDeleted, sales, branches, branchAddresses, branchCategories, branchLogos,
    exclusiveBranches, syncError, logs, accounts, isLoadingArtworks, isLoadingSales, isLoadingEvents, isLoadingUsers,
    transferRequests, transfers, events, audits, importLogs, preventDuplicateImports, notifications,
    returnRecords, framerRecords, conversations, messages, setArtworks, setAllArtworksIncludingDeleted, setSales,
    setBranches, setBranchAddresses, setBranchCategories, setBranchLogos, setExclusiveBranches,
    setEvents, setAccounts, setLogs, setSyncError, setAudits, setIsLoadingArtworks, setIsLoadingSales, setIsLoadingEvents,
    setIsLoadingUsers, setTransferRequests, setTransfers, setImportLogs, setPreventDuplicateImports,
    setNotifications, setReturnRecords, setFramerRecords, setConversations, setMessages
  };
};
