import React, { useState } from 'react';
import { ExhibitionEvent, Artwork, SaleRecord, UserPermissions } from '../types';
import EventManagement from './EventManagement';
import BranchManagement from './BranchManagement';
import Inventory from './Inventory';
import { Calendar, Building2, Sparkles, Box } from 'lucide-react';

interface GalleriaPageProps {
  events: ExhibitionEvent[];
  artworks: Artwork[];
  branches: string[];
  branchAddresses: Record<string, string>;
  branchCategories?: Record<string, string>;
  sales: SaleRecord[];
  onView: (id: string) => void;
  // Read-only actions (some might be needed for internal state of sub-components, but won't be executed due to read-only mode)
  // We can pass empty functions or appropriate no-ops
}

const GalleriaPage: React.FC<GalleriaPageProps> = (props) => {
  const [activeTab, setActiveTab] = useState<'branches' | 'events' | 'inventory'>('branches');

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
    canViewReserved: true,
    canViewAuctioned: true,
    canViewExhibit: true,
    canViewForFraming: true,
    canViewBackToArtist: true,
  };

  const tabs = [
    { id: 'branches', label: 'Branches', icon: <Building2 size={18} /> },
    { id: 'events', label: 'Events', icon: <Calendar size={18} /> },
    { id: 'inventory', label: 'Inventory', icon: <Box size={18} /> },
  ];

  return (
    <div className="flex flex-col space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
            <Sparkles className="text-neutral-900" size={24} />
            Galleria
          </h1>
          <p className="text-neutral-500 font-medium">Gallery overview and status.</p>
        </div>
      </div>

      <div className="flex space-x-1 bg-neutral-100 p-1 rounded-2xl w-fit relative z-10">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200/50'
              }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-neutral-100 shadow-xl shadow-neutral-200/50 relative z-0 min-h-[500px]">
        {activeTab === 'branches' && (
          <div className="p-8">
            <BranchManagement
              artworks={props.artworks}
              branches={props.branches}
              branchAddresses={props.branchAddresses}
              branchCategories={props.branchCategories}
              sales={props.sales}
              events={props.events}
              onAddBranch={() => { }}
              onUpdateBranch={() => { }}
              onDeleteBranch={() => { }}
              onUpdateBranchAddress={() => { }}
              onViewArtwork={props.onView}
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
              onAddEvent={() => { }}
              onDeleteEvent={() => { }}
              onUpdateEvent={() => { }}
              onViewArt={props.onView}
              canEdit={false}
            />
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="p-8">
            <Inventory
              artworks={props.artworks}
              branches={props.branches}
              branchCategories={props.branchCategories}
              onView={props.onView}
              onAdd={() => { }}
              permissions={readOnlyPermissions}
              sales={props.sales}
              events={props.events}
              preventDuplicates={true} // Read only view usually
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleriaPage;
