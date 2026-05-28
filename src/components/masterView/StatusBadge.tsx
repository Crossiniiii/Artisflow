import React from 'react';
import { ArtworkStatus } from '../../types';

export const StatusBadge: React.FC<{ status: ArtworkStatus }> = ({ status }) => {
  const styles: Record<string, string> = {
    [ArtworkStatus.AVAILABLE]: 'bg-emerald-600 text-white border-emerald-600',
    [ArtworkStatus.RESERVED]: 'bg-neutral-900 text-neutral-100 border-neutral-700',
    [ArtworkStatus.SOLD]: 'bg-red-600 text-white border-red-600',
    [ArtworkStatus.DELIVERED]: 'bg-white text-neutral-900 border-neutral-300',
    [ArtworkStatus.CANCELLED]: 'bg-neutral-200 text-neutral-500 border-neutral-300',
    [ArtworkStatus.FOR_RETOUCH]: 'bg-orange-100 text-orange-800 border-orange-200 border-dashed',
    [ArtworkStatus.FOR_FRAMING]: 'bg-blue-100 text-blue-800 border-blue-200',
    [ArtworkStatus.EXCLUSIVE_VIEW_ONLY]: 'bg-purple-900 text-white border-purple-700',
    'RETURNED': 'bg-neutral-900 text-white border-neutral-900',
  };
  const displayText = status === ArtworkStatus.EXCLUSIVE_VIEW_ONLY ? 'NOT FOR SALE' : status;
  return <span className={`px-4 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-[0.15em] border shadow-sm whitespace-nowrap transition-all ${styles[status] || 'bg-neutral-100 text-neutral-900 border-neutral-200'}`}>{displayText}</span>;
};
