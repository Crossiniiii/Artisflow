import React from 'react';
import {
  Artwork,
  ArtworkStatus,
  TransferRequest,
  SaleRecord,
  UserPermissions
} from '../../types';
import { ICONS } from '../../constants';
import { ActionButton } from './ActionButton';
import {
  Shield,
  Paperclip,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Upload,
  Edit,
  Trash2,
  Wrench,
  Archive,
  Gavel,
  Bookmark
} from 'lucide-react';

interface OperationsPanelProps {
  canApproveTransfer: boolean;
  pendingTransferRequest?: TransferRequest;
  setTransferApprovalModal: React.Dispatch<React.SetStateAction<{ mode: 'accept' | 'decline' | 'hold', request: TransferRequest } | null>>;
  sale?: SaleRecord;
  setModalMode: React.Dispatch<React.SetStateAction<any>>;
  userPermissions?: UserPermissions;
  displayStatus: ArtworkStatus;
  artwork: Artwork;
  isStatusTransitioning: boolean;
  isImmutable: boolean;
  onDelete?: (id: string) => void;
  onReturn?: (id: string, reason: string, refNumber?: string, proofImage?: string | string[], remarks?: string, type?: any) => Promise<boolean | void> | boolean | void;
  onSendToFramer?: (id: string, damageDetails: string, attachmentUrl?: string | string[]) => Promise<boolean | void> | boolean | void;
  onReturnToGallery?: (recordId: string, branch: string, resolvedAt?: string, remarks?: string) => Promise<boolean | void> | boolean | void;
  onReturnFromFramer?: (recordId: string, branch: string, resolvedAt?: string, remarks?: string) => Promise<boolean | void> | boolean | void;
  onAddToAuction?: (artworkIds: string[], auctionId: string, name: string, remarks?: string) => Promise<boolean | void> | boolean | void;
  onCancelReservation?: (id: string) => Promise<boolean | void> | boolean | void;
  onAddInstallment?: (saleId: string, amount: number, date: string, reference?: string, attachments?: string[], remarks?: string) => void;
  onCancelSale: (id: string) => void;
  canGenerateCert?: boolean;
  setShowItdrPreview: React.Dispatch<React.SetStateAction<boolean>>;
  setShowRsaPreview: React.Dispatch<React.SetStateAction<boolean>>;
  setShowOrCrPreview: React.Dispatch<React.SetStateAction<boolean>>;
  setConfirmModal: React.Dispatch<React.SetStateAction<any>>;
  wrapAction: any;
  setOptimisticArtworkState: (updates: Partial<Artwork>) => void;
  setOptimisticArtwork: React.Dispatch<React.SetStateAction<Artwork | null>>;
  setPendingViewState: React.Dispatch<React.SetStateAction<{ status?: ArtworkStatus; currentBranch?: string } | null>>;
  setShowDeliveryOptionsModal: React.Dispatch<React.SetStateAction<boolean>>;
}

export const OperationsPanel: React.FC<OperationsPanelProps> = ({
  canApproveTransfer,
  pendingTransferRequest,
  setTransferApprovalModal,
  sale,
  setModalMode,
  userPermissions,
  displayStatus,
  artwork,
  isStatusTransitioning,
  isImmutable,
  onDelete,
  onReturn,
  onSendToFramer,
  onReturnToGallery,
  onReturnFromFramer,
  onAddToAuction,
  onCancelReservation,
  onAddInstallment,
  onCancelSale,
  canGenerateCert,
  setShowItdrPreview,
  setShowRsaPreview,
  setShowOrCrPreview,
  setConfirmModal,
  wrapAction,
  setOptimisticArtworkState,
  setOptimisticArtwork,
  setPendingViewState,
  setShowDeliveryOptionsModal
}) => {
  return (
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
                onClick={() => setTransferApprovalModal({ mode: 'accept', request: pendingTransferRequest })}
                className="flex-1 py-2 bg-[#0f172a] text-white text-[10px] font-black uppercase tracking-widest rounded-sm transition-all shadow-[0_4px_12px_rgba(15,23,42,0.15)] active:scale-95 flex items-center justify-center gap-2"
              >
                <CheckCircle size={12} />
                Accept
              </button>
              <button
                onClick={() => setTransferApprovalModal({ mode: 'hold', request: pendingTransferRequest })}
                className="flex-1 py-2 bg-neutral-100 text-neutral-600 border border-neutral-200 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Clock size={12} />
                Hold
              </button>
              <button
                onClick={() => setTransferApprovalModal({ mode: 'decline', request: pendingTransferRequest })}
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
              onClick={() => setModalMode('attach-unified')}
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
                  onClick={() => setModalMode('retouch-return')}
                />
              )}
              {displayStatus === ArtworkStatus.FOR_FRAMING && onReturnFromFramer && (
                <ActionButton
                  label="Return from Framer"
                  icon={<Archive size={20} />}
                  variant="emerald"
                  disabled={isStatusTransitioning}
                  onClick={() => setModalMode('framer-return')}
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
                label="Delivery Options"
                icon={ICONS.Deliver}
                variant="indigo"
                disabled={isStatusTransitioning || displayStatus !== ArtworkStatus.SOLD}
                onClick={() => setShowDeliveryOptionsModal(true)}
              />
            </>
          )}

          {(displayStatus === ArtworkStatus.SOLD || displayStatus === ArtworkStatus.DELIVERED) && userPermissions?.canAttachITDR && (
            <ActionButton
              label="Attach IT/DR/RSA/AR/OR/CR"
              icon={<Paperclip size={20} />}
              variant="indigo"
              disabled={isStatusTransitioning}
              onClick={() => setModalMode('attach-unified')}
            />
          )}

          {displayStatus === ArtworkStatus.SOLD && userPermissions?.canSellArtwork && (
            <div className="grid grid-cols-1 gap-3">
              {sale?.downpayment && !sale.isCancelled && onAddInstallment && (() => {
                const actualPrice = sale.discountedPrice !== undefined && sale.discountedPrice !== null ? sale.discountedPrice : (artwork.price || 0);
                const outstanding = actualPrice - (sale.downpayment || 0) - (sale.installments || []).reduce((sum, inst) => sum + inst.amount, 0);
                return outstanding > 0;
              })() && (
                  <ActionButton
                    label="Pay Installment"
                    icon={ICONS.Sales}
                    variant="emerald"
                    disabled={isStatusTransitioning}
                    onClick={() => setModalMode('installment')}
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

          {hasAttachment(artwork.itdrImageUrl) && (userPermissions?.canAttachITDR ?? true) && (
            <div className="mt-3">
              <ActionButton label="View IT/DR" icon={<Paperclip size={20} />} variant="neutral" disabled={isStatusTransitioning} onClick={() => setShowItdrPreview(true)} />
            </div>
          )}

          {hasAttachment(artwork.rsaImageUrl) && (userPermissions?.canAttachITDR ?? true) && (
            <div className="mt-3">
              <ActionButton label="View RSA/AR" icon={<Paperclip size={20} />} variant="slate" disabled={isStatusTransitioning} onClick={() => setShowRsaPreview(true)} />
            </div>
          )}

          {hasAttachment(artwork.orCrImageUrl) && (userPermissions?.canAttachITDR ?? true) && (
            <div className="mt-3">
              <ActionButton label="View OR/CR" icon={<Paperclip size={20} />} variant="neutral" disabled={isStatusTransitioning} onClick={() => setShowOrCrPreview(true)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const hasAttachment = (urlOrUrls?: string | string[]) => {
  if (!urlOrUrls) return false;
  if (Array.isArray(urlOrUrls)) {
    return urlOrUrls.filter(url => url && String(url).trim().length > 0).length > 0;
  }
  const str = String(urlOrUrls).trim();
  if (str === '[]' || str === '""' || str === "''" || str === '[""]') return false;
  return str.length > 0;
};
