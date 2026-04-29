import React, { useState, useMemo } from 'react';
import { Artwork, ArtworkStatus, UserPermissions } from '../types';
import { Clock, User, CalendarClock, CheckSquare, Square, XCircle, Trash2 } from 'lucide-react';
import { OptimizedImage } from '../components/OptimizedImage';

interface ReservationsViewProps {
  artworks: Artwork[];
  onView: (id: string) => void;
  onBulkCancel?: (ids: string[]) => void;
  onBulkDelete?: (ids: string[]) => void;
  permissions?: UserPermissions;
}

const ReservationsView: React.FC<ReservationsViewProps> = ({ artworks, onView, onBulkCancel, onBulkDelete, permissions }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const reservedArtworks = useMemo(() => {
    return artworks.filter(a => a.status === ArtworkStatus.RESERVED).filter(art => {
      const canViewReserved = permissions?.canViewReserved ?? true;
      const canViewAuctioned = permissions?.canViewAuctioned ?? true;
      const canViewExhibit = permissions?.canViewExhibit ?? true;

      const isAuction = (art.remarks || '').includes('[Reserved For Auction:');
      const isEvent = (art.remarks || '').includes('[Reserved For Event:');

      if (isAuction) {
        return canViewAuctioned;
      } else if (isEvent) {
        return canViewExhibit;
      } else {
        return canViewReserved;
      }
    });
  }, [artworks, permissions]);

  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === reservedArtworks.length && reservedArtworks.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(reservedArtworks.map(a => a.id));
    }
  };

  const handleBulkAction = (action: 'cancel' | 'delete') => {
    if (action === 'cancel') {
        onBulkCancel?.(selectedIds);
    } else if (action === 'delete') {
        onBulkDelete?.(selectedIds);
    }
    setSelectedIds([]);
  };

  const parseReservationDetails = (remarks?: string) => {
    if (!remarks) return { type: 'N/A', target: 'N/A', notes: '' };
    
    // Format: Type: Person | Target: Name | Notes: ...
    const parts = remarks.split('|').map(p => p.trim());
    const typePart = parts.find(p => p.toLowerCase().startsWith('type:'));
    const targetPart = parts.find(p => p.toLowerCase().startsWith('target:'));
    const notesPart = parts.find(p => p.toLowerCase().startsWith('notes:'));

    // Fallback for old format "Reserved for Auction: EventName"
    if (!typePart && remarks.includes('Reserved for Auction:')) {
        return {
            type: 'Auction',
            target: remarks.replace('Reserved for Auction:', '').trim(),
            notes: ''
        };
    }

    return {
      type: typePart ? typePart.substring(5).trim() : 'N/A',
      target: targetPart ? targetPart.substring(7).trim() : 'N/A',
      notes: notesPart ? notesPart.substring(6).trim() : ''
    };
  };

  const getTimeRemaining = (expiryStr?: string) => {
    if (!expiryStr) return { text: 'No limit', isExpired: false, isUrgent: false };
    const expiry = new Date(expiryStr);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return { text: 'Expired', isExpired: true, isUrgent: false };
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    const isUrgent = diff < (24 * 60 * 60 * 1000); // Less than 24 hours

    if (days > 0) return { text: `${days}d ${hours}h ${minutes}m remaining`, isExpired: false, isUrgent };
    return { text: `${hours}h ${minutes}m remaining`, isExpired: false, isUrgent };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
       <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
           <div className="p-3 bg-neutral-100 text-neutral-900 rounded-xl">
               <CalendarClock size={24} />
           </div>
           <div>
               <h2 className="text-2xl font-black text-neutral-900">Reservations</h2>
               <p className="text-sm text-neutral-500">Manage active artwork reservations and time limits.</p>
           </div>
        </div>
        <div className="flex items-center gap-3">
            <button 
                onClick={toggleSelectAll} 
                className="flex items-center gap-2 px-3 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-bold text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
                {selectedIds.length === reservedArtworks.length && reservedArtworks.length > 0 ? <CheckSquare size={16} className="text-neutral-900" /> : <Square size={16} />}
                Select All
            </button>
            <span className="px-4 py-2 bg-neutral-100 text-neutral-900 border border-neutral-200 rounded-xl font-bold text-sm shadow-sm">
            {reservedArtworks.length} Active
            </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {reservedArtworks.map(art => {
          const details = parseReservationDetails(art.remarks);
          const { text: timeRemaining, isExpired, isUrgent } = getTimeRemaining(art.reservationExpiry);
          const isSelected = selectedIds.includes(art.id);

          return (
           <div 
             key={art.id} 
             onClick={() => onView(art.id)}
             className={`group relative bg-white border rounded-3xl p-5 shadow-sm hover:shadow-xl hover:shadow-neutral-500/10 transition-all hover:-translate-y-1 cursor-pointer ${isSelected ? 'border-neutral-900 ring-1 ring-neutral-900 bg-neutral-50/50' : 'border-neutral-200'}`}
           >
             <div 
                className="absolute top-4 right-4 z-10"
                onClick={(e) => toggleSelect(art.id, e)}
             >
                {isSelected ? <CheckSquare className="text-neutral-900 fill-white" /> : <Square className="text-neutral-300 hover:text-neutral-400" />}
             </div>

              <div className="flex gap-4 mb-4">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-neutral-100 flex-shrink-0 shadow-inner">
                  <OptimizedImage
                    src={art.imageUrl || undefined}
                    alt={art.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                 <h3 className="font-black text-neutral-900 truncate text-lg leading-tight mb-1" title={art.title}>{art.title}</h3>
                 <p className="text-xs font-bold text-neutral-400 mb-2">{art.code}</p>
                 <div className="flex items-center text-xs font-medium text-neutral-600 bg-neutral-50 px-2 py-1 rounded-lg w-fit">
                   <User size={12} className="mr-1.5 text-neutral-500" />
                   <span className="truncate max-w-[120px]" title={details.target}>{details.target}</span>
                 </div>
               </div>
             </div>
             
             <div className="space-y-3">
               <div className="flex items-center justify-between text-xs border-b border-neutral-100 pb-2">
                 <span className="text-neutral-500 font-medium">Type</span>
                 <div className="flex items-center gap-1 font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-md max-w-[180px]" title={`${details.type}: ${details.target}`}>
                   <span>{details.type}</span>
                   {(details.type !== 'N/A' && details.target !== 'N/A') && (
                     <>
                       <span className="text-neutral-400">•</span>
                       <span className="truncate">{details.target}</span>
                     </>
                   )}
                 </div>
               </div>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500 font-medium">Time Limit</span>
                  <div className={`flex items-center gap-1.5 font-bold ${
                      isExpired ? 'text-neutral-500 bg-neutral-100 px-2 py-1 rounded-md' : 
                      isUrgent ? 'text-neutral-900 bg-neutral-200 border border-neutral-300 px-2 py-1 rounded-md animate-pulse' : 
                      'text-neutral-700 bg-neutral-100 px-2 py-1 rounded-md'
                  }`}>
                    <Clock size={12} />
                    <span>{timeRemaining}</span>
                  </div>
                </div>
             </div>
           </div>
          );
        })}
      </div>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-neutral-900 text-neutral-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-4 border border-neutral-800">
            <span className="font-bold text-sm whitespace-nowrap">{selectedIds.length} Selected</span>
            <div className="h-4 w-px bg-neutral-700" />
            
            {onBulkCancel && (
                <button 
                    onClick={() => handleBulkAction('cancel')}
                    className="flex items-center gap-2 hover:text-white transition-colors text-sm font-bold text-neutral-300"
                >
                    <XCircle size={16} />
                    Cancel Reservation
                </button>
            )}
            
            {onBulkDelete && (
                <>
                    <div className="h-4 w-px bg-neutral-700" />
                    <button 
                        onClick={() => handleBulkAction('delete')}
                        className="flex items-center gap-2 text-rose-400 hover:text-rose-300 transition-colors text-sm font-bold"
                    >
                        <Trash2 size={16} />
                        Delete Items
                    </button>
                </>
            )}
        </div>
     )}
    </div>
  );
};

export default ReservationsView;
