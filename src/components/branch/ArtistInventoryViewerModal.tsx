import React from 'react';
import { XCircle, ShoppingBag, Search, Trash2, Image as ImageIcon } from 'lucide-react';
import { Artwork, ArtworkStatus } from '../../types';
import { OptimizedImage } from '../OptimizedImage';
import { formatDimensions } from '../../utils/unitUtils';

interface ArtistInventoryViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedArtist: string;
  activeBranch: string;
  availableForArtist: Artwork[];
  reservedForArtist: Artwork[];
  soldForArtist: Artwork[];
  exclusiveForArtist: Artwork[];
  auctionForArtist: Artwork[];
  retouchForArtist: Artwork[];
  framerForArtist: Artwork[];
  artistStatusFilter: string;
  setArtistStatusFilter: (status: any) => void;
  filteredCurrentList: Artwork[];
  selectedArtworkIds: string[];
  toggleSelect: (id: string, e: React.MouseEvent) => void;
  handleDeleteArtwork: (id: string, e: React.MouseEvent) => void;
  handleSelectAllForArtist: (arts: Artwork[]) => void;
  modalSearch: string;
  setModalSearch: (val: string) => void;
  modalStatus: string;
  setModalStatus: (val: string) => void;
  modalMedium: string;
  setModalMedium: (val: string) => void;
  modalYear: string;
  setModalYear: (val: string) => void;
  modalSize: string;
  setModalSize: (val: string) => void;
  modalFramedSize: string;
  setModalFramedSize: (val: string) => void;
  modalUniqueStatuses: string[];
  modalUniqueMediums: string[];
  modalUniqueYears: string[];
  modalUniqueSizes: string[];
  modalUniqueFramedSizes: string[];
  allSelectedForArtist: boolean;
  onViewArtwork?: (id: string) => void;
  canEdit: boolean;
  setIsCartOpen: (open: boolean) => void;
}

export const ArtistInventoryViewerModal: React.FC<ArtistInventoryViewerModalProps> = ({
  isOpen,
  onClose,
  selectedArtist,
  activeBranch,
  availableForArtist,
  reservedForArtist,
  soldForArtist,
  exclusiveForArtist,
  auctionForArtist,
  retouchForArtist,
  framerForArtist,
  artistStatusFilter,
  setArtistStatusFilter,
  filteredCurrentList,
  selectedArtworkIds,
  toggleSelect,
  handleDeleteArtwork,
  handleSelectAllForArtist,
  modalSearch,
  setModalSearch,
  modalStatus,
  setModalStatus,
  modalMedium,
  setModalMedium,
  modalYear,
  setModalYear,
  modalSize,
  setModalSize,
  modalFramedSize,
  setModalFramedSize,
  modalUniqueStatuses,
  modalUniqueMediums,
  modalUniqueYears,
  modalUniqueSizes,
  modalUniqueFramedSizes,
  allSelectedForArtist,
  onViewArtwork,
  canEdit,
  setIsCartOpen
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-neutral-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-neutral-200">
        <div className="px-4 py-4 sm:px-6 sm:py-4 border-b border-neutral-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
          <div className="flex items-center gap-3 w-full sm:w-auto pr-0 sm:pr-24">
            <button
              onClick={() => setIsCartOpen(true)}
              className="w-9 h-9 rounded-sm flex items-center justify-center transition-all bg-neutral-100 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-600 flex-shrink-0 border border-neutral-200"
              title="Review Selection"
            >
              <ShoppingBag size={18} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-[11px] font-bold text-neutral-500 uppercase tracking-[0.18em] truncate">
                Artworks
              </p>
              <p className="text-sm font-bold text-neutral-900 truncate">
                {selectedArtist} at {activeBranch}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto static sm:absolute sm:right-6 sm:top-1/2 sm:-translate-y-1/2 inline-flex items-center justify-center gap-2 px-3 py-2 sm:py-1.5 rounded-xl sm:rounded-full text-xs font-semibold text-neutral-600 bg-neutral-100 sm:bg-transparent hover:bg-neutral-200 sm:hover:bg-neutral-100 z-10 transition-colors"
          >
            <XCircle className="w-4 h-4" />
            <span>Close Viewer</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                Paintings by {selectedArtist}
              </p>
              <span
                onClick={() => setArtistStatusFilter('All')}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${artistStatusFilter === 'All'
                  ? 'text-white bg-neutral-900 border-neutral-900 shadow-sm'
                  : 'text-neutral-500 bg-neutral-50 border-neutral-100 hover:bg-neutral-100'
                  }`}
              >
                {availableForArtist.length + reservedForArtist.length + soldForArtist.length + exclusiveForArtist.length + retouchForArtist.length + framerForArtist.length} pieces
              </span>
              <span
                onClick={() => setArtistStatusFilter(ArtworkStatus.AVAILABLE)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border cursor-pointer transition-colors ${artistStatusFilter === ArtworkStatus.AVAILABLE
                  ? 'text-white bg-emerald-600 border-emerald-600'
                  : 'text-neutral-600 bg-neutral-50 border-neutral-100 hover:bg-neutral-100'
                  }`}
              >
                {availableForArtist.length} available
              </span>
              {reservedForArtist.length > 0 && (
                <span
                  onClick={() => setArtistStatusFilter(ArtworkStatus.RESERVED)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer transition-colors ${artistStatusFilter === ArtworkStatus.RESERVED
                    ? 'text-neutral-900 bg-neutral-100 border-neutral-200'
                    : 'text-neutral-700 bg-neutral-50 border-neutral-100 hover:bg-neutral-100'
                    }`}
                >
                  {reservedForArtist.length} reserved
                </span>
              )}
              {soldForArtist.length > 0 && (
                <span
                  onClick={() => setArtistStatusFilter(ArtworkStatus.SOLD)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer transition-colors ${artistStatusFilter === ArtworkStatus.SOLD
                    ? 'text-red-700 bg-red-50 border-red-200'
                    : 'text-neutral-600 bg-neutral-50 border-red-200 hover:bg-neutral-100'
                    }`}
                >
                  {soldForArtist.length} sold
                </span>
              )}
              {exclusiveForArtist.length > 0 && (
                <span
                  onClick={() => setArtistStatusFilter(ArtworkStatus.EXCLUSIVE_VIEW_ONLY)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer transition-colors ${artistStatusFilter === ArtworkStatus.EXCLUSIVE_VIEW_ONLY
                    ? 'text-neutral-900 bg-neutral-200 border-neutral-300'
                    : 'text-neutral-600 bg-neutral-100 border-neutral-200 hover:bg-neutral-200'
                    }`}
                >
                  {exclusiveForArtist.length} view only
                </span>
              )}
              {auctionForArtist.length > 0 && (
                <span
                  onClick={() => setArtistStatusFilter('Auction')}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer transition-colors ${artistStatusFilter === 'Auction'
                    ? 'text-amber-900 bg-amber-100 border-amber-200'
                    : 'text-neutral-600 bg-neutral-50 border-neutral-100 hover:bg-neutral-100'
                    }`}
                >
                  {auctionForArtist.length} auction
                </span>
              )}
              {retouchForArtist.length > 0 && (
                <span
                  onClick={() => setArtistStatusFilter(ArtworkStatus.FOR_RETOUCH)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer transition-colors ${artistStatusFilter === ArtworkStatus.FOR_RETOUCH
                    ? 'text-purple-900 bg-purple-100 border-purple-200'
                    : 'text-neutral-600 bg-neutral-50 border-neutral-100 hover:bg-neutral-100'
                    }`}
                >
                  {retouchForArtist.length} retouch
                </span>
              )}
              {framerForArtist.length > 0 && (
                <span
                  onClick={() => setArtistStatusFilter(ArtworkStatus.FOR_FRAMING)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer transition-colors ${artistStatusFilter === ArtworkStatus.FOR_FRAMING
                    ? 'text-blue-900 bg-blue-100 border-blue-200'
                    : 'text-neutral-600 bg-neutral-50 border-neutral-100 hover:bg-neutral-100'
                    }`}
                >
                  {framerForArtist.length} framer
                </span>
              )}
              <span className="ml-2 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                Showing: {
                  artistStatusFilter === 'All' ? 'Total Portfolio' :
                    artistStatusFilter === ArtworkStatus.AVAILABLE ? 'Available' :
                      artistStatusFilter === ArtworkStatus.RESERVED ? 'Reserved' :
                        artistStatusFilter === ArtworkStatus.EXCLUSIVE_VIEW_ONLY ? 'Not For Sale' :
                          artistStatusFilter === ArtworkStatus.SOLD ? 'Sold' :
                            artistStatusFilter === 'Auction' ? 'Auction' :
                              artistStatusFilter === ArtworkStatus.FOR_RETOUCH ? 'For Retouch' :
                                artistStatusFilter === ArtworkStatus.FOR_FRAMING ? 'For Framing' :
                                  'Items'
                }
              </span>
            </div>
            {filteredCurrentList.length > 0 && (
              <button
                type="button"
                onClick={() => handleSelectAllForArtist(filteredCurrentList)}
                disabled={!canEdit}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors ${!canEdit ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed' : 'bg-neutral-900 text-neutral-50 border-neutral-700 hover:bg-black'}`}
              >
                {allSelectedForArtist ? 'Clear Selection' : 'Select All'}
              </button>
            )}
          </div>

          <div className="flex flex-col xl:flex-row items-center gap-3 mb-4 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
            <div className="relative flex-1 w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search in this view..."
                value={modalSearch}
                onChange={e => setModalSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
              <select
                value={modalStatus}
                onChange={e => setModalStatus(e.target.value)}
                className="flex-1 min-w-[120px] bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-neutral-900 cursor-pointer"
              >
                <option value="All">All Statuses</option>
                {modalUniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={modalMedium}
                onChange={e => setModalMedium(e.target.value)}
                className="flex-1 min-w-[120px] bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-neutral-900 cursor-pointer"
              >
                <option value="All">All Mediums</option>
                {modalUniqueMediums.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select
                value={modalYear}
                onChange={e => setModalYear(e.target.value)}
                className="flex-1 min-w-[100px] bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-neutral-900 cursor-pointer"
              >
                <option value="All">All Years</option>
                {modalUniqueYears.map(y => <option key={y} value={String(y)}>{y}</option>)}
              </select>
              <select
                value={modalSize}
                onChange={e => setModalSize(e.target.value)}
                className="flex-1 min-w-[120px] bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-neutral-900 cursor-pointer"
              >
                <option value="All">All Sizes</option>
                {modalUniqueSizes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={modalFramedSize}
                onChange={e => setModalFramedSize(e.target.value)}
                className="flex-1 min-w-[120px] bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-neutral-900 cursor-pointer"
              >
                <option value="All">Framed Sizes</option>
                {modalUniqueFramedSizes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {filteredCurrentList.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {filteredCurrentList.map(art => (
                <div
                  key={art.id}
                  onClick={() => onViewArtwork?.(art.id)}
                  className={`group bg-white rounded-xl sm:rounded-2xl border ${selectedArtworkIds.includes(art.id)
                    ? 'border-neutral-900 ring-2 sm:ring-4 ring-neutral-900/10'
                    : 'border-neutral-200'
                    } overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col h-full hover:-translate-y-1 relative`}
                >
                  <div
                    onClick={(e) => toggleSelect(art.id, e)}
                    className={`absolute top-2 left-2 z-10 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedArtworkIds.includes(art.id)
                      ? 'bg-neutral-900 border-neutral-900 text-white'
                      : 'bg-white/80 backdrop-blur border-neutral-300 opacity-0 group-hover:opacity-100'
                      } ${!canEdit ? 'hidden' : 'cursor-pointer'}`}
                  >
                    {selectedArtworkIds.includes(art.id) && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  <button
                    onClick={(e) => handleDeleteArtwork(art.id, e)}
                    className={`absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/80 backdrop-blur border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all opacity-0 group-hover:opacity-100 ${!canEdit ? 'hidden' : 'cursor-pointer'}`}
                    title="Delete Artwork"
                  >
                    <Trash2 size={12} />
                  </button>
                  <div className="w-full aspect-[4/5] sm:aspect-[4/3] overflow-hidden relative flex-shrink-0 bg-neutral-100">
                    <OptimizedImage
                      src={art.imageUrl || undefined}
                      alt={art.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    {art.status === ArtworkStatus.RESERVED && (
                      <div className="absolute bottom-0 left-0 right-0 bg-amber-500/90 text-white text-[9px] font-bold px-2 py-1 text-center backdrop-blur-sm">
                        {art.reservationDetails || 'RESERVED'}
                      </div>
                    )}
                  </div>
                  <div className="p-2 sm:p-4 flex-1 flex flex-col min-w-0">
                    <div className="mb-1 space-y-0.5">
                      <h4 className="text-xs sm:text-sm font-bold text-neutral-900 leading-tight line-clamp-1 group-hover:text-neutral-600 transition-colors">
                        {art.title}
                      </h4>
                      <p className="text-[10px] sm:text-xs text-neutral-500 line-clamp-1">
                        {art.medium}
                      </p>
                      <p className={`text-[9px] sm:text-[11px] text-neutral-400 line-clamp-1`}>
                        {formatDimensions(art.dimensions, art.artist)}
                      </p>
                    </div>
                    <div className="mt-auto pt-2 flex items-center justify-between border-t border-neutral-100">
                      <p className="text-[10px] sm:text-[11px] text-neutral-500 font-medium truncate">
                        ₱{(art.price || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-neutral-400">
              {availableForArtist.length + reservedForArtist.length + soldForArtist.length + exclusiveForArtist.length === 0
                ? 'No paintings for this artist at this branch.'
                : artistStatusFilter === ArtworkStatus.AVAILABLE
                  ? 'No available paintings for this artist at this branch.'
                  : artistStatusFilter === ArtworkStatus.RESERVED
                    ? 'No reserved paintings for this artist at this branch.'
                    : artistStatusFilter === ArtworkStatus.EXCLUSIVE_VIEW_ONLY
                      ? 'No "Not For Sale" paintings for this artist at this branch.'
                      : 'No sold paintings for this artist at this branch.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
