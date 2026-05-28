import React, { useState } from 'react';
import { Modal } from '../Modal';
import { SaleRecord, UserRole } from '../../types';

interface EditingPayment {
  id: string;
  amount: string;
  date: string;
  reference: string;
  type: 'downpayment' | 'installment';
}

interface EditPaymentModalProps {
  editingPayment: EditingPayment;
  sale: SaleRecord | null;
  userRole: string;
  onEditPayment?: (saleId: string, paymentId: string, updates: { amount: number; date?: string; reference?: string }) => void;
  onClose: () => void;
}

export const EditPaymentModal: React.FC<EditPaymentModalProps> = ({
  editingPayment: initialEditingPayment,
  sale,
  userRole,
  onEditPayment,
  onClose
}) => {
  const [editingPayment, setEditingPayment] = useState<EditingPayment>(initialEditingPayment);

  if (!sale) return null;

  return (
    <Modal onClose={onClose} title={`Edit ${editingPayment.type === 'downpayment' ? 'Downpayment' : 'Installment'}`}>
      <div className="space-y-6">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Amount <span className="text-red-500">*</span></label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">₱</span>
            <input
              type="text"
              inputMode="numeric"
              className="w-full pl-8 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm font-black text-neutral-900"
              value={editingPayment.amount}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, '');
                const parts = val.split('.');
                if (parts.length > 2) parts.splice(2);
                setEditingPayment({ ...editingPayment, amount: parts.join('.') });
              }}
            />
          </div>
        </div>

        {editingPayment.type === 'installment' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Date Received <span className="text-red-500">*</span></label>
              <input
                type="date"
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm font-bold text-neutral-900"
                value={editingPayment.date}
                onChange={(e) => setEditingPayment({ ...editingPayment, date: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Reference No.</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm font-bold text-neutral-900"
                value={editingPayment.reference}
                onChange={(e) => setEditingPayment({ ...editingPayment, reference: e.target.value })}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-100">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-sm text-neutral-500 font-bold text-sm hover:bg-neutral-50 transition-all"
          >
            Cancel
          </button>
          <button
            disabled={!editingPayment.amount || parseFloat(editingPayment.amount) <= 0}
            onClick={() => {
              const amt = parseFloat(editingPayment.amount);
              if (onEditPayment && sale) {
                onEditPayment(sale.id, editingPayment.id, {
                  amount: amt,
                  date: editingPayment.date,
                  reference: editingPayment.reference
                });
                onClose();
              }
            }}
            className="px-8 py-2.5 bg-neutral-900 text-white rounded-sm font-black text-sm shadow-lg shadow-neutral-200 active:scale-95 transition-all"
          >
            {(() => {
              const createdAt = editingPayment.type === 'downpayment' ? sale?.downpaymentRecordedAt : (sale?.installments?.find(i => i.id === editingPayment.id)?.createdAt);
              const isNew = createdAt && (new Date().getTime() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000);
              const isAdmin = userRole === UserRole.ADMIN;
              return (isNew || isAdmin) ? 'Update Payment' : 'Request Approval';
            })()}
          </button>
        </div>
      </div>
    </Modal>
  );
};
