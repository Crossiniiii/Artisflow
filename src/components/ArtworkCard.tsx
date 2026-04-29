
import React, { memo } from 'react';
import { Artwork, UserPermissions } from '../types';
import { StatusBadge } from './StatusBadge';
import { OptimizedImage } from './OptimizedImage';
import { Image as ImageIcon, Edit } from 'lucide-react';

interface ArtworkCardProps {
    art: Artwork;
    selected: boolean;
    onView: (id: string) => void;
    toggleSelect: (id: string, e: React.MouseEvent) => void;
    permissions?: UserPermissions;
    setPreviewImageUrl: (url: string) => void;
    setEditingArtwork: (art: Artwork) => void;
    setShowAddModal: (show: boolean) => void;
    style?: React.CSSProperties; // For virtualization positioning
}

export const ArtworkCard: React.FC<ArtworkCardProps> = memo(({
    art,
    selected,
    onView,
    toggleSelect,
    permissions,
    setPreviewImageUrl,
    setEditingArtwork,
    setShowAddModal,
    style
}) => {
    return (
        <div style={style} className="p-1 sm:p-3">
            <div
                onClick={() => onView(art.id)}
                className={`group bg-white rounded-3xl border ${selected ? 'border-neutral-900 ring-4 ring-neutral-900/10' : 'border-neutral-100 hover:border-neutral-300'} overflow-hidden shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] transition-all duration-500 cursor-pointer flex flex-col h-full hover:-translate-y-2 relative`}
            >
                {(permissions?.canEditArtwork || permissions?.canSellArtwork || permissions?.canDeleteArtwork) && (
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(art.id, e);
                        }}
                        className={`absolute top-4 left-4 z-20 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${selected
                            ? 'bg-neutral-900 border-neutral-900 text-white scale-110 shadow-lg'
                            : 'bg-white/80 backdrop-blur border-neutral-300 opacity-0 group-hover:opacity-100 hover:scale-110'
                            }`}
                    >
                        {selected && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                )}

                <div className="aspect-[4/3] overflow-hidden relative bg-neutral-100">
                    {(() => {
                        const placeholder = (
                            <div className={`w-full h-full flex items-center justify-center transition-colors
                                ${(() => {
                                    // Deterministic gradient based on ID
                                    const hash = (art.id || 'default').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                                    const gradients = [
                                        'bg-gradient-to-br from-rose-100 via-orange-100 to-amber-100',
                                        'bg-gradient-to-br from-blue-100 via-indigo-100 to-violet-100',
                                        'bg-gradient-to-br from-emerald-100 via-teal-100 to-cyan-100',
                                        'bg-gradient-to-br from-fuchsia-100 via-pink-100 to-rose-100',
                                        'bg-gradient-to-br from-amber-100 via-yellow-100 to-lime-100',
                                        'bg-gradient-to-br from-slate-100 via-zinc-100 to-neutral-100',
                                    ];
                                    return gradients[hash % gradients.length];
                                })()}
                            `}>
                                <div className="text-center opacity-40 group-hover:opacity-60 transition-opacity p-4">
                                    <div className="w-12 h-12 rounded-full bg-white/50 backdrop-blur mx-auto mb-2 flex items-center justify-center">
                                        <span className="text-lg font-bold text-neutral-400">
                                            {(art.title || '?').charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest block max-w-[120px] truncate">
                                        {art.artist === 'Unknown Artist' ? 'No Image' : art.artist}
                                    </span>
                                </div>
                            </div>
                        );

                        if (art.imageUrl) {
                            return (
                                <OptimizedImage
                                    src={art.imageUrl}
                                    alt={art.title}
                                    fallback={placeholder}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 will-change-transform"
                                />
                            );
                        }
                        return placeholder;
                    })()}

                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500" />

                    {/* Action Buttons */}
                    <div className="absolute top-4 right-4 z-20 flex items-center gap-2 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 delay-75">
                        {art.imageUrl && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewImageUrl(art.imageUrl);
                                }}
                                className="p-2 bg-white/90 backdrop-blur-md rounded-xl shadow-lg hover:bg-white text-neutral-700 hover:text-neutral-900 transition-all hover:scale-110"
                                title="View Image"
                            >
                                <ImageIcon size={16} />
                            </button>
                        )}
                        {(permissions?.canEditArtwork) && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingArtwork(art);
                                    setShowAddModal(true);
                                }}
                                className="p-2 bg-white/90 backdrop-blur-md rounded-xl shadow-lg hover:bg-white text-neutral-700 hover:text-neutral-900 transition-all hover:scale-110"
                                title="Edit Artwork"
                            >
                                <Edit size={16} />
                            </button>
                        )}
                    </div>

                    {/* Status Badge */}
                    <div className="absolute top-4 right-4 z-10 transition-all duration-300 group-hover:opacity-0 group-hover:translate-x-4">
                        <StatusBadge status={art.status} />
                    </div>

                    {/* Bottom Info Overlay */}
                    <div className="absolute bottom-0 inset-x-0 p-3 sm:p-5 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                        <div className="flex items-center justify-between">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white">
                                {art.currentBranch}
                            </span>
                            <span className="text-white text-lg font-bold tracking-tight drop-shadow-md">
                                ₱{(art.price || 0).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="p-4 sm:p-6 flex-1 flex flex-col relative bg-white">
                    <div className="mb-4 space-y-1">
                        <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black text-neutral-400 tracking-widest uppercase mb-1 block">{art.code || 'NO ID'}</span>
                        </div>
                        <h4 className="text-base sm:text-xl font-bold text-neutral-900 leading-tight line-clamp-2 group-hover:text-black transition-colors">{art.title}</h4>
                        <p className="text-sm text-neutral-500 font-bold">{art.artist}</p>
                    </div>

                    <div className="mt-auto pt-4 flex items-center justify-between border-t border-neutral-100/50">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
                                <span className="text-xs font-bold">{(art.medium || '??').slice(0, 2).toUpperCase()}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-neutral-400">Medium</span>
                                <span className="text-xs font-bold text-neutral-700 max-w-[120px] truncate" title={art.medium}>{art.medium}</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] uppercase font-bold text-neutral-400">Year</span>
                            <span className="text-xs font-bold text-neutral-700">{art.year}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});
