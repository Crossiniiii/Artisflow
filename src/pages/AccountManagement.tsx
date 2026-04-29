import React, { useEffect, useState } from 'react';
import { UserAccount, UserRole, UserPermissions } from '../types';
import { ICONS, getDefaultPermissions, APP_TABS, getDefaultAccessibleTabs } from '../constants';

interface AccountManagementProps {
  accounts: UserAccount[];
  branches?: string[];
  onAddAccount: (account: Partial<UserAccount>) => void;
  onUpdateStatus: (id: string, status: 'Active' | 'Inactive') => void;
  onUpdateAccount: (id: string, updates: Partial<UserAccount>) => void;
  onBulkDelete?: (ids: string[]) => void;
  onBulkUpdateStatus?: (ids: string[], status: 'Active' | 'Inactive') => void;
}

interface PermissionsSelectorProps {
  activeModalTab: 'details' | 'permissions' | 'tabs';
  formData: {
    role: UserRole;
    permissions: UserPermissions;
  };
  handlePermissionChange: (key: keyof UserPermissions) => void;
  handleTabPermissionChange: (tabId: string) => void;
}

const PermissionsSelector: React.FC<PermissionsSelectorProps> = ({
  activeModalTab,
  formData,
  handlePermissionChange,
  handleTabPermissionChange,
}) => (
  <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
    {activeModalTab === 'permissions' && (
      <div className="space-y-6">
        <div>
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-4">Access Level & Permissions</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'canAddArtwork', label: 'Add Artwork' },
              { key: 'canEditArtwork', label: 'Edit Artwork' },
              { key: 'canManageAccounts', label: 'Manage Accounts' },
              { key: 'canManageEvents', label: 'Manage Events & Auctions' },
              { key: 'canAccessCertificate', label: 'Access Certificates' },
              { key: 'canAttachITDR', label: 'Attach IT/DR/RSA/AR/OR/CR' },
              { key: 'canDeleteArtwork', label: 'Delete Artwork' },
              { key: 'canSellArtwork', label: 'Sell Artwork' },
              { key: 'canReserveArtwork', label: 'Reserve Artwork' },
              { key: 'canTransferArtwork', label: 'Transfer Artwork' },
              { key: 'canViewSalesHistory', label: 'View Sales History' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center space-x-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all duration-200 ${formData.permissions[key as keyof UserPermissions]
                  ? 'bg-neutral-900 border-neutral-900 text-white shadow-sm'
                  : 'bg-white border-neutral-300 group-hover:border-neutral-400'
                  }`}>
                  {formData.permissions[key as keyof UserPermissions] && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={!!formData.permissions[key as keyof UserPermissions]}
                  onChange={() => handlePermissionChange(key as keyof UserPermissions)}
                />
                <span className="text-sm font-medium text-neutral-700 group-hover:text-neutral-900 transition-colors">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-neutral-100">
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-4">View Control</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'canViewReserved', label: 'Reserved Artworks' },
              { key: 'canViewAuctioned', label: 'Auctioned Artworks' },
              { key: 'canViewExhibit', label: 'Exhibit Artworks' },
              { key: 'canViewForFraming', label: 'Framing Artworks' },
              { key: 'canViewBackToArtist', label: 'Back to Artist Artworks' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center space-x-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all duration-200 ${formData.permissions[key as keyof UserPermissions]
                  ? 'bg-neutral-900 border-neutral-900 text-white shadow-sm'
                  : 'bg-white border-neutral-300 group-hover:border-neutral-400'
                  }`}>
                  {formData.permissions[key as keyof UserPermissions] && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={!!formData.permissions[key as keyof UserPermissions]}
                  onChange={() => handlePermissionChange(key as keyof UserPermissions)}
                />
                <span className="text-sm font-medium text-neutral-700 group-hover:text-neutral-900 transition-colors">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    )}

    {activeModalTab === 'tabs' && (
      <div>
        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-4">Artflow Tabs (Navigation)</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {APP_TABS.map((tab) => {
            const isAccessible = formData.permissions.accessibleTabs
              ? formData.permissions.accessibleTabs.includes(tab.id)
              : getDefaultAccessibleTabs(formData.role).includes(tab.id);

            return (
              <label key={tab.id} className="flex items-center space-x-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all duration-200 ${isAccessible
                  ? 'bg-neutral-900 border-neutral-900 text-white shadow-sm'
                  : 'bg-white border-neutral-300 group-hover:border-neutral-400'
                  }`}>
                  {isAccessible && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={isAccessible}
                  onChange={() => handleTabPermissionChange(tab.id)}
                />
                <span className="text-sm font-medium text-neutral-700 group-hover:text-neutral-900 transition-colors">{tab.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    )}
  </div>
);

const AccountManagement: React.FC<AccountManagementProps> = ({ 
  accounts, 
  branches = [], 
  onAddAccount, 
  onUpdateStatus, 
  onUpdateAccount, 
  onBulkDelete, 
  onBulkUpdateStatus 
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'details' | 'permissions' | 'tabs'>('details');
  const [activeTab, setActiveTab] = useState<'staff' | 'exclusive'>('staff');
  const [showHiddenTabsPanel, setShowHiddenTabsPanel] = useState(false);
  const [hiddenTabs, setHiddenTabs] = useState<string[]>([]);
  const hiddenStorageKey = 'sidebar-hidden-tabs';

  const [formData, setFormData] = useState<{
    firstName: string;
    fullName: string;
    email: string;
    branch: string;
    role: UserRole;
    permissions: UserPermissions;
  }>({
    firstName: '',
    fullName: '',
    email: '',
    branch: '',
    role: UserRole.SALES_AGENT,
    permissions: getDefaultPermissions(UserRole.SALES_AGENT)
  });

  const hideableTabs = [
    { id: 'chat', label: 'Inbox & Messaging' },
    { id: 'analytics', label: 'Inventory Insights' },
    { id: 'import-history', label: 'Import History' },
    { id: 'snapshots', label: 'Artwork Timeline' }
  ];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(hiddenStorageKey);
    if (!raw) {
      const initial = ['analytics'];
      window.localStorage.setItem(hiddenStorageKey, JSON.stringify(initial));
      setHiddenTabs(initial);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setHiddenTabs(parsed);
      else setHiddenTabs([]);
    } catch {
      setHiddenTabs([]);
    }
  }, [hiddenStorageKey]);

  const toggleHiddenTab = (tabId: string) => {
    const next = hiddenTabs.includes(tabId)
      ? hiddenTabs.filter(id => id !== tabId)
      : [...hiddenTabs, tabId];
    setHiddenTabs(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(hiddenStorageKey, JSON.stringify(next));
      window.dispatchEvent(new Event('artisflow-hidden-tabs-changed'));
    }
  };

  const handleRoleChange = (role: UserRole) => {
    setFormData(prev => ({
      ...prev,
      role,
      permissions: getDefaultPermissions(role)
    }));
  };

  const handlePermissionChange = (key: keyof UserPermissions) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key]
      }
    }));
  };

  const handleTabPermissionChange = (tabId: string) => {
    setFormData(prev => {
      const currentTabs = prev.permissions.accessibleTabs || getDefaultAccessibleTabs(prev.role);
      const newTabs = currentTabs.includes(tabId)
        ? currentTabs.filter(id => id !== tabId)
        : [...currentTabs, tabId];

      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          accessibleTabs: newTabs
        }
      };
    });
  };

  const openEditModal = (acc: UserAccount) => {
    setEditingAccount(acc);
    setFormData({
      firstName: acc.firstName || '',
      fullName: acc.fullName || acc.name || '',
      email: acc.email || '',
      branch: acc.branch || '',
      role: acc.role || UserRole.SALES_AGENT,
      permissions: acc.permissions || getDefaultPermissions(acc.role || UserRole.SALES_AGENT)
    });
    setShowEditModal(true);
  };

  const filteredAccounts = accounts.filter(acc => {
    const name = (acc.name || acc.fullName || acc.firstName || '').toString().trim();
    const email = (acc.email || '').toString().trim();
    const hasName = name.length > 0 && name.toLowerCase() !== 'undefined' && name.toLowerCase() !== 'null';
    const hasEmail = email.length > 0 && email.toLowerCase() !== 'undefined' && email.toLowerCase() !== 'null';
    const isValid = (hasName || hasEmail) && acc.id;
    if (!isValid) return false;
    if (activeTab === 'staff') return acc.role !== UserRole.EXCLUSIVE;
    return acc.role === UserRole.EXCLUSIVE;
  });

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredAccounts.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredAccounts.map(acc => acc.id));
    }
  };

  const handleSelectUser = (id: string) => {
    setSelectedUsers(prev =>
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  const handleBulkActivate = () => {
    if (onBulkUpdateStatus && selectedUsers.length > 0) {
      onBulkUpdateStatus(selectedUsers, 'Active');
      setSelectedUsers([]);
    }
  };

  const handleBulkDeactivate = () => {
    if (onBulkUpdateStatus && selectedUsers.length > 0) {
      onBulkUpdateStatus(selectedUsers, 'Inactive');
      setSelectedUsers([]);
    }
  };

  const handleBulkDelete = () => {
    if (onBulkDelete && selectedUsers.length > 0) {
      onBulkDelete(selectedUsers);
      setSelectedUsers([]);
      setShowBulkDeleteConfirm(false);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Account Management</h1>
          <p className="text-sm text-neutral-500">Manage gallery staff access and role permissions.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setShowHiddenTabsPanel(prev => !prev)}
            className="p-3 rounded-md border border-neutral-200 text-neutral-400 hover:text-neutral-900 hover:border-neutral-300 bg-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
            aria-label="Toggle hidden navigation tabs"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 10c0-3.866 3.134-7 8-7s8 3.134 8 7v2a8 8 0 01-16 0v-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10h10l-2 2H9l-2-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 13h.01M14 13h.01" />
            </svg>
          </button>
          <button
            onClick={() => {
              const defaultRole = activeTab === 'exclusive' ? UserRole.EXCLUSIVE : UserRole.SALES_AGENT;
              setFormData({
                firstName: '',
                fullName: '',
                email: '',
                branch: '',
                role: defaultRole,
                permissions: getDefaultPermissions(defaultRole)
              });
              setShowAddModal(true);
            }}
            className="flex items-center space-x-2 bg-neutral-900 text-white px-6 py-3 rounded-md hover:bg-black transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 font-bold"
          >
            {ICONS.Add}
            <span>Create New User</span>
          </button>
        </div>
      </div>

      {showHiddenTabsPanel && (
        <div className="bg-neutral-50 text-neutral-900 rounded-md p-4 space-y-3 border border-neutral-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 10c0-3.866 3.134-7 8-7s8 3.134 8 7v2a8 8 0 01-16 0v-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10h10l-2 2H9l-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 13h.01M14 13h.01" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Hidden navigation tabs</p>
                <p className="text-xs text-neutral-500">Quickly hide or reveal advanced workspace areas.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowHiddenTabsPanel(false)}
              className="text-neutral-400 hover:text-neutral-900"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {hideableTabs.map(tab => {
              const isHidden = hiddenTabs.includes(tab.id);
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => toggleHiddenTab(tab.id)}
                  className="flex items-center justify-between px-3 py-2 rounded-sm bg-white border border-neutral-200 hover:bg-neutral-50 text-xs shadow-sm"
                >
                  <span className="font-medium">{tab.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${isHidden ? 'bg-neutral-100 text-neutral-400' : 'bg-neutral-900 text-white'}`}>
                    {isHidden ? 'Hidden' : 'Visible'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex space-x-1 bg-neutral-100 p-1.5 rounded-sm w-fit mb-4 border border-neutral-200/50 shadow-inner">
        <button
          onClick={() => setActiveTab('staff')}
          className={`px-6 py-2 rounded-sm text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'staff'
            ? 'bg-white text-neutral-900 shadow-md transform scale-[1.02]'
            : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50'
          }`}
        >
          Staff Accounts
        </button>
        <button
          onClick={() => setActiveTab('exclusive')}
          className={`px-6 py-2 rounded-sm text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'exclusive'
            ? 'bg-white text-neutral-900 shadow-md transform scale-[1.02]'
            : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50'
          }`}
        >
          Exclusive
        </button>
      </div>

      <div className="bg-white rounded-md border border-neutral-200 shadow-sm overflow-hidden overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-100">
              <th className="px-6 py-4 w-12">
                <label className="flex items-center cursor-pointer group">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedUsers.length === filteredAccounts.length && filteredAccounts.length > 0
                    ? 'bg-neutral-900 border-neutral-900 text-white'
                    : 'bg-white border-neutral-300 group-hover:border-neutral-400'
                  }`}>
                    {selectedUsers.length === filteredAccounts.length && filteredAccounts.length > 0 && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedUsers.length === filteredAccounts.length && filteredAccounts.length > 0}
                    onChange={handleSelectAll}
                  />
                </label>
              </th>
              <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">User Details</th>
              <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Branch</th>
              <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Role</th>
              <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredAccounts.map((acc) => (
              <tr key={acc.id} className={`group/row hover:bg-neutral-50/80 transition-all ${selectedUsers.includes(acc.id) ? 'bg-neutral-50' : ''}`}>
                <td className="px-6 py-4">
                  <label className="flex items-center cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedUsers.includes(acc.id)
                      ? 'bg-neutral-900 border-neutral-900 text-white'
                      : 'bg-white border-neutral-300 group-hover:border-neutral-400'
                    }`}>
                      {selectedUsers.includes(acc.id) && (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={selectedUsers.includes(acc.id)}
                      onChange={() => handleSelectUser(acc.id)}
                    />
                  </label>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={() => openEditModal(acc)}
                      className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 font-black shadow-sm transition-all hover:scale-110 active:scale-95 hover:bg-neutral-900 hover:text-white cursor-pointer group/avatar relative"
                    >
                      <span>{(acc.name?.[0] || acc.fullName?.[0] || acc.firstName?.[0] || acc.email?.[0] || '?').toUpperCase()}</span>
                      <div className="absolute inset-0 rounded-full border-2 border-neutral-900 opacity-0 group-hover/avatar:opacity-100 transition-opacity"></div>
                    </button>
                    <div>
                      <p className="text-sm font-bold text-neutral-900">{acc.name || acc.fullName || acc.firstName || acc.email || 'Unknown User'}</p>
                      <p className="text-[11px] text-neutral-400 font-medium">{acc.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-bold text-neutral-600 bg-neutral-50 px-2 py-1 rounded-sm border border-neutral-100">
                    {acc.branch || '—'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => openEditModal(acc)}
                    className={`px-2.5 py-1 rounded-sm text-[10px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 border ${acc.role === UserRole.ADMIN ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm' :
                    acc.role === UserRole.INVENTORY_PERSONNEL ? 'bg-neutral-200 text-neutral-900 border-neutral-300' :
                    acc.role === UserRole.EXCLUSIVE ? 'bg-white text-neutral-700 border-neutral-300 shadow-sm' : 'bg-white text-neutral-600 border-neutral-200'
                    }`}>
                    {acc.role}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => onUpdateStatus(acc.id, acc.status === 'Active' ? 'Inactive' : 'Active')}
                    className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-wider border transition-all hover:scale-105 active:scale-95 shadow-sm ${acc.status === 'Active'
                    ? 'bg-white text-neutral-900 border-neutral-200 hover:bg-neutral-50'
                    : 'bg-neutral-50 text-neutral-400 border-neutral-200 opacity-70 hover:opacity-100'
                    }`}>
                    <span className={`w-2 h-2 rounded-full ${acc.status === 'Active' ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-neutral-300'}`}></span>
                    <span>{acc.status}</span>
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(acc)}
                      className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-900 hover:text-white text-neutral-600 text-[10px] font-black uppercase tracking-widest rounded-sm border border-neutral-200 transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onUpdateStatus(acc.id, acc.status === 'Active' ? 'Inactive' : 'Active')}
                      className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-sm border transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5 ${acc.status === 'Active'
                        ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-600 hover:text-white'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white'
                      }`}
                    >
                      {acc.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-neutral-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-neutral-900">{activeTab === 'exclusive' ? 'Provision Exclusive Account' : 'Provision Staff Account'}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-neutral-400 hover:text-neutral-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex border-b border-neutral-100 px-8">
              {['details', 'permissions', 'tabs'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveModalTab(tab as any)}
                  className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors capitalize ${activeModalTab === tab
                    ? 'border-neutral-900 text-neutral-900'
                    : 'border-transparent text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  {tab === 'tabs' ? 'Artflow Tabs' : tab}
                </button>
              ))}
            </div>

            <div className="p-8 space-y-4">
              {activeModalTab === 'details' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">First Name</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm"
                        value={formData.firstName}
                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">Full Name</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm"
                        value={formData.fullName}
                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase">Email</label>
                    <input
                      type="email"
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase">Authentication</label>
                    <div className="w-full px-4 py-3 bg-neutral-100 border border-neutral-200 rounded-sm text-sm text-neutral-400">
                      Managed via Google Sign-in
                    </div>
                  </div>
                  {activeTab === 'staff' && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase">Branch</label>
                        <select
                          className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm"
                          value={formData.branch}
                          onChange={e => setFormData({ ...formData, branch: e.target.value })}
                        >
                          <option value="">Select Branch</option>
                          {branches.map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase">System Role</label>
                        <select
                          className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm"
                          value={formData.role}
                          onChange={e => handleRoleChange(e.target.value as UserRole)}
                        >
                          <option value={UserRole.SALES_AGENT}>Sales Agent</option>
                          <option value={UserRole.INVENTORY_PERSONNEL}>Inventory Personnel</option>
                          <option value={UserRole.ADMIN}>Administrator</option>
                        </select>
                      </div>
                    </>
                  )}
                </>
              )}

              {(activeModalTab === 'permissions' || activeModalTab === 'tabs') && (
                <PermissionsSelector 
                  activeModalTab={activeModalTab}
                  formData={formData}
                  handlePermissionChange={handlePermissionChange}
                  handleTabPermissionChange={handleTabPermissionChange}
                />
              )}

              <div className="pt-6 flex justify-end space-x-3">
                <button onClick={() => setShowAddModal(false)} className="px-6 py-2.5 rounded-sm font-medium text-neutral-600 hover:bg-neutral-100">Cancel</button>
                <button
                  onClick={() => {
                    onAddAccount({
                      name: formData.fullName || formData.firstName || formData.email,
                      email: formData.email,
                      role: formData.role,
                      firstName: formData.firstName,
                      fullName: formData.fullName,
                      position: formData.role,
                      branch: formData.branch,
                      permissions: formData.permissions
                    });
                    const defaultRole = UserRole.SALES_AGENT;
                    setShowAddModal(false);
                    setFormData({
                      firstName: '', fullName: '', email: '', branch: '',
                      role: defaultRole,
                      permissions: getDefaultPermissions(defaultRole)
                    });
                  }}
                  className="px-8 py-2.5 bg-neutral-900 text-white rounded-sm font-bold shadow-lg"
                >
                  Create Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-neutral-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-neutral-900">{activeTab === 'exclusive' ? 'Edit Exclusive Account' : 'Edit Staff Account'}</h3>
              <button
                onClick={() => { setShowEditModal(false); setEditingAccount(null); }}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex border-b border-neutral-100 px-8">
              {['details', 'permissions', 'tabs'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveModalTab(tab as any)}
                  className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors capitalize ${activeModalTab === tab
                    ? 'border-neutral-900 text-neutral-900'
                    : 'border-transparent text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  {tab === 'tabs' ? 'Artflow Tabs' : tab}
                </button>
              ))}
            </div>

            <div className="p-8 space-y-4">
              {activeModalTab === 'details' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">First Name</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm"
                        value={formData.firstName}
                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">Full Name</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm"
                        value={formData.fullName}
                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase">Email</label>
                    <input
                      type="email"
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase">Authentication</label>
                    <div className="w-full px-4 py-3 bg-neutral-100 border border-neutral-200 rounded-sm text-sm text-neutral-400">
                      Managed via Google Sign-in
                    </div>
                  </div>
                  {activeTab === 'staff' && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase">Branch</label>
                        <select
                          className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm"
                          value={formData.branch}
                          onChange={e => setFormData({ ...formData, branch: e.target.value })}
                        >
                          <option value="">Select Branch</option>
                          {branches.map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase">System Role</label>
                        <select
                          className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm"
                          value={formData.role}
                          onChange={e => handleRoleChange(e.target.value as UserRole)}
                        >
                          <option value={UserRole.SALES_AGENT}>Sales Agent</option>
                          <option value={UserRole.INVENTORY_PERSONNEL}>Inventory Personnel</option>
                          <option value={UserRole.ADMIN}>Administrator</option>
                        </select>
                      </div>
                    </>
                  )}
                </>
              )}

              {(activeModalTab === 'permissions' || activeModalTab === 'tabs') && (
                <PermissionsSelector 
                  activeModalTab={activeModalTab}
                  formData={formData}
                  handlePermissionChange={handlePermissionChange}
                  handleTabPermissionChange={handleTabPermissionChange}
                />
              )}

              <div className="pt-6 flex justify-end space-x-3">
                <button onClick={() => { setShowEditModal(false); setEditingAccount(null); }} className="px-6 py-2.5 rounded-sm font-medium text-neutral-600 hover:bg-neutral-100">Cancel</button>
                <button
                  onClick={() => {
                    if (!editingAccount) return;
                    onUpdateAccount(editingAccount.id, {
                      name: formData.fullName || formData.firstName || formData.email,
                      email: formData.email,
                      role: formData.role,
                      firstName: formData.firstName,
                      fullName: formData.fullName,
                      position: formData.role,
                      branch: formData.branch,
                      permissions: formData.permissions
                    });
                    const defaultRole = UserRole.SALES_AGENT;
                    setShowEditModal(false);
                    setEditingAccount(null);
                    setFormData({
                      firstName: '', fullName: '', email: '', branch: '',
                      role: defaultRole,
                      permissions: getDefaultPermissions(defaultRole)
                    });
                  }}
                  className="px-8 py-2.5 bg-neutral-900 text-white rounded-sm font-bold shadow-lg"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-8 py-6 border-b border-neutral-100">
              <h3 className="text-lg font-bold text-neutral-900">Confirm Bulk Delete</h3>
            </div>
            <div className="p-8 space-y-4">
              <p className="text-sm text-neutral-600">
                Are you sure you want to delete <strong>{selectedUsers.length}</strong> user account{selectedUsers.length > 1 ? 's' : ''}?
              </p>
              <div className="bg-neutral-50 rounded-sm p-4 max-h-48 overflow-y-auto">
                <p className="text-xs font-bold text-neutral-500 uppercase mb-2">Users to be deleted:</p>
                <ul className="space-y-1">
                  {selectedUsers.map(id => {
                    const user = accounts.find(acc => acc.id === id);
                    return user ? (
                      <li key={id} className="text-sm text-neutral-700">• {user.name || user.fullName || user.firstName || user.email} ({user.email})</li>
                    ) : null;
                  })}
                </ul>
              </div>
              <p className="text-xs text-neutral-500">This action cannot be undone.</p>
            </div>
            <div className="px-8 py-6 bg-neutral-50 flex justify-end space-x-3">
              <button onClick={() => setShowBulkDeleteConfirm(false)} className="px-6 py-2.5 rounded-sm font-medium text-neutral-600 hover:bg-white transition-colors">Cancel</button>
              <button onClick={handleBulkDelete} className="px-8 py-2.5 bg-red-600 text-white rounded-sm font-bold hover:bg-red-700 transition-colors">
                Delete {selectedUsers.length} User{selectedUsers.length > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedUsers.length > 0 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40">
          <div className="bg-neutral-900 text-white rounded-md shadow-2xl px-6 py-4 flex items-center space-x-6 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-sm font-bold">{selectedUsers.length}</span>
              </div>
              <span className="text-sm font-medium">{selectedUsers.length} selected</span>
            </div>
            <div className="h-6 w-px bg-white/20"></div>
            <div className="flex items-center space-x-2">
              <button onClick={handleBulkActivate} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-sm text-sm font-bold transition-colors flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>Activate</span>
              </button>
              <button onClick={handleBulkDeactivate} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-sm text-sm font-bold transition-colors flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                <span>Deactivate</span>
              </button>
              <button onClick={() => setShowBulkDeleteConfirm(true)} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-sm text-sm font-bold transition-colors flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                <span>Delete</span>
              </button>
            </div>
            <button onClick={() => setSelectedUsers([])} className="ml-2 text-white/60 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountManagement;
