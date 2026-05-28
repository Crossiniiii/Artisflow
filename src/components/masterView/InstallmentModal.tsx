import React, { useState } from 'react';
import { Modal } from '../Modal';
import { Trash2, Plus, AlertCircle, Shield } from 'lucide-react';
import { Artwork, SaleRecord } from '../../types';
import { compressImage } from '../../utils/imageUtils';

interface InstallmentModalProps {
  artwork: Artwork;
  sale: SaleRecord | null;
  onAddInstallment?: (saleId: string, amount: number, date: string, reference?: string, attachments?: string[], remarks?: string) => Promise<boolean | void> | boolean | void;
  onClose: () => void;
  wrapAction: (
    action: () => Promise<boolean | void> | boolean | void,
    message?: string,
    optionsOrStatus?: any
  ) => Promise<boolean | undefined>;
}

export const InstallmentModal: React.FC<InstallmentModalProps> = ({
  artwork,
  sale,
  onAddInstallment,
  onClose,
  wrapAction
}) => {
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [installmentDate, setInstallmentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [installmentReference, setInstallmentReference] = useState('');
  const [installmentAttachments, setInstallmentAttachments] = useState<string[]>([]);
  const [installmentRemarks, setInstallmentRemarks] = useState('');

  if (!sale) return null;

  const actualPrice = sale.discountedPrice !== undefined && sale.discountedPrice !== null ? sale.discountedPrice : (artwork.price || 0);
  const totalPaid = (sale.downpayment || 0) + (sale.installments || []).reduce((sum, inst) => sum + inst.amount, 0);
  const outstandingBalance = actualPrice - totalPaid;

  return (
    <Modal onClose={onClose} title="Record Installment Payment">
      <div className="space-y-6">
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-sm">
          <div className="flex justify-between items-center mb-1">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Price</p>
            {sale.discountPercentage !== undefined && sale.discountPercentage > 0 ? (
              <p className="text-sm font-black text-emerald-700">
                <span className="line-through text-emerald-600/60 font-normal mr-2">₱{(artwork.price || 0).toLocaleString()}</span>
                <span>₱{actualPrice.toLocaleString()} <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100/50 px-1 py-0.5 rounded">-{sale.discountPercentage}%</span></span>
              </p>
            ) : (
              <p className="text-sm font-black text-emerald-700">₱{(artwork.price || 0).toLocaleString()}</p>
            )}
          </div>
          <div className="flex justify-between items-center mb-1">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Paid to Date</p>
            <p className="text-sm font-black text-emerald-700">₱{totalPaid.toLocaleString()}</p>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-emerald-200">
            <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Outstanding Balance</p>
            <p className="text-lg font-black text-emerald-900">₱{outstandingBalance.toLocaleString()}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Payment Amount <span className="text-red-500">*</span></label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">₱</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0.00"
                required
                className="w-full pl-8 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm font-black text-neutral-900"
                value={installmentAmount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  const parts = val.split('.');
                  if (parts.length > 2) parts.splice(2);
                  setInstallmentAmount(parts.join('.'));
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Payment Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                required
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm font-bold text-neutral-900"
                value={installmentDate}
                onChange={(e) => setInstallmentDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Reference No.</label>
              <input
                type="text"
                placeholder="OR# / Reference#"
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm font-bold text-neutral-900"
                value={installmentReference}
                onChange={(e) => setInstallmentReference(e.target.value)}
              />
            </div>
          </div>

          {/* Attachment Section */}
          <div className="space-y-3 pt-2">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center justify-between">
              <span>Payment Proof / Attachment <span className="text-red-500">*</span></span>
              <span className="text-neutral-300 normal-case font-medium">{installmentAttachments.length} Attached</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              {installmentAttachments.map((url, idx) => (
                <div key={idx} className="relative group aspect-video rounded-md overflow-hidden border border-neutral-200 shadow-sm bg-neutral-50">
                  <img src={url} className="w-full h-full object-cover" alt={`Proof ${idx + 1}`} />
                  <div className="absolute inset-0 bg-neutral-900/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[1px]">
                    <button
                      onClick={() => setInstallmentAttachments(prev => prev.filter((_, i) => i !== idx))}
                      className="p-2 bg-white text-red-600 rounded-full shadow-lg hover:scale-110 transition-transform"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}

              <label className="relative flex flex-col items-center justify-center aspect-video bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-md cursor-pointer hover:bg-white hover:border-neutral-300 hover:shadow-md transition-all group">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length === 0) return;

                    try {
                      const compressed = await Promise.all(
                        files.map(file => compressImage(file, 1200, 1200, 0.7))
                      );
                      setInstallmentAttachments(prev => [...prev, ...compressed]);
                    } catch (err) {
                      console.error('Batch upload failed:', err);
                    } finally {
                      e.target.value = '';
                    }
                  }}
                />
                <div className="flex flex-col items-center">
                  <Plus size={20} className="text-neutral-400 group-hover:text-neutral-700 transition-colors mb-1" />
                  <span className="text-[10px] font-bold text-neutral-400 group-hover:text-neutral-900 uppercase tracking-tight">Add Proof</span>
                </div>
              </label>
            </div>
          </div>

          {parseFloat(installmentAmount) > (outstandingBalance + 0.01) && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-sm flex items-start gap-2">
              <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs font-bold text-red-600">
                Payment is higher than the outstanding balance. Admin approval is mandatory.
              </p>
            </div>
          )}
          
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-sm flex items-start gap-2">
            <Shield size={16} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs font-bold text-indigo-600 uppercase">
              All installments require admin confirmation. This will be sent to the Payment Approval tab.
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Payment Remarks / Audit Note <span className="text-red-500">*</span></label>
            <textarea
              className="w-full px-5 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:bg-neutral-50 hover:bg-neutral-100 transition-all min-h-[80px]"
              placeholder="Required for audit (e.g. partial payment, cash via agent...)"
              value={installmentRemarks}
              onChange={(e) => setInstallmentRemarks(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-100">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-sm text-neutral-500 font-bold text-sm hover:bg-neutral-50 transition-all"
          >
            Cancel
          </button>
          <button
            disabled={!installmentAmount || parseFloat(installmentAmount) <= 0 || installmentAttachments.length === 0 || !installmentRemarks.trim()}
            onClick={() => {
              const amt = parseFloat(installmentAmount);
              if (onAddInstallment && installmentRemarks.trim()) {
                wrapAction(async () => {
                  await onAddInstallment(sale.id, amt, installmentDate, installmentReference, installmentAttachments, installmentRemarks);
                  onClose();
                }, 'Submitting for Admin Approval...');
              }
            }}
            className="px-8 py-2.5 bg-neutral-900 text-white rounded-sm font-bold shadow-lg shadow-neutral-200 hover:shadow-neutral-400 hover:-translate-y-0.5 transition-all disabled:opacity-50"
          >
            Submit for Approval
          </button>
        </div>
      </div>
    </Modal>
  );
};
