import React, { useState } from 'react';
import { SaleRecord, Artwork, UserPermissions } from '../types';
import { CheckCircle, XCircle, Tag, User, Calendar, Info, AlertCircle, Eye, ExternalLink, Paperclip, Clock, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useActionProcessing } from '../hooks/useActionProcessing';
import LoadingOverlay from '../components/LoadingOverlay';

interface PaymentApprovalPageProps {
  sales: SaleRecord[];
  artworks: Artwork[];
  onApprovePaymentEdit: (saleId: string, paymentId: string) => void;
  onDeclinePaymentEdit: (saleId: string, paymentId: string) => void;
  userPermissions?: UserPermissions;
}

const PaymentApprovalPage: React.FC<PaymentApprovalPageProps> = ({
  sales,
  artworks,
  onApprovePaymentEdit,
  onDeclinePaymentEdit
}) => {
  const [activeTab, setActiveTab] = useState<'approval' | 'history'>('approval');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  const { isProcessing, processMessage, wrapAction } = useActionProcessing({
    itemTitle: 'Payment Approval',
    itemCode: 'PAY'
  });

  // Extract pending payments
  const pendingPayments = (() => {
    const list: any[] = [];
    sales.forEach(sale => {
      const art = artworks.find(a => a.id === sale.artworkId);

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
          isNewPayment: false
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
            attachments: inst.attachmentUrls
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
            attachments: (inst.pendingEdit as any).attachmentUrls || inst.attachmentUrls
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
      const art = artworks.find(a => a.id === sale.artworkId);
      const branch = art?.currentBranch || 'Main';

      // 1. Approved Downpayments (If no pending edit)
      if (!sale.pendingDownpaymentEdit && sale.downpayment) {
        list.push({
          id: `${sale.id}-dp`,
          artwork: art,
          clientName: sale.clientName,
          type: 'Downpayment',
          amount: sale.downpayment,
          approvedAt: sale.saleDate,
          branch
        });
      }

      // 2. Installments (Approved or Declined)
      sale.installments?.forEach(inst => {
        if (!inst.isPending && !inst.pendingEdit) {
          list.push({
            id: inst.id,
            artwork: art,
            clientName: sale.clientName,
            type: 'Installment',
            amount: inst.amount,
            approvedAt: inst.isDeclined ? inst.declinedAt : (inst.createdAt || sale.saleDate),
            branch,
            isDeclined: inst.isDeclined
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

  return (
    <div className="max-w-[1400px] mx-auto p-8 space-y-10">
      <LoadingOverlay isVisible={isProcessing} title={processMessage} />
      
      {/* Header Section */}
      <div className="flex flex-col gap-6 border-b-2 border-neutral-900 pb-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Payment Approval</h1>
            <p className="text-xs font-bold text-neutral-400 mt-1 uppercase tracking-widest">Verify and audit collection entries</p>
          </div>
          <div className="flex items-center gap-6 text-right">
            <div className="pr-6 border-r border-neutral-200">
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Total Pending</p>
              <p className="text-2xl font-bold text-neutral-900">₱{pendingPayments.reduce((sum, p) => sum + p.newAmount, 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Pending Items</p>
              <p className="text-2xl font-bold text-neutral-900">{pendingPayments.length}</p>
            </div>
          </div>
        </div>

        {/* Primary Tabs */}
        <div className="flex gap-1 p-1 bg-neutral-100 rounded-sm w-fit border border-neutral-200">
          <button
            onClick={() => setActiveTab('approval')}
            className={`px-8 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-sm transition-all flex items-center gap-2 ${activeTab === 'approval' ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/50' : 'text-neutral-400 hover:text-neutral-600'}`}
          >
            <Shield size={14} />
            Pending
            {pendingPayments.length > 0 && (
              <span className="ml-1 w-4 h-4 bg-indigo-600 text-white text-[8px] flex items-center justify-center rounded-full">
                {pendingPayments.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-8 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-sm transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/50' : 'text-neutral-400 hover:text-neutral-600'}`}
          >
            <Clock size={14} />
            History
          </button>
        </div>
      </div>

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
            {pendingPayments.length === 0 ? (
              <div className="py-24 bg-neutral-50 rounded-sm border border-dashed border-neutral-200 flex flex-col items-center justify-center text-neutral-300 gap-4">
                <CheckCircle size={56} strokeWidth={1} />
                <div className="text-center">
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-neutral-400">Records Synchronized</p>
                  <p className="text-[10px] font-bold mt-1 tracking-widest">No pending financial entries require attention.</p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-sm border border-neutral-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200">
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Artwork & Client</th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Type</th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Value</th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Origin</th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    <AnimatePresence mode="popLayout">
                      {pendingPayments.map((item) => (
                        <motion.tr 
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          key={`${item.saleId}-${item.paymentId}`} 
                          className="group hover:bg-neutral-50/50 transition-all cursor-pointer"
                          onClick={() => setSelectedItem(item)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-sm bg-neutral-100 overflow-hidden shrink-0 border border-neutral-100 shadow-sm">
                                {item.artwork?.imageUrl && <img src={item.artwork.imageUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" alt="" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-black text-neutral-900 truncate tracking-tight uppercase">{item.artwork?.title || 'Unknown'}</p>
                                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">{item.clientName}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-widest border ${item.type === 'downpayment' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                              {item.type}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-black ${item.isOverpayment ? 'text-red-600' : 'text-neutral-900'} tracking-tighter`}>
                                ₱{item.newAmount.toLocaleString()}
                              </span>
                              {item.isOverpayment && (
                                <div className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center">
                                  <AlertCircle size={10} className="text-red-600" />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-neutral-500">
                              <div className="w-5 h-5 rounded-sm bg-neutral-100 flex items-center justify-center">
                                <User size={10} />
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-tight">{item.agentName || item.requestedBy}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex items-center justify-center w-8 h-8 rounded-sm border border-neutral-200 text-neutral-400 group-hover:text-neutral-900 group-hover:border-neutral-900 transition-all">
                              <Eye size={14} />
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
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
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Artwork</th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Client</th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Type</th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Amount</th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Verified Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredHistory.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-24 text-center text-[10px] font-bold text-neutral-300 uppercase tracking-widest italic">
                          No verified records found for this selection
                        </td>
                      </tr>
                    ) : (
                      filteredHistory.map((h) => (
                        <tr key={h.id} className="hover:bg-neutral-50/30 transition-all group">
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setSelectedItem(null)}
              className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.98, y: 10 }} 
              className="relative bg-white w-full max-w-2xl rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col max-h-[90vh] border border-neutral-200"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-neutral-200 flex items-center justify-between bg-white">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-sm bg-neutral-900 text-white flex items-center justify-center shadow-sm">
                    <Info size={18} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-neutral-900 uppercase tracking-[0.2em]">Verification Details</h3>
                    <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5 font-mono">Reference ID: {selectedItem.paymentId.slice(0, 8)}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-neutral-50 rounded-sm transition-colors border border-transparent hover:border-neutral-200">
                  <XCircle size={18} className="text-neutral-400" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="w-full md:w-44 aspect-square bg-neutral-50 rounded-sm border border-neutral-200 overflow-hidden shadow-sm group">
                    {selectedItem.artwork?.imageUrl && (
                      <img src={selectedItem.artwork.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-center py-1">
                    <div className="mb-4">
                      <h4 className="text-2xl font-black text-neutral-900 leading-tight tracking-tight uppercase">{selectedItem.artwork?.title}</h4>
                      <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1.5 border-l-2 border-neutral-200 pl-3">{selectedItem.artwork?.artist}</p>
                    </div>
                    <div className="grid grid-cols-2 border-t border-neutral-100 pt-4">
                      <div className="space-y-1">
                        <p className="text-[8px] font-black text-neutral-400 uppercase tracking-[0.2em]">Payment Type</p>
                        <p className="text-[11px] font-black text-neutral-800 uppercase tracking-widest italic">{selectedItem.type}</p>
                      </div>
                      <div className="space-y-1 border-l border-neutral-100 pl-4">
                        <p className="text-[8px] font-black text-neutral-400 uppercase tracking-[0.2em]">Request Date</p>
                        <p className="text-[11px] font-black text-neutral-800">{new Date(selectedItem.requestedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-white border border-neutral-200 rounded-sm flex items-center justify-between shadow-sm border-l-[6px] border-l-neutral-900 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-[0.03] pointer-events-none">
                    <Tag size={120} strokeWidth={1} />
                  </div>
                  <div className="relative z-10">
                    <p className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-1">Authorized Amount</p>
                    <p className="text-4xl font-black text-neutral-900 tracking-tighter">₱{selectedItem.newAmount.toLocaleString()}</p>
                  </div>
                  {selectedItem.currentAmount > 0 && (
                    <div className="text-right border-l border-neutral-100 pl-6 relative z-10">
                      <p className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-1">Previous Val.</p>
                      <p className="text-xl font-bold text-neutral-300 line-through tracking-tight">₱{selectedItem.currentAmount.toLocaleString()}</p>
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
                      <h5 className="text-[10px] font-black text-neutral-900 uppercase tracking-[0.2em]">Payment History</h5>
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
                          <span className="text-[9px] font-black text-indigo-600 uppercase">Balance: ₱{Math.max(0, balance).toLocaleString()}</span>
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
                            { date: sale?.saleDate || '', type: 'Downpayment', amount: sale?.downpayment || 0, by: sale?.agentName || 'System' },
                            ...(sale?.installments || []).filter(i => !i.isPending).map(i => ({
                              date: i.createdAt || '',
                              type: 'Installment',
                              amount: i.amount,
                              by: i.recordedBy
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
                            <tr key={i} className="hover:bg-white transition-colors">
                              <td className="px-4 py-2 text-[10px] font-bold text-neutral-600">{new Date(h.date).toLocaleDateString()}</td>
                              <td className="px-4 py-2">
                                <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 text-[8px] font-black uppercase tracking-tight">{h.type}</span>
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
              <div className="p-6 bg-white border-t border-neutral-200 flex gap-4">
                <button 
                  onClick={() => {
                    wrapAction(() => onApprovePaymentEdit(selectedItem.saleId, selectedItem.paymentId), 'Approving Payment...');
                    setSelectedItem(null);
                  }}
                  className="flex-1 py-4 bg-neutral-900 text-white rounded-sm text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-neutral-200 hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  <CheckCircle size={16} strokeWidth={3} />
                  Approve Entry
                </button>
                <button 
                  onClick={() => {
                    wrapAction(() => onDeclinePaymentEdit(selectedItem.saleId, selectedItem.paymentId), 'Declining Payment...');
                    setSelectedItem(null);
                  }}
                  className="px-10 py-4 bg-white border border-neutral-200 text-neutral-500 hover:text-red-600 hover:border-red-200 rounded-sm text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  <XCircle size={16} strokeWidth={3} />
                  Decline
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
