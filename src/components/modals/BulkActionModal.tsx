import React, { useEffect, useState } from 'react';
import { ShoppingBag, AlertCircle, Trash2, Upload, Wrench, RefreshCcw, AlertTriangle, X, Clock } from 'lucide-react';
import { Modal } from '../Modal';
import { ExhibitionEvent, Artwork } from '../../types';
import { compressImage } from '../../utils/imageUtils';
import { OptimizedTextarea } from '../OptimizedTextarea';
import { PhoneInput } from '../PhoneInput';

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
    reservationEventId: string;
    setReservationEventId: (val: string) => void;
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
    bulkActionValue, setBulkActionValue, bulkSaleEventId, setBulkSaleEventId,
    bulkClientEmail, setBulkClientEmail, bulkClientContact, setBulkClientContact,
    bulkDownpayment, setBulkDownpayment,
    bulkSaleDownpayments, setBulkSaleDownpayments,
    bulkSaleInstallmentsEnabled, setBulkSaleInstallmentsEnabled,
    events, branches,
    activeBulkAttachmentTab, setActiveBulkAttachmentTab,
    bulkTempItdr, setBulkTempItdr, bulkTempRsa, setBulkTempRsa, bulkTempOrcr, setBulkTempOrcr,
    reservationTab, setReservationTab, reservationClient, setReservationClient, reservationEventId, setReservationEventId,
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
                    reservationTab === 'event' ? !reservationEventId :
                        !reservationAuctionId
            ) :
                bulkActionModal.type === 'sale' ? (
                    !bulkActionValue ||
                    !bulkClientEmail?.trim() ||
                    !bulkClientContact || bulkClientContact.replace(/\D/g, '').length < 7 ||
                    false ||
                    toAttachmentArray(bulkTempRsa).length === 0
                ) :
                    bulkActionModal.type === 'transfer' ? (!bulkActionValue || !bulkTempItdr) :
                        bulkActionModal.type === 'framer' ? !framerDamageDetails :
                            bulkActionModal.type === 'return' ? (!returnReason || (returnType === 'Artist Reclaim' && normalizedReturnProofImages.length === 0)) :
                                true;

    const standardFooter = (
        <div className="flex flex-col sm:flex-row items-center justify-between w-full">
            <p className="text-[11px] font-medium text-[#605E5C] uppercase tracking-[0.15em] hidden sm:block">
                {bulkActionModal.type === 'delete' ? 'System De-Classification' : `Authorized ${bulkActionModal.type} operation`}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button
                    onClick={closeAndReset}
                    className="px-6 py-2 rounded-sm font-semibold text-sm text-[#323130] bg-white border border-[#8A8886] hover:bg-[#EDEBE9] transition-all order-2 sm:order-1"
                >
                    {bulkActionModal.type === 'sale' ? 'Cancel' : 'Back to Workspace'}
                </button>
                <button
                    onClick={onSubmit}
                    disabled={isStandardActionDisabled}
                    className={`px-10 py-2 rounded-sm font-semibold text-sm shadow-sm transition-all disabled:bg-[#F3F2F1] disabled:text-[#A19F9D] disabled:border-[#EDEBE9] disabled:shadow-none disabled:cursor-not-allowed order-1 sm:order-2 ${bulkActionModal.type === 'delete'
                        ? 'bg-[#A4262C] text-white hover:bg-[#821F24]'
                        : 'bg-[#0078D4] text-white hover:bg-[#005A9E]'
                        }`}
                >
                    {bulkActionModal.type === 'sale' ? 'Confirm Sale' :
                        bulkActionModal.type === 'delete' ? 'Authorize Deletion' :
                            bulkActionModal.type === 'reserve' ? (reservationTab === 'auction' ? 'Sync to Auction' : 'Authorize Reservation') :
                                bulkActionModal.type === 'framer' ? 'Request Delivery' :
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
            footer={standardFooter}
        >
            <div className="space-y-4">
                {bulkActionModal.type === 'sale' && (
                    <div className="space-y-6">
                        {/* Customer Information Card */}
                        <div className="bg-white p-6 border border-[#E1E1E1] rounded-sm shadow-sm">
                            <h4 className="text-xs font-semibold text-[#605E5C] uppercase tracking-widest mb-4 flex items-center gap-2">
                                <div className="w-1 h-4 bg-[#0078D4]" />
                                Customer Information
                            </h4>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-[#605E5C] uppercase tracking-wider">Client Full Name</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={bulkActionValue}
                                        onChange={(e) => setBulkActionValue(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-[#8A8886] rounded-sm text-sm text-[#323130] focus:outline-none focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4] transition-all"
                                        placeholder="Enter customer name..."
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-semibold text-[#605E5C] uppercase tracking-wider">Primary Email *</label>
                                        <input
                                            type="email"
                                            value={bulkClientEmail || ''}
                                            onChange={(e) => setBulkClientEmail?.(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-[#8A8886] rounded-sm text-sm text-[#323130] focus:outline-none focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4] transition-all"
                                            placeholder="client@mail.com"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-semibold text-[#605E5C] uppercase tracking-wider">Mobile Contact *</label>
                                        <PhoneInput
                                            value={bulkClientContact || ''}
                                            onChange={(val) => setBulkClientContact?.(val)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Event Alignment Card */}
                        <div className="bg-white p-6 border border-[#E1E1E1] rounded-sm shadow-sm">
                            <h4 className="text-xs font-semibold text-[#605E5C] uppercase tracking-widest mb-4 flex items-center gap-2">
                                <div className="w-1 h-4 bg-[#0078D4]" />
                                Event Alignment
                            </h4>
                            <select
                                className="w-full px-3 py-2 bg-white border border-[#8A8886] rounded-sm text-sm text-[#323130] focus:outline-none focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4] cursor-pointer"
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

                        {/* Financial Reconciliation Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h4 className="text-xs font-semibold text-[#605E5C] uppercase tracking-widest">Financial Reconciliation</h4>
                                <span className="text-[11px] text-[#A19F9D]">Batch size: {selectedIds.length} assets</span>
                            </div>

                            <div className="space-y-3">
                                {selectedArtworks.map((art) => {
                                    const installmentEnabled = localInstallmentsEnabled[art.id] ?? bulkSaleInstallmentsEnabled?.[art.id] ?? !!bulkSaleDownpayments?.[art.id];
                                    const downpaymentValue = bulkSaleDownpayments?.[art.id] || '';
                                    const numericDownpayment = parseFloat(downpaymentValue || '0');
                                    const isFullPayment = !Number.isNaN(numericDownpayment) && numericDownpayment >= (art.price || 0);
                                    const remainingBalance = Math.max((art.price || 0) - (Number.isNaN(numericDownpayment) ? 0 : numericDownpayment), 0);

                                    return (
                                        <div key={art.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                                            <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-[#F3F3F3] rounded-sm flex items-center justify-center border border-[#E1E1E1]">
                                                        <ShoppingBag size={20} className="text-[#0078D4]" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-[#323130]">{art.title}</div>
                                                        <div className="text-[11px] text-[#605E5C] flex items-center gap-1">
                                                            {art.artist} <span className="text-[#A19F9D]">•</span> <span className="font-semibold text-[#0078D4]">{art.code}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-8">
                                                    <div className="text-right">
                                                        <div className="text-[10px] font-semibold text-[#A19F9D] uppercase tracking-wider">Asset Value</div>
                                                        <div className="text-sm font-bold text-[#323130]">₱{(art.price || 0).toLocaleString()}</div>
                                                    </div>
                                                    <label className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-all">
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
                                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-0"
                                                        />
                                                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Installments</span>
                                                    </label>
                                                </div>
                                            </div>

                                            {installmentEnabled && (
                                                <div className="bg-[#F9F9F9] border-t border-[#E1E1E1] p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Downpayment Entry</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">₱</span>
                                                            <input
                                                                type="text"
                                                                value={downpaymentValue}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.replace(/[^0-9.]/g, '');
                                                                    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                                                                        setBulkSaleDownpayments?.(prev => ({ ...prev, [art.id]: val }));
                                                                    }
                                                                }}
                                                                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                                placeholder="0.00"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className={`p-4 rounded-lg border ${isFullPayment ? 'bg-emerald-50 border-emerald-100' : 'bg-blue-50 border-blue-100'} flex flex-col justify-center`}>
                                                        <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isFullPayment ? 'text-emerald-600' : 'text-blue-600'}`}>
                                                            {isFullPayment ? 'Status: Full Payment' : 'Remaining Balance'}
                                                        </div>
                                                        <div className="text-lg font-black text-slate-800">
                                                            ₱{remainingBalance.toLocaleString()}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Summary Card */}
                        {totalPerArtworkDownpayment > 0 && (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Batch Collection Total</span>
                                    <span className="text-lg font-black text-emerald-600">₱{totalPerArtworkDownpayment.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Net Project Receivables</span>
                                    <span className="text-xl font-black text-slate-900">₱{Math.max(totalSelectedValue - totalPerArtworkDownpayment, 0).toLocaleString()}</span>
                                </div>
                            </div>
                        )}

                        {/* Attachments Section */}
                        <div className="bg-white p-8 border border-slate-200 rounded-xl shadow-sm space-y-6">
                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-3">
                                <div className="w-1.5 h-4 bg-red-600 rounded-full" />
                                Protocol Attachments
                            </h4>
                            
                            <div className="flex bg-[#F3F3F3] p-1 rounded-sm border border-[#E1E1E1]">
                                {(['itdr', 'rsa', 'orcr'] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => setActiveBulkAttachmentTab(tab)}
                                        className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all ${activeBulkAttachmentTab === tab ? 'bg-white text-[#323130] shadow-sm border border-[#E1E1E1]' : 'text-[#605E5C] hover:bg-[#EDEBE9]'}`}
                                    >
                                        {tab === 'itdr' ? 'IT/DR' : tab === 'rsa' ? 'RSA/AR' : 'OR/CR'}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className={`text-[10px] font-bold uppercase tracking-widest ${activeBulkAttachmentTab === 'rsa' ? 'text-[#A4262C]' : 'text-[#605E5C]'}`}>
                                        {activeBulkAttachmentTab === 'itdr' ? 'IT/DR Proof' : activeBulkAttachmentTab === 'rsa' ? 'RSA/AR Evidence (Mandatory)' : 'OR/CR Evidence'}
                                    </label>
                                    <span className="text-[10px] text-[#A19F9D] uppercase tracking-widest">{activeBulkPreviewImages.length} Attached</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#E1E1E1] rounded-sm bg-[#F9F9F9] hover:bg-[#F3F3F3] hover:border-[#0078D4] transition-all cursor-pointer group h-40">
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
                                            className="hidden"
                                        />
                                        <Upload size={24} className="text-[#A19F9D] mb-2 group-hover:text-[#0078D4] transition-colors" />
                                        <span className="text-[10px] font-bold text-[#0078D4] uppercase tracking-widest">Upload Files</span>
                                        <span className="text-[9px] text-[#A19F9D] mt-1">Multi-selection active</span>
                                    </label>

                                    <div className="h-40 overflow-y-auto custom-scrollbar border border-[#E1E1E1] rounded-sm bg-[#F3F3F3] p-2">
                                        {activeBulkPreviewImages.length > 0 ? (
                                            <div className="grid grid-cols-2 gap-2">
                                                {activeBulkPreviewImages.map((image, index) => (
                                                    <div key={`${image}-${index}`} className="relative aspect-square rounded-sm overflow-hidden border border-[#E1E1E1] bg-white group shadow-sm">
                                                        <img src={image} className="w-full h-full object-cover" alt="Preview" />
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
                                                            className="absolute top-1 right-1 p-1 bg-white border border-[#E1E1E1] rounded-sm text-[#A4262C] opacity-0 group-hover:opacity-100 transition-all hover:bg-[#FDE7E9]"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-[#A19F9D] gap-1 opacity-60">
                                                <AlertCircle size={16} />
                                                <span className="text-[9px] font-bold uppercase tracking-widest">No Selection</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {bulkActionModal.type === 'reserve' && (
                    <div className="space-y-6">
                        <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex">
                            {(['person', 'event', 'auction'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setReservationTab(tab)}
                                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${reservationTab === tab
                                        ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    {tab === 'person' ? 'Person' : tab === 'event' ? 'Event' : 'Auction'}
                                </button>
                            ))}
                        </div>

                        <div className="bg-white p-6 border border-[#E1E1E1] rounded-sm shadow-sm space-y-6">
                            {reservationTab === 'person' && (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                                            Client Identification
                                        </label>
                                        <input
                                            autoFocus
                                            type="text"
                                            value={reservationClient}
                                            onChange={e => setReservationClient(e.target.value)}
                                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                            placeholder="Enter full name..."
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[11px] font-semibold text-[#605E5C] uppercase tracking-wider">
                                            Expiration Period (Time-to-Live)
                                        </label>
                                        <div className="grid grid-cols-3 gap-4">
                                            {(['Days', 'Hours', 'Minutes'] as const).map((unit) => (
                                                <div key={unit} className="space-y-1">
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        className="w-full px-3 py-2 bg-white border border-[#8A8886] rounded-sm text-sm font-bold text-center text-[#323130] focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4] outline-none"
                                                        value={unit === 'Days' ? reservationDays : unit === 'Hours' ? reservationHours : reservationMinutes}
                                                        onFocus={(e) => e.target.select()}
                                                        onChange={e => {
                                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                                            const num = Math.max(0, parseInt(val || '0', 10));
                                                            if (unit === 'Days') setReservationDays(num);
                                                            else if (unit === 'Hours') setReservationHours(num);
                                                            else setReservationMinutes(num);
                                                        }}
                                                    />
                                                    <p className="text-[10px] text-center font-semibold text-[#A19F9D] uppercase tracking-widest">
                                                        {unit}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {reservationTab === 'event' && (
                                <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-[#605E5C] uppercase tracking-wider">
                                        Select Allocated Event
                                    </label>
                                    <select
                                        className="w-full px-3 py-2 bg-white border border-[#8A8886] rounded-sm text-sm text-[#323130] focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4] outline-none cursor-pointer"
                                        value={reservationEventId}
                                        onChange={e => setReservationEventId(e.target.value)}
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
                                                <option key={e.id} value={e.id}>
                                                    {e.title}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            )}

                            {reservationTab === 'auction' && (
                                <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-[#605E5C] uppercase tracking-wider">
                                        Select Auction Event
                                    </label>
                                    <select
                                        className="w-full px-3 py-2 bg-white border border-[#8A8886] rounded-sm text-sm text-[#323130] focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4] outline-none cursor-pointer"
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
                                <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-[#605E5C] uppercase tracking-wider">
                                        Justification & Remarks
                                    </label>
                                    <OptimizedTextarea
                                        value={reservationNotes}
                                        onChange={(e: any) => setReservationNotes(e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 bg-white border border-[#8A8886] rounded-sm text-sm text-[#323130] focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4] outline-none resize-none placeholder-[#A19F9D]"
                                        placeholder="Enter allocation specifics..."
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {bulkActionModal.type === 'transfer' && (
                    <div className="space-y-6">
                        <div className="bg-white p-6 border border-[#E1E1E1] rounded-sm shadow-sm space-y-4">
                            <h4 className="text-xs font-semibold text-[#605E5C] uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1 h-4 bg-[#0078D4]" />
                                Destination Logistics
                            </h4>
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-[#605E5C] uppercase tracking-wider">Target Branch</label>
                                <select
                                    value={bulkActionValue}
                                    onChange={(e) => setBulkActionValue(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-[#8A8886] rounded-sm text-sm text-[#323130] focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4] outline-none cursor-pointer"
                                >
                                    <option value="">Synchronizing Target...</option>
                                    {branches.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="bg-white p-6 border border-[#E1E1E1] rounded-sm shadow-sm space-y-4">
                            <h4 className="text-xs font-semibold text-[#605E5C] uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1 h-4 bg-[#A4262C]" />
                                Protocol Evidence (Mandatory)
                            </h4>
                            
                            <div className="flex bg-[#F3F3F3] p-1 rounded-sm border border-[#E1E1E1]">
                                {(['itdr', 'rsa', 'orcr'] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => setActiveBulkAttachmentTab(tab)}
                                        className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all ${activeBulkAttachmentTab === tab ? 'bg-white text-[#323130] shadow-sm border border-[#E1E1E1]' : 'text-[#605E5C] hover:bg-[#EDEBE9]'}`}
                                    >
                                        {tab === 'itdr' ? 'IT/DR' : tab === 'rsa' ? 'RSA/AR' : 'OR/CR'}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className={`text-[10px] font-bold uppercase tracking-widest ${activeBulkAttachmentTab === 'itdr' ? 'text-[#A4262C]' : 'text-[#605E5C]'}`}>
                                        {activeBulkAttachmentTab === 'itdr' ? 'IT/DR Evidence (Required)' : activeBulkAttachmentTab === 'rsa' ? 'RSA/AR Evidence' : 'OR/CR Evidence'}
                                    </label>
                                    <span className="text-[10px] text-[#A19F9D] uppercase tracking-widest">{activeBulkPreviewImages.length} Attached</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#E1E1E1] rounded-sm bg-[#F9F9F9] hover:bg-[#F3F3F3] hover:border-[#0078D4] transition-all cursor-pointer group h-40">
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
                                            className="hidden"
                                        />
                                        <Upload size={24} className="text-[#A19F9D] mb-2 group-hover:text-[#0078D4] transition-colors" />
                                        <span className="text-[10px] font-bold text-[#0078D4] uppercase tracking-widest">Upload Proof</span>
                                    </label>

                                    <div className="h-40 overflow-y-auto custom-scrollbar border border-[#E1E1E1] rounded-sm bg-[#F3F3F3] p-2">
                                        {activeBulkPreviewImages.length > 0 ? (
                                            <div className="grid grid-cols-2 gap-2">
                                                {activeBulkPreviewImages.map((image, index) => (
                                                    <div key={`${image}-${index}`} className="relative aspect-square rounded-sm overflow-hidden border border-[#E1E1E1] bg-white group shadow-sm">
                                                        <img src={image} className="w-full h-full object-cover" alt="Preview" />
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
                                                            className="absolute top-1 right-1 p-1 bg-white border border-[#E1E1E1] rounded-sm text-[#A4262C] opacity-0 group-hover:opacity-100 transition-all hover:bg-[#FDE7E9]"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-[#A19F9D] gap-1 opacity-60">
                                                <AlertCircle size={16} />
                                                <span className="text-[9px] font-bold uppercase tracking-widest">No Selection</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {bulkActionModal.type === 'framer' && (
                    <div className="space-y-6">
                        <div className="p-5 bg-[#FFFAF0] border border-[#FFB900]/30 rounded-sm flex items-start gap-4 border-l-4 border-l-[#FFB900]">
                            <AlertTriangle className="text-[#FFB900] shrink-0" size={24} />
                            <div>
                                <h4 className="text-sm font-bold text-[#323130] uppercase tracking-wide">Framing Protocol Authorization</h4>
                                <p className="text-[12px] text-[#605E5C] mt-1 leading-relaxed">
                                    Assets will transition to "For Framing" and routed to the secure framing queue. Entry of specific glass/frame requirements is mandatory for audit compliance.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-6">
                            <div className="space-y-6">
                                <div className="bg-white p-6 border border-[#E1E1E1] rounded-sm shadow-sm space-y-4">
                                    <h4 className="text-xs font-semibold text-[#605E5C] uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1 h-4 bg-[#0078D4]" />
                                        Job Requirements & Specs *
                                    </h4>
                                    <OptimizedTextarea
                                        value={framerDamageDetails}
                                        onChange={(e: any) => setFramerDamageDetails(e.target.value)}
                                        className="w-full text-sm placeholder-[#A19F9D] border border-[#8A8886] rounded-sm p-4 focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4] outline-none resize-none min-h-[160px] text-[#323130]"
                                        placeholder="Detail the frame profile, archival glass, and mounting specs..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-white p-6 border border-[#E1E1E1] rounded-sm shadow-sm space-y-4">
                                    <h4 className="text-xs font-semibold text-[#605E5C] uppercase tracking-widest text-center">Reference Proof</h4>
                                    
                                    <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-[#E1E1E1] rounded-sm bg-[#F9F9F9] hover:bg-[#F3F3F3] hover:border-[#0078D4] transition-all cursor-pointer group">
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
                                        <Upload size={20} className="text-[#A19F9D] mb-2 group-hover:text-[#0078D4] transition-colors" />
                                        <span className="text-[10px] font-bold text-[#0078D4] uppercase tracking-widest">Attach</span>
                                    </label>

                                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar pr-1 space-y-2">
                                        {(Array.isArray(bulkTempItdr) ? bulkTempItdr : [bulkTempItdr]).filter(Boolean).map((url, i) => (
                                            <div key={i} className="relative aspect-video border border-[#E1E1E1] rounded-sm overflow-hidden bg-[#F3F3F3] group">
                                                <img src={url as string} className="w-full h-full object-cover" alt="Proof" />
                                                <button 
                                                    onClick={() => {
                                                        const arr = Array.isArray(bulkTempItdr) ? bulkTempItdr : [bulkTempItdr!];
                                                        const nextArr = arr.filter((_, idx) => idx !== i);
                                                        setBulkTempItdr(nextArr.length > 0 ? nextArr : null);
                                                    }}
                                                    className="absolute top-1 right-1 p-1 bg-white/90 border border-[#E1E1E1] rounded-sm text-[#A4262C] opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
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
                                            <OptimizedTextarea
                                                value={returnReason}
                                                onChange={(e: any) => setReturnReason(e.target.value)}
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

                                <div className="p-4 bg-[#F3F3F3] border border-[#E1E1E1] rounded-sm flex items-center justify-center gap-2">
                                    <Clock size={16} className="text-[#0078D4]" />
                                    <span className="text-[10px] font-bold text-[#605E5C] uppercase tracking-widest">Awaiting Authorization</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {bulkActionModal.type === 'delete' && (
                    <div className="bg-[#FDE7E9] border-l-4 border-[#A4262C] p-6 rounded-sm border-y border-r border-y-[#A4262C]/20 border-r-[#A4262C]/20">
                        <div className="flex gap-4">
                            <AlertCircle className="text-[#A4262C] shrink-0" size={24} />
                            <div className="space-y-2">
                                <h4 className="text-sm font-bold text-[#A4262C] uppercase tracking-wide">Irreversible System Purge</h4>
                                <p className="text-[13px] text-[#323130] leading-relaxed">
                                    You are about to permanently delete <span className="font-bold">{selectedIds.length}</span> selected assets from the central registry. This action cannot be undone and will be recorded in the audit trail.
                                </p>
                                <p className="text-[12px] text-[#605E5C] font-medium italic">
                                    Please ensure all physical inventory has been reconciled before proceeding.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer is now handled by standardFooter via standard modal footer prop */}
            </div>
        </Modal>
    );
};
