
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Artwork,
  ArtworkStatus,
  ActivityLog,
  SaleRecord,
  UserRole,
  Branch,
  ExhibitionEvent,
  UserPermissions,
  ReturnType,
  FramerRecord,
  ReturnRecord
} from '../types';
import { ICONS } from '../constants';
import CertificateModal from '../components/CertificateModal';
import { ActionResultModal } from '../components/modals/ActionResultModal';
import { XCircle, Bookmark, Edit, Paperclip, ChevronDown, Trash2, RotateCcw, AlertTriangle, AlertCircle, Upload, Tag, Archive, Wrench, Gavel, FileSpreadsheet, Download, FileText, Package, Image as ImageIcon, Clock, Calendar, Home, ArrowRight, Plus, ChevronLeft, LayoutDashboard, Box, Truck, ShoppingCart, PackageCheck, MessageSquare, ArrowRightLeft, History as HistoryIcon, Check, X } from 'lucide-react';
import LoadingOverlay from '../components/LoadingOverlay';
import { OptimizedImage } from '../components/OptimizedImage';
import { compressImage } from '../utils/imageUtils';
import { parseAttachmentString } from '../utils/attachmentUtils';
import { useMasterViewDerived } from '../hooks/useMasterViewDerived';
import { useActionProcessing } from '../hooks/useActionProcessing';

interface MasterViewProps {
  artwork: Artwork;
  branches: string[];
  logs: ActivityLog[];
  sale?: SaleRecord;
  userRole: UserRole;
  userPermissions?: UserPermissions;
  onTransfer: (id: string, destination: Branch, attachments?: { itdrUrl?: string | string[] }) => void;
  onSale: (
    id: string,
    clientName: string,
    clientEmail: string,
    clientContact: string,
    delivered: boolean,
    eventInfo?: { id: string, name: string },
    attachment?: string,
    itdr?: string[],
    rsa?: string[],
    orcr?: string[],
    downpayment?: number
  ) => void;
  onCancelSale: (id: string) => void;
  onDeliver: (id: string, itdr?: string | string[], rsa?: string | string[], orcr?: string | string[]) => void;
  onEdit: (updates: Partial<Artwork>) => void;
  onBack: () => void;
  events?: ExhibitionEvent[];
  onReserve?: (id: string, details: string, expiryDate?: string, eventId?: string, eventName?: string) => Promise<boolean | void> | boolean | void;
  onReservationComplete?: () => void;
  onCancelReservation?: (id: string) => Promise<boolean | void> | boolean | void;
  onDelete?: (id: string) => void;
  onReturn?: (id: string, reason: string, refNumber?: string, proofImage?: string | string[], remarks?: string, type?: ReturnType) => Promise<boolean | void> | boolean | void;
  onReturnToGallery?: (recordId: string, branch: string, resolvedAt?: string) => Promise<boolean | void> | boolean | void;
  onSendToFramer?: (id: string, damageDetails: string, attachmentUrl?: string | string[]) => Promise<boolean | void> | boolean | void;
  onReturnFromFramer?: (recordId: string, branch: string, resolvedAt?: string) => Promise<boolean | void> | boolean | void;
  onAddToAuction?: (artworkIds: string[], auctionId: string, name: string) => Promise<boolean | void> | boolean | void;
  onNavigateTo?: (tab: string, view?: string) => void;
  framerRecords?: FramerRecord[];
  returnRecords?: ReturnRecord[];
  onAddInstallment?: (saleId: string, amount: number, date: string, reference?: string, proofImage?: string | string[]) => void;
  onEditPayment?: (saleId: string, paymentId: string, updates: { amount: number; date?: string; reference?: string }) => void;
  onApprovePaymentEdit?: (saleId: string, paymentId: string) => void;
  onDeclinePaymentEdit?: (saleId: string, paymentId: string) => void;
}

const MasterView: React.FC<MasterViewProps> = ({
  artwork, branches, logs, sale, userRole, userPermissions, onTransfer, onSale, onCancelSale, onDeliver, onReturn, onReturnToGallery, onSendToFramer, onReturnFromFramer, onEdit, onBack, events = [], onReserve, onReservationComplete, onCancelReservation, onDelete, onAddToAuction, onNavigateTo,
  framerRecords = [], returnRecords = [], onAddInstallment, onEditPayment, onApprovePaymentEdit, onDeclinePaymentEdit
}) => {
  const [modalMode, setModalMode] = useState<'transfer' | 'sale' | 'reserve' | 'certificate' | 'edit' | 'attach-unified' | 'return' | 'framer' | 'framer-return' | 'retouch-return' | 'auction' | 'delivery-attach' | 'none' | 'installment' | 'edit-payment'>('none');
  const [editingPayment, setEditingPayment] = useState<{ id: string; amount: string; date: string; reference: string; type: 'downpayment' | 'installment' } | null>(null);
  const [optimisticArtwork, setOptimisticArtwork] = useState<Artwork | null>(null);
  const [pendingViewState, setPendingViewState] = useState<{ status?: ArtworkStatus; currentBranch?: string } | null>(null);

  const canView = useMemo(() => {
    const canViewReserved = userPermissions?.canViewReserved ?? true;
    const canViewAuctioned = userPermissions?.canViewAuctioned ?? true;
    const canViewExhibit = userPermissions?.canViewExhibit ?? true;
    const canViewForFraming = userPermissions?.canViewForFraming ?? true;
    const canViewBackToArtist = userPermissions?.canViewBackToArtist ?? true;

    if (artwork.status === ArtworkStatus.RESERVED) {
      const isAuction = (artwork.remarks || '').includes('[Reserved For Auction:');
      const isEvent = (artwork.remarks || '').includes('[Reserved For Event:');

      if (isAuction) {
        if (!canViewAuctioned) return false;
      } else if (isEvent) {
        if (!canViewExhibit) return false;
      } else {
        if (!canViewReserved) return false;
      }
    } else if (artwork.status === ArtworkStatus.FOR_FRAMING) {
      if (!canViewForFraming) return false;
    } else if (artwork.status === ArtworkStatus.FOR_RETOUCH) {
      if (!canViewBackToArtist) return false;
    }
    return true;
  }, [artwork, userPermissions]);

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 animate-in fade-in duration-300">
        <div className="p-4 bg-red-50 rounded-md">
          <AlertTriangle size={48} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-black text-neutral-900">Access Denied</h2>
        <p className="text-neutral-500 font-medium">You do not have permission to view this artwork.</p>
        <button onClick={onBack} className="px-8 py-3 bg-neutral-900 text-white rounded-sm font-bold hover:bg-neutral-800 transition-colors shadow-lg shadow-neutral-200">
          Return to Inventory
        </button>
      </div>
    );
  }

  const [deliveryItdr, setDeliveryItdr] = useState<string[]>([]);
  const [deliveryRsa, setDeliveryRsa] = useState<string[]>([]);
  const [deliveryOrcr, setDeliveryOrcr] = useState<string[]>([]);
  const [activeDeliveryAttachmentTab, setActiveDeliveryAttachmentTab] = useState<'itdr' | 'rsa' | 'orcr'>('itdr');
  const [activeAttachmentTab, setActiveAttachmentTab] = useState<'itdr' | 'rsa' | 'orcr'>('itdr');
  const [transferBranch, setTransferBranch] = useState<Branch>(branches[0] as Branch);
  const [transferItdr, setTransferItdr] = useState<string[]>([]);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [saleDownpayment, setSaleDownpayment] = useState('');
  const [saleEventId, setSaleEventId] = useState('');
  const [saleDelivered, setSaleDelivered] = useState(false);
  const [saleAttachment, setSaleAttachment] = useState<string>('');
  const [saleItdr, setSaleItdr] = useState<string[]>([]);
  const [saleRsa, setSaleRsa] = useState<string[]>([]);
  const [saleOrcr, setSaleOrcr] = useState<string[]>([]);
  const [activeSaleAttachmentTab, setActiveSaleAttachmentTab] = useState<'itdr' | 'rsa' | 'orcr'>('itdr');
  const [returnReason, setReturnReason] = useState('');
  const [returnRefNumber, setReturnRefNumber] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnProofImages, setReturnProofImages] = useState<string[]>([]);
  const [returnType, setReturnType] = useState<ReturnType>('Artist Reclaim');
  const [damageDetails, setDamageDetails] = useState('');
  const [framerAttachment, setFramerAttachment] = useState<string[]>([]);
  const [returnBranch, setReturnBranch] = useState<string>(branches[0]);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 16));
  const [returnStrategy, setReturnStrategy] = useState<'original' | 'manual'>('original');
  const [isTransferringFromReturn, setIsTransferringFromReturn] = useState(false);
  const [returnItdrUrl, setReturnItdrUrl] = useState<string[]>([]);

  const [installmentAmount, setInstallmentAmount] = useState('');
  const [installmentDate, setInstallmentDate] = useState(new Date().toISOString().slice(0, 10));
  const [installmentReference, setInstallmentReference] = useState('');
  const [installmentProof, setInstallmentProof] = useState<string[]>([]);

  const [reserveType, setReserveType] = useState<'Person' | 'Event' | 'Auction'>('Person');
  const [reserveTarget, setReserveTarget] = useState('');
  const [reserveNotes, setReserveNotes] = useState('');
  const [reserveDays, setReserveDays] = useState(3);
  const [reserveHours, setReserveHours] = useState(0);
  const [reserveMinutes, setReserveMinutes] = useState(0);

  const [selectedAuctionId, setSelectedAuctionId] = useState('');
  const [selectedAuctionName, setSelectedAuctionName] = useState('');

  const [editForm, setEditForm] = useState<Partial<Artwork>>(artwork);
  useEffect(() => {
    setEditForm(artwork);
  }, [artwork]);

  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [activityFilter, setActivityFilter] = useState<string>('All');
  const [showLogDetails, setShowLogDetails] = useState(false);

  const {
    activeFramerRecord,
    activeRetouchRecord,
    latestFramerLog,
    latestRetouchLog,
    effectiveLogs,
    transferLogs
  } = useMasterViewDerived({
    artwork,
    logs,
    sale,
    framerRecords,
    returnRecords,
    activityFilter
  });

  const {
    isProcessing,
    processMessage,
    processProgress,
    confirmModal,
    setConfirmModal,
    actionResultModal,
    setActionResultModal,
    wrapAction,
    showActionResult
  } = useActionProcessing({
    itemTitle: artwork.title,
    itemCode: artwork.code
  });

  const resetReturnState = () => {
    setReturnReason('');
    setReturnRefNumber('');
    setReturnProofImages([]);
    setReturnNotes('');
    setReturnType('Artist Reclaim');
  };

  const resetFramerState = () => {
    setDamageDetails('');
    setFramerAttachment([]);
  };

  const [itdrUrl, setItdrUrl] = useState<string[]>(parseAttachmentString(artwork.itdrImageUrl));
  const [timelineView, setTimelineView] = useState<'activity' | 'transfers' | 'payments'>('activity');
  const [showItdrPreview, setShowItdrPreview] = useState(false);
  const [showRsaPreview, setShowRsaPreview] = useState(false);
  const [showOrCrPreview, setShowOrCrPreview] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [tempAttachmentUrl, setTempAttachmentUrl] = useState<string>('');

  const [tempItdr, setTempItdr] = useState<string[]>([]);
  const [tempRsa, setTempRsa] = useState<string[]>([]);
  const [tempOrcr, setTempOrcr] = useState<string[]>([]);
  const displayArtwork = (optimisticArtwork && String(optimisticArtwork.id) === String(artwork.id)) ? optimisticArtwork : artwork;
  const displayStatus = pendingViewState?.status ?? displayArtwork.status;
  const displayBranch = pendingViewState?.currentBranch ?? displayArtwork.currentBranch;
  const isStatusTransitioning = !!pendingViewState;

  const setOptimisticArtworkState = (updates: Partial<Artwork>) => {
    setOptimisticArtwork(prev => ({ ...(prev && String(prev.id) === String(artwork.id) ? prev : artwork), ...updates } as Artwork));
  };

  useEffect(() => {
    setOptimisticArtwork(null);
    setPendingViewState(null);
  }, [artwork.id]);

  useEffect(() => {
    if (!optimisticArtwork || String(optimisticArtwork.id) !== String(artwork.id)) return;
    const matchesStatus = optimisticArtwork.status === artwork.status;
    const matchesBranch = optimisticArtwork.currentBranch === artwork.currentBranch;
    const matchesDeletedAt = optimisticArtwork.deletedAt === artwork.deletedAt;
    const matchesRemarks = optimisticArtwork.remarks === artwork.remarks;
    if (matchesStatus && matchesBranch && matchesDeletedAt && matchesRemarks) {
      setOptimisticArtwork(null);
    }
  }, [artwork, optimisticArtwork]);

  useEffect(() => {
    if (!pendingViewState) return;
    const statusSettled = !pendingViewState.status || artwork.status === pendingViewState.status;
    const branchSettled = !pendingViewState.currentBranch || artwork.currentBranch === pendingViewState.currentBranch;
    if (statusSettled && branchSettled) {
      setPendingViewState(null);
    }
  }, [artwork.status, artwork.currentBranch, pendingViewState]);

  useEffect(() => {
    if (modalMode === 'attach-unified') {
      setTempItdr(parseAttachmentString(artwork.itdrImageUrl));
      setTempRsa(parseAttachmentString(artwork.rsaImageUrl));
      setTempOrcr(parseAttachmentString(artwork.orCrImageUrl));
      setActiveAttachmentTab('itdr');
    } else if (modalMode === 'edit') {
      setEditForm({
        title: artwork.title,
        artist: artwork.artist,
        medium: artwork.medium,
        dimensions: artwork.dimensions,
        year: artwork.year,
        price: artwork.price,
        currentBranch: artwork.currentBranch,
        remarks: artwork.remarks,
        imageUrl: artwork.imageUrl,
        rsaImageUrl: artwork.rsaImageUrl,
        orCrImageUrl: artwork.orCrImageUrl
      });
      setItdrUrl(parseAttachmentString(artwork.itdrImageUrl));
    } else if (modalMode === 'framer-return' || modalMode === 'retouch-return') {
      const record = modalMode === 'framer-return' ? activeFramerRecord : activeRetouchRecord;
      const originalBranch = record?.artworkSnapshot?.currentBranch;
      if (originalBranch && branches.includes(originalBranch)) {
        setReturnBranch(originalBranch);
        setReturnStrategy('original');
      } else {
        setReturnStrategy('manual');
        if (branches.includes(artwork.currentBranch)) {
          setReturnBranch(artwork.currentBranch);
        }
      }
      setReturnDate(new Date().toISOString().slice(0, 16));
    }
  }, [modalMode]);

  const prevSaleModalMode = useRef('none');
  useEffect(() => {
    if (modalMode === 'sale' && prevSaleModalMode.current !== 'sale' && displayStatus === ArtworkStatus.RESERVED) {
      if (artwork.remarks?.includes('Type: Person')) {
        const targetName = artwork.remarks.split('Target:')[1]?.split('|')[0]?.trim();
        if (targetName) setClientName(targetName);
      }
      else if (artwork.remarks?.includes('Type: Event')) {
        const targetName = artwork.remarks.split('Target:')[1]?.split('|')[0]?.trim();
        const event = events.find(e => e.title === targetName);
        if (event) setSaleEventId(event.id);
      }
      else if (artwork.remarks?.includes('Type: Auction')) {
        const targetName = artwork.remarks.split('Target:')[1]?.split('|')[0]?.trim();
        const event = events.find(e => e.title === targetName);
        if (event) setSaleEventId(event.id);
      }
    }
    prevSaleModalMode.current = modalMode;
  }, [modalMode, displayStatus, artwork.remarks, events]);

  React.useEffect(() => {
    if (modalMode === 'none') {
      setEditForm({
        title: artwork.title,
        artist: artwork.artist,
        medium: artwork.medium,
        dimensions: artwork.dimensions,
        year: artwork.year,
        price: artwork.price,
        currentBranch: artwork.currentBranch,
        remarks: artwork.remarks,
        imageUrl: artwork.imageUrl,
        rsaImageUrl: artwork.rsaImageUrl,
        orCrImageUrl: artwork.orCrImageUrl
      });
      setItdrUrl(parseAttachmentString(artwork.itdrImageUrl));
    }
  }, [artwork, modalMode]);

  useEffect(() => {
    if (artwork.reservedForEventId) {
      setSaleEventId(artwork.reservedForEventId);
    } else {
      setSaleEventId('');
    }
  }, [artwork]);

  const handlePrintItdr = () => {
    if (!artwork.itdrImageUrl) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>IT/DR</title></head><body style="margin:0"><img src="${artwork.itdrImageUrl}" style="max-width:100%;height:auto;display:block"/></body></html>`);
    w.document.close();
    w.focus();
    w.onload = () => w.print();
  };

  const handlePrintRsa = () => {
    if (!artwork.rsaImageUrl) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>RSA / AR</title></head><body style="margin:0"><img src="${artwork.rsaImageUrl}" style="max-width:100%;height:auto;display:block"/></body></html>`);
    w.document.close();
    w.focus();
    w.onload = () => w.print();
  };

  const handlePrintOrCr = () => {
    if (!artwork.orCrImageUrl) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>OR / CR</title></head><body style="margin:0"><img src="${artwork.orCrImageUrl}" style="max-width:100%;height:auto;display:block"/></body></html>`);
    w.document.close();
    w.focus();
    w.onload = () => w.print();
  };

  const isImmutable = displayStatus === ArtworkStatus.SOLD || displayStatus === ArtworkStatus.DELIVERED;
  const canGenerateCert = (displayStatus === ArtworkStatus.SOLD || displayStatus === ArtworkStatus.DELIVERED) && sale && !sale.isCancelled;

  const handleReserve = async () => {
    if (reserveType === 'Auction') {
      if (!reserveTarget) {
        alert('Please select an auction.');
        return;
      }
      setOptimisticArtworkState({ status: ArtworkStatus.RESERVED });
      const success = await wrapAction(async () => {
        if (onAddToAuction) {
          const auction = events?.find(e => e.id === reserveTarget);
          const result = await onAddToAuction([artwork.id], reserveTarget, auction?.title || 'Auction');
          if (result === false) return false;
          if (onNavigateTo) {
            onNavigateTo('operations', 'auctions');
          }
          setModalMode('none');
          resetReserveForm();
        }
      }, 'Processing Auction Entry...', ArtworkStatus.RESERVED);
      if (!success) {
        setOptimisticArtwork(null);
        setPendingViewState(null);
      } else {
        if (artwork.status !== ArtworkStatus.RESERVED) {
          setPendingViewState({ status: ArtworkStatus.RESERVED });
        }
      }
      return;
    }

    if (!onReserve) return;

    setOptimisticArtworkState({ status: ArtworkStatus.RESERVED });
    const success = await wrapAction(async () => {
      let targetName = 'N/A';
      let eventIdForUpdate = undefined;

      if (reserveType === 'Event') {
        const evt = events?.find(e => e.id === reserveTarget);
        if (evt) {
          targetName = evt.title;
          eventIdForUpdate = evt.id;
        } else {
          targetName = reserveTarget;
        }
      } else {
        targetName = reserveTarget;
      }

      const target = targetName && targetName.trim().length > 0 ? targetName.trim() : 'N/A';
      const detailString = `Type: ${reserveType} | Target: ${target} | Notes: ${reserveNotes}`;

      let expiryDateStr: string | undefined = undefined;

      if (reserveType === 'Person') {
        const now = new Date();
        const totalMs = (reserveDays * 24 * 60 * 60 * 1000) +
          (reserveHours * 60 * 60 * 1000) +
          (reserveMinutes * 60 * 1000);
        expiryDateStr = new Date(now.getTime() + totalMs).toISOString();
      }

      const result = await onReserve(artwork.id, detailString, expiryDateStr, eventIdForUpdate, eventIdForUpdate ? targetName : undefined);
      if (result === false) return false;
      setModalMode('none');
      resetReserveForm();

      if (onReservationComplete) {
        onReservationComplete();
      }
    }, 'Securing Reservation...', ArtworkStatus.RESERVED);
    if (!success) {
      setOptimisticArtwork(null);
      setPendingViewState(null);
    } else {
      if (artwork.status !== ArtworkStatus.RESERVED) {
        setPendingViewState({ status: ArtworkStatus.RESERVED });
      }
    }
  };

  const resetReserveForm = () => {
    setReserveType('Person');
    setReserveTarget('');
    setReserveNotes('');
    setReserveDays(3);
    setReserveHours(0);
    setReserveMinutes(0);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button onClick={onBack} className="flex items-center space-x-2 text-neutral-500 hover:text-neutral-900 font-bold px-4 py-2 rounded-sm hover:bg-neutral-100 transition-all transform hover:-translate-y-0.5 w-full sm:w-auto justify-center sm:justify-start">
          <ChevronLeft size={20} />
          <span>Back to Previous Tab</span>
        </button>
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-center sm:justify-end">
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Master File ID: {artwork.id}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8 p-2 sm:p-0">
        <div className="lg:col-span-2 space-y-4 md:space-y-8">
          <div className="bg-white rounded-md border border-neutral-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
            <div className="w-full md:w-2/5 relative bg-neutral-100 min-h-[320px] md:min-h-[440px] flex items-center justify-center">
              <OptimizedImage
                src={artwork.imageUrl || undefined}
                className="w-full h-full object-contain"
                alt={artwork.title}
                fallback={
                  <div className="w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-300">
                    <div className="flex flex-col items-center gap-2">
                      <ImageIcon size={32} />
                      <span className="text-xs font-semibold uppercase tracking-widest">No Preview</span>
                    </div>
                  </div>
                }
                {...(artwork.imageUrl ? { onClick: () => setShowImagePreview(true) } : {})}
                containerClassName={artwork.imageUrl ? 'w-full h-full cursor-zoom-in' : 'w-full h-full'}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            </div>
            <div className="p-3 sm:p-5 md:p-8 flex-1 space-y-4 md:space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-neutral-900 bg-neutral-100 px-2 py-1 rounded uppercase tracking-tighter">{artwork.code}</span>
                  <StatusBadge status={displayStatus} />
                  {(displayStatus === ArtworkStatus.RESERVED && artwork.reservedForEventName) && (
                    <span className="ml-2 px-2.5 py-1 rounded-sm bg-neutral-50 border border-neutral-200 text-[10px] font-black uppercase tracking-widest text-neutral-700 hidden sm:inline-block">
                      Reserved for: {artwork.reservedForEventName}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 leading-tight">{artwork.title}</h1>
                <p className="text-base sm:text-lg text-neutral-500 font-medium">{artwork.artist}, {artwork.year}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-sm bg-neutral-50 border border-neutral-200 text-[10px] font-black uppercase tracking-widest text-neutral-700">
                    <span className="w-1.5 h-1.5 rounded-sm bg-neutral-500 mr-1.5" />
                    Added: {new Date(artwork.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-3 gap-x-4 sm:gap-x-8 text-sm pt-4 border-t border-neutral-100">
                <div><p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Medium</p><p className="text-neutral-700 font-medium break-words">{artwork.medium}</p></div>
                <div><p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Size</p><p className="text-neutral-700 font-medium break-words">{artwork.dimensions}</p></div>
                {artwork.sizeFrame && (
                  <div><p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Size with Frame</p><p className="text-neutral-700 font-medium break-words">{artwork.sizeFrame}</p></div>
                )}
                  <div>
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Valuation</p>
                    <p className="text-neutral-900 font-bold">₱{(artwork.price || 0).toLocaleString()}</p>
                    {sale?.downpayment && (
                      <div className={`mt-3 space-y-2 p-3 rounded-sm border ${
                        ((artwork.price || 0) - (sale.downpayment || 0) - (sale.installments || []).filter(i => !i.isPending).reduce((sum, inst) => sum + inst.amount, 0)) <= 0 
                        ? 'bg-emerald-50 border-emerald-100' 
                        : 'bg-red-50/50 border-red-100'
                      }`}>
                        <div className="flex justify-between items-center">
                          <p className={`text-[10px] font-black uppercase tracking-widest ${
                            ((artwork.price || 0) - (sale.downpayment || 0) - (sale.installments || []).filter(i => !i.isPending).reduce((sum, inst) => sum + inst.amount, 0)) <= 0 
                            ? 'text-emerald-600' 
                            : 'text-red-600'
                          }`}>Downpayment</p>
                          <p className={`text-sm font-black ${
                            ((artwork.price || 0) - (sale.downpayment || 0) - (sale.installments || []).filter(i => !i.isPending).reduce((sum, inst) => sum + inst.amount, 0)) <= 0 
                            ? 'text-emerald-700' 
                            : 'text-red-700'
                          }`}>₱{(sale.downpayment || 0).toLocaleString()}</p>
                        </div>
                        
                        {/* Installments History */}
                        {sale.installments && sale.installments.length > 0 && (
                          <div className={`pt-2 mt-2 border-t space-y-2 ${
                            ((artwork.price || 0) - (sale.downpayment || 0) - (sale.installments || []).filter(i => !i.isPending).reduce((sum, inst) => sum + inst.amount, 0)) <= 0 
                            ? 'border-emerald-100' 
                            : 'border-red-100'
                          }`}>
                            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Payment History</p>
                            {sale.installments.map((inst, i) => (
                              <div key={inst.id} className={`flex justify-between items-center text-[11px] p-1 rounded ${inst.isPending ? 'bg-amber-50' : ''}`}>
                                <div className="flex flex-col">
                                  <span className="text-neutral-500 font-bold">{new Date(inst.date).toLocaleDateString()}</span>
                                  {inst.isPending && <span className="text-[8px] text-amber-600 font-black uppercase">Pending Approval</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={inst.isPending ? 'text-amber-700 font-black' : 'text-neutral-900 font-black'}>₱{inst.amount.toLocaleString()}</span>
                                  {userRole === UserRole.ADMIN && inst.isPending && (
                                    <div className="flex gap-1">
                                      <button onClick={() => onApprovePaymentEdit?.(sale.id, inst.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="Approve"><Check size={12} /></button>
                                      <button onClick={() => onDeclinePaymentEdit?.(sale.id, inst.id)} className="p-1 text-rose-600 hover:bg-rose-50 rounded" title="Decline"><X size={12} /></button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className={`pt-2 mt-2 border-t ${
                          ((artwork.price || 0) - (sale.downpayment || 0) - (sale.installments || []).filter(i => !i.isPending).reduce((sum, inst) => sum + inst.amount, 0)) <= 0 
                          ? 'border-emerald-200' 
                          : 'border-red-200'
                        }`}>
                          <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                            ((artwork.price || 0) - (sale.downpayment || 0) - (sale.installments || []).filter(i => !i.isPending).reduce((sum, inst) => sum + inst.amount, 0)) <= 0 
                            ? 'text-emerald-600' 
                            : 'text-red-600'
                          }`}>Outstanding Balance</p>
                          <p className={`text-lg font-black ${
                            ((artwork.price || 0) - (sale.downpayment || 0) - (sale.installments || []).filter(i => !i.isPending).reduce((sum, inst) => sum + inst.amount, 0)) <= 0 
                            ? 'text-emerald-700' 
                            : 'text-red-700'
                          }`}>
                            ₱{(
                              (artwork.price || 0) - 
                              (sale.downpayment || 0) - 
                              (sale.installments || []).filter(i => !i.isPending).reduce((sum, inst) => sum + inst.amount, 0)
                            ).toLocaleString()}
                          </p>
                        </div>
                        
                        {(artwork.price || 0) - (sale.downpayment || 0) - (sale.installments || []).filter(i => !i.isPending).reduce((sum, inst) => sum + inst.amount, 0) <= 0 && (
                          <div className="mt-2 py-1 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest text-center rounded-sm shadow-sm">
                            Fully Paid
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                <div><p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Location</p><p className="text-neutral-700 font-medium">{displayBranch}</p></div>
              </div>

              {/* Extra Details from Import */}
              {Object.keys(artwork).filter(key => !['id', 'code', 'title', 'artist', 'medium', 'dimensions', 'sizeFrame', 'year', 'price', 'status', 'currentBranch', 'imageUrl', 'createdAt', 'updatedAt', 'deletedAt', 'importPeriod', 'reservedForEventId', 'reservedForEventName', 'reservationExpiry', 'soldAtBranch', 'sheetName', 'itemCount', 'itdrImageUrl', 'rsaImageUrl', 'orCrImageUrl', 'ROWINDEX', 'rowindex', 'rowIndex'].includes(key)).length > 0 && (
                <div className="pt-4 border-t border-neutral-100 mt-4">
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Additional Details</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                    {Object.keys(artwork)
                      .filter(key => !['id', 'code', 'title', 'artist', 'medium', 'dimensions', 'sizeFrame', 'year', 'price', 'status', 'currentBranch', 'imageUrl', 'createdAt', 'updatedAt', 'deletedAt', 'importPeriod', 'reservedForEventId', 'reservedForEventName', 'reservationExpiry', 'soldAtBranch', 'sheetName', 'itemCount', 'itdrImageUrl', 'rsaImageUrl', 'orCrImageUrl', 'ROWINDEX', 'rowindex', 'rowIndex'].includes(key))
                      .map(key => (
                        <div key={key}>
                          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">{key}</p>
                          <p className="text-neutral-700 font-medium">{String((artwork as any)[key])}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {(displayStatus === ArtworkStatus.DELIVERED || displayStatus === ArtworkStatus.CANCELLED) && (
                <div className="bg-neutral-50 border border-neutral-200 p-4 rounded-sm flex items-start space-x-3">
                  <div className="text-neutral-400"><HistoryIcon size={20} /></div>
                  <div>
                    <p className="text-xs font-bold text-neutral-700">Record Finalized</p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">This record is finalized due to its current status. Activity is restricted for audit integrity.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-md border border-neutral-200 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center space-x-3">
                <h3 className="text-xl font-bold text-neutral-900">Artwork History</h3>
                <span className="text-xs font-normal text-neutral-400">(Audit Trail)</span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                {timelineView === 'activity' && (
                  <div className="relative w-full sm:w-auto">
                    <select
                      value={activityFilter}
                      onChange={(e) => setActivityFilter(e.target.value)}
                      className="w-full sm:w-auto appearance-none bg-neutral-50 border border-neutral-200 text-neutral-600 text-[11px] font-bold uppercase tracking-widest rounded-sm px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                    >
                      <option value="All">All Activity</option>
                      <option value="Sale">Sales</option>
                      <option value="Reservation">Reservations</option>
                      <option value="Transfer">Transfers</option>
                      <option value="Edit">Edits</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                  </div>
                )}
                <div className="flex p-1 bg-neutral-100 rounded-sm w-full sm:w-auto">
                  <button
                    onClick={() => setTimelineView('activity')}
                    className={`flex-1 sm:flex-none px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-sm transition-all transform duration-200 ${timelineView === 'activity' ? 'bg-white text-neutral-900 shadow-md scale-105' : 'text-neutral-400 hover:text-neutral-600'
                      }`}
                  >
                    Activity
                  </button>
                  <button
                    onClick={() => setTimelineView('transfers')}
                    className={`flex-1 sm:flex-none px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-sm transition-all transform duration-200 ${timelineView === 'transfers' ? 'bg-white text-neutral-900 shadow-md scale-105' : 'text-neutral-400 hover:text-neutral-600'
                      }`}
                  >
                    History Transfer
                  </button>
                </div>
              </div>
            </div>
            {timelineView === 'activity' && (
              <div className="space-y-6">
                {effectiveLogs.map((log) => (
                  <div
                    key={log.id}
                    onClick={() => {
                      setSelectedLog(log);
                      setShowLogDetails(true);
                    }}
                    className="relative pl-8 pb-6 last:pb-0 border-l-2 border-neutral-100 group hover:bg-neutral-50 cursor-pointer rounded-r-md transition-all duration-200 pr-4"
                  >
                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-sm border-2 border-white shadow-sm transition-transform group-hover:scale-110 ${(log.action.includes('Sale') || log.action.includes('Sold')) ? 'bg-red-600' :
                      log.action.includes('Delivered') ? 'bg-indigo-500' :
                        log.action.includes('Transfer') ? 'bg-emerald-500' :
                          log.action.includes('Reserved') ? 'bg-amber-500' :
                            log.action.includes('Cancelled') ? 'bg-neutral-500' : 'bg-blue-500'
                      }`}></div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-sm font-bold transition-colors ${(log.action.includes('Sale') || log.action.includes('Sold')) ? 'text-red-600 group-hover:text-red-700' : 'text-neutral-900 group-hover:text-neutral-600'}`}>{log.action}</p>
                        <time className="text-[10px] text-neutral-400 font-medium">{new Date(log.timestamp).toLocaleString()}</time>
                      </div>
                      <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2">{log.details || 'System event recorded'}</p>
                      <div className="mt-2 inline-flex items-center space-x-1.5 px-2 py-0.5 bg-neutral-100 group-hover:bg-neutral-200 rounded-sm text-[10px] text-neutral-500 font-bold uppercase transition-colors">
                        <span className="w-1 h-1 bg-neutral-400 rounded-sm"></span>
                        <span>Auth: {log.user}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {timelineView === 'transfers' && (
              <div className="space-y-4">
                {transferLogs.length === 0 && (
                  <p className="text-sm text-neutral-500">No transfer history recorded for this artwork.</p>
                )}
                <div className="relative border-l border-neutral-200 ml-3 space-y-6">
                  {transferLogs.map((log) => (
                    <div
                      key={log.id}
                      onClick={() => {
                        setSelectedLog(log);
                        setShowLogDetails(true);
                      }}
                      className="relative pl-8 pb-6 last:pb-0 group hover:bg-neutral-50 cursor-pointer rounded-r-xl transition-all duration-200 pr-4"
                    >
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm transition-transform group-hover:scale-110 bg-emerald-500"></div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-bold text-neutral-900 group-hover:text-neutral-600 transition-colors">{log.details || 'Transferred'}</p>
                          <time className="text-[10px] text-neutral-400 font-medium">{new Date(log.timestamp).toLocaleString()}</time>
                        </div>
                        <p className="text-xs text-neutral-500 leading-relaxed">Authorized by {log.user}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-4 sm:p-6 rounded-md border border-neutral-200 shadow-sm sticky top-8 max-h-[calc(100vh-2rem)] overflow-y-auto custom-scrollbar">
            <h3 className="text-lg font-bold text-neutral-900 mb-6">Operations Panel</h3>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              {userPermissions?.canEditArtwork && (
                <ActionButton
                  label="Edit Artwork"
                  icon={<Edit size={20} />}
                  variant="emerald"
                  disabled={isStatusTransitioning}
                  onClick={() => setModalMode('edit')}
                />
              )}

              {userPermissions?.canTransferArtwork && (
                <ActionButton
                  label="Transfer to Branch"
                  icon={<ArrowRightLeft size={20} />}
                  disabled={isStatusTransitioning || !(displayStatus === ArtworkStatus.AVAILABLE || displayStatus === ArtworkStatus.EXCLUSIVE_VIEW_ONLY)}
                  onClick={() => setModalMode('transfer')}
                />
              )}

              {userPermissions?.canEditArtwork && (
                <>
                  {onDelete && userPermissions?.canDeleteArtwork && (
                    <ActionButton
                      label="Delete Artwork"
                      icon={<Trash2 size={20} />}
                      variant="rose"
                      disabled={isStatusTransitioning || isImmutable || displayStatus === ArtworkStatus.RESERVED}
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: 'Delete Artwork',
                          message: 'Are you sure you want to permanently delete this artwork? This action cannot be undone.',
                          variant: 'danger',
                          confirmLabel: 'Delete Permanently',
                          onConfirm: () => wrapAction(() => onDelete(artwork.id), 'Deleting Artwork...')
                        });
                      }}
                    />
                  )}
                  {onReturn && (
                    <ActionButton
                      label="Return to Artist"
                      icon={<RotateCcw size={20} />}
                      variant="slate"
                      disabled={isStatusTransitioning || isImmutable || displayStatus === ArtworkStatus.FOR_RETOUCH || displayStatus === ArtworkStatus.FOR_FRAMING || displayStatus === ArtworkStatus.RESERVED}
                      onClick={() => setModalMode('return')}
                    />
                  )}
                  {onSendToFramer && (
                    <ActionButton
                      label="Send to Framer"
                      icon={<Wrench size={20} />}
                      variant="amber"
                      disabled={isStatusTransitioning || isImmutable || displayStatus === ArtworkStatus.FOR_RETOUCH || displayStatus === ArtworkStatus.FOR_FRAMING || displayStatus === ArtworkStatus.RESERVED}
                      onClick={() => setModalMode('framer')}
                    />
                  )}
                  {displayStatus === ArtworkStatus.FOR_RETOUCH && onReturnToGallery && (
                    <ActionButton
                      label="Return to Gallery"
                      icon={<Archive size={20} />}
                      variant="emerald"
                      disabled={isStatusTransitioning}
                      onClick={() => {
                        setReturnBranch(displayBranch || branches[0]);
                        setModalMode('retouch-return');
                      }}
                    />
                  )}
                  {displayStatus === ArtworkStatus.FOR_FRAMING && onReturnFromFramer && (
                    <ActionButton
                      label="Return from Framer"
                      icon={<Archive size={20} />}
                      variant="emerald"
                      disabled={isStatusTransitioning}
                      onClick={() => {
                        setReturnBranch(displayBranch || branches[0]);
                        setModalMode('framer-return');
                      }}
                    />
                  )}
                </>
              )}

              {onAddToAuction && userPermissions?.canManageEvents && displayStatus === ArtworkStatus.AVAILABLE && (
                <ActionButton
                  label="Add to Auction"
                  icon={<Gavel size={20} />}
                  variant="indigo"
                  disabled={isStatusTransitioning || isImmutable}
                  onClick={() => setModalMode('auction')}
                />
              )}

              {userPermissions?.canReserveArtwork && (
                <ActionButton
                  label="Reserve Artwork"
                  icon={<Bookmark size={20} />}
                  variant="yellow"
                  disabled={isStatusTransitioning || displayStatus !== ArtworkStatus.AVAILABLE}
                  onClick={() => setModalMode('reserve')}
                />
              )}

              {userPermissions?.canReserveArtwork && displayStatus === ArtworkStatus.RESERVED && onCancelReservation && (
                <ActionButton
                  label="Cancel Reservation"
                  icon={<XCircle size={20} />}
                  variant="rose"
                  disabled={isStatusTransitioning}
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      title: 'Cancel Reservation',
                      message: 'Are you sure you want to cancel this reservation? The artwork will become Available.',
                      variant: 'warning',
                      confirmLabel: 'Cancel Reservation',
                      onConfirm: async () => {
                        setOptimisticArtworkState({ status: ArtworkStatus.AVAILABLE, remarks: '', reservationExpiry: undefined });
                        const success = await wrapAction(() => onCancelReservation(artwork.id), 'Cancelling Reservation...', ArtworkStatus.AVAILABLE);
                        if (!success) {
                          setOptimisticArtwork(null);
                          setPendingViewState(null);
                        } else {
                          if (artwork.status !== ArtworkStatus.AVAILABLE) {
                            setPendingViewState({ status: ArtworkStatus.AVAILABLE });
                          }
                        }
                      }
                    });
                  }}
                />
              )}

              {userPermissions?.canSellArtwork && (
                <>
                  <ActionButton
                    label="Declare Sale"
                    icon={<ShoppingCart size={20} />}
                    variant="amber"
                    disabled={isStatusTransitioning || (displayStatus !== ArtworkStatus.AVAILABLE && displayStatus !== ArtworkStatus.RESERVED)}
                    onClick={() => {
                      if (displayStatus === ArtworkStatus.RESERVED) {
                        if (artwork.remarks?.includes('Type: Person')) {
                          const targetName = artwork.remarks.split('Target:')[1]?.split('|')[0]?.trim();
                          setConfirmModal({
                            isOpen: true,
                            title: 'Sell Reserved Artwork',
                            message: `This artwork is reserved for ${targetName || 'a client'}. Are you sure you want to sell it?`,
                            variant: 'warning',
                            confirmLabel: 'Proceed with Sale',
                            onConfirm: () => setModalMode('sale')
                          });
                        } else {
                          setModalMode('sale');
                        }
                      } else {
                        setModalMode('sale');
                      }
                    }}
                  />
                  <ActionButton
                    label="Mark as Delivered"
                    icon={<Truck size={20} />}
                    variant="indigo"
                    disabled={isStatusTransitioning || displayStatus !== ArtworkStatus.SOLD}
                    onClick={() => {
                      if (!artwork.itdrImageUrl || !artwork.rsaImageUrl) {
                        setModalMode('delivery-attach');
                      } else {
                        setConfirmModal({
                          isOpen: true,
                          title: 'Confirm Delivery',
                          message: 'Mark this artwork as Delivered? This will finalize the record.',
                          variant: 'info',
                          confirmLabel: 'Mark Delivered',
                          onConfirm: () => wrapAction(() => onDeliver(artwork.id), 'Updating Status...', ArtworkStatus.DELIVERED)
                        });
                      }
                    }}
                  />
                </>
              )}

              {(displayStatus === ArtworkStatus.SOLD || displayStatus === ArtworkStatus.DELIVERED) && userPermissions?.canAttachITDR && (
                <ActionButton
                  label="Attach IT/DR/RSA/AR/OR/CR"
                  icon={<Paperclip size={20} />}
                  variant="indigo"
                  disabled={isStatusTransitioning}
                  onClick={() => {
                    setTempAttachmentUrl(Array.isArray(artwork.itdrImageUrl) ? (artwork.itdrImageUrl[0] || '') : (artwork.itdrImageUrl || ''));
                    setActiveAttachmentTab('itdr');
                    setModalMode('attach-unified');
                  }}
                />
              )}

              {displayStatus === ArtworkStatus.SOLD && userPermissions?.canSellArtwork && (
                <div className="grid grid-cols-1 gap-3">
                  {sale?.downpayment && onAddInstallment && (
                    ((artwork.price || 0) - (sale.downpayment || 0) - (sale.installments || []).filter(i => !i.isPending).reduce((sum, inst) => sum + inst.amount, 0)) > 0
                  ) && (
                    <ActionButton
                      label="Pay Installment"
                      icon={<Plus size={20} />}
                      variant="emerald"
                      disabled={isStatusTransitioning}
                      onClick={() => {
                        setInstallmentAmount('');
                        setInstallmentReference('');
                        setInstallmentProof([]);
                        setModalMode('installment');
                      }}
                    />
                  )}
                  <ActionButton
                    label="Cancel Sale Order"
                    icon={<XCircle size={20} />}
                    variant="rose"
                    disabled={isStatusTransitioning}
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: 'Cancel Sale',
                        message: 'Are you sure you want to cancel this sale? Artwork will be marked as Cancelled.',
                        variant: 'danger',
                        confirmLabel: 'Cancel Sale',
                        onConfirm: () => wrapAction(() => onCancelSale(artwork.id), 'Cancelling Sale...', ArtworkStatus.CANCELLED)
                      });
                    }}
                  />
                </div>
              )}

              {canGenerateCert && (userPermissions?.canAccessCertificate ?? true) && <ActionButton label="Generate Certificate" icon={<HistoryIcon size={20} />} variant="emerald" disabled={isStatusTransitioning} onClick={() => setModalMode('certificate')} />}

              {artwork.itdrImageUrl && (userPermissions?.canAttachITDR ?? true) && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <ActionButton label="View IT/DR" icon={<Paperclip size={20} />} variant="neutral" disabled={isStatusTransitioning} onClick={() => setShowItdrPreview(true)} />
                  <ActionButton label="Print IT/DR" icon={<Paperclip size={20} />} variant="neutral" disabled={isStatusTransitioning} onClick={handlePrintItdr} />
                </div>
              )}

              {artwork.rsaImageUrl && (userPermissions?.canAttachITDR ?? true) && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <ActionButton label="View RSA/AR" icon={<Paperclip size={20} />} variant="slate" disabled={isStatusTransitioning} onClick={() => setShowRsaPreview(true)} />
                  <ActionButton label="Print RSA/AR" icon={<Paperclip size={20} />} variant="slate" disabled={isStatusTransitioning} onClick={handlePrintRsa} />
                </div>
              )}

              {artwork.orCrImageUrl && (userPermissions?.canAttachITDR ?? true) && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <ActionButton label="View OR/CR" icon={<Paperclip size={20} />} variant="neutral" disabled={isStatusTransitioning} onClick={() => setShowOrCrPreview(true)} />
                  <ActionButton label="Print OR/CR" icon={<Paperclip size={20} />} variant="neutral" disabled={isStatusTransitioning} onClick={handlePrintOrCr} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {modalMode === 'installment' && sale && (
        <Modal onClose={() => setModalMode('none')} title="Record Installment Payment">
          <div className="space-y-6">
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-sm">
              <div className="flex justify-between items-center mb-1">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Price</p>
                <p className="text-sm font-black text-emerald-700">₱{(artwork.price || 0).toLocaleString()}</p>
              </div>
              <div className="flex justify-between items-center mb-1">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Paid to Date</p>
                <p className="text-sm font-black text-emerald-700">₱{(
                  (sale.downpayment || 0) + 
                  (sale.installments || []).filter(i => !i.isPending).reduce((sum, inst) => sum + inst.amount, 0)
                ).toLocaleString()}</p>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-emerald-200">
                <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Outstanding Balance</p>
                <p className="text-lg font-black text-emerald-900">₱{(
                  (artwork.price || 0) - 
                  (sale.downpayment || 0) - 
                  (sale.installments || []).filter(i => !i.isPending).reduce((sum, inst) => sum + inst.amount, 0)
                ).toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Payment Amount <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">₱</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0.00"
                    required
                    className="w-full pl-8 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm font-black text-neutral-900"
                    value={installmentAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      const parts = val.split('.');
                      if (parts.length > 2) parts.splice(2);
                      setInstallmentAmount(parts.join('.'));
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Payment Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    required
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm font-bold text-neutral-900"
                    value={installmentDate}
                    onChange={(e) => setInstallmentDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Reference No.</label>
                  <input
                    type="text"
                    placeholder="OR# / Reference#"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm font-bold text-neutral-900"
                    value={installmentReference}
                    onChange={(e) => setInstallmentReference(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Proof of Payment <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-3">
                  {installmentProof.map((url, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-sm overflow-hidden border border-neutral-200 shadow-sm bg-white">
                      <img src={url} className="w-full h-full object-cover" alt="Proof" />
                      <button onClick={() => setInstallmentProof(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={10} /></button>
                    </div>
                  ))}
                  <label className="relative flex flex-col items-center justify-center aspect-square bg-neutral-50 border border-dashed border-neutral-200 rounded-sm cursor-pointer hover:bg-neutral-100 transition-all group">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length === 0) return;
                        const compressed = await Promise.all(files.map(f => compressImage(f, 800, 800, 0.6)));
                        setInstallmentProof(prev => [...prev, ...compressed]);
                        e.target.value = '';
                      }}
                    />
                    <Plus size={16} className="text-neutral-300 group-hover:text-neutral-500" />
                    <span className="text-[10px] font-bold text-neutral-400">Add Proof</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-100">
              <button onClick={() => setModalMode('none')} className="px-6 py-2.5 rounded-sm text-neutral-500 font-bold text-sm hover:bg-neutral-50">Cancel</button>
              <button
                disabled={!installmentAmount || parseFloat(installmentAmount) <= 0 || installmentProof.length === 0}
                onClick={() => {
                  const amt = parseFloat(installmentAmount);
                  if (onAddInstallment) {
                    wrapAction(async () => {
                      await onAddInstallment(sale.id, amt, installmentDate, installmentReference, installmentProof[0]);
                      setModalMode('none');
                    }, 'Recording Payment...');
                  }
                }}
                className="px-8 py-2.5 bg-neutral-900 text-white rounded-sm font-black text-sm shadow-lg shadow-neutral-200 disabled:opacity-50"
              >
                Record Payment
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modalMode === 'sale' && (
        <Modal onClose={() => setModalMode('none')} title="Sales Declaration Entry">
          <div className="space-y-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Client Name <span className="text-red-500">*</span></label>
              <input type="text" placeholder="Full Client Name" required className="w-full px-5 py-3 bg-neutral-50 border-0 rounded-sm text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20" value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Contact Number <span className="text-red-500">*</span></label>
              <input type="text" placeholder="+63 912 345 6789" required className="w-full px-5 py-3 bg-neutral-50 border-0 rounded-sm text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20" value={clientContact} onChange={(e) => setClientContact(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Downpayment (Optional)</label>
              <input 
                type="text" 
                inputMode="numeric"
                placeholder="0.00" 
                className="w-full px-5 py-3 bg-neutral-50 border-0 rounded-sm text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20" 
                value={saleDownpayment} 
                onChange={(e) => setSaleDownpayment(e.target.value.replace(/[^0-9.]/g, ''))}
              />
            </div>
            <div className="space-y-4 pt-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">RSA / AR <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-4">
                {saleRsa.map((imgUrl, index) => (
                  <div key={index} className="relative group rounded-md overflow-hidden shadow-md h-32">
                    <img src={imgUrl} className="w-full h-full object-cover" alt="Attachment" />
                    <button onClick={() => setSaleRsa(prev => prev.filter((_, i) => i !== index))} className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                  </div>
                ))}
                <label className="flex flex-col items-center justify-center w-full h-32 bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-md cursor-pointer hover:bg-white transition-all group">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const compressed = await compressImage(file, 1000, 1000, 0.7);
                      setSaleRsa(prev => [...prev, compressed]);
                      e.target.value = '';
                    }}
                  />
                  <Upload size={20} className="text-neutral-400 group-hover:text-neutral-700" />
                  <span className="text-[10px] font-bold text-neutral-500 group-hover:text-neutral-900">Add Attachment</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-100">
              <button onClick={() => setModalMode('none')} className="px-6 py-2.5 rounded-md text-neutral-600 font-bold hover:bg-neutral-100">Cancel</button>
              <button
                onClick={() => {
                  if (clientName && clientContact && saleRsa.length > 0) wrapAction(async () => {
                    await onSell(artwork.id, clientName, clientEmail, clientContact, parseFloat(saleDownpayment) || 0, saleEventId, saleDelivered, { rsaUrl: saleRsa });
                    setModalMode('none');
                    resetSaleForm();
                  }, 'Finalizing Sale Declaration...', ArtworkStatus.SOLD);
                }}
                disabled={!clientName || !clientContact || saleRsa.length === 0}
                className="px-8 py-2.5 bg-neutral-900 text-white rounded-md font-bold shadow-lg disabled:opacity-50"
              >
                Confirm Sale
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showLogDetails && selectedLog && (
        <Modal onClose={() => setShowLogDetails(false)} title="Activity Log Details">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Action</p><p className="text-sm font-bold text-neutral-900">{selectedLog.action}</p></div>
              <div><p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">User</p><p className="text-sm font-bold text-neutral-900">{selectedLog.user}</p></div>
              <div className="col-span-2"><p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Timestamp</p><p className="text-sm font-bold text-neutral-900">{new Date(selectedLog.timestamp).toLocaleString()}</p></div>
            </div>
            <div><p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Details</p><p className="text-sm text-neutral-600 leading-relaxed bg-neutral-50 p-4 rounded-sm border border-neutral-100">{selectedLog.details}</p></div>
            <div className="flex justify-end pt-4 border-t border-neutral-100"><button onClick={() => setShowLogDetails(false)} className="px-6 py-2.5 rounded-sm bg-neutral-100 text-neutral-600 font-bold hover:bg-neutral-200 transition-colors">Close</button></div>
          </div>
        </Modal>
      )}

      {confirmModal.isOpen && (
        <Modal onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} title={confirmModal.title} maxWidth="max-w-md">
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className={`p-2 rounded-full ${confirmModal.variant === 'danger' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}><AlertTriangle size={24} /></div>
              <p className="text-sm text-neutral-600 leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-100">
              <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="px-6 py-2.5 rounded-sm text-neutral-600 font-bold hover:bg-neutral-100 transition-colors">Cancel</button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }}
                className={`px-8 py-2.5 text-white rounded-sm font-bold shadow-lg transform hover:-translate-y-0.5 transition-all ${confirmModal.variant === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-100' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-100'}`}
              >
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// Helper Components
const StatusBadge = ({ status }: { status: ArtworkStatus }) => {
  const config = {
    [ArtworkStatus.AVAILABLE]: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-100', dot: 'bg-emerald-500' },
    [ArtworkStatus.SOLD]: { bg: 'bg-amber-50 text-amber-700 border-amber-100', dot: 'bg-amber-500' },
    [ArtworkStatus.DELIVERED]: { bg: 'bg-indigo-50 text-indigo-700 border-indigo-100', dot: 'bg-indigo-500' },
    [ArtworkStatus.RESERVED]: { bg: 'bg-yellow-50 text-yellow-700 border-yellow-100', dot: 'bg-yellow-500' },
    [ArtworkStatus.RETURNED]: { bg: 'bg-red-50 text-red-700 border-red-100', dot: 'bg-red-500' },
    [ArtworkStatus.CANCELLED]: { bg: 'bg-neutral-50 text-neutral-700 border-neutral-100', dot: 'bg-neutral-500' },
    [ArtworkStatus.FOR_RETOUCH]: { bg: 'bg-blue-50 text-blue-700 border-blue-100', dot: 'bg-blue-500' },
    [ArtworkStatus.FOR_FRAMING]: { bg: 'bg-orange-50 text-orange-700 border-orange-100', dot: 'bg-orange-500' },
    [ArtworkStatus.EXCLUSIVE_VIEW_ONLY]: { bg: 'bg-purple-50 text-purple-700 border-purple-100', dot: 'bg-purple-500' }
  }[status] || { bg: 'bg-neutral-50 text-neutral-700 border-neutral-100', dot: 'bg-neutral-500' };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-sm border text-[10px] font-black uppercase tracking-widest ${config.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-sm mr-1.5 ${config.dot}`} />
      {status}
    </span>
  );
};

const ActionButton = ({ label, icon, onClick, variant = 'neutral', disabled = false }: any) => {
  const variants = {
    neutral: 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-900 hover:bg-neutral-900 hover:text-white',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-600 hover:text-white hover:border-emerald-600',
    rose: 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-600 hover:text-white hover:border-rose-600',
    amber: 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-600 hover:text-white hover:border-amber-600',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-600 hover:text-white hover:border-indigo-600',
    slate: 'bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-800 hover:text-white hover:border-slate-800',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100 hover:bg-yellow-600 hover:text-white hover:border-yellow-600'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center space-x-3 px-4 py-3 rounded-md border text-sm font-bold transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${variants[variant as keyof typeof variants]}`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
};

export default MasterView;
