import React from 'react';
import {
  Artwork,
  ArtworkStatus,
  ActivityLog,
  SaleRecord,
  UserRole,
  ExhibitionEvent,
  UserPermissions,
  FramerRecord,
  ReturnRecord,
  TransferRequest
} from '../../types';
import CertificateModal from '../CertificateModal';
import LoadingOverlay from '../LoadingOverlay';
import DeliveryFinalizationModal from '../modals/DeliveryFinalizationModal';
import DeliveryRequestModal from '../modals/DeliveryRequestModal';
import { SalesDeclarationModal } from './SalesDeclarationModal';
import { BranchTransferModal } from './BranchTransferModal';
import { ReservationSetupModal } from './ReservationSetupModal';
import { EditArtworkModal } from './EditArtworkModal';
import { ReturnToArtistModal } from './ReturnToArtistModal';
import { SendToFramerModal } from './SendToFramerModal';
import { FramerReturnModal } from './FramerReturnModal';
import { RetouchReturnModal } from './RetouchReturnModal';
import { AddToAuctionModal } from './AddToAuctionModal';
import { AttachUnifiedModal } from './AttachUnifiedModal';
import { InstallmentModal } from './InstallmentModal';
import { EditPaymentModal } from './EditPaymentModal';
import { DeliveryAttachModal } from './DeliveryAttachModal';
import { TransferApprovalModal } from './TransferApprovalModal';
import { ConfirmationModal } from './ConfirmationModal';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import { LogDetailsModal } from './LogDetailsModal';
import { DeliveryOptionsModal } from './DeliveryOptionsModal';

interface MasterViewModalsOverlayProps {
  modalMode: 'transfer' | 'sale' | 'reserve' | 'certificate' | 'edit' | 'attach-unified' | 'return' | 'framer' | 'framer-return' | 'retouch-return' | 'auction' | 'delivery-attach' | 'none' | 'installment' | 'edit-payment';
  setModalMode: React.Dispatch<React.SetStateAction<any>>;
  artwork: Artwork;
  activeFramerRecord: FramerRecord | null;
  activeRetouchRecord: ReturnRecord | null;
  branches: string[];
  onReturnFromFramer?: (recordId: string, branch: string, resolvedAt?: string, remarks?: string) => Promise<boolean | void> | boolean | void;
  onTransfer?: (id: string, destination: string, attachments?: { itdrUrl?: string | string[] }, remarks?: string) => void;
  isProcessing: boolean;
  wrapAction: any;
  setOptimisticArtworkState: (updates: Partial<Artwork>) => void;
  setOptimisticArtwork: React.Dispatch<React.SetStateAction<Artwork | null>>;
  setPendingViewState: React.Dispatch<React.SetStateAction<{ status?: ArtworkStatus; currentBranch?: string } | null>>;
  onReturnToGallery?: (recordId: string, branch: string, resolvedAt?: string, remarks?: string) => Promise<boolean | void> | boolean | void;
  onEdit: (updates: Partial<Artwork>) => void;
  onReturn?: (id: string, reason: string, refNumber?: string, proofImage?: string | string[], remarks?: string, type?: any) => Promise<boolean | void> | boolean | void;
  onSendToFramer?: (id: string, damageDetails: string, attachmentUrl?: string | string[]) => Promise<boolean | void> | boolean | void;
  showItdrPreview: boolean;
  setShowItdrPreview: React.Dispatch<React.SetStateAction<boolean>>;
  showImagePreview: boolean;
  setShowImagePreview: React.Dispatch<React.SetStateAction<boolean>>;
  events: ExhibitionEvent[];
  onReserve?: (id: string, details: string, expiryDate?: string, eventId?: string, eventName?: string, remarks?: string) => Promise<boolean | void> | boolean | void;
  onNavigateTo?: (tab: string, view?: string) => void;
  onAddToAuction?: (artworkIds: string[], auctionId: string, name: string, remarks?: string) => Promise<boolean | void> | boolean | void;
  onReservationComplete?: () => void;
  transferApprovalModal: { mode: 'accept' | 'decline' | 'hold', request: TransferRequest } | null;
  onAcceptTransfer?: (request: TransferRequest, remarks?: string) => void;
  onHoldTransfer?: (request: TransferRequest, remarks?: string) => void;
  onDeclineTransfer?: (request: TransferRequest, remarks?: string) => void;
  setTransferApprovalModal: React.Dispatch<React.SetStateAction<{ mode: 'accept' | 'decline' | 'hold', request: TransferRequest } | null>>;
  sale?: SaleRecord;
  onAddInstallment?: (saleId: string, amount: number, date: string, reference?: string, attachments?: string[], remarks?: string) => void;
  editingPayment: { id: string; amount: string; date: string; reference: string; type: 'downpayment' | 'installment' } | null;
  userRole: UserRole;
  onEditPayment?: (saleId: string, paymentId: string, updates: { amount: number; date?: string; reference?: string; attachmentUrls?: string[] }) => void;
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
  showRsaPreview: boolean;
  setShowRsaPreview: React.Dispatch<React.SetStateAction<boolean>>;
  showOrCrPreview: boolean;
  setShowOrCrPreview: React.Dispatch<React.SetStateAction<boolean>>;
  showLogDetails: boolean;
  setShowLogDetails: React.Dispatch<React.SetStateAction<boolean>>;
  selectedLog: ActivityLog | null;
  processMessage: string;
  processProgress: number;
  confirmModal: any;
  setConfirmModal: React.Dispatch<React.SetStateAction<any>>;
  showDeliveryFinalizeModal: boolean;
  setShowDeliveryFinalizeModal: React.Dispatch<React.SetStateAction<boolean>>;
  showDeliveryRequestModal: boolean;
  setShowDeliveryRequestModal: React.Dispatch<React.SetStateAction<boolean>>;
  showDeliveryOptionsModal: boolean;
  setShowDeliveryOptionsModal: React.Dispatch<React.SetStateAction<boolean>>;
  onDeliver: (id: string, itdr?: string | string[], rsa?: string | string[], orcr?: string | string[], carrier?: string, referenceNumber?: string, remarks?: string) => void;
  onUpdateSale?: (id: string, updates: Partial<SaleRecord>) => void;
}

export const MasterViewModalsOverlay: React.FC<MasterViewModalsOverlayProps> = ({
  modalMode,
  setModalMode,
  artwork,
  activeFramerRecord,
  activeRetouchRecord,
  branches,
  onReturnFromFramer,
  onTransfer,
  isProcessing,
  wrapAction,
  setOptimisticArtworkState,
  setOptimisticArtwork,
  setPendingViewState,
  onReturnToGallery,
  onEdit,
  onReturn,
  onSendToFramer,
  showItdrPreview,
  setShowItdrPreview,
  showImagePreview,
  setShowImagePreview,
  events,
  onReserve,
  onNavigateTo,
  onAddToAuction,
  onReservationComplete,
  transferApprovalModal,
  onAcceptTransfer,
  onHoldTransfer,
  onDeclineTransfer,
  setTransferApprovalModal,
  sale,
  onAddInstallment,
  editingPayment,
  userRole,
  onEditPayment,
  onSale,
  showRsaPreview,
  setShowRsaPreview,
  showOrCrPreview,
  setShowOrCrPreview,
  showLogDetails,
  setShowLogDetails,
  selectedLog,
  processMessage,
  processProgress,
  confirmModal,
  setConfirmModal,
  showDeliveryFinalizeModal,
  setShowDeliveryFinalizeModal,
  showDeliveryRequestModal,
  setShowDeliveryRequestModal,
  showDeliveryOptionsModal,
  setShowDeliveryOptionsModal,
  onDeliver,
  onUpdateSale
}) => {
  return (
    <>
      {modalMode === 'framer-return' && (
        <FramerReturnModal
          artwork={artwork}
          activeFramerRecord={activeFramerRecord}
          branches={branches}
          onReturnFromFramer={onReturnFromFramer}
          onTransfer={onTransfer}
          onClose={() => setModalMode('none')}
          isProcessing={isProcessing}
          wrapAction={wrapAction}
          setOptimisticArtworkState={setOptimisticArtworkState}
          setOptimisticArtwork={setOptimisticArtwork}
          setPendingViewState={setPendingViewState}
        />
      )}

      {modalMode === 'retouch-return' && (
        <RetouchReturnModal
          artwork={artwork}
          activeRetouchRecord={activeRetouchRecord}
          branches={branches}
          onReturnToGallery={onReturnToGallery}
          onTransfer={onTransfer}
          onClose={() => setModalMode('none')}
          isProcessing={isProcessing}
          wrapAction={wrapAction}
          setOptimisticArtworkState={setOptimisticArtworkState}
          setOptimisticArtwork={setOptimisticArtwork}
          setPendingViewState={setPendingViewState}
        />
      )}
      {modalMode === 'delivery-attach' && (
        <DeliveryAttachModal
          artwork={artwork}
          onDeliver={onDeliver}
          onClose={() => setModalMode('none')}
          wrapAction={wrapAction}
        />
      )}

      {modalMode === 'edit' && (
        <EditArtworkModal
          artwork={artwork}
          branches={branches}
          onEdit={onEdit}
          onClose={() => setModalMode('none')}
          wrapAction={wrapAction}
        />
      )}
      {modalMode === 'return' && (
        <ReturnToArtistModal
          artwork={artwork}
          onReturn={onReturn}
          onClose={() => setModalMode('none')}
          isProcessing={isProcessing}
          wrapAction={wrapAction}
          setOptimisticArtworkState={setOptimisticArtworkState}
          setOptimisticArtwork={setOptimisticArtwork}
          setPendingViewState={setPendingViewState}
        />
      )}

      {modalMode === 'framer' && (
        <SendToFramerModal
          artwork={artwork}
          onSendToFramer={onSendToFramer}
          onClose={() => setModalMode('none')}
          isProcessing={isProcessing}
          wrapAction={wrapAction}
          setOptimisticArtworkState={setOptimisticArtworkState}
          setOptimisticArtwork={setOptimisticArtwork}
          setPendingViewState={setPendingViewState}
        />
      )}

      {modalMode === 'attach-unified' && (
        <AttachUnifiedModal
          artwork={artwork}
          onEdit={onEdit}
          onClose={() => setModalMode('none')}
          wrapAction={wrapAction}
        />
      )}
      {showItdrPreview && artwork.itdrImageUrl && (
        <AttachmentPreviewModal type="itdr" imageUrl={artwork.itdrImageUrl} onClose={() => setShowItdrPreview(false)} />
      )}
      {showImagePreview && (
        <AttachmentPreviewModal type="itdr" imageUrl={artwork.imageUrl} onClose={() => setShowImagePreview(false)} />
      )}
      {modalMode === 'transfer' && (
        <BranchTransferModal
          artwork={artwork}
          branches={branches}
          onTransfer={onTransfer}
          onClose={() => setModalMode('none')}
          wrapAction={wrapAction}
        />
      )}

      {modalMode === 'reserve' && (
        <ReservationSetupModal
          artwork={artwork}
          events={events}
          onReserve={onReserve}
          onClose={() => setModalMode('none')}
          onNavigateTo={onNavigateTo}
          onAddToAuction={onAddToAuction}
          onReservationComplete={onReservationComplete}
          wrapAction={wrapAction}
        />
      )}

      {transferApprovalModal && (
        <TransferApprovalModal
          transferApprovalModal={transferApprovalModal}
          onAcceptTransfer={onAcceptTransfer}
          onHoldTransfer={onHoldTransfer}
          onDeclineTransfer={onDeclineTransfer}
          onClose={() => setTransferApprovalModal(null)}
          isProcessing={isProcessing}
          wrapAction={wrapAction}
        />
      )}

      {modalMode === 'auction' && (
        <AddToAuctionModal
          artwork={artwork}
          events={events}
          onAddToAuction={onAddToAuction}
          onNavigateTo={onNavigateTo}
          onClose={() => setModalMode('none')}
          wrapAction={wrapAction}
        />
      )}

      {modalMode === 'installment' && sale && (
        <InstallmentModal
          artwork={artwork}
          sale={sale}
          onAddInstallment={onAddInstallment}
          onClose={() => setModalMode('none')}
          wrapAction={wrapAction}
        />
      )}

      {modalMode === 'edit-payment' && editingPayment && (
        <EditPaymentModal
          editingPayment={editingPayment}
          sale={sale || null}
          userRole={userRole}
          onEditPayment={onEditPayment}
          onClose={() => setModalMode('none')}
        />
      )}

      {modalMode === 'sale' && (
        <SalesDeclarationModal
          artwork={artwork}
          events={events}
          onSale={onSale}
          onClose={() => setModalMode('none')}
          wrapAction={wrapAction}
        />
      )}

      {modalMode === 'certificate' && sale && <CertificateModal artwork={artwork} sale={sale} onClose={() => setModalMode('none')} />}


      {showRsaPreview && (
        <AttachmentPreviewModal type="rsa" imageUrl={artwork.rsaImageUrl} onClose={() => setShowRsaPreview(false)} />
      )}

      {showOrCrPreview && (
        <AttachmentPreviewModal type="orcr" imageUrl={artwork.orCrImageUrl} onClose={() => setShowOrCrPreview(false)} />
      )}

      {/* Log Details Modal */}
      {showLogDetails && selectedLog && (
        <LogDetailsModal log={selectedLog} onClose={() => setShowLogDetails(false)} />
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

      {/* Delivery Finalization Modal */}
      {showDeliveryFinalizeModal && (
        <DeliveryFinalizationModal
          sale={sale ?? { clientName: 'Client' } as any}
          artwork={artwork}
          onClose={() => setShowDeliveryFinalizeModal(false)}
          onConfirm={(itdr, rsa, orcr, carrier, referenceNumber, remarks) => {
            wrapAction(
              () => onDeliver(artwork.id, itdr, rsa, orcr, carrier, referenceNumber, remarks),
              'Processing Delivery...',
              ArtworkStatus.DELIVERED
            );
            setShowDeliveryFinalizeModal(false);
          }}
        />
      )}

      {/* Delivery Request Modal */}
      {showDeliveryRequestModal && (
        <DeliveryRequestModal
          sale={sale ?? { clientName: 'Client' } as any}
          artwork={artwork}
          onClose={() => setShowDeliveryRequestModal(false)}
          onSubmit={(requestData) => {
            if (onUpdateSale && sale) {
              const newRequest: any = {
                id: `DRQ-${Date.now()}`,
                saleId: sale.id,
                clientAddress: requestData.clientAddress!,
                deliveryDate: requestData.deliveryDate!,
                extraPersonnelCount: requestData.extraPersonnelCount!,
                toolsNeeded: requestData.toolsNeeded || [],
                remarks: requestData.remarks,
                status: 'Pending',
                requestedAt: new Date().toISOString(),
              };
              onUpdateSale(sale.id, { deliveryRequest: newRequest });
            }
            setShowDeliveryRequestModal(false);
          }}
        />
      )}

      {/* Delivery Options Selection Modal */}
      {showDeliveryOptionsModal && (
        <DeliveryOptionsModal
          onClose={() => setShowDeliveryOptionsModal(false)}
          onScheduleDelivery={() => {
            setShowDeliveryOptionsModal(false);
            setShowDeliveryRequestModal(true);
          }}
          onMarkDelivered={() => {
            setShowDeliveryOptionsModal(false);
            setShowDeliveryFinalizeModal(true);
          }}
        />
      )}
    </>
  );
};
