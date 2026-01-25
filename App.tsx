
import React, { useState, useMemo, useEffect } from 'react';
import { 
  UserRole, 
  Artwork, 
  ArtworkStatus, 
  SaleRecord, 
  TransferRecord, 
  TransferRequest,
  TransferStatus,
  ActivityLog,
  Branch,
  UserAccount,
  ExhibitionEvent,
  EventStatus,
  InventoryAudit,
  AppNotification,
  ImportRecord,
  MonitoringEntry,
  ReturnRecord
} from './types';
import { INITIAL_ARTWORKS, INITIAL_SALES, INITIAL_LOGS, INITIAL_EVENTS } from './data';
import { db, rtdb } from './firebase';
import { collection, getDocs, doc, setDoc, writeBatch, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import { ref, onDisconnect, set, serverTimestamp } from 'firebase/database';
import { ICONS, ROLE_PERMISSIONS, BRANCHES, getDefaultPermissions, IS_DEMO_MODE } from './constants';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import MasterView from './pages/MasterView';
import AccountManagement from './pages/AccountManagement';
import AnalyticsPage from './pages/AnalyticsPage';
import ImportHistoryPage from './pages/ImportHistoryPage';
import TimeMachinePage from './pages/TimeMachinePage';
import GalleryManagementPage from './pages/GalleryManagementPage';
import GalleriaPage from './pages/GalleriaPage';
import SalesRecordPage from './pages/SalesRecordPage';
import AuditLogsPage from './pages/AuditLogsPage';
import ArtworkTransfer from './pages/ArtworkTransfer';
import LoginPage from './pages/LoginPage';

import ProfileModal from './components/ProfileModal';
import MonitoringSummaryPage from './pages/MonitoringSummaryPage';
import { buildNewArtwork } from './services/inventoryService';
import { buildMonthlyAudit } from './services/auditService';
import { sendStaffWelcomeEmail } from './services/emailService';
import { buildBulkSale, applySingleSale, applyCancelSale, applyDelivery } from './services/salesService';
import { applyTransfer, applyBulkArtworkUpdate } from './services/transferService';
import { applyBulkReserveEvent, linkArtworkToEventOnReserve } from './services/eventService';

type MasterViewReturnTarget = {
  tab: string;
  operationsView?: 'inventory' | 'events' | 'branches' | 'monitoring';
} | null;

const INITIAL_ACCOUNTS: UserAccount[] = [
  { id: 'u1', name: 'Admin User', email: 'admin@artisflow.com', role: UserRole.ADMIN, status: 'Active', lastLogin: '2024-03-20T10:00:00Z', firstName: 'Admin', fullName: 'Admin User', position: 'Administrator', branch: 'Main Gallery' },
  { id: 'u2', name: 'James Wilson', email: 'james@artisflow.com', role: UserRole.INVENTORY_PERSONNEL, status: 'Active', lastLogin: '2024-03-19T14:00:00Z', firstName: 'James', fullName: 'James Wilson', position: 'Inventory Personnel', branch: 'East Branch' },
  { id: 'u3', name: 'Emma Stone', email: 'emma@artisflow.com', role: UserRole.SALES_AGENT, status: 'Active', lastLogin: '2024-03-21T09:00:00Z', firstName: 'Emma', fullName: 'Emma Stone', position: 'Sales Agent', branch: 'West Branch' },
];

// Helper to remove undefined values for Firestore
const sanitizeForFirestore = (obj: any): any => {
  if (typeof obj === 'number' && isNaN(obj)) {
    return null;
  }
  if (obj === undefined) {
    return null;
  }
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  if (Array.isArray(obj)) {
    return obj.map(v => sanitizeForFirestore(v));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const value = obj[key];
      if (value !== undefined) {
        acc[key] = sanitizeForFirestore(value);
      }
      return acc;
    }, {} as any);
  }
  return obj;
};

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [showProfile, setShowProfile] = useState(false);
  
  // App Data State
  const [artworks, setArtworks] = useState<Artwork[]>(INITIAL_ARTWORKS);
  const [sales, setSales] = useState<SaleRecord[]>(INITIAL_SALES);
  const [branches, setBranches] = useState<string[]>(BRANCHES);
  const [branchAddresses, setBranchAddresses] = useState<Record<string, string>>({});
  const [exclusiveBranches, setExclusiveBranches] = useState<string[]>([]);

  const [logs, setLogs] = useState<ActivityLog[]>(INITIAL_LOGS);
  const [accounts, setAccounts] = useState<UserAccount[]>(INITIAL_ACCOUNTS);
  const [transferRequests, setTransferRequests] = useState<TransferRequest[]>([]);
  
  // Sync currentUser with accounts changes to reflect permission updates immediately
  useEffect(() => {
    if (currentUser) {
      const updatedUser = accounts.find(a => a.id === currentUser.id);
      if (updatedUser && JSON.stringify(updatedUser) !== JSON.stringify(currentUser)) {
        setCurrentUser(updatedUser);
      }
    }
  }, [accounts, currentUser]);

  // Presence System
  useEffect(() => {
    if (currentUser?.id) {
      const userStatusDatabaseRef = ref(rtdb, '/status/' + currentUser.id);

      const isOfflineForDatabase = {
        state: 'offline',
        last_changed: serverTimestamp(),
      };

      const isOnlineForDatabase = {
        state: 'online',
        last_changed: serverTimestamp(),
      };

      // Set user online when connected
      set(userStatusDatabaseRef, isOnlineForDatabase);

      // Set user offline when disconnected
      onDisconnect(userStatusDatabaseRef).set(isOfflineForDatabase);

      return () => {
        set(userStatusDatabaseRef, isOfflineForDatabase);
        onDisconnect(userStatusDatabaseRef).cancel();
      };
    }
  }, [currentUser?.id]);

  // Data Migration for IT Tags
  useEffect(() => {
    const needsMigration = artworks.some(art => {
      const statusStr = String(art.status);
      const isIT = statusStr.toUpperCase().startsWith('IT') || statusStr.includes('#');
      const isValid = Object.values(ArtworkStatus).includes(art.status);
      return isIT && !isValid;
    });

    if (needsMigration) {
      setArtworks(prev => prev.map(art => {
        // Check if status is a string that looks like "IT #..."
        const statusStr = String(art.status);
        if (statusStr.toUpperCase().startsWith('IT') || statusStr.includes('#')) {
          // Only migrate if it's not one of the valid enum values
          const isValidStatus = Object.values(ArtworkStatus).includes(art.status);
          if (!isValidStatus) {
             return {
               ...art,
               status: ArtworkStatus.AVAILABLE,
               remarks: statusStr // Move the tag to remarks
             };
          }
        }
        return art;
      }));
    }
  }, [artworks]);

  const [events, setEvents] = useState<ExhibitionEvent[]>(INITIAL_EVENTS);
  const [audits, setAudits] = useState<InventoryAudit[]>([]);
  const [importLogs, setImportLogs] = useState<ImportRecord[]>([]);
  const [preventDuplicateImports, setPreventDuplicateImports] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [selectedArtworkId, setSelectedArtworkId] = useState<string | null>(null);
  const [monitoringEntries, setMonitoringEntries] = useState<MonitoringEntry[]>([]);
  const [returnRecords, setReturnRecords] = useState<ReturnRecord[]>([]);
  const [operationsView, setOperationsView] = useState<'inventory' | 'events' | 'branches' | 'monitoring' | 'returned'>('branches');
  const [masterViewReturnTarget, setMasterViewReturnTarget] = useState<MasterViewReturnTarget>(null);

  useEffect(() => {
    if (IS_DEMO_MODE) return;
    const loadArtworks = async () => {
      try {
        const artworksCollection = collection(db, 'artworks');
        const snapshot = await getDocs(artworksCollection);
        if (snapshot.empty) {
          setArtworks(INITIAL_ARTWORKS);
          const batch = writeBatch(db);
          INITIAL_ARTWORKS.forEach(art => {
            const ref = doc(artworksCollection, art.id);
            batch.set(ref, sanitizeForFirestore(art));
          });
          await batch.commit();
        } else {
          const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Artwork));
          setArtworks(loaded);
        }
      } catch (error) {
        console.error('Error loading artworks from Firestore', error);
      }
    };
    const loadAccounts = async () => {
      try {
        const accountsCollection = collection(db, 'users');
        const snapshot = await getDocs(accountsCollection);
        if (snapshot.empty) {
          setAccounts(INITIAL_ACCOUNTS);
          const batch = writeBatch(db);
          INITIAL_ACCOUNTS.forEach(acc => {
            const ref = doc(accountsCollection, acc.id);
            batch.set(ref, sanitizeForFirestore(acc));
          });
          await batch.commit();
        } else {
          const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserAccount));
          setAccounts(loaded);
        }
      } catch (error) {
        console.error('Error loading users from Firestore', error);
      }
    };
    const loadBranches = async () => {
      try {
        const branchesCollection = collection(db, 'branches');
        const snapshot = await getDocs(branchesCollection);
        if (snapshot.empty) {
          setBranches(BRANCHES);
          const batch = writeBatch(db);
          BRANCHES.forEach(name => {
            const ref = doc(branchesCollection, name);
            batch.set(ref, { name });
          });
          await batch.commit();
        } else {
          const loadedNames: string[] = [];
          const loadedAddresses: Record<string, string> = {};
          const loadedExclusive: string[] = [];
          snapshot.docs.forEach(d => {
            const data = d.data() as { name?: string; address?: string; isExclusive?: boolean };
            const name = data.name || d.id;
            loadedNames.push(name);
            if (data.address) {
              loadedAddresses[name] = data.address;
            }
            if (data.isExclusive) {
              loadedExclusive.push(name);
            }
          });
          setBranches(loadedNames);
          setBranchAddresses(loadedAddresses);
          setExclusiveBranches(loadedExclusive);
        }
      } catch (error) {
        console.error('Error loading branches from Firestore', error);
      }
    };
    const loadEvents = async () => {
      try {
        const eventsCollection = collection(db, 'events');
        const snapshot = await getDocs(eventsCollection);
        if (snapshot.empty) {
          setEvents(INITIAL_EVENTS);
          const batch = writeBatch(db);
          INITIAL_EVENTS.forEach(event => {
            const ref = doc(eventsCollection, event.id);
            batch.set(ref, sanitizeForFirestore(event));
          });
          await batch.commit();
        } else {
          const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ExhibitionEvent));
          setEvents(loaded);
        }
      } catch (error) {
        console.error('Error loading events from Firestore', error);
      }
    };
    const loadTransferRequests = async () => {
      try {
        const trCollection = collection(db, 'transferRequests');
        const q = query(trCollection, orderBy('requestedAt', 'desc'));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TransferRequest));
          setTransferRequests(loaded);
        }
      } catch (error) {
        console.error('Error loading transfer requests from Firestore', error);
      }
    };
    const loadSales = async () => {
      try {
        const salesCollection = collection(db, 'sales');
        const snapshot = await getDocs(salesCollection);
        if (snapshot.empty) {
          setSales(INITIAL_SALES);
          const batch = writeBatch(db);
          INITIAL_SALES.forEach(sale => {
            const ref = doc(salesCollection, sale.id);
            batch.set(ref, sanitizeForFirestore(sale));
          });
          await batch.commit();
        } else {
          const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SaleRecord));
          setSales(loaded);
        }
      } catch (error) {
        console.error('Error loading sales from Firestore', error);
      }
    };
    const loadAudits = async () => {
      try {
        const auditsCollection = collection(db, 'audits');
        const snapshot = await getDocs(auditsCollection);
        if (!snapshot.empty) {
          const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as InventoryAudit));
          setAudits(loaded);
        }
      } catch (error) {
        console.error('Error loading audits from Firestore', error);
      }
    };
    const loadMonitoring = async () => {
      try {
        const monitoringCollection = collection(db, 'monitoring');
        const snapshot = await getDocs(monitoringCollection);
        if (!snapshot.empty) {
          const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MonitoringEntry));
          setMonitoringEntries(loaded);
        }
      } catch (error) {
        console.error('Error loading monitoring entries from Firestore', error);
      }
    };
    const loadLogs = async () => {
      try {
        const logsCollection = collection(db, 'activityLogs');
        const q = query(logsCollection, orderBy('timestamp', 'desc'), limit(1000));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLog));
          setLogs(loaded);
        }
      } catch (error) {
        console.error('Error loading activity logs from Firestore', error);
      }
    };
    const loadNotifications = async () => {
      try {
        const notifsCollection = collection(db, 'notifications');
        const q = query(notifsCollection, orderBy('timestamp', 'desc'), limit(500));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
          setNotifications(loaded);
        }
      } catch (error) {
        console.error('Error loading notifications from Firestore', error);
      }
    };
    const loadImportLogs = async () => {
      try {
        const importCollection = collection(db, 'importRecords');
        const q = query(importCollection, orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ImportRecord));
          setImportLogs(loaded);
        }
      } catch (error) {
        console.error('Error loading import logs from Firestore', error);
      }
    };
    const loadSettings = async () => {
      try {
        const settingsCollection = collection(db, 'settings');
        const snapshot = await getDocs(settingsCollection);
        const webappDoc = snapshot.docs.find(d => d.id === 'webapp');
        if (webappDoc) {
          const data = webappDoc.data();
          if (data.preventDuplicateImports !== undefined) {
            setPreventDuplicateImports(data.preventDuplicateImports);
          }
        }
      } catch (error) {
        console.error('Error loading settings from Firestore', error);
      }
    };
    const loadReturnRecords = async () => {
      try {
        const returnsCollection = collection(db, 'returns');
        const q = query(returnsCollection, orderBy('returnDate', 'desc'));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ReturnRecord));
          setReturnRecords(loaded);
        }
      } catch (error) {
        console.error('Error loading return records from Firestore', error);
      }
    };

    loadArtworks();
    loadAccounts();
    loadBranches();
    loadEvents();
    loadTransferRequests();
    loadSales();
    loadAudits();
    loadMonitoring();
    loadLogs();
    loadNotifications();
    loadImportLogs();
    loadSettings();
    loadReturnRecords();
  }, []);

  // Computed
  const userRole = currentUser?.role || UserRole.SALES_AGENT;
  
  const currentPermissions = useMemo(() => {
    if (!currentUser) return getDefaultPermissions(UserRole.SALES_AGENT);
    // Merge stored permissions with defaults to ensure new permission keys are present
    const defaults = getDefaultPermissions(currentUser.role);
    const stored = currentUser.permissions || {};
    
    const merged = { ...defaults, ...stored };
    
    // Ensure 'artwork-transfer' is available if role permits it by default
    // This fixes the issue for existing users who have stored permissions without this new tab
    if (defaults.accessibleTabs.includes('artwork-transfer') && 
        merged.accessibleTabs && 
        !merged.accessibleTabs.includes('artwork-transfer')) {
        merged.accessibleTabs = [...merged.accessibleTabs, 'artwork-transfer'];
    }
    
    return merged;
  }, [currentUser]);

  // Enforce tab access
  useEffect(() => {
    // master-view is a detail view, not a sidebar tab, so permission is handled within the view itself
    // inventory and galleria are now accessible to all
    if (activeTab === 'master-view' || activeTab === 'inventory' || activeTab === 'galleria') return;

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
    transfer: currentPermissions.canEditArtwork, // Using edit permission for transfer as they are related
    sell: currentPermissions.canSellArtwork,
    reserve: currentPermissions.canReserveArtwork,
    deliver: currentPermissions.canSellArtwork, // Delivery is part of sales process
    manageUsers: currentPermissions.canManageAccounts,
    manageEvents: currentPermissions.canManageAccounts // Using account management for events as closest admin-level task, or should add specific permission
  };

  const MAX_NOTIFICATIONS = 500;

  // Utility to push notifications
  const pushNotification = (title: string, message: string, type: 'inventory' | 'sales' | 'system' = 'system', artworkId?: string) => {
    const newNotif: AppNotification = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      message,
      timestamp: new Date().toISOString(),
      isRead: false,
      type,
      artworkId
    };
    setNotifications(prev => {
      const next = [newNotif, ...prev];
      return next.length > MAX_NOTIFICATIONS ? next.slice(0, MAX_NOTIFICATIONS) : next;
    });
    (async () => {
      if (IS_DEMO_MODE) return;
      try {
        const notifsCollection = collection(db, 'notifications');
        await setDoc(doc(notifsCollection, newNotif.id), sanitizeForFirestore(newNotif));
      } catch (error) {
        console.error('Error saving notification to Firestore', error);
      }
    })();
  };

  const handleMarkNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  // Login Handler
  const handleLogin = (account: UserAccount) => {
    const timestamp = new Date().toISOString();
    const updatedAccount = { ...account, lastLogin: timestamp };
    
    // Update local state
    setAccounts(prev => prev.map(a => a.id === account.id ? updatedAccount : a));
    setCurrentUser(updatedAccount);
    
    pushNotification('Session Started', `User ${account.name} logged in successfully.`, 'system');
    logActivity('SYS', 'Session Started', `Staff: ${account.name} (${account.role})`);

    // Sync to Firestore
    (async () => {
      if (IS_DEMO_MODE) return;
      try {
        const usersCollection = collection(db, 'users');
        await setDoc(doc(usersCollection, account.id), { lastLogin: timestamp }, { merge: true });
      } catch (error) {
        console.error('Error updating last login', error);
      }
    })();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
    setSelectedArtworkId(null);
    setShowProfile(false);
  };

  const handleAddBranch = (name: string, isExclusive: boolean = false) => {
    if (branches.includes(name)) return;
    setBranches(prev => [...prev, name]);
    if (isExclusive) {
      setExclusiveBranches(prev => [...prev, name]);
    }
    pushNotification('Branch Added', `New ${isExclusive ? 'exclusive ' : ''}location "${name}" has been registered.`, 'system');
    (async () => {
      if (IS_DEMO_MODE) return;
      try {
        const branchesCollection = collection(db, 'branches');
        await setDoc(doc(branchesCollection, name), { name, isExclusive }, { merge: true });
      } catch (error) {
        console.error('Error saving branch to Firestore', error);
      }
    })();
  };

  const handleCreateTransferRequest = async (artworkIds: string[], toBranch: string) => {
    if (!currentUser) return;
    
    const newRequests: TransferRequest[] = artworkIds.map(id => {
      const artwork = artworks.find(a => a.id === id);
      if (!artwork) return null;

      // Strict Security: Can only transfer if you are in the FROM branch or Admin
      if (currentUser.role !== UserRole.ADMIN && currentUser.branch !== artwork.currentBranch) {
        return null;
      }
      
      return {
        id: `TR-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        artworkId: id,
        artworkTitle: artwork.title,
        artworkCode: artwork.code,
        artworkImage: artwork.imageUrl,
        fromBranch: artwork.currentBranch,
        toBranch: toBranch,
        status: 'Pending',
        requestedBy: currentUser.name,
        requestedAt: new Date().toISOString()
      };
    }).filter(Boolean) as TransferRequest[];

    if (newRequests.length === 0) {
      if (artworkIds.length > 0) {
         pushNotification('Action Failed', 'You are not authorized to transfer these items.', 'system');
      }
      return;
    }

    setTransferRequests(prev => [...newRequests, ...prev]);
    
    // Update local artwork status to indicate pending transfer if needed, 
    // but typically we just wait for acceptance. 
    // Ideally, we might want to lock the artwork or show it as pending in Inventory.
    // For now, we follow requirements: "doesnt transfer to it right away".

    pushNotification('Transfer Requested', `${newRequests.length} artworks requested for transfer to ${toBranch}.`, 'inventory');
    logActivity('INV', 'Transfer Requested', `Requested transfer of ${newRequests.length} items to ${toBranch} by ${currentUser.name}`);

    if (IS_DEMO_MODE) return;

    try {
      const batch = writeBatch(db);
      const trCollection = collection(db, 'transferRequests');
      
      newRequests.forEach(req => {
        const ref = doc(trCollection, req.id);
        batch.set(ref, req);
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error creating transfer requests', error);
      pushNotification('Error', 'Failed to create transfer requests.', 'system');
    }
  };

  const handleAcceptTransfer = async (request: TransferRequest) => {
    if (!currentUser) return;

    // Strict Security Check: Only ToBranch or Admin can accept
    if (currentUser.role !== UserRole.ADMIN && currentUser.branch !== request.toBranch) {
      pushNotification('Access Denied', 'Only the receiving branch can accept this transfer.', 'system');
      return;
    }
    
    const timestamp = new Date().toISOString();
    
    // 1. Update Request Status
    const updatedRequest = { 
      ...request, 
      status: 'Accepted' as TransferStatus,
      respondedBy: currentUser.name,
      respondedAt: timestamp
    };
    
    setTransferRequests(prev => prev.map(r => r.id === request.id ? updatedRequest : r));
    
    // 2. Transfer the Artwork
    // Reuse existing logic or call applyTransfer service? 
    // We can manually do it here to ensure state sync.
    const artwork = artworks.find(a => a.id === request.artworkId);
    if (artwork) {
      const updatedArtwork = { ...artwork, currentBranch: request.toBranch };
      setArtworks(prev => prev.map(a => a.id === artwork.id ? updatedArtwork : a));
    }

    pushNotification('Transfer Accepted', `Transfer of ${request.artworkTitle} to ${request.toBranch} accepted.`, 'inventory');
    logActivity('INV', 'Transfer Accepted', `Accepted transfer of ${request.artworkCode} to ${request.toBranch}`);

    if (IS_DEMO_MODE) return;

    try {
      const batch = writeBatch(db);
      
      // Update Request
      const reqRef = doc(db, 'transferRequests', request.id);
      batch.update(reqRef, { 
        status: 'Accepted',
        respondedBy: currentUser.name,
        respondedAt: timestamp
      });
      
      // Update Artwork
      const artRef = doc(db, 'artworks', request.artworkId);
      batch.update(artRef, { currentBranch: request.toBranch });

      // Create Transfer Record for history
      const transferRef = doc(collection(db, 'transfers'));
      const transferRecord: TransferRecord = {
        id: transferRef.id,
        artworkId: request.artworkId,
        artworkTitle: request.artworkTitle,
        fromBranch: request.fromBranch,
        toBranch: request.toBranch,
        date: timestamp,
        user: request.requestedBy, // Original requester
        approvedBy: currentUser.name,
        notes: `Transfer Request Accepted by ${currentUser.name}`
      };
      batch.set(transferRef, transferRecord);
      
      await batch.commit();
    } catch (error) {
      console.error('Error accepting transfer', error);
    }
  };

  const handleDeclineTransfer = async (request: TransferRequest) => {
    if (!currentUser) return;

    // Strict Security Check: Only ToBranch or Admin can decline
    if (currentUser.role !== UserRole.ADMIN && currentUser.branch !== request.toBranch) {
      pushNotification('Access Denied', 'Only the receiving branch can decline this transfer.', 'system');
      return;
    }
    
    const timestamp = new Date().toISOString();
    
    const updatedRequest = { 
      ...request, 
      status: 'Declined' as TransferStatus,
      respondedBy: currentUser.name,
      respondedAt: timestamp
    };
    
    setTransferRequests(prev => prev.map(r => r.id === request.id ? updatedRequest : r));

    pushNotification('Transfer Declined', `Transfer of ${request.artworkTitle} was declined.`, 'inventory');
    logActivity('INV', 'Transfer Declined', `Declined transfer of ${request.artworkCode}`);

    if (IS_DEMO_MODE) return;

    try {
      const reqRef = doc(db, 'transferRequests', request.id);
      await setDoc(reqRef, { 
        status: 'Declined',
        respondedBy: currentUser.name,
        respondedAt: timestamp
      }, { merge: true });
    } catch (error) {
      console.error('Error declining transfer', error);
    }
  };

  const handleHoldTransfer = async (request: TransferRequest) => {
    if (!currentUser) return;

    // Strict Security Check: Only ToBranch or Admin can put on hold
    // We also allow the FromBranch to see it on hold, but typically the receiving branch puts it on hold.
    // Requirement says "3 action buttons accept, reject, on hold" which implies receiving branch action.
    if (currentUser.role !== UserRole.ADMIN && currentUser.branch !== request.toBranch) {
      pushNotification('Access Denied', 'Only the receiving branch can put this transfer on hold.', 'system');
      return;
    }
    
    const timestamp = new Date().toISOString();
    
    const updatedRequest = { 
      ...request, 
      status: 'On Hold' as TransferStatus,
      respondedBy: currentUser.name,
      respondedAt: timestamp
    };
    
    setTransferRequests(prev => prev.map(r => r.id === request.id ? updatedRequest : r));

    pushNotification('Transfer On Hold', `Transfer of ${request.artworkTitle} is now on hold.`, 'inventory');
    logActivity('INV', 'Transfer On Hold', `Put transfer of ${request.artworkCode} on hold`);

    if (IS_DEMO_MODE) return;

    try {
      const reqRef = doc(db, 'transferRequests', request.id);
      await setDoc(reqRef, { 
        status: 'On Hold',
        respondedBy: currentUser.name,
        respondedAt: timestamp
      }, { merge: true });
    } catch (error) {
      console.error('Error holding transfer', error);
    }
  };

  const handleUpdateBranch = async (oldName: string, newName: string) => {
    const currentAddress = branchAddresses[oldName];
    const isExclusive = exclusiveBranches.includes(oldName);
    
    const updatedArtworks = artworks.map(a => a.currentBranch === oldName ? { ...a, currentBranch: newName } : a);
    const updatedEvents = events.map(e => e.location === oldName ? { ...e, location: newName } : e);
    
    setBranches(prev => prev.map(b => b === oldName ? newName : b));
    if (isExclusive) {
      setExclusiveBranches(prev => prev.map(b => b === oldName ? newName : b));
    }
    
    setArtworks(updatedArtworks);
    setEvents(updatedEvents);
    setBranchAddresses(prev => {
      if (!(oldName in prev)) return prev;
      const { [oldName]: addr, ...rest } = prev;
      return { ...rest, [newName]: addr };
    });
    pushNotification('Branch Updated', `Location "${oldName}" was renamed to "${newName}".`, 'system');
    if (IS_DEMO_MODE) return;
    try {
      const artworksCollection = collection(db, 'artworks');
      const eventsCollection = collection(db, 'events');
      const branchesCollection = collection(db, 'branches');
      const batch = writeBatch(db);
      updatedArtworks
        .filter(a => a.currentBranch === newName)
        .forEach(art => {
          batch.set(doc(artworksCollection, art.id), art, { merge: true });
        });
      updatedEvents
        .filter(e => e.location === newName)
        .forEach(event => {
          batch.set(doc(eventsCollection, event.id), event, { merge: true });
        });
        
      const branchData: any = { name: newName };
      if (currentAddress) branchData.address = currentAddress;
      if (isExclusive) branchData.isExclusive = true;

      batch.set(doc(branchesCollection, newName), branchData, { merge: true });
      batch.delete(doc(branchesCollection, oldName));
      await batch.commit();
    } catch (error) {
      console.error('Error syncing branch update to Firestore', error);
    }
  };

  const handleDeleteBranch = (name: string) => {
    setBranches(prev => prev.filter(b => b !== name));
    setExclusiveBranches(prev => prev.filter(b => b !== name));
    setBranchAddresses(prev => {
      if (!(name in prev)) return prev;
      const { [name]: _, ...rest } = prev;
      return rest;
    });
    pushNotification('Branch Removed', `Location "${name}" was removed from active branches.`, 'system');
    (async () => {
      if (IS_DEMO_MODE) return;
      try {
        const branchesCollection = collection(db, 'branches');
        await deleteDoc(doc(branchesCollection, name));
      } catch (error) {
        console.error('Error deleting branch from Firestore', error);
      }
    })();
  };

  const handleUpdateBranchAddress = (name: string, address: string) => {
    setBranchAddresses(prev => ({ ...prev, [name]: address }));
    (async () => {
      if (IS_DEMO_MODE) return;
      try {
        const branchesCollection = collection(db, 'branches');
        await setDoc(doc(branchesCollection, name), { name, address }, { merge: true });
      } catch (error) {
        console.error('Error updating branch address in Firestore', error);
      }
    })();
  };

  // Actions
  const logActivity = (artworkId: string, action: string, details?: string) => {
    const newLog: ActivityLog = {
      id: Math.random().toString(36).substr(2, 9),
      artworkId,
      action,
      user: currentUser?.name || 'Unknown',
      timestamp: new Date().toISOString(),
      details
    };
    setLogs(prev => [newLog, ...prev]);
  };

  const handleConfirmAudit = () => {
    const newAudit = buildMonthlyAudit(artworks, logs, userRole);
    setAudits(prev => [newAudit, ...prev]);
    pushNotification('Audit Confirmed', `Monthly audit for ${newAudit.month} was finalized by ${userRole}.`, 'system');
    (async () => {
      if (IS_DEMO_MODE) return;
      try {
        const auditsCollection = collection(db, 'audits');
        await setDoc(doc(auditsCollection, newAudit.id), newAudit);
      } catch (error) {
        console.error('Error saving audit to Firestore', error);
      }
    })();
  };

  const handleAddAccount = (acc: Partial<UserAccount>) => {
    const baseName = acc.fullName || acc.firstName || acc.name || acc.email;
    const newAccount: UserAccount = {
      ...acc,
      id: `u${accounts.length + 1}`,
      status: 'Active',
      lastLogin: new Date().toISOString(),
      name: baseName || 'New User',
      firstName: acc.firstName,
      fullName: acc.fullName || baseName,
      position: acc.position,
      password: acc.password,
      role: acc.role || UserRole.SALES_AGENT
    } as UserAccount;
    setAccounts(prev => [...prev, newAccount]);
    pushNotification('Account Provisioned', `New user account created for ${baseName}.`, 'system');
    if (acc.email) {
      (async () => {
        if (IS_DEMO_MODE) return;
        try {
          await sendStaffWelcomeEmail({
            to: acc.email as string,
            name: baseName || ''
          });
        } catch (error) {
          console.error('Error sending staff welcome email', error);
        }
      })();
    }
    (async () => {
      if (IS_DEMO_MODE) return;
      try {
        const accountsCollection = collection(db, 'users');
        await setDoc(doc(accountsCollection, newAccount.id), newAccount);
      } catch (error) {
        console.error('Error saving account to Firestore', error);
      }
    })();
  };

  const handleUpdateAccountStatus = (id: string, status: 'Active' | 'Inactive') => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    pushNotification('Account Updated', `Access status changed for a staff member.`, 'system');
    (async () => {
      if (IS_DEMO_MODE) return;
      try {
        const accountsCollection = collection(db, 'users');
        await setDoc(doc(accountsCollection, id), { status }, { merge: true });
      } catch (error) {
        console.error('Error updating account status in Firestore', error);
      }
    })();
  };

  const handleUpdateAccount = (id: string, updates: Partial<UserAccount>) => {
    const existing = accounts.find(a => a.id === id);
    if (!existing) return;
    const baseName = updates.fullName || updates.firstName || updates.name || existing.name;
    const updatedAccount: UserAccount = {
      ...existing,
      ...updates,
      name: baseName || existing.name
    };
    setAccounts(prev => prev.map(a => a.id === id ? updatedAccount : a));
    if (baseName) {
      pushNotification('Account Updated', `Profile details updated for ${baseName}.`, 'system');
    } else {
      pushNotification('Account Updated', 'Profile details updated for a staff member.', 'system');
    }
    (async () => {
      if (IS_DEMO_MODE) return;
      try {
        const accountsCollection = collection(db, 'users');
        await setDoc(doc(accountsCollection, id), updatedAccount, { merge: true });
      } catch (error) {
        console.error('Error updating account in Firestore', error);
      }
    })();
  };

  const handleAddArtwork = async (art: Partial<Artwork>) => {
    const newArt = buildNewArtwork(art, 'Main Gallery' as Branch);
    
    // Auto-set status for Exclusive Branches
    if (exclusiveBranches.includes(newArt.currentBranch)) {
      newArt.status = ArtworkStatus.EXCLUSIVE_VIEW_ONLY;
    }

    setArtworks(prev => [...prev, newArt]);
    logActivity(newArt.id, 'Created', `Added to ${newArt.currentBranch}`);
    pushNotification('New Artwork Registered', `${newArt.title} by ${newArt.artist} added to ${newArt.currentBranch}.`, 'inventory', newArt.id);
    if (IS_DEMO_MODE) return;
    try {
      const artworksCollection = collection(db, 'artworks');
      await setDoc(doc(artworksCollection, newArt.id), newArt);
    } catch (error) {
      console.error('Error saving new artwork to Firestore', error);
    }
  };

   const handleBulkAddArtworks = async (newArts: Partial<Artwork>[], filename: string = 'Unknown File', customDate?: string) => {
     const currentYear = new Date().getFullYear();
     const timestamp = customDate || new Date().toISOString();
     const d = new Date(timestamp);
     const periodKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    let updatedCount = 0;
    let createdCount = 0;
    const newLogEntries: ActivityLog[] = [];

    // Create a map of existing artworks for faster lookup
    const existingCodeMap = new Map<string, Artwork>(artworks.map(a => [a.code.toLowerCase().trim(), a]));
    // Create a content map for deduplication (Title + Artist + Year)
    const existingContentMap = new Map<string, Artwork>(artworks.map(a => {
        const key = `${a.title}|${a.artist}|${a.year}`.toLowerCase().replace(/\s+/g, '');
        return [key, a];
    }));

    const nextArtworks = [...artworks];
    const newBatch: Artwork[] = [];
    const itemsToSync: Artwork[] = [];

    newArts.forEach((art, idx) => {
      // Determine Code
      const artCode = art.code ? art.code.trim() : `ART-${currentYear}-${Math.floor(Math.random() * 9000) + 1000 + idx}`;
      
      // Check for existing by Code
      let existingArt = existingCodeMap.get(artCode.toLowerCase());

      // If not found by code, try content match (Fuzzy Deduplication)
      if (!existingArt && art.title && art.artist) {
          const contentKey = `${art.title}|${art.artist}|${art.year}`.toLowerCase().replace(/\s+/g, '');
          existingArt = existingContentMap.get(contentKey);
          if (existingArt) {
              console.log(`Duplicate detected by content: ${art.title} (Matches ${existingArt.code})`);
          }
      }

      if (existingArt) {
        // OVERRIDE EXISTING
        updatedCount++;
        const index = nextArtworks.findIndex(a => a.id === existingArt.id);
        
         if (index !== -1) {
           // Merge existing data with new data (new data takes precedence)
           const updatedArt = {
             ...existingArt,
             ...art,
             id: existingArt.id, // Ensure ID doesn't change
             createdAt: timestamp, // Backdate to selected Month/Year if provided
             importPeriod: periodKey,
             // Preserve code casing if needed, or update it? Let's update it if provided.
             code: art.code || existingArt.code
           } as Artwork;
           
           nextArtworks[index] = updatedArt;
           itemsToSync.push(updatedArt);

          newLogEntries.push({
            id: Math.random().toString(36).substr(2, 9),
            artworkId: existingArt.id,
            action: 'Import Override',
            user: currentUser?.name || 'Unknown',
            timestamp: new Date().toISOString(),
            details: `Updated via bulk import from ${filename}${customDate ? ' [Backdated]' : ''}`
          });
        }
      } else {
        // CREATE NEW
        createdCount++;
       const newArt: Artwork = {
         ...art,
         id: Math.random().toString(36).substr(2, 9),
         code: artCode,
         title: art.title || 'Untitled Import',
         artist: art.artist || 'Unknown',
         medium: art.medium || 'N/A',
         dimensions: art.dimensions || 'N/A',
         year: art.year || currentYear.toString(),
         price: art.price || 0,
         status: (art.status as ArtworkStatus) || ArtworkStatus.AVAILABLE,
         currentBranch: (art.currentBranch as Branch) || 'Main Gallery',
         imageUrl: art.imageUrl || 'https://picsum.photos/800/600',
         createdAt: timestamp,
         importPeriod: periodKey
       } as Artwork;
        
       // Auto-set status for Exclusive Branches
       if (exclusiveBranches.includes(newArt.currentBranch)) {
         newArt.status = ArtworkStatus.EXCLUSIVE_VIEW_ONLY;
       }
        
        newBatch.push(newArt);
        itemsToSync.push(newArt);
        newLogEntries.push({
          id: Math.random().toString(36).substr(2, 9),
          artworkId: newArt.id,
          action: 'Bulk Imported',
          user: currentUser?.name || 'Unknown',
          timestamp: new Date().toISOString(),
          details: `Part of import batch (${filename})`
        });
      }
    });

    const finalArtworks = [...nextArtworks, ...newBatch];
    setArtworks(finalArtworks);
    setLogs(prev => [...newLogEntries, ...prev]);

    // Create Import Record
    const totalProcessed = updatedCount + createdCount;
    const newImport: ImportRecord = {
      id: Math.random().toString(36).substr(2, 9),
      filename,
      importedBy: currentUser?.name || 'Unknown',
      timestamp: new Date().toISOString(),
      recordCount: totalProcessed,
      status: 'Success',
      details: `Imported ${totalProcessed} items (${createdCount} new, ${updatedCount} updated)`
    };
    setImportLogs(prev => [newImport, ...prev]);

    (async () => {
      if (IS_DEMO_MODE) return;
      try {
        const importCollection = collection(db, 'importRecords');
        await setDoc(doc(importCollection, newImport.id), newImport);

        const logsCollection = collection(db, 'activityLogs');
        const batch = writeBatch(db);
        newLogEntries.forEach(log => {
          batch.set(doc(logsCollection, log.id), log);
        });
        await batch.commit();
      } catch (error) {
        console.error('Error saving import logs to Firestore', error);
      }
    })();

    pushNotification('Bulk Import Complete', `Processed ${totalProcessed} items: ${createdCount} added, ${updatedCount} updated.`, 'inventory');
    if (IS_DEMO_MODE) {
        console.log('Demo mode active, skipping Firestore sync');
        return;
    }

      console.log(`Starting Firestore sync for ${itemsToSync.length} items...`);
      pushNotification('Syncing Database', `Uploading ${itemsToSync.length} items to Firestore...`, 'system');
      
      try {
        const artworksCollection = collection(db, 'artworks');
        
        // Firestore batch limit is 500. We use 400 to be safe.
        const chunkSize = 400; 
        let successCount = 0;
        let failCount = 0;

        console.log(`Syncing ${itemsToSync.length} items in batches of ${chunkSize}...`);

        for (let i = 0; i < itemsToSync.length; i += chunkSize) {
          const chunk = itemsToSync.slice(i, i + chunkSize);
          console.log(`Preparing batch ${Math.floor(i / chunkSize) + 1} (${chunk.length} items)...`);
          
          try {
            const batch = writeBatch(db);
            chunk.forEach(art => {
              if (!art.id) {
                  console.warn('Skipping item with missing ID:', art);
                  return;
              }
              // Sanitize data before saving
              const safeArt = sanitizeForFirestore(art);
              batch.set(doc(artworksCollection, art.id), safeArt);
            });

            await batch.commit();
            successCount += chunk.length;
            console.log(`Batch ${Math.floor(i / chunkSize) + 1} committed successfully. (${successCount}/${itemsToSync.length})`);
            
          } catch (batchError) {
            console.error(`Batch ${Math.floor(i / chunkSize) + 1} failed. Retrying items individually...`, batchError);
            
            // Fallback: Try saving items individually if batch fails
            for (const art of chunk) {
                try {
                    if (!art.id) continue;
                    const safeArt = sanitizeForFirestore(art);
                    await setDoc(doc(artworksCollection, art.id), safeArt);
                    successCount++;
                    console.log(`Recovered: Saved item ${art.id} individually`);
                } catch (singleError) {
                    console.error(`Failed to save item ${art.id}`, singleError);
                    failCount++;
                }
            }
          }
        }
        
        const summaryMsg = `Import Processed: ${successCount} saved, ${failCount} failed.`;
        console.log(summaryMsg);
        
        if (failCount > 0) {
            pushNotification('Import Warning', `Import complete but ${failCount} items could not be saved. ${successCount} saved successfully.`, 'inventory');
        } else {
            console.log('All bulk import batches synced to Firestore');
            pushNotification('Sync Complete', `Successfully uploaded ${successCount} items to database.`, 'system');
        }

      } catch (error) {
        console.error('Critical error during Firestore sync', error);
        pushNotification('Sync Error', 'Critical error saving imported items. Please check console.', 'inventory');
      }
  };

  const handleBulkSale = async (ids: string[], client: string, delivered: boolean) => {
     const agentName = currentUser?.name || 'Unknown';
     const { updatedArtworks, newSales } = buildBulkSale(artworks, ids, client, agentName, delivered);

     setSales(prev => [...prev, ...newSales]);
     setArtworks(updatedArtworks);
     
     ids.forEach(id => logActivity(id, 'Sale Declared (Bulk)', `Sold to ${client}${delivered ? ' (Delivered)' : ''}`));
     pushNotification('Bulk Sale', `${ids.length} items sold to ${client}.`, 'sales');
     try {
       const artworksCollection = collection(db, 'artworks');
       const salesCollection = collection(db, 'sales');
       const batch = writeBatch(db);
       ids.forEach(id => {
        const art = updatedArtworks.find(a => a.id === id);
         if (!art) return;
         const updatedStatus = delivered ? ArtworkStatus.DELIVERED : ArtworkStatus.SOLD;
         const updated = { ...art, status: updatedStatus };
         batch.set(doc(artworksCollection, id), sanitizeForFirestore(updated), { merge: true });
       });
       newSales.forEach(sale => {
         batch.set(doc(salesCollection, sale.id), sanitizeForFirestore(sale));
       });
       await batch.commit();
    } catch (error) {
      console.error('Error syncing bulk sale to Firestore', error);
    }
  };

  const handleCancelSale = (id: string) => {
    const { updatedArtworks, updatedSales } = applyCancelSale(artworks, sales, id);
    setArtworks(updatedArtworks);
    setSales(updatedSales);
    
    const artTitle = artworks.find(a => a.id === id)?.title || 'Artwork';
    logActivity(id, 'Sale Cancelled', 'Client decided not to proceed');
    pushNotification('Sale Cancelled', `Transaction for "${artTitle}" was reversed.`, 'sales', id);

    (async () => {
      try {
        const artworksCollection = collection(db, 'artworks');
        const art = updatedArtworks.find(a => a.id === id);
        const salesCollection = collection(db, 'sales');
        if (art) {
          await setDoc(doc(artworksCollection, id), art, { merge: true });
        }
        const saleRecord = updatedSales.find(s => s.artworkId === id);
        if (saleRecord) {
          await setDoc(doc(salesCollection, saleRecord.id), saleRecord, { merge: true });
        }
      } catch (error) {
        console.error('Error syncing sale cancellation to Firestore', error);
      }
    })();
  };

  const handleDeleteArtwork = async (id: string) => {
    // Preserve sales records by snapshotting artwork data before deletion
    const artworkToDelete = artworks.find(a => a.id === id);
    const associatedSales = sales.filter(s => s.artworkId === id);

    // Update local sales with snapshot if missing
    if (artworkToDelete) {
        setSales(prev => prev.map(s => {
            if (s.artworkId === id && !s.artworkSnapshot) {
                return {
                    ...s,
                    artworkSnapshot: {
                        title: artworkToDelete.title,
                        artist: artworkToDelete.artist,
                        code: artworkToDelete.code,
                        imageUrl: artworkToDelete.imageUrl,
                        price: artworkToDelete.price,
                        currentBranch: artworkToDelete.currentBranch,
                        medium: artworkToDelete.medium,
                        dimensions: artworkToDelete.dimensions,
                        year: artworkToDelete.year
                    }
                };
            }
            return s;
        }));
    }

    setArtworks(prev => prev.filter(a => a.id !== id));
    // DO NOT delete sales from state

    logActivity(id, 'Deleted', 'Permanently removed from inventory');
    pushNotification('Artwork Deleted', 'Artwork was permanently removed.', 'inventory');
    setActiveTab('inventory');
    setSelectedArtworkId(null);
    
    try {
      const artworksCollection = collection(db, 'artworks');
      const salesCollection = collection(db, 'sales');
      const batch = writeBatch(db);

      batch.delete(doc(artworksCollection, id));
      
      // Update associated sales records with snapshot in Firestore
      if (artworkToDelete) {
          associatedSales.forEach(sale => {
              if (!sale.artworkSnapshot) {
                  const updatedSale = {
                      ...sale,
                      artworkSnapshot: {
                        title: artworkToDelete.title,
                        artist: artworkToDelete.artist,
                        code: artworkToDelete.code,
                        imageUrl: artworkToDelete.imageUrl,
                        price: artworkToDelete.price,
                        currentBranch: artworkToDelete.currentBranch,
                        medium: artworkToDelete.medium,
                        dimensions: artworkToDelete.dimensions,
                        year: artworkToDelete.year
                      }
                  };
                  batch.set(doc(salesCollection, sale.id), sanitizeForFirestore(updatedSale), { merge: true });
              }
          });
      }

      await batch.commit();
    } catch (error) {
      console.error('Error deleting artwork from Firestore', error);
      pushNotification('Delete Error', 'Failed to delete artwork from database.', 'system');
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    // Preserve sales records by snapshotting artwork data before deletion
    const artworksToDelete = artworks.filter(a => ids.includes(a.id));
    
    // Update local sales with snapshot
    setSales(prev => prev.map(s => {
        if (ids.includes(s.artworkId) && !s.artworkSnapshot) {
            const art = artworksToDelete.find(a => a.id === s.artworkId);
            if (art) {
                return {
                    ...s,
                    artworkSnapshot: {
                        title: art.title,
                        artist: art.artist,
                        code: art.code,
                        imageUrl: art.imageUrl,
                        price: art.price,
                        currentBranch: art.currentBranch,
                        medium: art.medium,
                        dimensions: art.dimensions,
                        year: art.year
                    }
                };
            }
        }
        return s;
    }));

    setArtworks(prev => prev.filter(a => !ids.includes(a.id)));
    // DO NOT delete sales from state

    ids.forEach(id => logActivity(id, 'Deleted', 'Removed from inventory via bulk action'));
    pushNotification('Items Deleted', `${ids.length} items were removed from inventory.`, 'inventory');
    try {
      const artworksCollection = collection(db, 'artworks');
      const salesCollection = collection(db, 'sales');
      const batch = writeBatch(db);

      ids.forEach(id => {
        batch.delete(doc(artworksCollection, id));
      });
      
      // Update associated sales records with snapshot in Firestore
      const associatedSales = sales.filter(s => ids.includes(s.artworkId));
      associatedSales.forEach(sale => {
         if (!sale.artworkSnapshot) {
             const art = artworksToDelete.find(a => a.id === sale.artworkId);
             if (art) {
                 const updatedSale = {
                     ...sale,
                     artworkSnapshot: {
                       title: art.title,
                       artist: art.artist,
                       code: art.code,
                       imageUrl: art.imageUrl,
                       price: art.price,
                       currentBranch: art.currentBranch,
                       medium: art.medium,
                       dimensions: art.dimensions,
                       year: art.year
                     }
                 };
                 batch.set(doc(salesCollection, sale.id), sanitizeForFirestore(updatedSale), { merge: true });
             }
         }
      });

      await batch.commit();
    } catch (error) {
      console.error('Error syncing bulk delete to Firestore', error);
    }
  };

  const handleBulkReserve = async (ids: string[], details: string) => {
     setArtworks(prev => prev.map(a => ids.includes(a.id) ? { ...a, status: ArtworkStatus.RESERVED, remarks: details } : a));

     const updatedEvents = applyBulkReserveEvent(events, ids, details, 'Main Gallery');
     setEvents(updatedEvents);

     ids.forEach(id => logActivity(id, 'Reserved (Bulk)', details));
     pushNotification('Bulk Reserve', `${ids.length} items reserved for ${details}.`, 'inventory');
     try {
       const artworksCollection = collection(db, 'artworks');
       const eventsCollection = collection(db, 'events');
       const batch = writeBatch(db);
       ids.forEach(id => {
         const art = artworks.find(a => a.id === id);
         if (!art) return;
         const updated = { ...art, status: ArtworkStatus.RESERVED, remarks: details };
         batch.set(doc(artworksCollection, id), sanitizeForFirestore(updated), { merge: true });
       });
       updatedEvents.forEach(event => {
         batch.set(doc(eventsCollection, event.id), sanitizeForFirestore(event), { merge: true });
       });
       await batch.commit();
     } catch (error) {
       console.error('Error syncing bulk reserve to Firestore', error);
     }
  };

  const handleBulkDeleteSales = async (ids: string[]) => {
    setSales(prev => prev.filter(s => !ids.includes(s.id)));
    pushNotification('Sales Deleted', `${ids.length} sales records removed.`, 'sales');
    try {
      const salesCollection = collection(db, 'sales');
      const batch = writeBatch(db);
      ids.forEach(id => {
        batch.delete(doc(salesCollection, id));
      });
      await batch.commit();
    } catch (error) {
      console.error('Error deleting sales in Firestore', error);
    }
  };

  const handleBulkUpdateArtworks = async (ids: string[], updates: Partial<Artwork>) => {
    const destBranch = updates.currentBranch;
    const isDestExclusive = destBranch && exclusiveBranches.includes(destBranch);

    const updatedArtworks = artworks.map(art => {
      if (!ids.includes(art.id)) return art;
      
      let newStatus = art.status;
      
      if (destBranch) {
        if (isDestExclusive) {
          // Moving TO Exclusive: Force View Only
          newStatus = ArtworkStatus.EXCLUSIVE_VIEW_ONLY;
        } else if (art.status === ArtworkStatus.EXCLUSIVE_VIEW_ONLY) {
          // Moving TO Standard from Exclusive: Revert to Available
          newStatus = ArtworkStatus.AVAILABLE;
        }
      }

      return { ...art, ...updates, status: newStatus };
    });

    setArtworks(updatedArtworks);

    ids.forEach(id => {
      const art = updatedArtworks.find(a => a.id === id);
      logActivity(id, updates.currentBranch ? 'Transferred' : 'Status Updated', updates.currentBranch ? `To ${updates.currentBranch}` : '');
      if (updates.currentBranch) {
        pushNotification('Bulk Transfer', `"${art?.title}" moved to ${updates.currentBranch}.`, 'inventory');
      }
    });

    if (IS_DEMO_MODE) return;
    try {
      const artworksCollection = collection(db, 'artworks');
      const batch = writeBatch(db);
      updatedArtworks
        .filter(a => ids.includes(a.id))
        .forEach(art => {
          batch.set(doc(artworksCollection, art.id), sanitizeForFirestore(art), { merge: true });
        });
      await batch.commit();
    } catch (error) {
      console.error('Error syncing bulk update to Firestore', error);
    }
  };

  const handleUpdateArtwork = async (id: string, updates: Partial<Artwork>) => {
    const existing = artworks.find(a => a.id === id);
    
    // Check for branch change and Exclusive status logic
    let newStatus = updates.status || existing?.status || ArtworkStatus.AVAILABLE;
    if (existing && updates.currentBranch && updates.currentBranch !== existing.currentBranch) {
       if (exclusiveBranches.includes(updates.currentBranch)) {
         newStatus = ArtworkStatus.EXCLUSIVE_VIEW_ONLY;
       } else if (existing.status === ArtworkStatus.EXCLUSIVE_VIEW_ONLY) {
         newStatus = ArtworkStatus.AVAILABLE;
       }
    }

    const updated = existing ? { ...existing, ...updates, status: newStatus } : undefined;
    if (!updated) return;
    setArtworks(prev => prev.map(a => a.id === id ? updated : a));
    logActivity(id, 'Metadata Updated');
    pushNotification('Metadata Updated', `The record for "${existing?.title}" was edited by ${userRole}.`, 'inventory', id);
    if (IS_DEMO_MODE) return;
    try {
      const artworksCollection = collection(db, 'artworks');
      await setDoc(doc(artworksCollection, id), sanitizeForFirestore(updated));

    } catch (error) {
      console.error('Error syncing artwork update to Firestore', error);
    }
  };

  const handleReserveArtwork = async (id: string, details: string) => {
    const art = artworks.find(a => a.id === id);
    if (!art) return;
    const updatedArt = { ...art, status: ArtworkStatus.RESERVED, remarks: details };
    setArtworks(prev => prev.map(a => a.id === id ? updatedArt : a));

    const updatedEvents = linkArtworkToEventOnReserve(
      events,
      (art.currentBranch as Branch) || 'Main Gallery',
      id,
      details
    );
    setEvents(updatedEvents);

    logActivity(id, 'Reserved', details);
    pushNotification('Artwork Reserved', `"${art?.title}" is now reserved. Details: ${details.split('|')[0]}`, 'inventory', id);
    try {
      const artworksCollection = collection(db, 'artworks');
      const eventsCollection = collection(db, 'events');
      await setDoc(doc(artworksCollection, id), sanitizeForFirestore(updatedArt), { merge: true });
      const batch = writeBatch(db);
      updatedEvents.forEach(event => {
        batch.set(doc(eventsCollection, event.id), sanitizeForFirestore(event), { merge: true });
      });
      await batch.commit();
    } catch (error) {
      console.error('Error syncing reservation to Firestore', error);
    }
  };

  const handleAddEvent = (eventData: Partial<ExhibitionEvent>) => {
    const newEvent: ExhibitionEvent = {
      id: Math.random().toString(36).substr(2, 9),
      title: eventData.title || 'New Exhibition',
      location: eventData.location || 'Main Gallery',
      startDate: eventData.startDate || new Date().toISOString().split('T')[0],
      endDate: eventData.endDate || new Date().toISOString().split('T')[0],
      status: EventStatus.UPCOMING,
      artworkIds: eventData.artworkIds || [],
      type: eventData.type || 'Exhibition'
    };
    setEvents(prev => [...prev, newEvent]);
    pushNotification(
        eventData.type === 'Auction' ? 'Auction Scheduled' : 'Exhibition Published', 
        `"${newEvent.title}" at ${newEvent.location} has been registered.`, 
        'system'
    );
    (async () => {
      try {
        const eventsCollection = collection(db, 'events');
        await setDoc(doc(eventsCollection, newEvent.id), newEvent);
      } catch (error) {
        console.error('Error saving event to Firestore', error);
      }
    })();
  };

  const handleUpdateEvent = (id: string, updates: Partial<ExhibitionEvent>) => {
    const existing = events.find(e => e.id === id);
    if (!existing) return;
    const updatedEvent: ExhibitionEvent = { ...existing, ...updates };
    setEvents(prev => prev.map(e => e.id === id ? updatedEvent : e));
    pushNotification('Exhibition Updated', `Details for an exhibition were modified.`, 'system');
  };

  const handleDeleteEvent = (id: string) => {
    const event = events.find(e => e.id === id);
    setEvents(prev => prev.filter(e => e.id !== id));
    pushNotification('Exhibition Removed', `"${event?.title}" was deleted from the schedule.`, 'system');
    (async () => {
      try {
        const eventsCollection = collection(db, 'events');
        await deleteDoc(doc(eventsCollection, id));
      } catch (error) {
        console.error('Error deleting event from Firestore', error);
      }
    })();
  };

  const handleReturnArtwork = async (id: string, reason: string, referenceNumber?: string, proofImage?: string, notes?: string) => {
    const artwork = artworks.find(a => a.id === id);
    if (!artwork) return;

    const returnRecord: ReturnRecord = {
      id: Math.random().toString(36).substr(2, 9),
      artworkId: id,
      artworkSnapshot: artwork,
      reason,
      returnedBy: currentUser?.name || 'Unknown',
      returnDate: new Date().toISOString(),
      referenceNumber,
      proofImage,
      notes
    };

    // Update State
    setReturnRecords(prev => [returnRecord, ...prev]);
    setArtworks(prev => prev.filter(a => a.id !== id));
    
    // Preserve sales records by snapshotting artwork data
    setSales(prev => prev.map(s => {
      if (s.artworkId === id && !s.artworkSnapshot) {
        return {
          ...s,
          artworkSnapshot: returnRecord.artworkSnapshot
        };
      }
      return s;
    }));

    logActivity(id, 'Returned to Artist', `Reason: ${reason}${referenceNumber ? ` | Ref: ${referenceNumber}` : ''}`);
    pushNotification('Artwork Returned', `"${artwork.title}" has been returned to the artist.`, 'inventory');

    // Sync to Firestore
    try {
      const batch = writeBatch(db);
      
      // Save return record
      const returnsCollection = collection(db, 'returns');
      batch.set(doc(returnsCollection, returnRecord.id), sanitizeForFirestore(returnRecord));

      // Delete artwork
      const artworksCollection = collection(db, 'artworks');
      batch.delete(doc(artworksCollection, id));

      // Update associated sales
      const salesCollection = collection(db, 'sales');
      const associatedSales = sales.filter(s => s.artworkId === id);
      associatedSales.forEach(sale => {
        if (!sale.artworkSnapshot) {
           const updatedSale = {
             ...sale,
             artworkSnapshot: returnRecord.artworkSnapshot
           };
           batch.set(doc(salesCollection, sale.id), sanitizeForFirestore(updatedSale), { merge: true });
        }
      });

      await batch.commit();
    } catch (error) {
      console.error('Error syncing return to Firestore', error);
      pushNotification('Return Error', 'Failed to save return record to database.', 'system');
    }
  };

  const handleUpdateReturnRecord = async (id: string, updates: Partial<ReturnRecord>) => {
    const existing = returnRecords.find(r => r.id === id);
    if (!existing) return;

    const updated = { ...existing, ...updates };
    setReturnRecords(prev => prev.map(r => r.id === id ? updated : r));
    
    // Log changes
    const changes: string[] = [];
    if (updates.referenceNumber !== undefined && updates.referenceNumber !== existing.referenceNumber) {
        changes.push(`Ref: ${updates.referenceNumber}`);
    }
    if (updates.proofImage !== undefined && updates.proofImage !== existing.proofImage) {
        changes.push('Proof Image Updated');
    }

    if (changes.length > 0) {
        logActivity(existing.artworkId, 'Return Updated', changes.join(' | '));
        pushNotification('Return Updated', `Return details updated for "${existing.artworkSnapshot.title}"`, 'inventory');
    }

    if (IS_DEMO_MODE) return;
    try {
      const returnsCollection = collection(db, 'returns');
      await setDoc(doc(returnsCollection, id), sanitizeForFirestore(updated), { merge: true });
    } catch (error) {
      console.error('Error syncing return record update to Firestore', error);
    }
  };

  const handleViewArtwork = (id: string) => {
    setSelectedArtworkId(id);
    setMasterViewReturnTarget({
      tab: activeTab,
      operationsView: activeTab === 'operations' ? operationsView : undefined
    });
    setActiveTab('master-view');
  };
  
  const handleAddMonitoringEntry = (entry: Omit<MonitoringEntry, 'id'>) => {
    const newEntry: MonitoringEntry = { ...entry, id: Math.random().toString(36).substr(2, 9) };
    setMonitoringEntries(prev => [newEntry, ...prev]);
    (async () => {
      try {
        const monitoringCollection = collection(db, 'monitoring');
        await setDoc(doc(monitoringCollection, newEntry.id), newEntry);
      } catch (error) {
        console.error('Error saving monitoring entry to Firestore', error);
      }
    })();
  };
  const handleUpdateMonitoringEntry = (id: string, updates: Partial<MonitoringEntry>) => {
    setMonitoringEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    (async () => {
      try {
        const monitoringCollection = collection(db, 'monitoring');
        await setDoc(doc(monitoringCollection, id), updates, { merge: true });
      } catch (error) {
        console.error('Error updating monitoring entry in Firestore', error);
      }
    })();
  };
  const handleDeleteMonitoringEntry = (id: string) => {
    setMonitoringEntries(prev => prev.filter(e => e.id !== id));
    (async () => {
      try {
        const monitoringCollection = collection(db, 'monitoring');
        await deleteDoc(doc(monitoringCollection, id));
      } catch (error) {
        console.error('Error deleting monitoring entry from Firestore', error);
      }
    })();
  };

  const handleNavigateFromStat = (target: 'inventory' | 'sales' | 'operations') => {
    if (target === 'inventory') {
       setActiveTab('inventory');
    } else if (target === 'sales') {
        setActiveTab('sales-history');
    } else if (target === 'operations') {
        setActiveTab('operations');
    }
  };

  // Login Screen Condition
  if (!currentUser) {
    return <LoginPage accounts={accounts} onLogin={handleLogin} />;
  }

  // Router Content
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard 
          artworks={artworks} 
          sales={sales} 
          events={events} 
          accounts={accounts}
          onSelectArt={handleViewArtwork} 
          onManageEvents={() => {
            setOperationsView('events');
            setActiveTab('operations');
          }}
          onNavigateFromStat={handleNavigateFromStat}
          currentUser={currentUser}
        />;
      case 'analytics':
        return <AnalyticsPage 
          artworks={artworks} 
          sales={sales}
          logs={logs}
          events={events}
          audits={audits}
          onConfirmAudit={handleConfirmAudit}
          userRole={userRole}
          permissions={currentPermissions}
        />;
      case 'sales-history':
        return <SalesRecordPage 
          sales={sales} 
          artworks={artworks} 
          onBulkDelete={handleBulkDeleteSales}
          canExport={currentPermissions.canViewSalesHistory}
          canDelete={userRole === UserRole.ADMIN}
          onCancelSale={handleCancelSale}
        />;
      case 'operations':
        const canAccessOperations = currentPermissions.accessibleTabs 
          ? currentPermissions.accessibleTabs.includes('operations')
          : (userRole === UserRole.ADMIN || userRole === UserRole.INVENTORY_PERSONNEL);

        if (!canAccessOperations) {
          return <Dashboard 
            artworks={artworks} 
            sales={sales} 
            events={events} 
            accounts={accounts}
            onSelectArt={handleViewArtwork} 
            onManageEvents={() => {}} // Disable navigation to operations
            onNavigateFromStat={handleNavigateFromStat} 
          />;
        }
        return <GalleryManagementPage 
          events={events}
          artworks={artworks}
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
          monitoringEntries={monitoringEntries}
          onAddMonitoringEntry={handleAddMonitoringEntry}
          onUpdateMonitoringEntry={handleUpdateMonitoringEntry}
          onDeleteMonitoringEntry={handleDeleteMonitoringEntry}
          onView={handleViewArtwork}
          returnRecords={returnRecords}
          canAdd={canPerform.add}
          onAddArtwork={handleAddArtwork}
          onEditArtwork={handleUpdateArtwork}
          onBulkAddArtworks={handleBulkAddArtworks}
          onBulkUpdateArtworks={handleBulkUpdateArtworks}
          onBulkSale={handleBulkSale}
          onBulkDeleteArtworks={handleBulkDelete}
          onBulkReserveArtworks={handleBulkReserve}
          onUpdateReturnRecord={handleUpdateReturnRecord}
          preventDuplicates={preventDuplicateImports}
          importedFilenames={importLogs.map(l => l.filename)}
          initialTab={operationsView}
          onNavigate={(tab) => setOperationsView(tab)}
          userPermissions={currentPermissions}
        />;
      case 'galleria':
        return <GalleriaPage 
          events={events}
          artworks={artworks}
          branches={branches}
          branchAddresses={branchAddresses}
          monitoringEntries={monitoringEntries}
          sales={sales}
          onView={handleViewArtwork}
        />;
      case 'import-history':
        const canAccessImport = currentPermissions.accessibleTabs
          ? currentPermissions.accessibleTabs.includes('import-history')
          : (userRole === UserRole.ADMIN || userRole === UserRole.INVENTORY_PERSONNEL);

        if (!canAccessImport) return <Dashboard 
          artworks={artworks} 
          sales={sales} 
          events={events} 
          accounts={accounts}
          onSelectArt={handleViewArtwork} 
          onManageEvents={() => setActiveTab('operations')} 
          onNavigateFromStat={handleNavigateFromStat} 
        />;
        return (
          <ImportHistoryPage 
            logs={importLogs} 
            preventDuplicates={preventDuplicateImports}
            onTogglePreventDuplicates={(val) => {
              setPreventDuplicateImports(val);
              (async () => {
                if (IS_DEMO_MODE) return;
                try {
                  const settingsCollection = collection(db, 'settings');
                  await setDoc(doc(settingsCollection, 'webapp'), { preventDuplicateImports: val }, { merge: true });
                } catch (error) {
                  console.error('Error saving settings to Firestore', error);
                }
              })();
            }}
          />
        );
      case 'snapshots':
        const canAccessSnapshots = currentPermissions.accessibleTabs
          ? currentPermissions.accessibleTabs.includes('snapshots')
          : (userRole === UserRole.ADMIN || userRole === UserRole.INVENTORY_PERSONNEL);

        if (!canAccessSnapshots) return <Dashboard 
          artworks={artworks} 
          sales={sales} 
          events={events} 
          accounts={accounts}
          onSelectArt={handleViewArtwork} 
          onManageEvents={() => setActiveTab('operations')} 
          onNavigateFromStat={handleNavigateFromStat} 
        />;
        return <TimeMachinePage artworks={artworks} sales={sales} logs={logs} onViewArtwork={handleViewArtwork} />;
      case 'artwork-transfer':
        return (
          <ArtworkTransfer
            requests={transferRequests}
            artworks={artworks}
            currentUser={currentUser}
            onAccept={handleAcceptTransfer}
          onDecline={handleDeclineTransfer}
          onHold={handleHoldTransfer}
          branches={branches}
          onViewArtwork={handleViewArtwork}
        />
        );
      case 'inventory':
        return (
          <Inventory 
            artworks={artworks} 
            branches={branches}
            onView={handleViewArtwork} 
            permissions={currentPermissions}
            onAdd={handleAddArtwork}
            onBulkAdd={handleBulkAddArtworks}
            onAddBranch={handleAddBranch}
            onEdit={handleUpdateArtwork}
            onBulkSale={handleBulkSale}
            onBulkDelete={handleBulkDelete}
            onBulkReserve={handleBulkReserve}
            events={events}
            preventDuplicates={preventDuplicateImports}
            importedFilenames={importLogs.map(l => l.filename)}
            sales={sales}
            onBulkUpdate={handleBulkUpdateArtworks}
            onBulkTransferRequest={handleCreateTransferRequest}
          />
        );
      case 'events':
        // Redirect to operations
        setActiveTab('operations');
        return null;
      case 'master-view':
        const selectedArt = artworks.find(a => a.id === selectedArtworkId);
        return selectedArt ? (
          <MasterView 
            artwork={selectedArt} 
            branches={branches}
            logs={logs.filter(l => l.artworkId === selectedArt.id)}
            sale={sales.find(s => s.artworkId === selectedArt.id)}
            userRole={userRole}
            userPermissions={currentPermissions}
            events={events}
            onReturn={handleReturnArtwork}
            onDelete={handleDeleteArtwork}
            onTransfer={(id, dest) => {
              handleCreateTransferRequest([id], dest);
            }}
            onReserve={handleReserveArtwork}
            onSale={(id, client) => {
              const agentName = currentUser.name;
              const { updatedArtworks, newSale } = applySingleSale(artworks, id, client, agentName);
              if (!newSale) return;
              setSales(prev => [...prev, newSale]);
              setArtworks(updatedArtworks);
              logActivity(id, 'Sale Declared', `Sold to ${client}`);
              pushNotification('New Sale Declared', `"${selectedArt.title}" sold to ${client}. Check sales ledger for details.`, 'sales', id);
              (async () => {
                try {
                  const artworksCollection = collection(db, 'artworks');
                  const art = updatedArtworks.find(a => a.id === id);
                  const salesCollection = collection(db, 'sales');
                  if (art) {
                    await setDoc(doc(artworksCollection, id), art, { merge: true });
                  }
                  await setDoc(doc(salesCollection, newSale.id), newSale);
                } catch (error) {
                  console.error('Error syncing sale to Firestore', error);
                }
              })();
            }}
            onCancelSale={handleCancelSale}
            onDeliver={(id) => {
              const { updatedArtworks, updatedSales } = applyDelivery(artworks, sales, id);
              setArtworks(updatedArtworks);
              setSales(updatedSales);
              logActivity(id, 'Delivered', 'Finalized delivery to client');
              pushNotification('Delivery Confirmed', `"${selectedArt.title}" has been successfully delivered to the client.`, 'sales', id);
              (async () => {
                try {
                  const artworksCollection = collection(db, 'artworks');
                  const art = updatedArtworks.find(a => a.id === id);
                  const salesCollection = collection(db, 'sales');
                  if (art) {
                    await setDoc(doc(artworksCollection, id), art, { merge: true });
                  }
                  const saleRecord = updatedSales.find(s => s.artworkId === id);
                  if (saleRecord) {
                    await setDoc(doc(salesCollection, saleRecord.id), saleRecord, { merge: true });
                  }
                } catch (error) {
                  console.error('Error syncing delivery to Firestore', error);
                }
              })();
            }}
            onEdit={(updates) => handleUpdateArtwork(selectedArt.id, updates)}
            onBack={() => {
              if (masterViewReturnTarget) {
                setActiveTab(masterViewReturnTarget.tab);
                if (masterViewReturnTarget.tab === 'operations' && masterViewReturnTarget.operationsView) {
                  setOperationsView(masterViewReturnTarget.operationsView);
                }
              } else {
                handleNavigateFromStat('inventory');
              }
            }}
          />
        ) : <Dashboard 
          artworks={artworks} 
          sales={sales} 
          events={events} 
          onSelectArt={handleViewArtwork} 
          onManageEvents={() => setActiveTab('operations')} 
          onNavigateFromStat={handleNavigateFromStat}
        />;
      case 'accounts':
        const canAccessAccounts = currentPermissions.accessibleTabs
          ? currentPermissions.accessibleTabs.includes('accounts')
          : currentPermissions.canManageAccounts;

        if (!canAccessAccounts) return <Dashboard 
          artworks={artworks} 
          sales={sales} 
          events={events} 
          onSelectArt={handleViewArtwork} 
          onManageEvents={() => setActiveTab('operations')} 
          onNavigateFromStat={handleNavigateFromStat} 
        />;
        return <AccountManagement 
          accounts={accounts} 
          branches={branches}
          onAddAccount={handleAddAccount}
          onUpdateStatus={handleUpdateAccountStatus}
          onUpdateAccount={handleUpdateAccount}
        />;
      case 'audit-logs':
        return <AuditLogsPage logs={logs} artworks={artworks} onViewArtwork={handleViewArtwork} />;
      default:
        return <Dashboard 
          artworks={artworks} 
          sales={sales} 
          events={events} 
          accounts={accounts}
          onSelectArt={handleViewArtwork} 
          onManageEvents={() => setActiveTab('operations')}
          onNavigateFromStat={handleNavigateFromStat} 
        />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            userRole={userRole}
            userPermissions={currentPermissions}
            onOpenOperationsBranches={() => setOperationsView('branches')}
          />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          userRole={userRole} 
          setUserRole={() => {}}
          activeTab={activeTab} 
          notifications={notifications}
          onMarkRead={handleMarkNotificationsRead}
          onLogout={handleLogout}
          onViewProfile={() => setShowProfile(true)}
          userName={currentUser.name}
          onBackToDashboard={() => setActiveTab('dashboard')}
          artworks={artworks}
          onViewArtwork={handleViewArtwork}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {renderContent()}
        </main>
      </div>

      {showProfile && (
        <ProfileModal 
          user={currentUser} 
          logs={logs.filter(l => l.user === currentUser.name)}
          salesCount={sales.filter(s => s.agentName === currentUser.name).length}
          inventoryCount={logs.filter(l => l.user === currentUser.name && l.action === 'Created').length}
          onClose={() => setShowProfile(false)} 
        />
      )}
    </div>
  );
};

export default App;
