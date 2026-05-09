
import React, { useState, useMemo } from 'react';
import { SaleRecord, Artwork, ArtworkStatus, SaleStatus, UserPermissions, DeliveryRequest, DeliveryRequestStatus, ActivityLog, Branch, ReturnType, FramerRecord, ReturnRecord, TransferRequest, ExhibitionEvent, UserRole } from '../types';
import { ICONS } from '../constants';
import { Truck, Package, Clock, Search, ChevronRight, CheckCircle2, AlertCircle, Calendar, LayoutGrid, List as ListIcon, MapPin, Users as UsersIcon, Wrench, X, User, Filter, Info, ArrowLeft } from 'lucide-react';
import { OptimizedImage } from '../components/OptimizedImage';
import { StatusBadge } from '../components/StatusBadge';
import { motion, AnimatePresence } from 'framer-motion';
import MasterView from './MasterView';
import DeliveryFinalizationModal from '../components/modals/DeliveryFinalizationModal';
import DeliveryRequestModal from '../components/modals/DeliveryRequestModal';

interface DeliveriesPageProps {
  sales: SaleRecord[];
  artworks: Artwork[];
  logs: ActivityLog[];
  branches: string[];
  events: ExhibitionEvent[];
  framerRecords: FramerRecord[];
  returnRecords: ReturnRecord[];
  transferRequests: TransferRequest[];
  userPermissions?: UserPermissions;
  onUpdateSale?: (saleId: string, updates: Partial<SaleRecord>) => Promise<boolean>;
  onDispatch?: (artworkId: string) => Promise<boolean>;
  onDeliver?: (artworkId: string, itdr?: string, rsa?: string, orcr?: string, carrier?: string, referenceNumber?: string) => Promise<boolean>;
  onReturn?: (id: string, reason: string, refNumber?: string, proofImage?: string | string[], remarks?: string, type?: ReturnType) => Promise<boolean | void> | boolean | void;
  onReturnToGallery?: (recordId: string, branch: string, resolvedAt?: string) => Promise<boolean | void> | boolean | void;
  onSendToFramer?: (id: string, damageDetails: string, attachmentUrl?: string | string[]) => Promise<boolean | void> | boolean | void;
  onReturnFromFramer?: (recordId: string, branch: string, resolvedAt?: string) => Promise<boolean | void> | boolean | void;
  onTransfer: (id: string, destination: Branch, attachments?: { itdrUrl?: string | string[] }) => void;
  onReserve?: (id: string, details: string, expiryDate?: string, eventId?: string, eventName?: string) => Promise<boolean | void> | boolean | void;
  onCancelReservation?: (id: string) => Promise<boolean | void> | boolean | void;
  onSale: (id: string, clientName: string, clientEmail: string, clientContact: string, delivered: boolean, eventInfo?: { id: string, name: string }, attachment?: string, itdr?: string[], rsa?: string[], orcr?: string[], downpayment?: number, isDownpayment?: boolean) => void;
  onCancelSale: (id: string) => void;
  currentUser?: any;
}


const DeliveriesPage: React.FC<DeliveriesPageProps> = ({ 
  sales, 
  artworks, 
  logs,
  branches,
  events,
  framerRecords,
  returnRecords,
  transferRequests,
  userPermissions,
  onUpdateSale,
  onDispatch,
  onDeliver,
  onReturn,
  onReturnToGallery,
  onSendToFramer,
  onReturnFromFramer,
  onTransfer,
  onReserve,
  onCancelReservation,
  onSale,
  onCancelSale,
  currentUser
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [requestModalSale, setRequestModalSale] = useState<{sale: SaleRecord, artwork: any} | null>(null);
  const [finalizeModalSale, setFinalizeModalSale] = useState<{sale: SaleRecord, artwork: any} | null>(null);
  const [detailsSale, setDetailsSale] = useState<{sale: SaleRecord, artwork: Artwork} | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | 'All'>('All');
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'delivered' | 'failed'>('pending');

  const tabCounts = useMemo(() => {
    const counts = { active: 0, pending: 0, delivered: 0, failed: 0 };
    sales.forEach(sale => {
      if (sale.status !== SaleStatus.APPROVED || sale.isCancelled) return;
      
      if (sale.isDelivered) {
        counts.delivered++;
      } else {
        const status = sale.deliveryRequest?.status;
        if (status === DeliveryRequestStatus.APPROVED || status === DeliveryRequestStatus.DISPATCHED) counts.active++;
        else if (!status || status === DeliveryRequestStatus.PENDING) counts.pending++;
        else if (status === DeliveryRequestStatus.DECLINED) counts.failed++;
      }
    });
    return counts;
  }, [sales]);

  const deliveryItems = useMemo(() => {
    return sales.filter(sale => {
      const isApprovedSale = sale.status === SaleStatus.APPROVED;
      const notCancelled = !sale.isCancelled;
      
      if (!isApprovedSale || notCancelled === false) return false;

      // Filter by Tab
      const hasRequest = !!sale.deliveryRequest;
      const requestStatus = sale.deliveryRequest?.status;

      if (activeTab === 'active') {
        if (sale.isDelivered || (requestStatus !== DeliveryRequestStatus.APPROVED && requestStatus !== DeliveryRequestStatus.DISPATCHED)) return false;
      } else if (activeTab === 'pending') {
        if (sale.isDelivered || (hasRequest && requestStatus !== DeliveryRequestStatus.PENDING)) return false;
      } else if (activeTab === 'delivered') {
        if (!sale.isDelivered) return false;
      } else if (activeTab === 'failed') {
        if (sale.isDelivered || requestStatus !== DeliveryRequestStatus.DECLINED) return false;
      }
      
      const artwork = artworks.find(a => a.id === sale.artworkId) || sale.artworkSnapshot;
      if (!artwork) return false;

      const matchesSearch = 
        artwork.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artwork.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sale.clientName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesBranch = selectedBranch === 'All' || 
        (artwork as Artwork).currentBranch === selectedBranch || 
        (sale.artworkSnapshot?.currentBranch === selectedBranch);

      const matchesClient = selectedClientId === 'All' || sale.clientName === selectedClientId;

      return matchesSearch && matchesBranch && matchesClient;
    }).sort((a, b) => {
      const dateA = a.deliveryDate || a.saleDate;
      const dateB = b.deliveryDate || b.saleDate;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [sales, artworks, searchQuery, selectedBranch, selectedClientId, activeTab]);

  const allClientStats = useMemo(() => {
    const stats: { [key: string]: number } = {};
    sales.forEach(sale => {
      const isApprovedSale = sale.status === SaleStatus.APPROVED;
      if (!isApprovedSale || sale.isCancelled) return;

      // Tab Filtering for counts
      const hasRequest = !!sale.deliveryRequest;
      const requestStatus = sale.deliveryRequest?.status;

      let matchesTab = false;
      if (activeTab === 'active') {
        matchesTab = !sale.isDelivered && (requestStatus === DeliveryRequestStatus.APPROVED || requestStatus === DeliveryRequestStatus.DISPATCHED);
      } else if (activeTab === 'pending') {
        matchesTab = !sale.isDelivered && (!hasRequest || requestStatus === DeliveryRequestStatus.PENDING);
      } else if (activeTab === 'delivered') {
        matchesTab = sale.isDelivered === true;
      } else if (activeTab === 'failed') {
        matchesTab = !sale.isDelivered && requestStatus === DeliveryRequestStatus.DECLINED;
      }

      if (matchesTab) {
        stats[sale.clientName] = (stats[sale.clientName] || 0) + 1;
      }
    });
    return Object.entries(stats).sort(([a], [b]) => a.localeCompare(b));
  }, [sales, activeTab]);

  const filteredClientStats = useMemo(() => {
    if (!clientSearchQuery) return allClientStats;
    return allClientStats.filter(([client]) => 
      client.toLowerCase().includes(clientSearchQuery.toLowerCase())
    );
  }, [allClientStats, clientSearchQuery]);

  const deliveryBranches = useMemo(() => {
    const b = new Set<string>();
    artworks.forEach(a => {
      if (a.currentBranch) b.add(a.currentBranch);
    });
    return Array.from(b).sort();
  }, [artworks]);

  const handleSubmitRequest = (requestData: Partial<DeliveryRequest>) => {
    if (!requestModalSale || !onUpdateSale) return;

    const newRequest: DeliveryRequest = {
      id: `DRQ-${Date.now()}`,
      saleId: requestModalSale.sale.id,
      clientAddress: requestData.clientAddress!,
      deliveryDate: requestData.deliveryDate!,
      extraPersonnelCount: requestData.extraPersonnelCount!,
      toolsNeeded: requestData.toolsNeeded || [],
      remarks: requestData.remarks,
      status: DeliveryRequestStatus.PENDING,
      requestedAt: new Date().toISOString(),
      requestedBy: currentUser?.name || 'System User',
    };

    onUpdateSale(requestModalSale.sale.id, {
      deliveryRequest: newRequest
    });
    setRequestModalSale(null);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#faf9f8]">
      {/* Client Navigator Sidebar with Search */}
      <div className="w-80 bg-[#f3f2f1] border-r border-[#edebe9] flex flex-col shrink-0">
        <div className="p-6 border-b border-[#edebe9] bg-white">
           <div className="flex items-center justify-between mb-4">
             <div>
               <h2 className="text-[16px] font-black text-[#323130] flex items-center gap-3 uppercase tracking-tight">
                 <User className="text-[#605e5c]" size={18} strokeWidth={2.5} />
                 Client Registry
               </h2>
               <p className="text-[10px] font-black text-[#a19f9d] uppercase tracking-[0.2em] mt-1">Pending fulfillment</p>
             </div>
           </div>

           {/* New Client Search Input */}
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#605e5c]" size={14} />
             <input
               type="text"
               placeholder="Search clients..."
               value={clientSearchQuery}
               onChange={(e) => setClientSearchQuery(e.target.value)}
               className="w-full pl-9 pr-8 py-2 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-xs font-medium focus:bg-white focus:ring-1 focus:ring-[#0078d4] focus:border-[#0078d4] outline-none transition-all"
             />
             {clientSearchQuery && (
               <button 
                onClick={() => setClientSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#605e5c] hover:text-[#323130]"
               >
                 <X size={12} />
               </button>
             )}
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {!clientSearchQuery && (
            <>
              <button
                onClick={() => setSelectedClientId('All')}
                className={`w-full text-left px-4 py-3 rounded-sm transition-all flex items-center justify-between group ${
                  selectedClientId === 'All' 
                    ? 'bg-[#0078d4] text-white shadow-lg shadow-[#0078d4]/20' 
                    : 'text-[#605e5c] hover:bg-white hover:text-[#323130]'
                }`}
              >
                <div className="flex items-center gap-3">
                   <Filter size={16} className={selectedClientId === 'All' ? 'text-white' : 'text-[#605e5c] group-hover:text-[#323130]'} />
                  <span className="text-sm font-bold">All Clients</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  selectedClientId === 'All' ? 'bg-white/20' : 'bg-[#edebe9] group-hover:bg-[#e1dfdd]'
                }`}>
                  {allClientStats.reduce((acc, [_, count]) => acc + count, 0)}
                </span>
              </button>

              <div className="py-2">
                <div className="h-px bg-[#edebe9] mx-2" />
              </div>
            </>
          )}

          {filteredClientStats.map(([client, count]) => (
            <button
              key={client}
              onClick={() => setSelectedClientId(client)}
              className={`w-full text-left px-4 py-3 rounded-sm transition-all flex items-center justify-between group ${
                selectedClientId === client 
                  ? 'bg-[#0078d4] text-white shadow-lg shadow-[#0078d4]/20' 
                  : 'text-[#605e5c] hover:bg-white hover:text-[#323130]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${selectedClientId === client ? 'bg-white' : 'bg-[#c8c6c4]'}`} />
                <span className="text-sm font-bold truncate max-w-[160px]">{client}</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                selectedClientId === client ? 'bg-white/20' : 'bg-[#edebe9] group-hover:bg-[#e1dfdd]'
              }`}>
                {count}
              </span>
            </button>
          ))}

          {filteredClientStats.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-xs text-[#605e5c] font-medium italic">No clients found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Workspace with Simple Concept Cards */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#faf9f8]">
        {/* Toolbar */}
        <div className="bg-white border-b border-[#edebe9] px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4 flex-1 w-full md:w-auto">
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#605e5c]" size={16} />
              <input
                type="text"
                placeholder="Search logistics payload..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm focus:bg-white focus:ring-1 focus:ring-[#0078d4] outline-none transition-all"
              />
            </div>
            
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="hidden lg:block px-4 py-2 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-xs font-bold text-[#605e5c] outline-none hover:bg-white transition-colors"
            >
              <option value="All">All Branches</option>
              {deliveryBranches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-[#f3f2f1] p-1 rounded-sm border border-[#edebe9]">
              {[
                { id: 'active', label: 'Active', icon: Truck, count: tabCounts.active, color: '#107c10' },
                { id: 'pending', label: 'Pending', icon: Clock, count: tabCounts.pending, color: '#ffb900' },
                { id: 'delivered', label: 'Delivered', icon: CheckCircle2, count: tabCounts.delivered, color: '#0078d4' },
                { id: 'failed', label: 'Failed', icon: AlertCircle, count: tabCounts.failed, color: '#d13438' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                    activeTab === tab.id 
                      ? 'bg-white text-[#323130] shadow-sm ring-1 ring-[#edebe9]' 
                      : 'text-[#605e5c] hover:bg-white/50'
                  }`}
                >
                  <tab.icon size={14} style={{ color: activeTab === tab.id ? tab.color : undefined }} />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-sm text-[8px] ${
                      activeTab === tab.id ? 'bg-[#323130] text-white' : 'bg-[#edebe9] text-[#605e5c]'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
            
            <div className="w-[1px] h-6 bg-[#edebe9] mx-1" />
            
            <div className="flex items-center gap-1 bg-[#f3f2f1] p-1 rounded-sm">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-sm transition-all ${viewMode === 'grid' ? 'bg-white text-[#0078d4] shadow-sm' : 'text-[#605e5c] hover:bg-white/50'}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-sm transition-all ${viewMode === 'list' ? 'bg-white text-[#0078d4] shadow-sm' : 'text-[#605e5c] hover:bg-white/50'}`}
              >
                <ListIcon size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-8">
           <div className="max-w-[1600px] mx-auto space-y-10">
              <div className="flex items-end justify-between border-b border-[#edebe9] pb-4">
                <div>
                  <p className="text-[10px] font-bold text-[#605e5c] uppercase tracking-widest mb-1">Logistics / Pipeline</p>
                  <h1 className="text-3xl font-black text-[#323130] tracking-tight uppercase">
                    {selectedClientId === 'All' ? 'Master Fulfillment' : selectedClientId}
                  </h1>
                </div>
                {selectedClientId !== 'All' && (
                  <div className="flex items-center gap-2 text-[#605e5c] text-[10px] font-bold uppercase tracking-widest bg-white px-3 py-1.5 rounded-sm border border-[#edebe9]">
                    <Info size={14} className="text-[#0078d4]" />
                    Active Payload
                  </div>
                )}
              </div>

              <AnimatePresence mode="popLayout">
                {deliveryItems.length > 0 ? (
                  viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                      {deliveryItems.map((sale) => {
                        const artwork = artworks.find(a => a.id === sale.artworkId) || (sale.artworkSnapshot as any);

                        return (
                          <motion.div
                            key={sale.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => setDetailsSale({ sale, artwork })}
                            className="group bg-white rounded-sm border border-[#edebe9] overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col h-full cursor-pointer"
                          >
                             {/* Card Image Area */}
                             <div className="aspect-[4/3] overflow-hidden relative bg-[#faf9f8]">
                                <OptimizedImage src={artwork.imageUrl} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" />
                                
                                <div className="absolute top-3 right-3">
                                  <StatusBadge status={artwork.status} sale={sale} artworkPrice={artwork.price} />
                                </div>

                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#323130]/80 to-transparent p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                  <p className="text-white text-[9px] font-black uppercase tracking-widest">{artwork.currentBranch}</p>
                                </div>
                             </div>

                             {/* Card Info Area */}
                             <div className="p-5 flex-1 flex flex-col border-t border-[#edebe9]">
                                <div className="mb-4 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-[#605e5c] tracking-widest uppercase">{artwork.code}</span>
                                    <span className="text-[9px] font-bold text-[#a19f9d] italic">{sale.clientName}</span>
                                  </div>
                                  <h4 className="text-xs font-black text-[#323130] leading-snug line-clamp-1 group-hover:text-[#0078d4] transition-colors uppercase tracking-tight">{artwork.title}</h4>
                                  <p className="text-[10px] text-[#605e5c] font-bold uppercase opacity-60 tracking-wider">{artwork.artist}</p>
                                </div>

                                <div className="mt-auto pt-5 border-t border-[#f3f2f1] grid grid-cols-2 gap-3">
                                    {sale.deliveryRequest?.status === DeliveryRequestStatus.DISPATCHED ? (
                                      <button 
                                        disabled={sale.isDelivered}
                                        onClick={(e) => { e.stopPropagation(); if (!sale.isDelivered) setFinalizeModalSale({ sale, artwork }); }}
                                        className={`py-2.5 rounded-sm text-[9px] font-black uppercase tracking-widest transition-all ${
                                          sale.isDelivered
                                            ? 'bg-[#f3f2f1] text-[#c8c6c4] cursor-not-allowed'
                                            : 'bg-[#0078d4] text-white shadow-lg shadow-[#0078d4]/20 hover:bg-[#106ebe]'
                                        }`}
                                      >
                                        {sale.isDelivered ? 'Delivered' : 'Mark as Delivered'}
                                      </button>
                                    ) : (
                                      <button 
                                        disabled={sale.isDelivered || sale.deliveryRequest?.status !== DeliveryRequestStatus.APPROVED}
                                        onClick={(e) => { e.stopPropagation(); onDispatch && onDispatch(artwork.id); }}
                                        className={`py-2.5 rounded-sm text-[9px] font-black uppercase tracking-widest transition-all ${
                                          sale.isDelivered ? 'bg-[#f3f2f1] text-[#c8c6c4] cursor-not-allowed' :
                                          sale.deliveryRequest?.status === DeliveryRequestStatus.APPROVED ? 'bg-[#107c10] text-white shadow-lg shadow-[#107c10]/20 hover:bg-[#0b5a0b]' : 'bg-[#f3f2f1] text-[#a19f9d] cursor-not-allowed'
                                        }`}
                                      >
                                        {sale.isDelivered ? 'Archived' : 'Confirm Dispatch'}
                                      </button>
                                    )}
                                   <button 
                                     disabled={sale.isDelivered || sale.deliveryRequest?.status === DeliveryRequestStatus.PENDING}
                                     onClick={(e) => { e.stopPropagation(); setRequestModalSale({ sale, artwork }); }}
                                     className={`py-2.5 rounded-sm text-[9px] font-black uppercase tracking-widest transition-all ${
                                       sale.isDelivered ? 'bg-[#f3f2f1] text-[#c8c6c4] cursor-not-allowed' :
                                       sale.deliveryRequest?.status === DeliveryRequestStatus.PENDING ? 'bg-[#f3f2f1] text-[#a19f9d] cursor-not-allowed' :
                                       'bg-[#323130] text-white hover:bg-[#000000] shadow-md shadow-black/10'
                                     }`}
                                   >
                                     {sale.deliveryRequest?.status === DeliveryRequestStatus.DECLINED ? 'Retry Payload' : (sale.deliveryRequest ? 'Edit Payload' : 'Schedule')}
                                   </button>
                                </div>
                             </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-white rounded-sm border border-[#edebe9] overflow-hidden shadow-sm">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-[#f3f2f1] border-b border-[#edebe9]">
                            <th className="px-8 py-5 text-[9px] font-black text-[#605e5c] uppercase tracking-widest">Payload Spec</th>
                            <th className="px-8 py-5 text-[9px] font-black text-[#605e5c] uppercase tracking-widest">Status</th>
                            <th className="px-8 py-5 text-[9px] font-black text-[#605e5c] uppercase tracking-widest text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#edebe9]">
                           {deliveryItems.map((sale) => {
                             const artwork = artworks.find(a => a.id === sale.artworkId) || sale.artworkSnapshot!;

                             return (
                               <tr 
                                 key={sale.id} 
                                 onClick={() => setDetailsSale({ sale, artwork })}
                                 className="hover:bg-[#faf9f8] transition-colors group cursor-pointer"
                               >
                                 <td className="px-8 py-4">
                                    <div className="flex items-center gap-4">
                                      <div className="w-12 h-12 rounded-sm overflow-hidden bg-[#faf9f8] border border-[#edebe9] shrink-0">
                                         <OptimizedImage src={artwork.imageUrl} className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all" />
                                      </div>
                                      <div>
                                        <p className="text-[9px] font-black text-[#a19f9d] uppercase tracking-widest mb-0.5">{artwork.code}</p>
                                        <h3 className="text-[11px] font-black text-[#323130] leading-none uppercase tracking-tight group-hover:text-[#0078d4] transition-colors">{artwork.title}</h3>
                                        <p className="text-[9px] text-[#605e5c] font-bold uppercase mt-1 opacity-60">{artwork.artist}</p>
                                      </div>
                                    </div>
                                 </td>
                                 <td className="px-8 py-4">
                                         <StatusBadge status={artwork.status} sale={sale} artworkPrice={artwork.price} />
                                 </td>
                                 <td className="px-8 py-4 text-right">
                                    <div className="flex items-center justify-end gap-3">
                                      <button 
                                        disabled={sale.isDelivered || sale.deliveryRequest?.status === DeliveryRequestStatus.PENDING}
                                        onClick={(e) => { e.stopPropagation(); setRequestModalSale({ sale, artwork }); }}
                                        className={`px-5 py-2 rounded-sm text-[9px] font-black uppercase tracking-widest transition-all ${
                                          sale.isDelivered ? 'bg-[#f3f2f1] text-[#c8c6c4] cursor-not-allowed' :
                                          sale.deliveryRequest?.status === DeliveryRequestStatus.PENDING ? 'bg-[#f3f2f1] text-[#a19f9d] cursor-not-allowed' :
                                          'bg-[#f3f2f1] text-[#323130] hover:bg-[#edebe9]'
                                        }`}
                                      >
                                        {sale.deliveryRequest?.status === DeliveryRequestStatus.DECLINED ? 'Retry' : (sale.deliveryRequest ? 'Edit' : 'Schedule')}
                                      </button>
                                      {sale.deliveryRequest?.status === DeliveryRequestStatus.DISPATCHED ? (
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); setFinalizeModalSale({ sale, artwork }); }}
                                          className="px-5 py-2 rounded-sm text-[9px] font-black uppercase tracking-widest transition-all bg-[#0078d4] text-white shadow-md shadow-[#0078d4]/20 hover:bg-[#106ebe]"
                                        >
                                          Deliver
                                        </button>
                                      ) : (
                                        <button 
                                          disabled={sale.isDelivered || sale.deliveryRequest?.status !== DeliveryRequestStatus.APPROVED}
                                          onClick={(e) => { e.stopPropagation(); onDispatch && onDispatch(artwork.id); }}
                                          className={`px-5 py-2 rounded-sm text-[9px] font-black uppercase tracking-widest transition-all ${
                                            sale.isDelivered ? 'bg-[#f3f2f1] text-[#c8c6c4] cursor-not-allowed' :
                                            sale.deliveryRequest?.status === DeliveryRequestStatus.APPROVED ? 'bg-[#107c10] text-white shadow-md shadow-[#107c10]/20 hover:bg-[#0b5a0b]' : 'bg-[#323130] text-white hover:bg-black'
                                          }`}
                                        >
                                          {sale.isDelivered ? 'Done' : 'Fulfill'}
                                        </button>
                                      )}
                                    </div>
                                 </td>
                               </tr>
                             );
                           })}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : (
                  <div className="py-40 flex flex-col items-center justify-center text-center">
                     <div className="w-20 h-20 bg-[#f3f2f1] rounded-full flex items-center justify-center mb-6">
                       <Truck size={32} className="text-[#a19f9d]" strokeWidth={1.5} />
                     </div>
                     <h3 className="text-sm font-black text-[#323130] uppercase tracking-widest">Pipeline Clear</h3>
                     <p className="text-[10px] text-[#605e5c] font-bold uppercase mt-2 opacity-60">No active fulfillment payload detected.</p>
                  </div>
                )}
              </AnimatePresence>
           </div>
        </div>
      </div>

      {/* Logistics Modal */}
      <AnimatePresence>
        {requestModalSale && (
          <DeliveryRequestModal 
            sale={requestModalSale.sale}
            artwork={requestModalSale.artwork}
            onClose={() => setRequestModalSale(null)}
            onSubmit={handleSubmitRequest}
          />
        )}
        {finalizeModalSale && (
          <DeliveryFinalizationModal 
            sale={finalizeModalSale.sale}
            artwork={finalizeModalSale.artwork}
            onClose={() => setFinalizeModalSale(null)}
            onConfirm={(itdr, rsa, orcr, carrier, referenceNumber) => {
              onDeliver && onDeliver(finalizeModalSale.artwork.id, itdr, rsa, orcr, carrier, referenceNumber);
              setFinalizeModalSale(null);
            }}
          />
        )}
        {detailsSale && (
          <div className="fixed inset-0 z-[150] bg-white overflow-y-auto">
             <div className="max-w-[1400px] mx-auto">
                <MasterView 
                   artwork={detailsSale.artwork}
                   branches={branches}
                   logs={logs.filter(l => String(l.artworkId) === String(detailsSale.artwork.id))}
                   sale={detailsSale.sale}
                   userRole={currentUser?.role || UserRole.SALES_AGENT}
                   userBranch={currentUser?.branch}
                   userPermissions={userPermissions}
                   events={events}
                   onReturn={onReturn}
                   onReturnToGallery={onReturnToGallery}
                   onSendToFramer={onSendToFramer}
                   onReturnFromFramer={onReturnFromFramer}
                   onEdit={() => {}}
                   onBack={() => setDetailsSale(null)}
                   onTransfer={onTransfer}
                   onReserve={onReserve}
                   onCancelReservation={onCancelReservation}
                   onSale={onSale}
                   onCancelSale={onCancelSale}
                   onDeliver={onDeliver}
                   framerRecords={framerRecords}
                   returnRecords={returnRecords}
                   transferRequests={transferRequests}
                />
             </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DeliveriesPage;
