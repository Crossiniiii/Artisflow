
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  ArrowRight,
  RefreshCcw,
  FileText,
  Tag,
  Home,
  User
} from 'lucide-react';
import { SaleRecord, Artwork, SaleStatus } from '../types';
import { OptimizedImage } from '../components/OptimizedImage';

interface AgentRequestsPageProps {
  sales: SaleRecord[];
  artworks: Artwork[];
  currentUser?: any;
  userPermissions?: any;
  onViewArtwork: (id: string, autoOpenSale?: boolean) => void;
}

const AgentRequestsPage: React.FC<AgentRequestsPageProps> = ({ sales, artworks, currentUser, onViewArtwork }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'declined' | 'approved'>('all');

  const mySales = useMemo(() => {
    return sales
      .filter(s => s.agentId === currentUser.id || s.agentName === currentUser.name)
      .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
  }, [sales, currentUser]);

  const filteredSales = useMemo(() => {
    if (activeTab === 'all') return mySales;
    if (activeTab === 'pending') return mySales.filter(s => s.status === SaleStatus.FOR_SALE_APPROVAL || !s.status);
    if (activeTab === 'declined') return mySales.filter(s => s.status === SaleStatus.DECLINED);
    if (activeTab === 'approved') return mySales.filter(s => s.status === SaleStatus.APPROVED);
    return mySales;
  }, [mySales, activeTab]);

  const getArtwork = (id: string) => artworks.find(a => a.id === id);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };

  const getStatusBadge = (status?: SaleStatus) => {
    switch (status) {
      case SaleStatus.APPROVED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm">
            <CheckCircle size={12} />
            Accepted
          </span>
        );
      case SaleStatus.DECLINED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest border border-rose-700 shadow-lg shadow-rose-200 animate-pulse">
            <AlertCircle size={12} />
            Declined: Action Required
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest border border-amber-100 shadow-sm">
            <Clock size={12} />
            In Review
          </span>
        );
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-10 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-2 border-neutral-900 pb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-50 text-orange-600 rounded-sm border border-orange-100 text-[10px] font-black uppercase tracking-widest mb-3">
            <MessageSquare size={12} />
            Submission Hub
          </div>
          <h1 className="text-4xl font-black text-neutral-900 tracking-tight">My Requests</h1>
          <p className="text-sm font-medium text-neutral-500 mt-2">Track your sale declarations and handle admin feedback.</p>
        </div>

        <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl border border-neutral-200">
          {(['all', 'pending', 'declined', 'approved'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-all ${
                activeTab === tab 
                  ? 'bg-white text-neutral-900 shadow-md border border-neutral-200/50 scale-105 z-10' 
                  : 'text-neutral-400 hover:text-neutral-600'
              }`}
            >
              {tab}
              {tab === 'declined' && mySales.filter(s => s.status === SaleStatus.DECLINED).length > 0 && (
                <span className="ml-2 w-4 h-4 bg-rose-600 text-white text-[8px] flex items-center justify-center rounded-full animate-bounce">
                  {mySales.filter(s => s.status === SaleStatus.DECLINED).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Grid */}
      <div className="grid grid-cols-1 gap-6">
        {filteredSales.length === 0 ? (
          <div className="py-32 bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center text-neutral-300 gap-4">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm border border-neutral-100 text-neutral-200">
              <RefreshCcw size={40} strokeWidth={1} />
            </div>
            <div className="text-center">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-neutral-400">No requests found</p>
              <p className="text-[10px] font-bold mt-1 tracking-widest">Your sale declarations will appear here once submitted.</p>
            </div>
          </div>
        ) : (
          filteredSales.map((sale) => {
            const art = getArtwork(sale.artworkId);
            const isDeclined = sale.status === SaleStatus.DECLINED;

            return (
              <motion.div
                key={sale.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`group relative overflow-hidden rounded-3xl border transition-all duration-300 hover:shadow-xl ${
                  isDeclined 
                    ? 'border-rose-200 bg-rose-50/30' 
                    : 'border-neutral-200 bg-white hover:border-neutral-300'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-stretch min-h-[160px]">
                  {/* Artwork Preview */}
                  <div className="w-full lg:w-48 bg-neutral-100 relative overflow-hidden">
                    {art?.imageUrl ? (
                      <OptimizedImage src={art.imageUrl} alt={art.title} className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-300">
                        <Tag size={40} strokeWidth={1} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent lg:hidden" />
                    <div className="absolute bottom-4 left-4 lg:hidden">
                      {getStatusBadge(sale.status)}
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 p-6 lg:p-8 flex flex-col justify-between gap-6">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div>
                        <div className="hidden lg:block mb-3">
                          {getStatusBadge(sale.status)}
                        </div>
                        <h3 className="text-2xl font-black text-neutral-900 tracking-tight leading-tight">{art?.title || 'Untitled Artwork'}</h3>
                        <p className="text-sm font-bold text-neutral-500 uppercase tracking-widest mt-1">{art?.artist || 'Unknown Artist'}</p>
                      </div>

                      <div className="flex flex-wrap gap-6 text-right">
                        <div>
                          <p className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-1">Declared On</p>
                          <p className="text-sm font-black text-neutral-900">{new Date(sale.saleDate).toLocaleDateString()}</p>
                        </div>
                        <div className={isDeclined && sale.requestedAttachments?.includes('price') ? 'p-2 bg-rose-50 rounded-xl border border-rose-200 animate-pulse' : ''}>
                          <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${isDeclined && sale.requestedAttachments?.includes('price') ? 'text-rose-600' : 'text-neutral-400'}`}>Value</p>
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-black ${isDeclined && sale.requestedAttachments?.includes('price') ? 'text-rose-700' : 'text-emerald-600'}`}>
                              {formatCurrency(art?.price || 0)}
                            </p>
                            {isDeclined && sale.requestedAttachments?.includes('price') && (
                              <AlertCircle size={14} className="text-rose-600" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-neutral-100">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-neutral-50 rounded-lg text-neutral-400"><User size={16} /></div>
                        <div className="min-w-0"><p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Client</p><p className="text-xs font-bold text-neutral-900 truncate">{sale.clientName}</p></div>
                      </div>
                      <div className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${isDeclined && sale.requestedAttachments?.includes('branch') ? 'bg-rose-50 border border-rose-100 animate-pulse' : ''}`}>
                        <div className={`p-2 rounded-lg ${isDeclined && sale.requestedAttachments?.includes('branch') ? 'bg-rose-100 text-rose-600' : 'bg-neutral-50 text-neutral-400'}`}><Home size={16} /></div>
                        <div className="min-w-0">
                          <p className={`text-[9px] font-black uppercase tracking-widest ${isDeclined && sale.requestedAttachments?.includes('branch') ? 'text-rose-600' : 'text-neutral-400'}`}>Branch</p>
                          <p className={`text-xs font-bold truncate ${isDeclined && sale.requestedAttachments?.includes('branch') ? 'text-rose-700' : 'text-neutral-900'}`}>{art?.currentBranch || 'Main'}</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${isDeclined && sale.requestedAttachments?.some(r => ['itdr', 'rsa', 'orcr'].includes(r)) ? 'bg-rose-50 border border-rose-100 animate-pulse' : ''}`}>
                        <div className={`p-2 rounded-lg ${isDeclined && sale.requestedAttachments?.some(r => ['itdr', 'rsa', 'orcr'].includes(r)) ? 'bg-rose-100 text-rose-600' : 'bg-neutral-50 text-neutral-400'}`}><FileText size={16} /></div>
                        <div className="min-w-0">
                          <p className={`text-[9px] font-black uppercase tracking-widest ${isDeclined && sale.requestedAttachments?.some(r => ['itdr', 'rsa', 'orcr'].includes(r)) ? 'text-rose-600' : 'text-neutral-400'}`}>Documents</p>
                          <div className="flex gap-1 mt-0.5">
                            {['itdr', 'rsa', 'orcr'].map(type => {
                              const isMissing = !sale[`${type}Url` as keyof SaleRecord];
                              const isRequested = isDeclined && sale.requestedAttachments?.includes(type);
                              return (
                                <div 
                                  key={type} 
                                  className={`w-2.5 h-2.5 rounded-full border-2 ${
                                    isRequested ? 'bg-rose-600 border-rose-200 animate-bounce' : 
                                    isMissing ? 'bg-neutral-200 border-transparent' : 'bg-emerald-400 border-transparent'
                                  }`} 
                                  title={type.toUpperCase() + (isRequested ? ' (Action Required)' : '')} 
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {isDeclined && sale.declineReason && (
                      <div className="mt-4 p-5 bg-white rounded-2xl border border-rose-100 shadow-sm animate-in slide-in-from-left-2 duration-500">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center flex-shrink-0">
                            <AlertCircle size={20} />
                          </div>
                          <div className="flex-1">
                            <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Feedback from Admin</p>
                            <p className="text-sm font-medium text-neutral-700 italic">"{sale.declineReason}"</p>
                            
                            {sale.requestedAttachments && sale.requestedAttachments.length > 0 && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {sale.requestedAttachments.map(req => (
                                  <span key={req} className="px-3 py-1 bg-rose-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-sm shadow-rose-200">
                                    {req === 'itdr' ? 'Re-upload IT/DR' : 
                                     req === 'rsa' ? 'Re-upload RSA/AR' : 
                                     req === 'orcr' ? 'Re-upload OR/CR' : 
                                     req === 'price' ? 'Correct Price' :
                                     req === 'branch' ? 'Fix Branch' : 
                                     req.toUpperCase()}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button 
                            onClick={() => onViewArtwork(sale.artworkId, true)}
                            className="flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95 group/btn"
                          >
                            <RefreshCcw size={14} className="group-hover/btn:rotate-180 transition-transform duration-500" />
                            Fix & Resubmit
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions (Desktop) */}
                  {!isDeclined && (
                    <div className="hidden lg:flex flex-col border-l border-neutral-100 p-6 items-center justify-center gap-3 bg-neutral-50/50">
                      <button 
                        onClick={() => onViewArtwork(sale.artworkId)}
                        className="p-3 bg-white border border-neutral-200 text-neutral-400 rounded-2xl hover:text-neutral-900 hover:border-neutral-900 hover:shadow-md transition-all active:scale-95"
                        title="View Artwork Details"
                      >
                        <ArrowRight size={20} />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AgentRequestsPage;
