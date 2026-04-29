import React from 'react';
import { ArtworkStatus, SaleRecord } from '../types';

interface StatusBadgeProps {
    status: ArtworkStatus | string;
    sale?: SaleRecord;
    artworkPrice?: number;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, sale, artworkPrice }) => {
    const styles: Record<string, string> = {
        [ArtworkStatus.AVAILABLE]: 'bg-emerald-600 text-white border-emerald-600',
        [ArtworkStatus.RESERVED]: 'bg-orange-100 text-orange-700 border-orange-200',
        [ArtworkStatus.SOLD]: 'bg-red-100 text-red-800 border-red-200',
        [ArtworkStatus.DELIVERED]: 'bg-sky-100 text-sky-800 border-sky-200',
        [ArtworkStatus.CANCELLED]: 'bg-rose-100 text-rose-800 border-rose-200 line-through',
        [ArtworkStatus.FOR_RETOUCH]: 'bg-blue-600 text-white border-blue-700 shadow-sm',
        [ArtworkStatus.FOR_FRAMING]: 'bg-indigo-100 text-indigo-800 border-indigo-200 border-double',
        [ArtworkStatus.EXCLUSIVE_VIEW_ONLY]: 'bg-purple-900 text-white border-purple-700',
        // Handle Return/Void Status - High Visibility Protocol Color
        [ArtworkStatus.RETURNED]: 'bg-red-600 text-white border-red-700 shadow-sm',
        'RETURNED': 'bg-red-600 text-white border-red-700 shadow-sm',
        'Sold (Prior)': 'bg-slate-100 text-slate-700 border-slate-200',
        'Pull Out': 'bg-neutral-100 text-neutral-600 border-neutral-200',
    };

    // Normalize status string for lookup if needed
    const normalizedStatus = Object.keys(styles).find(key => key.toLowerCase() === status?.toLowerCase()) || status;

    let displayText = normalizedStatus === ArtworkStatus.EXCLUSIVE_VIEW_ONLY ? 'NOT FOR SALE' : status;

    // Enhance display text if it's a sale with downpayment info
    if ((normalizedStatus === ArtworkStatus.SOLD || normalizedStatus === ArtworkStatus.DELIVERED) && sale && artworkPrice !== undefined) {
        const isDownpayment = sale.downpayment !== undefined && sale.downpayment < artworkPrice;
        const isFullPayment = sale.downpayment !== undefined && sale.downpayment >= artworkPrice;
        
        if (isDownpayment) {
            displayText = `${status} (Down)`;
        } else if (isFullPayment) {
            displayText = `${status} (Full)`;
        }
    }

    return <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border shadow-sm whitespace-nowrap ${styles[normalizedStatus] || 'bg-neutral-100 text-neutral-900 border-neutral-200'}`}>{displayText}</span>;
};
