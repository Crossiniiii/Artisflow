import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

export const ConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  onConfirm: () => void;
  confirmLabel?: string;
  variant?: 'danger' | 'warning' | 'info' | 'emerald';
}> = ({ isOpen, onClose, title, message, onConfirm, confirmLabel = 'Confirm', variant = 'info' }) => {
  if (!isOpen) return null;

  const colors = {
    danger: 'bg-neutral-900 hover:bg-neutral-900 shadow-neutral-200',
    warning: 'bg-neutral-800 hover:bg-neutral-900 shadow-neutral-200',
    info: 'bg-neutral-600 hover:bg-neutral-700 shadow-neutral-200',
    emerald: 'bg-neutral-900 hover:bg-neutral-800 shadow-neutral-200'
  };

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-md w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 sm:p-8 text-center space-y-4">
          <div className={`w-12 h-12 sm:w-16 h-16 mx-auto rounded-full flex items-center justify-center bg-neutral-100 text-neutral-600`}>
            <AlertTriangle size={28} className="sm:w-8 sm:h-8" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-neutral-900">{title}</h3>
            <p className="text-xs sm:text-sm text-neutral-500 mt-2">{message}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button onClick={onClose} className="flex-1 px-4 py-3 rounded-sm text-xs sm:text-sm text-neutral-600 font-bold bg-neutral-50 hover:bg-neutral-100 transition-colors order-2 sm:order-1">Cancel</button>
            <button onClick={() => { onConfirm(); onClose(); }} className={`flex-1 px-4 py-3 rounded-sm text-xs sm:text-sm text-white font-bold shadow-lg transition-all transform hover:-translate-y-0.5 order-1 sm:order-2 ${colors[variant || 'info']}`}>{confirmLabel}</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
