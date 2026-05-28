import React from 'react';
import { X, ShoppingBag, Sparkles, Trash2, Image as ImageIcon, MapPin, CheckCircle2, Clock, ArrowRightLeft, Frame, RotateCcw } from 'lucide-react';
import { Artwork, UserPermissions } from '../../types';
import { OptimizedImage } from '../OptimizedImage';

interface BranchInventoryCartProps {
  isOpen: boolean;
  onClose: () => void;
  cartArtworks: Artwork[];
  setSelectedArtworkIds: React.Dispatch<React.SetStateAction<string[]>>;
  bulkActionModal: { type: 'sale' | 'reserve' | 'delete' | 'transfer' | 'auction' | 'framer' | 'return' } | null;
  onBulkActionClick: (type: 'sale' | 'reserve' | 'delete' | 'transfer' | 'auction' | 'framer' | 'return') => void;
  permissions: UserPermissions | undefined;
  canEdit: boolean;
  activeBranch: string | null;
  exclusiveBranches: string[] | undefined;
  cartItemCount: number;
  cartTotalValue: number;
}

export const BranchInventoryCart: React.FC<BranchInventoryCartProps> = ({
  isOpen,
  onClose,
  cartArtworks,
  setSelectedArtworkIds,
  bulkActionModal,
  onBulkActionClick,
  permissions,
  canEdit,
  activeBranch,
  exclusiveBranches,
  cartItemCount,
  cartTotalValue
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-neutral-900/40 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="bg-[#f3f2f1] w-full max-w-5xl h-[90vh] rounded-xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col border border-white/20 relative">

        {/* Fluent Header */}
        <div className="px-6 py-4 bg-white border-b border-[#edebe9] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#0078d4] text-white flex items-center justify-center shadow-lg shadow-[#0078d4]/10">
              {bulkActionModal?.type === 'sale' ? <Sparkles size={20} strokeWidth={2.5} /> : <ShoppingBag size={20} strokeWidth={2.5} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#323130] tracking-tight leading-none">
                {bulkActionModal?.type === 'sale' ? 'Process Sale Declaration' : 'Artwork Batch Workspace'}
              </h2>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#f3f2f1] rounded-md border border-[#edebe9]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#107c10]"></span>
                  <span className="text-[10px] font-bold text-[#605e5c] uppercase tracking-wider">
                    {cartItemCount} Item{cartItemCount !== 1 ? 's' : ''} Selected
                  </span>
                </div>
                <span className="text-[10px] font-medium text-[#a19f9d] italic">
                  Ready for automated workflow
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-md bg-[#f3f2f1] text-[#323130] text-xs font-semibold hover:bg-[#edebe9] transition-all flex items-center gap-2 border border-[#edebe9]"
            >
              <X size={14} />
              <span>Close Workspace</span>
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Artworks List */}
          <div className="custom-scrollbar flex-1 overflow-y-auto bg-[linear-gradient(180deg,#ffffff_0%,#f9fbfd_100%)] px-10 py-6">
            {cartArtworks.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 max-w-full mx-auto">
                {cartArtworks.map((art, idx) => (
                  <div
                    key={art.id}
                    className="group relative flex items-center rounded-xl border border-[#dfe3e8] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_10px_24px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#0078d4]/40 hover:shadow-[0_18px_32px_rgba(0,120,212,0.10)]"
                  >
                    <div className="absolute left-0 top-6 bottom-6 w-1 bg-[#0078d4] opacity-0 transition-all duration-300 group-hover:opacity-100" />

                    <div className="flex items-center gap-5 flex-1 min-w-0">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-[#dfe3e8] bg-[#f8f9fa] shadow-[0_6px_16px_rgba(0,0,0,0.05)] transition-transform duration-500 group-hover:scale-[1.03]">
                        {art.imageUrl ? (
                          <OptimizedImage
                            src={art.imageUrl || undefined}
                            alt={art.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#c8c6c4]">
                            <ImageIcon size={28} />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <span className="rounded-md border border-[#deecf9] bg-[#eff6fc] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-[#0078d4]">
                            ASSET-{String(idx + 1).padStart(2, '0')}
                          </span>
                          <span className="text-[9px] font-black text-[#a19f9d] uppercase tracking-[0.25em] truncate">
                            {art.code}
                          </span>
                        </div>
                        <h4 className="truncate text-base font-black leading-none tracking-[-0.03em] text-[#323130]">
                          {art.title}
                        </h4>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-[#605e5c] font-bold">
                          <span className="text-black">{art.artist}</span>
                          <span className="w-1 h-1 rounded-full bg-[#c8c6c4]" />
                          <span className="truncate opacity-60 uppercase font-black text-[8px]">{art.medium}</span>
                          {art.currentBranch && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-[#c8c6c4]" />
                              <div className="flex items-center gap-1 text-[#0078d4]">
                                <MapPin size={11} />
                                <span className="truncate">{art.currentBranch}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="ml-6 flex shrink-0 items-center gap-6 border-l border-[#edebe9] pl-6 text-right">
                      <div>
                        <p className="text-[9px] font-black text-[#a19f9d] uppercase tracking-[0.25em] mb-1">Valuation</p>
                        <p className="text-lg font-black text-[#323130] tracking-tight">
                          ₱{(art.price || 0).toLocaleString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedArtworkIds(prev => prev.filter(id => id !== art.id))}
                        className="group/trash flex h-10 w-10 items-center justify-center rounded-lg border border-[#edebe9] bg-white text-[#a4262c] transition-all hover:border-rose-200 hover:bg-rose-50 hover:shadow-[0_8px_18px_rgba(164,38,44,0.10)]"
                        title="Remove item"
                      >
                        <Trash2 size={20} className="group-hover/trash:scale-110 transition-transform" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-6 text-[#a19f9d]">
                <div className="flex h-24 w-24 items-center justify-center rounded-[20px] border border-[#edebe9] bg-[#f8f9fa] shadow-inner">
                  <ShoppingBag size={40} className="text-[#c8c6c4]" />
                </div>
                <div className="text-center space-y-1.5">
                  <p className="text-xl font-black text-[#323130] tracking-tight">Workspace Entry Vacant</p>
                  <p className="text-xs font-bold text-[#a19f9d] uppercase tracking-widest">Select items from branch inventory</p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Summary + Actions */}
          <div className="shrink-0 border-t border-[#edebe9] bg-[linear-gradient(180deg,#fbfcfe_0%,#f5f7fa_100%)]">
            <div className="custom-scrollbar overflow-y-auto max-h-[50vh] px-10 py-8">
              <div className="flex items-center gap-6 mb-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#edebe9] bg-white text-[#0078d4] shadow-[0_4px_10px_rgba(0,0,0,0.04)]">
                    <Sparkles size={16} />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-[#323130] tracking-tighter">{cartItemCount}</span>
                    <span className="text-[10px] font-black text-[#a19f9d] uppercase tracking-widest">Units</span>
                  </div>
                </div>
                <div className="w-px h-8 bg-[#edebe9]" />
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-[#323130]">₱{(cartTotalValue / 1000).toFixed(1)}k</span>
                  <span className="rounded-md bg-green-50 px-2 py-0.5 text-[10px] font-black uppercase text-[#107c10]">Live</span>
                </div>
                <div className="w-px h-8 bg-[#edebe9]" />
                <span className="flex items-center gap-1.5 rounded-md bg-[#0f172a] px-3 py-1 text-[9px] font-black text-white">
                  <CheckCircle2 size={11} strokeWidth={3} /> VERIFIED
                </span>
              </div>

              <div className="flex items-center gap-4 mb-5">
                <h3 className="text-[9px] font-black text-[#a19f9d] uppercase tracking-[0.25em] shrink-0">Operations</h3>
                <div className="h-px w-full bg-[#edebe9]"></div>
              </div>

              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                {!(activeBranch && exclusiveBranches?.includes(activeBranch)) && (
                  <>
                    <button
                      type="button"
                      onClick={() => onBulkActionClick('sale')}
                      disabled={permissions ? !permissions.canSellArtwork : !canEdit}
                      className="group flex items-center gap-4 rounded-xl bg-[linear-gradient(135deg,#3d7edb_0%,#2665bf_100%)] p-4 text-white shadow-[0_12px_24px_rgba(0,120,212,0.20)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_32px_rgba(0,120,212,0.28)] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/18 shrink-0">
                        <ShoppingBag size={20} />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-sm font-black tracking-tight leading-none uppercase">Sale</p>
                        <p className="text-[8px] font-bold uppercase tracking-widest opacity-60 mt-1">Transaction</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => onBulkActionClick('reserve')}
                      disabled={permissions ? !permissions.canReserveArtwork : !canEdit}
                      className="group flex items-center gap-4 rounded-xl border border-[#e3e7eb] bg-white p-4 text-[#323130] shadow-[0_8px_18px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#0078d4]/35 hover:shadow-[0_14px_28px_rgba(0,120,212,0.08)] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#edebe9] bg-[#f3f2f1] text-[#0078d4] shrink-0">
                        <Clock size={20} />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-sm font-black tracking-tight leading-none">Reserve</p>
                        <p className="text-[8px] font-bold uppercase tracking-widest text-[#a19f9d] mt-1">Hold Asset</p>
                      </div>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => onBulkActionClick('transfer')}
                  disabled={permissions ? !permissions.canTransferArtwork : !canEdit}
                  className="group flex items-center gap-4 rounded-xl border border-[#e3e7eb] bg-white p-4 text-[#323130] shadow-[0_8px_18px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#0078d4]/35 hover:shadow-[0_14px_28px_rgba(0,120,212,0.08)] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#edebe9] bg-[#f3f2f1] text-[#0078d4] shrink-0">
                    <ArrowRightLeft size={20} />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-sm font-black tracking-tight leading-none">Transfer</p>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-[#a19f9d] mt-1">Branch Route</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onBulkActionClick('framer')}
                  disabled={permissions ? !permissions.canEditArtwork : !canEdit}
                  className="group flex items-center gap-4 rounded-xl border border-[#e3e7eb] bg-white p-4 text-[#323130] shadow-[0_8px_18px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-0.5 hover:border-[#0078d4]/35 hover:shadow-[0_14px_28px_rgba(0,120,212,0.08)] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#edebe9] bg-[#f3f2f1] text-[#0078d4] shrink-0">
                    <Frame size={20} />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-sm font-black tracking-tight leading-none">Framing</p>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-[#a19f9d] mt-1">Repair</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onBulkActionClick('return')}
                  disabled={permissions ? !permissions.canEditArtwork : !canEdit}
                  className="group flex items-center gap-4 rounded-xl border border-[#e3e7eb] bg-white p-4 text-[#323130] shadow-[0_8px_18px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-0.5 hover:border-[#0078d4]/35 hover:shadow-[0_14px_28px_rgba(0,120,212,0.08)] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#edebe9] bg-[#f3f2f1] text-[#0078d4] shrink-0">
                    <RotateCcw size={20} />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-sm font-black tracking-tight leading-none">Voiding</p>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-[#a19f9d] mt-1">Return</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onBulkActionClick('delete')}
                  disabled={permissions ? !permissions.canDeleteArtwork : !canEdit}
                  className="group flex items-center gap-4 rounded-xl border border-rose-100 bg-white p-4 text-rose-400 shadow-[0_8px_18px_rgba(0,0,0,0.02)] transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-400 shrink-0 group-hover:text-rose-600">
                    <Trash2 size={20} />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-sm font-black tracking-tight leading-none">Purge</p>
                    <p className="text-[8px] font-bold uppercase tracking-widest mt-1 opacity-60">Delete</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
