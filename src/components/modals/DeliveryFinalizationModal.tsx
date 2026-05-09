import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { SaleRecord } from '../../types';
import { OptimizedImage } from '../OptimizedImage';

interface DeliveryFinalizationModalProps {
  sale: SaleRecord;
  artwork: { id: string; title: string; code: string; imageUrl?: string };
  onClose: () => void;
  onConfirm: (itdr?: string, rsa?: string, orcr?: string, carrier?: string, referenceNumber?: string) => void;
}

const DeliveryFinalizationModal: React.FC<DeliveryFinalizationModalProps> = ({
  sale,
  artwork,
  onClose,
  onConfirm,
}) => {
  const [carrier, setCarrier] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#323130]/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-md shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-[#edebe9]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#edebe9] flex items-center justify-between bg-[#faf9f8]">
          <div>
            <h2 className="text-sm font-black text-[#323130] uppercase tracking-tight">Final Fulfillment</h2>
            <p className="text-[#605e5c] text-[10px] font-bold uppercase tracking-widest mt-1">Confirm final hand-over to client</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#edebe9] rounded-md transition-colors text-[#605e5c]">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6">
          {/* Artwork preview */}
          <div className="flex gap-4 p-4 bg-[#faf9f8] rounded-sm border border-[#edebe9]">
            <div className="w-12 h-12 rounded-sm overflow-hidden bg-white border border-[#edebe9] shrink-0">
              <OptimizedImage src={artwork.imageUrl} className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-[10px] font-black text-[#a19f9d] uppercase tracking-widest">{artwork.code}</p>
              <h3 className="font-black text-[#323130] text-xs uppercase truncate">{artwork.title}</h3>
            </div>
          </div>

          <p className="text-[11px] font-bold text-[#605e5c] leading-relaxed">
            By confirming this action, you are certifying that the artwork has been successfully delivered and accepted by{' '}
            <span className="text-[#323130] font-black">{sale.clientName}</span>. This will finalize the sale record and mark the artwork as archived.
          </p>

          {/* Carrier & Reference */}
          <div className="space-y-4 pt-2 border-t border-[#edebe9]">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[#605e5c] uppercase tracking-widest ml-1">
                Carrier / Logistics Provider (Optional)
              </label>
              <input
                type="text"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="w-full px-4 py-3 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-bold text-[#323130] focus:bg-white focus:ring-1 focus:ring-[#0078d4] focus:border-[#0078d4] outline-none transition-all"
                placeholder="e.g. Lalamove, In-house Delivery"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[#605e5c] uppercase tracking-widest ml-1">
                Reference Number / IT/DR # (Optional)
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full px-4 py-3 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-bold text-[#323130] focus:bg-white focus:ring-1 focus:ring-[#0078d4] focus:border-[#0078d4] outline-none transition-all"
                placeholder="Reference No."
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-[#faf9f8] border-t border-[#edebe9] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-white border border-[#edebe9] text-[#323130] rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-[#edebe9] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(undefined, undefined, undefined, carrier || undefined, referenceNumber || undefined)}
            className="flex-1 px-4 py-3 bg-[#107c10] text-white rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-[#0b5a0b] transition-all shadow-lg shadow-[#107c10]/20"
          >
            Confirm Delivery
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default DeliveryFinalizationModal;
