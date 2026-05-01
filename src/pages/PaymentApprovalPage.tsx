import React, { useState } from 'react';
import { SaleRecord, Artwork, UserPermissions } from '../types';
import { CheckCircle, XCircle, Tag, User, Calendar, Info, AlertCircle, Eye, ExternalLink } from 'lucide-react';
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
            isNewPayment: true
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
            isNewPayment: false
          });
        }
      });
    });
    return list.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  })();

  if (pendingPayments.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-neutral-100 shadow-sm">
        <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mb-6">
          <CheckCircle size={40} className="text-neutral-200" />
        </div>
        <h2 className="text-xl font-black text-neutral-900 tracking-tight">All Payments Cleared</h2>
        <p className="text-sm text-neutral-400 mt-2 max-w-xs">There are no pending payment approvals or overpayment flags at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Payment Approval</h1>
          <p className="text-sm text-neutral-500 mt-1">Review pending payments and overpayment authorizations.</p>
        </div>
        <div className="bg-neutral-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-neutral-200">
          {pendingPayments.length} Pending
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {pendingPayments.map((item) => (
            <motion.div
              key={`${item.saleId}-${item.paymentId}`}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden hover:shadow-md transition-all group"
            >
              <div className="p-6 flex flex-col md:flex-row gap-6">
                {/* Artwork & Client Info */}
                <div className="flex-1 min-w-0 space-y-4">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 bg-neutral-100 rounded-xl overflow-hidden shrink-0 border border-neutral-100">
                      {item.artwork?.imageUrl && (
                        <img src={item.artwork.imageUrl} className="w-full h-full object-cover" alt="" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${item.type === 'downpayment' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                          {item.type}
                        </span>
                        {item.isOverpayment && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                            <AlertCircle size={10} />
                            Overpayment
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-black text-neutral-900 truncate">{item.artwork?.title || 'Unknown Artwork'}</h3>
                      <p className="text-xs font-bold text-neutral-400 uppercase tracking-tight">{item.clientName}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center gap-2 text-neutral-500">
                      <User size={14} />
                      <span className="font-bold">{item.requestedBy}</span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-500">
                      <Calendar size={14} />
                      <span className="font-medium">{new Date(item.requestedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Amount Comparison */}
                <div className="flex items-center justify-center md:justify-end gap-6 px-6 py-4 md:py-0 bg-neutral-50 md:bg-transparent rounded-xl">
                  {item.currentAmount > 0 && (
                    <div className="text-right">
                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Current</p>
                      <p className="text-sm font-bold text-neutral-500 line-through">₱{item.currentAmount.toLocaleString()}</p>
                    </div>
                  )}
                  <div className="text-right">
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Requested</p>
                    <p className={`text-xl font-black ${item.isOverpayment ? 'text-red-600' : 'text-neutral-900'}`}>
                      ₱{item.newAmount.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex md:flex-col gap-2 shrink-0">
                  <button
                    onClick={() => wrapAction(() => onApprovePaymentEdit(item.saleId, item.paymentId), 'Approving Payment...')}
                    className="flex-1 md:w-32 py-3 bg-neutral-900 hover:bg-black text-white rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-lg shadow-neutral-200 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={14} />
                    Approve
                  </button>
                  <button
                    onClick={() => wrapAction(() => onDeclinePaymentEdit(item.saleId, item.paymentId), 'Declining Payment...')}
                    className="flex-1 md:w-32 py-3 bg-white hover:bg-red-50 text-neutral-400 hover:text-red-600 border border-neutral-100 hover:border-red-100 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <XCircle size={14} />
                    Decline
                  </button>
                </div>
              </div>

              {item.isOverpayment && (
                <div className="bg-red-50 border-t border-red-100 px-6 py-3 flex items-center gap-3">
                  <AlertCircle size={16} className="text-red-500 shrink-0" />
                  <p className="text-[11px] font-bold text-red-700 leading-tight">
                    This payment exceeds the original price of ₱{item.artwork?.price.toLocaleString() || '0'}. Administrative review is mandatory.
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <LoadingOverlay isVisible={isProcessing} title={processMessage} />
    </div>
  );
};

export default PaymentApprovalPage;
