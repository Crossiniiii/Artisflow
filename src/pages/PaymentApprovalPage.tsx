import React, { useState } from 'react';
import { SaleRecord, Artwork, UserPermissions } from '../types';
import { CheckCircle, XCircle, Tag, User, Calendar, Info, AlertCircle, Eye, ExternalLink, Paperclip, Clock, Shield, Trash2, LayoutGrid, Rows3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useActionProcessing } from '../hooks/useActionProcessing';
import LoadingOverlay from '../components/LoadingOverlay';

interface PaymentApprovalPageProps {
  sales: SaleRecord[];
  artworks: Artwork[];
  onApprovePaymentEdit: (saleId: string, paymentId: string) => void;
  onDeclinePaymentEdit: (saleId: string, paymentId: string, reason?: string, requestedFiles?: string[]) => void;
  onBulkDeletePayments?: (items: { saleId: string, paymentId: string }[]) => void;
  userPermissions?: UserPermissions;
  hideHeader?: boolean;
}

const PaymentApprovalPage: React.FC<PaymentApprovalPageProps> = ({
  sales,
  artworks,
  onApprovePaymentEdit,
  onDeclinePaymentEdit,
  onBulkDeletePayments,
  userPermissions,
  hideHeader
}) => {
  const [activeTab, setActiveTab] = useState<'approval' | 'history'>('approval');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [declineModalItem, setDeclineModalItem] = useState<any | null>(null);
  const [declineReason, setDeclineReason] = useState<string>('');
  const [declineMode, setDeclineMode] = useState<'remediation' | 'straight'>('remediation');
  const [requestedFiles, setRequestedFiles] = useState<string[]>([]);
  const { isProcessing, processMessage, wrapAction } = useActionProcessing({
    itemTitle: 'Payment Approval',
    itemCode: 'PAY'
  });

  // Extract pending payments
  const pendingPayments = (() => {
    const list: any[] = [];
    sales.forEach(sale => {
      // Prioritize live artwork but fallback to snapshot for historical accuracy
      const liveArt = artworks.find(a => a.id === sale.artworkId);
      const art = liveArt || sale.artworkSnapshot;

      // 1. Pending Downpayment Edits
      if (sale.pendingDownpaymentEdit) {
        const totalOthers = (sale.installments || []).filter(i => !i.isPending).reduce((sum, inst) => sum + inst.amount, 0);
        const isOverpayment = (totalOthers + sale.pendingDownpaymentEdit.amount) > (art?.price || 0) + 0.01;

        list.push({
          saleId: sale.id,
          paymentId: 'downpayment',
          artwork: art,
          clientName: sale.clientName,
          type: 'downpayment',
          currentAmount: sale.downpayment || 0,
          newAmount: sale.pendingDownpaymentEdit.amount,
          requestedBy: sale.pendingDownpaymentEdit.requestedBy,
          requestedAt: sale.pendingDownpaymentEdit.requestedAt,
          isOverpayment,
          isNewPayment: false,
          agentName: sale.agentName,
          branch: art?.currentBranch || 'Main'
        });
      }

      // 2. Pending Installments
      sale.installments?.forEach(inst => {
        if (inst.isPending) {
          const totalOthers = (sale.downpayment || 0) + (sale.installments || []).filter(i => i.id !== inst.id && !i.isPending).reduce((sum, i) => sum + i.amount, 0);
          const isOverpayment = (totalOthers + inst.amount) > (art?.price || 0) + 0.01;

          list.push({
            saleId: sale.id,
            paymentId: inst.id,
            artwork: art,
            clientName: sale.clientName,
            type: 'installment',
            currentAmount: 0,
            newAmount: inst.amount,
            requestedBy: inst.recordedBy,
            requestedAt: inst.createdAt || new Date().toISOString(),
            isOverpayment,
            isNewPayment: true,
            attachments: inst.attachmentUrls,
            agentName: inst.recordedBy || sale.agentName,
            branch: art?.currentBranch || 'Main'
          });
        } else if (inst.pendingEdit) {
          const totalOthers = (sale.downpayment || 0) + (sale.installments || []).filter(i => i.id !== inst.id && !i.isPending).reduce((sum, i) => sum + i.amount, 0);
          const isOverpayment = (totalOthers + inst.pendingEdit.amount) > (art?.price || 0) + 0.01;

          list.push({
            saleId: sale.id,
            paymentId: inst.id,
            artwork: art,
            clientName: sale.clientName,
            type: 'installment',
            currentAmount: inst.amount,
            newAmount: inst.pendingEdit.amount,
            requestedBy: inst.pendingEdit.requestedBy,
            requestedAt: inst.pendingEdit.requestedAt,
            isOverpayment,
            isNewPayment: false,
            attachments: (inst.pendingEdit as any).attachmentUrls || inst.attachmentUrls,
            agentName: inst.pendingEdit.requestedBy || sale.agentName,
            branch: art?.currentBranch || 'Main'
          });
        }
      });
    });
    return list.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  })();


  // Aggregate Approval History
  const approvalHistory = (() => {
    const list: any[] = [];
    sales.forEach(sale => {
      const liveArt = artworks.find(a => a.id === sale.artworkId);
      const art = liveArt || sale.artworkSnapshot;
      const branch = art?.currentBranch || 'Main';

      // 1. Approved Downpayments (If no pending edit)
      if (!sale.pendingDownpaymentEdit && sale.downpayment) {
        list.push({
          id: `${sale.id}-dp`,
          saleId: sale.id,
          artwork: art,
          clientName: sale.clientName,
          type: 'Downpayment',
          amount: sale.downpayment,
          approvedAt: sale.saleDate,
          branch,
          agentName: sale.agentName
        });
      }

      // 2. Installments (Approved or Declined)
      sale.installments?.forEach(inst => {
        if (!inst.isPending && !inst.pendingEdit) {
          list.push({
            id: inst.id,
            saleId: sale.id,
            artwork: art,
            clientName: sale.clientName,
            type: 'Installment',
            amount: inst.amount,
            approvedAt: inst.isDeclined ? inst.declinedAt : (inst.createdAt || sale.saleDate),
            branch,
            isDeclined: inst.isDeclined,
            agentName: inst.recordedBy || sale.agentName
          });
        }
      });
    });
    return list.sort((a, b) => new Date(b.approvedAt).getTime() - new Date(a.approvedAt).getTime());
  })();


  const branches = ['All', ...Array.from(new Set(approvalHistory.map(h => h.branch)))].filter(b => b !== 'Main').sort();
  const filteredHistory = selectedBranch === 'All' 
    ? approvalHistory 
    : approvalHistory.filter(h => h.branch === selectedBranch);

  const handleToggleSelectAllHistory = () => {
    if (selectedHistoryIds.length === filteredHistory.length && filteredHistory.length > 0) {
      setSelectedHistoryIds([]);
    } else {
      setSelectedHistoryIds(filteredHistory.map(h => h.id));
    }
  };

  const handleToggleSelectHistory = (id: string) => {
    setSelectedHistoryIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (onBulkDeletePayments && selectedHistoryIds.length > 0) {
      const itemsToDelete = selectedHistoryIds.map(id => {
        const item = filteredHistory.find(h => h.id === id);
        return {
          saleId: item?.saleId || '',
          paymentId: id
        };
      }).filter(i => i.saleId !== '');
      
      onBulkDeletePayments(itemsToDelete);
      setSelectedHistoryIds([]);
    }
  };

  const openDeclineModal = (item: any) => {
    setDeclineModalItem(item);
    setSelectedItem(null);
    setDeclineReason('');
    setDeclineMode('remediation');
    setRequestedFiles([]);
  };

  const closeDeclineModal = () => {
    setDeclineModalItem(null);
    setDeclineReason('');
    setDeclineMode('remediation');
    setRequestedFiles([]);
  };

  const confirmDeclinePayment = async () => {
    if (!declineModalItem || (declineMode === 'remediation' && !declineReason)) return;

    const item = declineModalItem;
    const filesToRequest = declineMode === 'straight' ? [] : requestedFiles;
    const reasonToSubmit = declineMode === 'straight' ? 'Straight rejection' : declineReason;
    const success = await wrapAction(
      () => onDeclinePaymentEdit(item.saleId, item.paymentId, reasonToSubmit, filesToRequest),
      'Declining Payment...'
    );

    if (success !== false) {
      closeDeclineModal();
    }
  };

  return (
    <div className={`max-w-[1600px] mx-auto w-full ${hideHeader ? '' : 'p-4 md:p-8 space-y-10'}`}>
      <LoadingOverlay isVisible={isProcessing} title={processMessage} />
      
      {!hideHeader && (
        <div className="flex flex-col gap-8 pb-10">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Financial Approvals</h1>
              <p className="text-sm font-medium text-slate-500 mt-2">Verify and audit collection entries for audit integrity</p>
            </div>
            <div className="flex items-center gap-8">
               <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Pending Volume</p>
                <p className="text-3xl font-black text-slate-900 leading-none">{pendingPayments.reduce((sum, p) => sum + p.newAmount, 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</p>
              </div>
              <div className="h-10 w-[1px] bg-slate-200" />
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Total Entries</p>
                <p className="text-3xl font-black text-slate-900 leading-none">{pendingPayments.length}</p>
              </div>
            </div>
          </div>

          {/* Primary Tabs */}
          <div className="flex gap-2 p-1.5 bg-slate-100/80 rounded-xl w-fit border border-slate-200/60 backdrop-blur-md">
            <button
              onClick={() => setActiveTab('approval')}
              className={`px-8 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all flex items-center gap-3 ${activeTab === 'approval' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Shield size={16} />
              Pending Verification
              {pendingPayments.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                  {pendingPayments.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-8 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all flex items-center gap-3 ${activeTab === 'history' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Clock size={16} />
              Collection History
            </button>
          </div>
        </div>
      )}


      {hideHeader && (
         <div className="flex items-center justify-between mb-8">
            <div className="flex gap-1 p-1 bg-neutral-100 rounded-sm w-fit border border-neutral-200">
                <button
                  onClick={() => setActiveTab('approval')}
                  className={`px-8 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-sm transition-all flex items-center gap-2 ${activeTab === 'approval' ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/50' : 'text-neutral-400 hover:text-neutral-600'}`}
                >
                  Pending Collection
                  {pendingPayments.length > 0 && (
                    <span className="ml-1 w-4 h-4 bg-indigo-600 text-white text-[8px] flex items-center justify-center rounded-full">
                      {pendingPayments.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-8 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-sm transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/50' : 'text-neutral-400 hover:text-neutral-600'}`}
                >
                  Collection History
                </button>
              </div>

              {activeTab === 'approval' && (
                <div className="flex gap-1 p-1 bg-neutral-100 rounded-sm border border-neutral-200">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-sm transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm border border-neutral-200/50' : 'text-neutral-400 hover:text-neutral-600'}`}
                    title="List View"
                  >
                    <Rows3 size={14} />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-sm transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm border border-neutral-200/50' : 'text-neutral-400 hover:text-neutral-600'}`}
                    title="Grid View"
                  >
                    <LayoutGrid size={14} />
                  </button>
                </div>
              )}
          </div>
      )}

      <AnimatePresence mode="wait">
        {activeTab === 'approval' ? (
          <motion.div
            key="approval"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Approval Notice Banner */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex items-start gap-4 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <Shield size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-blue-900 uppercase tracking-widest">Financial Review: Pending Verification</h4>
                  <p className="text-[11px] text-blue-700/80 mt-1 leading-relaxed max-w-2xl font-bold">
                    These payment entries are currently awaiting administrative confirmation. Ledger balances and installment records will only update once the transaction is verified and approved.
                  </p>
                </div>
              </div>

              {pendingPayments.length === 0 ? (
              <div className="py-24 bg-neutral-50 rounded-sm border border-dashed border-neutral-200 flex flex-col items-center justify-center text-neutral-300 gap-4">
                <CheckCircle size={56} strokeWidth={1} />
                <div className="text-center">
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-neutral-400">Records Synchronized</p>
                  <p className="text-[10px] font-bold mt-1 tracking-widest">No pending financial entries require attention.</p>
                </div>
              </div>
            ) : viewMode === 'list' ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-[0_2px_12px_rgba(15,23,42,0.04)] overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Artwork & Client</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Type</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Value</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Agent</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <AnimatePresence mode="popLayout">
                      {pendingPayments.map((item) => (
                        <motion.tr 
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          key={`${item.saleId}-${item.paymentId}`} 
                          className="group hover:bg-blue-50/30 transition-all cursor-pointer"
                          onClick={() => setSelectedItem(item)}
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200 shadow-sm group-hover:scale-105 transition-transform">
                                {item.artwork?.imageUrl ? (
                                  <img src={item.artwork.imageUrl} className="w-full h-full object-cover transition-all duration-500" alt="" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                                    <Tag size={16} />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate tracking-tight mb-0.5">{item.artwork?.title || 'Unknown Artwork'}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.clientName}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${item.type === 'downpayment' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                              {item.type}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col">
                              <span className={`text-sm font-black ${item.isOverpayment ? 'text-rose-600' : 'text-slate-900'} tracking-tight`}>
                                {item.newAmount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                              </span>
                              {item.isOverpayment && (
                                <div className="flex items-center gap-1 mt-1">
                                  <AlertCircle size={10} className="text-rose-500" />
                                  <span className="text-[8px] font-bold text-rose-400 uppercase tracking-tighter">Variance Detected</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
                                <User size={12} />
                              </div>
                              <span className="text-xs font-bold text-slate-600 truncate max-w-[120px]">{item.agentName || item.requestedBy}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItem(item);
                                }}
                                className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-blue-600 group-hover:border-blue-200 transition-all bg-white hover:bg-blue-50 active:scale-95"
                              >
                                Review
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onBulkDeletePayments) {
                                    onBulkDeletePayments([{ saleId: item.saleId, paymentId: item.paymentId }]);
                                  }
                                }}
                                className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all bg-white hover:bg-rose-50"
                                title="Delete Request"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {pendingPayments.map((item) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={`${item.saleId}-${item.paymentId}`}
                      onClick={() => setSelectedItem(item)}
                      className="group bg-white rounded-2xl border border-slate-200 p-5 shadow-[0_2px_8px_rgba(15,23,42,0.02)] hover:shadow-[0_20px_40px_rgba(15,23,42,0.08)] hover:-translate-y-1 transition-all cursor-pointer"
                    >
                      <div className="flex gap-5">
                        <div className="w-20 h-20 rounded-xl bg-slate-50 overflow-hidden border border-slate-100 shrink-0 shadow-inner">
                          {item.artwork?.imageUrl ? (
                            <img src={item.artwork.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-200">
                              <Tag size={24} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                             <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${item.type === 'downpayment' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                {item.type}
                              </span>
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <Clock size={10} />
                                <span className="text-[9px] font-bold">{new Date(item.requestedAt).toLocaleDateString()}</span>
                              </div>
                          </div>
                          <h4 className="text-sm font-black text-slate-900 mt-2 truncate uppercase tracking-tight">{item.artwork?.title || 'Unknown Artwork'}</h4>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.clientName}</p>
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">₱{(item.artwork?.price || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-5 border-t border-slate-50 flex items-end justify-between">
                        <div>
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Amount for Verification</p>
                           <div className="flex flex-col">
                              <span className={`text-xl font-black ${item.isOverpayment ? 'text-rose-600' : 'text-slate-900'} tracking-tighter leading-none`}>
                                {item.newAmount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                              </span>
                              {item.isOverpayment && (
                                <div className="flex items-center gap-1 mt-1.5">
                                  <AlertCircle size={10} className="text-rose-500" />
                                  <span className="text-[8px] font-black text-rose-500 uppercase tracking-tighter">Variance Flagged</span>
                                </div>
                              )}
                           </div>
                        </div>
                        <div className="flex flex-col items-end">
                           <div className="flex items-center gap-2 mb-2">
                              <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
                                <User size={10} />
                              </div>
                              <span className="text-[10px] font-bold text-slate-500">{item.agentName || item.requestedBy}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onBulkDeletePayments) {
                                    onBulkDeletePayments([{ saleId: item.saleId, paymentId: item.paymentId }]);
                                  }
                                }}
                                className="p-2 bg-white text-slate-400 border border-slate-200 rounded-lg hover:text-rose-600 hover:border-rose-200 transition-all active:scale-95"
                                title="Delete Request"
                              >
                                <Trash2 size={14} />
                              </button>
                              <button className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-[0.15em] shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95">
                                 Verify Entry
                              </button>
                            </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

            )}
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="flex flex-col gap-6">
              {/* Branch Selector */}
              <div className="flex flex-wrap gap-2 p-1 bg-neutral-100 rounded-sm w-fit border border-neutral-200">
                {branches.map(branch => (
                  <button
                    key={branch}
                    onClick={() => setSelectedBranch(branch)}
                    className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all ${selectedBranch === branch ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/50' : 'text-neutral-400 hover:text-neutral-600'}`}
                  >
                    {branch}
                  </button>
                ))}
              </div>

              <div className="bg-white rounded-sm border border-neutral-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200">
                      <th className="px-6 py-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedHistoryIds.length === filteredHistory.length && filteredHistory.length > 0}
                          onChange={handleToggleSelectAllHistory}
                          className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                        />
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Artwork</th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Client</th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Type</th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Agent</th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Amount</th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Verified Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredHistory.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-24 text-center text-[10px] font-bold text-neutral-300 uppercase tracking-widest italic">
                          No verified records found for this selection
                        </td>
                      </tr>
                    ) : (
                      filteredHistory.map((h) => (
                        <tr key={h.id} className={`hover:bg-neutral-50/30 transition-all group ${selectedHistoryIds.includes(h.id) ? 'bg-indigo-50/30' : ''}`}>
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedHistoryIds.includes(h.id)}
                              onChange={() => handleToggleSelectHistory(h.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-sm bg-neutral-50 overflow-hidden border border-neutral-100 shadow-sm">
                                {h.artwork?.imageUrl && <img src={h.artwork.imageUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt="" />}
                              </div>
                              <span className="text-[11px] font-black text-neutral-800 uppercase tracking-tight">{h.artwork?.title}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-[11px] font-bold text-neutral-600">{h.clientName}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 rounded-sm bg-neutral-100 text-neutral-500 text-[8px] font-black uppercase tracking-widest border border-neutral-200">
                              {h.type}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-widest border ${h.isDeclined ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                              {h.isDeclined ? 'Declined' : 'Approved'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[11px] font-bold text-neutral-600">{h.agentName}</td>
                          <td className="px-6 py-4 text-[11px] font-black text-neutral-900">₱{h.amount.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex items-center gap-2 text-neutral-400">
                              <Calendar size={12} />
                              <span className="text-[10px] font-bold">{new Date(h.approvedAt).toLocaleDateString()}</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Selection Bar */}
              <AnimatePresence>
                {selectedHistoryIds.length > 0 && (
                  <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-6 px-8 py-4 bg-neutral-900 text-white rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-neutral-800"
                  >
                    <div className="flex items-center gap-3 pr-6 border-r border-neutral-700">
                      <div className="w-6 h-6 rounded-sm bg-indigo-500 text-white text-[10px] font-black flex items-center justify-center">
                        {selectedHistoryIds.length}
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest text-neutral-400">Selected</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedHistoryIds([])}
                        className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleBulkDelete}
                        className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-sm text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-rose-900/20"
                      >
                        <Trash2 size={14} />
                        Delete Permanently
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.98, y: 10 }} 
              className="relative bg-slate-50 w-full max-w-xl rounded-xl shadow-[0_32px_80px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col max-h-[85vh] border border-slate-200"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-sm">
                    <Info size={16} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Verification Details</h3>
                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">REF: {selectedItem.paymentId.slice(0, 8).toUpperCase()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (onBulkDeletePayments && selectedItem) {
                        onBulkDeletePayments([{ saleId: selectedItem.saleId, paymentId: selectedItem.paymentId }]);
                        setSelectedItem(null);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    title="Delete Request"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button onClick={() => setSelectedItem(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                    <XCircle size={20} />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="w-full md:w-32 aspect-square bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm shrink-0">
                    {selectedItem.artwork?.imageUrl && (
                      <img src={selectedItem.artwork.imageUrl} className="w-full h-full object-cover" alt="" />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-center min-w-0">
                    <div className="mb-3">
                      <h4 className="text-lg font-black text-slate-900 leading-tight truncate uppercase tracking-tight">{selectedItem.artwork?.title}</h4>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{selectedItem.artwork?.artist}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-3">
                      <div className="space-y-0.5">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Type</p>
                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest italic">{selectedItem.type}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Price</p>
                        <p className="text-[10px] font-black text-slate-700">₱{(selectedItem.artwork?.price || 0).toLocaleString()}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Request Date</p>
                        <p className="text-[10px] font-black text-slate-700">{new Date(selectedItem.requestedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collection Progress */}
                {(() => {
                  const sale = sales.find(s => s.id === selectedItem.saleId);
                  const approvedInstallments = (sale?.installments || []).filter(i => !i.isPending);
                  const totalPaid = (sale?.downpayment || 0) + approvedInstallments.reduce((sum, i) => sum + i.amount, 0);
                  const artworkPrice = selectedItem.artwork?.price || 1; // Avoid div by zero
                  const progress = (totalPaid / artworkPrice) * 100;
                  const newProgress = ((totalPaid + selectedItem.newAmount) / artworkPrice) * 100;
                  
                  return (
                    <div className="space-y-3">
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Collection Progress</p>
                          <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Post-approval completion: {Math.min(100, newProgress).toFixed(1)}%</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-900">{progress.toFixed(1)}%</span>
                          <span className="text-[10px] font-bold text-slate-300 mx-1">→</span>
                          <span className="text-xs font-black text-blue-600">{Math.min(100, newProgress).toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        <div className="h-full bg-slate-300" style={{ width: `${Math.min(100, progress)}%` }} />
                        <div className="h-full bg-blue-500 animate-pulse" style={{ width: `${Math.min(100 - progress, newProgress - progress)}%` }} />
                      </div>
                    </div>
                  );
                })()}

                <div className="p-5 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-sm border-l-[6px] border-l-slate-900">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Authorized Amount</p>
                    <p className="text-3xl font-black text-slate-900 tracking-tighter">₱{selectedItem.newAmount.toLocaleString()}</p>
                  </div>
                  {selectedItem.currentAmount > 0 && (
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Previous</p>
                      <p className="text-lg font-bold text-slate-300 line-through tracking-tight">₱{selectedItem.currentAmount.toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {selectedItem.isOverpayment && (
                  <div className="p-4 bg-red-50/50 border border-red-200 rounded-sm flex gap-4">
                    <div className="w-10 h-10 rounded-sm bg-red-100 flex items-center justify-center shrink-0">
                      <AlertCircle size={20} className="text-red-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-1">Administrative Alert: Overpayment</p>
                      <p className="text-[11px] font-medium text-red-600/80 leading-relaxed italic">This payment exceeds the original valuation. Administrative confirmation is required to settle this variance for audit integrity.</p>
                    </div>
                  </div>
                )}

                {/* Payment History Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-neutral-400" />
                      <h5 className="text-[10px] font-black text-neutral-900 uppercase tracking-[0.2em]">Full Payment History</h5>
                    </div>
                    {(() => {
                      const sale = sales.find(s => s.id === selectedItem.saleId);
                      const approvedInstallments = (sale?.installments || []).filter(i => !i.isPending);
                      const totalPaid = (sale?.downpayment || 0) + approvedInstallments.reduce((sum, i) => sum + i.amount, 0);
                      const balance = (selectedItem.artwork?.price || 0) - totalPaid;
                      return (
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-bold text-neutral-400 uppercase">Paid: ₱{totalPaid.toLocaleString()}</span>
                          <span className="w-1 h-1 rounded-full bg-neutral-200" />
                          <span className="text-[9px] font-black text-indigo-600 uppercase">Remaining: ₱{Math.max(0, balance).toLocaleString()}</span>
                        </div>
                      );
                    })()}
                  </div>
                  
                  <div className="bg-neutral-50/50 rounded-xl border border-neutral-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-neutral-100 bg-neutral-50/30">
                          <th className="px-4 py-2 text-[8px] font-black text-neutral-400 uppercase tracking-widest">Date</th>
                          <th className="px-4 py-2 text-[8px] font-black text-neutral-400 uppercase tracking-widest">Type</th>
                          <th className="px-4 py-2 text-[8px] font-black text-neutral-400 uppercase tracking-widest">Recorded By</th>
                          <th className="px-4 py-2 text-right text-[8px] font-black text-neutral-400 uppercase tracking-widest">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {(() => {
                          const sale = sales.find(s => s.id === selectedItem.saleId);
                          const history = [
                            { date: sale?.saleDate || '', type: 'Downpayment', amount: sale?.downpayment || 0, by: sale?.agentName || 'System', isPending: false, isSelf: false },
                            ...(sale?.installments || []).map(i => ({
                              date: i.createdAt || '',
                              type: 'Installment',
                              amount: i.amount,
                              by: i.recordedBy,
                              isPending: i.isPending && i.id !== selectedItem.paymentId,
                              isSelf: i.id === selectedItem.paymentId
                            }))
                          ].filter(h => h.amount > 0).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                          if (history.length === 0) {
                            return (
                              <tr>
                                <td colSpan={4} className="px-4 py-6 text-center text-[10px] font-bold text-neutral-300 uppercase tracking-widest italic">No prior payments recorded</td>
                              </tr>
                            );
                          }

                          return history.map((h, i) => (
                            <tr key={i} className={`transition-colors ${h.isSelf ? 'bg-blue-50/50' : 'hover:bg-white'}`}>
                              <td className="px-4 py-2 text-[10px] font-bold text-neutral-600">{new Date(h.date).toLocaleDateString()}</td>
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-2">
                                  <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 text-[8px] font-black uppercase tracking-tight">{h.type}</span>
                                  {h.isPending && <span className="px-1 py-0.5 rounded bg-amber-100 text-amber-700 text-[7px] font-black uppercase tracking-tighter border border-amber-200">Pending</span>}
                                  {h.isSelf && <span className="px-1 py-0.5 rounded bg-blue-100 text-blue-700 text-[7px] font-black uppercase tracking-tighter border border-blue-200">Current</span>}
                                </div>
                              </td>
                              <td className="px-4 py-2 text-[10px] font-medium text-neutral-400">{h.by}</td>
                              <td className="px-4 py-2 text-right text-[10px] font-black text-neutral-900">₱{h.amount.toLocaleString()}</td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Proof Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
                    <Paperclip size={14} className="text-neutral-400" />
                    <h5 className="text-[10px] font-black text-neutral-900 uppercase tracking-[0.2em]">Evidence of Payment</h5>
                  </div>
                  {selectedItem.attachments && selectedItem.attachments.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedItem.attachments.map((url: string, idx: number) => (
                        <a 
                          key={idx} 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="relative aspect-square rounded-sm border border-neutral-200 overflow-hidden group hover:border-neutral-400 transition-all shadow-sm bg-neutral-50"
                        >
                          <img src={url} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" alt="" />
                          <div className="absolute inset-0 bg-neutral-900/5 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                            <div className="p-2 bg-white rounded-sm shadow-xl border border-neutral-200">
                              <Eye size={16} className="text-neutral-900" />
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 bg-neutral-50 rounded-sm border border-dashed border-neutral-200 flex flex-col items-center justify-center text-neutral-400 gap-3">
                      <Paperclip size={24} strokeWidth={1.5} />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em]">No Digital Documents Linked</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="p-6 bg-white border-t border-slate-200 flex gap-3">
                <button 
                  onClick={() => {
                    wrapAction(() => onApprovePaymentEdit(selectedItem.saleId, selectedItem.paymentId), 'Approving Payment...');
                    setSelectedItem(null);
                  }}
                  className="flex-1 h-11 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <CheckCircle size={16} />
                  Approve Entry
                </button>
                <button 
                  onClick={() => openDeclineModal(selectedItem)}
                  className="h-11 px-8 bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <XCircle size={16} />
                  Decline
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {declineModalItem && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDeclineModal}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <XCircle size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Decline Payment</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      {declineMode === 'straight' ? 'Reject without requested fixes' : 'Specify remediation requirements'}
                    </p>
                  </div>
                </div>
                <button onClick={closeDeclineModal} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                  <XCircle size={20} />
                </button>
              </div>

              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Rejection Type</p>
                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                    {[
                      { id: 'remediation', label: 'Request Fix' },
                      { id: 'straight', label: 'Straight Reject' }
                    ].map(option => (
                      <button
                        key={option.id}
                        onClick={() => {
                          setDeclineMode(option.id as 'remediation' | 'straight');
                          if (option.id === 'straight') setRequestedFiles([]);
                        }}
                        className={`h-10 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                          declineMode === option.id
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {declineMode === 'remediation' && (
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Select Rejection Reason</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        'Incorrect Amount', 
                        'Invalid Proof/Image', 
                        'Reference Mismatch', 
                        'Date Discrepancy',
                        'Double Posting',
                        'Other'
                      ].map(reason => (
                        <button
                          key={reason}
                          onClick={() => setDeclineReason(reason)}
                          className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl border transition-all text-left ${
                            declineReason === reason 
                              ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm shadow-rose-100' 
                              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          {reason}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fix Checklist */}
                {declineMode === 'remediation' ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Required Remediation</p>
                      <span className="text-[9px] font-bold text-slate-400 italic">Select items agent must fix</span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { id: 'receipt', label: 'Re-upload Proof of Payment (Receipt)' },
                        { id: 'reference', label: 'Verify/Update Reference Number' },
                        { id: 'date', label: 'Correct Transaction Date' },
                        { id: 'amount', label: 'Correct Payment Amount' }
                      ].map(file => (
                        <label key={file.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all cursor-pointer group">
                          <input
                            type="checkbox"
                            className="w-5 h-5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                            checked={requestedFiles.includes(file.id)}
                            onChange={(e) => {
                              if (e.target.checked) setRequestedFiles([...requestedFiles, file.id]);
                              else setRequestedFiles(requestedFiles.filter(f => f !== file.id));
                            }}
                          />
                          <div className="flex-1">
                            <p className="text-xs font-black text-slate-700 uppercase tracking-tight group-hover:text-slate-900 transition-colors">{file.label}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
                    <p className="text-[10px] font-black text-rose-700 uppercase tracking-[0.18em]">Straight Rejection</p>
                    <p className="mt-2 text-xs font-bold leading-relaxed text-rose-900">
                      This payment will be declined without asking the agent to re-upload or correct files.
                    </p>
                  </div>
                )}

                {declineMode === 'remediation' && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Administrative Instruction</p>
                    <textarea
                      value={declineReason.startsWith('Other') ? declineReason : ''}
                      onChange={(e) => setDeclineReason(`Other: ${e.target.value}`)}
                      placeholder="Enter specific instructions for the agent..."
                      className="w-full h-24 p-4 text-xs font-bold text-slate-600 placeholder:text-slate-300 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all resize-none"
                    />
                  </div>
                )}
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                <button 
                  onClick={closeDeclineModal}
                  className="flex-1 h-12 bg-white border border-slate-200 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button 
                  disabled={declineMode === 'remediation' && !declineReason}
                  onClick={confirmDeclinePayment}
                  className="flex-[2] h-12 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                >
                  <XCircle size={16} />
                  {declineMode === 'straight' ? 'Confirm Straight Rejection' : 'Confirm Rejection'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <LoadingOverlay isVisible={isProcessing} title={processMessage} />
    </div>
  );
};

export default PaymentApprovalPage;
