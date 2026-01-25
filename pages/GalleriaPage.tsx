import React, { useState } from 'react';
import { ExhibitionEvent, Artwork, MonitoringEntry, SaleRecord, UserPermissions } from '../types';
import EventManagement from './EventManagement';
import BranchManagement from './BranchManagement';
import MonitoringSummaryPage from './MonitoringSummaryPage';
import Inventory from './Inventory';
import { Calendar, Building2, FileSpreadsheet, Sparkles, Box } from 'lucide-react';

interface GalleriaPageProps {
  events: ExhibitionEvent[];
  artworks: Artwork[];
  branches: string[];
  branchAddresses: Record<string, string>;
  monitoringEntries: MonitoringEntry[];
  sales: SaleRecord[];
  onView: (id: string) => void;
  // Read-only actions (some might be needed for internal state of sub-components, but won't be executed due to read-only mode)
  // We can pass empty functions or appropriate no-ops
}

const GalleriaPage: React.FC<GalleriaPageProps> = (props) => {
  const [activeTab, setActiveTab] = useState<'branches' | 'events' | 'monitoring' | 'inventory'>('branches');

  // Permissions for read-only view
  const readOnlyPermissions: UserPermissions = {
    canAddArtwork: false,
    canEditArtwork: false,
    canManageAccounts: false,
    canAccessCertificate: false,
    canAttachITDR: false,
    canDeleteArtwork: false,
    canSellArtwork: false,
    canReserveArtwork: false,
    canManageEvents: false,
    canTransferArtwork: false,
    canViewSalesHistory: false,
  };

  const tabs = [
    { id: 'branches', label: 'Branches', icon: <Building2 size={18} /> },
    { id: 'events', label: 'Events', icon: <Calendar size={18} /> },
    { id: 'monitoring', label: 'Monitoring', icon: <FileSpreadsheet size={18} /> },
    { id: 'inventory', label: 'Inventory', icon: <Box size={18} /> },
  ];

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Sparkles className="text-purple-600" size={24} />
            Galleria
          </h1>
          <p className="text-slate-500 font-medium">Gallery overview and status.</p>
        </div>
      </div>

      <div className="flex space-x-1 bg-slate-100 p-1 rounded-2xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto">
          {activeTab === 'branches' && (
            <div className="p-8">
              <BranchManagement 
                artworks={props.artworks}
                branches={props.branches}
                branchAddresses={props.branchAddresses}
                sales={props.sales}
                events={props.events}
                onAddBranch={() => {}}
                onUpdateBranch={() => {}}
                onDeleteBranch={() => {}}
                onUpdateBranchAddress={() => {}}
                onViewArt={props.onView}
                canEdit={false}
              />
            </div>
          )}

          {activeTab === 'events' && (
            <div className="p-8">
              <EventManagement 
                events={props.events}
                artworks={props.artworks}
                branches={props.branches}
                onAddEvent={() => {}}
                onDeleteEvent={() => {}}
                onUpdateEvent={() => {}}
                onViewArt={props.onView}
                canEdit={false}
              />
            </div>
          )}

          {activeTab === 'monitoring' && (
            <div className="p-8">
              <MonitoringSummaryPage 
                entries={props.monitoringEntries}
                branches={props.branches}
                onAddEntry={() => {}}
                onUpdateEntry={() => {}}
                onDeleteEntry={() => {}}
                canEdit={false}
                canExport={false}
              />
            </div>
          )}

          {activeTab === 'inventory' && (
            <Inventory 
              artworks={props.artworks}
              branches={props.branches}
              onView={props.onView}
              permissions={readOnlyPermissions}
              canAdd={false}
              onAdd={() => {}}
              onBulkAdd={() => {}}
              onAddBranch={() => {}}
              onEdit={() => {}}
              events={props.events}
              preventDuplicates={true}
              importedFilenames={[]}
              sales={props.sales}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default GalleriaPage;
