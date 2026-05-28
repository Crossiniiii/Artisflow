
import React, { useState, useMemo, useEffect } from 'react';
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
  TransferRequest,
  SaleStatus
} from '../types';
import { ICONS } from '../constants';
import CertificateModal from '../components/CertificateModal';
import { ActionResultModal } from '../components/modals/ActionResultModal';
import { XCircle, CheckCircle, Bookmark, Edit, Paperclip, ChevronDown, Trash2, RotateCcw, AlertTriangle, AlertCircle, Upload, Tag, Archive, Wrench, Gavel, FileSpreadsheet, Download, FileText, Package, Image as ImageIcon, Clock, Calendar, Home, ArrowRight, ArrowLeft, Plus, Shield, ShoppingCart, User } from 'lucide-react';
import LoadingOverlay from '../components/LoadingOverlay';
import { OptimizedImage } from '../components/OptimizedImage';
import { parseAttachmentString } from '../utils/attachmentUtils';
import { useMasterViewDerived } from '../hooks/useMasterViewDerived';
import { useActionProcessing } from '../hooks/useActionProcessing';
import DeliveryFinalizationModal from '../components/modals/DeliveryFinalizationModal';
import DeliveryRequestModal from '../components/modals/DeliveryRequestModal';
import { SalesDeclarationModal } from '../components/masterView/SalesDeclarationModal';
import { BranchTransferModal } from '../components/masterView/BranchTransferModal';
import { ReservationSetupModal } from '../components/masterView/ReservationSetupModal';
import { EditArtworkModal } from '../components/masterView/EditArtworkModal';
import { ReturnToArtistModal } from '../components/masterView/ReturnToArtistModal';
import { SendToFramerModal } from '../components/masterView/SendToFramerModal';
import { FramerReturnModal } from '../components/masterView/FramerReturnModal';
import { RetouchReturnModal } from '../components/masterView/RetouchReturnModal';
import { AddToAuctionModal } from '../components/masterView/AddToAuctionModal';
import { AttachUnifiedModal } from '../components/masterView/AttachUnifiedModal';
import { InstallmentModal } from '../components/masterView/InstallmentModal';
import { EditPaymentModal } from '../components/masterView/EditPaymentModal';
import { DeliveryAttachModal } from '../components/masterView/DeliveryAttachModal';
import { TransferApprovalModal } from '../components/masterView/TransferApprovalModal';
import { ActionButton } from '../components/masterView/ActionButton';
import { MasterViewModal as Modal } from '../components/masterView/MasterViewModal';
import { ConfirmationModal } from '../components/masterView/ConfirmationModal';
import { StatusBadge } from '../components/masterView/StatusBadge';
import { AttachmentPreviewModal } from '../components/masterView/AttachmentPreviewModal';
import { LogDetailsModal } from '../components/masterView/LogDetailsModal';
import { DeliveryOptionsModal } from '../components/masterView/DeliveryOptionsModal';
import { getArtworkClassification } from '../services/inventoryService';
import { ArtworkDetailPanel } from '../components/masterView/ArtworkDetailPanel';
import { ArtworkTimeline } from '../components/masterView/ArtworkTimeline';
import { OperationsPanel } from '../components/masterView/OperationsPanel';
import { MasterViewModalsOverlay } from '../components/masterView/MasterViewModalsOverlay';

interface MasterViewProps {
  artwork: Artwork;
  branches: string[];
  logs: ActivityLog[];
  sale?: SaleRecord;
  userRole: UserRole;
  userBranch?: string;
  userPermissions?: UserPermissions;
  onTransfer?: (id: string, destination: Branch, attachments?: { itdrUrl?: string | string[] }, remarks?: string) => void;
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
    isDownpayment?: boolean,
    remarks?: string,
    discountPercentage?: number,
    discountedPrice?: number
  ) => void;
  onCancelSale: (id: string) => void;
  onDeliver: (id: string, itdr?: string | string[], rsa?: string | string[], orcr?: string | string[], carrier?: string, referenceNumber?: string, remarks?: string) => void;
  onEdit: (updates: Partial<Artwork>) => void;
  onBack: () => void;
  // Note: We'd ideally pass events here for the dropdown, assuming it's managed in App state
  events?: ExhibitionEvent[];
  onReserve?: (id: string, details: string, expiryDate?: string, eventId?: string, eventName?: string, remarks?: string) => Promise<boolean | void> | boolean | void;
  onReservationComplete?: () => void;
  onCancelReservation?: (id: string) => Promise<boolean | void> | boolean | void;
  onDelete?: (id: string) => void;
  onReturn?: (id: string, reason: string, refNumber?: string, proofImage?: string | string[], remarks?: string, type?: ReturnType) => Promise<boolean | void> | boolean | void;
  onReturnToGallery?: (recordId: string, branch: string, resolvedAt?: string, remarks?: string) => Promise<boolean | void> | boolean | void;
  onSendToFramer?: (id: string, damageDetails: string, attachmentUrl?: string | string[]) => Promise<boolean | void> | boolean | void;
  onReturnFromFramer?: (recordId: string, branch: string, resolvedAt?: string, remarks?: string) => Promise<boolean | void> | boolean | void;
  onAddToAuction?: (artworkIds: string[], auctionId: string, name: string, remarks?: string) => Promise<boolean | void> | boolean | void;
  onNavigateTo?: (tab: string, view?: string) => void;
  framerRecords?: FramerRecord[];
  returnRecords?: ReturnRecord[];
  onAddInstallment?: (saleId: string, amount: number, date: string, reference?: string, attachments?: string[], remarks?: string) => void;
  onEditPayment?: (saleId: string, paymentId: string, updates: { amount: number; date?: string; reference?: string; attachmentUrls?: string[] }) => void;
  onApprovePaymentEdit?: (saleId: string, paymentId: string, remarks?: string) => void;
  onDeclinePaymentEdit?: (saleId: string, paymentId: string, remarks?: string) => void;
  onApproveRequest?: (saleId: string, remarks: string) => void;
  onDeclineRequest?: (saleId: string, reason: string) => void;
  transferRequests?: TransferRequest[];
  onAcceptTransfer?: (request: TransferRequest, remarks?: string) => void;
  onDeclineTransfer?: (request: TransferRequest, remarks?: string) => void;
  onHoldTransfer?: (request: TransferRequest, remarks?: string) => void;
  onUpdateSale?: (id: string, updates: Partial<SaleRecord>) => void;
  initialModalMode?: 'transfer' | 'sale' | 'reserve' | 'certificate' | 'edit' | 'attach-unified' | 'return' | 'framer' | 'framer-return' | 'retouch-return' | 'auction' | 'delivery-attach' | 'none' | 'installment' | 'edit-payment';
}

const MasterView: React.FC<MasterViewProps> = ({
  artwork, branches, logs, sale, userRole, userBranch, userPermissions, onTransfer, onSale, onCancelSale, onDeliver, onReturn, onReturnToGallery, onSendToFramer, onReturnFromFramer, onEdit, onBack, events = [], onReserve, onReservationComplete, onCancelReservation, onDelete, onAddToAuction, onNavigateTo,
  framerRecords = [], returnRecords = [], onAddInstallment, onEditPayment, onApprovePaymentEdit, onDeclinePaymentEdit,
  transferRequests = [], onAcceptTransfer, onDeclineTransfer, onHoldTransfer, onUpdateSale, initialModalMode = 'none'
}) => {
  const pendingTransferRequest = useMemo(() => {
    return transferRequests.find(r => String(r.artworkId) === String(artwork.id) && r.status === 'Pending');
  }, [transferRequests, artwork.id]);

  const canApproveTransfer = useMemo(() => {
    if (!pendingTransferRequest) return false;
    if (userRole === UserRole.ADMIN) return true;
    return userBranch === pendingTransferRequest.toBranch;
  }, [pendingTransferRequest, userRole, userBranch]);
  const [modalMode, setModalMode] = useState<'transfer' | 'sale' | 'reserve' | 'certificate' | 'edit' | 'attach-unified' | 'return' | 'framer' | 'framer-return' | 'retouch-return' | 'auction' | 'delivery-attach' | 'none' | 'installment' | 'edit-payment'>(initialModalMode);
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

  const [showDeliveryFinalizeModal, setShowDeliveryFinalizeModal] = useState(false);
  const [showDeliveryRequestModal, setShowDeliveryRequestModal] = useState(false);
  const [showDeliveryOptionsModal, setShowDeliveryOptionsModal] = useState(false);
  const [transferApprovalModal, setTransferApprovalModal] = useState<{ mode: 'accept' | 'decline' | 'hold', request: TransferRequest } | null>(null);


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

  const [timelineView, setTimelineView] = useState<'activity' | 'transfers' | 'payments'>('activity');
  const [showItdrPreview, setShowItdrPreview] = useState(false);
  const [showRsaPreview, setShowRsaPreview] = useState(false);
  const [showOrCrPreview, setShowOrCrPreview] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
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


  // Parse reservation info for organized display
  const reservationInfo = useMemo(() => {
    if (displayStatus !== ArtworkStatus.RESERVED) return null;

    const remarks = artwork.remarks || '';
    let type = 'Standard';
    let target = 'Unknown';
    let notes = '';

    // Check for new structured format: Type: ... | Target: ... | Notes: ...
    if (remarks.includes('Type:')) {
      const typeMatch = remarks.match(/Type:\s*([^|]+)/);
      const targetMatch = remarks.match(/Target:\s*([^|]+)/) || remarks.match(/Event:\s*([^|]+)/) || remarks.match(/Client:\s*([^|]+)/);
      const notesMatch = remarks.match(/Notes:\s*(.*)$/);

      type = typeMatch ? typeMatch[1].trim() : 'Standard';
      target = targetMatch ? targetMatch[1].trim() : 'Unknown';
      notes = notesMatch ? notesMatch[1].trim() : '';
    }
    // Check for bracketed auction format: [Reserved For Auction: Leon Gallery]
    else if (remarks.startsWith('[Reserved For Auction:')) {
      type = 'Auction';
      const targetMatch = remarks.match(/Auction:\s*([^\]]+)/);
      target = targetMatch ? targetMatch[1].trim() : (artwork.reservedForEventName || 'Leon Gallery');
      notes = '';
    }
    else if (remarks.startsWith('[Auction:')) {
      type = 'Auction';
      const targetMatch = remarks.match(/Auction:\s*([^\]]+)/);
      target = targetMatch ? targetMatch[1].trim() : (artwork.reservedForEventName || 'Leon Gallery');
      const notesAfter = remarks.split(']')[1];
      notes = notesAfter ? notesAfter.trim() : '';
    } else {
      // Fallback for unstructured remarks that might still represent a reservation
      target = artwork.reservedForEventName || 'Unknown';
      notes = remarks;
    }

    return { type, target, expiry: artwork.reservationExpiry, notes };
  }, [displayStatus, artwork.remarks, artwork.reservationExpiry, artwork.reservedForEventName]);

  const staffRemarks = useMemo(() => {
    const raw = artwork.remarks || '';
    if (!raw) return '';
    if (reservationInfo) return reservationInfo.notes;
    return raw;
  }, [artwork.remarks, reservationInfo]);


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



  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            className="group flex items-center justify-center w-10 h-10 rounded-full bg-white border border-neutral-200 text-neutral-500 hover:text-neutral-900 hover:border-neutral-900 transition-all shadow-sm active:scale-95 shrink-0"
            title="Go Back"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" strokeWidth={2.5} />
          </button>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-center sm:justify-end">
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Master File ID: {artwork.id}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8 p-2 sm:p-0">
        <div className="lg:col-span-2 space-y-4 md:space-y-8">
          <ArtworkDetailPanel
            artwork={artwork}
            displayStatus={displayStatus}
            displayBranch={displayBranch}
            sale={sale}
            onEditPayment={onEditPayment}
            setEditingPayment={setEditingPayment}
            setModalMode={setModalMode}
            userRole={userRole}
            onApprovePaymentEdit={onApprovePaymentEdit}
            onDeclinePaymentEdit={onDeclinePaymentEdit}
            reservationInfo={reservationInfo}
            staffRemarks={staffRemarks}
            setShowImagePreview={setShowImagePreview}
          />
          <ArtworkTimeline
            timelineView={timelineView}
            setTimelineView={setTimelineView}
            activityFilter={activityFilter}
            setActivityFilter={setActivityFilter}
            sale={sale}
            effectiveLogs={effectiveLogs}
            transferLogs={transferLogs}
            setSelectedLog={setSelectedLog}
            setShowLogDetails={setShowLogDetails}
            artwork={artwork}
          />
        </div>

        <OperationsPanel
          canApproveTransfer={canApproveTransfer}
          pendingTransferRequest={pendingTransferRequest}
          setTransferApprovalModal={setTransferApprovalModal}
          sale={sale}
          setModalMode={setModalMode}
          userPermissions={userPermissions}
          displayStatus={displayStatus}
          artwork={artwork}
          isStatusTransitioning={isStatusTransitioning}
          isImmutable={isImmutable}
          onDelete={onDelete}
          onReturn={onReturn}
          onSendToFramer={onSendToFramer}
          onReturnToGallery={onReturnToGallery}
          onReturnFromFramer={onReturnFromFramer}
          onAddToAuction={onAddToAuction}
          onCancelReservation={onCancelReservation}
          onAddInstallment={onAddInstallment}
          onCancelSale={onCancelSale}
          canGenerateCert={!!canGenerateCert}
          setShowItdrPreview={setShowItdrPreview}
          setShowRsaPreview={setShowRsaPreview}
          setShowOrCrPreview={setShowOrCrPreview}
          setConfirmModal={setConfirmModal}
          wrapAction={wrapAction}
          setOptimisticArtworkState={setOptimisticArtworkState}
          setOptimisticArtwork={setOptimisticArtwork}
          setPendingViewState={setPendingViewState}
          setShowDeliveryOptionsModal={setShowDeliveryOptionsModal}
        />
      </div>

      <MasterViewModalsOverlay
        modalMode={modalMode}
        setModalMode={setModalMode}
        artwork={artwork}
        activeFramerRecord={activeFramerRecord}
        activeRetouchRecord={activeRetouchRecord}
        branches={branches}
        onReturnFromFramer={onReturnFromFramer}
        onTransfer={onTransfer}
        isProcessing={isProcessing}
        wrapAction={wrapAction}
        setOptimisticArtworkState={setOptimisticArtworkState}
        setOptimisticArtwork={setOptimisticArtwork}
        setPendingViewState={setPendingViewState}
        onReturnToGallery={onReturnToGallery}
        onEdit={onEdit}
        onReturn={onReturn}
        onSendToFramer={onSendToFramer}
        showItdrPreview={showItdrPreview}
        setShowItdrPreview={setShowItdrPreview}
        showImagePreview={showImagePreview}
        setShowImagePreview={setShowImagePreview}
        events={events}
        onReserve={onReserve}
        onNavigateTo={onNavigateTo}
        onAddToAuction={onAddToAuction}
        onReservationComplete={onReservationComplete}
        transferApprovalModal={transferApprovalModal}
        onAcceptTransfer={onAcceptTransfer}
        onHoldTransfer={onHoldTransfer}
        onDeclineTransfer={onDeclineTransfer}
        setTransferApprovalModal={setTransferApprovalModal}
        sale={sale}
        onAddInstallment={onAddInstallment}
        editingPayment={editingPayment}
        userRole={userRole}
        onEditPayment={onEditPayment}
        onSale={onSale}
        showRsaPreview={showRsaPreview}
        setShowRsaPreview={setShowRsaPreview}
        showOrCrPreview={showOrCrPreview}
        setShowOrCrPreview={setShowOrCrPreview}
        showLogDetails={showLogDetails}
        setShowLogDetails={setShowLogDetails}
        selectedLog={selectedLog}
        processMessage={processMessage}
        processProgress={processProgress}
        confirmModal={confirmModal}
        setConfirmModal={setConfirmModal}
        showDeliveryFinalizeModal={showDeliveryFinalizeModal}
        setShowDeliveryFinalizeModal={setShowDeliveryFinalizeModal}
        showDeliveryRequestModal={showDeliveryRequestModal}
        setShowDeliveryRequestModal={setShowDeliveryRequestModal}
        showDeliveryOptionsModal={showDeliveryOptionsModal}
        setShowDeliveryOptionsModal={setShowDeliveryOptionsModal}
        onDeliver={onDeliver}
        onUpdateSale={onUpdateSale}
      />
    </div>

  );
};



export default MasterView;
