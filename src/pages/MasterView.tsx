
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
  ReturnRecord,
  TransferRequest
} from '../types';
import { ICONS } from '../constants';
import CertificateModal from '../components/CertificateModal';
import { ActionResultModal } from '../components/modals/ActionResultModal';
import { XCircle, CheckCircle, Bookmark, Edit, Paperclip, ChevronDown, Trash2, RotateCcw, AlertTriangle, AlertCircle, Upload, Tag, Archive, Wrench, Gavel, FileSpreadsheet, Download, FileText, Package, Image as ImageIcon, Clock, Calendar, Home, ArrowRight, Plus, Shield } from 'lucide-react';
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
  userBranch?: string;
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
    downpayment?: number,
    isDownpayment?: boolean
  ) => void;
  onCancelSale: (id: string) => void;
  onDeliver: (id: string, itdr?: string | string[], rsa?: string | string[], orcr?: string | string[]) => void;
  onEdit: (updates: Partial<Artwork>) => void;
  onBack: () => void;
  // Note: We'd ideally pass events here for the dropdown, assuming it's managed in App state
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
  onAddInstallment?: (saleId: string, amount: number, date: string, reference?: string, attachments?: string[]) => void;
  onEditPayment?: (saleId: string, paymentId: string, updates: { amount: number; date?: string; reference?: string; attachmentUrls?: string[] }) => void;
  onApprovePaymentEdit?: (saleId: string, paymentId: string) => void;
  onDeclinePaymentEdit?: (saleId: string, paymentId: string) => void;
  transferRequests?: TransferRequest[];
  onAcceptTransfer?: (request: TransferRequest) => void;
  onDeclineTransfer?: (request: TransferRequest) => void;
  onHoldTransfer?: (request: TransferRequest) => void;
}

const MasterView: React.FC<MasterViewProps> = ({
  artwork, branches, logs, sale, userRole, userBranch, userPermissions, onTransfer, onSale, onCancelSale, onDeliver, onReturn, onReturnToGallery, onSendToFramer, onReturnFromFramer, onEdit, onBack, events = [], onReserve, onReservationComplete, onCancelReservation, onDelete, onAddToAuction, onNavigateTo,
  framerRecords = [], returnRecords = [], onAddInstallment, onEditPayment, onApprovePaymentEdit, onDeclinePaymentEdit,
  transferRequests = [], onAcceptTransfer, onDeclineTransfer, onHoldTransfer
}) => {
  const pendingTransferRequest = useMemo(() => {
    return transferRequests.find(r => String(r.artworkId) === String(artwork.id) && r.status === 'Pending');
  }, [transferRequests, artwork.id]);

  const canApproveTransfer = useMemo(() => {
    if (!pendingTransferRequest) return false;
    if (userRole === UserRole.ADMIN) return true;
    return userBranch === pendingTransferRequest.toBranch;
  }, [pendingTransferRequest, userRole, userBranch]);
  const [modalMode, setModalMode] = useState<'transfer' | 'sale' | 'reserve' | 'certificate' | 'edit' | 'attach-unified' | 'return' | 'framer' | 'framer-return' | 'retouch-return' | 'auction' | 'delivery-attach' | 'none' | 'installment' | 'edit-payment'>('none');
  const [editingPayment, setEditingPayment] = useState<{ id: string; amount: string; date: string; reference: string; type: 'downpayment' | 'installment' } | null>(null);
  const [optimisticArtwork, setOptimisticArtwork] = useState<Artwork | null>(null);
  const [pendingViewState, setPendingViewState] = useState<{ status?: ArtworkStatus; currentBranch?: string } | null>(null);

  const canView = useMemo(() => {
    // View Control Permissions
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
  const [isDownpayment, setIsDownpayment] = useState(false);
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
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 16)); // Used as fallback, UI will hide it
  const [returnStrategy, setReturnStrategy] = useState<'original' | 'manual'>('original');
  const [isTransferringFromReturn, setIsTransferringFromReturn] = useState(false);
  const [returnItdrUrl, setReturnItdrUrl] = useState<string[]>([]);

  // Installment States
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [installmentDate, setInstallmentDate] = useState(new Date().toISOString().slice(0, 10));
  const [installmentReference, setInstallmentReference] = useState('');
  const [installmentAttachments, setInstallmentAttachments] = useState<string[]>([]);

  // Reservation States
  const [reserveType, setReserveType] = useState<'Person' | 'Event' | 'Auction'>('Person');
  const [reserveTarget, setReserveTarget] = useState('');
  const [reserveNotes, setReserveNotes] = useState('');
  const [reserveDays, setReserveDays] = useState(3);
  const [reserveHours, setReserveHours] = useState(0);
  const [reserveMinutes, setReserveMinutes] = useState(0);

  // Auction Selection State
  const [selectedAuctionId, setSelectedAuctionId] = useState('');
  const [selectedAuctionName, setSelectedAuctionName] = useState('');

  // Edit Form State
  const [editForm, setEditForm] = useState<Partial<Artwork>>(artwork);
  useEffect(() => {
    setEditForm(artwork);
  }, [artwork]);

  // History Interaction State
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


  // Reset function
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
  const [tempAttachmentUrl, setTempAttachmentUrl] = useState<string>(''); // For other attachments (legacy)

  // Dedicated states for Manage Attachments modal to prevent state overwriting
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

  // Initialize specific modal states when they open
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
      // Default return branch to original branch if available
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
  }, [modalMode]); // Only re-run when modal state changes, NOT when artwork updates in background

  // Pre-fill sale form if artwork is reserved
  // Use a ref to track if the modal just opened to prevent background updates from resetting user input
  const prevSaleModalMode = useRef('none');
  useEffect(() => {
    if (modalMode === 'sale' && prevSaleModalMode.current !== 'sale' && displayStatus === ArtworkStatus.RESERVED) {
      // Check for Person Reservation
      if (artwork.remarks?.includes('Type: Person')) {
        const targetName = artwork.remarks.split('Target:')[1]?.split('|')[0]?.trim();
        if (targetName) setClientName(targetName);
      }
      // Check for Event Reservation
      else if (artwork.remarks?.includes('Type: Event')) {
        const targetName = artwork.remarks.split('Target:')[1]?.split('|')[0]?.trim();
        const event = events.find(e => e.title === targetName);
        if (event) setSaleEventId(event.id);
      }
      // Check for Auction Reservation
      else if (artwork.remarks?.includes('Type: Auction')) {
        const targetName = artwork.remarks.split('Target:')[1]?.split('|')[0]?.trim();
        const event = events.find(e => e.title === targetName);
        if (event) setSaleEventId(event.id);
      }
    }
    prevSaleModalMode.current = modalMode;
  }, [modalMode, displayStatus, artwork.remarks, events]);

  // Sync local form state with prop updates ONLY when not currently editing
  // This ensures the main view stays updated while modals preserve work-in-progress
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
  const formatImportPeriod = (p?: string) => {
    if (!p) return '';
    const parts = p.split('-');
    if (parts.length < 2) return p || '';
    const y = parts[0];
    const m = Math.max(1, Math.min(12, parseInt(parts[1], 10)));
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[m - 1]} ${y}`;
  };

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
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
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
                <div><p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Location</p><p className="text-neutral-700 font-medium">{displayBranch}</p></div>

                {/* Financial Section */}
                <div className="col-span-2 pt-6 mt-2 border-t border-neutral-100 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Base Valuation</p>
                      <p className="text-2xl font-black text-neutral-900 leading-none">₱{(artwork.price || 0).toLocaleString()}</p>
                    </div>
                    {(() => {
                      const balance = (artwork.price || 0) -
                        (sale?.downpayment || 0) -
                        (sale?.installments || []).filter(i => !i.isPending).reduce((sum, inst) => sum + inst.amount, 0);
                       
                       const isFullyPaid = balance <= 0 && !!sale;
                       const showBalance = sale && !sale.isCancelled && (sale.isDownpayment || sale.status === 'Approved');

                       if (!sale || sale.isCancelled || displayStatus === ArtworkStatus.AVAILABLE || !showBalance) return null;

                      return (
                        <div className={`px-4 py-3 rounded-xl border ${isFullyPaid ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'} flex flex-col items-end shrink-0`}>
                          <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isFullyPaid ? 'text-emerald-600' : 'text-red-600'}`}>
                            {isFullyPaid ? 'Status: Fully Paid' : 'Outstanding Balance'}
                          </p>
                          <p className={`text-xl font-black leading-none ${isFullyPaid ? 'text-emerald-700' : 'text-red-700'}`}>
                            ₱{balance.toLocaleString()}
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  {sale?.downpayment && !sale.isCancelled && displayStatus !== ArtworkStatus.AVAILABLE && (
                    <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
                      <div className="p-4 bg-neutral-50/50 border-b border-neutral-100 flex items-center justify-between">
                        <h4 className="text-xs font-black text-neutral-900 uppercase tracking-widest">Payment Ledger</h4>
                        <span className="text-[10px] font-bold text-neutral-400">{sale.installments?.length || 0} Installments recorded</span>
                      </div>
                      
                      <div className="divide-y divide-neutral-50">
                        {/* Downpayment Row */}
                        <div className="p-4 flex items-center justify-between group/dp hover:bg-neutral-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                              <Tag size={16} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Initial Downpayment</p>
                              <p className="text-xs font-bold text-neutral-400">{new Date(sale.saleDate).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-base font-black text-neutral-900">₱{(sale.downpayment || 0).toLocaleString()}</p>
                              {sale.pendingDownpaymentEdit && (
                                <span className="text-[9px] text-orange-500 font-black uppercase">Approval Pending</span>
                              )}
                            </div>
                            {onEditPayment && (
                              <button
                                onClick={() => {
                                  setEditingPayment({
                                    id: 'downpayment',
                                    amount: (sale.downpayment || 0).toString(),
                                    date: sale.saleDate,
                                    reference: 'Downpayment',
                                    type: 'downpayment'
                                  });
                                  setModalMode('edit-payment');
                                }}
                                className="p-2 hover:bg-neutral-200 rounded-lg text-neutral-400 hover:text-neutral-900 transition-all opacity-0 group-hover/dp:opacity-100"
                              >
                                <Edit size={14} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Downpayment Admin Actions */}
                        {userRole === UserRole.ADMIN && sale.pendingDownpaymentEdit && (
                          <div className="bg-orange-50/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <AlertCircle size={16} className="text-orange-500" />
                              <div>
                                <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest leading-none mb-1">Proposed Edit</p>
                                <p className="text-sm font-black text-orange-900 leading-none">₱{sale.pendingDownpaymentEdit.amount.toLocaleString()}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => onApprovePaymentEdit?.(sale.id, 'downpayment')} className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm">Approve</button>
                              <button onClick={() => onDeclinePaymentEdit?.(sale.id, 'downpayment')} className="flex-1 sm:flex-none px-4 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-100 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">Decline</button>
                            </div>
                          </div>
                        )}

                        {/* Installments List */}
                        {sale.installments?.map((inst) => (
                          <React.Fragment key={inst.id}>
                            <div className={`p-4 flex items-center justify-between group/inst hover:bg-neutral-50 transition-colors ${inst.isPending ? 'bg-red-50/30' : ''}`}>
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${inst.isPending ? 'bg-red-100 text-red-600' : 'bg-neutral-100 text-neutral-500'}`}>
                                  <Calendar size={16} />
                                </div>
                                <div>
                                  <p className={`text-[10px] font-black uppercase tracking-widest ${inst.isPending ? 'text-red-600' : 'text-neutral-500'}`}>
                                    {inst.isPending ? 'Pending Installment' : 'Payment Received'}
                                  </p>
                                  <p className="text-xs font-bold text-neutral-400">{new Date(inst.date).toLocaleDateString()}</p>
                                  {inst.attachmentUrls && inst.attachmentUrls.length > 0 && (
                                    <div className="flex gap-1.5 mt-2">
                                      {inst.attachmentUrls.map((url, i) => (
                                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-md border border-neutral-200 overflow-hidden hover:scale-110 transition-transform bg-white shadow-sm shrink-0">
                                          <img src={url} className="w-full h-full object-cover" alt="" />
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className={`text-base font-black ${inst.isPending ? 'text-indigo-700' : 'text-neutral-900'}`}>
                                    ₱{inst.amount.toLocaleString()}
                                  </p>
                                  {inst.pendingEdit && (
                                    <span className="text-[9px] text-orange-500 font-black uppercase">Edit Pending</span>
                                  )}
                                </div>
                                {onEditPayment && !inst.isPending && (
                                  <button
                                    onClick={() => {
                                      setEditingPayment({
                                        id: inst.id,
                                        amount: inst.amount.toString(),
                                        date: inst.date.split('T')[0],
                                        reference: inst.reference || '',
                                        type: 'installment'
                                      });
                                      setModalMode('edit-payment');
                                    }}
                                    className="p-2 hover:bg-neutral-200 rounded-lg text-neutral-400 hover:text-neutral-900 transition-all opacity-0 group-hover/inst:opacity-100"
                                  >
                                    <Edit size={14} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Approval Alert */}
                            {inst.isPending && (
                              <div className="bg-indigo-50 p-4 border-l-4 border-indigo-500 flex items-center gap-4">
                                <Shield size={20} className="text-indigo-500 shrink-0" />
                                <div>
                                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Administrative Approval Required</p>
                                  <p className="text-xs font-bold text-indigo-800 leading-tight">
                                    Payment of ₱{inst.amount.toLocaleString()} has been recorded and is currently awaiting admin confirmation.
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Installment Admin Actions */}
                             {userRole === UserRole.ADMIN && (inst.pendingEdit || inst.isPending) && (() => {
                               const approvedTotal = (sale?.downpayment || 0) + 
                                 (sale?.installments || []).filter(i => !i.isPending).reduce((sum, i) => sum + i.amount, 0);
                               const isOver = inst.isPending && (approvedTotal + inst.amount) > (artwork.price || 0) + 0.01;
                               const theme = isOver ? { bg: 'bg-red-50/50', border: 'border-red-100', text: 'text-red-600', accent: 'bg-red-100 text-red-600', darkText: 'text-red-900' } 
                                            : inst.isPending ? { bg: 'bg-indigo-50/50', border: 'border-indigo-100', text: 'text-indigo-600', accent: 'bg-indigo-100 text-indigo-600', darkText: 'text-indigo-900' }
                                            : { bg: 'bg-orange-50/50', border: 'border-orange-100', text: 'text-orange-600', accent: 'bg-orange-100 text-orange-600', darkText: 'text-orange-900' };

                               return (
                                 <div className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t ${theme.bg} ${theme.border}`}>
                                   <div className="flex items-center gap-3">
                                     <div className={`p-2 rounded-lg ${theme.accent}`}>
                                       {inst.isPending ? <Shield size={16} /> : <Edit size={16} />}
                                     </div>
                                     <div>
                                       <p className={`text-[10px] font-black uppercase tracking-widest leading-none mb-1 ${theme.text}`}>
                                         {isOver ? 'Overpayment Detected' : inst.isPending ? 'Approval Required' : 'Proposed Modification'}
                                       </p>
                                       <p className={`text-base font-black leading-none ${theme.darkText}`}>
                                         ₱{(inst.pendingEdit?.amount || inst.amount).toLocaleString()}
                                       </p>
                                     </div>
                                   </div>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => onApprovePaymentEdit?.(sale.id, inst.id)} 
                                    className={`flex-1 sm:flex-none px-6 py-2.5 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm ${inst.isPending ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                                  >
                                    {(() => {
                                      if (!inst.isPending) return 'Approve Edit';
                                      const approvedTotal = (sale?.downpayment || 0) + 
                                        (sale?.installments || []).filter(i => !i.isPending).reduce((sum, i) => sum + i.amount, 0);
                                      const totalIncludingThis = approvedTotal + inst.amount;
                                      const isOver = totalIncludingThis > (artwork.price || 0) + 0.01;
                                      return isOver ? 'Approve Overpayment' : 'Approve Payment';
                                    })()}
                                  </button>
                                  <button onClick={() => onDeclinePaymentEdit?.(sale.id, inst.id)} className="flex-1 sm:flex-none px-6 py-2.5 bg-white hover:bg-neutral-50 text-neutral-600 border border-neutral-200 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">
                                    Decline
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                          </React.Fragment>
                        ))}
                      </div>

                      {/* Footer Message */}
                      {sale.installments?.length === 0 && !sale.pendingDownpaymentEdit && (
                        <div className="p-8 text-center bg-neutral-50/50">
                          <p className="text-xs font-bold text-neutral-400 italic">No additional installments recorded for this sale.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
                  <div className="text-neutral-400">{ICONS.Shield}</div>
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
                      <option value="Payment">Payments</option>
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
                  {sale && (
                    <button
                      onClick={() => setTimelineView('payments')}
                      className={`flex-1 sm:flex-none px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-sm transition-all transform duration-200 ${timelineView === 'payments' ? 'bg-white text-neutral-900 shadow-md scale-105' : 'text-neutral-400 hover:text-neutral-600'
                        }`}
                    >
                      Payments
                    </button>
                  )}
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
                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-sm border-2 border-white shadow-sm transition-transform group-hover:scale-110 ${
                      (log.action.includes('Sale') || log.action.includes('Sold') || log.action.includes('Declined')) ? 'bg-red-600' :
                      (log.action.includes('Delivered') || log.action.includes('Accepted') || log.action.includes('Approved')) ? 'bg-emerald-500' :
                      log.action.includes('Transfer') ? 'bg-indigo-500' :
                      log.action.includes('Reserved') ? 'bg-amber-500' :
                      log.action.includes('Submitted') ? 'bg-amber-400' :
                      log.action.includes('Cancelled') ? 'bg-neutral-500' : 'bg-blue-500'
                    }`}></div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-sm font-bold transition-colors ${
                          (log.action.includes('Sale') || log.action.includes('Sold') || log.action.includes('Declined')) ? 'text-red-600 group-hover:text-red-700' : 
                          (log.action.includes('Delivered') || log.action.includes('Accepted') || log.action.includes('Approved')) ? 'text-emerald-600 group-hover:text-emerald-700' :
                          log.action.includes('Submitted') ? 'text-amber-600 group-hover:text-amber-700' :
                          'text-neutral-900 group-hover:text-neutral-600'
                        }`}>{log.action}</p>
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
            {timelineView === 'payments' && sale && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Paid</p>
                    <p className="text-xl font-black text-emerald-700">
                      ₱{((sale.downpayment || 0) + (sale.installments || []).filter(i => !i.isPending).reduce((sum, i) => sum + i.amount, 0)).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Remaining Balance</p>
                    <p className="text-xl font-black text-indigo-700">
                      ₱{Math.max(0, (artwork.price || 0) - (sale.downpayment || 0) - (sale.installments || []).filter(i => !i.isPending).reduce((sum, i) => sum + i.amount, 0)).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50/50 border-b border-neutral-100">
                        <th className="px-4 py-2 text-[8px] font-black text-neutral-400 uppercase tracking-widest">Date</th>
                        <th className="px-4 py-2 text-[8px] font-black text-neutral-400 uppercase tracking-widest">Type</th>
                        <th className="px-4 py-2 text-[8px] font-black text-neutral-400 uppercase tracking-widest text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                      <tr className="hover:bg-neutral-50/30 transition-colors">
                        <td className="px-4 py-3 text-[11px] font-bold text-neutral-600">{new Date(sale.saleDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[8px] font-black uppercase tracking-tight">Downpayment</span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-black text-neutral-900">₱{sale.downpayment?.toLocaleString()}</td>
                      </tr>
                      {(sale.installments || []).filter(i => !i.isPending).sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()).map((inst) => (
                        <tr key={inst.id} className="hover:bg-neutral-50/30 transition-colors">
                          <td className="px-4 py-3 text-[11px] font-bold text-neutral-600">{new Date(inst.createdAt || '').toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase tracking-tight">Installment</span>
                          </td>
                          <td className="px-4 py-3 text-right text-xs font-black text-neutral-900">₱{inst.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-4 sm:p-6 rounded-md border border-neutral-200 shadow-sm sticky top-8 max-h-[calc(100vh-2rem)] overflow-y-auto custom-scrollbar">
            <h3 className="text-lg font-bold text-neutral-900 mb-6">Operations Panel</h3>

            {/* Pending Transfer Approval */}
            {canApproveTransfer && pendingTransferRequest && (
              <div className="mb-6 bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2 text-indigo-600">
                  <Shield size={18} />
                  <h4 className="text-[10px] font-black uppercase tracking-widest">Transfer Approval Required</h4>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-tight">Request Details</p>
                    <p className="text-xs font-medium text-indigo-900 leading-tight">
                      Request to transfer to <span className="font-black underline">{pendingTransferRequest.toBranch}</span> by {pendingTransferRequest.requestedBy}.
                    </p>
                  </div>
                  
                  {pendingTransferRequest.notes && (
                    <div className="bg-white/50 p-2 rounded-lg border border-indigo-100/50">
                       <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Notes</p>
                       <p className="text-xs italic text-indigo-800 leading-relaxed font-medium">"{pendingTransferRequest.notes}"</p>
                    </div>
                  )}
                  
                  {pendingTransferRequest.itdrUrl && (
                    <div className="space-y-2">
                       <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Verification Documents</p>
                       <div className="flex flex-wrap gap-2">
                        {(Array.isArray(pendingTransferRequest.itdrUrl) ? pendingTransferRequest.itdrUrl : [pendingTransferRequest.itdrUrl]).map((url, i) => (
                          <a 
                            key={i} 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-indigo-200 rounded-md text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition-all shadow-sm"
                          >
                             <Paperclip size={12} className="text-indigo-400" /> 
                             IT/DR {Array.isArray(pendingTransferRequest.itdrUrl) && pendingTransferRequest.itdrUrl.length > 1 ? i + 1 : ''}
                          </a>
                        ))}
                       </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => wrapAction(() => onAcceptTransfer?.(pendingTransferRequest), 'Accepting Transfer...')}
                    className="flex-1 py-2 bg-[#0f172a] text-white text-[10px] font-black uppercase tracking-widest rounded-sm transition-all shadow-[0_4px_12px_rgba(15,23,42,0.15)] active:scale-95 flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={12} />
                    Accept
                  </button>
                  <button
                    onClick={() => wrapAction(() => onHoldTransfer?.(pendingTransferRequest), 'Holding Transfer...')}
                    className="flex-1 py-2 bg-neutral-100 text-neutral-600 border border-neutral-200 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Clock size={12} />
                    Hold
                  </button>
                  <button
                    onClick={() => wrapAction(() => onDeclineTransfer?.(pendingTransferRequest), 'Declining Transfer...')}
                    className="flex-1 py-2 bg-white text-red-600 border border-red-100 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all hover:bg-red-50 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <XCircle size={12} />
                    Decline
                  </button>
                </div>
              </div>
            )}

            {/* Declined Sale Notice */}
            {sale?.status === 'Declined' && sale.requestedAttachments && sale.requestedAttachments.length > 0 && (
              <div className="mb-6 bg-red-50 border border-red-100 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle size={18} />
                  <h4 className="text-[10px] font-black uppercase tracking-widest">Re-upload Required</h4>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-tight">Admin Feedback</p>
                  <p className="text-xs font-medium text-red-700 italic bg-white/50 p-2 rounded-lg border border-red-100/50">
                    "{sale.declineReason || 'Attachments need correction.'}"
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sale.requestedAttachments.map(f => (
                    <span key={f} className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-[9px] font-black uppercase flex items-center gap-1">
                      <RotateCcw size={10} />
                      {f === 'itdr' ? 'IT/DR' : f === 'rsa' ? 'RSA/AR' : 'OR/CR'}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setTempItdr(parseAttachmentString(artwork.itdrImageUrl));
                    setTempRsa(parseAttachmentString(artwork.rsaImageUrl));
                    setTempOrcr(parseAttachmentString(artwork.orCrImageUrl));
                    setModalMode('attach-unified');
                  }}
                  className="w-full py-2 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                >
                  <Upload size={12} />
                  Resubmit Attachments
                </button>
              </div>
            )}

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
                  icon={ICONS.Transfers}
                  disabled={isStatusTransitioning || !!pendingTransferRequest || !(displayStatus === ArtworkStatus.AVAILABLE || displayStatus === ArtworkStatus.EXCLUSIVE_VIEW_ONLY)}
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
                          // Only set pending view state if the prop hasn't caught up yet
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
                    icon={ICONS.Sales}
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
                          // For Event/Auction, proceed directly to sale modal (it will auto-fill via useEffect)
                          setModalMode('sale');
                        }
                      } else {
                        setModalMode('sale');
                      }
                    }}
                  />
                  <ActionButton
                    label="Mark as Delivered"
                    icon={ICONS.Deliver}
                    variant="indigo"
                    disabled={isStatusTransitioning || displayStatus !== ArtworkStatus.SOLD}
                    onClick={() => {
                      // Check if mandatory attachments exist
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
                  {sale?.downpayment && !sale.isCancelled && onAddInstallment && (
                    ((artwork.price || 0) - (sale.downpayment || 0) - (sale.installments || []).reduce((sum, inst) => sum + inst.amount, 0)) > 0
                  ) && (
                      <ActionButton
                        label="Pay Installment"
                        icon={ICONS.Sales}
                        variant="emerald"
                        disabled={isStatusTransitioning}
                        onClick={() => {
                          setInstallmentAmount('');
                          setInstallmentReference('');
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
                        message: 'Are you sure you want to cancel this sale? Artwork will be marked as Available.',
                        variant: 'danger',
                        confirmLabel: 'Cancel Sale',
                        onConfirm: () => wrapAction(() => onCancelSale(artwork.id), 'Cancelling Sale...', ArtworkStatus.AVAILABLE)
                      });
                    }}
                  />
                </div>
              )}

              {canGenerateCert && (userPermissions?.canAccessCertificate ?? true) && <ActionButton label="Generate Certificate" icon={ICONS.History} variant="emerald" disabled={isStatusTransitioning} onClick={() => setModalMode('certificate')} />}

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

      {/* Modals */}
      {modalMode === 'framer-return' && (
        <Modal
          title="Framer Record Details"
          onClose={() => setModalMode('none')}
          maxWidth="max-w-xl"
          footer={
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setModalMode('none')}
                className="px-6 py-2.5 bg-white border border-neutral-200 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 rounded-xl font-bold text-sm transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (activeFramerRecord && onReturnFromFramer && onTransfer) {
                    setOptimisticArtworkState({ status: ArtworkStatus.AVAILABLE, currentBranch: returnBranch });
                    const success = await wrapAction(async () => {
                      const now = new Date().toISOString();
                      const originalBranch = activeFramerRecord.artworkSnapshot?.currentBranch;

                      if (returnStrategy === 'manual') {
                        if (!returnItdrUrl) {
                          alert('IT/DR Attachment is required for transfers.');
                          setOptimisticArtwork(null);
                          return;
                        }
                        const returnResult = await onReturnFromFramer(activeFramerRecord.id, originalBranch || returnBranch, now);
                        if (returnResult === false) return false;
                        await onTransfer(activeFramerRecord.artworkId, returnBranch, { itdrUrl: returnItdrUrl });
                      } else {
                        const returnResult = await onReturnFromFramer(activeFramerRecord.id, returnBranch, now);
                        if (returnResult === false) return false;
                      }
                      setModalMode('none');
                    }, returnStrategy === 'manual' ? 'Requesting Transfer...' : 'Returning from Framer...', ArtworkStatus.AVAILABLE);
                    if (!success) {
                      setOptimisticArtwork(null);
                      setPendingViewState(null);
                    } else {
                      if (artwork.status !== ArtworkStatus.AVAILABLE || artwork.currentBranch !== returnBranch) {
                        setPendingViewState({ status: ArtworkStatus.AVAILABLE, currentBranch: returnBranch });
                      }
                    }
                  }
                }}
                className={`px-8 py-2.5 text-white rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 flex items-center gap-2 ${returnStrategy === 'manual' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-neutral-900 hover:bg-black shadow-neutral-200'
                  }`}
              >
                {returnStrategy === 'manual' ? 'Request Transfer' : 'Confirm Return'}
              </button>
            </div>
          }
        >
          <div className="space-y-6">
            <div className="flex gap-5 items-center p-1">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-neutral-100 shrink-0 border border-neutral-100 shadow-sm relative group">
                <OptimizedImage
                  src={artwork.imageUrl || undefined}
                  alt={artwork.title}
                  className="w-full h-full object-cover"
                  fallback={
                    <div className="w-full h-full flex items-center justify-center text-neutral-300">
                      <Package size={24} />
                    </div>
                  }
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-black text-neutral-900 tracking-tight leading-tight truncate mb-1">
                  {artwork.title}
                </h3>
                <p className="text-neutral-500 font-medium mb-3">by {artwork.artist}</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-0.5 bg-neutral-100 text-neutral-500 text-[10px] font-black uppercase tracking-widest rounded-lg">
                    {artwork.year}
                  </span>
                  <span className="px-2.5 py-0.5 bg-neutral-100 text-neutral-500 text-[10px] font-black uppercase tracking-widest rounded-lg">
                    {artwork.medium}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-neutral-50/50 p-5 rounded-2xl border border-neutral-100/80">
                <div className="flex items-center gap-2 text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-4">
                  <Clock size={12} className="text-neutral-300" />
                  Chronology & Process
                </div>

                <div className="grid grid-cols-2 gap-4 pb-6 border-b border-neutral-100">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Sent Date</p>
                    <div className="flex items-center gap-2 text-neutral-900 font-bold text-sm bg-white/50 px-3 py-2 rounded-xl border border-neutral-100">
                      <Calendar size={14} className="text-neutral-400" />
                      {activeFramerRecord ? new Date(activeFramerRecord.sentDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Return Date</p>
                    <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm bg-indigo-50/50 px-3 py-2 rounded-xl border border-indigo-100">
                      <Clock size={14} className="text-indigo-400" />
                      {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} (Today)
                    </div>
                  </div>
                </div>

                <div className="pt-5 space-y-2">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Framing Details</p>
                  <div className="bg-white/60 p-4 rounded-xl border border-neutral-100 italic text-neutral-600 text-sm leading-relaxed">
                    "{activeFramerRecord?.damageDetails || 'No details available'}"
                  </div>
                </div>
              </div>

              <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-100">
                <div className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-4">Destination Strategy</div>
                <div className="grid grid-cols-1 gap-3 mb-4">
                  {activeFramerRecord?.artworkSnapshot?.currentBranch && (
                    <button
                      onClick={() => {
                        setReturnStrategy('original');
                        setReturnBranch(activeFramerRecord.artworkSnapshot.currentBranch);
                      }}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${returnStrategy === 'original'
                        ? 'bg-neutral-900 border-neutral-900 text-white shadow-md'
                        : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${returnStrategy === 'original' ? 'bg-white/10' : 'bg-neutral-50'}`}>
                          <Home size={16} />
                        </div>
                        <div className="text-left">
                          <p className={`text-[10px] font-black uppercase tracking-tight text-neutral-400`}>Return to Original</p>
                          <p className="text-sm font-bold">{activeFramerRecord.artworkSnapshot.currentBranch}</p>
                        </div>
                      </div>
                      {returnStrategy === 'original' && <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />}
                    </button>
                  )}

                  <button
                    onClick={() => setReturnStrategy('manual')}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${returnStrategy === 'manual'
                      ? 'bg-neutral-900 border-neutral-900 text-white shadow-md'
                      : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${returnStrategy === 'manual' ? 'bg-white/10' : 'bg-neutral-50'}`}>
                        <ArrowRight size={16} />
                      </div>
                      <div className="text-left">
                        <p className={`text-[10px] font-black uppercase tracking-tight text-neutral-400`}>Transfer to Another</p>
                        <p className="text-sm font-bold">Requires T/R Approval</p>
                      </div>
                    </div>
                    {returnStrategy === 'manual' && <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />}
                  </button>
                </div>

                {returnStrategy === 'manual' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="relative group">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2 ml-1">Destination Branch</p>
                      <select
                        className="w-full px-4 py-3 pr-10 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500/10 bg-white transition-all appearance-none cursor-pointer hover:border-neutral-300"
                        value={returnBranch}
                        onChange={(e) => setReturnBranch(e.target.value)}
                      >
                        {branches.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 bottom-[14px] pointer-events-none text-neutral-400">
                        <ChevronDown size={14} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">IT/DR Attachment (Required for T/R)</p>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              wrapAction(async () => {
                                const url = await compressImage(file);
                                setReturnItdrUrl(prev => [...prev, url]);
                              }, 'Uploading attachment...');
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className={`p-4 rounded-xl border border-dashed transition-all flex items-center gap-3 ${returnItdrUrl ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-neutral-200 text-neutral-400 hover:border-neutral-300'
                          }`}>
                          <Paperclip size={18} />
                          <span className="text-sm font-medium">{returnItdrUrl ? 'IT/DR Attached' : 'Select IT/DR Image'}</span>
                          {returnItdrUrl && <div className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {modalMode === 'retouch-return' && (
        <Modal
          title="Retouch Record Details"
          onClose={() => setModalMode('none')}
          maxWidth="max-w-xl"
          footer={
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setModalMode('none')}
                className="px-6 py-2.5 bg-white border border-neutral-200 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 rounded-xl font-bold text-sm transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (activeRetouchRecord && onReturnToGallery && onTransfer) {
                    setOptimisticArtworkState({ status: ArtworkStatus.AVAILABLE, currentBranch: returnBranch });
                    const success = await wrapAction(async () => {
                      const now = new Date().toISOString();
                      const originalBranch = activeRetouchRecord.artworkSnapshot?.currentBranch;

                      if (returnStrategy === 'manual') {
                        if (!returnItdrUrl) {
                          alert('IT/DR Attachment is required for transfers.');
                          setOptimisticArtwork(null);
                          return;
                        }
                        const returnResult = await onReturnToGallery(activeRetouchRecord.id, originalBranch || returnBranch, now);
                        if (returnResult === false) return false;
                        await onTransfer(activeRetouchRecord.artworkId, returnBranch, { itdrUrl: returnItdrUrl });
                      } else {
                        const returnResult = await onReturnToGallery(activeRetouchRecord.id, returnBranch, now);
                        if (returnResult === false) return false;
                      }
                      setModalMode('none');
                    }, returnStrategy === 'manual' ? 'Requesting Transfer...' : 'Returning to Gallery...', ArtworkStatus.AVAILABLE);
                    if (!success) {
                      setOptimisticArtwork(null);
                      setPendingViewState(null);
                    } else {
                      if (artwork.status !== ArtworkStatus.AVAILABLE || artwork.currentBranch !== returnBranch) {
                        setPendingViewState({ status: ArtworkStatus.AVAILABLE, currentBranch: returnBranch });
                      }
                    }
                  }
                }}
                className={`px-8 py-2.5 text-white rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 flex items-center gap-2 ${returnStrategy === 'manual' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-neutral-900 hover:bg-black shadow-neutral-200'
                  }`}
              >
                {returnStrategy === 'manual' ? 'Request Transfer' : 'Confirm Return'}
              </button>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Header / Artwork Card */}
            <div className="flex gap-5 items-center p-1">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-neutral-100 shrink-0 border border-neutral-100 shadow-sm relative group">
                <OptimizedImage
                  src={artwork.imageUrl || undefined}
                  alt={artwork.title}
                  className="w-full h-full object-cover"
                  fallback={
                    <div className="w-full h-full flex items-center justify-center text-neutral-300">
                      <Package size={24} />
                    </div>
                  }
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-black text-neutral-900 tracking-tight leading-tight truncate mb-1">
                  {artwork.title}
                </h3>
                <p className="text-neutral-500 font-medium mb-3">by {artwork.artist}</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-0.5 bg-neutral-100 text-neutral-500 text-[10px] font-black uppercase tracking-widest rounded-lg">
                    {artwork.year}
                  </span>
                  <span className="px-2.5 py-0.5 bg-neutral-100 text-neutral-500 text-[10px] font-black uppercase tracking-widest rounded-lg">
                    {artwork.medium}
                  </span>
                </div>
              </div>
            </div>

            {/* Information Section */}
            <div className="space-y-4">
              <div className="bg-neutral-50/50 p-5 rounded-2xl border border-neutral-100/80">
                <div className="flex items-center gap-2 text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-4">
                  <Clock size={12} className="text-neutral-300" />
                  Chronology & Process
                </div>

                <div className="grid grid-cols-2 gap-4 pb-6 border-b border-neutral-100">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Sent Date</p>
                    <div className="flex items-center gap-2 text-neutral-900 font-bold text-sm bg-white/50 px-3 py-2 rounded-xl border border-neutral-100">
                      <Calendar size={14} className="text-neutral-400" />
                      {activeRetouchRecord ? new Date(activeRetouchRecord.returnDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Return Date</p>
                    <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm bg-indigo-50/50 px-3 py-2 rounded-xl border border-indigo-100">
                      <Clock size={14} className="text-indigo-400" />
                      {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} (Today)
                    </div>
                  </div>
                </div>

                <div className="pt-5 space-y-2">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Request Details</p>
                  <div className="bg-white/60 p-4 rounded-xl border border-neutral-100 italic text-neutral-600 text-sm leading-relaxed">
                    "{activeRetouchRecord?.remarks || 'No details available'}"
                  </div>
                </div>
              </div>

              {/* Branch Strategy Section */}
              <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-100">
                <div className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-4">Destination Strategy</div>

                <div className="grid grid-cols-1 gap-3 mb-4">
                  {activeRetouchRecord?.artworkSnapshot?.currentBranch && (
                    <button
                      onClick={() => {
                        setReturnStrategy('original');
                        setReturnBranch(activeRetouchRecord.artworkSnapshot.currentBranch);
                      }}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${returnStrategy === 'original'
                        ? 'bg-neutral-900 border-neutral-900 text-white shadow-md'
                        : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${returnStrategy === 'original' ? 'bg-white/10' : 'bg-neutral-50'}`}>
                          <Home size={16} />
                        </div>
                        <div className="text-left">
                          <p className={`text-[10px] font-black uppercase tracking-tight ${returnStrategy === 'original' ? 'text-neutral-400' : 'text-neutral-400'}`}>Return to Original</p>
                          <p className="text-sm font-bold">{activeRetouchRecord.artworkSnapshot.currentBranch}</p>
                        </div>
                      </div>
                      {returnStrategy === 'original' && <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />}
                    </button>
                  )}

                  <button
                    onClick={() => setReturnStrategy('manual')}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${returnStrategy === 'manual'
                      ? 'bg-neutral-900 border-neutral-900 text-white shadow-md'
                      : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${returnStrategy === 'manual' ? 'bg-white/10' : 'bg-neutral-50'}`}>
                        <ArrowRight size={16} />
                      </div>
                      <div className="text-left">
                        <p className={`text-[10px] font-black uppercase tracking-tight ${returnStrategy === 'manual' ? 'text-neutral-400' : 'text-neutral-400'}`}>Transfer to Another</p>
                        <p className="text-sm font-bold">Select destination manually</p>
                      </div>
                    </div>
                    {returnStrategy === 'manual' && <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />}
                  </button>
                </div>

                {returnStrategy === 'manual' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="relative group">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2 ml-1">Destination Branch</p>
                      <select
                        className="w-full px-4 py-3 pr-10 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500/10 bg-white transition-all appearance-none cursor-pointer hover:border-neutral-300"
                        value={returnBranch}
                        onChange={(e) => setReturnBranch(e.target.value)}
                      >
                        {branches.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 bottom-[14px] pointer-events-none text-neutral-400">
                        <ChevronDown size={14} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">IT/DR Attachment (Required for T/R)</p>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              wrapAction(async () => {
                                const url = await compressImage(file);
                                setReturnItdrUrl(prev => [...prev, url]);
                              }, 'Uploading attachment...');
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className={`p-4 rounded-xl border border-dashed transition-all flex items-center gap-3 ${returnItdrUrl ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-neutral-200 text-neutral-400 hover:border-neutral-300'
                          }`}>
                          <Paperclip size={18} />
                          <span className="text-sm font-medium">{returnItdrUrl ? 'IT/DR Attached' : 'Select IT/DR Image'}</span>
                          {returnItdrUrl && <div className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
      {modalMode === 'delivery-attach' && (
        <Modal onClose={() => setModalMode('none')} title="Delivery Documentation Required">
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-sm flex items-start space-x-3">
              <div className="text-amber-500"><AlertTriangle size={24} /></div>
              <div>
                <p className="text-sm font-bold text-amber-900">Missing Attachments</p>
                <p className="text-xs text-amber-700 mt-1">
                  Mandatory IT/DR and RSA documents must be attached before marking this artwork as Delivered.
                </p>
              </div>
            </div>

            {/* Delivery Attachments */}
            <div className="space-y-4 pt-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                Attachments <span className="text-red-500 font-bold normal-case">(Required for Delivery)</span>
              </label>

              <div className="flex p-1 bg-neutral-100 rounded-sm">
                <button
                  onClick={() => setActiveDeliveryAttachmentTab('itdr')}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeDeliveryAttachmentTab === 'itdr' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'}`}
                >
                  IT/DR <span className="text-red-500 ml-1">{!artwork.itdrImageUrl ? '*' : ''}</span>
                </button>
                <button
                  onClick={() => setActiveDeliveryAttachmentTab('rsa')}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeDeliveryAttachmentTab === 'rsa' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'}`}
                >
                  RSA / AR <span className="text-red-500 ml-1">{!artwork.rsaImageUrl ? '*' : ''}</span>
                </button>
                <button
                  onClick={() => setActiveDeliveryAttachmentTab('orcr')}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeDeliveryAttachmentTab === 'orcr' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'}`}
                >
                  OR / CR
                </button>
              </div>

              <div className="relative">
                {(() => {
                  const existingImages = activeDeliveryAttachmentTab === 'itdr' ? parseAttachmentString(artwork.itdrImageUrl) : activeDeliveryAttachmentTab === 'rsa' ? parseAttachmentString(artwork.rsaImageUrl) : parseAttachmentString(artwork.orCrImageUrl);
                  const newImages = activeDeliveryAttachmentTab === 'itdr' ? deliveryItdr : activeDeliveryAttachmentTab === 'rsa' ? deliveryRsa : deliveryOrcr;
                  const allImages = newImages.length > 0 ? newImages : existingImages;
                  const isExisting = newImages.length === 0 && existingImages.length > 0;
                  const setImages = activeDeliveryAttachmentTab === 'itdr' ? setDeliveryItdr : activeDeliveryAttachmentTab === 'rsa' ? setDeliveryRsa : setDeliveryOrcr;

                  return allImages.length === 0 ? (
                    <label className="flex flex-col items-center justify-center w-full h-32 bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-md cursor-pointer hover:bg-white hover:border-neutral-300 hover:shadow-lg hover:shadow-neutral-500/10 transition-all group">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          if (!files.length) return;
                          try {
                            const compressed = await Promise.all(files.map(f => compressImage(f, 800, 800, 0.6)));
                            setImages(prev => [...prev, ...compressed]);
                          } catch (err) {
                            console.error('Upload failed:', err);
                          } finally {
                            e.target.value = '';
                          }
                        }}
                      />
                      <div className="p-3 bg-white rounded-sm shadow-sm mb-2 group-hover:scale-110 transition-transform ring-1 ring-neutral-100">
                        <Upload size={20} className="text-neutral-400 group-hover:text-neutral-700 transition-colors" />
                      </div>
                      <span className="text-xs font-bold text-neutral-500 group-hover:text-neutral-900 transition-colors">Upload {activeDeliveryAttachmentTab.toUpperCase()}</span>
                    </label>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                        {allImages.map((img, i) => (
                          <div key={i} className="relative group rounded-md overflow-hidden shadow-sm ring-1 ring-neutral-100 h-20">
                            <img src={img} className="w-full h-full object-cover" alt={`${activeDeliveryAttachmentTab.toUpperCase()} ${i + 1}`} />
                            {!isExisting && (
                              <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                <button
                                  onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                                  className="p-1.5 bg-white text-red-600 rounded-full shadow-lg hover:scale-110 transition-transform"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                        {!isExisting && (
                          <label className="flex flex-col items-center justify-center h-20 bg-neutral-50 border border-dashed border-neutral-200 rounded-md cursor-pointer hover:border-neutral-300 transition-all group">
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={async (e) => {
                                const files = Array.from(e.target.files || []);
                                if (!files.length) return;
                                const compressed = await Promise.all(files.map(f => compressImage(f, 800, 800, 0.6)));
                                setImages(prev => [...prev, ...compressed]);
                                e.target.value = '';
                              }}
                            />
                            <Plus size={16} className="text-neutral-300 group-hover:text-neutral-500 transition-colors" />
                          </label>
                        )}
                      </div>
                      <div className="text-center text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                        {activeDeliveryAttachmentTab.toUpperCase()} — {isExisting ? 'Existing' : `${allImages.length} Attached`}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button onClick={() => setModalMode('none')} className="px-6 py-2.5 rounded-md text-neutral-600 font-bold hover:bg-neutral-100 transition-all transform hover:-translate-y-0.5">Cancel</button>
              <button
                onClick={() => {
                  wrapAction(async () => {
                    await onDeliver(artwork.id, deliveryItdr, deliveryRsa, deliveryOrcr);
                    setModalMode('none');
                    setDeliveryItdr([]);
                    setDeliveryRsa([]);
                    setDeliveryOrcr([]);
                  }, 'Processing Delivery...', ArtworkStatus.DELIVERED);
                }}
                className="px-8 py-2.5 bg-neutral-900 text-white rounded-md font-bold shadow-lg shadow-neutral-200 hover:shadow-neutral-300 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!(deliveryItdr || artwork.itdrImageUrl) || !(deliveryRsa || artwork.rsaImageUrl)}
              >
                Confirm Delivery
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modalMode === 'edit' && (
        <Modal onClose={() => setModalMode('none')} title="Edit Artwork Details">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Title</label>
                <input
                  type="text"
                  className="w-full px-5 py-3 bg-neutral-50 border-0 rounded-sm text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:bg-white hover:bg-neutral-100 transition-all"
                  value={editForm.title as string}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Artist</label>
                <input
                  type="text"
                  className="w-full px-5 py-3 bg-neutral-50 border-0 rounded-sm text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:bg-white hover:bg-neutral-100 transition-all"
                  value={editForm.artist as string}
                  onChange={(e) => setEditForm(prev => ({ ...prev, artist: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Medium</label>
                <input
                  type="text"
                  className="w-full px-5 py-3 bg-neutral-50 border-0 rounded-sm text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:bg-white hover:bg-neutral-100 transition-all"
                  value={editForm.medium as string}
                  onChange={(e) => setEditForm(prev => ({ ...prev, medium: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Size</label>
                <input
                  type="text"
                  className="w-full px-5 py-3 bg-neutral-50 border-0 rounded-sm text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:bg-white hover:bg-neutral-100 transition-all"
                  value={editForm.dimensions as string}
                  onChange={(e) => setEditForm(prev => ({ ...prev, dimensions: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Year</label>
                <input
                  type="text"
                  className="w-full px-5 py-3 bg-neutral-50 border-0 rounded-sm text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:bg-white hover:bg-neutral-100 transition-all"
                  value={editForm.year as string}
                  onChange={(e) => setEditForm(prev => ({ ...prev, year: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Price</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm"
                  value={Number(editForm.price || 0)}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    const parts = val.split('.');
                    if (parts.length > 2) parts.splice(2);
                    if (parts[0] && parts[0].length > 1) parts[0] = parts[0].replace(/^0+/, '') || '0';
                    setEditForm(prev => ({ ...prev, price: parseFloat(parts.join('.')) || 0 }));
                  }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Location (Branch)</label>
                <select
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm"
                  value={String(editForm.currentBranch)}
                  onChange={(e) => setEditForm(prev => ({ ...prev, currentBranch: e.target.value as Branch }))}
                >
                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Image URL</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm"
                  value={String(editForm.imageUrl || '')}
                  onChange={(e) => setEditForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Upload Image</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const compressed = await compressImage(file, 1000, 1000, 0.7);
                        setEditForm(prev => ({ ...prev, imageUrl: compressed }));
                      } catch (err) {
                        console.error('Upload failed:', err);
                      } finally {
                        e.target.value = '';
                      }
                    }}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm"
                  />
                </div>
                {editForm.imageUrl && (
                  <div className="mt-2">
                    <img src={String(editForm.imageUrl)} alt="Preview" className="w-full h-48 object-cover rounded-sm border border-neutral-200" />
                  </div>
                )}
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Remarks</label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm resize-none"
                  value={String(editForm.remarks || '')}
                  onChange={(e) => setEditForm(prev => ({ ...prev, remarks: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setModalMode('none')} className="px-6 py-2.5 rounded-md text-neutral-600 font-bold hover:bg-neutral-100 transition-all transform hover:-translate-y-0.5">Cancel</button>
              <button
                onClick={() => wrapAction(() => { onEdit(editForm); setModalMode('none'); }, 'Updating Artwork...')}
                className="px-8 py-2.5 bg-neutral-900 text-white rounded-md font-bold shadow-lg shadow-neutral-200 hover:shadow-neutral-300 transform hover:-translate-y-0.5 transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </Modal>
      )}
      {modalMode === 'return' && (
        <Modal onClose={() => setModalMode('none')} title="Return to Artist" maxWidth="max-w-4xl" variant="sharp">
          <div className="space-y-6 text-sm text-neutral-800">

            {/* Type Selection Tabs (Enterprise Style) */}
            <div className="flex border-b border-neutral-200 mb-6">
              <button
                onClick={() => setReturnType('Artist Reclaim')}
                className={`px-6 py-3 font-semibold text-[13px] border-b-2 transition-colors ${returnType === 'Artist Reclaim' ? 'border-red-600 text-red-600' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
              >
                Return (Void)
              </button>
              <button
                onClick={() => setReturnType('For Retouch')}
                className={`px-6 py-3 font-semibold text-[13px] border-b-2 transition-colors ${returnType === 'For Retouch' ? 'border-[#3B82F6] text-[#3B82F6]' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
              >
                For Retouch
              </button>
            </div>

            {/* Content Container grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left Side: Form Details */}
              <div className="lg:col-span-2 space-y-6">

                {/* Warning Card */}
                <div className={`flex p-4 border rounded-sm transition-colors ${returnType === 'Artist Reclaim' ? 'border-red-100 bg-red-50/50' : 'border-blue-100 bg-blue-50/50'}`}>
                  <div className={`${returnType === 'Artist Reclaim' ? 'text-red-500' : 'text-blue-500'} mr-3`}>
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900 text-sm">
                      {returnType === 'Artist Reclaim' ? 'Permanent Artwork Reclaim (VOID)' : 'Temporary Status Change'}
                    </h4>
                    <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                      {returnType === 'Artist Reclaim'
                        ? 'This action is a VOID. The artwork will be permanently removed from inventory and returned to the artist. Audit trail and data will be preserved. IT/DR attachment is REQUIRED.'
                        : 'The artwork status will change to "For Retouch". It remains in the inventory but is marked as unavailable. You can return it to the gallery branch later.'}
                    </p>
                  </div>
                </div>

                {/* Form Inputs (Grid Layout) */}
                <div className="border border-neutral-200 rounded-sm overflow-hidden">
                  <div className="grid grid-cols-1">

                    <div className="p-4 border-b border-neutral-200">
                      <label className="block text-xs text-neutral-500 font-medium mb-2">
                        Reason for Protocol {returnType === 'Artist Reclaim' && '*'}
                      </label>
                      <textarea
                        className={`w-full text-sm placeholder:text-neutral-300 border border-neutral-200 rounded-sm p-3 focus:outline-none resize-none min-h-[100px] ${returnType === 'Artist Reclaim' ? 'focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}`}
                        placeholder={returnType === 'Artist Reclaim' ? 'Describe why this item is being voided...' : 'Enter the exact reason for the retouch protocol...'}
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                      />
                    </div>

                    <div className="p-4 bg-neutral-50/30">
                      <label className="block text-xs text-neutral-500 font-medium mb-2">
                        Internal Tracking Details (Optional)
                      </label>
                      <input
                        type="text"
                        className={`w-full text-sm placeholder:text-neutral-300 border border-neutral-200 rounded-sm p-3 focus:outline-none ${returnType === 'Artist Reclaim' ? 'focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}`}
                        placeholder="Internal remarks or specific protocol tracking..."
                        value={returnNotes}
                        onChange={(e) => setReturnNotes(e.target.value)}
                      />
                    </div>

                  </div>
                </div>

              </div>

              {/* Right Side: Execution & Attachments */}
              <div className="lg:col-span-1 border border-neutral-200 rounded-sm p-5 flex flex-col items-center bg-neutral-50/30">
                <div className={`flex items-center justify-center w-12 h-12 bg-white border rounded-md shadow-sm mb-4 ${returnType === 'Artist Reclaim' ? 'border-red-200' : 'border-blue-200'}`}>
                  {returnType === 'Artist Reclaim' ? <Trash2 className="text-red-500" size={24} /> : <Wrench className="text-blue-500" size={24} />}
                </div>

                <p className="text-[10px] font-bold text-neutral-400 tracking-widest uppercase mb-1">
                  PROTOCOL GATE
                </p>
                <h3 className="font-semibold text-neutral-900 mb-6 text-center">
                  {returnType === 'Artist Reclaim' ? 'Void Authorization' : 'Retouch Process'}
                </h3>

                {/* File Attachments Grid */}
                <div className="w-full mb-6">
                  <p className="text-xs font-medium text-neutral-500 mb-2 flex items-center justify-between">
                    <span>Proof Images {returnType === 'Artist Reclaim' ? '*' : ''}</span>
                    <span className="text-neutral-300 font-normal">{returnProofImages.length} attached</span>
                  </p>

                  <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                    {returnProofImages.map((image, index) => (
                      <div key={`${image}-${index}`} className="relative group aspect-square rounded-sm overflow-hidden border border-neutral-200 shadow-sm bg-white">
                        <img src={image} className="w-full h-full object-cover" alt={`Proof ${index + 1}`} />
                        <div className="absolute inset-0 bg-neutral-900/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[1px]">
                          <button
                            onClick={() => setReturnProofImages(prev => prev.filter((_, i) => i !== index))}
                            className="p-1.5 bg-white text-red-600 rounded-full shadow-lg hover:scale-110 transition-transform"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}

                    <label className={`relative flex flex-col items-center justify-center aspect-square bg-white border border-dashed border-neutral-200 rounded-sm cursor-pointer transition-all group ${returnType === 'Artist Reclaim' ? 'hover:border-red-400 hover:bg-red-50/30' : 'hover:border-blue-400 hover:bg-blue-50/30'}`}>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length === 0) return;
                          try {
                            const compressed = await Promise.all(
                              files.map(file => compressImage(file, 1200, 1200, 0.7))
                            );
                            setReturnProofImages(prev => [...prev, ...compressed]);
                          } catch (err) {
                            console.error('Batch upload failed:', err);
                          } finally {
                            e.target.value = '';
                          }
                        }}
                      />
                      <Plus size={18} className={`text-neutral-300 mb-1 ${returnType === 'Artist Reclaim' ? 'group-hover:text-red-500' : 'group-hover:text-blue-500'} transition-colors`} />
                      <span className={`text-[10px] font-bold text-neutral-400 uppercase tracking-tight ${returnType === 'Artist Reclaim' ? 'group-hover:text-red-600' : 'group-hover:text-blue-600'}`}>Add Proof</span>
                    </label>
                  </div>
                </div>

                <div className="mt-auto w-full">
                  <button
                    onClick={async () => {
                      if (onReturn && returnReason.trim()) {
                        const targetStatus = returnType === 'Artist Reclaim' ? ArtworkStatus.RETURNED : ArtworkStatus.FOR_RETOUCH;
                        setOptimisticArtworkState({
                          status: targetStatus,
                          deletedAt: returnType === 'Artist Reclaim' ? new Date().toISOString() : artwork.deletedAt
                        });
                        const success = await wrapAction(async () => {
                          const result = await onReturn(artwork.id, returnReason, returnRefNumber, returnProofImages, returnNotes, returnType);
                          if (result === false) return false;
                          setModalMode('none');
                          setReturnReason('');
                          setReturnRefNumber('');
                          setReturnNotes('');
                          setReturnProofImages([]);
                        }, `Scheduling ${returnType === 'Artist Reclaim' ? 'Void' : 'Retouch'}...`, targetStatus);
                        if (!success) {
                          setOptimisticArtwork(null);
                          setPendingViewState(null);
                        } else {
                          setPendingViewState({ status: targetStatus });
                        }
                      }
                    }}
                    disabled={isProcessing || !returnReason.trim() || (returnType === 'Artist Reclaim' && returnProofImages.length === 0)}
                    className={`w-full py-2.5 disabled:bg-neutral-100 disabled:text-neutral-400 disabled:border-neutral-200 border border-transparent text-white text-sm font-semibold rounded-sm transition-all shadow-sm flex items-center justify-center gap-2 ${returnType === 'Artist Reclaim' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#3B82F6] hover:bg-[#2563EB]'}`}
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        PROCESSING...
                      </>
                    ) : (
                      returnType === 'Artist Reclaim' ? 'AUTHORIZE VOID' : 'SCHEDULE RETOUCH'
                    )}
                  </button>
                  <button
                    onClick={() => setModalMode('none')}
                    className="w-full mt-3 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-800 transition-colors"
                  >
                    Cancel Setup
                  </button>
                </div>
              </div>

            </div>
          </div>
        </Modal>
      )}

      {modalMode === 'framer' && (
        <Modal onClose={() => setModalMode('none')} title="Send to Framer" maxWidth="max-w-4xl" variant="sharp">
          <div className="space-y-6 text-sm text-neutral-800">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Side: Form Details */}
              <div className="lg:col-span-2 space-y-6">

                {/* Information Card */}
                <div className="flex p-4 border border-amber-100 bg-amber-50/50 rounded-sm">
                  <div className="text-amber-500 mr-3">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900 text-sm">Framing Protocol Authorization</h4>
                    <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                      The artwork status will be updated to "For Framing". This record will be moved to the Framer Management queue. Entry of specific framing requirements or damage reports is required for tracking.
                    </p>
                  </div>
                </div>

                {/* Form Inputs */}
                <div className="border border-neutral-200 rounded-sm overflow-hidden">
                  <div className="p-4">
                    <label className="block text-xs text-neutral-500 font-medium mb-2">
                      Framing Details & Requirements *
                    </label>
                    <textarea
                      className="w-full text-sm placeholder:text-neutral-300 border border-neutral-200 rounded-sm p-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none min-h-[150px]"
                      placeholder="Specify frame type, glass requirements, or existing damage details..."
                      value={damageDetails}
                      onChange={(e) => setDamageDetails(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Right Side: Execution & Attachments */}
              <div className="lg:col-span-1 border border-neutral-200 rounded-sm p-5 flex flex-col items-center bg-neutral-50/30">
                <div className="flex items-center justify-center w-12 h-12 bg-white border border-amber-200 rounded-md shadow-sm mb-4">
                  <Wrench className="text-amber-500" size={24} />
                </div>

                <p className="text-[10px] font-bold text-neutral-400 tracking-widest uppercase mb-1">
                  LOGISTICS GATE
                </p>
                <h3 className="font-semibold text-neutral-900 mb-6 text-center">
                  Framer Dispatch
                </h3>

                {/* File Attachments Grid */}
                <div className="w-full mb-6">
                  <p className="text-xs font-medium text-neutral-500 mb-2 flex items-center justify-between">
                    <span>Reference / Photo Attachments</span>
                    <span className="text-neutral-300 font-normal">{framerAttachment.length} attached</span>
                  </p>

                  <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                    {framerAttachment.map((url, idx) => (
                      <div key={idx} className="relative group aspect-video rounded-sm overflow-hidden border border-neutral-200 shadow-sm bg-white">
                        <img src={url} className="w-full h-full object-cover" alt="Reference" />
                        <div className="absolute inset-0 bg-neutral-900/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[1px]">
                          <button
                            onClick={() => setFramerAttachment(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1.5 bg-white text-red-600 rounded-full shadow-lg hover:scale-110 transition-transform"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}

                    <label className="relative flex flex-col items-center justify-center aspect-video bg-white border border-dashed border-neutral-200 rounded-sm cursor-pointer hover:border-amber-500 hover:bg-amber-50/30 transition-all group">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length === 0) return;

                          try {
                            const compressed = await Promise.all(
                              files.map(file => compressImage(file, 1200, 1200, 0.7))
                            );
                            setFramerAttachment(prev => [...prev, ...compressed]);
                          } catch (err) {
                            console.error('Batch upload failed:', err);
                          } finally {
                            e.target.value = '';
                          }
                        }}
                      />
                      <div className="flex flex-col items-center">
                        <Plus size={20} className="text-neutral-300 group-hover:text-amber-500 transition-colors mb-1" />
                        <span className="text-[10px] font-bold text-neutral-400 group-hover:text-amber-600 uppercase tracking-tight">Add Photo</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="mt-auto w-full">
                  <button
                    onClick={async () => {
                      if (onSendToFramer && damageDetails.trim()) {
                        setOptimisticArtworkState({ status: ArtworkStatus.FOR_FRAMING });
                        const success = await wrapAction(async () => {
                          const result = await onSendToFramer(artwork.id, damageDetails, framerAttachment);
                          if (result === false) return false;
                          setModalMode('none');
                          resetFramerState();
                        }, 'Scheduling Framer Dispatch...', ArtworkStatus.FOR_FRAMING);
                        if (!success) {
                          setOptimisticArtwork(null);
                          setPendingViewState(null);
                        } else {
                          setPendingViewState({ status: ArtworkStatus.FOR_FRAMING });
                        }
                      }
                    }}
                    disabled={isProcessing || !damageDetails.trim()}
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-neutral-100 disabled:text-neutral-400 disabled:border-neutral-200 border border-transparent text-white text-sm font-semibold rounded-sm transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    AUTHORIZE DISPATCH
                  </button>
                  <button
                    onClick={() => {
                      setModalMode('none');
                      resetFramerState();
                    }}
                    className="w-full mt-3 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-800 transition-colors"
                  >
                    Cancel Setup
                  </button>
                </div>
              </div>

            </div>
          </div>
        </Modal>
      )}

      {modalMode === 'attach-unified' && (
        <Modal onClose={() => setModalMode('none')} title="Manage Attachments">
          <div className="space-y-6">
            <div className="flex p-1 bg-neutral-100 rounded-sm">
              <button
                onClick={() => setActiveAttachmentTab('itdr')}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-sm transition-all ${activeAttachmentTab === 'itdr' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
              >
                IT/DR ({tempItdr.length})
              </button>
              <button
                onClick={() => setActiveAttachmentTab('rsa')}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-sm transition-all ${activeAttachmentTab === 'rsa' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
              >
                RSA ({tempRsa.length})
              </button>
              <button
                onClick={() => setActiveAttachmentTab('orcr')}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-sm transition-all ${activeAttachmentTab === 'orcr' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
              >
                OR/CR ({tempOrcr.length})
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center justify-between">
                  <span>{activeAttachmentTab === 'itdr' ? 'IT/DR Documents' : activeAttachmentTab === 'rsa' ? 'RSA / AR Images' : 'OR / CR Images'}</span>
                  <span className="text-neutral-300 normal-case font-medium">Add multiple files</span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[320px] overflow-y-auto pr-1">
                  {(activeAttachmentTab === 'itdr' ? tempItdr : activeAttachmentTab === 'rsa' ? tempRsa : tempOrcr).map((url, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-md overflow-hidden border border-neutral-200 shadow-sm bg-neutral-50">
                      <img src={url} className="w-full h-full object-cover" alt="Attachment" />
                      <div className="absolute inset-0 bg-neutral-900/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[1px]">
                        <button
                          onClick={() => {
                            if (activeAttachmentTab === 'itdr') setTempItdr(prev => prev.filter((_, i) => i !== idx));
                            else if (activeAttachmentTab === 'rsa') setTempRsa(prev => prev.filter((_, i) => i !== idx));
                            else setTempOrcr(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="p-1.5 bg-white text-red-600 rounded-full shadow-lg hover:scale-110 transition-transform"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}

                  <label className="relative flex flex-col items-center justify-center aspect-square bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-md cursor-pointer hover:bg-white hover:border-neutral-300 hover:shadow-md transition-all group">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length === 0) return;

                        try {
                          const compressed = await Promise.all(
                            files.map(file => compressImage(file, 1200, 1200, 0.7))
                          );
                          if (activeAttachmentTab === 'itdr') setTempItdr(prev => [...prev, ...compressed]);
                          else if (activeAttachmentTab === 'rsa') setTempRsa(prev => [...prev, ...compressed]);
                          else setTempOrcr(prev => [...prev, ...compressed]);
                        } catch (err) {
                          console.error('Batch upload failed:', err);
                        } finally {
                          e.target.value = '';
                        }
                      }}
                    />
                    <div className="flex flex-col items-center">
                      <Plus size={20} className="text-neutral-400 group-hover:text-neutral-700 transition-colors mb-1" />
                      <span className="text-[10px] font-bold text-neutral-400 group-hover:text-neutral-900 uppercase tracking-tight">Add</span>
                    </div>
                  </label>
                </div>

                {(activeAttachmentTab === 'itdr' ? tempItdr : activeAttachmentTab === 'rsa' ? tempRsa : tempOrcr).length === 0 && (
                  <div className="text-[11px] text-neutral-400 text-center py-4 italic">No attachments found for this category.</div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-100">
                <button onClick={() => setModalMode('none')} className="px-6 py-2.5 rounded-md text-neutral-600 font-bold hover:bg-neutral-100 transition-all">Cancel</button>
                <button
                  onClick={() => {
                    const update = {
                      itdrImageUrl: tempItdr,
                      rsaImageUrl: tempRsa,
                      orCrImageUrl: tempOrcr
                    };

                    wrapAction(async () => {
                      await onEdit(update);
                      setModalMode('none');
                    }, 'Saving Attachments...');
                  }}
                  className="px-8 py-2.5 bg-neutral-900 text-white rounded-md font-bold hover:bg-black shadow-lg shadow-neutral-200 transform hover:-translate-y-0.5 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
      {showItdrPreview && artwork.itdrImageUrl && (
        <Modal onClose={() => setShowItdrPreview(false)} title="IT/DR Document" maxWidth="max-w-3xl">
          <div className="space-y-4">
            {(() => {
              const urls = parseAttachmentString(artwork.itdrImageUrl);
              return (
                <div className={urls.length > 1 ? 'grid grid-cols-2 gap-3' : ''}>
                  {urls.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`IT/DR ${i + 1}`}
                      className="w-full h-auto rounded-sm cursor-zoom-in hover:opacity-95 transition-opacity shadow-sm border border-neutral-100"
                      onClick={() => window.open(url, '_blank')}
                      title="Click to view full size"
                    />
                  ))}
                </div>
              );
            })()}
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-neutral-400">Click image to open in new tab</span>
              <div className="flex space-x-3">
                <button onClick={() => setShowItdrPreview(false)} className="px-6 py-2.5 rounded-sm text-neutral-600 font-medium hover:bg-neutral-100 transition-colors">Close</button>
                <button onClick={handlePrintItdr} className="px-8 py-2.5 bg-neutral-900 text-white rounded-sm font-bold shadow-lg shadow-neutral-200 hover:shadow-neutral-400 hover:-translate-y-0.5 transition-all">Print Document</button>
              </div>
            </div>
          </div>
        </Modal>
      )}
      {showImagePreview && (
        <Modal onClose={() => setShowImagePreview(false)} title="Artwork Image">
          <div className="space-y-4">
            <img src={artwork.imageUrl} className="w-full max-h-[80vh] object-contain rounded-sm border border-neutral-200" alt={artwork.title} />
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowImagePreview(false)} className="px-6 py-2.5 rounded-md text-neutral-600 font-bold hover:bg-neutral-100 transition-all transform hover:-translate-y-0.5">Close</button>
              <button onClick={() => {
                const w = window.open('', '_blank');
                if (!w) return;
                w.document.write(`<html><head><title>${artwork.title}</title></head><body style="margin:0"><img src="${artwork.imageUrl}" style="max-width:100%;height:auto;display:block"/></body></html>`);
                w.document.close();
                w.focus();
                w.onload = () => w.print();
              }} className="px-8 py-2.5 bg-neutral-900 text-white rounded-md font-bold shadow-lg shadow-neutral-200 hover:shadow-xl transform hover:-translate-y-0.5 transition-all">Print</button>
            </div>
          </div>
        </Modal>
      )}
      {modalMode === 'transfer' && (
        <Modal onClose={() => setModalMode('none')} title="Branch Transfer Authorization">
          <div className="space-y-6">
            <div className="flex items-center space-x-4 p-4 bg-neutral-50 border border-neutral-200 rounded-sm">
              <img src={artwork.imageUrl} className="w-16 h-16 rounded object-cover shadow-sm" alt="Thumbnail" />
              <div><p className="text-xs font-bold text-neutral-500 uppercase">{artwork.code}</p><p className="text-sm font-bold text-neutral-900">{artwork.title}</p></div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Destination Branch</label>
              <select className="w-full px-5 py-3 bg-neutral-50 border-0 rounded-sm text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:bg-white hover:bg-neutral-100 transition-all cursor-pointer" value={transferBranch} onChange={(e) => setTransferBranch(e.target.value as Branch)}>
                {branches.filter(b => b !== artwork.currentBranch).map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div className="space-y-4 pt-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center justify-between">
                <span>IT/DR Documents <span className="text-red-500 font-bold normal-case">(Mandatory)</span></span>
                <span className="text-neutral-300 normal-case font-medium">{transferItdr.length} Attached</span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                {transferItdr.map((url, idx) => (
                  <div key={idx} className="relative group aspect-video rounded-md overflow-hidden border border-neutral-200 shadow-sm bg-neutral-50">
                    <img src={url} className="w-full h-full object-cover" alt={`Attachment ${idx + 1}`} />
                    <div className="absolute inset-0 bg-neutral-900/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[1px]">
                      <button
                        onClick={() => setTransferItdr(prev => prev.filter((_, i) => i !== idx))}
                        className="p-2 bg-white text-red-600 rounded-full shadow-lg hover:scale-110 transition-transform"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                <label className="relative flex flex-col items-center justify-center aspect-video bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-md cursor-pointer hover:bg-white hover:border-neutral-300 hover:shadow-md transition-all group">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;

                      try {
                        const compressed = await Promise.all(
                          files.map(file => compressImage(file, 1200, 1200, 0.7))
                        );
                        setTransferItdr(prev => [...prev, ...compressed]);
                      } catch (err) {
                        console.error('Batch upload failed:', err);
                      } finally {
                        e.target.value = '';
                      }
                    }}
                  />
                  <div className="flex flex-col items-center">
                    <Plus size={20} className="text-neutral-400 group-hover:text-neutral-700 transition-colors mb-1" />
                    <span className="text-[10px] font-bold text-neutral-400 group-hover:text-neutral-900 uppercase tracking-tight">Add Files</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-100">
              <button onClick={() => setModalMode('none')} className="px-6 py-2.5 rounded-md text-neutral-600 font-bold hover:bg-neutral-100 transition-all transform hover:-translate-y-0.5">Cancel</button>
              <button
                onClick={() => wrapAction(async () => {
                  await onTransfer(artwork.id, transferBranch, { itdrUrl: transferItdr });
                  setModalMode('none');
                  setTransferItdr([]);
                }, 'Transferring Artwork...')}
                disabled={transferItdr.length === 0}
                className="px-8 py-2.5 bg-neutral-900 text-white rounded-md font-bold hover:bg-black shadow-lg shadow-neutral-200 hover:shadow-neutral-300 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Authorize Transfer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modalMode === 'reserve' && (
        <Modal onClose={() => setModalMode('none')} title="Artwork Reservation Setup">
          <div className="space-y-6">
            <div className="flex p-1 bg-neutral-100 rounded-sm">
              <button
                onClick={() => setReserveType('Person')}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-sm transition-all ${reserveType === 'Person' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'}`}
              >
                Person
              </button>
              <button
                onClick={() => setReserveType('Event')}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-sm transition-all ${reserveType === 'Event' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'}`}
              >
                Event
              </button>
              <button
                onClick={() => setReserveType('Auction')}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-sm transition-all ${reserveType === 'Auction' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'}`}
              >
                Auction
              </button>
            </div>

            <div className="space-y-4">
              {reserveType === 'Person' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Client Name</label>
                  <input
                    type="text"
                    placeholder="Enter full name..."
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm"
                    value={reserveTarget}
                    onChange={(e) => setReserveTarget(e.target.value)}
                  />
                </div>
              )}

              {reserveType === 'Event' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Select Exhibition</label>
                  <select
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm"
                    value={reserveTarget}
                    onChange={(e) => setReserveTarget(e.target.value)}
                  >
                    <option value="">Choose an event...</option>
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
                      .map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                  </select>
                </div>
              )}

              {reserveType === 'Auction' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Select Auction</label>
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
                    }).length > 0 ? (
                    <select
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm"
                      value={reserveTarget}
                      onChange={(e) => setReserveTarget(e.target.value)}
                    >
                      <option value="">Choose an auction...</option>
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
                        .map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                    </select>
                  ) : (
                    <div className="p-4 bg-neutral-100 rounded-sm text-center space-y-2 border border-neutral-200">
                      <p className="text-sm font-bold text-neutral-600">No Active Auctions</p>
                      <p className="text-xs text-neutral-500">You must schedule an auction in Operations &gt; Auctions before reserving items for it.</p>
                    </div>
                  )}
                </div>
              )}

              {reserveType === 'Person' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Duration (Auto-Revert)</label>
                  <div className="flex gap-2">
                    {(['Days', 'Hours', 'Minutes'] as const).map(u => {
                      const val = u === 'Days' ? reserveDays : u === 'Hours' ? reserveHours : reserveMinutes;
                      return (
                        <div key={u} className="flex-1 space-y-1">
                          <input
                            type="text"
                            inputMode="numeric"
                            className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm font-bold text-center"
                            value={val}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, '');
                              const v = Math.max(0, parseInt(raw, 10) || 0);
                              if (u === 'Days') setReserveDays(v);
                              else if (u === 'Hours') setReserveHours(v);
                              else setReserveMinutes(v);
                            }}
                          />
                          <p className="text-[10px] text-center font-bold text-neutral-400 uppercase tracking-widest">{u}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Purpose & Details</label>
                <textarea
                  placeholder="Additional notes for reservation..."
                  rows={3}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm resize-none"
                  value={reserveNotes}
                  onChange={(e) => setReserveNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button onClick={() => setModalMode('none')} className="px-6 py-2.5 rounded-sm text-neutral-600 font-medium">Cancel</button>
              <button
                onClick={handleReserve}
                className="px-8 py-2.5 bg-neutral-900 text-white rounded-sm font-bold shadow-lg shadow-neutral-200 disabled:opacity-50"
              >
                Confirm Reservation
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modalMode === 'auction' && (
        <Modal onClose={() => setModalMode('none')} title="Add to Auction">
          <div className="space-y-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Select Auction Event</label>
              <select
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm"
                value={selectedAuctionId}
                onChange={(e) => {
                  const id = e.target.value;
                  const name = events.find(ev => ev.id === id)?.title || '';
                  setSelectedAuctionId(id);
                  setSelectedAuctionName(name);
                }}
              >
                <option value="" disabled>Choose an auction...</option>
                {events.filter(e => e.type === 'Auction').filter(e => {
                  if (e.status === 'Recent' || e.status === 'Closed') return false;
                  if (e.isStrictDuration && e.endDate) {
                    const end = new Date(e.endDate);
                    end.setHours(23, 59, 59, 999);
                    if (end.getTime() < Date.now()) return false;
                  }
                  return true;
                }).map(e => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setModalMode('none');
                  setSelectedAuctionId('');
                  setSelectedAuctionName('');
                }}
                className="px-6 py-2.5 rounded-sm text-neutral-600 font-medium"
              >
                Cancel
              </button>
              <button
                disabled={!selectedAuctionId}
                onClick={() => {
                  if (selectedAuctionId && onAddToAuction) {
                    wrapAction(async () => {
                      await onAddToAuction([artwork.id], selectedAuctionId, selectedAuctionName);
                      setModalMode('none');
                      setSelectedAuctionId('');
                      setSelectedAuctionName('');
                      if (onNavigateTo) {
                        onNavigateTo('operations', 'auctions');
                      }
                    }, 'Adding to Auction...', ArtworkStatus.RESERVED);
                  }
                }}
                className="px-8 py-2.5 bg-neutral-900 text-white rounded-sm font-bold shadow-lg shadow-neutral-200 disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </div>
        </Modal>
      )}

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
                  (sale.installments || []).reduce((sum, inst) => sum + inst.amount, 0)
                ).toLocaleString()}</p>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-emerald-200">
                <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Outstanding Balance</p>
                <p className="text-lg font-black text-emerald-900">₱{(
                  (artwork.price || 0) -
                  (sale.downpayment || 0) -
                  (sale.installments || []).reduce((sum, inst) => sum + inst.amount, 0)
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

              {/* Attachment Section */}
              <div className="space-y-3 pt-2">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center justify-between">
                  <span>Payment Proof / Attachment <span className="text-red-500">*</span></span>
                  <span className="text-neutral-300 normal-case font-medium">{installmentAttachments.length} Attached</span>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  {installmentAttachments.map((url, idx) => (
                    <div key={idx} className="relative group aspect-video rounded-md overflow-hidden border border-neutral-200 shadow-sm bg-neutral-50">
                      <img src={url} className="w-full h-full object-cover" alt={`Proof ${idx + 1}`} />
                      <div className="absolute inset-0 bg-neutral-900/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[1px]">
                        <button
                          onClick={() => setInstallmentAttachments(prev => prev.filter((_, i) => i !== idx))}
                          className="p-2 bg-white text-red-600 rounded-full shadow-lg hover:scale-110 transition-transform"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}

                  <label className="relative flex flex-col items-center justify-center aspect-video bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-md cursor-pointer hover:bg-white hover:border-neutral-300 hover:shadow-md transition-all group">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length === 0) return;

                        try {
                          const compressed = await Promise.all(
                            files.map(file => compressImage(file, 1200, 1200, 0.7))
                          );
                          setInstallmentAttachments(prev => [...prev, ...compressed]);
                        } catch (err) {
                          console.error('Batch upload failed:', err);
                        } finally {
                          e.target.value = '';
                        }
                      }}
                    />
                    <div className="flex flex-col items-center">
                      <Plus size={20} className="text-neutral-400 group-hover:text-neutral-700 transition-colors mb-1" />
                      <span className="text-[10px] font-bold text-neutral-400 group-hover:text-neutral-900 uppercase tracking-tight">Add Proof</span>
                    </div>
                  </label>
                </div>
              </div>

              {parseFloat(installmentAmount) > ((artwork.price || 0) - (sale.downpayment || 0) - (sale.installments || []).reduce((sum, inst) => sum + inst.amount, 0)) + 0.01 && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-sm flex items-start gap-2">
                  <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs font-bold text-red-600">
                    payment is higher than the outstanding balance. admin approval is mandatory.
                  </p>
                </div>
              )}
              
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-sm flex items-start gap-2">
                <Shield size={16} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs font-bold text-indigo-600 uppercase">
                  All installments require admin confirmation. This will be sent to the Payment Approval tab.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-100">
              <button
                onClick={() => {
                  setModalMode('none');
                  setInstallmentAttachments([]);
                }}
                className="px-6 py-2.5 rounded-sm text-neutral-500 font-bold text-sm hover:bg-neutral-50 transition-all"
              >
                Cancel
              </button>
              <button
                disabled={!installmentAmount || parseFloat(installmentAmount) <= 0 || installmentAttachments.length === 0}
                onClick={() => {
                  const amt = parseFloat(installmentAmount);
                  if (onAddInstallment) {
                    wrapAction(async () => {
                      await onAddInstallment(sale.id, amt, installmentDate, installmentReference, installmentAttachments);
                      setModalMode('none');
                      setInstallmentAmount('');
                      setInstallmentReference('');
                      setInstallmentAttachments([]);
                    }, 'Submitting for Admin Approval...');
                  }
                }}
                className="px-8 py-2.5 bg-neutral-900 text-white rounded-sm font-bold shadow-lg shadow-neutral-200 hover:shadow-neutral-400 hover:-translate-y-0.5 transition-all disabled:opacity-50"
              >
                Submit for Approval
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modalMode === 'edit-payment' && editingPayment && (
        <Modal onClose={() => setModalMode('none')} title={`Edit ${editingPayment.type === 'downpayment' ? 'Downpayment' : 'Installment'}`}>
          <div className="space-y-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Amount <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">₱</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="w-full pl-8 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm font-black text-neutral-900"
                  value={editingPayment.amount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    const parts = val.split('.');
                    if (parts.length > 2) parts.splice(2);
                    setEditingPayment({ ...editingPayment, amount: parts.join('.') });
                  }}
                />
              </div>
            </div>

            {editingPayment.type === 'installment' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Date Received <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm font-bold text-neutral-900"
                    value={editingPayment.date}
                    onChange={(e) => setEditingPayment({ ...editingPayment, date: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Reference No.</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm font-bold text-neutral-900"
                    value={editingPayment.reference}
                    onChange={(e) => setEditingPayment({ ...editingPayment, reference: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-100">
              <button
                onClick={() => setModalMode('none')}
                className="px-6 py-2.5 rounded-sm text-neutral-500 font-bold text-sm hover:bg-neutral-50 transition-all"
              >
                Cancel
              </button>
              <button
                disabled={!editingPayment.amount || parseFloat(editingPayment.amount) <= 0}
                onClick={() => {
                  const amt = parseFloat(editingPayment.amount);
                  if (onEditPayment && sale) {
                    onEditPayment(sale.id, editingPayment.id, {
                      amount: amt,
                      date: editingPayment.date,
                      reference: editingPayment.reference
                    });
                    setModalMode('none');
                  }
                }}
                className="px-8 py-2.5 bg-neutral-900 text-white rounded-sm font-black text-sm shadow-lg shadow-neutral-200 active:scale-95 transition-all"
              >
                {(() => {
                  const createdAt = editingPayment.type === 'downpayment' ? sale?.downpaymentRecordedAt : (sale?.installments?.find(i => i.id === editingPayment.id)?.createdAt);
                  const isNew = createdAt && (new Date().getTime() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000);
                  const isAdmin = userRole === UserRole.ADMIN;
                  return (isNew || isAdmin) ? 'Update Payment' : 'Request Approval';
                })()}
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
              <input type="text" placeholder="Full Client Name" required className="w-full px-5 py-3 bg-neutral-50 border-0 rounded-sm text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:bg-neutral-50 hover:bg-neutral-100 transition-all" value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Client Email (Optional)</label>
              <input type="email" placeholder="client@example.com" className="w-full px-5 py-3 bg-neutral-50 border-0 rounded-sm text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:bg-neutral-50 hover:bg-neutral-100 transition-all" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Contact Number <span className="text-red-500">*</span></label>
              <input type="text" placeholder="+63 912 345 6789" required className="w-full px-5 py-3 bg-neutral-50 border-0 rounded-sm text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:bg-neutral-50 hover:bg-neutral-100 transition-all" value={clientContact} onChange={(e) => setClientContact(e.target.value)} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-sm border border-neutral-100 group hover:bg-neutral-100 transition-all cursor-pointer" onClick={() => setIsDownpayment(!isDownpayment)}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-sm flex items-center justify-center transition-all ${isDownpayment ? 'bg-neutral-900 text-white shadow-lg' : 'bg-white text-neutral-400 border border-neutral-200'}`}>
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-neutral-900">Installment Sale</p>
                    <p className="text-[10px] font-bold text-neutral-500">Enable downpayment & balance tracking</p>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-md transition-all relative ${isDownpayment ? 'bg-neutral-900' : 'bg-neutral-200'}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-sm bg-white transition-all ${isDownpayment ? 'right-1' : 'left-1'}`} />
                </div>
              </div>

              {isDownpayment ? (
                <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Initial Downpayment Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-sm">₱</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0.00"
                      className="w-full pl-8 pr-5 py-3 bg-white border border-neutral-200 rounded-sm text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:bg-neutral-50 transition-all"
                      value={saleDownpayment}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, '');
                        const parts = val.split('.');
                        if (parts.length > 2) parts.splice(2);
                        if (parts[0] && parts[0].length > 1) parts[0] = parts[0].replace(/^0+/, '') || '0';
                        setSaleDownpayment(parts.join('.'));
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-sm flex items-start gap-3">
                  <Shield size={18} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-[11px] font-black text-indigo-900 uppercase tracking-tight">Full Payment Mode</p>
                    <p className="text-[10px] font-medium text-indigo-700 leading-relaxed">
                      This sale will be treated as a single full payment. Outstanding balance metrics will be hidden until the sale is approved by admin.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Event / Auction (Optional)</label>
              <select
                className="w-full px-5 py-3 bg-neutral-50 border-0 rounded-sm text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:bg-neutral-50 hover:bg-neutral-100 transition-all"
                value={saleEventId}
                onChange={(e) => setSaleEventId(e.target.value)}
              >
                <option value="">Direct Sale (No Event)</option>
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

            {/* Delivery Toggle */}
            <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-sm border border-neutral-100 group hover:bg-neutral-100 transition-all cursor-pointer" onClick={() => setSaleDelivered(!saleDelivered)}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-sm flex items-center justify-center transition-all ${saleDelivered ? 'bg-neutral-900 text-white shadow-lg' : 'bg-white text-neutral-400 border border-neutral-200'}`}>
                  <Tag size={20} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-neutral-900">Mark as Delivered</p>
                  <p className="text-[10px] font-bold text-neutral-500">Require IT/DR + RSA attachments</p>
                </div>
              </div>
              <div className={`w-12 h-6 rounded-md transition-all relative ${saleDelivered ? 'bg-neutral-900' : 'bg-neutral-200'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-sm bg-white transition-all ${saleDelivered ? 'right-1' : 'left-1'}`} />
              </div>
            </div>

            {/* Sale Attachments */}
            <div className="space-y-4 pt-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                Attachments <span className="text-red-500 font-bold normal-case">(Required for Sale)</span>
              </label>

              <div className="flex p-1 bg-neutral-100 rounded-sm">
                <button
                  onClick={() => setActiveSaleAttachmentTab('itdr')}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all ${activeSaleAttachmentTab === 'itdr' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'}`}
                >
                  IT/DR {saleDelivered && <span className="text-red-500 ml-1">*</span>}
                </button>
                <button
                  onClick={() => setActiveSaleAttachmentTab('rsa')}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all ${activeSaleAttachmentTab === 'rsa' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'}`}
                >
                  RSA / AR <span className="text-red-500 ml-1">*</span>
                </button>
                <button
                  onClick={() => setActiveSaleAttachmentTab('orcr')}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all ${activeSaleAttachmentTab === 'orcr' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'}`}
                >
                  OR / CR
                </button>
              </div>

              <div className="relative">                {(() => {
                const rawImages = activeSaleAttachmentTab === 'itdr' ? saleItdr : activeSaleAttachmentTab === 'rsa' ? saleRsa : saleOrcr;
                const currentImages = Array.isArray(rawImages) ? rawImages : (rawImages ? [rawImages] : []);
                const setCurrImages = activeSaleAttachmentTab === 'itdr' ? setSaleItdr : activeSaleAttachmentTab === 'rsa' ? setSaleRsa : setSaleOrcr;

                return (
                  <div className="grid grid-cols-2 gap-4">
                    {currentImages.map((imgUrl, index) => (
                      <div key={index} className="relative group rounded-md overflow-hidden shadow-md ring-1 ring-neutral-100 h-32">
                        <img src={imgUrl} className="w-full h-full object-cover" alt="Attachment" />
                        <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                          <button
                            onClick={() => setCurrImages(prev => prev.filter((_, i) => i !== index))}
                            className="px-4 py-2 bg-white text-neutral-700 rounded-sm text-xs font-bold shadow-lg hover:bg-neutral-100 transition-colors flex items-center gap-2"
                          >
                            <Trash2 size={14} /> Remove
                          </button>
                        </div>
                        <div className="absolute top-2 right-2 bg-neutral-900 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-sm shadow-sm">
                          {activeSaleAttachmentTab.toUpperCase()} Attached
                        </div>
                      </div>
                    ))}

                    <label className="flex flex-col items-center justify-center w-full h-32 bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-md cursor-pointer hover:bg-white hover:border-neutral-300 hover:shadow-lg hover:shadow-neutral-500/10 transition-all group">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          try {
                            const resizedDataUrl = await new Promise<string>((resolve, reject) => {
                              const img = new Image();
                              img.onload = () => {
                                const maxW = 1200;
                                const maxH = 1200;
                                const w = img.width;
                                const h = img.height;
                                const scale = Math.min(maxW / w, maxH / h, 1);
                                const canvas = document.createElement('canvas');
                                canvas.width = Math.round(w * scale);
                                canvas.height = Math.round(h * scale);
                                const ctx = canvas.getContext('2d');
                                if (!ctx) {
                                  reject(new Error('Canvas not available'));
                                  return;
                                }
                                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                                resolve(canvas.toDataURL('image/jpeg', 0.8));
                              };
                              img.onerror = () => reject(new Error('Failed to load image'));
                              img.src = URL.createObjectURL(file);
                            });
                            setCurrImages(prev => [...prev, resizedDataUrl]);
                          } catch (err) {
                            console.error('Compression failed:', err);
                            const reader = new FileReader();
                            reader.onload = (ev) => setCurrImages(prev => [...prev, ev.target?.result as string]);
                            reader.readAsDataURL(file);
                          } finally {
                            e.target.value = '';
                          }
                        }}
                      />
                      <div className="p-3 bg-white rounded-sm shadow-sm mb-2 group-hover:scale-110 transition-transform ring-1 ring-neutral-100">
                        <Upload size={20} className="text-neutral-400 group-hover:text-neutral-700 transition-colors" />
                      </div>
                      <span className="text-xs font-bold text-neutral-500 group-hover:text-neutral-900 transition-colors">Add Attachment</span>
                    </label>
                  </div>
                );
              })()}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button onClick={() => setModalMode('none')} className="px-6 py-2.5 rounded-md text-neutral-600 font-bold hover:bg-neutral-100 transition-all transform hover:-translate-y-0.5">Cancel</button>
              <button
                onClick={() => {
                  if (clientName && clientContact && saleRsa.length > 0 && (!saleDelivered || saleItdr.length > 0)) wrapAction(async () => {
                    const selectedEvent = events.find(e => e.id === saleEventId);
                    const eventInfo = selectedEvent ? { id: selectedEvent.id, name: selectedEvent.title } : undefined;
                    const downpaymentAmount = (isDownpayment && saleDownpayment) ? parseFloat(saleDownpayment) : undefined;
                    await onSale(artwork.id, clientName, clientEmail, clientContact, saleDelivered, eventInfo, saleAttachment, saleItdr.length > 0 ? saleItdr : undefined, saleRsa.length > 0 ? saleRsa : undefined, saleOrcr.length > 0 ? saleOrcr : undefined, downpaymentAmount, isDownpayment);
                    setModalMode('none');
                    setSaleAttachment(''); // Reset attachment
                    setSaleItdr([]);
                    setSaleRsa([]);
                    setSaleOrcr([]);
                    setSaleDownpayment('');
                    setIsDownpayment(false);
                    setSaleDelivered(false);
                    setClientName('');
                    setClientEmail('');
                    setClientContact('');
                  }, 'Processing Sale...', ArtworkStatus.SOLD);
                }}
                className="px-8 py-2.5 bg-neutral-900 text-white rounded-md font-bold shadow-lg shadow-neutral-200 hover:shadow-neutral-300 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!clientName || !clientContact || saleRsa.length === 0 || (saleDelivered && saleItdr.length === 0)}
              >
                Confirm Sale
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modalMode === 'certificate' && sale && <CertificateModal artwork={artwork} sale={sale} onClose={() => setModalMode('none')} />}





      {showRsaPreview && (
        <Modal onClose={() => setShowRsaPreview(false)} title="RSA / AR Preview" maxWidth="max-w-3xl">
          <div className="space-y-4">
            {(() => {
              const urls = parseAttachmentString(artwork.rsaImageUrl);
              return (
                <div className={urls.length > 1 ? 'grid grid-cols-2 gap-3' : ''}>
                  {urls.map((url, i) => (
                    <img key={i} src={url} alt={`RSA/AR ${i + 1}`}
                      className="w-full h-auto rounded-sm cursor-zoom-in hover:opacity-95 transition-opacity shadow-sm border border-neutral-100"
                      onClick={() => window.open(url, '_blank')} title="Click to view full size" />
                  ))}
                </div>
              );
            })()}
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-neutral-400">Click image to open in new tab</span>
              <div className="flex space-x-3">
                <button onClick={() => setShowRsaPreview(false)} className="px-6 py-2.5 rounded-sm text-neutral-600 font-medium hover:bg-neutral-100 transition-colors">Close</button>
                <button onClick={handlePrintRsa} className="px-8 py-2.5 bg-neutral-900 text-white rounded-sm font-bold shadow-lg shadow-neutral-200 hover:shadow-neutral-400 hover:-translate-y-0.5 transition-all">Print Document</button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {showOrCrPreview && (
        <Modal onClose={() => setShowOrCrPreview(false)} title="OR / CR Preview" maxWidth="max-w-3xl">
          <div className="space-y-4">
            {(() => {
              const urls = parseAttachmentString(artwork.orCrImageUrl);
              return (
                <div className={urls.length > 1 ? 'grid grid-cols-2 gap-3' : ''}>
                  {urls.map((url, i) => (
                    <img key={i} src={url} alt={`OR/CR ${i + 1}`}
                      className="w-full h-auto rounded-sm cursor-zoom-in hover:opacity-95 transition-opacity shadow-sm border border-neutral-100"
                      onClick={() => window.open(url, '_blank')} title="Click to view full size" />
                  ))}
                </div>
              );
            })()}
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-neutral-400">Click image to open in new tab</span>
              <div className="flex space-x-3">
                <button onClick={() => setShowOrCrPreview(false)} className="px-6 py-2.5 rounded-sm text-neutral-600 font-medium hover:bg-neutral-100 transition-colors">Close</button>
                <button onClick={handlePrintOrCr} className="px-8 py-2.5 bg-neutral-900 text-white rounded-sm font-bold shadow-lg shadow-neutral-200 hover:shadow-neutral-400 hover:-translate-y-0.5 transition-all">Print Document</button>
              </div>
            </div>
          </div>
        </Modal>
      )}



      {/* Log Details Modal */}
      {showLogDetails && selectedLog && (
        <Modal onClose={() => setShowLogDetails(false)} title="Activity Log Details" maxWidth="max-w-2xl">
          <div className="space-y-6">
            <div className="flex items-center space-x-4 pb-6 border-b border-neutral-100">
              <div className={`w-12 h-12 rounded-md flex items-center justify-center text-white shadow-md ${(selectedLog.action.includes('Sale') || selectedLog.action.includes('Sold')) ? 'bg-red-600' :
                selectedLog.action.includes('Delivered') ? 'bg-indigo-500' :
                  selectedLog.action.includes('Transfer') ? 'bg-emerald-500' :
                    selectedLog.action.includes('Reserved') ? 'bg-amber-500' :
                      selectedLog.action.includes('Cancelled') ? 'bg-neutral-500' : 'bg-blue-500'
                }`}>
                {(selectedLog.action.includes('Sale') || selectedLog.action.includes('Sold')) ? <Gavel size={24} /> :
                  selectedLog.action.includes('Transfer') ? <div className="w-6 h-6">{ICONS.Transfers}</div> :
                    selectedLog.action.includes('Reserved') ? <Bookmark size={24} /> :
                      <FileSpreadsheet size={24} />}
              </div>
              <div>
                <h4 className="text-lg font-bold text-neutral-900">{selectedLog.action}</h4>
                <p className="text-sm text-neutral-500">{new Date(selectedLog.timestamp).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'medium' })}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-neutral-50 p-4 rounded-sm border border-neutral-100">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">User / Author</p>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-sm bg-neutral-200 flex items-center justify-center text-[10px] font-bold text-neutral-600">
                    {selectedLog.user.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-bold text-neutral-700">{selectedLog.user}</span>
                </div>
              </div>

              <div className="bg-neutral-50 p-4 rounded-sm border border-neutral-100">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Details</p>
                <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{selectedLog.details || 'No additional details provided.'}</p>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setShowLogDetails(false)}
                  className="px-6 py-2.5 bg-neutral-900 text-white rounded-sm font-bold shadow-lg shadow-neutral-200 hover:shadow-neutral-400 hover:-translate-y-0.5 transition-all"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Global Loading Overlay */}
      <LoadingOverlay
        isVisible={isProcessing}
        title={processMessage}
        message="Please wait while we sync your changes..."
        progress={{ current: processProgress, total: 100 }}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
      />
    </div>

  );
};

const ActionButton: React.FC<{ label: string, icon: React.ReactNode, variant?: string, disabled?: boolean, onClick: () => void }> = React.memo(({ label, icon, variant, disabled, onClick }) => {
  const styles = {
    default: 'bg-white hover:bg-neutral-50 text-neutral-900 border-neutral-200 shadow-sm',
    amber: 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200 shadow-sm',
    yellow: 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200 shadow-sm',
    indigo: 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200 shadow-sm',
    emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm',
    rose: 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200 shadow-sm',
    slate: 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200 shadow-sm',
    neutral: 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200 shadow-sm',
  };
  const activeStyle = variant ? styles[variant as keyof typeof styles] : styles.default;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`relative z-10 w-full flex items-center justify-between px-5 py-3 rounded-xl font-bold text-[13px] border transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:active:scale-100 ${activeStyle}`}
    >
      <div className="flex items-center space-x-3.5">
        <span className="text-neutral-500 group-hover:text-neutral-900 transition-colors">{icon}</span>
        <span className="truncate tracking-tight">{label}</span>
      </div>
      <ChevronDown className="w-4 h-4 opacity-20 flex-shrink-0 -rotate-90" />
    </button>
  );
});

const Modal: React.FC<{ children: React.ReactNode, onClose: () => void, title: string, footer?: React.ReactNode, maxWidth?: string, variant?: 'default' | 'sharp' }> = ({ children, onClose, title, footer, maxWidth = 'max-w-lg', variant = 'default' }) => {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`bg-white w-full ${maxWidth} max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200 rounded-2xl overflow-hidden`}>
        <div className="px-6 py-5 flex justify-between items-center bg-white border-b border-neutral-100 flex-shrink-0">
          <h3 className="text-lg font-black text-neutral-900 tracking-tight truncate pr-4">{title}</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 transition-colors p-1 hover:bg-neutral-50 rounded-full">
            <XCircle size={22} />
          </button>
        </div>
        <div className="overflow-y-auto custom-scrollbar flex-1 p-6 md:p-8 bg-white">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 bg-neutral-50/50 border-t border-neutral-100 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

const ConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  onConfirm: () => void;
  confirmLabel?: string;
  variant?: 'danger' | 'warning' | 'info' | 'emerald';
}> = ({ isOpen, onClose, title, message, onConfirm, confirmLabel = 'Confirm', variant = 'info' }) => {
  if (!isOpen) return null;

  const colors = {
    danger: 'bg-neutral-900 hover:bg-neutral-900 shadow-neutral-200',
    warning: 'bg-neutral-800 hover:bg-neutral-900 shadow-neutral-200',
    info: 'bg-neutral-600 hover:bg-neutral-700 shadow-neutral-200',
    emerald: 'bg-neutral-900 hover:bg-neutral-800 shadow-neutral-200'
  };

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-md w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 sm:p-8 text-center space-y-4">
          <div className={`w-12 h-12 sm:w-16 h-16 mx-auto rounded-full flex items-center justify-center bg-neutral-100 text-neutral-600`}>
            <AlertTriangle size={28} className="sm:w-8 sm:h-8" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-neutral-900">{title}</h3>
            <p className="text-xs sm:text-sm text-neutral-500 mt-2">{message}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button onClick={onClose} className="flex-1 px-4 py-3 rounded-sm text-xs sm:text-sm text-neutral-600 font-bold bg-neutral-50 hover:bg-neutral-100 transition-colors order-2 sm:order-1">Cancel</button>
            <button onClick={() => { onConfirm(); onClose(); }} className={`flex-1 px-4 py-3 rounded-sm text-xs sm:text-sm text-white font-bold shadow-lg transition-all transform hover:-translate-y-0.5 order-1 sm:order-2 ${colors[variant || 'info']}`}>{confirmLabel}</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

const StatusBadge: React.FC<{ status: ArtworkStatus }> = ({ status }) => {
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
  return <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm whitespace-nowrap ${styles[status] || 'bg-neutral-100 text-neutral-900 border-neutral-200'}`}>{displayText}</span>;
};

export default MasterView;
