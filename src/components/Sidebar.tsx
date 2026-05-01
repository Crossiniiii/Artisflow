
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
  CreditCard
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: UserRole;
  userPermissions?: UserPermissions;
  onOpenOperationsBranches?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  color?: string;
  groupId: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, userRole, userPermissions, onOpenOperationsBranches, isOpen = false, onClose }) => {
  const menuGroups = [
    { id: 'main', label: 'Main' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'sales', label: 'Sales' },
    { id: 'management', label: 'Management' },
    { id: 'logs', label: 'Logs' }
  ];

  const allMenuItems: MenuItem[] = [
    // Main Section
    { id: 'dashboard', label: 'Dashboard', icon: ICONS.Dashboard, color: 'text-blue-600', groupId: 'main' },

    // Inventory Section
    { id: 'analytics', label: 'Inventory Insights', icon: <BarChart3 size={20} />, color: 'text-violet-600', groupId: 'inventory' },
    { id: 'artwork-transfer', label: 'Artwork T/R', icon: <ArrowRightLeft size={20} />, color: 'text-orange-600', groupId: 'inventory' },
    { id: 'snapshots', label: 'Artwork Timeline', icon: <History size={20} />, color: 'text-pink-600', groupId: 'inventory' },

    // Sales Section
    { id: 'sales-approval', label: 'Sales Approval', icon: <ShieldCheck size={20} />, color: 'text-yellow-600', groupId: 'sales' },
    { id: 'payment-approval', label: 'Payment Approval', icon: <CreditCard size={20} />, color: 'text-blue-600', groupId: 'sales' },
    { id: 'sales-history', label: 'Sales History', icon: ICONS.Sales, color: 'text-emerald-600', groupId: 'sales' },

    // Management Section
    { id: 'operations', label: 'Gallery Operations', icon: <Settings2 size={20} />, color: 'text-indigo-600', groupId: 'management' },
    { id: 'accounts', label: 'User Accounts', icon: ICONS.Users, color: 'text-sky-600', groupId: 'management' },
    { id: 'chat', label: 'Inbox & Messaging', icon: ICONS.Chat, color: 'text-blue-500', groupId: 'management' },

    // Logs Section
    { id: 'audit-logs', label: 'System Audit Logs', icon: <ShieldEllipsis size={20} />, color: 'text-red-600', groupId: 'logs' },
    { id: 'import-history', label: 'Import History', icon: <FileSpreadsheet size={20} />, color: 'text-cyan-600', groupId: 'logs' }
  ];

  // Determine which tabs are visible based on granular permissions or role defaults
  let visibleTabIds = userPermissions?.accessibleTabs !== undefined
    ? userPermissions.accessibleTabs
    : getDefaultAccessibleTabs(userRole);

  // Checks removed for inventory and galleria



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
      <div className="p-6 border-b border-neutral-200">
        <h1 className="text-3xl font-black tracking-tighter text-neutral-900 italic">Galerie Joaquin</h1>
        <p className="text-xs text-neutral-500 font-bold uppercase tracking-[0.25em] mt-1">Inventory System</p>
      </div>

      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {menuGroups.map((group) => {
          const groupItems = orderedMenuItems.filter((item): item is MenuItem => item.groupId === group.id);
          if (groupItems.length === 0) return null;

          return (
            <div key={group.id} className="space-y-1">
              <h3 className="px-4 text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-2">
                {group.label}
              </h3>
              <div className="space-y-1">
                {groupItems.map((item) => (
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
                    className={`w-full flex items-center space-x-3 px-4 py-2 border-l-4 transition-all duration-150 group ${activeTab === item.id
                      ? 'bg-blue-50/50 text-blue-600 border-blue-600 font-bold'
                      : 'border-transparent text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800'
                      } ${draggingId === item.id ? 'opacity-70 bg-neutral-100' : ''}`}
                  >
                    <span className={`transition-colors duration-150 ${activeTab === item.id ? 'text-blue-600' : `${item.color || 'text-neutral-400'} group-hover:text-neutral-700`}`}>{item.icon}</span>
                    <span className="text-[13px] tracking-tight font-bold">{item.label}</span>
                  </button>
                ))}
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
