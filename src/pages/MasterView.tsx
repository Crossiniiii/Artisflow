
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
import { XCircle, Bookmark, Edit, Paperclip, ChevronDown, Trash2, RotateCcw, AlertTriangle, AlertCircle, Upload, Tag, Archive, Wrench, Gavel, FileSpreadsheet, Download, FileText, Package, Image as ImageIcon, Clock, Calendar, Home, ArrowRight, Plus, ChevronLeft, LayoutDashboard, Box, Truck, ShoppingCart, PackageCheck, MessageSquare, ArrowRightLeft } from 'lucide-react';
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
  onAddInstallment?: (saleId: string, amount: number, date: string, reference?: string) => void;
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
  const [installmentProof, setInstallmentProof] = useState<string[]>([]);

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
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      {/* Navigation & Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-5">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-500 hover:text-neutral-900"
            title="Back to Previous Tab"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="h-8 w-px bg-neutral-200 mx-1 hidden sm:block" />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Artwork Record</h1>
              <StatusBadge status={displayStatus} />
            </div>
            <div className="flex items-center space-x-2 mt-0.5 text-neutral-400">
              <span className="text-[10px] uppercase tracking-wider font-bold">System ID:</span>
              <span className="text-xs font-mono text-neutral-500">{artwork.id.split('-')[0]}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {currentUser?.role === UserRole.ADMIN && onDelete && (
            <button
              onClick={() => {
                setConfirmModal({
                  isOpen: true,
                  title: 'Delete Artwork',
                  message: 'Are you sure you want to permanently delete this artwork? This action cannot be undone.',
                  confirmLabel: 'Delete Permanently',
                  variant: 'danger',
                  onConfirm: () => wrapAction(() => onDelete(artwork.id), 'Deleting Artwork...')
                });
              }}
              className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
              title="Delete Record"
            >
              <Trash2 size={20} />
            </button>
          )}
          <button className="flex items-center space-x-2 px-4 py-2.5 bg-neutral-900 text-white rounded-lg text-[13px] font-semibold hover:bg-black transition-all shadow-sm active:scale-95">
            <Download size={16} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          {/* Artwork Detail Card */}
          <div className="bg-white rounded-xl shadow-xl shadow-neutral-200/40 overflow-hidden border border-neutral-200 relative animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row">
              {/* Image Section */}
              <div className="w-full md:w-[380px] aspect-square bg-neutral-50 relative group flex-shrink-0 border-r border-neutral-100">
                <OptimizedImage
                  src={artwork.imageUrl || undefined}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  alt={artwork.title}
                  fallback={
                    <div className="w-full h-full flex flex-col items-center justify-center text-neutral-300">
                      <ImageIcon size={48} strokeWidth={1} />
                      <span className="text-[10px] font-bold mt-4 uppercase tracking-widest">No Preview Available</span>
                    </div>
                  }
                  {...(artwork.imageUrl ? { onClick: () => setShowImagePreview(true) } : {})}
                  containerClassName={artwork.imageUrl ? 'w-full h-full cursor-zoom-in' : 'w-full h-full'}
                />
                <div className="absolute top-4 left-4">
                  <div className="px-3 py-1 bg-white/90 backdrop-blur-sm shadow-sm rounded-lg border border-white/20">
                    <span className="text-[10px] font-bold text-neutral-800 uppercase tracking-widest">Master File</span>
                  </div>
                </div>
              </div>

              {/* Info Section */}
              <div className="flex-1 p-8 lg:p-10 flex flex-col">
                <div className="space-y-1 mb-10">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">{artwork.artist || 'Unknown Artist'}</p>
                  <h2 className="text-4xl font-bold text-neutral-900 leading-tight tracking-tight">{artwork.title}</h2>
                  <p className="text-neutral-400 font-medium italic text-base">{artwork.year || 'Date not specified'}</p>
                </div>

                <div className="grid grid-cols-2 gap-y-8 gap-x-10 mb-10">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Medium</p>
                    <div className="flex items-center space-x-2.5 text-neutral-700">
                      <LayoutDashboard size={14} className="text-neutral-400" />
                      <p className="text-sm font-semibold">{artwork.medium || 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Dimensions</p>
                    <div className="flex items-center space-x-2.5 text-neutral-700">
                      <Box size={14} className="text-neutral-400" />
                      <p className="text-sm font-semibold">{artwork.dimensions || 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Valuation</p>
                    <div className="flex items-center space-x-2.5 text-neutral-900">
                      <Tag size={14} className="text-emerald-500" />
                      <p className="text-xl font-bold tracking-tight">₱{(artwork.price || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Current Location</p>
                    <div className="flex items-center space-x-2.5 text-neutral-700">
                      <Home size={14} className="text-neutral-400" />
                      <p className="text-sm font-semibold truncate">{displayBranch || 'Warehouse'}</p>
                    </div>
                  </div>
                </div>

                {/* Financial Status Card (if sold) */}
                {sale?.downpayment && !sale.isCancelled && (
                  <div className="mt-auto p-5 bg-rose-50/30 rounded-xl border border-rose-100/50">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <ShoppingCart size={16} className="text-rose-500" />
                        <h4 className="text-xs font-bold text-rose-900 uppercase tracking-widest">Active Sale Information</h4>
                      </div>
                      <StatusBadge status={displayStatus} />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-rose-400 uppercase tracking-tight">Paid Amount</p>
                        <p className="text-lg font-bold text-rose-700">₱{(sale.downpayment || 0).toLocaleString()}</p>
                      </div>

                      {(() => {
                        const balance = (artwork.price || 0) -
                          (sale.downpayment || 0) -
                          (sale.installments || []).filter(i => !i.isPending).reduce((sum, inst) => sum + inst.amount, 0);
                        const isFullyPaid = balance <= 0;

                        return (
                          <div className="space-y-1">
                            <p className={`text-[10px] font-bold uppercase tracking-tight ${isFullyPaid ? 'text-emerald-400' : 'text-red-400'}`}>
                              {isFullyPaid ? 'Paid in Full' : 'Outstanding'}
                            </p>
                            <p className={`text-lg font-bold ${isFullyPaid ? 'text-emerald-700' : 'text-red-700'}`}>
                              ₱{balance.toLocaleString()}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {!sale?.downpayment && (
                  <div className="mt-auto pt-8 border-t border-neutral-100 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex -space-x-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="w-8 h-8 rounded-full bg-neutral-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-neutral-400">
                            {String.fromCharCode(64 + i)}
                          </div>
                        ))}
                      </div>
                      <span className="text-[11px] text-neutral-400 font-medium uppercase tracking-wider italic">Managed by Inventory Personnel</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-neutral-300 hover:text-neutral-600 transition-colors"><MessageSquare size={18} /></button>
                      <button className="p-2 text-neutral-300 hover:text-neutral-600 transition-colors"><FileText size={18} /></button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* History Timeline Container */}
          <div className="bg-white p-8 rounded-xl border border-neutral-200 shadow-xl shadow-neutral-200/20">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-neutral-100 rounded-lg"><History size={20} className="text-neutral-600" /></div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">Activity & Audit Trail</h3>
                  <p className="text-xs text-neutral-400">Complete historical logs for this record</p>
                </div>
              </div>
              <div className="flex items-center p-1 bg-neutral-50 rounded-lg border border-neutral-200">
                <button
                  onClick={() => setTimelineView('activity')}
                  className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-md transition-all ${timelineView === 'activity' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
                >
                  Activity
                </button>
                <button
                  onClick={() => setTimelineView('transfers')}
                  className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-md transition-all ${timelineView === 'transfers' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
                >
                  Transfers
                </button>
                <button
                  onClick={() => setTimelineView('payments')}
                  className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-md transition-all ${timelineView === 'payments' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
                >
                  Payments
                </button>
              </div>
            </div>

            {timelineView === 'activity' && (
              <div className="space-y-0 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-100">
                {effectiveLogs.map((log) => (
                  <div
                    key={log.id}
                    onClick={() => {
                      setSelectedLog(log);
                      setShowLogDetails(true);
                    }}
                    className="relative pl-10 pb-8 last:pb-0 group cursor-pointer"
                  >
                    <div className={`absolute left-0 top-1 w-[22px] h-[22px] rounded-full border-4 border-white shadow-sm z-10 transition-transform group-hover:scale-110 ${(log.action.includes('Sale') || log.action.includes('Sold')) ? 'bg-rose-500' :
                      log.action.includes('Delivered') ? 'bg-indigo-500' :
                        log.action.includes('Transfer') ? 'bg-emerald-500' :
                          log.action.includes('Reserved') ? 'bg-amber-500' :
                            log.action.includes('Cancelled') ? 'bg-neutral-500' : 'bg-blue-500'
                      }`}></div>
                    <div className="bg-neutral-50/0 group-hover:bg-neutral-50/80 p-3 rounded-xl transition-colors -m-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-bold text-neutral-900">{log.action}</p>
                        <time className="text-[10px] text-neutral-400 font-medium">{new Date(log.timestamp).toLocaleString()}</time>
                      </div>
                      <p className="text-xs text-neutral-500 line-clamp-1 group-hover:line-clamp-none transition-all">{log.details || 'System event recorded'}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Auth: {log.user}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {timelineView === 'transfers' && (
              <div className="space-y-6">
                {transferLogs.length === 0 ? (
                  <div className="text-center py-10">
                    <Truck size={32} className="mx-auto text-neutral-200 mb-3" />
                    <p className="text-sm text-neutral-400 font-medium">No transfer history recorded.</p>
                  </div>
                ) : (
                  <div className="space-y-0 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-100">
                    {transferLogs.map((log) => (
                      <div
                        key={log.id}
                        onClick={() => {
                          setSelectedLog(log);
                          setShowLogDetails(true);
                        }}
                        className="relative pl-10 pb-8 last:pb-0 group cursor-pointer"
                      >
                        <div className="absolute left-0 top-1 w-[22px] h-[22px] rounded-full border-4 border-white shadow-sm z-10 transition-transform group-hover:scale-110 bg-emerald-500"></div>
                        <div className="bg-neutral-50/0 group-hover:bg-neutral-50/80 p-3 rounded-xl transition-colors -m-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-bold text-neutral-900">{log.details || 'Artwork Transferred'}</p>
                            <time className="text-[10px] text-neutral-400 font-medium">{new Date(log.timestamp).toLocaleString()}</time>
                          </div>
                          <p className="text-xs text-neutral-400 uppercase tracking-widest font-bold">Authorized by {log.user}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {timelineView === 'payments' && (
              <div className="space-y-4">
                {(!sale?.downpayment && (sale?.installments?.length || 0) === 0) ? (
                  <div className="text-center py-10">
                    <Tag size={32} className="mx-auto text-neutral-200 mb-3" />
                    <p className="text-sm text-neutral-400 font-medium">No payment history recorded.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sale?.downpayment && (
                      <div className="flex items-center justify-between p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                            <ArrowRight size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-neutral-900">Initial Downpayment</p>
                              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-black uppercase tracking-widest">Verified</span>
                            </div>
                            <p className="text-xs text-neutral-500">{new Date(sale.soldAt || '').toLocaleDateString()}</p>
                          </div>
                        </div>
                        <p className="text-base font-black text-emerald-700">₱{sale.downpayment.toLocaleString()}</p>
                      </div>
                    )}

                    {sale?.installments?.map((inst) => (
                      <div key={inst.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${inst.isPending ? 'bg-amber-50/50 border-amber-100' : 'bg-neutral-50/50 border-neutral-100'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${inst.isPending ? 'bg-amber-100 text-amber-600' : 'bg-neutral-100 text-neutral-600'}`}>
                            {inst.proofImage ? (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const url = Array.isArray(inst.proofImage) ? inst.proofImage[0] : inst.proofImage;
                                  if (url) window.open(url, '_blank');
                                }}
                                className="w-full h-full rounded-lg overflow-hidden border border-neutral-200 hover:scale-105 transition-transform"
                              >
                                <img src={Array.isArray(inst.proofImage) ? inst.proofImage[0] : inst.proofImage} alt="Receipt" className="w-full h-full object-cover" />
                              </button>
                            ) : (
                              <Clock size={18} />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-neutral-900">Installment Payment</p>
                              {inst.isPending ? (
                                <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-black uppercase tracking-widest animate-pulse">Pending Approval</span>
                              ) : (
                                <span className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded font-black uppercase tracking-widest">Verified</span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-500">
                              {new Date(inst.date).toLocaleDateString()} • Ref: {inst.reference || 'None'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-base font-black ${inst.isPending ? 'text-amber-700' : 'text-neutral-900'}`}>₱{inst.amount.toLocaleString()}</p>
                          <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest">By {inst.recordedBy}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Operations Panel */}
        <div className="lg:col-span-1 space-y-6 sticky top-8">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xl shadow-neutral-200/30 overflow-hidden">
            <div className="px-6 py-5 border-b border-neutral-100 bg-neutral-50/50">
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Wrench size={18} className="text-neutral-400" />
                Operations Panel
              </h3>
            </div>

            <div className="p-6 space-y-6">
              {/* Declined Sale Alert */}
              {sale?.status === 'Declined' && sale.requestedAttachments && sale.requestedAttachments.length > 0 && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-rose-600">
                    <AlertTriangle size={16} />
                    <h4 className="text-[10px] font-bold uppercase tracking-widest">Re-upload Required</h4>
                  </div>
                  <p className="text-xs text-rose-700 italic bg-white/60 p-2.5 rounded-lg border border-rose-100/50">
                    "{sale.declineReason || 'Attachments need correction.'}"
                  </p>
                  <button
                    onClick={() => {
                      setTempItdr(parseAttachmentString(artwork.itdrImageUrl));
                      setTempRsa(parseAttachmentString(artwork.rsaImageUrl));
                      setTempOrcr(parseAttachmentString(artwork.orCrImageUrl));
                      setModalMode('attach-unified');
                    }}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Upload size={14} />
                    Resubmit Attachments
                  </button>
                </div>
              )}

              {/* Action Buttons Grid */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mb-4">Core Actions</p>

                {userPermissions?.canEditArtwork && (
                  <ActionButton
                    label="Edit Properties"
                    icon={<Edit size={18} />}
                    variant="emerald"
                    disabled={isStatusTransitioning}
                    onClick={() => setModalMode('edit')}
                  />
                )}

                {userPermissions?.canTransferArtwork && (
                  <ActionButton
                    label="Transfer Branch"
                    icon={<ArrowRightLeft size={18} />}
                    disabled={isStatusTransitioning || !(displayStatus === ArtworkStatus.AVAILABLE || displayStatus === ArtworkStatus.EXCLUSIVE_VIEW_ONLY)}
                    onClick={() => setModalMode('transfer')}
                  />
                )}

                {userPermissions?.canReserveArtwork && (
                  <ActionButton
                    label={displayStatus === ArtworkStatus.RESERVED ? "Modify Reservation" : "Reserve Artwork"}
                    icon={<Bookmark size={18} />}
                    variant="yellow"
                    disabled={isStatusTransitioning || (displayStatus !== ArtworkStatus.AVAILABLE && displayStatus !== ArtworkStatus.RESERVED)}
                    onClick={() => {
                      if (displayStatus === ArtworkStatus.RESERVED && onCancelReservation) {
                        setConfirmModal({
                          isOpen: true,
                          title: 'Cancel Reservation',
                          message: 'Are you sure you want to cancel this reservation? The artwork will become Available.',
                          variant: 'warning',
                          confirmLabel: 'Cancel Reservation',
                          onConfirm: async () => {
                            setOptimisticArtworkState({ status: ArtworkStatus.AVAILABLE, remarks: '', reservationExpiry: undefined });
                            const success = await wrapAction(() => onCancelReservation(artwork.id), 'Cancelling Reservation...', ArtworkStatus.AVAILABLE);
                            if (!success) { setOptimisticArtwork(null); setPendingViewState(null); }
                          }
                        });
                      } else {
                        setModalMode('reserve');
                      }
                    }}
                  />
                )}

                <div className="h-px bg-neutral-100 my-4" />
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mb-4">Sales & Returns</p>

                {userPermissions?.canSellArtwork && (
                  <ActionButton
                    label="Declare Sale"
                    icon={<ShoppingCart size={18} />}
                    variant="amber"
                    disabled={isStatusTransitioning || (displayStatus !== ArtworkStatus.AVAILABLE && displayStatus !== ArtworkStatus.RESERVED)}
                    onClick={() => setModalMode('sale')}
                  />
                )}

                {userPermissions?.canSellArtwork && displayStatus === ArtworkStatus.SOLD && (
                  <ActionButton
                    label="Mark Delivered"
                    icon={<PackageCheck size={18} />}
                    variant="indigo"
                    disabled={isStatusTransitioning}
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
                )}

                {displayStatus === ArtworkStatus.SOLD && sale?.downpayment && !sale.isCancelled && onAddInstallment && (
                  <ActionButton
                    label="Post Payment"
                    icon={<FileText size={18} />}
                    variant="emerald"
                    disabled={isStatusTransitioning}
                    onClick={() => { setInstallmentAmount(''); setInstallmentReference(''); setModalMode('installment'); }}
                  />
                )}

                {onReturn && userPermissions?.canEditArtwork && (
                  <ActionButton
                    label="Return to Artist"
                    icon={<RotateCcw size={18} />}
                    variant="slate"
                    disabled={isStatusTransitioning || isImmutable || displayStatus === ArtworkStatus.RESERVED}
                    onClick={() => setModalMode('return')}
                  />
                )}

                {onSendToFramer && userPermissions?.canEditArtwork && (
                  <ActionButton
                    label="Send to Framer"
                    icon={<Wrench size={18} />}
                    variant="slate"
                    disabled={isStatusTransitioning || isImmutable || displayStatus === ArtworkStatus.RESERVED}
                    onClick={() => setModalMode('framer')}
                  />
                )}

                {displayStatus === ArtworkStatus.FOR_RETOUCH && onReturnToGallery && (
                  <ActionButton
                    label="Return to Gallery"
                    icon={<Archive size={18} />}
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
                    icon={<Archive size={18} />}
                    variant="emerald"
                    disabled={isStatusTransitioning}
                    onClick={() => {
                      setReturnBranch(displayBranch || branches[0]);
                      setModalMode('framer-return');
                    }}
                  />
                )}

                {onAddToAuction && userPermissions?.canManageEvents && displayStatus === ArtworkStatus.AVAILABLE && (
                  <ActionButton
                    label="Add to Auction"
                    icon={<Gavel size={18} />}
                    variant="indigo"
                    disabled={isStatusTransitioning || isImmutable}
                    onClick={() => setModalMode('auction')}
                  />
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-neutral-50/50 border-t border-neutral-100">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Documentation</span>
                <div className="flex gap-1.5">
                  <button onClick={() => setModalMode('certificate')} className="p-2 bg-white border border-neutral-200 rounded-lg text-neutral-600 hover:text-neutral-900 transition-colors shadow-sm"><FileText size={14} /></button>
                  <button onClick={handlePrintItdr} className="p-2 bg-white border border-neutral-200 rounded-lg text-neutral-600 hover:text-neutral-900 transition-colors shadow-sm"><Download size={14} /></button>
                </div>
              </div>
            </div>
          </div>

          {/* Location Badge (Floating) */}
          <div className="p-4 bg-white rounded-xl border border-neutral-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg"><Home size={16} className="text-blue-600" /></div>
              <div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none mb-1">Assigned Branch</p>
                <p className="text-sm font-bold text-neutral-900">{displayBranch || 'Main Gallery'}</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-neutral-300" />
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
                            <img src={img} className="w-full h-full object-cover" alt={`${activeDeliveryAttachmentTab.toUpperCase()} ${i+1}`} />
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
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                  Payment Receipt <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {installmentProof.map((imgUrl, index) => (
                    <div key={index} className="relative group rounded-md overflow-hidden shadow-md ring-1 ring-neutral-100 h-40">
                      <img src={imgUrl} className="w-full h-full object-cover" alt="Receipt" />
                      <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                        <button
                          onClick={() => setInstallmentProof(prev => prev.filter((_, i) => i !== index))}
                          className="px-4 py-2 bg-white text-neutral-700 rounded-sm text-xs font-bold shadow-lg hover:bg-neutral-100 transition-colors flex items-center gap-2"
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      </div>
                    </div>
                  ))}

                  {installmentProof.length === 0 && (
                    <label className="flex flex-col items-center justify-center w-full h-40 bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-md cursor-pointer hover:bg-white hover:border-neutral-300 hover:shadow-lg hover:shadow-neutral-500/10 transition-all group">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const reader = new FileReader();
                            reader.onload = (ev) => setInstallmentProof([ev.target?.result as string]);
                            reader.readAsDataURL(file);
                          } finally {
                            e.target.value = '';
                          }
                        }}
                      />
                      <div className="p-3 bg-white rounded-sm shadow-sm mb-2 group-hover:scale-110 transition-transform ring-1 ring-neutral-100">
                        <Upload size={20} className="text-neutral-400 group-hover:text-neutral-700 transition-colors" />
                      </div>
                      <span className="text-xs font-bold text-neutral-500 group-hover:text-neutral-900 transition-colors">Upload Receipt Proof</span>
                      <p className="text-[10px] text-neutral-400 mt-1 uppercase tracking-widest font-black">Mandatory for Approval</p>
                    </label>
                  )}
                </div>
              </div>

              {parseFloat(installmentAmount) > ((artwork.price || 0) - (sale.downpayment || 0) - (sale.installments || []).reduce((sum, inst) => sum + inst.amount, 0)) + 0.01 && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-sm flex items-start gap-2">
                  <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs font-bold text-red-600">
                    needs approval from the admin, payment is higher than the original price.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-100">
              <button
                onClick={() => setModalMode('none')}
                className="px-6 py-2.5 rounded-sm text-neutral-500 font-bold text-sm hover:bg-neutral-50 transition-all"
              >
                Cancel
              </button>
              <button
                disabled={!installmentAmount || parseFloat(installmentAmount) <= 0 || installmentProof.length === 0}
                onClick={() => {
                  const amt = parseFloat(installmentAmount);
                  const totalPaid = (sale.downpayment || 0) + (sale.installments || []).reduce((sum, inst) => sum + inst.amount, 0);
                  const balance = (artwork.price || 0) - totalPaid;
                  const isOverpayment = amt > balance + 0.01;
                  
                  const isApprovalRequired = userRole !== UserRole.ADMIN;
                  
                  if (onAddInstallment) {
                    wrapAction(async () => {
                      await onAddInstallment(sale.id, amt, installmentDate, installmentReference, installmentProof);
                      setModalMode('none');
                      setInstallmentProof([]);
                    }, isApprovalRequired ? 'Submitting Payment for Approval...' : 'Recording Payment...');
                  }
                }}
                className={`px-8 py-2.5 rounded-sm font-black text-sm shadow-lg active:scale-95 transition-all ${
                  (parseFloat(installmentAmount) > ((artwork.price || 0) - (sale.downpayment || 0) - (sale.installments || []).reduce((sum, inst) => sum + inst.amount, 0)) + 0.01)
                    ? 'bg-red-600 text-white shadow-red-200'
                    : 'bg-neutral-900 text-white shadow-neutral-200'
                } disabled:opacity-50`}
              >
                {userRole !== UserRole.ADMIN
                  ? 'Submit for Approval'
                  : 'Record Payment'
                }
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

            <div className="space-y-1">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Downpayment (Optional)</label>
              <input 
                type="text" 
                inputMode="numeric"
                placeholder="0.00" 
                className="w-full px-5 py-3 bg-neutral-50 border-0 rounded-sm text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:bg-neutral-50 hover:bg-neutral-100 transition-all" 
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
                    const downpaymentAmount = saleDownpayment ? parseFloat(saleDownpayment) : undefined;
                    await onSale(artwork.id, clientName, clientEmail, clientContact, saleDelivered, eventInfo, saleAttachment, saleItdr.length > 0 ? saleItdr : undefined, saleRsa.length > 0 ? saleRsa : undefined, saleOrcr.length > 0 ? saleOrcr : undefined, downpaymentAmount);
                    setModalMode('none');
                    setSaleAttachment(''); // Reset attachment
                    setSaleItdr([]);
                    setSaleRsa([]);
                    setSaleOrcr([]);
                    setSaleDownpayment('');
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
    default: 'bg-white hover:bg-neutral-50 text-neutral-700 border-neutral-200',
    emerald: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200',
    rose: 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200',
    amber: 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200',
    yellow: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200',
    indigo: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200',
    slate: 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200',
    neutral: 'bg-white hover:bg-neutral-50 text-neutral-600 border-neutral-200',
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
      className={`group w-full flex items-center justify-between px-4 py-2.5 rounded-lg font-semibold text-[13px] border transition-all duration-200 hover:shadow-sm active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:active:scale-100 ${activeStyle}`}
    >
      <div className="flex items-center space-x-3">
        <span className="text-neutral-500 group-hover:text-neutral-900 transition-colors">{icon}</span>
        <span className="truncate tracking-tight">{label}</span>
      </div>
      <ChevronDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-50 transition-opacity -rotate-90" />
    </button>
  );
});

const Modal: React.FC<{ children: React.ReactNode, onClose: () => void, title: string, footer?: React.ReactNode, maxWidth?: string, variant?: 'default' | 'sharp' }> = ({ children, onClose, title, footer, maxWidth = 'max-w-lg', variant = 'default' }) => {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 animate-in fade-in duration-200">
      <div className={`bg-white w-full ${maxWidth} max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 rounded-xl overflow-hidden border border-neutral-200`}>
        <div className="px-6 py-4 flex justify-between items-center bg-white border-b border-neutral-100 flex-shrink-0">
          <h3 className="text-base font-bold text-neutral-900 tracking-tight truncate pr-4">{title}</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 transition-colors p-1.5 hover:bg-neutral-100 rounded-lg">
            <XCircle size={20} />
          </button>
        </div>
        <div className="overflow-y-auto custom-scrollbar flex-1 p-6 bg-white">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 bg-neutral-50/80 border-t border-neutral-100 flex-shrink-0">
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

  const colorStyles = {
    danger: 'bg-rose-600 hover:bg-rose-700 shadow-rose-200',
    warning: 'bg-amber-500 hover:bg-amber-600 shadow-amber-200',
    info: 'bg-neutral-900 hover:bg-black shadow-neutral-200',
    emerald: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
  };

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-neutral-200">
        <div className="p-8 text-center space-y-6">
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center bg-neutral-50 text-neutral-400`}>
            <AlertTriangle size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-neutral-900">{title}</h3>
            <p className="text-sm text-neutral-500 leading-relaxed">{message}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-6 py-2.5 rounded-lg text-sm text-neutral-600 font-semibold bg-neutral-50 hover:bg-neutral-100 transition-colors order-2 sm:order-1">Cancel</button>
            <button onClick={() => { onConfirm(); onClose(); }} className={`flex-1 px-6 py-2.5 rounded-lg text-sm text-white font-semibold shadow-lg transition-all active:scale-95 order-1 sm:order-2 ${colorStyles[variant]}`}>{confirmLabel}</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

const StatusBadge: React.FC<{ status: ArtworkStatus }> = ({ status }) => {
  const styles: Record<string, string> = {
    [ArtworkStatus.AVAILABLE]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    [ArtworkStatus.RESERVED]: 'bg-slate-100 text-slate-700 border-slate-300',
    [ArtworkStatus.SOLD]: 'bg-rose-50 text-rose-700 border-rose-200',
    [ArtworkStatus.DELIVERED]: 'bg-neutral-50 text-neutral-600 border-neutral-200',
    [ArtworkStatus.CANCELLED]: 'bg-neutral-100 text-neutral-400 border-neutral-200',
    [ArtworkStatus.FOR_RETOUCH]: 'bg-orange-50 text-orange-700 border-orange-200 border-dashed',
    [ArtworkStatus.FOR_FRAMING]: 'bg-blue-50 text-blue-700 border-blue-200',
    [ArtworkStatus.EXCLUSIVE_VIEW_ONLY]: 'bg-purple-50 text-purple-700 border-purple-200',
    'RETURNED': 'bg-neutral-50 text-neutral-500 border-neutral-200',
  };
  const displayText = status === ArtworkStatus.EXCLUSIVE_VIEW_ONLY ? 'NOT FOR SALE' : status;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-sm whitespace-nowrap transition-colors ${styles[status] || 'bg-neutral-50 text-neutral-600 border-neutral-200'}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 opacity-70 ${
        status === ArtworkStatus.AVAILABLE ? 'bg-emerald-500' :
        status === ArtworkStatus.RESERVED ? 'bg-slate-500' :
        status === ArtworkStatus.SOLD ? 'bg-rose-500' :
        'bg-neutral-400'
      }`} />
      {displayText}
    </span>
  );
};

export default MasterView;
