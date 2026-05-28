import React from 'react';
import { createPortal } from 'react-dom';
import { XCircle } from 'lucide-react';

export const MasterViewModal: React.FC<{ children: React.ReactNode, onClose: () => void, title: string, footer?: React.ReactNode, maxWidth?: string, variant?: 'default' | 'sharp' }> = ({ children, onClose, title, footer, maxWidth = 'max-w-lg' }) => {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`bg-white w-full ${maxWidth} max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200 rounded-2xl overflow-hidden`}>
        <div className="px-6 py-5 flex justify-between items-center bg-white border-b border-neutral-100 flex-shrink-0">
          <h3 className="text-lg font-black text-neutral-900 tracking-tight truncate pr-4">{title}</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 transition-colors p-1 hover:bg-neutral-50 rounded-full">
            <XCircle size={22} />
          </button>
        </div>
        <div className="overflow-y-auto custom-scrollbar flex-1 p-6 md:p-8 bg-white">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 bg-neutral-50/50 border-t border-neutral-100 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
