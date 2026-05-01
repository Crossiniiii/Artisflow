import React, { useState, useMemo } from 'react';
import { TransferRequest, Artwork, Branch, UserAccount, UserRole, ArtworkStatus, UserPermissions } from '../types';
import { CheckCircle2, XCircle, Clock, ArrowRightLeft, Filter, PauseCircle, Eye, Calendar, User, Trash2 } from 'lucide-react';
import { OptimizedImage } from '../components/OptimizedImage';
import { useActionProcessing } from '../hooks/useActionProcessing';
import LoadingOverlay from '../components/LoadingOverlay';

interface ArtworkTransferProps {
  requests: TransferRequest[];
  artworks: Artwork[];
  currentUser: UserAccount;
  onAccept: (request: TransferRequest) => void;
  onDecline: (request: TransferRequest) => void;
  onHold: (request: TransferRequest) => void;
  onDelete?: (request: TransferRequest) => void;
  branches: Branch[];
  onViewArtwork?: (id: string) => void;
  userPermissions?: UserPermissions;
}

const ArtworkTransfer: React.FC<ArtworkTransferProps> = ({
  requests,
  artworks,
  currentUser,
  onAccept,
  onDecline,
  onHold,
  onDelete,
  branches,
  onViewArtwork,
  userPermissions
}) => {
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing' | 'history' | 'on-hold'>('incoming');
  const [searchTerm] = useState('');
  const [detailsModal, setDetailsModal] = useState<TransferRequest | null>(null);
  const [confirmationModal, setConfirmationModal] = useState<{ request: TransferRequest; type: 'accept' | 'decline' | 'hold' | 'delete' } | null>(null);

  const {
    isProcessing,
    processProgress,
    processMessage,
    wrapAction
  } = useActionProcessing({ itemTitle: 'Transfers', itemCode: 'TRF' });

  const visibleArtworkIds = useMemo(() => {
    const visible = new Set<string>();
    artworks.forEach(artwork => {
      const canViewReserved = userPermissions?.canViewReserved ?? true;
      const canViewAuctioned = userPermissions?.canViewAuctioned ?? true;
      const canViewExhibit = userPermissions?.canViewExhibit ?? true;
      const canViewForFraming = userPermissions?.canViewForFraming ?? true;
      const canViewBackToArtist = userPermissions?.canViewBackToArtist ?? true;

      if (artwork.status === ArtworkStatus.RESERVED) {
        const isAuction = (artwork.remarks || '').includes('[Reserved For Auction:');
        const isEvent = (artwork.remarks || '').includes('[Reserved For Event:');

        if (isAuction) {
          if (!canViewAuctioned) return;
        } else if (isEvent) {
          if (!canViewExhibit) return;
        } else {
          if (!canViewReserved) return;
        }
      } else if (artwork.status === ArtworkStatus.FOR_FRAMING) {
        if (!canViewForFraming) return;
      } else if (artwork.status === ArtworkStatus.FOR_RETOUCH) {
        if (!canViewBackToArtist) return;
      }
      visible.add(artwork.id);
    });
    return visible;
  }, [artworks, userPermissions]);

  const filteredRequests = useMemo(() => {
    // Get valid branch names for filtering
    const validBranchNames = new Set(branches);
    const isAdmin = currentUser.role === UserRole.ADMIN;

    return requests.filter(req => {
      // Check visibility permission first - Admins see all indicated requests
      if (!isAdmin && !visibleArtworkIds.has(req.artworkId)) return false;

      // Filter out requests involving deleted branches (unless in history or Admin)
      const isHistory = req.status !== 'Pending' && req.status !== 'On Hold';
      if (!isHistory && !isAdmin) {
        const fromBranchExists = validBranchNames.has(req.fromBranch);
        const toBranchExists = validBranchNames.has(req.toBranch);
        if (!fromBranchExists || !toBranchExists) return false;
      }

      // Search Filter
      const searchMatch =
        (req.artworkTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.artworkCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.fromBranch || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.toBranch || '').toLowerCase().includes(searchTerm.toLowerCase());

      if (!searchMatch) return false;

      // Tab Filter
      if (isAdmin) {
        // Admin sees all based on tab status
        if (activeTab === 'incoming' || activeTab === 'outgoing') {
          return req.status === 'Pending';
        } else if (activeTab === 'on-hold') {
          return req.status === 'On Hold';
        } else {
          return req.status !== 'Pending' && req.status !== 'On Hold';
        }
      } else {
        // Branch User Logic
        const myBranch = (currentUser.branch || '').trim().toLowerCase();

        if (activeTab === 'incoming') {
          return (req.toBranch || '').trim().toLowerCase() === myBranch && req.status === 'Pending';
        } else if (activeTab === 'outgoing') {
          return (req.fromBranch || '').trim().toLowerCase() === myBranch && req.status === 'Pending';
        } else if (activeTab === 'on-hold') {
          return ((req.toBranch || '').trim().toLowerCase() === myBranch || (req.fromBranch || '').trim().toLowerCase() === myBranch) && req.status === 'On Hold';
        } else {
          // History: Involved in either side
          return ((req.fromBranch || '').trim().toLowerCase() === myBranch || (req.toBranch || '').trim().toLowerCase() === myBranch) && req.status !== 'Pending' && req.status !== 'On Hold';
        }
      }
    });
  }, [requests, activeTab, searchTerm, currentUser, branches, visibleArtworkIds]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-neutral-100 text-neutral-600 border-neutral-200';
      case 'Accepted': return 'bg-neutral-900 text-white border-neutral-900';
      case 'Declined': return 'bg-neutral-50 text-neutral-400 border-neutral-200 line-through decoration-neutral-400';
      case 'On Hold': return 'bg-white text-neutral-600 border-neutral-300 border-dashed';
      case 'Cancelled': return 'bg-neutral-50 text-neutral-400 border-neutral-100';
      default: return 'bg-neutral-100 text-neutral-900';
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Artwork Transfer Management</h1>
          <p className="text-neutral-500 mt-1">Manage pending transfers between branches</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200">
        <button
          onClick={() => setActiveTab('incoming')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'incoming'
            ? 'border-neutral-900 text-neutral-900'
            : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
        >
          <ArrowRightLeft size={16} />
          Incoming Requests
          {activeTab !== 'incoming' && (
            <span className="bg-neutral-200 text-neutral-700 text-xs px-2 py-0.5 rounded-sm">
              {requests.filter(r => r.status === 'Pending' && (currentUser.role === UserRole.ADMIN || r.toBranch === currentUser.branch)).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('outgoing')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'outgoing'
            ? 'border-neutral-900 text-neutral-900'
            : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
        >
          <Clock size={16} />
          Outgoing / Pending
        </button>
        <button
          onClick={() => setActiveTab('on-hold')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'on-hold'
            ? 'border-neutral-900 text-neutral-900'
            : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
        >
          <PauseCircle size={16} />
          On Hold Request
          {activeTab !== 'on-hold' && (
            <span className="bg-neutral-200 text-neutral-700 text-xs px-2 py-0.5 rounded-sm">
              {requests.filter(r => r.status === 'On Hold' && (currentUser.role === UserRole.ADMIN || r.toBranch === currentUser.branch || r.fromBranch === currentUser.branch)).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'history'
            ? 'border-neutral-900 text-neutral-900'
            : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
        >
          <Filter size={16} />
          History Log
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-md shadow-sm border border-neutral-200 overflow-hidden">
        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-neutral-400">
            {activeTab === 'on-hold' ? <PauseCircle className="w-12 h-12 mx-auto mb-4 opacity-20" /> : <ArrowRightLeft className="w-12 h-12 mx-auto mb-4 opacity-20" />}
            <p>No records found in this category.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase">Artwork</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase">Transfer Route</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase">Requested By</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredRequests.map(req => {
                  const artwork = artworks.find(a => a.id === req.artworkId);
                  const displayTitle = artwork?.title || req.artworkTitle || 'Deleted Artwork';
                  const displayCode = artwork?.code || req.artworkCode || '---';
                  const displayImage = artwork?.imageUrl || req.artworkImage || '';

                  return (
                    <tr key={req.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-6 py-4">
                        <div
                          className="flex items-center space-x-4 cursor-pointer group/art"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewArtwork?.(req.artworkId);
                          }}
                        >
                          <div className="w-12 h-12 rounded-sm bg-neutral-100 overflow-hidden group-hover/art:ring-2 ring-neutral-900 transition-all shadow-sm">
                            {displayImage ? (
                              <OptimizedImage src={displayImage || undefined} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-400">
                                <ArrowRightLeft size={16} />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-black text-neutral-900 group-hover/art:text-neutral-600 transition-colors leading-tight">{displayTitle}</div>
                            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">{displayCode}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3 text-xs">
                          <span className="font-bold text-neutral-600">{req.fromBranch}</span>
                          <ArrowRightLeft size={12} className="text-neutral-300" />
                          <span className="font-black text-neutral-900">{req.toBranch}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-neutral-900">{req.requestedBy}</div>
                        {req.notes && (
                          <div className="text-[10px] text-neutral-400 mt-1 italic max-w-[200px] truncate">"{req.notes}"</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-neutral-700">
                          {new Date(req.requestedAt).toLocaleDateString()}
                        </div>
                        <div className="text-[10px] font-medium text-neutral-400 mt-0.5">
                          {new Date(req.requestedAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-widest border ${getStatusColor(req.status)}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {(activeTab === 'incoming' || activeTab === 'on-hold') && req.status !== 'Accepted' && req.status !== 'Declined' && (currentUser.role === UserRole.ADMIN || req.toBranch === currentUser.branch) && (
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => setConfirmationModal({ type: 'accept', request: req })}
                              className="px-4 py-1.5 bg-neutral-900 text-white text-[10px] font-black uppercase tracking-widest rounded-sm hover:bg-black transition-all shadow-sm active:scale-95"
                            >
                              Accept
                            </button>
                            {req.status !== 'On Hold' && (
                              <button
                                onClick={() => setConfirmationModal({ type: 'hold', request: req })}
                                className="px-4 py-1.5 bg-neutral-100 text-neutral-600 text-[10px] font-black uppercase tracking-widest rounded-sm hover:bg-neutral-200 transition-all active:scale-95 border border-neutral-200"
                              >
                                Hold
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmationModal({ type: 'decline', request: req })}
                              className="px-4 py-1.5 bg-white text-neutral-400 text-[10px] font-black uppercase tracking-widest rounded-sm hover:bg-neutral-50 hover:text-neutral-600 transition-all border border-neutral-200 active:scale-95"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                        {req.status !== 'Pending' && req.status !== 'On Hold' && (
                          <div className="flex items-center justify-end gap-2">
                            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-tight mr-2">
                              {req.respondedBy ? `Processed by ${req.respondedBy}` : '-'}
                            </div>
                            <button
                              onClick={() => setDetailsModal(req)}
                              className="px-4 py-1.5 bg-neutral-100 text-neutral-600 text-[10px] font-black uppercase tracking-widest rounded-sm hover:bg-neutral-200 transition-all border border-neutral-200"
                            >
                              Details
                            </button>
                            {onDelete && (
                              <button
                                onClick={() => setConfirmationModal({ type: 'delete', request: req })}
                                className="px-4 py-1.5 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-sm hover:bg-rose-100 transition-all border border-rose-100"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {detailsModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-sm max-w-xl w-full p-0 shadow-2xl transform transition-all overflow-hidden border border-neutral-200">
            {/* Header */}
            <div className="px-8 py-6 border-b border-neutral-100 flex justify-between items-center bg-white">
              <div>
                <h3 className="text-xl font-black text-neutral-900 uppercase tracking-tight">Transfer Manifest</h3>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">Official Document ID: {detailsModal.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <button
                onClick={() => setDetailsModal(null)}
                className="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-400 hover:text-neutral-900"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-8 space-y-8">
              {/* Artwork Section */}
              <div
                className="flex items-center gap-6 p-4 bg-neutral-50 rounded-sm border border-neutral-100 cursor-pointer group transition-all hover:bg-neutral-100"
                onClick={() => onViewArtwork?.(detailsModal.artworkId)}
              >
                <div className="w-24 h-24 rounded-sm bg-white overflow-hidden shadow-sm flex-shrink-0 group-hover:ring-2 ring-neutral-900 transition-all">
                  <img src={detailsModal.artworkImage} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-neutral-900 text-lg leading-tight group-hover:text-neutral-600 transition-colors">{detailsModal.artworkTitle}</h4>
                      <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">{detailsModal.artworkCode}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-widest border ${getStatusColor(detailsModal.status)}`}>
                      {detailsModal.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-12">
                {/* Route */}
                <div className="space-y-4">
                  <h5 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Routing Data</h5>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-tight mb-1">Origin</p>
                      <p className="text-sm font-bold text-neutral-700">{detailsModal.fromBranch}</p>
                    </div>
                    <div className="flex justify-center py-1">
                      <ArrowRightLeft size={16} className="text-neutral-200" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-tight mb-1">Destination</p>
                      <p className="text-sm font-black text-neutral-900">{detailsModal.toBranch}</p>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-4">
                  <h5 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Audit Timeline</h5>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-tight mb-1">Requested By</p>
                      <p className="text-sm font-bold text-neutral-900">{detailsModal.requestedBy}</p>
                      <p className="text-[10px] text-neutral-400 mt-1 font-medium">{new Date(detailsModal.requestedAt).toLocaleString()}</p>
                    </div>

                    {(detailsModal.status === 'Accepted' || detailsModal.status === 'Declined' || detailsModal.status === 'On Hold') && detailsModal.respondedBy && (
                      <div className="pt-4 border-t border-neutral-100">
                        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-tight mb-1">
                          {detailsModal.status === 'Accepted' ? 'Verified By' :
                            detailsModal.status === 'Declined' ? 'Rejected By' : 'Suspended By'}
                        </p>
                        <p className="text-sm font-bold text-neutral-900">{detailsModal.respondedBy}</p>
                        {detailsModal.respondedAt && (
                          <p className="text-[10px] text-neutral-400 mt-1 font-medium">{new Date(detailsModal.respondedAt).toLocaleString()}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes & Attachments */}
              <div className="space-y-6">
                {detailsModal.notes && (
                  <div className="pt-6 border-t border-neutral-100">
                    <h5 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3">Administrative Notes</h5>
                    <div className="bg-neutral-50 p-4 rounded-sm text-xs text-neutral-600 font-medium leading-relaxed italic">
                      "{detailsModal.notes}"
                    </div>
                  </div>
                )}

                {detailsModal.itdrUrl && (() => {
                  const urls = Array.isArray(detailsModal.itdrUrl) ? detailsModal.itdrUrl : [detailsModal.itdrUrl];
                  return (
                    <div className="pt-6 border-t border-neutral-100">
                      <h5 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-4">Supporting Documentation (IT/DR)</h5>
                      <div className="grid grid-cols-2 gap-4">
                        {urls.map((url, i) => (
                          <div key={i} className="relative group">
                            <img
                              src={url}
                              alt=""
                              className="w-full h-32 object-cover rounded-sm border border-neutral-200 shadow-sm cursor-pointer group-hover:shadow-md transition-all"
                              onClick={() => window.open(url, '_blank')}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none rounded-sm"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="px-8 py-6 bg-neutral-50 border-t border-neutral-100 flex justify-end">
              <button
                onClick={() => setDetailsModal(null)}
                className="px-6 py-2.5 bg-white border border-neutral-200 text-neutral-900 hover:bg-neutral-100 rounded-sm transition-all text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95"
              >
                Close Manifest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmationModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-md max-w-md w-full p-6 shadow-xl transform transition-all">
            <h3 className="text-lg font-bold text-neutral-900 mb-2">
              {confirmationModal.type === 'accept' && 'Accept Transfer'}
              {confirmationModal.type === 'decline' && 'Decline Transfer'}
              {confirmationModal.type === 'hold' && 'Put Request On Hold'}
              {confirmationModal.type === 'delete' && 'Delete Transfer Record'}
            </h3>
            <p className="text-neutral-600 mb-6">
              Are you sure you want to {confirmationModal.type === 'hold' ? 'put on hold' : confirmationModal.type} the transfer request for <span className="font-semibold">{confirmationModal.request.artworkTitle}</span>?
              {confirmationModal.type === 'accept' && ' This will move the artwork to your branch inventory.'}
              {confirmationModal.type === 'decline' && ' This will reject the transfer request.'}
              {confirmationModal.type === 'hold' && ' This will move the request to the On Hold tab for later review.'}
              {confirmationModal.type === 'delete' && ' This will permanently remove this transfer record from the database.'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmationModal(null)}
                className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-md transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const req = confirmationModal.request;
                  const type = confirmationModal.type;

                  await wrapAction(async () => {
                    if (type === 'accept') {
                      await Promise.resolve(onAccept(req));
                    } else if (type === 'decline') {
                      await Promise.resolve(onDecline(req));
                    } else if (type === 'hold') {
                      await Promise.resolve(onHold(req));
                    } else if (type === 'delete') {
                      await Promise.resolve(onDelete?.(req));
                    }
                  }, type === 'accept' ? 'Processing Transfer Acceptance...' :
                    type === 'decline' ? 'Declining Transfer Request...' :
                      type === 'hold' ? 'Suspending Request...' : 'Decommissioning Transfer Record...');

                  setConfirmationModal(null);
                }}
                disabled={isProcessing}
                className={`px-4 py-2 text-white rounded-md transition-colors font-medium shadow-sm ${confirmationModal.type === 'accept'
                  ? 'bg-neutral-900 hover:bg-black'
                  : confirmationModal.type === 'hold'
                    ? 'bg-neutral-500 hover:bg-neutral-600'
                    : confirmationModal.type === 'delete'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50'
                  }`}
              >
                Confirm {confirmationModal.type === 'hold' ? 'On Hold' : confirmationModal.type === 'delete' ? 'Delete' : (confirmationModal.type.charAt(0).toUpperCase() + confirmationModal.type.slice(1))}
              </button>
            </div>
          </div>
        </div>
      )}

      <LoadingOverlay
        isVisible={isProcessing}
        title={processMessage}
        progress={{ current: processProgress, total: 100 }}
      />

    </div>
  );
};

export default ArtworkTransfer;
