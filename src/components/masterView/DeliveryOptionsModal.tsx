import React from 'react';
import { motion } from 'framer-motion';
import { XCircle, Clock, Package } from 'lucide-react';

interface DeliveryOptionsModalProps {
  onClose: () => void;
  onScheduleDelivery: () => void;
  onMarkDelivered: () => void;
}

export const DeliveryOptionsModal: React.FC<DeliveryOptionsModalProps> = ({ onClose, onScheduleDelivery, onMarkDelivered }) => {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-lg font-black text-neutral-900 uppercase tracking-tight">Delivery Options</h3>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <XCircle size={20} className="text-neutral-400" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          <button
            onClick={onScheduleDelivery}
            className="w-full p-4 flex items-center gap-4 bg-neutral-50 hover:bg-neutral-100 rounded-xl transition-all group border border-neutral-200"
          >
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock size={24} />
            </div>
            <div className="text-left">
              <p className="font-black text-neutral-900 uppercase text-xs tracking-widest">Schedule Delivery</p>
              <p className="text-xs text-neutral-500 font-medium mt-0.5">Set date, address and installation details</p>
            </div>
          </button>

          <button
            onClick={onMarkDelivered}
            className="w-full p-4 flex items-center gap-4 bg-neutral-50 hover:bg-neutral-100 rounded-xl transition-all group border border-neutral-200"
          >
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Package size={24} />
            </div>
            <div className="text-left">
              <p className="font-black text-neutral-900 uppercase text-xs tracking-widest">Mark as Delivered</p>
              <p className="text-xs text-neutral-500 font-medium mt-0.5">Finalize fulfillment and archive sale</p>
            </div>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
