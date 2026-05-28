import React, { useState } from 'react';
import { Modal } from '../Modal';
import { Plus } from 'lucide-react';
import { Artwork, ExhibitionEvent, ArtworkStatus } from '../../types';

interface ReservationSetupModalProps {
  artwork: Artwork;
  events: ExhibitionEvent[];
  onReserve?: (id: string, details: string, expiryDate?: string, eventId?: string, eventName?: string, remarks?: string) => Promise<boolean | void> | boolean | void;
  onClose: () => void;
  onNavigateTo?: (tab: string, view?: string) => void;
  onAddToAuction?: (artworkIds: string[], auctionId: string, name: string, remarks?: string) => Promise<boolean | void> | boolean | void;
  onReservationComplete?: () => void;
  wrapAction: (
    action: () => Promise<boolean | void> | boolean | void,
    message?: string,
    optionsOrStatus?: any
  ) => Promise<boolean | undefined>;
}

export const ReservationSetupModal: React.FC<ReservationSetupModalProps> = ({
  artwork,
  events,
  onReserve,
  onClose,
  onNavigateTo,
  onAddToAuction,
  onReservationComplete,
  wrapAction
}) => {
  const [reserveType, setReserveType] = useState<'Person' | 'Event' | 'Auction'>('Person');
  const [reserveTarget, setReserveTarget] = useState('');
  const [reserveNotes, setReserveNotes] = useState('');
  const [reserveDays, setReserveDays] = useState(3);
  const [reserveHours, setReserveHours] = useState(0);
  const [reserveMinutes, setReserveMinutes] = useState(0);
  const [handlingAgentName, setHandlingAgentName] = useState('');

  const handleReserveSubmit = async () => {
    if (reserveType === 'Auction') {
      if (!reserveTarget) {
        alert('Please select an auction.');
        return;
      }
      await wrapAction(async () => {
        if (onAddToAuction) {
          const auction = events?.find(e => e.id === reserveTarget);
          const fullNotes = reserveNotes.trim()
            ? `${reserveNotes} | Handling Agent: ${handlingAgentName.trim()}`
            : `Handling Agent: ${handlingAgentName.trim()}`;
          const result = await onAddToAuction([artwork.id], reserveTarget, auction?.title || 'Auction', fullNotes);
          if (result === false) throw new Error('Auction reservation failed');
          if (onNavigateTo) {
            onNavigateTo('operations', 'auctions');
          }
          onClose();
        }
      }, 'Processing Auction Entry...', ArtworkStatus.RESERVED);
      return;
    }

    if (!onReserve) return;

    await wrapAction(async () => {
      let detailString = `Type: ${reserveType} | Target: ${reserveTarget}`;
      let targetName: string | undefined = undefined;
      let eventIdForUpdate: string | undefined = undefined;

      if (reserveType === 'Event') {
        const evt = events.find(e => e.id === reserveTarget);
        if (evt) {
          targetName = evt.title;
          eventIdForUpdate = evt.id;
          detailString = `Type: ${reserveType} | Event: ${evt.title}`;
        }
      } else {
        targetName = reserveTarget;
        detailString = `Type: ${reserveType} | Client: ${reserveTarget}`;
      }

      let expiryDateStr: string | undefined = undefined;

      if (reserveType === 'Person') {
        const now = new Date();
        const totalMs = (reserveDays * 24 * 60 * 60 * 1000) +
          (reserveHours * 60 * 60 * 1000) +
          (reserveMinutes * 60 * 1000);
        expiryDateStr = new Date(now.getTime() + totalMs).toISOString();
      }

      const fullNotes = reserveNotes.trim()
        ? `${reserveNotes} | Handling Agent: ${handlingAgentName.trim()}`
        : `Handling Agent: ${handlingAgentName.trim()}`;

      const result = await onReserve(artwork.id, detailString, expiryDateStr, eventIdForUpdate, eventIdForUpdate ? targetName : undefined, fullNotes);
      if (result === false) throw new Error('Reservation failed');
      onClose();

      if (onReservationComplete) {
        onReservationComplete();
      }
    }, 'Securing Reservation...', ArtworkStatus.RESERVED);
  };

  return (
    <Modal onClose={onClose} title="Artwork Reservation Setup">
      <div className="space-y-6">
        <div className="flex p-1 bg-neutral-100 rounded-sm">
          <button
            onClick={() => { setReserveType('Person'); setReserveTarget(''); }}
            className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-sm transition-all ${reserveType === 'Person' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'}`}
          >
            Person
          </button>
          <button
            onClick={() => { setReserveType('Event'); setReserveTarget(''); }}
            className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-sm transition-all ${reserveType === 'Event' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'}`}
          >
            Event
          </button>
          <button
            onClick={() => { setReserveType('Auction'); setReserveTarget(''); }}
            className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-sm transition-all ${reserveType === 'Auction' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'}`}
          >
            Auction
          </button>
        </div>

        <div className="space-y-4">
          {reserveType === 'Person' && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Client Name</label>
              <input
                type="text"
                placeholder="Enter full name..."
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm"
                value={reserveTarget}
                onChange={(e) => setReserveTarget(e.target.value)}
              />
            </div>
          )}

          {reserveType === 'Event' && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Select Exhibition</label>
              <select
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm"
                value={reserveTarget}
                onChange={(e) => setReserveTarget(e.target.value)}
              >
                <option value="">Choose an event...</option>
                {events
                  .filter(e => e.type !== 'Auction')
                  .filter(e => {
                    if (e.status === 'Recent' || e.status === 'Closed') return false;
                    if (e.isStrictDuration && e.endDate) {
                      const end = new Date(e.endDate);
                      end.setHours(23, 59, 59, 999);
                      if (end.getTime() < Date.now()) return false;
                    }
                    return true;
                  })
                  .map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
              </select>
            </div>
          )}

          {reserveType === 'Auction' && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Select Auction</label>
              {events
                .filter(e => e.type === 'Auction')
                .filter(e => {
                  if (e.status === 'Recent' || e.status === 'Closed') return false;
                  if (e.isStrictDuration && e.endDate) {
                    const end = new Date(e.endDate);
                    end.setHours(23, 59, 59, 999);
                    if (end.getTime() < Date.now()) return false;
                  }
                  return true;
                }).length > 0 ? (
                <select
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm"
                  value={reserveTarget}
                  onChange={(e) => setReserveTarget(e.target.value)}
                >
                  <option value="">Choose an auction...</option>
                  {events
                    .filter(e => e.type === 'Auction')
                    .filter(e => {
                      if (e.status === 'Recent' || e.status === 'Closed') return false;
                      if (e.isStrictDuration && e.endDate) {
                        const end = new Date(e.endDate);
                        end.setHours(23, 59, 59, 999);
                        if (end.getTime() < Date.now()) return false;
                      }
                      return true;
                    })
                    .map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>
              ) : (
                <div className="p-4 bg-neutral-100 rounded-sm text-center space-y-2 border border-neutral-200">
                  <p className="text-sm font-bold text-neutral-600">No Active Auctions</p>
                  <p className="text-xs text-neutral-500">You must schedule an auction in Operations &gt; Auctions before reserving items for it.</p>
                </div>
              )}
            </div>
          )}

          {reserveType === 'Person' && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Duration (Auto-Revert)</label>
              <div className="flex gap-2">
                {(['Days', 'Hours', 'Minutes'] as const).map(u => {
                  const val = u === 'Days' ? reserveDays : u === 'Hours' ? reserveHours : reserveMinutes;
                  return (
                    <div key={u} className="flex-1 space-y-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm font-bold text-center"
                        value={val}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '');
                          const v = Math.max(0, parseInt(raw, 10) || 0);
                          if (u === 'Days') setReserveDays(v);
                          else if (u === 'Hours') setReserveHours(v);
                          else setReserveMinutes(v);
                        }}
                      />
                      <p className="text-[10px] text-center font-bold text-neutral-400 uppercase tracking-widest">{u}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1 flex items-center justify-between">
            <span>Handling Agent Name <span className="text-red-500 font-bold">*</span></span>
            <span className="text-red-500 text-[8px] font-black">Required</span>
          </label>
          <input
            type="text"
            value={handlingAgentName}
            onChange={(e) => setHandlingAgentName(e.target.value)}
            className="w-full px-4 py-3 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-bold text-[#323130] focus:bg-white focus:ring-1 focus:ring-[#0078d4] focus:border-[#0078d4] outline-none transition-all"
            placeholder="Enter handling agent's name..."
            required
          />
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1 flex items-center justify-between">
            <span>Administrative Remarks</span>
            <span className="text-red-500 text-[8px] font-black">Required for Audit</span>
          </label>
          <textarea
            value={reserveNotes}
            onChange={(e) => setReserveNotes(e.target.value)}
            className="w-full px-4 py-3 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-bold text-[#323130] focus:bg-white focus:ring-1 focus:ring-[#0078d4] focus:border-[#0078d4] outline-none transition-all min-h-[80px] resize-none"
            placeholder="Required: Additional audit notes for this reservation..."
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-100">
          <button onClick={onClose} className="px-6 py-2.5 rounded-sm text-neutral-600 font-medium hover:bg-neutral-100 transition-colors">Cancel</button>
          <button
            onClick={handleReserveSubmit}
            disabled={!reserveTarget || !reserveNotes.trim() || !handlingAgentName.trim()}
            className={`px-8 py-2.5 rounded-sm font-bold transition-all transform hover:-translate-y-0.5 shadow-lg ${
              reserveTarget && reserveNotes.trim() && handlingAgentName.trim()
                ? 'bg-neutral-900 text-white hover:bg-black shadow-neutral-200 hover:shadow-neutral-300'
                : 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed shadow-none'
            }`}
          >
            Confirm Reservation
          </button>
        </div>
      </div>
    </Modal>
  );
};
