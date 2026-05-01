import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Artwork,
  UserRole,
  ArtworkStatus
} from './types';
import { supabase } from './supabase';
import { getDefaultPermissions, IS_DEMO_MODE } from './constants';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MasterView = lazy(() => import('./pages/MasterView'));
const AccountManagement = lazy(() => import('./pages/AccountManagement'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const ImportHistoryPage = lazy(() => import('./pages/ImportHistoryPage'));
const TimeMachinePage = lazy(() => import('./pages/TimeMachinePage'));
const GalleryManagementPage = lazy(() => import('./pages/GalleryManagementPage'));
const SalesRecordPage = lazy(() => import('./pages/SalesRecordPage'));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'));
const ArtworkTransfer = lazy(() => import('./pages/ArtworkTransfer'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const SalesApprovalPage = lazy(() => import('./pages/SalesApprovalPage'));
const PaymentApprovalPage = lazy(() => import('./pages/PaymentApprovalPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
import ErrorBoundary from './components/ErrorBoundary';

import LoadingOverlay from './components/LoadingOverlay';
import ProfileModal from './components/ProfileModal';
import { mapToSnakeCase } from './utils/supabaseUtils';
import { useZoom } from './hooks/useZoom';
import { useAuth } from './contexts/AuthContext';
import { useData } from './contexts/DataContext';
import { useUI } from './contexts/UIContext';
import { useNotifications } from './hooks/useNotifications';
import { useActivityLogs } from './hooks/useActivityLogs';
import { useArtworkOperations } from './hooks/useArtworkOperations';
import { useTransferOperations } from './hooks/useTransferOperations';
import { useEventOperations } from './hooks/useEventOperations';
import { useAccountOperations } from './hooks/useAccountOperations';
import { useBranchOperations } from './hooks/useBranchOperations';
import { useChatOperations } from './hooks/useChatOperations';
import InitialSyncLoadingScreen from './components/InitialSyncLoadingScreen';


// Error Boundary is now in components/ErrorBoundary.tsx

const App: React.FC = () => {
  const {
    currentUser, setCurrentUser,
    justLoggedIn, setJustLoggedIn,
    handleLogin, handleLogout
  } = useAuth();

  const {
    activeTab, setActiveTab,
    showProfile, setShowProfile,
    isMobileMenuOpen, setIsMobileMenuOpen,
    historyStack, setHistoryStack,
    selectedArtworkId, setSelectedArtworkId,
    operationsView, setOperationsView,
    importStatus, setImportStatus,
    targetSaleId, setTargetSaleId
  } = useUI();

  const {
    artworks, setArtworks,
    allArtworksIncludingDeleted,
    sales, setSales,
    branches,
    branchAddresses,
    branchCategories,
    branchLogos,
    exclusiveBranches,
    syncError, setSyncError,
    logs,
    accounts,
    isLoadingUsers,
    transferRequests,
    transfers,
    events,
    audits,
    importLogs, setImportLogs,
    preventDuplicateImports, setPreventDuplicateImports,
    notifications, setNotifications,
    returnRecords,
    framerRecords,
    isLoadingEvents,
    isLoadingArtworks,
    isLoadingSales,
    conversations,
    messages
  } = useData();

  const { zoomLevel, setZoomLevel } = useZoom();
  const [isAppReady, setIsAppReady] = useState(false);

  // Operation Hooks
  const { markNotificationsAsRead } = useNotifications();
  const { handleDeleteLogs } = useActivityLogs();
  const {
    handleAddArtwork, handleBulkAddArtworks, handleUpdateArtwork, handleBulkUpdateArtworks,
    handleDeleteArtwork, handleBulkDelete, handleReserveArtwork, handleBulkReserve,
    handleCancelReservation, handleBulkCancelReservation, handleCancelSale, handleBulkSale,
    handleAddToAuction, handleReturnArtwork, handleBulkReturnArtwork,
      handleConfirmAudit, handleReturnToGallery, handleSendToFramer, handleBulkSendToFramer,
      handleReturnFromFramer, handleDeleteFramerRecord, handleUpdateReturnRecord, handleBulkDeleteReturnRecords,
      handleSale, handleDeliver, handleApproveSale, handleDeclineSale, handleAddInstallment, handleDeleteSaleRecord,
      handleEditPayment, handleApprovePaymentEdit, handleDeclinePaymentEdit
    } = useArtworkOperations();
  const {
    handleCreateTransferRequest, handleAcceptTransfer, handleDeclineTransfer,
    handleHoldTransfer, handleDeleteTransfer
  } = useTransferOperations();
  const { handleAddEvent, handleUpdateEvent, handleDeleteEvent } = useEventOperations();
  const { handleAddAccount, handleUpdateAccountStatus, handleUpdateAccount, handleBulkDeleteAccounts, handleBulkUpdateAccountStatus } = useAccountOperations();
  const { handleAddBranch, handleUpdateBranch, handleDeleteBranch, handleUpdateBranchAddress } = useBranchOperations();
    const { handleSendMessage, handleStartConversation, handleMarkRead, handleDeleteConversation } = useChatOperations();
  
    const handleDeclineSaleWithMessaging = async (saleId: string, reason?: string, requestedFiles?: string[]) => {
      await handleDeclineSale(saleId, reason, requestedFiles);
      
      if (!reason || !currentUser) return;
  
      const sale = sales.find(s => s.id === saleId);
      if (!sale) return;
  
      // Find the agent - use agentId if available, fallback to name
      const agent = accounts.find(a => a.id === sale.agentId) || 
                    accounts.find(a => a.name === sale.agentName && a.role !== UserRole.ADMIN);
      
      if (!agent) return;
  
      // Find existing 1-on-1 conversation or start new one
      let conversationId = conversations.find(c => 
        c.participantIds.length === 2 && 
        c.participantIds.includes(currentUser.id) && 
        c.participantIds.includes(agent.id)
      )?.id;
  
      if (!conversationId) {
        conversationId = await handleStartConversation(
          [currentUser.id, agent.id],
          { [currentUser.id]: currentUser.name || 'Admin', [agent.id]: agent.name }
        );
      }
  
      if (conversationId) {
        const artwork = artworks.find(a => a.id === sale.artworkId);
        const artTitle = artwork?.title || sale.artworkSnapshot?.title || 'Unknown Artwork';
        let messageText = `🚫 SALE DECLINED\nArtwork: ${artTitle}\nClient: ${sale.clientName}\nReason: ${reason}`;
        
        if (requestedFiles && requestedFiles.length > 0) {
          const fileLabels = requestedFiles.map(f => {
            if (f === 'itdr') return 'IT/DR';
            if (f === 'rsa') return 'RSA/AR';
            if (f === 'orcr') return 'OR/CR';
            return f;
          }).join(', ');
          messageText += `\n\n♻️ RE-UPLOAD REQUESTED: ${fileLabels}`;
        }
        
        await handleSendMessage(conversationId, messageText, currentUser);
      }
    };

  // History Stack Effect
  useEffect(() => {
    if (currentUser) {
      const updatedUser = accounts.find(a => a.id === currentUser.id);
      if (updatedUser && JSON.stringify(updatedUser) !== JSON.stringify(currentUser)) {
        setCurrentUser(updatedUser);
      }
    }
  }, [accounts, currentUser, setCurrentUser]);

  // Data Migration for IT Tags (runs once per session)
  const hasMigratedRef = React.useRef(false);
  useEffect(() => {
    if (hasMigratedRef.current || artworks.length === 0) return;

    const needsMigration = artworks.some(art => {
      const statusStr = String(art.status);
      const isIT = statusStr.toUpperCase().startsWith('IT') || statusStr.includes('#');
      const isValid = Object.values(ArtworkStatus).includes(art.status);
      return isIT && !isValid;
    });

    if (needsMigration) {
      hasMigratedRef.current = true;
      setArtworks(prev => prev.map(art => {
        const statusStr = String(art.status);
        if (statusStr.toUpperCase().startsWith('IT') || statusStr.includes('#')) {
          const isValidStatus = Object.values(ArtworkStatus).includes(art.status);
          if (!isValidStatus) {
            return {
              ...art,
              status: ArtworkStatus.FOR_SALE_APPROVAL,
              remarks: statusStr
            };
          }
        }
        return art;
      }));
    }
  }, [artworks, setArtworks]);

  // Initial App Readiness Logic
  useEffect(() => {
    // In Live Mode, only block initial access on account/profile readiness.
    // Artworks, events, and sales can continue syncing progressively in the background.
    const isCriticalDataLoaded = !isLoadingUsers;

    if (!isAppReady && (IS_DEMO_MODE || isCriticalDataLoaded)) {
      const timer = setTimeout(() => {
        setIsAppReady(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLoadingUsers, isAppReady]);


  // Computed
  const userRole = currentUser?.role || UserRole.SALES_AGENT;

  // Filter out any malformed accounts that might show up as "Unknown User"
  const validAccounts = useMemo(() => {
    return accounts.filter(acc => {
      // A valid account must have at least one identifying field that isn't just whitespace
      const name = (acc.name || acc.fullName || acc.firstName || '').toString().trim();
      const email = (acc.email || '').toString().trim();

      const hasName = name.length > 0 && name.toLowerCase() !== 'undefined' && name.toLowerCase() !== 'null';
      const hasEmail = email.length > 0 && email.toLowerCase() !== 'undefined' && email.toLowerCase() !== 'null';

      // We also check if it's a real document with data, not just an empty ID
      return (hasName || hasEmail) && acc.id;
    });
  }, [accounts]);

  const unreadChatCount = useMemo(() => {
    if (!currentUser) return 0;
    return conversations.reduce((sum, conv) => sum + (conv.unreadCount?.[currentUser.id] || 0), 0);
  }, [conversations, currentUser]);

  const currentPermissions = useMemo(() => {
    if (!currentUser) return getDefaultPermissions(UserRole.SALES_AGENT);
    // Merge stored permissions with defaults to ensure new permission keys are present
    const defaults = getDefaultPermissions(currentUser.role);
    const stored = currentUser.permissions || {};

    const merged = { ...defaults, ...stored };

    // Ensure 'artwork-transfer' and 'chat' are available if role permits it by default
    // This fixes the issue for existing users who have stored permissions without these new tabs
    if (merged.accessibleTabs && defaults.accessibleTabs) {
      if (defaults.accessibleTabs.includes('artwork-transfer') && !merged.accessibleTabs.includes('artwork-transfer')) {
        merged.accessibleTabs = [...merged.accessibleTabs, 'artwork-transfer'];
      }
      if (defaults.accessibleTabs.includes('chat') && !merged.accessibleTabs.includes('chat')) {
        merged.accessibleTabs = [...merged.accessibleTabs, 'chat'];
      }
    }

    return merged;
  }, [currentUser]);

  // Track navigation history — push previous tab whenever activeTab changes
  const prevTabRef = React.useRef<string | null>(null);
  useEffect(() => {
    const prevTab = prevTabRef.current;
    if (prevTab && prevTab !== activeTab) {
      setHistoryStack(prev => {
        const entry: { tab: string; operationsView?: typeof operationsView } = { tab: prevTab };
        if (prevTab === 'operations') {
          entry.operationsView = operationsView;
        }
        return [...prev, entry];
      });
    }
    prevTabRef.current = activeTab;
  }, [activeTab]);

  // Enforce tab access
  useEffect(() => {
    // master-view is a detail view, not a sidebar tab, so permission is handled within the view itself
    if (activeTab === 'master-view') return;

    if (currentPermissions?.accessibleTabs && !currentPermissions.accessibleTabs.includes(activeTab)) {
      const allowed = currentPermissions.accessibleTabs;
      if (allowed.length > 0) {
        setActiveTab(allowed[0]);
      }
    }
  }, [activeTab, currentPermissions]);

  const canPerform = {
    add: currentPermissions.canAddArtwork,
    edit: currentPermissions.canEditArtwork,
    transfer: currentPermissions.canEditArtwork,
    sell: currentPermissions.canSellArtwork,
    reserve: currentPermissions.canReserveArtwork,
    deliver: currentPermissions.canSellArtwork,
    manageUsers: currentPermissions.canManageAccounts,
    manageEvents: currentPermissions.canManageEvents,
  };

  const handleViewArtwork = (id: string) => {
    setSelectedArtworkId(id);
    setActiveTab('master-view');
  };

  const handleViewArtworkFromObject = (artwork: Artwork) => {
    setSelectedArtworkId(artwork.id);
    setActiveTab('master-view');
  };

  const handleNavigateFromStat = (tab: string, filter?: any) => {
    setActiveTab(tab as any);
  };

  const handleReservationComplete = () => {
    setActiveTab('operations');
    setOperationsView('reservations');
  };

  const handleDeleteImportLogs = async () => {
    if (IS_DEMO_MODE) {
      setImportLogs([]);
      return;
    }
    try {
      await supabase.from('import_records').delete().not('id', 'is', null);
      setImportLogs([]);
    } catch (error) {
      console.error('Error deleting import logs:', error);
    }
  };

  const handleBulkDeleteSales = async (ids: string[]) => {
    const realSaleIds = ids.filter(id => !id.startsWith('virtual-'));
    const virtualSaleArtworkIds = ids.filter(id => id.startsWith('virtual-')).map(id => id.replace('virtual-', ''));

    if (IS_DEMO_MODE) {
      if (realSaleIds.length > 0) {
        setSales(prev => prev.filter(s => !realSaleIds.includes(s.id)));
      }
      if (virtualSaleArtworkIds.length > 0) {
        setArtworks(prev => prev.map(a => virtualSaleArtworkIds.includes(a.id) ? { ...a, status: ArtworkStatus.AVAILABLE } : a));
      }
      return;
    }

    try {
      if (realSaleIds.length > 0) {
        await supabase.from('sales').delete().in('id', realSaleIds);
        setSales(prev => prev.filter(s => !realSaleIds.includes(s.id)));
      }
      if (virtualSaleArtworkIds.length > 0) {
        await supabase.from('artworks').update(mapToSnakeCase({ status: ArtworkStatus.AVAILABLE })).in('id', virtualSaleArtworkIds);
        setArtworks(prev => prev.map(a => virtualSaleArtworkIds.includes(a.id) ? { ...a, status: ArtworkStatus.AVAILABLE } : a));
      }
    } catch (error) {
      console.error('Error deleting sales:', error);
    }
  };

  const handleLogoutWithRedirect = () => {
    handleLogout();
    setActiveTab('dashboard');
  };

  const handleDeleteNotifications = async () => {
    if (IS_DEMO_MODE) {
      setNotifications([]);
      return;
    }
    try {
      await supabase.from('notifications').delete().not('id', 'is', null);
      setNotifications([]);
    } catch (error) {
      console.error('Error deleting notifications:', error);
    }
  };

  const handleClearCache = async () => {
    try {
      // Clear localStorage and sessionStorage first (contains UI states and preferences)
      localStorage.clear();
      sessionStorage.clear();

      // Clear IndexedDB (contains Supabase/Firestore cached data)
      if (window.indexedDB && window.indexedDB.databases) {
        const dbs = await window.indexedDB.databases();
        const deletePromises = dbs
          .filter(db => db.name && (db.name.includes('firestore') || db.name.includes('supabase') || db.name.includes('artisflow')))
          .map(db => window.indexedDB.deleteDatabase(db.name!));

        await Promise.all(deletePromises);
      }

      // Force reload to clear memory state and re-initialize auth
      window.location.reload();
    } catch (error) {
      console.error('Error clearing cache:', error);
      // Fallback for browsers that don't support indexedDB.databases()
      localStorage.clear();
      window.location.reload();
    }
  };

  useEffect(() => {
    if (!currentUser) {
      setJustLoggedIn(false);
      return;
    }

    if (justLoggedIn) {
      const timer = setTimeout(() => {
        setJustLoggedIn(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [currentUser, justLoggedIn, setJustLoggedIn]);

  // Show loading only during the very first app boot before auth is established.
  if (!isAppReady && !currentUser) {
    return (
      <InitialSyncLoadingScreen
        isLoadingArtworks={isLoadingArtworks}
        isLoadingUsers={isLoadingUsers}
        isLoadingEvents={isLoadingEvents}
        isLoadingSales={isLoadingSales}
        syncError={syncError}
        isProgressive={true} // New flag to indicate background sync is allowed
      />
    );
  }

  if (!currentUser) {
    return (
      <LoginPage
        accounts={validAccounts}
        onLogin={handleLogin}
        isLoading={isLoadingUsers}
      />
    );
  }

  // Router Content
  const renderContent = () => {
    try {
      switch (activeTab) {
        case 'chat':
          return (
            <Suspense fallback={<div>Loading...</div>}>
              <ChatPage
                conversations={conversations}
                messages={messages}
                currentUser={currentUser}
                accounts={validAccounts}
                onSendMessage={(conversationId, text) => handleSendMessage(conversationId, text, currentUser)}
                onStartConversation={(participantIds) => handleStartConversation(participantIds, participantIds.reduce((acc, id) => {
                  const account = validAccounts.find(item => item.id === id);
                  if (account?.name) {
                    acc[id] = account.name;
                  }
                  return acc;
                }, {} as Record<string, string>))}
                onMarkRead={(conversationId) => handleMarkRead(conversationId, currentUser)}
                onDeleteConversation={handleDeleteConversation}
              />
            </Suspense>
          );
        case 'dashboard':
          return (
            <ErrorBoundary name="Dashboard">
              <Suspense fallback={<div>Loading...</div>}>
                <Dashboard
                  artworks={artworks}
                  sales={sales}
                  events={events}
                  accounts={validAccounts}
                  onSelectArt={handleViewArtwork}
                  onManageEvents={() => {
                    setOperationsView('events');
                    setActiveTab('operations');
                  }}
                  onNavigateFromStat={handleNavigateFromStat}
                  currentUser={currentUser}
                />
              </Suspense>
            </ErrorBoundary>
          );
        case 'analytics':
          return (
            <Suspense fallback={<div>Loading...</div>}>
              <AnalyticsPage
                artworks={artworks}
                sales={sales}
                logs={logs}
                events={events}
                audits={audits}
                onConfirmAudit={handleConfirmAudit}
                userRole={userRole}
                permissions={currentPermissions}
              />
            </Suspense>
          );
        case 'sales-history':
          return (
            <Suspense fallback={<div>Loading...</div>}>
              <SalesRecordPage
                sales={sales}
                artworks={artworks}
                onBulkDelete={handleBulkDeleteSales}
                canExport={currentPermissions.canViewSalesHistory}
                canDelete={userRole === UserRole.ADMIN}
                onCancelSale={handleCancelSale}
                initialSaleId={targetSaleId}
                onClearInitialSaleId={() => setTargetSaleId(null)}
                onViewArtwork={handleViewArtwork}
                userPermissions={currentPermissions}
              />
            </Suspense>
          );
        case 'operations':
          const canAccessOperations = currentPermissions.accessibleTabs
            ? currentPermissions.accessibleTabs.includes('operations')
            : (userRole === UserRole.ADMIN || userRole === UserRole.INVENTORY_PERSONNEL);

          if (!canAccessOperations) {
            return (
              <ErrorBoundary name="Dashboard-Fallback">
                <Dashboard
                  artworks={artworks}
                  sales={sales}
                  events={events}
                  accounts={validAccounts}
                  onSelectArt={handleViewArtwork}
                  onManageEvents={() => { }} // Disable navigation to operations
                  onNavigateFromStat={handleNavigateFromStat}
                />
              </ErrorBoundary>
            );
          }
          return (
            <Suspense fallback={<div>Loading...</div>}>
              <GalleryManagementPage
                events={events}
                artworks={artworks}
                allArtworksIncludingDeleted={allArtworksIncludingDeleted}
                branches={branches}
                exclusiveBranches={exclusiveBranches}
                branchAddresses={branchAddresses}
                sales={sales}
                onAddEvent={handleAddEvent}
                onDeleteEvent={handleDeleteEvent}
                onUpdateEvent={handleUpdateEvent}
                onAddBranch={handleAddBranch}
                onUpdateBranch={handleUpdateBranch}
                onDeleteBranch={handleDeleteBranch}
                onUpdateBranchAddress={handleUpdateBranchAddress}
                onView={handleViewArtwork}
                branchCategories={branchCategories}
                branchLogos={branchLogos}
                returnRecords={returnRecords}
                transfers={transfers}
                currentUser={currentUser}
                canAdd={canPerform.add}
                onAddArtwork={handleAddArtwork}
                onEditArtwork={handleUpdateArtwork}
                onBulkAddArtworks={handleBulkAddArtworks}
                onBulkUpdateArtworks={handleBulkUpdateArtworks}
                onBulkSale={handleBulkSale}
                onAddInstallment={handleAddInstallment}
                onDeleteSale={handleDeleteSaleRecord}
                onBulkTransferRequest={handleCreateTransferRequest}
                onBulkDeleteArtworks={handleBulkDelete}
                onBulkReserveArtworks={handleBulkReserve}
                onBulkCancelReservation={handleBulkCancelReservation}
                onAddToAuction={handleAddToAuction}
                onUpdateReturnRecord={handleUpdateReturnRecord}
                onBulkDeleteReturnRecords={handleBulkDeleteReturnRecords}
                onReturnToGallery={handleReturnToGallery}
                onBulkSendToFramer={handleBulkSendToFramer}
                onBulkReturnArtwork={handleBulkReturnArtwork}
                framerRecords={framerRecords}
                onReturnFromFramer={handleReturnFromFramer}
                onDeleteFramerRecord={handleDeleteFramerRecord}
                preventDuplicates={preventDuplicateImports}
                importedFilenames={(importLogs || []).map(l => l.filename)}
                initialTab={operationsView}
                onNavigate={(tab) => setOperationsView(tab)}
                userPermissions={currentPermissions}
              />
            </Suspense>
          );
        case 'import-history':
          const canAccessImport = currentPermissions.accessibleTabs
            ? currentPermissions.accessibleTabs.includes('import-history')
            : (userRole === UserRole.ADMIN || userRole === UserRole.INVENTORY_PERSONNEL);

          if (!canAccessImport) return (
            <ErrorBoundary name="Dashboard-Fallback-Import">
              <Dashboard
                artworks={artworks}
                sales={sales}
                events={events}
                accounts={validAccounts}
                onSelectArt={handleViewArtwork}
                onManageEvents={() => setActiveTab('operations')}
                onNavigateFromStat={handleNavigateFromStat}
              />
            </ErrorBoundary>
          );
          return (
            <Suspense fallback={<div>Loading...</div>}>
              <ImportHistoryPage
                logs={importLogs}
                artworks={artworks}
                onViewArtwork={handleViewArtworkFromObject}
                preventDuplicates={preventDuplicateImports}
                onDeleteLogs={handleDeleteImportLogs}
                userPermissions={currentPermissions}
                onTogglePreventDuplicates={async (val) => {
                  setPreventDuplicateImports(val);
                  if (IS_DEMO_MODE) return;
                  try {
                    await supabase.from('settings').upsert({ id: 'webapp', prevent_duplicate_imports: val });
                  } catch (error) {
                    console.error('Error saving settings to Supabase', error);
                  }
                }}
              />
            </Suspense>
          );
        case 'snapshots':
          const canAccessSnapshots = currentPermissions.accessibleTabs
            ? currentPermissions.accessibleTabs.includes('snapshots')
            : (userRole === UserRole.ADMIN || userRole === UserRole.INVENTORY_PERSONNEL);

          if (!canAccessSnapshots) return (
            <ErrorBoundary name="Dashboard-Fallback-Snapshots">
              <Dashboard
                artworks={artworks}
                sales={sales}
                events={events}
                accounts={validAccounts}
                onSelectArt={handleViewArtwork}
                onManageEvents={() => setActiveTab('operations')}
                onNavigateFromStat={handleNavigateFromStat}
              />
            </ErrorBoundary>
          );
          return (
            <Suspense fallback={<div>Loading...</div>}>
              <TimeMachinePage
                artworks={allArtworksIncludingDeleted}
                sales={sales}
                logs={logs}
                transfers={transfers}
                events={events}
                returnRecords={returnRecords}
                framerRecords={framerRecords}
                onViewArtwork={handleViewArtwork}
                exclusiveBranches={exclusiveBranches}
                userPermissions={currentPermissions}
              />
            </Suspense>
          );
        case 'artwork-transfer':
          return (
            <Suspense fallback={<div>Loading...</div>}>
              <ArtworkTransfer
                requests={transferRequests}
                artworks={artworks}
                currentUser={currentUser}
                onAccept={handleAcceptTransfer}
                onDecline={handleDeclineTransfer}
                onHold={handleHoldTransfer}
                onDelete={handleDeleteTransfer}
                branches={branches}
                onViewArtwork={handleViewArtwork}
                userPermissions={currentPermissions}
              />
            </Suspense>
          );
        case 'events':
          // Redirect to operations
          setActiveTab('operations');
          return null;
        case 'master-view':
          const selectedArt = artworks.find(a => String(a.id) === String(selectedArtworkId));
          return selectedArt ? (
            <Suspense fallback={<div>Loading...</div>}>
              <MasterView
                artwork={selectedArt}
                branches={branches}
                logs={logs.filter(l => String(l.artworkId) === String(selectedArt.id))}
                sale={sales.find(s => String(s.artworkId) === String(selectedArt.id) && !s.isCancelled)}
                userRole={userRole}
                userBranch={currentUser?.branch}
                userPermissions={currentPermissions}
                events={events}
                onReturn={handleReturnArtwork}
                onReturnToGallery={handleReturnToGallery}
                onSendToFramer={handleSendToFramer}
                onReturnFromFramer={handleReturnFromFramer}
                onDelete={handleDeleteArtwork}
                onTransfer={(id, dest, attachments) => {
                  handleCreateTransferRequest([id], dest, attachments);
                }}
                onReserve={handleReserveArtwork}
                onReservationComplete={handleReservationComplete}
                onCancelReservation={handleCancelReservation}
                onAddToAuction={handleAddToAuction}
                onSale={handleSale}
                onCancelSale={handleCancelSale}
                onDeliver={handleDeliver}
                onEdit={(updates) => handleUpdateArtwork(selectedArt.id, updates)}
                onAddInstallment={handleAddInstallment}
                onEditPayment={handleEditPayment}
                onApprovePaymentEdit={handleApprovePaymentEdit}
                onDeclinePaymentEdit={handleDeclinePaymentEdit}
                transferRequests={transferRequests}
                onAcceptTransfer={handleAcceptTransfer}
                onHoldTransfer={handleHoldTransfer}
                onDeclineTransfer={handleDeclineTransfer}
                framerRecords={framerRecords}
                returnRecords={returnRecords}
                onNavigateTo={(tab, view) => {
                  setActiveTab(tab);
                  if (tab === 'operations' && view) {
                    setOperationsView(view as any);
                  }
                }}
                onBack={() => {
                  if (historyStack.length > 0) {
                    const prev = historyStack[historyStack.length - 1];
                    setHistoryStack(prevStack => prevStack.slice(0, -1));
                    setActiveTab(prev.tab);
                    if (prev.tab === 'operations' && prev.operationsView) {
                      setOperationsView(prev.operationsView);
                    }
                    setActiveTab('dashboard');
                  }
                }}
              />
            </Suspense>
          ) : (
            <ErrorBoundary name="Dashboard-Fallback-MasterView">
              <Dashboard
                artworks={artworks}
                sales={sales}
                events={events}
                accounts={validAccounts}
                onSelectArt={handleViewArtwork}
                onManageEvents={() => setActiveTab('operations')}
                onNavigateFromStat={handleNavigateFromStat}
              />
            </ErrorBoundary>
          );
        case 'accounts':
          const canAccessAccounts = currentPermissions.accessibleTabs
            ? currentPermissions.accessibleTabs.includes('accounts')
            : currentPermissions.canManageAccounts;

          if (!canAccessAccounts) return (
            <ErrorBoundary name="Dashboard-Fallback-Accounts">
              <Dashboard
                artworks={artworks}
                sales={sales}
                events={events}
                accounts={validAccounts}
                onSelectArt={handleViewArtwork}
                onManageEvents={() => setActiveTab('operations')}
                onNavigateFromStat={handleNavigateFromStat}
              />
            </ErrorBoundary>
          );
          return (
            <Suspense fallback={<div>Loading...</div>}>
              <AccountManagement
                accounts={validAccounts}
                branches={branches}
                onAddAccount={handleAddAccount}
                onUpdateStatus={handleUpdateAccountStatus}
                onUpdateAccount={handleUpdateAccount}
                onBulkDelete={handleBulkDeleteAccounts}
                onBulkUpdateStatus={handleBulkUpdateAccountStatus}
              />
            </Suspense>
          );
        case 'audit-logs':
          return (
            <Suspense fallback={<div>Loading...</div>}>
              <AuditLogsPage logs={logs} artworks={artworks} onViewArtwork={handleViewArtwork} onDeleteLogs={handleDeleteLogs} permissions={currentUser?.permissions} />
            </Suspense>
          );
        case 'payment-approval':
          const canAccessPaymentApproval = currentPermissions.accessibleTabs
            ? currentPermissions.accessibleTabs.includes('payment-approval')
            : (userRole === UserRole.ADMIN);

          if (!canAccessPaymentApproval) return (
            <ErrorBoundary name="Dashboard-Fallback-PaymentApproval">
              <Dashboard
                artworks={artworks}
                sales={sales}
                events={events}
                accounts={validAccounts}
                onSelectArt={handleViewArtwork}
                onManageEvents={() => setActiveTab('operations')}
                onNavigateFromStat={handleNavigateFromStat}
              />
            </ErrorBoundary>
          );
          return (
            <Suspense fallback={<div>Loading...</div>}>
              <PaymentApprovalPage
                sales={sales}
                artworks={artworks}
                onApprovePaymentEdit={handleApprovePaymentEdit}
                onDeclinePaymentEdit={handleDeclinePaymentEdit}
                userPermissions={currentPermissions}
              />
            </Suspense>
          );
        case 'sales-approval':
          const canAccessSalesApproval = currentPermissions.accessibleTabs
            ? currentPermissions.accessibleTabs.includes('sales-approval')
            : (userRole === UserRole.ADMIN);

          if (!canAccessSalesApproval) return (
            <ErrorBoundary name="Dashboard-Fallback-SalesApproval">
              <Dashboard
                artworks={artworks}
                sales={sales}
                events={events}
                accounts={validAccounts}
                onSelectArt={handleViewArtwork}
                onManageEvents={() => setActiveTab('operations')}
                onNavigateFromStat={handleNavigateFromStat}
              />
            </ErrorBoundary>
          );
          return (
            <Suspense fallback={<div>Loading...</div>}>
              <SalesApprovalPage
                sales={sales}
                artworks={artworks}
                onApproveSale={handleApproveSale}
                onDeclineSale={handleDeclineSaleWithMessaging}
                userPermissions={currentPermissions}
              />
            </Suspense>
          );
        default:
          return (
            <ErrorBoundary name="Dashboard-Default">
              <Dashboard
                artworks={artworks}
                sales={sales}
                events={events}
                isLoadingEvents={isLoadingEvents}
                isLoadingArtworks={isLoadingArtworks}
                accounts={validAccounts}
                currentUser={currentUser}
                onSelectArt={handleViewArtwork}
                onManageEvents={() => setActiveTab('operations')}
                onNavigateFromStat={handleNavigateFromStat}
              />
            </ErrorBoundary>
          );
      }
    } catch (err) {
      console.error("Critical rendering error in tab:", activeTab, err);
      // Let GlobalErrorBoundary handle it
      throw err;
    }
  };


  return (
    <div
      className="flex bg-neutral-50 font-sans text-neutral-900 overflow-hidden"
      style={typeof window !== 'undefined' && window.innerWidth >= 1024 ? {
        zoom: zoomLevel,
        width: `${100 / zoomLevel}vw`,
        height: `${100 / zoomLevel}vh`
      } as any : { width: '100vw', height: '100vh' }}
    >
      <LoadingOverlay
        isVisible={importStatus.isVisible}
        title={importStatus.title}
        message={importStatus.message}
        progress={importStatus.progress}
        skippedItems={importStatus.skippedItems}
        summary={importStatus.summary}
        onClose={() => setImportStatus({ isVisible: false })}
      />
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
        userPermissions={currentPermissions}
        onOpenOperationsBranches={() => setOperationsView('branches')}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            userRole={userRole}
            activeTab={activeTab}
            notifications={notifications}
          unreadChatCount={unreadChatCount}
          onViewChat={() => setActiveTab('chat')}
          onMarkRead={markNotificationsAsRead}
          onLogout={handleLogoutWithRedirect}
          onViewProfile={() => setShowProfile(true)}
          userName={currentUser?.name}
          onBackToDashboard={() => {
            if (historyStack.length > 0) {
              const prev = historyStack[historyStack.length - 1];
              // Pop the last entry without pushing current tab again
              prevTabRef.current = null;
              setHistoryStack(prevStack => prevStack.slice(0, -1));
              setActiveTab(prev.tab);
              if (prev.tab === 'operations' && prev.operationsView) {
                setOperationsView(prev.operationsView);
              }
            } else {
              prevTabRef.current = null;
              setActiveTab('dashboard');
            }
          }}
          historyStack={historyStack}
          artworks={artworks}
          onViewArtwork={handleViewArtwork}
          onDeleteNotifications={handleDeleteNotifications}
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
          permissions={currentUser?.permissions}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {syncError && (
            <div className="bg-neutral-50 border-l-4 border-neutral-900 p-4 mb-4 rounded-md shadow-sm">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-neutral-900" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-neutral-700 font-medium">
                    {syncError}
                  </p>
                </div>
                <div className="ml-auto pl-3">
                  <button
                    className="-mx-1.5 -my-1.5 bg-neutral-50 text-neutral-500 rounded-lg p-1.5 hover:bg-neutral-100 inline-flex items-center justify-center h-8 w-8 focus:outline-none"
                    onClick={() => setSyncError(null)}
                  >
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {showProfile && (
        <ProfileModal
          user={currentUser}
          logs={logs.filter(l => l.user === currentUser.name)}
          artworks={artworks}
          permissions={currentPermissions}
          salesCount={sales.filter(s => s.agentName === currentUser.name).length}
          inventoryCount={logs.filter(l => l.user === currentUser.name && l.action === 'Created').length}
          onClose={() => setShowProfile(false)}
          onClearCache={handleClearCache}
        />
      )}
    </div>
  );
};

export default App;
