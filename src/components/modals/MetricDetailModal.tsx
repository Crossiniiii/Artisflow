import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { Artwork, UserPermissions, ArtworkStatus } from '../../types';
import { StatusBadge } from '../StatusBadge';
import { Modal } from '../Modal';

interface MetricDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    artworks: Artwork[];
    onView: (id: string) => void;
    onNavigate?: (target: 'inventory' | 'sales' | 'operations' | 'reservations') => void;
    type?: 'INVENTORY' | 'SOLD' | 'RESERVED' | 'REVENUE';
    permissions?: UserPermissions;
}

export const MetricDetailModal: React.FC<MetricDetailModalProps> = ({ isOpen, onClose, title, artworks, onView, onNavigate, type, permissions }) => {
    const permittedArtworks = React.useMemo(() => {
        return artworks.filter(art => {
            // View Control Permissions
            const canViewReserved = permissions?.canViewReserved ?? true;
            const canViewAuctioned = permissions?.canViewAuctioned ?? true;
            const canViewExhibit = permissions?.canViewExhibit ?? true;
            const canViewForFraming = permissions?.canViewForFraming ?? true;
            const canViewBackToArtist = permissions?.canViewBackToArtist ?? true;

            if (art.status === ArtworkStatus.RESERVED) {
                const isAuction = (art.remarks || '').includes('[Reserved For Auction:');
                const isEvent = (art.remarks || '').includes('[Reserved For Event:');

                if (isAuction) {
                    if (!canViewAuctioned) return false;
                } else if (isEvent) {
                    if (!canViewExhibit) return false;
                } else {
                    if (!canViewReserved) return false;
                }
            } else if (art.status === ArtworkStatus.FOR_FRAMING) {
                if (!canViewForFraming) return false;
            } else if (art.status === ArtworkStatus.FOR_RETOUCH) {
                if (!canViewBackToArtist) return false;
            }
            return true;
        });
    }, [artworks, permissions]);

    if (!isOpen) return null;

    const showNavigateButton = onNavigate && (type === 'RESERVED' || type === 'SOLD' || type === 'REVENUE');
    const navigateTarget = type === 'RESERVED' ? 'reservations' : 'sales';
    const navigateLabel = type === 'RESERVED' ? 'Open Reservation View' : 'Open Sales View';

    return (
        <Modal onClose={onClose} title={title}>
            <div className="space-y-4">
                <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3">
                    {permittedArtworks.length === 0 ? (
                        <div className="text-center py-10 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                            <p className="text-neutral-500 font-medium">No artworks found in this category.</p>
                        </div>
                    ) : (
                        permittedArtworks.map(art => (
                            <div key={art.id} onClick={() => { onClose(); onView(art.id); }} className="relative flex items-center gap-3 p-3 rounded-xl border border-neutral-100 hover:bg-neutral-50 hover:border-neutral-200 transition-all cursor-pointer group overflow-hidden">
                                <div className="w-12 h-12 rounded-lg bg-neutral-100 overflow-hidden flex-shrink-0 border border-neutral-200">
                                    {art.imageUrl ? (
                                        <img src={art.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                                    ) : (
                                        <ImageIcon className="w-5 h-5 text-neutral-300 m-auto mt-3.5" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <div className="flex items-center gap-2 mb-0.5 w-full">
                                        <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0 whitespace-nowrap">{art.code}</span>
                                        <h4 className="font-bold text-neutral-900 text-sm truncate flex-1 min-w-0">{art.title}</h4>
                                    </div>
                                    <p className="text-xs text-neutral-500 truncate w-full">{art.artist} • {art.medium}</p>
                                </div>
                                <div className="text-right flex-shrink-0 ml-2 flex flex-col items-end gap-0.5">
                                    <p className="font-bold text-neutral-900 text-sm whitespace-nowrap">₱{art.price?.toLocaleString()}</p>
                                    <div className="scale-75 origin-right w-fit">
                                        <StatusBadge status={art.status} />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div className="flex justify-end pt-2 border-t border-neutral-100 gap-3">
                    {showNavigateButton && (
                        <button
                            onClick={() => {
                                onClose();
                                onNavigate(navigateTarget);
                            }}
                            className="px-6 py-2.5 bg-neutral-100 text-neutral-900 rounded-xl font-bold hover:bg-neutral-200 transition-colors"
                        >
                            {navigateLabel}
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-neutral-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
};
