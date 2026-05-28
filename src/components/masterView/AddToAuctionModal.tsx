import React, { useState } from 'react';
import { Modal } from '../Modal';
import { Artwork, ExhibitionEvent, ArtworkStatus } from '../../types';

interface AddToAuctionModalProps {
  artwork: Artwork;
  events: ExhibitionEvent[];
  onAddToAuction?: (artworkIds: string[], auctionId: string, name: string, remarks?: string) => Promise<boolean | void> | boolean | void;
  onNavigateTo?: (tab: string, view?: string) => void;
  onClose: () => void;
  wrapAction: (
    action: () => Promise<boolean | void> | boolean | void,
    message?: string,
    optionsOrStatus?: any
  ) => Promise<boolean | undefined>;
}

export const AddToAuctionModal: React.FC<AddToAuctionModalProps> = ({
  artwork,
  events,
  onAddToAuction,
  onNavigateTo,
  onClose,
  wrapAction
}) => {
  const [selectedAuctionId, setSelectedAuctionId] = useState('');
  const [selectedAuctionName, setSelectedAuctionName] = useState('');
  const [auctionRemarks, setAuctionRemarks] = useState('');
  const [handlingAgentName, setHandlingAgentName] = useState('');

  return (
    <Modal onClose={onClose} title="Add to Auction">
      <div className="space-y-6">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Select Auction Event</label>
          <select
            className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm"
            value={selectedAuctionId}
            onChange={(e) => {
              const id = e.target.value;
              const name = events.find(ev => ev.id === id)?.title || '';
              setSelectedAuctionId(id);
              setSelectedAuctionName(name);
            }}
          >
            <option value="" disabled>Choose an auction...</option>
            {events.filter(e => e.type === 'Auction').filter(e => {
              if (e.status === 'Recent' || e.status === 'Closed') return false;
              if (e.isStrictDuration && e.endDate) {
                const end = new Date(e.endDate);
                end.setHours(23, 59, 59, 999);
                if (end.getTime() < Date.now()) return false;
              }
              return true;
            }).map(e => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Handling Agent Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            required
            className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:bg-neutral-50 hover:bg-neutral-100 transition-all"
            placeholder="Enter handling agent's name..."
            value={handlingAgentName}
            onChange={(e) => setHandlingAgentName(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Auction Remarks / Audit Note <span className="text-red-500">*</span></label>
          <textarea
            className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:bg-neutral-50 hover:bg-neutral-100 transition-all min-h-[80px]"
            placeholder="Required for audit (e.g. consignment number, starting bid...)"
            value={auctionRemarks}
            onChange={(e) => setAuctionRemarks(e.target.value)}
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-sm text-neutral-600 font-medium"
          >
            Cancel
          </button>
          <button
            disabled={!selectedAuctionId || !auctionRemarks.trim() || !handlingAgentName.trim()}
            onClick={() => {
              if (selectedAuctionId && onAddToAuction && auctionRemarks.trim() && handlingAgentName.trim()) {
                wrapAction(async () => {
                  const fullRemarks = auctionRemarks.trim()
                    ? `${auctionRemarks} | Handling Agent: ${handlingAgentName.trim()}`
                    : `Handling Agent: ${handlingAgentName.trim()}`;
                  await onAddToAuction([artwork.id], selectedAuctionId, selectedAuctionName, fullRemarks);
                  if (onNavigateTo) {
                    onNavigateTo('operations', 'auctions');
                  }
                  onClose();
                }, 'Adding to Auction...', ArtworkStatus.RESERVED);
              }
            }}
            className="px-8 py-2.5 bg-neutral-900 text-white rounded-sm font-bold shadow-lg shadow-neutral-200 disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      </div>
    </Modal>
  );
};
