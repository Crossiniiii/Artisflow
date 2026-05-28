
import React, { useState, useMemo } from 'react';
import { SaleRecord, Artwork, ArtworkStatus, SaleStatus, UserPermissions, DeliveryRequest, DeliveryRequestStatus } from '../types';
import { ICONS } from '../constants';
import { Truck, CheckCircle2, XCircle, Clock, MapPin, Calendar, Users, Wrench, ChevronRight, AlertCircle, Search, Trash2, LayoutGrid, Rows3, X, Info } from 'lucide-react';
import { OptimizedImage } from '../components/OptimizedImage';
import { motion, AnimatePresence } from 'framer-motion';

interface DeliveryRequestsPageProps {
  sales: SaleRecord[];
  artworks: Artwork[];
  onApproveRequest?: (saleId: string, remarks: string) => void;
  onDeclineRequest?: (saleId: string, reason: string) => void;
  onUpdateSale?: (saleId: string, updates: Partial<SaleRecord>) => Promise<boolean>;
  currentUser?: any;
  userPermissions?: any;
  hideHeader?: boolean;
}

const DeliveryRequestsPage: React.FC<DeliveryRequestsPageProps> = ({ 
  sales, 
  artworks, 
  onApproveRequest,
  onDeclineRequest,
  onUpdateSale,
  currentUser,
  userPermissions,
  hideHeader
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [declineModal, setDeclineModal] = useState<{sale: SaleRecord, reason: string} | null>(null);
  const [approvalRemarks, setApprovalRemarks] = useState('');

  const pendingRequests = useMemo(() => {
    return sales.filter(sale => {
      const hasPendingRequest = sale.deliveryRequest?.status === DeliveryRequestStatus.PENDING;
      if (!hasPendingRequest) return false;

      const artwork = artworks.find(a => a.id === sale.artworkId) || ({ ...sale.artworkSnapshot, id: sale.artworkId, status: 'Sold', createdAt: sale.saleDate } as any);
      if (!artwork) return false;

      const title = (artwork.title || '').toLowerCase();
      const code = (artwork.code || '').toLowerCase();
      const clientName = (sale.clientName || '').toLowerCase();
      const requestId = (sale.deliveryRequest?.id || '').toLowerCase();
      const search = searchQuery.toLowerCase();

      const matchesSearch = 
        title.includes(search) ||
        code.includes(search) ||
        clientName.includes(search) ||
        requestId.includes(search);

      return matchesSearch;
    }).sort((a, b) => {
      const dateA = new Date(a.deliveryRequest?.requestedAt || 0).getTime();
      const dateB = new Date(b.deliveryRequest?.requestedAt || 0).getTime();
      return dateB - dateA;
    });
  }, [sales, artworks, searchQuery]);

  const handleApprove = (sale: SaleRecord) => {
    if (!onApproveRequest) return;
    onApproveRequest(sale.id, approvalRemarks);
    setApprovalRemarks('');
    setSelectedSale(null);
  };

  const handleDecline = () => {
    if (!declineModal || !onDeclineRequest) return;
    onDeclineRequest(declineModal.sale.id, declineModal.reason);
    setDeclineModal(null);
    setSelectedSale(null);
  };

  return (
    <div className={`max-w-[1600px] mx-auto ${hideHeader ? '' : 'py-8 px-8'} pb-24 bg-white min-h-screen text-[#323130] font-sans`}>
      {!hideHeader && (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[#0078d4] font-semibold text-sm mb-2">
              <Truck size={18} />
              <span>Logistics Hub</span>
            </div>
            <h1 className="text-4xl font-light text-[#323130] tracking-tight">
              Delivery Approval
            </h1>
            <p className="text-[#605e5c] font-medium text-sm max-w-2xl">
              Review and manage artwork dispatch authorizations and site logistics requests.
            </p>
          </div>

          <div className="bg-white p-6 border border-[#edebe9] rounded-[4px] shadow-sm flex items-center gap-8 shrink-0">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-[#605e5c] uppercase tracking-wider">Active Backlog</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-light text-[#323130] leading-none">{pendingRequests.length}</span>
                <span className="text-xs font-semibold text-[#605e5c]">items</span>
              </div>
            </div>
            <div className="h-10 w-[1px] bg-[#edebe9]" />
            <div className="w-10 h-10 bg-[#0078d4] rounded-full flex items-center justify-center text-white">
              <AlertCircle size={20} />
            </div>
          </div>
        </div>
      )}
      <AnimatePresence>
        {declineModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[4px] shadow-[0_32px_64px_0_rgba(0,0,0,0.18),0_2px_21px_0_rgba(0,0,0,0.08)] w-full max-w-md p-6 border border-[#edebe9]"
            >
              <h2 className="text-xl font-semibold text-[#323130] mb-2">Decline request</h2>
              <p className="text-sm text-[#605e5c] mb-6">Enter a reason why this delivery request is being declined.</p>
              
              <textarea
                value={declineModal.reason}
                onChange={(e) => setDeclineModal({ ...declineModal, reason: e.target.value })}
                placeholder="Required information..."
                className="w-full px-3 py-2 bg-white border border-[#8a8886] rounded-[2px] text-sm focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none min-h-[120px] resize-none transition-all"
              />

              <div className="flex justify-end gap-2 mt-8">
                <button 
                  onClick={() => setDeclineModal(null)}
                  className="px-6 py-2 bg-white text-[#323130] border border-[#8a8886] rounded-[2px] font-semibold text-sm hover:bg-[#f3f2f1] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  disabled={!declineModal.reason.trim()}
                  onClick={handleDecline}
                  className="px-6 py-2 bg-[#d83b01] text-white rounded-[2px] font-semibold text-sm hover:bg-[#b83201] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  Decline
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Microsoft Inspired Detail Modal */}
      <AnimatePresence>
        {selectedSale && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/30 backdrop-blur-[4px]">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-[8px] shadow-[0_64px_128px_rgba(0,0,0,0.22),0_10px_36px_rgba(0,0,0,0.18)] w-full max-w-6xl overflow-hidden border border-[#edebe9] flex flex-col max-h-[95vh]"
            >
               {/* Fluent Header */}
               <div className="px-10 py-8 bg-white border-b border-[#edebe9] flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-8">
                    <div className="w-24 h-24 rounded-[4px] overflow-hidden bg-[#f3f2f1] border border-[#edebe9] shadow-sm">
                       <OptimizedImage src={(artworks.find(a => a.id === selectedSale.artworkId) || selectedSale.artworkSnapshot!)?.imageUrl} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[#0078d4] font-semibold text-xs uppercase tracking-wider">{selectedSale.deliveryRequest?.id}</span>
                        <div className="w-1 h-1 bg-[#edebe9] rounded-full" />
                        <span className="text-[#605e5c] text-xs font-semibold">Delivery Request</span>
                      </div>
                      <h2 className="text-2xl font-semibold text-[#323130] tracking-tight">{(artworks.find(a => a.id === selectedSale.artworkId) || selectedSale.artworkSnapshot!)?.title}</h2>
                      <p className="text-[#605e5c] font-medium mt-0.5">{selectedSale.clientName} • {(artworks.find(a => a.id === selectedSale.artworkId) || selectedSale.artworkSnapshot!)?.code}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedSale(null);
                      setApprovalRemarks('');
                    }}
                    className="p-2 text-[#605e5c] hover:bg-[#f3f2f1] rounded-[2px] transition-colors"
                  >
                    <X size={24} />
                  </button>
               </div>

               {/* Fluent Body */}
               <div className="flex-1 overflow-y-auto p-10 bg-[#faf9f8]">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                     <div className="lg:col-span-3 space-y-12">
                        {/* Section: Logistics Details */}
                        <div className="space-y-8">
                           <h3 className="text-lg font-semibold text-[#323130] flex items-center gap-2 border-b border-[#edebe9] pb-4">
                             <Truck size={20} className="text-[#0078d4]" />
                             Logistics Details
                           </h3>
                           
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                              <div className="space-y-6">
                                 <div>
                                   <label className="text-[11px] font-semibold text-[#605e5c] uppercase tracking-wider block mb-2">Delivery Address</label>
                                   <div className="bg-white p-4 border border-[#edebe9] rounded-[2px] text-sm font-medium leading-relaxed text-[#323130]">
                                      {selectedSale.deliveryRequest?.clientAddress}
                                   </div>
                                 </div>
                                 <div>
                                   <label className="text-[11px] font-semibold text-[#605e5c] uppercase tracking-wider block mb-2">Scheduled Date</label>
                                   <div className="flex items-center gap-3 bg-white p-4 border border-[#edebe9] rounded-[2px] text-sm font-medium text-[#323130]">
                                      <Calendar size={16} className="text-[#0078d4]" />
                                      {new Date(selectedSale.deliveryRequest?.deliveryDate || '').toLocaleDateString('en-US', { dateStyle: 'full' })}
                                   </div>
                                 </div>
                              </div>

                              <div className="space-y-6">
                                 <div>
                                   <label className="text-[11px] font-semibold text-[#605e5c] uppercase tracking-wider block mb-2">Resource Allocation</label>
                                   <div className="bg-white p-4 border border-[#edebe9] rounded-[2px] space-y-4">
                                      <div className="flex items-center gap-3">
                                        <Users size={16} className="text-[#0078d4]" />
                                        <span className="text-sm font-medium">{selectedSale.deliveryRequest?.extraPersonnelCount} Extra Personnel Assigned</span>
                                      </div>
                                   </div>
                                 </div>
                              </div>
                           </div>
                           
                           {selectedSale.deliveryRequest?.remarks && (
                             <div className="mt-8">
                               <label className="text-[11px] font-semibold text-[#605e5c] uppercase tracking-wider block mb-2">Tools Needed</label>
                               <div className="bg-[#fff8f0] p-4 border border-[#fed9cc] rounded-[2px] text-sm font-medium leading-relaxed text-[#323130] italic shadow-sm">
                                  "{selectedSale.deliveryRequest.remarks}"
                               </div>
                             </div>
                           )}
                        </div>

                        {/* Request History Strip */}
                        <div className="bg-[#eff6fc] p-4 rounded-[4px] border border-[#deecf9] flex items-center gap-3 text-[#005a9e] text-xs font-semibold">
                           <span className="p-1 bg-[#0078d4] text-white rounded-full">
                             <Info size={12} />
                           </span>
                           <span>Requested by {selectedSale.deliveryRequest?.requestedBy} on {new Date(selectedSale.deliveryRequest?.requestedAt || '').toLocaleString()}</span>
                        </div>
                     </div>

                     {/* Action Sidebar: Fluent Surface */}
                     <div className="bg-white border border-[#edebe9] rounded-[4px] p-6 shadow-sm h-fit space-y-6">
                        <div className="space-y-3">
                           <h4 className="text-xs font-semibold text-[#323130] uppercase tracking-wider">Approval Matrix</h4>
                           <p className="text-xs text-[#605e5c] leading-relaxed">
                             Confirm that all logistics requirements are met before proceeding with dispatch authorization.
                           </p>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-[#f3f2f1]">
                           <div className="space-y-2">
                             <label className="text-[10px] font-black text-[#605e5c] uppercase tracking-widest">Administrative Remarks</label>
                             <textarea 
                               value={approvalRemarks}
                               onChange={(e) => setApprovalRemarks(e.target.value)}
                               placeholder="Add audit notes..."
                               className="w-full h-24 p-3 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-medium outline-none focus:border-[#0078d4] transition-all resize-none"
                             />
                           </div>
                           <button 
                             onClick={() => handleApprove(selectedSale)}
                             className="w-full py-2.5 rounded-[2px] font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 bg-[#0078d4] text-white hover:bg-[#106ebe]"
                           >
                             <CheckCircle2 size={16} />
                             Approve
                           </button>
                           <button 
                             onClick={() => setDeclineModal({ sale: selectedSale, reason: '' })}
                             className="w-full py-2.5 bg-white text-[#d83b01] border border-[#8a8886] rounded-[2px] font-semibold text-sm hover:bg-[#f3f2f1] transition-all flex items-center justify-center gap-2"
                           >
                             <XCircle size={16} />
                             Decline
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* Fluent Command Bar / Search */}
      <div className="bg-white border border-[#edebe9] p-2 rounded-[2px] shadow-sm mb-8 flex items-center gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#605e5c]" size={16} />
          <input
            type="text"
            placeholder="Search pending requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-transparent text-sm font-medium outline-none placeholder:text-[#a19f9d]"
          />
        </div>
      </div>

      {/* Fluent List: Clean Strips on White */}
      <div className="space-y-[1px] border border-[#edebe9] rounded-[2px] overflow-hidden shadow-sm bg-[#edebe9]">
        <AnimatePresence mode="popLayout">
          {pendingRequests.length > 0 ? (
            pendingRequests.map((sale) => {
              const artwork = artworks.find(a => a.id === sale.artworkId) || sale.artworkSnapshot!;
              const request = sale.deliveryRequest!;

              return (
                <motion.div
                  key={sale.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedSale(sale)}
                  className="group bg-white flex items-center gap-6 px-6 py-4 cursor-pointer hover:bg-[#f3f2f1] transition-colors"
                >
                  <div className="w-12 h-12 rounded-[2px] overflow-hidden bg-[#f3f2f1] border border-[#edebe9] shrink-0">
                    <OptimizedImage src={artwork.imageUrl} className="w-full h-full object-cover" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-3">
                       <h4 className="text-sm font-semibold text-[#323130] truncate">{artwork.title}</h4>
                       <span className="text-[10px] font-semibold text-[#0078d4] uppercase">{request.id}</span>
                     </div>
                     <p className="text-xs font-medium text-[#605e5c] mt-0.5">
                       {sale.clientName} | {artwork.code}
                       <span className="ml-2 text-[#a19f9d]">•</span>
                       <span className="ml-2">Requested by: <span className="font-semibold text-[#323130]">{request.requestedBy}</span></span>
                     </p>
                  </div>

                  <div className="hidden lg:flex items-center gap-12 shrink-0 pr-12">
                     <div className="w-32">
                       <p className="text-[10px] font-semibold text-[#a19f9d] uppercase mb-0.5">Target Date</p>
                       <p className="text-xs font-semibold text-[#323130]">{new Date(request.deliveryDate).toLocaleDateString()}</p>
                     </div>
                     <div className="w-24 flex items-center gap-2">
                       <div className="w-1.5 h-1.5 bg-[#d83b01] rounded-full" />
                       <span className="text-[10px] font-semibold text-[#605e5c] uppercase">Review</span>
                     </div>
                  </div>

                  <div className="text-[#a19f9d] group-hover:text-[#323130] transition-colors">
                     <ChevronRight size={16} />
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="py-24 flex flex-col items-center justify-center text-center bg-white">
              <div className="w-16 h-16 bg-[#f3f2f1] rounded-full flex items-center justify-center text-[#c8c6c4] mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-lg font-light text-[#323130]">You're all caught up</h3>
              <p className="text-sm text-[#605e5c] mt-1">No pending delivery requests at this time.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DeliveryRequestsPage;
