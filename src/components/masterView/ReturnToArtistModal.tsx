import React, { useState } from 'react';
import { Modal } from '../Modal';
import { Trash2, AlertTriangle, Wrench, Plus } from 'lucide-react';
import { Artwork, ReturnType, ArtworkStatus } from '../../types';
import { compressImage } from '../../utils/imageUtils';

interface ReturnToArtistModalProps {
  artwork: Artwork;
  onReturn?: (id: string, reason: string, refNumber?: string, proofImage?: string | string[], remarks?: string, type?: ReturnType) => Promise<boolean | void> | boolean | void;
  onClose: () => void;
  isProcessing: boolean;
  wrapAction: (
    action: () => Promise<boolean | void> | boolean | void,
    message?: string,
    optionsOrStatus?: any
  ) => Promise<boolean | undefined>;
  setOptimisticArtworkState: (updates: Partial<Artwork>) => void;
  setOptimisticArtwork: (artwork: Artwork | null) => void;
  setPendingViewState: (state: { status?: ArtworkStatus; currentBranch?: string } | null) => void;
}

export const ReturnToArtistModal: React.FC<ReturnToArtistModalProps> = ({
  artwork,
  onReturn,
  onClose,
  isProcessing,
  wrapAction,
  setOptimisticArtworkState,
  setOptimisticArtwork,
  setPendingViewState
}) => {
  const [returnReason, setReturnReason] = useState('');
  const [returnRefNumber, setReturnRefNumber] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnProofImages, setReturnProofImages] = useState<string[]>([]);
  const [returnType, setReturnType] = useState<ReturnType>('Artist Reclaim');
  const [handlingAgentName, setHandlingAgentName] = useState('');

  return (
    <Modal onClose={onClose} title="Return to Artist" maxWidth="max-w-4xl" variant="sharp">
      <div className="space-y-6 text-sm text-neutral-800">
        {/* Type Selection Tabs */}
        <div className="flex border-b border-neutral-200 mb-6">
          <button
            onClick={() => setReturnType('Artist Reclaim')}
            className={`px-6 py-3 font-semibold text-[13px] border-b-2 transition-colors ${returnType === 'Artist Reclaim' ? 'border-red-600 text-red-600' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
          >
            Return (Void)
          </button>
          <button
            onClick={() => setReturnType('For Retouch')}
            className={`px-6 py-3 font-semibold text-[13px] border-b-2 transition-colors ${returnType === 'For Retouch' ? 'border-[#3B82F6] text-[#3B82F6]' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
          >
            For Retouch
          </button>
        </div>

        {/* Content Container grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Side: Form Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Warning Card */}
            <div className={`flex p-4 border rounded-sm transition-colors ${returnType === 'Artist Reclaim' ? 'border-red-100 bg-red-50/50' : 'border-blue-100 bg-blue-50/50'}`}>
              <div className={`${returnType === 'Artist Reclaim' ? 'text-red-500' : 'text-blue-500'} mr-3`}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-neutral-900 text-sm">
                  {returnType === 'Artist Reclaim' ? 'Permanent Artwork Reclaim (VOID)' : 'Temporary Status Change'}
                </h4>
                <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                  {returnType === 'Artist Reclaim'
                    ? 'This action is a VOID. The artwork will be permanently removed from inventory and returned to the artist. Audit trail and data will be preserved. IT/DR attachment is REQUIRED.'
                    : 'The artwork status will change to "For Retouch". It remains in the inventory but is marked as unavailable. You can return it to the gallery branch later.'}
                </p>
              </div>
            </div>

            {/* Form Inputs */}
            <div className="border border-neutral-200 rounded-sm overflow-hidden">
              <div className="grid grid-cols-1">
                <div className="p-4 border-b border-neutral-200">
                  <label className="block text-xs text-neutral-500 font-medium mb-2">
                    Reason for Protocol {returnType === 'Artist Reclaim' && '*'}
                  </label>
                  <textarea
                    className={`w-full text-sm placeholder:text-neutral-300 border border-neutral-200 rounded-sm p-3 focus:outline-none resize-none min-h-[100px] ${returnType === 'Artist Reclaim' ? 'focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}`}
                    placeholder={returnType === 'Artist Reclaim' ? 'Describe why this item is being voided...' : 'Enter the exact reason for the retouch protocol...'}
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                  />
                </div>

                <div className="p-4 bg-neutral-50/30">
                  <label className="block text-xs text-neutral-500 font-medium mb-2">
                    Internal Tracking Details (Optional)
                  </label>
                  <input
                    type="text"
                    className={`w-full text-sm placeholder:text-neutral-300 border border-neutral-200 rounded-sm p-3 focus:outline-none ${returnType === 'Artist Reclaim' ? 'focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}`}
                    placeholder="Internal remarks or specific protocol tracking..."
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                  />
                </div>

                <div className="p-4 bg-neutral-50/30 border-t border-neutral-200">
                  <label className="block text-xs text-neutral-500 font-medium mb-2">
                    Handling Agent Name <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className={`w-full text-sm placeholder:text-neutral-300 border border-neutral-200 rounded-sm p-3 focus:outline-none ${returnType === 'Artist Reclaim' ? 'focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}`}
                    placeholder="Enter handling agent's name..."
                    value={handlingAgentName}
                    onChange={(e) => setHandlingAgentName(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Execution & Attachments */}
          <div className="lg:col-span-1 border border-neutral-200 rounded-sm p-5 flex flex-col items-center bg-neutral-50/30">
            <div className={`flex items-center justify-center w-12 h-12 bg-white border rounded-md shadow-sm mb-4 ${returnType === 'Artist Reclaim' ? 'border-red-200' : 'border-blue-200'}`}>
              {returnType === 'Artist Reclaim' ? <Trash2 className="text-red-500" size={24} /> : <Wrench className="text-blue-500" size={24} />}
            </div>

            <p className="text-[10px] font-bold text-neutral-400 tracking-widest uppercase mb-1">
              PROTOCOL GATE
            </p>
            <h3 className="font-semibold text-neutral-900 mb-6 text-center">
              {returnType === 'Artist Reclaim' ? 'Void Authorization' : 'Retouch Process'}
            </h3>

            {/* File Attachments Grid */}
            <div className="w-full mb-6">
              <p className="text-xs font-medium text-neutral-500 mb-2 flex items-center justify-between">
                <span>Proof Images {returnType === 'Artist Reclaim' ? '*' : ''}</span>
                <span className="text-neutral-300 font-normal">{returnProofImages.length} attached</span>
              </p>

              <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                {returnProofImages.map((image, index) => (
                  <div key={`${image}-${index}`} className="relative group aspect-square rounded-sm overflow-hidden border border-neutral-200 shadow-sm bg-white">
                    <img src={image} className="w-full h-full object-cover" alt={`Proof ${index + 1}`} />
                    <div className="absolute inset-0 bg-neutral-900/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[1px]">
                      <button
                        onClick={() => setReturnProofImages(prev => prev.filter((_, i) => i !== index))}
                        className="p-1.5 bg-white text-red-600 rounded-full shadow-lg hover:scale-110 transition-transform"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                <label className={`relative flex flex-col items-center justify-center aspect-square bg-white border border-dashed border-neutral-200 rounded-sm cursor-pointer transition-all group ${returnType === 'Artist Reclaim' ? 'hover:border-red-400 hover:bg-red-50/30' : 'hover:border-blue-400 hover:bg-blue-50/30'}`}>
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
                        setReturnProofImages(prev => [...prev, ...compressed]);
                      } catch (err) {
                        console.error('Batch upload failed:', err);
                      } finally {
                        e.target.value = '';
                      }
                    }}
                  />
                  <Plus size={18} className={`text-neutral-300 mb-1 ${returnType === 'Artist Reclaim' ? 'group-hover:text-red-500' : 'group-hover:text-blue-500'} transition-colors`} />
                  <span className={`text-[10px] font-bold text-neutral-400 uppercase tracking-tight ${returnType === 'Artist Reclaim' ? 'group-hover:text-red-600' : 'group-hover:text-blue-600'}`}>Add Proof</span>
                </label>
              </div>
            </div>

            <div className="mt-auto w-full">
              <button
                onClick={async () => {
                  if (onReturn && returnReason.trim() && handlingAgentName.trim()) {
                    const targetStatus = returnType === 'Artist Reclaim' ? ArtworkStatus.RETURNED : ArtworkStatus.FOR_RETOUCH;
                    setOptimisticArtworkState({
                      status: targetStatus,
                      deletedAt: returnType === 'Artist Reclaim' ? new Date().toISOString() : artwork.deletedAt
                    });
                    const success = await wrapAction(async () => {
                      const fullNotes = returnNotes.trim()
                        ? `${returnNotes} | Handling Agent: ${handlingAgentName.trim()}`
                        : `Handling Agent: ${handlingAgentName.trim()}`;
                      const result = await onReturn(artwork.id, returnReason, returnRefNumber, returnProofImages, fullNotes, returnType);
                      if (result === false) throw new Error('Return failed');
                    }, `Scheduling ${returnType === 'Artist Reclaim' ? 'Void' : 'Retouch'}...`, targetStatus);
                    
                    if (!success) {
                      setOptimisticArtwork(null);
                      setPendingViewState(null);
                    } else {
                      setPendingViewState({ status: targetStatus });
                      onClose();
                    }
                  }
                }}
                disabled={isProcessing || !returnReason.trim() || !handlingAgentName.trim() || (returnType === 'Artist Reclaim' && returnProofImages.length === 0)}
                className={`w-full py-2.5 disabled:bg-neutral-100 disabled:text-neutral-400 disabled:border-neutral-200 border border-transparent text-white text-sm font-semibold rounded-sm transition-all shadow-sm flex items-center justify-center gap-2 ${returnType === 'Artist Reclaim' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#3B82F6] hover:bg-[#2563EB]'}`}
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    PROCESSING...
                  </>
                ) : (
                  returnType === 'Artist Reclaim' ? 'AUTHORIZE VOID' : 'SCHEDULE RETOUCH'
                )}
              </button>
              <button
                onClick={onClose}
                className="w-full mt-3 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-800 transition-colors"
              >
                Cancel Setup
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
