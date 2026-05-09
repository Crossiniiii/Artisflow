
import React, { useEffect, useState, useMemo } from 'react';
import { UserRole, UserPermissions } from '../types';
import { ICONS, getDefaultAccessibleTabs } from '../constants';
import {
  BarChart3,
  ShieldEllipsis,
  FileSpreadsheet,
  History,
  Settings2,
  ArrowRightLeft,
  ShieldCheck,
  Sparkles,
  Package,
  CreditCard,
  MessageSquare,
  ChevronRight,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: UserRole;
  userPermissions?: UserPermissions;
  onOpenOperationsBranches?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  sales?: any[];
  currentUser?: any;
  transferRequests?: any[];
  returnRecords?: any[];
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  color?: string;
  groupId: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, userRole, userPermissions, onOpenOperationsBranches, isOpen = false, onClose, sales = [], currentUser, transferRequests = [], returnRecords = [] }) => {
  const menuGroups = [
    { id: 'main', label: 'Main' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'sales', label: 'Sales' },
    { id: 'management', label: 'Management' },
    { id: 'logs', label: 'Logs' }
  ];

  const allMenuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard />, groupId: 'main' },
    { id: 'finance', label: 'Finance', icon: <CreditCard />, groupId: 'inventory' },
    { id: 'analytics', label: 'Inventory Insights', icon: <BarChart3 />, groupId: 'inventory' },
    { id: 'artwork-transfer', label: 'Artwork T/R', icon: <ArrowRightLeft />, groupId: 'inventory' },
    { id: 'snapshots', label: 'Artwork Timeline', icon: <History />, groupId: 'inventory' },
    { id: 'approvals', label: 'Approvals', icon: <ShieldCheck />, groupId: 'sales' },
    { id: 'delivery-requests', label: 'Delivery Requests', icon: ICONS.Truck, groupId: 'sales' },
    { id: 'requests', label: 'My Requests', icon: <MessageSquare />, groupId: 'sales' },
    { id: 'sales-history', label: 'Sales History', icon: ICONS.Sales, groupId: 'sales' },
    { id: 'deliveries', label: 'Deliveries', icon: ICONS.Truck, groupId: 'sales' },
    { id: 'operations', label: 'Gallery Operations', icon: <Settings2 />, groupId: 'management' },
    { id: 'accounts', label: 'User Accounts', icon: ICONS.Users, groupId: 'management' },
    { id: 'chat', label: 'Inbox & Messaging', icon: ICONS.Chat, groupId: 'management' },
    { id: 'audit-logs', label: 'System Audit Logs', icon: <ShieldEllipsis />, groupId: 'logs' },
    { id: 'import-history', label: 'Import History', icon: <FileSpreadsheet />, groupId: 'logs' }
  ];

  // Determine which tabs are visible based on granular permissions or role defaults
  let visibleTabIds = userPermissions?.accessibleTabs !== undefined
    ? userPermissions.accessibleTabs
    : getDefaultAccessibleTabs(userRole);

  // Ensure visibleTabIds is an array to prevent crashes with .includes
  if (!Array.isArray(visibleTabIds)) {
    visibleTabIds = getDefaultAccessibleTabs(userRole);
  }

  let menuItems = allMenuItems.filter(item => visibleTabIds.includes(item.id));

  // Legacy quirk removed: We now automatically hide Inventory if Operations is present to avoid redundancy.

  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const storageKey = `sidebar-order-${userRole}`;
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const hiddenStorageKey = 'sidebar-hidden-tabs';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const loadHidden = () => {
      const raw = window.localStorage.getItem(hiddenStorageKey);
      if (!raw) {
        const initial = ['analytics'];
        window.localStorage.setItem(hiddenStorageKey, JSON.stringify(initial));
        setHiddenIds(initial);
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setHiddenIds(parsed);
        else setHiddenIds([]);
      } catch {
        setHiddenIds([]);
      }
    };
    loadHidden();
    const handler = () => loadHidden();
    window.addEventListener('artisflow-hidden-tabs-changed', handler as any);
    return () => window.removeEventListener('artisflow-hidden-tabs-changed', handler as any);
  }, [hiddenStorageKey]);

  menuItems = menuItems.filter(item => !hiddenIds.includes(item.id));

  useEffect(() => {
    let menuIds = menuItems.map(item => item.id);
    let storedOrder: string[] | null = null;
    if (typeof window !== 'undefined') {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        try {
          storedOrder = JSON.parse(raw);
        } catch {
          storedOrder = null;
        }
      }
    }
    let nextOrder = storedOrder ? storedOrder.filter(id => menuIds.includes(id)) : menuIds;
    menuIds.forEach(id => {
      if (!nextOrder.includes(id)) {
        nextOrder = [...nextOrder, id];
      }
    });
    setOrderedIds(nextOrder);
  }, [storageKey, menuItems.length]);

  const orderedMenuItems = useMemo(() => {
    return (orderedIds.length > 0 ? orderedIds : menuItems.map(m => m.id))
      .map(id => menuItems.find(item => item.id === id))
      .filter((item): item is MenuItem => item !== undefined);
  }, [orderedIds, menuItems]);

  const persistOrder = (order: string[]) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, JSON.stringify(order));
    }
  };

  const handleDragStart = (id: string) => {
    setDraggingId(id);
  };

  const handleDragOver = (event: React.DragEvent<HTMLButtonElement>, overId: string) => {
    event.preventDefault();
    if (!draggingId || draggingId === overId) return;
    setOrderedIds(prev => {
      const current = [...prev];
      const fromIndex = current.indexOf(draggingId);
      const toIndex = current.indexOf(overId);
      if (fromIndex === -1 || toIndex === -1) return current;
      current.splice(fromIndex, 1);
      current.splice(toIndex, 0, draggingId);
      persistOrder(current);
      return current;
    });
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  return (
    <aside className={`
      w-64 max-[1512px]:w-56 bg-white border-r border-neutral-200 text-neutral-900 flex flex-col h-full
      fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
      ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
    `}>
      {/* Brand Header */}
      <div className="px-7 py-8">
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-neutral-200 group-hover:scale-105 transition-transform duration-300">
            GJ
          </div>
          <div>
            <h1 className="text-sm font-black tracking-widest text-neutral-900 uppercase">Galerie Joaquin</h1>
            <p className="text-[10px] text-neutral-400 font-bold tracking-[0.2em] uppercase mt-0.5">Art Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-5 space-y-9 overflow-y-auto custom-scrollbar pb-10">
        {menuGroups.map((group) => {
          const groupItems = orderedMenuItems.filter((item): item is MenuItem => item.groupId === group.id);
          if (groupItems.length === 0) return null;

          return (
            <div key={group.id} className="space-y-3">
              <h3 className="px-3 text-[10px] font-black text-neutral-400 uppercase tracking-[0.3em]">
                {group.label}
              </h3>
              <div className="space-y-1.5">
                {groupItems.map((item) => {
                  const isActive = activeTab === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.id === 'operations' && onOpenOperationsBranches) {
                          onOpenOperationsBranches();
                        }
                        setActiveTab(item.id);
                        if (window.innerWidth < 768 && onClose) {
                          onClose();
                        }
                      }}
                      draggable
                      onDragStart={() => handleDragStart(item.id)}
                      onDragOver={(event) => handleDragOver(event, item.id)}
                      onDragEnd={handleDragEnd}
                      className={`
                        w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl transition-all duration-200 group relative isolate
                        ${isActive 
                          ? 'text-white' 
                          : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
                        } ${draggingId === item.id ? 'opacity-70 bg-neutral-100' : ''}`}
                    >
                      <span className={`transition-colors duration-200 ${isActive ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-900'}`}>
                        {React.cloneElement(item.icon as React.ReactElement<any>, { size: 16 })}
                      </span>
                      <span className="text-[12px] font-black tracking-tight flex-1 text-left uppercase">
                        {item.label}
                      </span>

                      {item.id === 'requests' && currentUser && (
                        (() => {
                          const count = sales.filter(s => 
                            (s.agentId === currentUser.id || s.agentName === currentUser.name) && 
                            s.status === 'Declined'
                          ).length;
                          return count > 0 ? (
                            <span className={`
                              ml-2 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest animate-pulse
                              ${isActive ? 'bg-white text-neutral-900' : 'bg-rose-600 text-white shadow-sm shadow-rose-200'}
                            `}>
                              {count}
                            </span>
                          ) : null;
                        })()
                      )}

                      {item.id === 'artwork-transfer' && (
                        (() => {
                          const isUserAdmin = userRole === UserRole.ADMIN;
                          const myBranch = currentUser?.branch;
                          const pendingTransfers = transferRequests.filter(t => 
                            t.status === 'Pending' && 
                            (isUserAdmin || t.toBranch === myBranch || t.fromBranch === myBranch)
                          ).length;
                          const openReturns = returnRecords.filter(r => 
                            r.status === 'Open' && 
                            (isUserAdmin || r.artworkSnapshot?.currentBranch === myBranch)
                          ).length;
                          const count = pendingTransfers + openReturns;
                          return count > 0 ? (
                            <span className={`
                              ml-2 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest animate-pulse
                              ${isActive ? 'bg-white text-neutral-900' : 'bg-rose-600 text-white shadow-sm shadow-rose-200'}
                            `}>
                              {count}
                            </span>
                          ) : null;
                        })()
                      )}

                      {item.id === 'approvals' && (
                        (() => {
                          // Approvals pulse for any pending sale actions
                          const count = sales.filter(s => 
                            s.status === 'For Sale Approval' || 
                            s.status === 'For Payment Approval' || 
                            (s.installments || []).some((i: any) => i.isPending || i.pendingEdit)
                          ).length;
                          return count > 0 ? (
                            <span className={`
                              ml-2 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest animate-pulse
                              ${isActive ? 'bg-white text-neutral-900' : 'bg-rose-600 text-white shadow-sm shadow-rose-200'}
                            `}>
                              {count}
                            </span>
                          ) : null;
                        })()
                      )}

                      {!isActive && (
                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-300" />
                      )}

                      {isActive && (
                        <motion.div 
                          layoutId="sidebar-active"
                          className="absolute inset-0 bg-neutral-900 rounded-xl -z-10 shadow-xl shadow-neutral-900/10"
                          transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                        />
                      )}
                    </button>
                  );
                })}
                </div>
              </div>
            );
          })}
        </nav>

      <div className="p-4 border-t border-neutral-200 bg-neutral-50">
        <div className="flex items-center space-x-3 px-3 py-3 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-neutral-200 border border-neutral-300 flex items-center justify-center text-[10px] font-black text-neutral-700">
            {userRole.substring(0, 1)}
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-xs font-bold truncate text-neutral-900 mb-2">{userRole}</p>
            <div className="flex flex-col space-y-1">
              <div className="flex items-center space-x-1.5">
                <div className="relative w-2 h-2">
                  <span className="absolute inset-0 rounded-full bg-emerald-500"></span>
                  <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-20 animate-ping"></span>
                </div>
                <span className="text-[9px] font-black text-neutral-400 uppercase tracking-tighter">ENCRYPTED</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="relative w-2 h-2">
                  <span className="absolute inset-0 rounded-full bg-amber-500"></span>
                  <span className="absolute inset-0 rounded-full bg-amber-500 opacity-20 animate-ping [animation-delay:75ms]"></span>
                </div>
                <span className="text-[9px] font-black text-neutral-400 uppercase tracking-tighter">AUDIT LOG</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="relative w-2 h-2">
                  <span className="absolute inset-0 rounded-full bg-blue-500"></span>
                  <span className="absolute inset-0 rounded-full bg-blue-500 opacity-20 animate-ping [animation-delay:150ms]"></span>
                </div>
                <span className="text-[9px] font-black text-neutral-400 uppercase tracking-tighter">VERIFIED</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
