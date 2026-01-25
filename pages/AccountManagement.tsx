
import React, { useEffect, useState } from 'react';
import { UserAccount, UserRole, UserPermissions } from '../types';
import { ICONS, getDefaultPermissions, APP_TABS, getDefaultAccessibleTabs } from '../constants';

interface AccountManagementProps {
  accounts: UserAccount[];
  branches?: string[];
  onAddAccount: (account: Partial<UserAccount>) => void;
  onUpdateStatus: (id: string, status: 'Active' | 'Inactive') => void;
  onUpdateAccount: (id: string, updates: Partial<UserAccount>) => void;
}

const AccountManagement: React.FC<AccountManagementProps> = ({ accounts, branches = [], onAddAccount, onUpdateStatus, onUpdateAccount }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);
  const [formData, setFormData] = useState<{
    firstName: string;
    fullName: string;
    email: string;
    password: string;
    branch: string;
    role: UserRole;
    permissions: UserPermissions;
  }>({
    firstName: '',
    fullName: '',
    email: '',
    password: '',
    branch: '',
    role: UserRole.SALES_AGENT,
    permissions: getDefaultPermissions(UserRole.SALES_AGENT)
  });

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

  const [activeModalTab, setActiveModalTab] = useState<'details' | 'permissions' | 'tabs'>('details');

  const PermissionsSelector = () => (
    <div className="space-y-6 pt-4">
      {activeModalTab === 'permissions' && (
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Access Level & Permissions</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { key: 'canAddArtwork', label: 'Add Artwork' },
            { key: 'canEditArtwork', label: 'Edit Artwork' },
            { key: 'canManageAccounts', label: 'Manage Accounts' },
            { key: 'canAccessCertificate', label: 'Access Certificates' },
            { key: 'canAttachITDR', label: 'Attach IT/DR/RSA/AR/OR/CR' },
            { key: 'canDeleteArtwork', label: 'Delete Artwork' },
            { key: 'canSellArtwork', label: 'Sell Artwork' },
            { key: 'canReserveArtwork', label: 'Reserve Artwork' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center space-x-3 cursor-pointer group">
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                formData.permissions[key as keyof UserPermissions] 
                  ? 'bg-slate-900 border-slate-900 text-white' 
                  : 'bg-white border-slate-300 group-hover:border-slate-400'
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
              <span className="text-sm font-medium text-slate-700">{label}</span>
            </label>
          ))}
        </div>
      </div>
      )}

      {activeModalTab === 'tabs' && (
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Artflow Tabs (Navigation)</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {APP_TABS.filter(tab => tab.id !== 'inventory' && tab.id !== 'galleria').map((tab) => {
            const isAccessible = formData.permissions.accessibleTabs 
              ? formData.permissions.accessibleTabs.includes(tab.id)
              : getDefaultAccessibleTabs(formData.role).includes(tab.id);
              
            return (
              <label key={tab.id} className="flex items-center space-x-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                  isAccessible
                    ? 'bg-emerald-500 border-emerald-500 text-white' 
                    : 'bg-white border-slate-300 group-hover:border-slate-400'
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
                <span className="text-sm font-medium text-slate-700">{tab.label}</span>
              </label>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );

  const [activeTab, setActiveTab] = useState<'staff' | 'exclusive'>('staff');

  const filteredAccounts = accounts.filter(acc => {
    if (activeTab === 'staff') {
      return acc.role !== UserRole.EXCLUSIVE;
    }
    return acc.role === UserRole.EXCLUSIVE;
  });

  const [showHiddenTabsPanel, setShowHiddenTabsPanel] = useState(false);
  const [hiddenTabs, setHiddenTabs] = useState<string[]>([]);
  const hiddenStorageKey = 'sidebar-hidden-tabs';
  const hideableTabs = [
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
    setHiddenTabs(prev => {
      const next = prev.includes(tabId) ? prev.filter(id => id !== tabId) : [...prev, tabId];
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(hiddenStorageKey, JSON.stringify(next));
        window.dispatchEvent(new Event('artisflow-hidden-tabs-changed'));
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Account Management</h1>
          <p className="text-sm text-slate-500">Manage gallery staff access and role permissions.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setShowHiddenTabsPanel(prev => !prev)}
            className="p-3 rounded-2xl border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300 bg-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
            aria-label="Toggle hidden navigation tabs"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 10c0-3.866 3.134-7 8-7s8 3.134 8 7v2a8 8 0 01-16 0v-2z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 10h10l-2 2H9l-2-2z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 13h.01M14 13h.01"
              />
            </svg>
          </button>
          <button 
            onClick={() => {
              const defaultRole = activeTab === 'exclusive' ? UserRole.EXCLUSIVE : UserRole.SALES_AGENT;
              setFormData({
                firstName: '',
                fullName: '',
                email: '',
                password: '',
                branch: '',
                role: defaultRole,
                permissions: getDefaultPermissions(defaultRole)
              });
              setShowAddModal(true);
            }}
            className="flex items-center space-x-2 bg-slate-900 text-white px-6 py-3 rounded-2xl hover:bg-slate-800 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 font-bold"
          >
            {ICONS.Add}
            <span>Create New User</span>
          </button>
        </div>
      </div>

      {showHiddenTabsPanel && (
        <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 10c0-3.866 3.134-7 8-7s8 3.134 8 7v2a8 8 0 01-16 0v-2z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 10h10l-2 2H9l-2-2z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 13h.01M14 13h.01"
                  />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Hidden navigation tabs</p>
                <p className="text-xs text-slate-300">Quickly hide or reveal advanced workspace areas.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowHiddenTabsPanel(false)}
              className="text-slate-400 hover:text-slate-100"
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
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/70 hover:bg-slate-800 text-xs"
                >
                  <span className="font-medium">{tab.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      isHidden ? 'bg-emerald-400 text-slate-900' : 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    {isHidden ? 'Hidden' : 'Visible'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit mb-4">
        <button
          onClick={() => setActiveTab('staff')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'staff' 
              ? 'bg-white text-slate-800 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Staff Accounts
        </button>
        <button
          onClick={() => setActiveTab('exclusive')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'exclusive' 
              ? 'bg-white text-slate-800 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Exclusive
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">User Details</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Branch</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAccounts.map((acc) => (
              <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                      {acc.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{acc.name}</p>
                      <p className="text-xs text-slate-400">{acc.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-medium text-slate-600">
                    {acc.branch || '—'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                    acc.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' :
                    acc.role === UserRole.INVENTORY_PERSONNEL ? 'bg-blue-100 text-blue-700' :
                    acc.role === UserRole.EXCLUSIVE ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {acc.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                    acc.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${acc.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                    <span>{acc.status}</span>
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-4">
                  <button
                    onClick={() => {
                      setEditingAccount(acc);
                      setFormData({
                        firstName: acc.firstName || '',
                        fullName: acc.fullName || acc.name,
                        email: acc.email || '',
                        password: acc.password || '',
                        branch: acc.branch || '',
                        role: acc.role,
                        permissions: acc.permissions || getDefaultPermissions(acc.role)
                      });
                      setShowEditModal(true);
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-slate-900 underline underline-offset-4"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => onUpdateStatus(acc.id, acc.status === 'Active' ? 'Inactive' : 'Active')}
                    className="text-xs font-bold text-slate-500 hover:text-slate-900 underline underline-offset-4"
                  >
                    {acc.status === 'Active' ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">{activeTab === 'exclusive' ? 'Provision Exclusive Account' : 'Provision Staff Account'}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-100 px-8">
              <button
                onClick={() => setActiveModalTab('details')}
                className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
                  activeModalTab === 'details' 
                    ? 'border-slate-900 text-slate-900' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                User Details
              </button>
              <button
                onClick={() => setActiveModalTab('permissions')}
                className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
                  activeModalTab === 'permissions' 
                    ? 'border-slate-900 text-slate-900' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Permissions
              </button>
              <button
                onClick={() => setActiveModalTab('tabs')}
                className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
                  activeModalTab === 'tabs' 
                    ? 'border-slate-900 text-slate-900' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Artflow Tabs
              </button>
            </div>

            <div className="p-8 space-y-4">
              {activeModalTab === 'details' && (
              <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">First Name</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                    value={formData.firstName}
                    onChange={e => setFormData({...formData, firstName: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Full Name</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                    value={formData.fullName}
                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Email</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Password</label>
                <input 
                  type="password" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>
              {activeTab === 'staff' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Branch</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                      value={formData.branch}
                      onChange={e => setFormData({...formData, branch: e.target.value})}
                    >
                      <option value="">Select Branch</option>
                      {branches.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">System Role</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
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
                <PermissionsSelector />
              )}

              <div className="pt-6 flex justify-end space-x-3">
                <button onClick={() => setShowAddModal(false)} className="px-6 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
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
                      password: formData.password,
                      permissions: formData.permissions
                    });
                    const defaultRole = UserRole.SALES_AGENT;
                    setShowAddModal(false);
                    setFormData({
                      firstName: '',
                      fullName: '',
                      email: '',
                      password: '',
                      branch: '',
                      role: defaultRole,
                      permissions: getDefaultPermissions(defaultRole)
                    });
                  }}
                  className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg"
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
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">{activeTab === 'exclusive' ? 'Edit Exclusive Account' : 'Edit Staff Account'}</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingAccount(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            {/* Modal Tabs */}
            <div className="flex border-b border-slate-100 px-8">
              <button
                onClick={() => setActiveModalTab('details')}
                className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
                  activeModalTab === 'details' 
                    ? 'border-slate-900 text-slate-900' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                User Details
              </button>
              <button
                onClick={() => setActiveModalTab('permissions')}
                className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
                  activeModalTab === 'permissions' 
                    ? 'border-slate-900 text-slate-900' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Permissions
              </button>
              <button
                onClick={() => setActiveModalTab('tabs')}
                className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
                  activeModalTab === 'tabs' 
                    ? 'border-slate-900 text-slate-900' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Artflow Tabs
              </button>
            </div>

            <div className="p-8 space-y-4">
              {activeModalTab === 'details' && (
              <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">First Name</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                    value={formData.firstName}
                    onChange={e => setFormData({...formData, firstName: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Full Name</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                    value={formData.fullName}
                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Email</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Password (Leave blank to keep current)</label>
                <input 
                  type="password" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  placeholder="••••••••"
                />
              </div>
              {activeTab === 'staff' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Branch</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                      value={formData.branch}
                      onChange={e => setFormData({...formData, branch: e.target.value})}
                    >
                      <option value="">Select Branch</option>
                      {branches.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">System Role</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
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
                <PermissionsSelector />
              )}

              <div className="pt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingAccount(null);
                  }}
                  className="px-6 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
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
                      password: formData.password,
                      permissions: formData.permissions
                    });
                    const defaultRole = UserRole.SALES_AGENT;
                    setShowEditModal(false);
                    setEditingAccount(null);
                    setFormData({
                      firstName: '',
                      fullName: '',
                      email: '',
                      password: '',
                      branch: '',
                      role: defaultRole,
                      permissions: getDefaultPermissions(defaultRole)
                    });
                  }}
                  className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountManagement;
