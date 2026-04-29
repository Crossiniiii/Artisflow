import React, { useEffect, useState } from 'react';
import { ShoppingBag, AlertCircle, Trash2, Upload, Wrench, RefreshCcw, AlertTriangle, X } from 'lucide-react';
import { Modal } from '../Modal';
import { ExhibitionEvent, Artwork } from '../../types';
import { compressImage } from '../../utils/imageUtils';

interface BulkActionModalProps {
    bulkActionModal: { type: string } | null;
    onClose: () => void;
    // State setters and values
    selectedIds: string[];
    setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
    artworks: Artwork[];
    bulkActionValue: string;
    setBulkActionValue: (val: string) => void;
    bulkClientEmail?: string;
    setBulkClientEmail?: (val: string) => void;
    bulkClientContact?: string;
    setBulkClientContact?: (val: string) => void;
    bulkActionExtra: boolean;
    setBulkActionExtra: (val: boolean) => void;
    bulkSaleEventId: string;
    setBulkSaleEventId: (val: string) => void;

    // Data
    events: ExhibitionEvent[];
    branches: string[];

    // Attachments
    activeBulkAttachmentTab: 'itdr' | 'rsa' | 'orcr';
    setActiveBulkAttachmentTab: (val: 'itdr' | 'rsa' | 'orcr') => void;
    bulkTempItdr: string | string[] | null;
    setBulkTempItdr: (val: string | string[] | null) => void;
    bulkTempRsa: string | string[] | null;
    setBulkTempRsa: (val: string | string[] | null) => void;
    bulkTempOrcr: string | string[] | null;
    setBulkTempOrcr: (val: string | string[] | null) => void;

    // Reservation
    reservationTab: 'person' | 'event' | 'auction';
    setReservationTab: (val: 'person' | 'event' | 'auction') => void;
    reservationClient: string;
    setReservationClient: (val: string) => void;
    reservationEventName: string;
    setReservationEventName: (val: string) => void;
    reservationAuctionId: string;
    setReservationAuctionId: (val: string) => void;
    reservationDays: number;
    setReservationDays: (val: number) => void;
    reservationHours: number;
    setReservationHours: (val: number) => void;
    reservationMinutes: number;
    setReservationMinutes: (val: number) => void;
    reservationNotes: string;
    setReservationNotes: (val: string) => void;

    // Framer
    framerDamageDetails: string;
    setFramerDamageDetails: (val: string) => void;

    // Return
    returnType: 'Artist Reclaim' | 'For Retouch';
    setReturnType: (val: 'Artist Reclaim' | 'For Retouch') => void;
    returnReason: string;
    setReturnReason: (val: string) => void;
    returnProofImage: string | string[] | null;
    setReturnProofImage: (val: string | string[] | null) => void;

    // Downpayment
    bulkDownpayment?: string;
    setBulkDownpayment?: (val: string) => void;
    bulkSaleDownpayments?: Record<string, string>;
    setBulkSaleDownpayments?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    bulkSaleInstallmentsEnabled?: Record<string, boolean>;
    setBulkSaleInstallmentsEnabled?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;

    // Submit handler
    onSubmit: () => void;
}

export const BulkActionModal: React.FC<BulkActionModalProps> = ({
    bulkActionModal, onClose, selectedIds, artworks,
    bulkActionValue, setBulkActionValue, bulkActionExtra, setBulkActionExtra, bulkSaleEventId, setBulkSaleEventId,
    bulkClientEmail, setBulkClientEmail, bulkClientContact, setBulkClientContact,
    bulkDownpayment, setBulkDownpayment,
    bulkSaleDownpayments, setBulkSaleDownpayments,
    bulkSaleInstallmentsEnabled, setBulkSaleInstallmentsEnabled,
    events, branches,
    activeBulkAttachmentTab, setActiveBulkAttachmentTab,
    bulkTempItdr, setBulkTempItdr, bulkTempRsa, setBulkTempRsa, bulkTempOrcr, setBulkTempOrcr,
    reservationTab, setReservationTab, reservationClient, setReservationClient, reservationEventName, setReservationEventName,
    reservationAuctionId, setReservationAuctionId, reservationDays, setReservationDays, reservationHours, setReservationHours,
    reservationMinutes, setReservationMinutes, reservationNotes, setReservationNotes,
    framerDamageDetails, setFramerDamageDetails,
    returnType, setReturnType, returnReason, setReturnReason, returnProofImage, setReturnProofImage,
    onSubmit
}) => {
    if (!bulkActionModal) return null;

    const [localInstallmentsEnabled, setLocalInstallmentsEnabled] = useState<Record<string, boolean>>({});
    const [localBulkTempItdr, setLocalBulkTempItdr] = useState<string | string[] | null>(null);
    const [localBulkTempRsa, setLocalBulkTempRsa] = useState<string | string[] | null>(null);
    const [localBulkTempOrcr, setLocalBulkTempOrcr] = useState<string | string[] | null>(null);

    const toAttachmentArray = (value: string | string[] | null | undefined) =>
        Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];

    const firstAttachment = (value: string | string[] | null | undefined) =>
        Array.isArray(value) ? value[0] || null : value || null;

    useEffect(() => {
        setLocalInstallmentsEnabled(bulkSaleInstallmentsEnabled || {});
    }, [bulkSaleInstallmentsEnabled, bulkActionModal.type]);

    useEffect(() => {
        setLocalBulkTempItdr(bulkTempItdr);
    }, [bulkTempItdr]);

    useEffect(() => {
        setLocalBulkTempRsa(bulkTempRsa);
    }, [bulkTempRsa]);

    useEffect(() => {
        setLocalBulkTempOrcr(bulkTempOrcr);
    }, [bulkTempOrcr]);

    const resetBulkModalState = () => {
        setFramerDamageDetails('');
        setBulkTempItdr(null);
        setBulkTempRsa(null);
        setBulkTempOrcr(null);
        setLocalBulkTempItdr(null);
        setLocalBulkTempRsa(null);
        setLocalBulkTempOrcr(null);
        setLocalInstallmentsEnabled({});
        setActiveBulkAttachmentTab('itdr');
    };

    const normalizedReturnProofImages = Array.isArray(returnProofImage)
        ? returnProofImage
        : returnProofImage
            ? [returnProofImage]
            : [];
    const selectedArtworks = artworks.filter(art => selectedIds.includes(art.id));
    const totalSelectedValue = selectedArtworks.reduce((sum, art) => sum + (art.price || 0), 0);
    const totalPerArtworkDownpayment = selectedArtworks.reduce((sum, art) => {
        const rawValue = bulkSaleDownpayments?.[art.id];
        const parsed = rawValue ? parseFloat(rawValue.replace(/,/g, '')) : 0;
        return sum + (Number.isNaN(parsed) ? 0 : parsed);
    }, 0);

    const activeBulkPreview =
        activeBulkAttachmentTab === 'itdr'
            ? (localBulkTempItdr ?? bulkTempItdr)
            : activeBulkAttachmentTab === 'rsa'
                ? (localBulkTempRsa ?? bulkTempRsa)
                : (localBulkTempOrcr ?? bulkTempOrcr);
    const activeBulkPreviewImages = toAttachmentArray(activeBulkPreview);

    const getTitle = () => {
        if (bulkActionModal.type === 'framer') {
            return 'Send to Framer';
        }

        if (bulkActionModal.type === 'return') {
            return 'Return to Artist';
        }
        return bulkActionModal.type === 'sale' ? 'Sales Declaration Entry' :
            bulkActionModal.type === 'reserve' ? 'Bulk Reserve' :
                bulkActionModal.type === 'transfer' ? 'Bulk Transfer' :
                    'Confirm Deletion';
    };

    const closeAndReset = () => {
        onClose();
        resetBulkModalState();
    };

    const isStandardActionDisabled =
        bulkActionModal.type === 'delete' ? false :
            bulkActionModal.type === 'reserve' ? (
                reservationTab === 'person' ? !reservationClient :
                    reservationTab === 'event' ? !reservationEventName :
                        !reservationAuctionId
            ) :
                bulkActionModal.type === 'sale' ? (
                    !bulkActionValue ||
                    !bulkClientEmail?.trim() ||
                    !bulkClientContact?.trim() ||
                    (bulkActionExtra ? toAttachmentArray(bulkTempItdr).length === 0 : false) ||
                    toAttachmentArray(bulkTempRsa).length === 0
                ) :
                    bulkActionModal.type === 'transfer' ? (!bulkActionValue || !bulkTempItdr) :
                        bulkActionModal.type === 'framer' ? !framerDamageDetails :
                            bulkActionModal.type === 'return' ? (!returnReason || (returnType === 'Artist Reclaim' && normalizedReturnProofImages.length === 0)) :
                                true;

    const standardFooter = (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 sm:gap-0">
            <p className="text-[10px] font-bold text-[#a19f9d] uppercase tracking-[0.2em] hidden sm:block">
                {bulkActionModal.type === 'delete' ? 'System De-Classification' : `Authorized ${bulkActionModal.type} operation`}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button
                    onClick={closeAndReset}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-md font-bold text-[11px] uppercase tracking-widest text-[#605e5c] bg-white border border-[#edebe9] hover:bg-[#f3f2f1] transition-all order-2 sm:order-1"
                >
                    {bulkActionModal.type === 'sale' ? 'Cancel' : 'Back to Workspace'}
                </button>
                <button
                    onClick={onSubmit}
                    disabled={isStandardActionDisabled}
                    className={`w-full sm:w-auto px-8 py-2.5 rounded-md font-bold text-[11px] uppercase tracking-widest shadow-sm transition-all disabled:bg-[#f3f2f1] disabled:text-[#c8c6c4] disabled:border-[#edebe9] disabled:shadow-none disabled:cursor-not-allowed order-1 sm:order-2 ${bulkActionModal.type === 'delete'
                        ? 'bg-[#a4262c] text-white hover:bg-[#821f24]'
                        : 'bg-[#0078d4] text-white hover:bg-[#005a9e]'
                        }`}
                >
                    {bulkActionModal.type === 'sale' ? 'Confirm Sale' :
                        bulkActionModal.type === 'delete' ? 'Authorize Deletion' :
                            bulkActionModal.type === 'reserve' ? (reservationTab === 'auction' ? 'Sync to Auction' : 'Authorize Reservation') :
                                bulkActionModal.type === 'framer' ? 'Authorize Dispatch' :
                                    bulkActionModal.type === 'return' ? (returnType === 'Artist Reclaim' ? 'Authorize Void' : 'Authorize Retouch') :
                                        'Complete Action'}
                </button>
            </div>
        </div>
    );

    return (
        <Modal
            onClose={onClose}
            title={getTitle()}
            maxWidth={bulkActionModal.type === 'framer' || bulkActionModal.type === 'return' ? 'max-w-4xl' : 'max-w-2xl'}
            variant={bulkActionModal.type === 'framer' || bulkActionModal.type === 'return' ? 'sharp' : undefined}
            footer={bulkActionModal.type === 'sale' ? standardFooter : undefined}
        >
            <div className="space-y-4">
                {bulkActionModal.type === 'sale' && (
                    <>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-[#605e5c] uppercase tracking-[0.05em] mb-1">
                                Client Full Name
                            </label>
                            <input
                                autoFocus
                                type="text"
                                value={bulkActionValue}
                                onChange={(e) => setBulkActionValue(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-[#edebe9] rounded-md text-sm text-[#323130] placeholder-[#a19f9d] focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] transition-all"
                                placeholder="Enter customer name..."
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-[#605e5c] uppercase tracking-[0.05em] mb-1">
                                    Primary Email <span className="text-[#a4262c]">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={bulkClientEmail || ''}
                                    onChange={(e) => setBulkClientEmail?.(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-[#edebe9] rounded-md text-sm text-[#323130] placeholder-[#a19f9d] focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] transition-all"
                                    placeholder="client@mail.com"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-[#605e5c] uppercase tracking-[0.05em] mb-1">
                                    Mobile Contact <span className="text-[#a4262c]">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={bulkClientContact || ''}
                                    onChange={(e) => setBulkClientContact?.(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-[#edebe9] rounded-md text-sm text-[#323130] placeholder-[#a19f9d] focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] transition-all"
                                    placeholder="+63 000 000 0000"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-[#605e5c] uppercase tracking-[0.05em] mb-1">Event / Exhibition Alignment</label>
                            <select
                                className="w-full px-3 py-2 bg-white border border-[#edebe9] rounded-md text-sm text-[#323130] focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] transition-all cursor-pointer"
                                value={bulkSaleEventId}
                                onChange={(e) => setBulkSaleEventId(e.target.value)}
                            >
                                <option value="">Direct Inventory Sale</option>
                                {events.filter(e => {
                                    if (e.status === 'Recent' || e.status === 'Closed') return false;
                                    if (e.isStrictDuration && e.endDate) {
                                        const end = new Date(e.endDate);
                                        end.setHours(23, 59, 59, 999);
                                        if (end.getTime() < Date.now()) return false;
                                    }
                                    return true;
                                }).map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                            </select>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between border-b border-[#f3f2f1] pb-2">
                                <label className="block text-[10px] font-bold text-[#605e5c] uppercase tracking-[0.2em]">
                                    Financial Reconciliation
                                </label>
                                <span className="text-[10px] font-medium text-[#a19f9d] italic">Configure installments per asset</span>
                            </div>

                            <div className="space-y-3">
                                {selectedArtworks.map((art) => {
                                    const installmentEnabled = localInstallmentsEnabled[art.id] ?? bulkSaleInstallmentsEnabled?.[art.id] ?? !!bulkSaleDownpayments?.[art.id];
                                    const downpaymentValue = bulkSaleDownpayments?.[art.id] || '';
                                    const numericDownpayment = parseFloat(downpaymentValue || '0');
                                    const remainingBalance = Math.max(
                                        (art.price || 0) - (Number.isNaN(numericDownpayment) ? 0 : numericDownpayment),
                                        0
                                    );

                                    return (
                                        <div key={art.id} className="rounded-lg border border-[#edebe9] bg-white p-4 hover:border-[#0078d4]/30 transition-all">
                                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded bg-[#f3f2f1] flex items-center justify-center shrink-0">
                                                        <ShoppingBag size={16} className="text-[#0078d4]" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-[13px] font-bold text-[#323130] line-clamp-1">{art.title}</div>
                                                        <div className="text-[11px] text-[#605e5c] font-medium">
                                                            {art.artist} <span className="text-[#c8c6c4] mx-1">•</span> <span className="font-bold">{art.code}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-bold text-[#a19f9d] uppercase tracking-wider">Asset Value</p>
                                                        <p className="text-sm font-black text-[#323130]">₱{(art.price || 0).toLocaleString()}</p>
                                                    </div>

                                                    <label className="flex items-center gap-2 px-3 py-1.5 bg-[#f3f2f1] hover:bg-[#edebe9] rounded-md cursor-pointer transition-colors border border-[#edebe9]">
                                                        <input
                                                            type="checkbox"
                                                            checked={installmentEnabled}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked;
                                                                setLocalInstallmentsEnabled(prev => ({ ...prev, [art.id]: checked }));
                                                                setBulkSaleInstallmentsEnabled?.(prev => ({ ...prev, [art.id]: checked }));
                                                                if (!checked) {
                                                                    setBulkSaleDownpayments?.(prev => {
                                                                        const next = { ...prev };
                                                                        delete next[art.id];
                                                                        return next;
                                                                    });
                                                                }
                                                            }}
                                                            className="w-4 h-4 rounded border-[#edebe9] text-[#0078d4] focus:ring-[#0078d4] transition-all"
                                                        />
                                                        <span className="text-[10px] font-bold text-[#605e5c] uppercase tracking-wider">Installments</span>
                                                    </label>
                                                </div>
                                            </div>

                                            {installmentEnabled && (
                                                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_200px]">
                                                    <div className="space-y-1.5">
                                                        <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#605e5c]">
                                                            Downpayment Entry
                                                        </label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a19f9d] text-sm">₱</span>
                                                            <input
                                                                type="text"
                                                                value={downpaymentValue}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.replace(/[^0-9.]/g, '');
                                                                    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                                                                        setBulkSaleDownpayments?.(prev => ({ ...prev, [art.id]: val }));
                                                                    }
                                                                }}
                                                                onBlur={() => {
                                                                    if (downpaymentValue) {
                                                                        const num = parseFloat(downpaymentValue);
                                                                        if (!Number.isNaN(num)) {
                                                                            setBulkSaleDownpayments?.(prev => ({ ...prev, [art.id]: num.toFixed(2) }));
                                                                        }
                                                                    }
                                                                }}
                                                                className="w-full rounded-md border border-[#edebe9] bg-white py-1.5 pl-7 pr-3 text-sm text-[#323130] focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]"
                                                                placeholder="0.00"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="rounded-md border border-[#deecf9] bg-[#eff6fc] px-4 py-2 mt-auto">
                                                        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0078d4]">Remaining Bal</div>
                                                        <div className="text-[15px] font-black text-[#323130]">
                                                            ₱{remainingBalance.toLocaleString()}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {totalPerArtworkDownpayment > 0 && (
                                <div className="rounded-lg border border-[#dff6dd] bg-[#f0f9f0] px-4 py-3 border-l-4 border-l-[#107c10]">
                                    <div className="flex items-center justify-between text-[11px] text-[#323130]">
                                        <span className="font-bold uppercase tracking-[0.14em]">Combined Downpayment</span>
                                        <span className="font-black text-[#107c10]">₱{totalPerArtworkDownpayment.toLocaleString()}</span>
                                    </div>
                                    <div className="mt-1 flex items-center justify-between text-[13px]">
                                        <span className="text-[#605e5c] font-medium">Batch Net Receivables</span>
                                        <span className="font-black text-[#323130]">
                                            ₱{Math.max(totalSelectedValue - totalPerArtworkDownpayment, 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <label className="flex items-start space-x-3 cursor-pointer group p-3 rounded-lg border border-[#edebe9] bg-[#f3f2f1]/30 hover:border-[#0078d4] transition-all">
                            <div className="mt-0.5">
                                <input
                                    type="checkbox"
                                    checked={bulkActionExtra}
                                    onChange={(e) => setBulkActionExtra(e.target.checked)}
                                    className="w-4 h-4 rounded border-[#edebe9] text-[#0078d4] focus:ring-[#0078d4] transition-all"
                                />
                            </div>
                            <div className="flex-1">
                                <span className="text-[11px] font-bold text-[#323130] uppercase tracking-wide">Automated Logistic Dispatch</span>
                                <p className="text-[10px] text-[#605e5c] mt-0.5 leading-relaxed">Transition artwork state to 'Delivered' immediately upon declaration completion.</p>
                            </div>
                        </label>

                        <div className="space-y-4 pt-4 border-t border-neutral-100">
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Attachments (Required for Sale/Delivery)</label>
                            <div className="flex flex-row p-1 bg-neutral-100 rounded-xl gap-1">
                                <button
                                    type="button"
                                    onClick={() => setActiveBulkAttachmentTab('itdr')}
                                    className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeBulkAttachmentTab === 'itdr' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'}`}
                                >
                                    IT/DR
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveBulkAttachmentTab('rsa')}
                                    className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeBulkAttachmentTab === 'rsa' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'}`}
                                >
                                    RSA / AR
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveBulkAttachmentTab('orcr')}
                                    className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeBulkAttachmentTab === 'orcr' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'}`}
                                >
                                    OR / CR
                                </button>
                            </div>

                            <div className="space-y-2">
                                <label className={`text-[10px] font-bold uppercase tracking-widest ${((activeBulkAttachmentTab === 'itdr' && bulkActionExtra) || activeBulkAttachmentTab === 'rsa') ? 'text-[#a4262c]' : 'text-[#605e5c]'}`}>
                                    {activeBulkAttachmentTab === 'itdr' ? (bulkActionExtra ? 'IT/DR Proof (Mandatory for Delivery)' : 'IT/DR Proof') : activeBulkAttachmentTab === 'rsa' ? 'RSA / AR Evidence (Mandatory)' : 'OR / CR Evidence'}
                                </label>
                                <input
                                    key={activeBulkAttachmentTab}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={async (e) => {
                                        const files = Array.from(e.target.files || []);
                                        if (files.length === 0) return;
                                        const dataUrls = await Promise.all(files.map(file => compressImage(file)));
                                        const mergeAttachments = (existing: string | string[] | null | undefined) =>
                                            bulkActionModal.type === 'sale'
                                                ? [...toAttachmentArray(existing), ...dataUrls]
                                                : dataUrls[0] || null;

                                        if (activeBulkAttachmentTab === 'itdr') {
                                            const next = mergeAttachments(localBulkTempItdr ?? bulkTempItdr);
                                            setLocalBulkTempItdr(next);
                                            setBulkTempItdr(next);
                                        } else if (activeBulkAttachmentTab === 'rsa') {
                                            const next = mergeAttachments(localBulkTempRsa ?? bulkTempRsa);
                                            setLocalBulkTempRsa(next);
                                            setBulkTempRsa(next);
                                        } else {
                                            const next = mergeAttachments(localBulkTempOrcr ?? bulkTempOrcr);
                                            setLocalBulkTempOrcr(next);
                                            setBulkTempOrcr(next);
                                        }
                                        e.target.value = '';
                                    }}
                                    className="block w-full text-xs text-[#605e5c] file:mr-4 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-[#323130] file:text-white hover:file:bg-[#000]"
                                />

                                {activeBulkPreviewImages.length > 0 ? (
                                    <div className={`mt-3 ${bulkActionModal.type === 'sale' ? 'grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar' : ''}`}>
                                        {activeBulkPreviewImages.map((image, index) => (
                                            <div key={`${image}-${index}`} className="relative group rounded-xl overflow-hidden border border-neutral-200 shadow-sm transition-all hover:shadow-md hover:border-neutral-400">
                                                <img
                                                    src={image}
                                                    alt={`Preview ${index + 1}`}
                                                    className={`w-full ${bulkActionModal.type === 'sale' ? 'h-32 object-cover' : 'h-52 object-contain'} bg-neutral-50 transition-transform duration-500 group-hover:scale-105`}
                                                />
                                                <div className="absolute inset-0 bg-neutral-900/0 group-hover:bg-neutral-900/10 transition-colors pointer-events-none" />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const nextImages = activeBulkPreviewImages.filter((_, imageIndex) => imageIndex !== index);
                                                        const nextValue = bulkActionModal.type === 'sale' ? (nextImages.length > 0 ? nextImages : null) : null;
                                                        if (activeBulkAttachmentTab === 'itdr') {
                                                            setLocalBulkTempItdr(nextValue);
                                                            setBulkTempItdr(nextValue);
                                                        } else if (activeBulkAttachmentTab === 'rsa') {
                                                            setLocalBulkTempRsa(nextValue);
                                                            setBulkTempRsa(nextValue);
                                                        } else {
                                                            setLocalBulkTempOrcr(nextValue);
                                                            setBulkTempOrcr(nextValue);
                                                        }
                                                    }}
                                                    className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 bg-white/95 text-red-600 rounded-lg shadow-xl hover:bg-white active:scale-95"
                                                    title="Remove Image"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="w-full h-48 bg-neutral-50 rounded-xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center text-neutral-400 gap-2 transition-colors hover:bg-neutral-100/50 hover:border-neutral-300">
                                        <Upload size={24} strokeWidth={1.5} />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">No Payload Attached</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {bulkActionModal.type === 'reserve' && (
                    <div className="space-y-4">
                        <div className="flex flex-row p-1 bg-[#f3f2f1] rounded-md gap-1">
                            <button
                                onClick={() => setReservationTab('person')}
                                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded transition-all ${reservationTab === 'person'
                                    ? 'bg-white text-[#0078d4] shadow-sm border border-[#edebe9]'
                                    : 'text-[#605e5c] hover:bg-[#edebe9]'
                                    }`}
                            >
                                Person
                            </button>
                            <button
                                onClick={() => setReservationTab('event')}
                                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded transition-all ${reservationTab === 'event'
                                    ? 'bg-white text-[#0078d4] shadow-sm border border-[#edebe9]'
                                    : 'text-[#605e5c] hover:bg-[#edebe9]'
                                    }`}
                            >
                                Event
                            </button>
                            <button
                                onClick={() => setReservationTab('auction')}
                                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded transition-all ${reservationTab === 'auction'
                                    ? 'bg-white text-[#0078d4] shadow-sm border border-[#edebe9]'
                                    : 'text-[#605e5c] hover:bg-[#edebe9]'
                                    }`}
                            >
                                Auction
                            </button>
                        </div>

                        <div className="space-y-4">
                            {reservationTab === 'person' && (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-[#605e5c] uppercase tracking-widest">
                                            Client Identification
                                        </label>
                                        <input
                                            autoFocus
                                            type="text"
                                            value={reservationClient}
                                            onChange={e => setReservationClient(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-[#edebe9] rounded-md text-sm text-[#323130] focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]"
                                            placeholder="Enter full name..."
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-[#605e5c] uppercase tracking-widest">
                                            Expiration Period (Time-to-Live)
                                        </label>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="space-y-1.5">
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    className="w-full px-3 py-2 bg-white border border-[#edebe9] rounded-md text-sm font-bold text-center text-[#323130] focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]"
                                                    value={reservationDays}
                                                    onFocus={(e) => e.target.select()}
                                                    onChange={e => {
                                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                                        setReservationDays(Math.max(0, parseInt(val || '0', 10)));
                                                    }}
                                                />
                                                <p className="text-[9px] text-center font-bold text-[#a19f9d] uppercase tracking-widest">
                                                    Days
                                                </p>
                                            </div>
                                            <div className="space-y-1.5">
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    className="w-full px-3 py-2 bg-white border border-[#edebe9] rounded-md text-sm font-bold text-center text-[#323130] focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]"
                                                    value={reservationHours}
                                                    onFocus={(e) => e.target.select()}
                                                    onChange={e => {
                                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                                        setReservationHours(Math.max(0, parseInt(val || '0', 10)));
                                                    }}
                                                />
                                                <p className="text-[9px] text-center font-bold text-[#a19f9d] uppercase tracking-widest">
                                                    Hours
                                                </p>
                                            </div>
                                            <div className="space-y-1.5">
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    className="w-full px-3 py-2 bg-white border border-[#edebe9] rounded-md text-sm font-bold text-center text-[#323130] focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]"
                                                    value={reservationMinutes}
                                                    onFocus={(e) => e.target.select()}
                                                    onChange={e => {
                                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                                        setReservationMinutes(Math.max(0, parseInt(val || '0', 10)));
                                                    }}
                                                />
                                                <p className="text-[9px] text-center font-bold text-[#a19f9d] uppercase tracking-widest">
                                                    Minutes
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {reservationTab === 'event' && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-[#605e5c] uppercase tracking-widest">
                                        Select Allocated Event
                                    </label>
                                    <select
                                        className="w-full px-3 py-2 bg-white border border-[#edebe9] rounded-md text-sm text-[#323130] focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] cursor-pointer"
                                        value={reservationEventName}
                                        onChange={e => setReservationEventName(e.target.value)}
                                    >
                                        <option value="">Align with an exhibition...</option>
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
                                            .map(e => (
                                                <option key={e.id} value={e.title}>
                                                    {e.title}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            )}

                            {reservationTab === 'auction' && (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                                        Select Auction Event
                                    </label>
                                    <select
                                        className="w-full px-3 py-2 bg-white border border-[#edebe9] rounded-md text-sm text-[#323130] focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] cursor-pointer"
                                        value={reservationAuctionId}
                                        onChange={e => setReservationAuctionId(e.target.value)}
                                    >
                                        <option value="">Align with an auction...</option>
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
                                            .map(e => (
                                                <option key={e.id} value={e.id}>
                                                    {e.title}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            )}

                            {reservationTab !== 'auction' && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-[#605e5c] uppercase tracking-widest">
                                        Justification & Remarks
                                    </label>
                                    <textarea
                                        value={reservationNotes}
                                        onChange={e => setReservationNotes(e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 bg-white border border-[#edebe9] rounded-md text-sm text-[#323130] focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] resize-none placeholder-[#a19f9d]"
                                        placeholder="Enter allocation specifics..."
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {bulkActionModal.type === 'transfer' && (
                    <div className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-[#605e5c] uppercase tracking-widest mb-1">Destination Branch</label>
                            <select
                                value={bulkActionValue}
                                onChange={(e) => setBulkActionValue(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-[#edebe9] rounded-md text-sm text-[#323130] focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] cursor-pointer"
                            >
                                <option value="">Synchronizing Target...</option>
                                {branches.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-neutral-100">
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Attachments (Required for Transfer)</label>
                            <div className="flex p-1 bg-neutral-100 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setActiveBulkAttachmentTab('itdr')}
                                    className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeBulkAttachmentTab === 'itdr' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'}`}
                                >
                                    IT/DR
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveBulkAttachmentTab('rsa')}
                                    className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeBulkAttachmentTab === 'rsa' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'}`}
                                >
                                    RSA / AR
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveBulkAttachmentTab('orcr')}
                                    className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeBulkAttachmentTab === 'orcr' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'}`}
                                >
                                    OR / CR
                                </button>
                            </div>

                            <div className="space-y-2">
                                <label className={`text-[10px] font-bold uppercase tracking-widest ${activeBulkAttachmentTab === 'itdr' ? 'text-[#a4262c]' : 'text-[#605e5c]'}`}>
                                    {activeBulkAttachmentTab === 'itdr' ? 'IT/DR Evidence (Mandatory)' : activeBulkAttachmentTab === 'rsa' ? 'RSA / AR Evidence' : 'OR / CR Evidence'}
                                </label>
                                <input
                                    key={activeBulkAttachmentTab}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={async (e) => {
                                        const files = Array.from(e.target.files || []);
                                        if (files.length === 0) return;
                                        const dataUrls = await Promise.all(files.map(file => compressImage(file)));
                                        const mergeAttachments = (existing: string | string[] | null | undefined) =>
                                            [...toAttachmentArray(existing), ...dataUrls];

                                        if (activeBulkAttachmentTab === 'itdr') {
                                            const next = mergeAttachments(localBulkTempItdr ?? bulkTempItdr);
                                            setLocalBulkTempItdr(next);
                                            setBulkTempItdr(next);
                                        } else if (activeBulkAttachmentTab === 'rsa') {
                                            const next = mergeAttachments(localBulkTempRsa ?? bulkTempRsa);
                                            setLocalBulkTempRsa(next);
                                            setBulkTempRsa(next);
                                        } else {
                                            const next = mergeAttachments(localBulkTempOrcr ?? bulkTempOrcr);
                                            setLocalBulkTempOrcr(next);
                                            setBulkTempOrcr(next);
                                        }
                                        e.target.value = '';
                                    }}
                                    className="block w-full text-xs text-[#605e5c] file:mr-4 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-[#323130] file:text-white hover:file:bg-[#000]"
                                />

                                {activeBulkPreviewImages.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1 mt-2">
                                        {activeBulkPreviewImages.map((image, index) => (
                                            <div key={`${image}-${index}`} className="relative group">
                                                <img
                                                    src={image}
                                                    alt={`Preview ${index + 1}`}
                                                    className="w-full h-28 object-cover bg-[#f3f2f1] rounded-md border border-[#edebe9]"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const nextImages = activeBulkPreviewImages.filter((_, imageIndex) => imageIndex !== index);
                                                        const nextValue = nextImages.length > 0 ? nextImages : null;
                                                        if (activeBulkAttachmentTab === 'itdr') {
                                                            setLocalBulkTempItdr(nextValue);
                                                            setBulkTempItdr(nextValue);
                                                        } else if (activeBulkAttachmentTab === 'rsa') {
                                                            setLocalBulkTempRsa(nextValue);
                                                            setBulkTempRsa(nextValue);
                                                        } else {
                                                            setLocalBulkTempOrcr(nextValue);
                                                            setBulkTempOrcr(nextValue);
                                                        }
                                                    }}
                                                    className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-sm shadow-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1"
                                                    title="Remove"
                                                >
                                                    <X size={12} strokeWidth={3} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="w-full h-48 bg-[#f3f2f1] rounded-md border border-[#edebe9] flex items-center justify-center text-[#a19f9d] text-xs border-dashed mt-2">
                                        No payload attached
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {bulkActionModal.type === 'framer' && (
                    <div className="space-y-6 text-sm text-neutral-800">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="flex p-4 border border-[#fff4ce] bg-[#fffaf0] rounded-md border-l-4 border-l-[#ffb900]">
                                    <div className="text-[#ffb900] mr-3">
                                        <AlertTriangle size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-[#323130] text-[13px] uppercase tracking-wide">Framing Protocol Authorization</h4>
                                        <p className="text-[11px] text-[#605e5c] mt-1 leading-relaxed">
                                            The selected assets will be transition to "For Framing" and routed to the secure framing queue. Entry of specific glass/frame requirements is mandatory for audit compliance.
                                        </p>
                                    </div>
                                </div>

                                <div className="border border-[#edebe9] rounded-md overflow-hidden bg-white shadow-sm">
                                    <div className="p-4">
                                        <label className="block text-[10px] font-bold text-[#605e5c] uppercase tracking-wider mb-2">
                                            Job Requirements & Specs *
                                        </label>
                                        <textarea
                                            value={framerDamageDetails}
                                            onChange={(e) => setFramerDamageDetails(e.target.value)}
                                            className="w-full text-sm placeholder-[#a19f9d] border border-[#edebe9] rounded-md p-3 focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] resize-none min-h-[140px] text-[#323130]"
                                            placeholder="Detail the frame profile, archival glass, and mounting specs..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-1 border border-[#edebe9] rounded-md p-5 flex flex-col items-center bg-[#f3f2f1]/50 shadow-sm">
                                <div className="flex items-center justify-center w-12 h-12 bg-white border border-[#edebe9] rounded-md shadow-sm mb-4">
                                    <Wrench className="text-[#0078d4]" size={24} />
                                </div>

                                <p className="text-[10px] font-bold text-[#a19f9d] tracking-[0.2em] uppercase mb-1">
                                    LOGISTICS GATE
                                </p>
                                <h3 className="font-bold text-[#323130] mb-6 text-center text-sm">
                                    Framer Dispatch
                                </h3>

                                <div className="w-full mb-6">
                                    <p className="text-[10px] font-bold text-[#605e5c] uppercase tracking-wider mb-2">
                                        Reference / Photo Proof
                                    </p>

                                    <div className="space-y-3">
                                        <label className="flex items-center justify-center w-full p-4 border border-dashed border-[#edebe9] rounded-md bg-white cursor-pointer hover:border-[#0078d4] hover:bg-[#eff6fc] transition-all group">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                className="hidden"
                                                onChange={async (e) => {
                                                    const files = Array.from(e.target.files || []);
                                                    if (!files.length) return;
                                                    
                                                    const newUrls = await Promise.all(files.map(f => compressImage(f)));
                                                    const existing = Array.isArray(bulkTempItdr) ? bulkTempItdr : (bulkTempItdr ? [bulkTempItdr] : []);
                                                    setBulkTempItdr([...existing, ...newUrls]);
                                                    e.target.value = '';
                                                }}
                                            />
                                            <div className="text-center">
                                                <Upload size={20} className="text-[#a19f9d] mx-auto mb-2 group-hover:text-[#0078d4] transition-colors" />
                                                <span className="text-[11px] font-bold text-[#0078d4] uppercase tracking-wide">Attach Photos</span>
                                            </div>
                                        </label>

                                        {bulkTempItdr && (Array.isArray(bulkTempItdr) ? bulkTempItdr : [bulkTempItdr]).length > 0 && (
                                            <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                                                {(Array.isArray(bulkTempItdr) ? bulkTempItdr : [bulkTempItdr]).map((url, i) => (
                                                    <div key={i} className="relative group border border-[#edebe9] rounded-sm overflow-hidden bg-white shadow-sm">
                                                        <div className="h-16 w-full">
                                                            <img src={url} className="w-full h-full object-cover opacity-90" alt={`Framer Reference ${i + 1}`} />
                                                        </div>
                                                        <button 
                                                          onClick={() => {
                                                              const arr = Array.isArray(bulkTempItdr) ? bulkTempItdr : [bulkTempItdr!];
                                                              const nextArr = arr.filter((_, idx) => idx !== i);
                                                              setBulkTempItdr(nextArr.length > 0 ? nextArr : null);
                                                          }}
                                                          className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-sm shadow-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1"
                                                          title="Remove photo"
                                                        >
                                                            <X size={12} strokeWidth={3} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-auto w-full">
                                    <button
                                        onClick={onSubmit}
                                        disabled={!framerDamageDetails.trim()}
                                        className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-neutral-100 disabled:text-neutral-400 disabled:border-neutral-200 border border-transparent text-white text-sm font-semibold rounded-sm transition-all shadow-sm flex items-center justify-center gap-2"
                                    >
                                        AUTHORIZE DISPATCH
                                    </button>
                                    <button
                                        onClick={() => {
                                            onClose();
                                            resetBulkModalState();
                                        }}
                                        className="w-full mt-3 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-800 transition-colors"
                                    >
                                        Cancel Setup
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {bulkActionModal.type === 'return' && (
                    <div className="space-y-6 text-sm text-neutral-800">
                        <div className="border-b border-neutral-200">
                            <div className="flex gap-8">
                                <button
                                    onClick={() => setReturnType('Artist Reclaim')}
                                    className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${returnType === 'Artist Reclaim' ? 'text-red-500 border-red-500' : 'text-neutral-500 border-transparent hover:text-neutral-700'}`}
                                >
                                    Return (Void)
                                </button>
                                <button
                                    onClick={() => setReturnType('For Retouch')}
                                    className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${returnType === 'For Retouch' ? 'text-blue-600 border-blue-500' : 'text-neutral-500 border-transparent hover:text-neutral-700'}`}
                                >
                                    For Retouch
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <div className={`flex p-4 border rounded-md border-l-4 transition-colors ${returnType === 'Artist Reclaim' ? 'border-[#fde7e9] bg-[#fff4f4] border-l-[#a4262c]' : 'border-[#deecf9] bg-[#eff6fc] border-l-[#0078d4]'}`}>
                                    <div className={`${returnType === 'Artist Reclaim' ? 'text-[#a4262c]' : 'text-[#0078d4]'} mr-3`}>
                                        <AlertTriangle size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-[#323130] text-[13px] uppercase tracking-wide">
                                            {returnType === 'Artist Reclaim' ? 'Permanent Asset De-Classification (VOID)' : 'Temporary Retouch Protocol'}
                                        </h4>
                                        <p className="text-[11px] text-[#605e5c] mt-1 leading-relaxed">
                                            {returnType === 'Artist Reclaim'
                                                ? 'This action triggers a permanent removal from inventory. Audit logs will mark these assets as VOID. Physical IT/DR documentation is mandatory for this gate.'
                                                : 'Assets will transition to "For Retouch" status. They remain in the central registry but are excluded from active sale views until re-entry.'}
                                        </p>
                                    </div>
                                </div>

                                <div className="border border-[#edebe9] rounded-md overflow-hidden bg-white shadow-sm">
                                    <div className="grid grid-cols-1">
                                        <div className="p-4 border-b border-[#edebe9]">
                                            <label className="block text-[10px] font-bold text-[#605e5c] uppercase tracking-wider mb-2">
                                                Reason for Protocol {returnType === 'Artist Reclaim' && '*'}
                                            </label>
                                            <textarea
                                                value={returnReason}
                                                onChange={(e) => setReturnReason(e.target.value)}
                                                className={`w-full text-sm placeholder-[#a19f9d] border border-[#edebe9] rounded-md p-3 focus:outline-none resize-none min-h-[100px] text-[#323130] transition-all ${returnType === 'Artist Reclaim' ? 'focus:border-[#a4262c] focus:ring-1 focus:ring-[#a4262c]' : 'focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]'}`}
                                                placeholder={returnType === 'Artist Reclaim' ? 'Specify de-classification reasoning...' : 'Detail the retouch requirements...'}
                                            />
                                        </div>

                                        <div className="p-3 bg-[#f3f2f1]/30">
                                            <label className="block text-[9px] font-bold text-[#a19f9d] uppercase tracking-wider mb-1">
                                                Registry Impact Annotation
                                            </label>
                                            <input
                                                type="text"
                                                disabled
                                                className="w-full text-xs font-medium border border-[#edebe9] rounded-md p-2 bg-[#f3f2f1] text-[#a19f9d] cursor-not-allowed"
                                                value={`Target: Bulk Protocol Transition (${selectedIds.length} assets)`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-1 border border-[#edebe9] rounded-md p-5 flex flex-col items-center bg-[#f3f2f1]/50 shadow-sm">
                                <div className={`flex items-center justify-center w-12 h-12 bg-white border rounded-md shadow-sm mb-4 ${returnType === 'Artist Reclaim' ? 'border-[#fde7e9]' : 'border-[#deecf9]'}`}>
                                    {returnType === 'Artist Reclaim' ? <Trash2 className="text-[#a4262c]" size={24} /> : <Wrench className="text-[#0078d4]" size={24} />}
                                </div>

                                <p className="text-[10px] font-bold text-[#a19f9d] tracking-[0.2em] uppercase mb-1">
                                    PROTOCOL GATE
                                </p>
                                <h3 className="font-bold text-[#323130] mb-6 text-center text-sm">
                                    {returnType === 'Artist Reclaim' ? 'Void Authorization' : 'Retouch Dispatch'}
                                </h3>

                                <div className="w-full mb-6">
                                    <p className="text-[10px] font-bold text-[#605e5c] uppercase tracking-wider mb-2 flex justify-between">
                                        <span>Proof Intake (IT/DR)</span>
                                        {returnType === 'Artist Reclaim' && <span className="text-[#a4262c]">*</span>}
                                    </p>

                                    <div className="space-y-3">
                                        <label className={`flex items-center justify-center w-full p-4 border border-dashed border-[#edebe9] rounded-md bg-white cursor-pointer transition-all hover:border-[#0078d4] hover:bg-[#eff6fc] group`}>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                className="hidden"
                                                onChange={async (e) => {
                                                    const files = Array.from(e.target.files || []);
                                                    if (files.length === 0) return;
                                                    const compressedImages = await Promise.all(
                                                        files.map(file => compressImage(file))
                                                    );
                                                    setReturnProofImage([...normalizedReturnProofImages, ...compressedImages]);
                                                    e.target.value = '';
                                                }}
                                            />
                                            <div className="text-center">
                                                <Upload size={20} className="text-[#a19f9d] mx-auto mb-2 group-hover:text-[#0078d4] transition-colors" />
                                                <span className={`text-[11px] font-bold uppercase tracking-wide transition-colors ${returnType === 'Artist Reclaim' ? 'text-[#a4262c]' : 'text-[#0078d4]'}`}>Select Payload</span>
                                                <p className="mt-1 text-[9px] text-[#a19f9d] font-medium tracking-tight">Multi-asset proof supported</p>
                                            </div>
                                        </label>

                                        {normalizedReturnProofImages.length > 0 && (
                                            <div className="grid grid-cols-2 gap-2">
                                                {normalizedReturnProofImages.map((image, index) => (
                                                    <div key={`${image}-${index}`} className="w-full border border-[#edebe9] rounded-md bg-white overflow-hidden relative group shadow-sm">
                                                        <div className="h-24 w-full">
                                                            <img src={image} className="w-full h-full object-cover opacity-90" alt={`Proof ${index + 1}`} />
                                                        </div>
                                                        <div className="p-2 border-t border-[#edebe9] flex justify-between items-center text-[10px] gap-2 bg-[#f3f2f1]/50">
                                                            <span className="truncate text-[#605e5c] font-bold uppercase">Proof {index + 1}</span>
                                                            <button
                                                                onClick={() => {
                                                                    const nextImages = normalizedReturnProofImages.filter((_, imageIndex) => imageIndex !== index);
                                                                    setReturnProofImage(nextImages.length > 0 ? nextImages : null);
                                                                }}
                                                                className="text-[#a4262c] hover:underline font-bold transition-all"
                                                            >
                                                                VOID
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-auto w-full">
                                    <button
                                        onClick={onSubmit}
                                        disabled={!returnReason.trim() || (returnType === 'Artist Reclaim' && normalizedReturnProofImages.length === 0)}
                                        className={`w-full py-2.5 disabled:bg-neutral-100 disabled:text-neutral-400 disabled:border-neutral-200 border border-transparent text-white text-sm font-semibold rounded-sm transition-all shadow-sm flex items-center justify-center gap-2 ${returnType === 'Artist Reclaim' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#3B82F6] hover:bg-[#2563EB]'}`}
                                    >
                                        {returnType === 'Artist Reclaim' ? 'AUTHORIZE VOID' : 'SCHEDULE RETOUCH'}
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="w-full mt-3 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-800 transition-colors"
                                    >
                                        Cancel Setup
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {bulkActionModal.type === 'delete' && (
                    <div className="p-4 bg-[#fde7e9]/50 border border-[#fde7e9] text-[#a4262c] rounded-md text-[13px] flex items-start gap-3 border-l-4 border-l-[#a4262c]">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <div className="space-y-1">
                            <p className="font-bold uppercase tracking-wide">Critical System Warning</p>
                            <p className="text-[#605e5c] leading-relaxed">This action is irreversible. The selected assets will be permanently purged from the registry and audit trails will mark this as a manual deletion.</p>
                        </div>
                    </div>
                )}

                {(bulkActionModal.type === 'framer' || bulkActionModal.type === 'return' || bulkActionModal.type === 'sale') ? (
                    <div className={`pt-6 pb-2 mt-4 ${bulkActionModal.type === 'framer' || bulkActionModal.type === 'return' || bulkActionModal.type === 'sale' ? 'hidden' : 'flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-6'}`}>
                        <button
                            onClick={() => {
                                onClose();
                                resetBulkModalState();
                            }}
                            className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-neutral-600 bg-white border border-neutral-200 hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-300 transition-all order-2 sm:order-1"
                        >
                            Back to Cart
                        </button>
                        <button
                            onClick={onSubmit}
                            disabled={bulkActionModal.type === 'framer' ? !framerDamageDetails : (!returnReason || !returnProofImage)}
                            className="w-full sm:w-auto px-8 sm:px-10 py-3 sm:py-4 rounded-full font-bold text-xs uppercase tracking-widest text-white bg-neutral-500 hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-neutral-500/20 transition-all transform hover:-translate-y-1 order-1 sm:order-2"
                        >
                            {bulkActionModal.type === 'framer' ? 'Send to Framer' : 'Confirm Return'}
                        </button>
                    </div>
                ) : bulkActionModal.type === 'sale' ? null : (
                    /* Standard Footer for other actions */
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-6 border-t border-[#edebe9] mt-6 gap-4 sm:gap-0">
                        <p className="text-[10px] font-bold text-[#a19f9d] uppercase tracking-[0.2em] hidden sm:block">
                            {bulkActionModal.type === 'delete' ? 'System De-Classification' : `Authorized ${bulkActionModal.type} operation`}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <button
                                onClick={closeAndReset}
                                className="w-full sm:w-auto px-6 py-2.5 rounded-md font-bold text-[11px] uppercase tracking-widest text-[#605e5c] bg-white border border-[#edebe9] hover:bg-[#f3f2f1] transition-all order-2 sm:order-1"
                            >
                                Back to Workspace
                            </button>
                            <button
                                onClick={onSubmit}
                                disabled={
                                    bulkActionModal.type === 'delete' ? false :
                                        bulkActionModal.type === 'reserve' ? (
                                            reservationTab === 'person' ? !reservationClient :
                                                reservationTab === 'event' ? !reservationEventName :
                                                    !reservationAuctionId
                                        ) :
                                            bulkActionModal.type === 'sale' ? (
                                                !bulkActionValue || (bulkActionExtra ? (!bulkTempItdr || !bulkTempRsa) : !bulkTempRsa)
                                            ) :
                                                bulkActionModal.type === 'transfer' ? (!bulkActionValue || !bulkTempItdr) :
                                                    bulkActionModal.type === 'framer' ? !framerDamageDetails :
                                                        bulkActionModal.type === 'return' ? (!returnReason || (returnType === 'Artist Reclaim' && normalizedReturnProofImages.length === 0)) :
                                                            true
                                }
                                className={`w-full sm:w-auto px-8 py-2.5 rounded-md font-bold text-[11px] uppercase tracking-widest shadow-sm transition-all disabled:bg-[#f3f2f1] disabled:text-[#c8c6c4] disabled:border-[#edebe9] disabled:shadow-none disabled:cursor-not-allowed order-1 sm:order-2 ${bulkActionModal.type === 'delete'
                                    ? 'bg-[#a4262c] text-white hover:bg-[#821f24]'
                                    : 'bg-[#0078d4] text-white hover:bg-[#005a9e]'
                                    }`}
                            >
                                {bulkActionModal.type === 'sale' ? 'Authorize Sale' :
                                    bulkActionModal.type === 'delete' ? 'Authorize Deletion' :
                                        bulkActionModal.type === 'reserve' ? (reservationTab === 'auction' ? 'Sync to Auction' : 'Authorize Reservation') :
                                            bulkActionModal.type === 'framer' ? 'Authorize Dispatch' :
                                                bulkActionModal.type === 'return' ? (returnType === 'Artist Reclaim' ? 'Authorize Void' : 'Authorize Retouch') :
                                                    'Complete Action'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal >
    );
};
