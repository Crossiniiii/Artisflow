import React, { useState } from 'react';
import { Modal } from '../Modal';
import { Trash2, AlertTriangle, Wrench, Plus } from 'lucide-react';
import { Artwork, ArtworkStatus } from '../../types';
import { compressImage } from '../../utils/imageUtils';

interface SendToFramerModalProps {
  artwork: Artwork;
  onSendToFramer?: (id: string, damageDetails: string, attachmentUrl?: string | string[]) => Promise<boolean | void> | boolean | void;
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

export const SendToFramerModal: React.FC<SendToFramerModalProps> = ({
  artwork,
  onSendToFramer,
  onClose,
  isProcessing,
  wrapAction,
  setOptimisticArtworkState,
  setOptimisticArtwork,
  setPendingViewState
}) => {
  const [damageDetails, setDamageDetails] = useState('');
  const [framerAttachment, setFramerAttachment] = useState<string[]>([]);
  const [handlingAgentName, setHandlingAgentName] = useState('');

  return (
    <Modal onClose={onClose} title="Send to Framer" maxWidth="max-w-4xl" variant="sharp">
      <div className="space-y-6 text-sm text-neutral-800">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Side: Form Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Information Card */}
            <div className="flex p-4 border border-amber-100 bg-amber-50/50 rounded-sm">
              <div className="text-amber-500 mr-3">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-neutral-900 text-sm">Framing Protocol Authorization</h4>
                <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                  The artwork status will be updated to "For Framing". This record will be moved to the Framer Management queue. Entry of specific framing requirements or damage reports is required for tracking.
                </p>
              </div>
            </div>

            {/* Form Inputs */}
            <div className="border border-neutral-200 rounded-sm overflow-hidden space-y-4 p-4">
              <div>
                <label className="block text-xs text-neutral-500 font-medium mb-2">
                  Handling Agent Name *
                </label>
                <input
                  type="text"
                  required
                  className="w-full text-sm placeholder:text-neutral-300 border border-neutral-200 rounded-sm p-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  placeholder="Enter handling agent's name..."
                  value={handlingAgentName}
                  onChange={(e) => setHandlingAgentName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-500 font-medium mb-2">
                  Framing Details & Requirements *
                </label>
                <textarea
                  className="w-full text-sm placeholder:text-neutral-300 border border-neutral-200 rounded-sm p-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none min-h-[150px]"
                  placeholder="Specify frame type, glass requirements, or existing damage details..."
                  value={damageDetails}
                  onChange={(e) => setDamageDetails(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Right Side: Execution & Attachments */}
          <div className="lg:col-span-1 border border-neutral-200 rounded-sm p-5 flex flex-col items-center bg-neutral-50/30">
            <div className="flex items-center justify-center w-12 h-12 bg-white border border-amber-200 rounded-md shadow-sm mb-4">
              <Wrench className="text-amber-500" size={24} />
            </div>

            <p className="text-[10px] font-bold text-neutral-400 tracking-widest uppercase mb-1">
              LOGISTICS GATE
            </p>
            <h3 className="font-semibold text-neutral-900 mb-6 text-center">
              Framer Dispatch
            </h3>

            {/* File Attachments Grid */}
            <div className="w-full mb-6">
              <p className="text-xs font-medium text-neutral-500 mb-2 flex items-center justify-between">
                <span>Reference / Photo Attachments</span>
                <span className="text-neutral-300 font-normal">{framerAttachment.length} attached</span>
              </p>

              <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                {framerAttachment.map((url, idx) => (
                  <div key={idx} className="relative group aspect-video rounded-sm overflow-hidden border border-neutral-200 shadow-sm bg-white">
                    <img src={url} className="w-full h-full object-cover" alt="Reference" />
                    <div className="absolute inset-0 bg-neutral-900/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[1px]">
                      <button
                        onClick={() => setFramerAttachment(prev => prev.filter((_, i) => i !== idx))}
                        className="p-1.5 bg-white text-red-600 rounded-full shadow-lg hover:scale-110 transition-transform"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                <label className="relative flex flex-col items-center justify-center aspect-video bg-white border border-dashed border-neutral-200 rounded-sm cursor-pointer hover:border-amber-500 hover:bg-amber-50/30 transition-all group">
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
                        setFramerAttachment(prev => [...prev, ...compressed]);
                      } catch (err) {
                        console.error('Batch upload failed:', err);
                      } finally {
                        e.target.value = '';
                      }
                    }}
                  />
                  <div className="flex flex-col items-center">
                    <Plus size={20} className="text-neutral-300 group-hover:text-amber-500 transition-colors mb-1" />
                    <span className="text-[10px] font-bold text-neutral-400 group-hover:text-amber-600 uppercase tracking-tight">Add Photo</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="mt-auto w-full">
              <button
                onClick={async () => {
                  if (onSendToFramer && damageDetails.trim() && handlingAgentName.trim()) {
                    setOptimisticArtworkState({ status: ArtworkStatus.FOR_FRAMING });
                    const success = await wrapAction(async () => {
                      const fullDetails = damageDetails.trim()
                        ? `${damageDetails} | Handling Agent: ${handlingAgentName.trim()}`
                        : `Handling Agent: ${handlingAgentName.trim()}`;
                      const result = await onSendToFramer(artwork.id, fullDetails, framerAttachment);
                      if (result === false) throw new Error('Send to Framer failed');
                    }, 'Requesting Delivery...', ArtworkStatus.FOR_FRAMING);
                    if (!success) {
                      setOptimisticArtwork(null);
                      setPendingViewState(null);
                    } else {
                      setPendingViewState({ status: ArtworkStatus.FOR_FRAMING });
                      onClose();
                    }
                  }
                }}
                disabled={isProcessing || !damageDetails.trim() || !handlingAgentName.trim()}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-neutral-100 disabled:text-neutral-400 disabled:border-neutral-200 border border-transparent text-white text-sm font-semibold rounded-sm transition-all shadow-sm flex items-center justify-center gap-2"
              >
                REQUEST DELIVERY
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
