import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, CreditCard, Truck, LayoutGrid, Rows3 } from 'lucide-react';
import SalesApprovalPage from './SalesApprovalPage';
import PaymentApprovalPage from './PaymentApprovalPage';

import { SaleRecord, Artwork, UserPermissions, SaleStatus, DeliveryRequestStatus } from '../types';

interface ApprovalsPageProps {
  sales: SaleRecord[];
  artworks: Artwork[];
  onApproveSale: (saleId: string, remarks?: string) => void;
  onDeclineSale: (saleId: string, reason?: string, requestedFiles?: string[]) => void;
  onBulkDeleteSales?: (ids: string[]) => void;
  onApprovePaymentEdit: (saleId: string, paymentId: string, remarks?: string) => void;
  onDeclinePaymentEdit: (saleId: string, paymentId: string, reason?: string, requestedFiles?: string[]) => void;
  onBulkDeletePayments?: (items: { saleId: string, paymentId: string }[]) => void;
  onUpdateSale?: (saleId: string, updates: Partial<SaleRecord>) => Promise<boolean>;
  userPermissions?: UserPermissions;
  currentUser?: any;
}

const ApprovalsPage: React.FC<ApprovalsPageProps> = (props) => {
  const [activeTab, setActiveTab] = useState<'sales' | 'payments'>('sales');

  const canAccessSales = (props.userPermissions?.accessibleTabs && Array.isArray(props.userPermissions.accessibleTabs))
    ? (props.userPermissions.accessibleTabs.includes('sales-approval') || props.userPermissions.accessibleTabs.includes('approvals'))
    : true;
  const canAccessPayments = (props.userPermissions?.accessibleTabs && Array.isArray(props.userPermissions.accessibleTabs))
    ? (props.userPermissions.accessibleTabs.includes('payment-approval') || props.userPermissions.accessibleTabs.includes('approvals'))
    : true;

  // Auto-switch if only one is accessible
  React.useEffect(() => {
    if (!canAccessSales && canAccessPayments) {
      setActiveTab('payments');
    }
  }, [canAccessSales, canAccessPayments]);

  const pendingSalesCount = props.sales.filter(s => s.status === SaleStatus.FOR_SALE_APPROVAL).length;
  const pendingPaymentsCount = props.sales.filter(s => 
    s.status === SaleStatus.FOR_PAYMENT_APPROVAL || 
    (s.installments || []).some((i: any) => i.isPending || i.pendingEdit)
  ).length;

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      {/* Tab Switcher Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-start gap-12 pb-8 border-b border-slate-200">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Finance Approval</h1>
          <p className="text-sm font-medium text-slate-500">Manage administrative validations and financial verifications</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/80 rounded-xl border border-slate-200/60 backdrop-blur-md w-fit">
          {canAccessSales && (
            <button
              onClick={() => setActiveTab('sales')}
              className={`flex items-center gap-2.5 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                activeTab === 'sales'
                  ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ShieldCheck size={14} />
              Sales
              {pendingSalesCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest animate-pulse bg-rose-600 text-white shadow-sm shadow-rose-200">
                  {pendingSalesCount}
                </span>
              )}
            </button>
          )}
          {canAccessPayments && (
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex items-center gap-2.5 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                activeTab === 'payments'
                  ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <CreditCard size={14} />
              Payments
              {pendingPaymentsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest animate-pulse bg-rose-600 text-white shadow-sm shadow-rose-200">
                  {pendingPaymentsCount}
                </span>
              )}
            </button>
          )}

        </div>
      </div>


      <div className="min-h-[600px]">
        <AnimatePresence mode="wait">
          {activeTab === 'sales' && canAccessSales ? (
            <motion.div
              key="sales"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <SalesApprovalPage
                sales={props.sales}
                artworks={props.artworks}
                onApproveSale={props.onApproveSale}
                onDeclineSale={props.onDeclineSale}
                onBulkDeleteSales={props.onBulkDeleteSales}
                userPermissions={props.userPermissions}
                hideHeader={true}
              />
            </motion.div>
          ) : activeTab === 'payments' && canAccessPayments ? (
            <motion.div
              key="payments"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <PaymentApprovalPage
                sales={props.sales}
                artworks={props.artworks}
                onApprovePaymentEdit={props.onApprovePaymentEdit}
                onDeclinePaymentEdit={props.onDeclinePaymentEdit}
                onBulkDeletePayments={props.onBulkDeletePayments}
                userPermissions={props.userPermissions}
                hideHeader={true}
              />
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
               <ShieldCheck size={48} strokeWidth={1} className="mb-4 opacity-20" />
               <p className="text-sm font-bold uppercase tracking-widest">Access Restricted</p>
               <p className="text-xs mt-1 italic">You do not have permission to view these records.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ApprovalsPage;
