import React from 'react';
import { Search, Download, Upload, Plus } from 'lucide-react';
import { Branch, ArtworkStatus, UserPermissions } from '../../types';

interface InventoryFiltersProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  dateMonthFilter: string;
  setDateMonthFilter: (val: string) => void;
  dateYearFilter: string;
  setDateYearFilter: (val: string) => void;
  branchFilter: string;
  setBranchFilter: (val: string) => void;
  artistFilter: string;
  setArtistFilter: (val: string) => void;
  mediumFilter: string;
  setMediumFilter: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  sizeFilter: string;
  setSizeFilter: (val: string) => void;
  sheetFilter: string;
  setSheetFilter: (val: string) => void;
  paymentTypeFilter: string;
  setPaymentTypeFilter: (val: string) => void;
  branches: string[];
  availableArtists: string[];
  availableMediums: string[];
  availableSheets: string[];
  monthNames: string[];
  permissions: UserPermissions | null;
  selectedIds: string[];
  filteredCount: number;
  handleSelectAll: () => void;
  exportInventory: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  setShowAddModal: (val: boolean) => void;
}

export const InventoryFilters: React.FC<InventoryFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  dateMonthFilter,
  setDateMonthFilter,
  dateYearFilter,
  setDateYearFilter,
  branchFilter,
  setBranchFilter,
  artistFilter,
  setArtistFilter,
  mediumFilter,
  setMediumFilter,
  statusFilter,
  setStatusFilter,
  sizeFilter,
  setSizeFilter,
  sheetFilter,
  setSheetFilter,
  paymentTypeFilter,
  setPaymentTypeFilter,
  branches,
  availableArtists,
  availableMediums,
  availableSheets,
  monthNames,
  permissions,
  selectedIds,
  filteredCount,
  handleSelectAll,
  exportInventory,
  handleFileChange,
  fileInputRef,
  setShowAddModal
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 shrink-0">
          {(permissions?.canEditArtwork || permissions?.canSellArtwork || permissions?.canDeleteArtwork) && (
            <button
              onClick={handleSelectAll}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 hover:bg-slate-200 transition-all shadow-sm active:scale-95 whitespace-nowrap"
            >
              <div className={`w-3.5 h-3.5 rounded border ${selectedIds.length === filteredCount ? 'bg-indigo-600 border-indigo-600' : 'border-slate-400'}`}>
                {selectedIds.length === filteredCount && <svg className="w-full h-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </div>
              <span className="uppercase tracking-wider">Select All</span>
            </button>
          )}

          <div className="relative w-64 group hidden md:block">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
              <Search size={14} />
            </div>

            <input
              type="text"
              placeholder="Search assets..."
              className="block w-full h-9 pl-9 pr-3 bg-white border border-slate-200 rounded-xl text-xs font-medium placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
              <select
                value={dateMonthFilter}
                onChange={(e) => setDateMonthFilter(e.target.value)}
                className="bg-transparent h-8 min-w-[100px] px-2 text-[11px] font-bold text-slate-700 focus:outline-none cursor-pointer uppercase tracking-wider"
              >
                <option value="All">Months</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={String(m)}>{monthNames[m - 1]}</option>
                ))}
              </select>
              <div className="w-px h-4 bg-slate-200"></div>
              <select
                value={dateYearFilter}
                onChange={(e) => setDateYearFilter(e.target.value)}
                className="bg-transparent h-8 min-w-[70px] px-2 text-[11px] font-bold text-slate-700 focus:outline-none cursor-pointer uppercase tracking-wider"
              >
                <option value="All">Years</option>
                {Array.from({ length: new Date().getFullYear() - 1970 + 1 }, (_, i) => new Date().getFullYear() - i).map(y => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>

              <div className="w-px h-4 bg-slate-200"></div>

              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="bg-indigo-50/50 h-8 min-w-[130px] px-3 text-[11px] font-bold text-indigo-700 focus:outline-none rounded-lg cursor-pointer uppercase tracking-wider"
              >
                <option value="All">All Branches</option>
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
              <select
                value={artistFilter}
                onChange={(e) => setArtistFilter(e.target.value)}
                className="bg-transparent h-8 min-w-[120px] max-w-[160px] px-2 text-[11px] font-bold text-slate-700 focus:outline-none cursor-pointer uppercase tracking-wider"
              >
                <option value="All">All Artists</option>
                {availableArtists.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <div className="w-px h-4 bg-slate-200"></div>
              <select
                value={mediumFilter}
                onChange={(e) => setMediumFilter(e.target.value)}
                className="bg-transparent h-8 min-w-[120px] max-w-[160px] px-2 text-[11px] font-bold text-slate-700 focus:outline-none cursor-pointer uppercase tracking-wider"
              >
                <option value="All">All Mediums</option>
                {availableMediums.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <div className="w-px h-4 bg-slate-200"></div>
              <input
                type="text"
                placeholder="Size..."
                value={sizeFilter}
                onChange={(e) => setSizeFilter(e.target.value)}
                className="bg-transparent h-8 w-20 px-2 text-[11px] font-bold text-slate-700 focus:outline-none placeholder:text-slate-400 uppercase tracking-wider"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-4 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 hover:border-indigo-300 transition-all cursor-pointer uppercase tracking-wider"
            >
              <option value="All">Status</option>
              <option value="In Transit">In Transit</option>
              {Object.values(ArtworkStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {(statusFilter === 'All' || statusFilter === ArtworkStatus.SOLD || statusFilter === ArtworkStatus.DELIVERED) && (
              <select
                value={paymentTypeFilter}
                onChange={(e) => setPaymentTypeFilter(e.target.value)}
                className="h-10 px-4 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 hover:border-emerald-300 transition-all cursor-pointer uppercase tracking-wider"
              >
                <option value="All">Payment Type</option>
                <option value="Full">Full Payment</option>
                <option value="Downpayment">Downpayment</option>
              </select>
            )}

            <div className="flex items-center gap-1.5 ml-auto">
              {(permissions?.canManageAccounts) && (
                <button
                  onClick={exportInventory}
                  className="flex items-center gap-2 h-10 px-4 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:text-indigo-600 transition-all font-bold text-[11px] uppercase tracking-wider shadow-sm"
                  title="Export Data"
                >
                  <Download size={14} />
                  <span className="hidden xl:inline">Export</span>
                </button>
              )}
              {permissions?.canAddArtwork && (
                <>
                  <input type="file" accept=".csv, .xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 h-10 px-4 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-all font-bold text-[11px] uppercase tracking-wider shadow-sm"
                  >
                    <Upload size={14} />
                    <span className="hidden xl:inline">Bulk Import</span>
                  </button>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 h-10 px-5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all font-black text-[11px] uppercase tracking-[0.1em] active:scale-95"
                  >
                    <Plus size={14} strokeWidth={3} />
                    <span>Register</span>
                  </button>
                </>
              )}
            </div>
        </div>
      </div>

      {availableSheets.length > 0 && (
        <div className="flex space-x-2 border-b border-slate-200 overflow-x-auto pb-2 px-1">
          <button
            onClick={() => setSheetFilter('All')}
            className={`px-6 py-3 text-sm font-bold whitespace-nowrap rounded-2xl transition-all transform hover:-translate-y-0.5 shadow-md hover:shadow-lg ${sheetFilter === 'All'
                ? 'bg-indigo-600 text-white shadow-indigo-500/30'
                : 'bg-white text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100'
              }`}
          >
            All Pages
          </button>
          {availableSheets.map(s => (
            <button
              key={s}
              onClick={() => setSheetFilter(s)}
              className={`px-6 py-3 text-sm font-bold whitespace-nowrap rounded-2xl transition-all transform hover:-translate-y-0.5 shadow-md hover:shadow-lg ${sheetFilter === s
                  ? 'bg-indigo-600 text-white shadow-indigo-500/30'
                  : 'bg-white text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100'
                }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
