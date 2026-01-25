
import React, { useEffect, useState } from 'react';
import { UserRole, UserPermissions } from '../types';
import { ICONS, getDefaultAccessibleTabs } from '../constants';
import { BarChart3, ShieldEllipsis, Store, FileSpreadsheet, History, Settings2, ArrowRightLeft } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: UserRole;
  userPermissions?: UserPermissions;
  onOpenOperationsBranches?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, userRole, userPermissions, onOpenOperationsBranches }) => {
  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: ICONS.Dashboard },
    // Inventory and Galleria removed from sidebar
    { id: 'sales-history', label: 'Sales History', icon: ICONS.Sales },
    { id: 'artwork-transfer', label: 'Artwork T/R', icon: <ArrowRightLeft size={20} /> },
    { id: 'analytics', label: 'Inventory Insights', icon: <BarChart3 size={20} /> },
    { id: 'import-history', label: 'Import History', icon: <FileSpreadsheet size={20} /> },
    { id: 'snapshots', label: 'Artwork Timeline', icon: <History size={20} /> },
    { id: 'operations', label: 'Gallery Operations', icon: <Settings2 size={20} /> },
    { id: 'audit-logs', label: 'System Audit Logs', icon: <ShieldEllipsis size={20} /> },
    { id: 'accounts', label: 'User Accounts', icon: ICONS.Users }
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
    const menuIds = menuItems.map(item => item.id);
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

  const orderedMenuItems =
    orderedIds.length > 0
      ? orderedIds
          .map(id => menuItems.find(item => item.id === id) || null)
          .filter((item): item is { id: string; label: string; icon: React.ReactNode } => item !== null)
      : menuItems;

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
    <aside className="w-64 bg-slate-900 text-white flex flex-col hidden md:flex h-full">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold tracking-tight text-emerald-400 italic">ArtisFlow</h1>
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Management Suite</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {orderedMenuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === 'operations' && onOpenOperationsBranches) {
                onOpenOperationsBranches();
              }
              setActiveTab(item.id);
            }}
            draggable
            onDragStart={() => handleDragStart(item.id)}
            onDragOver={(event) => handleDragOver(event, item.id)}
            onDragEnd={handleDragEnd}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activeTab === item.id 
                ? 'bg-emerald-500 text-slate-900 font-bold shadow-lg shadow-emerald-500/20' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            } ${draggingId === item.id ? 'opacity-70 ring-2 ring-emerald-400/40' : ''}`}
          >
            <span className={activeTab === item.id ? 'text-slate-900' : ''}>{item.icon}</span>
            <span className="text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-950/50">
        <div className="flex items-center space-x-3 px-3 py-3 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-black text-emerald-400">
            {userRole.substring(0, 1)}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold truncate text-slate-200">{userRole}</p>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-tighter">Verified Session</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
