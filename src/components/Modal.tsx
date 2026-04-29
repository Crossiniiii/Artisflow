import React from 'react';
import { createPortal } from 'react-dom';
import { XCircle } from 'lucide-react';

interface ModalProps {
    children: React.ReactNode;
    onClose: () => void;
    title: React.ReactNode;
    footer?: React.ReactNode;
    maxWidth?: string;
    variant?: 'default' | 'sharp';
}

export const Modal: React.FC<ModalProps> = ({ children, onClose, title, footer, maxWidth = 'max-w-2xl', variant = 'sharp' }) => {
    return createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
            <div className={`bg-white w-full ${maxWidth} shadow-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-150 ${variant === 'sharp' ? 'rounded-md shadow-lg shadow-black/5' : 'rounded-3xl'}`}>
                <div className={`px-4 py-4 sm:px-6 sm:py-5 flex justify-between items-center bg-white flex-shrink-0 ${variant === 'sharp' ? 'border-b border-neutral-200' : 'border-b border-neutral-100 rounded-t-3xl'}`}>
                    <h3 className={`text-base font-semibold text-neutral-900 ${variant === 'sharp' ? 'tracking-tight' : 'font-bold'}`}>{title}</h3>
                    <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 transition-colors">
                        <XCircle size={20} />
                    </button>
                </div>
                <div className={`overflow-y-auto custom-scrollbar flex-1 ${variant === 'sharp' ? 'p-5' : 'p-4 sm:p-8'}`}>{children}</div>
                {footer && (
                    <div className={`flex-shrink-0 p-4 sm:px-6 sm:py-4 bg-white border-t border-neutral-100 ${variant === 'sharp' ? '' : 'rounded-b-3xl'}`}>
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
