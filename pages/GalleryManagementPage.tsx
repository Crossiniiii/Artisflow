import React, { useEffect, useState } from 'react';
import { ExhibitionEvent, Artwork, MonitoringEntry, SaleRecord, UserPermissions, ReturnRecord } from '../types';
import EventManagement from './EventManagement';
import AuctionManagement from './AuctionManagement';
import BranchManagement from './BranchManagement';
import MonitoringSummaryPage from './MonitoringSummaryPage';
import Inventory from './Inventory';
import ReturnToArtistView from '../components/ReturnToArtistView';
import { Calendar, Building2, FileSpreadsheet, Sparkles, RotateCcw, Gavel } from 'lucide-react';
import { ICONS } from '../constants';

interface GalleryManagementPageProps {
  events: ExhibitionEvent[];
  artworks: Artwork[];
  branches: string[];
  branchAddresses: Record<string, string>;
  exclusiveBranches?: string[];
  sales: SaleRecord[];
  returnRecords: ReturnRecord[];
  onAddEvent: (event: Partial<ExhibitionEvent>) => void;
  onDeleteEvent: (id: string) => void;
  onUpdateEvent: (id: string, updates: Partial<ExhibitionEvent>) => void;
  onAddBranch: (name: string, isExclusive?: boolean) => void;
  onUpdateBranch: (oldName: string, newName: string) => void;
  onDeleteBranch: (name: string) => void;
  onUpdateBranchAddress: (name: string, address: string) => void;
  monitoringEntries: MonitoringEntry[];
  onAddMonitoringEntry: (entry: Omit<MonitoringEntry, 'id'>) => void;
  onUpdateMonitoringEntry: (id: string, updates: Partial<MonitoringEntry>) => void;
  onDeleteMonitoringEntry: (id: string) => void;
  onView: (id: string) => void;
  canAdd: boolean;
  onAddArtwork: (art: Partial<Artwork>) => void;
  onEditArtwork?: (id: string, updates: Partial<Artwork>) => void;
  onBulkAddArtworks?: (artworks: Partial<Artwork>[], filename?: string) => void;
  onBulkUpdateArtworks?: (ids: string[], updates: Partial<Artwork>) => void;
  onBulkSale?: (ids: string[], client: string, delivered: boolean) => void;
  onBulkDeleteArtworks: (ids: string[]) => void;
  onBulkReserveArtworks: (ids: string[], details: string) => void;
  onUpdateReturnRecord?: (id: string, updates: Partial<ReturnRecord>) => void;
  preventDuplicates?: boolean;
  importedFilenames?: string[];
  initialTab?: 'inventory' | 'events' | 'branches' | 'monitoring' | 'returned' | 'auctions';
  onNavigate?: (tab: 'inventory' | 'events' | 'branches' | 'monitoring' | 'returned' | 'auctions') => void;
  userPermissions?: UserPermissions;
}

const GalleryManagementPage: React.FC<GalleryManagementPageProps> = (props) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'events' | 'branches' | 'monitoring' | 'returned' | 'auctions'>(props.initialTab || 'inventory');
  
  useEffect(() => {
    if (props.onNavigate) {
      props.onNavigate(activeTab);
    }
  }, [activeTab]);

  const totalArtworks = props.artworks.length;
  const totalExhibitions = props.events.filter(e => !e.type || e.type === 'Exhibition').length;
  const totalAuctions = props.events.filter(e => e.type === 'Auction').length;
  const totalBranches = props.branches.length;
  const totalMonitoringEntries = props.monitoringEntries.length;

  useEffect(() => {
    if (props.initialTab && props.initialTab !== activeTab) {
      setActiveTab(props.initialTab);
    }
  }, [props.initialTab]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="relative overflow-hidden rounded-[2.2rem] bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-emerald-500 p-[1px] shadow-xl shadow-indigo-500/15">
        <div className="relative rounded-[2.1rem] bg-slate-950 px-6 md:px-8 py-6 md:py-7 text-slate-50">
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <div className="absolute -right-20 -top-24 w-64 h-64 bg-fuchsia-500/40 blur-3xl rounded-full" />
            <div className="absolute -left-16 -bottom-24 w-72 h-72 bg-emerald-400/40 blur-3xl rounded-full" />
          </div>
          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-white/5 border border-white/15 text-emerald-100">
                  <Sparkles size={12} className="mr-1.5" />
                  Gallery Operations
                </div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                  Command Center
                </h1>
                <p className="text-sm md:text-base text-slate-200 max-w-xl">
                  Orchestrate branches, exhibitions, inventory, and monitoring in one vivid cockpit.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 justify-start md:justify-end">
                <div className="flex flex-col px-4 py-3 rounded-2xl bg-white/5 border border-white/15 min-w-[120px]">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">Artworks</span>
                  <span className="mt-1 text-xl font-black">{totalArtworks.toLocaleString()}</span>
                </div>
                <div className="flex flex-col px-4 py-3 rounded-2xl bg-white/5 border border-white/15 min-w-[120px]">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">Branches</span>
                  <span className="mt-1 text-xl font-black">{totalBranches.toLocaleString()}</span>
                </div>
                <div className="flex flex-col px-4 py-3 rounded-2xl bg-white/5 border border-white/15 min-w-[120px]">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">Exhibitions</span>
                  <span className="mt-1 text-xl font-black">{totalExhibitions.toLocaleString()}</span>
                </div>
                <div className="flex flex-col px-4 py-3 rounded-2xl bg-white/5 border border-white/15 min-w-[120px]">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">Auctions</span>
                  <span className="mt-1 text-xl font-black">{totalAuctions.toLocaleString()}</span>
                </div>
                <div className="flex flex-col px-4 py-3 rounded-2xl bg-white/5 border border-white/15 min-w-[140px]">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">Monitoring Logs</span>
                  <span className="mt-1 text-xl font-black">{totalMonitoringEntries.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="inline-flex items-center space-x-2 rounded-full bg-white/5 border border-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Operations Live</span>
              </div>
              <div className="flex bg-slate-900/70 border border-white/10 rounded-2xl p-1 gap-1 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('branches')}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all transform hover:scale-105 active:scale-95 duration-200 ${
                    activeTab === 'branches'
                      ? 'bg-white text-slate-900 shadow-lg shadow-emerald-500/30'
                      : 'text-slate-200 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Building2 size={18} />
                  <span>Branches</span>
                </button>
                <button
                  onClick={() => setActiveTab('events')}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all transform hover:scale-105 active:scale-95 duration-200 ${
                    activeTab === 'events'
                      ? 'bg-white text-slate-900 shadow-lg shadow-fuchsia-500/30'
                      : 'text-slate-200 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Calendar size={18} />
                  <span>Exhibitions</span>
                </button>
                <button
                  onClick={() => setActiveTab('auctions')}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all transform hover:scale-105 active:scale-95 duration-200 ${
                    activeTab === 'auctions'
                      ? 'bg-white text-slate-900 shadow-lg shadow-amber-500/30'
                      : 'text-slate-200 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Gavel size={18} />
                  <span>For Auction</span>
                </button>
                <button
                  onClick={() => setActiveTab('inventory')}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all transform hover:scale-105 active:scale-95 duration-200 ${
                    activeTab === 'inventory'
                      ? 'bg-white text-slate-900 shadow-lg shadow-indigo-500/30'
                      : 'text-slate-200 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{ICONS.Inventory}</span>
                  <span>Inventory</span>
                </button>
                <button
                  onClick={() => setActiveTab('monitoring')}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all transform hover:scale-105 active:scale-95 duration-200 ${
                    activeTab === 'monitoring'
                      ? 'bg-white text-slate-900 shadow-lg shadow-emerald-500/30'
                      : 'text-slate-200 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <FileSpreadsheet size={18} />
                  <span>Monitoring Summary</span>
                </button>
                <button
                  onClick={() => setActiveTab('returned')}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all transform hover:scale-105 active:scale-95 duration-200 ${
                    activeTab === 'returned'
                      ? 'bg-white text-slate-900 shadow-lg shadow-red-500/30'
                      : 'text-slate-200 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <RotateCcw size={18} />
                  <span>Return to Artist</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2">
        {activeTab === 'inventory' && (
          <Inventory
            artworks={props.artworks}
            branches={props.branches}
            onView={props.onView}
            canAdd={props.canAdd}
            onAdd={props.onAddArtwork}
            onBulkAdd={props.onBulkAddArtworks}
            onBulkUpdate={props.onBulkUpdateArtworks}
            onBulkSale={props.onBulkSale}
            onAddBranch={props.onAddBranch}
            onEdit={props.onEditArtwork}
            onBulkDelete={props.onBulkDeleteArtworks}
            onBulkReserve={props.onBulkReserveArtworks}
            events={props.events}
            preventDuplicates={props.preventDuplicates}
            importedFilenames={props.importedFilenames}
            sales={props.sales}
            permissions={props.userPermissions}
          />
        )}
        {activeTab === 'events' && (
          <EventManagement 
            events={props.events.filter(e => !e.type || e.type === 'Exhibition')}
            artworks={props.artworks}
            branches={props.branches}
            onAddEvent={props.onAddEvent}
            onDeleteEvent={props.onDeleteEvent}
            onUpdateEvent={props.onUpdateEvent}
            onViewArt={props.onView}
            canEdit={props.canAdd}
          />
        )}
        {activeTab === 'auctions' && (
          <AuctionManagement 
            events={props.events}
            artworks={props.artworks}
            branches={props.branches}
            onAddEvent={props.onAddEvent}
            onDeleteEvent={props.onDeleteEvent}
            onUpdateEvent={props.onUpdateEvent}
            onViewArt={props.onView}
            canEdit={props.canAdd}
          />
        )}
        {activeTab === 'branches' && (
          <BranchManagement 
            branches={props.branches}
            exclusiveBranches={props.exclusiveBranches}
            branchAddresses={props.branchAddresses}
            artworks={props.artworks}
            onAddBranch={props.onAddBranch}
            onUpdateBranch={props.onUpdateBranch}
            onDeleteBranch={props.onDeleteBranch}
            onUpdateBranchAddress={props.onUpdateBranchAddress}
            onViewArtwork={props.onView}
            events={props.events}
            onBulkSale={props.onBulkSale}
            onBulkReserve={props.onBulkReserveArtworks}
            onBulkDeleteArtworks={props.onBulkDeleteArtworks}
            onBulkUpdateArtworks={props.onBulkUpdateArtworks}
            sales={props.sales}
            canEdit={props.canAdd}
          />
        )}
        {activeTab === 'monitoring' && (
          <MonitoringSummaryPage
            entries={props.monitoringEntries}
            branches={props.branches}
            onAddEntry={props.onAddMonitoringEntry}
            onUpdateEntry={props.onUpdateMonitoringEntry}
            onDeleteEntry={props.onDeleteMonitoringEntry}
            canEdit={props.canAdd}
          />
        )}
        {activeTab === 'returned' && (
          <ReturnToArtistView 
            returnRecords={props.returnRecords} 
            onUpdateReturnRecord={props.onUpdateReturnRecord} 
          />
        )}
      </div>
    </div>
  );
};

export default GalleryManagementPage;
