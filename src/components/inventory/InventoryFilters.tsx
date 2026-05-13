import React, { useMemo } from 'react';
import { Search, Download, Upload, Plus } from 'lucide-react';
import { Branch, ArtworkStatus, UserPermissions, ExhibitionEvent } from '../../types';
import { ExportDropdown } from '../ExportDropdown';

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
  exportPDF: () => void;
  exportImage: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  setShowAddModal: (val: boolean) => void;
  exhibitFilter: string;
  setExhibitFilter: (val: string) => void;
  clientFilter: string;
  setClientFilter: (val: string) => void;
  typeFilter: string;
  setTypeFilter: (val: string) => void;
  events: ExhibitionEvent[];
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
  exportPDF,
  exportImage,
  handleFileChange,
  fileInputRef,
  setShowAddModal,
  exhibitFilter,
  setExhibitFilter,
  clientFilter,
  setClientFilter,
  typeFilter,
  setTypeFilter,
  events
}) => {
  const controlClass = "h-9 bg-white border-0 px-3 text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer uppercase tracking-[0.04em]";
  const groupClass = "flex min-w-0 items-center overflow-hidden rounded-sm border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]";
  const separatorClass = "h-5 w-px bg-slate-200";
  const commandButtonClass = "inline-flex h-9 items-center justify-center gap-2 rounded-sm border border-slate-200 bg-white px-3 text-[11px] font-bold uppercase tracking-[0.05em] text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-colors hover:bg-slate-50 hover:text-blue-700 active:bg-slate-100";

  const sortedUniqueBranches = useMemo(() => {
    return Array.from(new Set(branches)).sort((a, b) => a.localeCompare(b));
  }, [branches]);

  return (
    <div className="space-y-3">
      {/* TOP ROW: PRIMARY ACTIONS & SEARCH */}
      <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-3 min-w-[320px]">
            {(permissions?.canEditArtwork || permissions?.canSellArtwork || permissions?.canDeleteArtwork) && (
              <button
                onClick={handleSelectAll}
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-sm border border-slate-200 bg-white px-3 text-[11px] font-bold uppercase tracking-[0.05em] text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-colors hover:bg-slate-50 active:bg-slate-100 whitespace-nowrap"
              >
                <div className={`w-3.5 h-3.5 rounded-sm border ${selectedIds.length === filteredCount ? 'bg-blue-600 border-blue-600' : 'border-slate-400'}`}>
                  {selectedIds.length === filteredCount && <svg className="w-full h-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
                <span>Select All</span>
              </button>
            )}

            <div className="relative flex-1 group max-w-2xl">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none group-focus-within:text-blue-600 transition-colors">
                <Search size={14} />
              </div>
              <input
                type="text"
                placeholder="Search assets (Title, Code, Artist...)"
                className="block h-9 w-full rounded-sm border border-slate-200 bg-white pl-9 pr-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {permissions?.canEditArtwork && (
              <ExportDropdown
                onExportExcel={exportInventory}
                onExportPDF={exportPDF}
                onExportImage={exportImage}
                buttonClassName={commandButtonClass}
              />
            )}
            {permissions?.canAddArtwork && (
              <>
                <input type="file" accept=".csv, .xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={commandButtonClass}
                >
                  <Upload size={14} />
                  <span className="hidden xl:inline">Bulk Import</span>
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-sm bg-blue-600 px-4 text-[11px] font-bold uppercase tracking-[0.05em] text-white shadow-[0_2px_6px_rgba(37,99,235,0.25)] transition-colors hover:bg-blue-700 active:bg-blue-800"
                >
                  <Plus size={14} strokeWidth={3} />
                  <span>Register</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: DIMENSIONAL FILTERS */}
      <div className="rounded-sm border border-slate-200 bg-slate-50/70 p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className={groupClass}>
            <select
              value={dateMonthFilter}
              onChange={(e) => setDateMonthFilter(e.target.value)}
              className={`${controlClass} min-w-[104px]`}
            >
              <option value="All">Months</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={String(m)}>{monthNames[m - 1]}</option>
              ))}
            </select>
            <div className={separatorClass}></div>
            <select
              value={dateYearFilter}
              onChange={(e) => setDateYearFilter(e.target.value)}
              className={`${controlClass} min-w-[84px]`}
            >
              <option value="All">Years</option>
              {Array.from({ length: new Date().getFullYear() - 1970 + 1 }, (_, i) => new Date().getFullYear() - i).map(y => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </div>

          <div className={groupClass}>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className={`${controlClass} min-w-[180px] text-blue-700`}
            >
              <option value="All">All Branches</option>
              {sortedUniqueBranches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div className={groupClass}>
            <select
              value={artistFilter}
              onChange={(e) => setArtistFilter(e.target.value)}
              className={`${controlClass} min-w-[150px] max-w-[190px]`}
            >
              <option value="All">All Artists</option>
              {availableArtists.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <div className={separatorClass}></div>
            <select
              value={mediumFilter}
              onChange={(e) => setMediumFilter(e.target.value)}
              className={`${controlClass} min-w-[150px] max-w-[190px]`}
            >
              <option value="All">All Mediums</option>
              {availableMediums.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className={groupClass}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`${controlClass} min-w-[140px]`}
            >
              <option value="All">Status</option>
              <option value="In Transit">In Transit</option>
              {Object.values(ArtworkStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className={separatorClass}></div>
            <input
              type="text"
              placeholder="Size..."
              value={sizeFilter}
              onChange={(e) => setSizeFilter(e.target.value)}
              className="h-9 w-24 border-0 bg-white px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {statusFilter === ArtworkStatus.SOLD && (
            <div className={groupClass}>
              <select
                value={paymentTypeFilter}
                onChange={(e) => setPaymentTypeFilter(e.target.value)}
                className={`${controlClass} min-w-[150px] text-emerald-700`}
              >
                <option value="All">Payment Type</option>
                <option value="Full">Full Payment</option>
                <option value="Downpayment">Downpayment</option>
              </select>
            </div>
          )}

          <div className={groupClass}>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={`${controlClass} min-w-[120px] text-indigo-700`}
            >
              <option value="All">All Types</option>
              <option value="Painting">Painting</option>
              <option value="Sculpture">Sculpture</option>
            </select>
          </div>

          <div className={groupClass}>
            <select
              value={exhibitFilter}
              onChange={(e) => setExhibitFilter(e.target.value)}
              className={`${controlClass} min-w-[200px] text-blue-600`}
            >
              <option value="All">All Exhibits & Events</option>
              {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          </div>

          <div className="flex min-w-[220px] items-center overflow-hidden rounded-sm border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
            <input
              type="text"
              placeholder="Filter by Client/Remarks..."
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="h-9 w-full border-0 bg-white px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </div>

      {availableSheets.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 px-1 pb-2">
          <button
            onClick={() => setSheetFilter('All')}
            className={`h-8 px-3 text-[11px] font-bold uppercase tracking-[0.05em] whitespace-nowrap rounded-sm border transition-colors ${sheetFilter === 'All'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 hover:text-blue-700 hover:bg-blue-50 border-slate-200'
              }`}
          >
            All Pages
          </button>
          {availableSheets.map(s => (
            <button
              key={s}
              onClick={() => setSheetFilter(s)}
              className={`h-8 px-3 text-[11px] font-bold uppercase tracking-[0.05em] whitespace-nowrap rounded-sm border transition-colors ${sheetFilter === s
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 hover:text-blue-700 hover:bg-blue-50 border-slate-200'
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
