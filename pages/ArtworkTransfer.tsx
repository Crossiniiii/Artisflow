import React, { useState, useMemo } from 'react';
import { TransferRequest, Artwork, Branch, UserAccount, UserRole } from '../types';
import { CheckCircle2, XCircle, Clock, ArrowRightLeft, Filter, PauseCircle, Eye, Calendar, User } from 'lucide-react';

interface ArtworkTransferProps {
  requests: TransferRequest[];
  artworks: Artwork[];
  currentUser: UserAccount;
  onAccept: (request: TransferRequest) => void;
  onDecline: (request: TransferRequest) => void;
  onHold: (request: TransferRequest) => void;
  branches: Branch[];
  onViewArtwork?: (id: string) => void;
}

const ArtworkTransfer: React.FC<ArtworkTransferProps> = ({
  requests,
  artworks,
  currentUser,
  onAccept,
  onDecline,
  onHold,
  branches,
  onViewArtwork
}) => {
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing' | 'history' | 'on-hold'>('incoming');
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmationModal, setConfirmationModal] = useState<{ type: 'accept' | 'decline' | 'hold', request: TransferRequest } | null>(null);
  const [detailsModal, setDetailsModal] = useState<TransferRequest | null>(null);

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      // Search Filter
      const searchMatch = 
        req.artworkTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.artworkCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.fromBranch.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.toBranch.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!searchMatch) return false;

      // Tab Filter
      if (currentUser.role === UserRole.ADMIN) {
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
        const myBranch = currentUser.branch || '';
        
        if (activeTab === 'incoming') {
          return req.toBranch === myBranch && req.status === 'Pending';
        } else if (activeTab === 'outgoing') {
          return req.fromBranch === myBranch && req.status === 'Pending';
        } else if (activeTab === 'on-hold') {
          return (req.toBranch === myBranch || req.fromBranch === myBranch) && req.status === 'On Hold';
        } else {
          // History: Involved in either side
          return (req.fromBranch === myBranch || req.toBranch === myBranch) && req.status !== 'Pending' && req.status !== 'On Hold';
        }
      }
    });
  }, [requests, activeTab, searchTerm, currentUser]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Accepted': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Declined': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'On Hold': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Cancelled': return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Artwork Transfer Management</h1>
          <p className="text-slate-500 mt-1">Manage pending transfers between branches</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('incoming')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'incoming' 
              ? 'border-slate-900 text-slate-900' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <ArrowRightLeft size={16} />
          Incoming Requests
          {activeTab !== 'incoming' && (
            <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full">
              {requests.filter(r => r.status === 'Pending' && (currentUser.role === UserRole.ADMIN || r.toBranch === currentUser.branch)).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('outgoing')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'outgoing' 
              ? 'border-slate-900 text-slate-900' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Clock size={16} />
          Outgoing / Pending
        </button>
        <button
          onClick={() => setActiveTab('on-hold')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'on-hold' 
              ? 'border-slate-900 text-slate-900' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <PauseCircle size={16} />
          On Hold Request
          {activeTab !== 'on-hold' && (
            <span className="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded-full">
              {requests.filter(r => r.status === 'On Hold' && (currentUser.role === UserRole.ADMIN || r.toBranch === currentUser.branch || r.fromBranch === currentUser.branch)).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'history' 
              ? 'border-slate-900 text-slate-900' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Filter size={16} />
          History Log
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            {activeTab === 'on-hold' ? <PauseCircle className="w-12 h-12 mx-auto mb-4 opacity-20" /> : <ArrowRightLeft className="w-12 h-12 mx-auto mb-4 opacity-20" />}
            <p>No records found in this category.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Artwork</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Transfer Route</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Requested By</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div 
                        className="flex items-center space-x-3 cursor-pointer group"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewArtwork?.(req.artworkId);
                        }}
                        title="View Artwork Details"
                      >
                        <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden group-hover:ring-2 ring-blue-500 transition-all">
                          <img src={req.artworkImage} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{req.artworkTitle}</div>
                          <div className="text-xs text-slate-500">{req.artworkCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="font-medium text-slate-600">{req.fromBranch}</span>
                        <ArrowRightLeft size={14} className="text-slate-400" />
                        <span className="font-bold text-slate-900">{req.toBranch}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900">{req.requestedBy}</div>
                      {req.notes && (
                        <div className="text-xs text-slate-500 mt-1 italic max-w-[200px] truncate">{req.notes}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600">
                        {new Date(req.requestedAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-slate-400">
                        {new Date(req.requestedAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(req.status)}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(activeTab === 'incoming' || activeTab === 'on-hold') && req.status !== 'Accepted' && req.status !== 'Declined' && (currentUser.role === UserRole.ADMIN || req.toBranch === currentUser.branch) && (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => setConfirmationModal({ type: 'accept', request: req })}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Accept Transfer"
                          >
                            <CheckCircle2 size={20} />
                          </button>
                          {req.status !== 'On Hold' && (
                            <button
                                onClick={() => setConfirmationModal({ type: 'hold', request: req })}
                                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                title="Put On Hold"
                            >
                                <PauseCircle size={20} />
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmationModal({ type: 'decline', request: req })}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Decline Transfer"
                          >
                            <XCircle size={20} />
                          </button>
                        </div>
                      )}
                      {req.status !== 'Pending' && req.status !== 'On Hold' && (
                        <div className="flex items-center justify-end gap-3">
                          <div className="text-xs text-slate-400">
                            {req.respondedBy ? `Processed by ${req.respondedBy}` : '-'}
                          </div>
                          <button
                            onClick={() => setDetailsModal(req)}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye size={20} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {detailsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-0 shadow-xl transform transition-all overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">Transfer Details</h3>
              <button 
                onClick={() => setDetailsModal(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Artwork Header */}
              <div 
                className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors group relative"
                onClick={() => onViewArtwork?.(detailsModal.artworkId)}
                title="Click to view artwork details"
              >
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye size={16} className="text-slate-400" />
                </div>
                <div className="w-20 h-20 rounded-lg bg-white overflow-hidden shadow-sm flex-shrink-0 group-hover:shadow-md transition-shadow">
                  <img src={detailsModal.artworkImage} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900 text-lg group-hover:text-blue-600 transition-colors">{detailsModal.artworkTitle}</h4>
                      <p className="text-slate-500">{detailsModal.artworkCode}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(detailsModal.status)}`}>
                      {detailsModal.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                {/* Route Info */}
                <div className="space-y-4">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Transfer Route</h5>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                      <span className="text-slate-500">From:</span>
                      <span className="font-medium text-slate-900">{detailsModal.fromBranch}</span>
                    </div>
                    <div className="pl-1">
                      <div className="w-0.5 h-4 bg-slate-200 ml-[3px]"></div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-slate-900"></div>
                      <span className="text-slate-500">To:</span>
                      <span className="font-bold text-slate-900">{detailsModal.toBranch}</span>
                    </div>
                  </div>
                </div>

                {/* Timeline Info */}
                <div className="space-y-4">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Timeline</h5>
                  <div className="space-y-4">
                    {/* Requested */}
                    <div className="flex gap-3">
                      <div className="mt-0.5 text-slate-400"><User size={16} /></div>
                      <div>
                        <div className="text-xs text-slate-500">Requested by</div>
                        <div className="text-sm font-medium text-slate-900">{detailsModal.requestedBy}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                          <Calendar size={12} />
                          {new Date(detailsModal.requestedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Responded */}
                    {(detailsModal.status === 'Accepted' || detailsModal.status === 'Declined' || detailsModal.status === 'On Hold') && detailsModal.respondedBy && (
                      <div className="flex gap-3 pt-2 border-t border-slate-100">
                        <div className="mt-0.5 text-slate-400">
                          {detailsModal.status === 'Accepted' && <CheckCircle2 size={16} className="text-emerald-500" />}
                          {detailsModal.status === 'Declined' && <XCircle size={16} className="text-rose-500" />}
                          {detailsModal.status === 'On Hold' && <PauseCircle size={16} className="text-orange-500" />}
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">
                            {detailsModal.status === 'Accepted' ? 'Accepted by' : 
                             detailsModal.status === 'Declined' ? 'Declined by' : 'Put on hold by'}
                          </div>
                          <div className="text-sm font-medium text-slate-900">{detailsModal.respondedBy}</div>
                          {detailsModal.respondedAt && (
                            <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                              <Calendar size={12} />
                              {new Date(detailsModal.respondedAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {detailsModal.notes && (
                <div className="pt-4 border-t border-slate-100">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Notes</h5>
                  <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 italic">
                    "{detailsModal.notes}"
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setDetailsModal(null)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors text-sm font-medium shadow-sm"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmationModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl transform transition-all">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {confirmationModal.type === 'accept' && 'Accept Transfer'}
              {confirmationModal.type === 'decline' && 'Decline Transfer'}
              {confirmationModal.type === 'hold' && 'Put Request On Hold'}
            </h3>
            <p className="text-slate-600 mb-6">
              Are you sure you want to {confirmationModal.type === 'hold' ? 'put on hold' : confirmationModal.type} the transfer request for <span className="font-semibold">{confirmationModal.request.artworkTitle}</span>?
              {confirmationModal.type === 'accept' && ' This will move the artwork to your branch inventory.'}
              {confirmationModal.type === 'decline' && ' This will reject the transfer request.'}
              {confirmationModal.type === 'hold' && ' This will move the request to the On Hold tab for later review.'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmationModal(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmationModal.type === 'accept') {
                    onAccept(confirmationModal.request);
                  } else if (confirmationModal.type === 'decline') {
                    onDecline(confirmationModal.request);
                  } else if (confirmationModal.type === 'hold') {
                    onHold(confirmationModal.request);
                  }
                  setConfirmationModal(null);
                }}
                className={`px-4 py-2 text-white rounded-lg transition-colors font-medium shadow-sm ${
                  confirmationModal.type === 'accept' 
                    ? 'bg-emerald-600 hover:bg-emerald-700' 
                    : confirmationModal.type === 'hold'
                    ? 'bg-orange-500 hover:bg-orange-600'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Confirm {confirmationModal.type === 'hold' ? 'On Hold' : (confirmationModal.type.charAt(0).toUpperCase() + confirmationModal.type.slice(1))}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArtworkTransfer;
