import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { Modal } from '../Modal';

interface ActionResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    type: 'success' | 'info' | 'warning';
    items?: { title: string; code: string }[];
}

export const ActionResultModal: React.FC<ActionResultModalProps> = ({
    isOpen,
    onClose,
    title,
    message,
    type,
    items = []
}) => {
    if (!isOpen) return null;

    return (
        <Modal
            onClose={onClose}
            title={title}
            maxWidth="max-w-md"
        >
            <div className="space-y-6">
                <div className={`p-4 rounded-xl flex items-start gap-4 ${type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' :
                    type === 'warning' ? 'bg-amber-50 text-amber-900 border border-amber-200' :
                        'bg-blue-50 text-blue-900 border border-blue-200'
                    }`}>
                    <div className={`p-2 rounded-full ${type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                        type === 'warning' ? 'bg-amber-100 text-amber-600' :
                            'bg-blue-100 text-blue-600'
                        }`}>
                        {type === 'success' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-lg mb-1">Action Completed</h4>
                        <p className="text-sm opacity-90 leading-relaxed font-medium">{message}</p>
                    </div>
                </div>

                {items.length > 0 && (
                    <div className="bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden">
                        <div className="px-4 py-2 bg-neutral-100/50 border-b border-neutral-200 flex justify-between items-center">
                            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Affected Items</span>
                            <span className="text-xs font-bold text-neutral-400">{items.length} items</span>
                        </div>
                        <div className="max-h-48 overflow-y-auto divide-y divide-neutral-100">
                            {items.map((item, idx) => (
                                <div key={idx} className="px-4 py-3 flex items-center justify-between hover:bg-white transition-colors">
                                    <span className="text-sm font-bold text-neutral-700 truncate max-w-[70%]">{item.title}</span>
                                    <span className="text-xs font-mono text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">{item.code}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-neutral-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg shadow-neutral-900/10 hover:shadow-neutral-900/20 active:scale-95"
                    >
                        Done
                    </button>
                </div>
            </div>
        </Modal>
    );
};
