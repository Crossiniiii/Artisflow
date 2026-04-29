import React from 'react';
import { Edit } from 'lucide-react';
import { Artwork, ArtworkStatus, UserPermissions, SaleRecord } from '../../types';
import { StatusBadge } from '../StatusBadge';
import { OptimizedImage } from '../OptimizedImage';

interface InventoryCardProps {
  art: Artwork;
  sale?: SaleRecord;
  selectedIds: string[];
  permissions: UserPermissions | null;
  toggleSelect: (id: string, e: React.MouseEvent) => void;
  onView: (id: string) => void;
  onEdit: (art: Artwork) => void;
  onPreview: (url: string) => void;
  formatImportPeriod: (period: string) => string;
}

export const InventoryCard: React.FC<InventoryCardProps> = ({
  art,
  sale,
  selectedIds,
  permissions,
  toggleSelect,
  onView,
  onEdit,
  onPreview,
  formatImportPeriod
}) => {
  const isSelected = selectedIds.includes(art.id);

  return (
    <div
      onClick={() => onView(art.id)}
      className={`group bg-white rounded-2xl border ${isSelected ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-slate-200'} overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col h-full hover:-translate-y-1 relative`}
    >
      {(permissions?.canEditArtwork || permissions?.canSellArtwork || permissions?.canDeleteArtwork) && (
        <div
          onClick={(e) => toggleSelect(art.id, e)}
          className={`absolute top-3 left-3 z-10 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-white/80 backdrop-blur border-slate-300 opacity-0 group-hover:opacity-100'
            }`}
        >
          {isSelected && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
        </div>
      )}

      <div className="aspect-[4/3] overflow-hidden relative">
        <OptimizedImage
          src={art.imageUrl}
          alt={art.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 cursor-zoom-in"
          onClick={(e) => { e.stopPropagation(); onPreview(art.imageUrl); }}
        />
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {(permissions?.canEditArtwork) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(art);
              }}
              className="p-1.5 bg-white/90 backdrop-blur rounded-lg shadow-sm hover:bg-white text-slate-600 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100"
              title="Edit Artwork"
            >
              <Edit size={14} />
            </button>
          )}
          <StatusBadge status={art.status} sale={sale} artworkPrice={art.price} />
        </div>
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-4">
          <p className="text-white text-xs font-medium opacity-90">{art.currentBranch}</p>
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="mb-2 space-y-0.5">
          <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">{art.code}</span>
          <h4 className="text-sm font-bold text-slate-800 leading-snug line-clamp-1 group-hover:text-blue-600 transition-colors uppercase">{art.title}</h4>
          <p className="text-[11px] text-slate-500 font-medium">{art.artist}</p>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[9px] font-bold uppercase tracking-widest text-slate-500">
              {art.year}
            </span>
            {art.importPeriod && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-[9px] font-bold uppercase tracking-widest text-indigo-600">
                 {formatImportPeriod(art.importPeriod)}
              </span>
            )}
          </div>
        </div>
        <div className="mt-auto pt-3 flex items-center justify-between border-t border-slate-100">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate mr-4">{art.medium}</p>
          <p className="text-sm font-black text-slate-900 shrink-0">₱{art.price.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};
