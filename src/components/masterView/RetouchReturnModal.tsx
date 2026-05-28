import React, { useState } from 'react';
import { Modal } from '../Modal';
import { OptimizedImage } from '../OptimizedImage';
import { Clock, Calendar, Home, ArrowRight, ChevronDown, Paperclip, Package } from 'lucide-react';
import { Artwork, ArtworkStatus, ReturnRecord } from '../../types';
import { compressImage } from '../../utils/imageUtils';

interface RetouchReturnModalProps {
  artwork: Artwork;
  activeRetouchRecord: ReturnRecord | null;
  branches: string[];
  onReturnToGallery?: (id: string, branch: string, returnDate: string, remarks?: string) => Promise<boolean | void> | boolean | void;
  onTransfer?: (id: string, toBranch: string, attachments?: { itdrUrl?: string[] }, remarks?: string) => Promise<boolean | void> | boolean | void;
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

export const RetouchReturnModal: React.FC<RetouchReturnModalProps> = ({
  artwork,
  activeRetouchRecord,
  branches,
  onReturnToGallery,
  onTransfer,
  onClose,
  isProcessing,
  wrapAction,
  setOptimisticArtworkState,
  setOptimisticArtwork,
  setPendingViewState
}) => {
  const [returnRemarks, setReturnRemarks] = useState('');
  const [returnStrategy, setReturnStrategy] = useState<'original' | 'manual'>('original');
  const [returnBranch, setReturnBranch] = useState(activeRetouchRecord?.artworkSnapshot?.currentBranch || branches[0] || '');
  const [returnItdrUrl, setReturnItdrUrl] = useState<string[]>([]);
  const [handlingAgentName, setHandlingAgentName] = useState('');

  return (
    <Modal
      title="Retouch Record Details"
      onClose={onClose}
      maxWidth="max-w-xl"
      footer={
        <div className="flex gap-3 justify-end items-center w-full">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-neutral-200 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 rounded-xl font-bold text-sm transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              if (activeRetouchRecord && onReturnToGallery && onTransfer && returnRemarks.trim() && handlingAgentName.trim()) {
                setOptimisticArtworkState({ status: ArtworkStatus.AVAILABLE, currentBranch: returnBranch });
                const success = await wrapAction(async () => {
                  const now = new Date().toISOString();
                  const originalBranch = activeRetouchRecord.artworkSnapshot?.currentBranch;
                  const fullRemarks = returnRemarks.trim()
                    ? `${returnRemarks} | Handling Agent: ${handlingAgentName.trim()}`
                    : `Handling Agent: ${handlingAgentName.trim()}`;

                  if (returnStrategy === 'manual') {
                    if (returnItdrUrl.length === 0) {
                      alert('IT/DR Attachment is required for transfers.');
                      setOptimisticArtwork(null);
                      return;
                    }
                    const returnResult = await onReturnToGallery(activeRetouchRecord.id, originalBranch || returnBranch, now, fullRemarks);
                    if (returnResult === false) return;
                    await onTransfer(activeRetouchRecord.artworkId, returnBranch, { itdrUrl: returnItdrUrl }, fullRemarks);
                  } else {
                    const returnResult = await onReturnToGallery(activeRetouchRecord.id, returnBranch, now, fullRemarks);
                    if (returnResult === false) return;
                  }
                }, returnStrategy === 'manual' ? 'Requesting Transfer...' : 'Returning to Gallery...', ArtworkStatus.AVAILABLE);
                
                if (!success) {
                  setOptimisticArtwork(null);
                  setPendingViewState(null);
                } else {
                  if (artwork.status !== ArtworkStatus.AVAILABLE || artwork.currentBranch !== returnBranch) {
                    setPendingViewState({ status: ArtworkStatus.AVAILABLE, currentBranch: returnBranch });
                  }
                  onClose();
                }
              }
            }}
            disabled={isProcessing || !returnRemarks.trim() || !handlingAgentName.trim() || (returnStrategy === 'manual' && returnItdrUrl.length === 0)}
            className={`px-8 py-2.5 text-white rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 flex items-center gap-2 ${
              returnRemarks.trim() && handlingAgentName.trim() && (returnStrategy !== 'manual' || returnItdrUrl.length > 0)
                ? (returnStrategy === 'manual' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-neutral-900 hover:bg-black shadow-neutral-200')
                : 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed shadow-none'
            }`}
          >
            {returnStrategy === 'manual' ? 'Request Transfer' : 'Confirm Return'}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex gap-5 items-center p-1">
          <div className="w-24 h-24 rounded-2xl overflow-hidden bg-neutral-100 shrink-0 border border-neutral-100 shadow-sm relative group">
            <OptimizedImage
              src={artwork.imageUrl || undefined}
              alt={artwork.title}
              className="w-full h-full object-cover"
              fallback={
                <div className="w-full h-full flex items-center justify-center text-neutral-300">
                  <Package size={24} />
                </div>
              }
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-black text-neutral-900 tracking-tight leading-tight truncate mb-1">
              {artwork.title}
            </h3>
            <p className="text-neutral-500 font-medium mb-3">by {artwork.artist}</p>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2.5 py-0.5 bg-neutral-100 text-neutral-500 text-[10px] font-black uppercase tracking-widest rounded-lg">
                {artwork.year}
              </span>
              <span className="px-2.5 py-0.5 bg-neutral-100 text-neutral-500 text-[10px] font-black uppercase tracking-widest rounded-lg">
                {artwork.medium}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-neutral-50/50 p-5 rounded-2xl border border-neutral-100/80">
            <div className="flex items-center gap-2 text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-4">
              <Clock size={12} className="text-neutral-300" />
              Chronology & Process
            </div>

            <div className="grid grid-cols-2 gap-4 pb-6 border-b border-neutral-100">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Sent Date</p>
                <div className="flex items-center gap-2 text-neutral-900 font-bold text-sm bg-white/50 px-3 py-2 rounded-xl border border-neutral-100">
                  <Calendar size={14} className="text-neutral-400" />
                  {activeRetouchRecord ? new Date(activeRetouchRecord.returnDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Return Date</p>
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm bg-indigo-50/50 px-3 py-2 rounded-xl border border-indigo-100">
                  <Clock size={14} className="text-indigo-400" />
                  {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} (Today)
                </div>
              </div>
            </div>

            <div className="pt-5 space-y-2">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Request Details</p>
              <div className="bg-white/60 p-4 rounded-xl border border-neutral-100 italic text-neutral-600 text-sm leading-relaxed">
                "{activeRetouchRecord?.remarks || 'No details available'}"
              </div>
            </div>
          </div>

          <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-100">
            <div className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-4">Destination Strategy</div>

            <div className="grid grid-cols-1 gap-3 mb-4">
              {activeRetouchRecord?.artworkSnapshot?.currentBranch && (
                <button
                  onClick={() => {
                    setReturnStrategy('original');
                    setReturnBranch(activeRetouchRecord.artworkSnapshot.currentBranch);
                  }}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${returnStrategy === 'original'
                    ? 'bg-neutral-900 border-neutral-900 text-white shadow-md'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${returnStrategy === 'original' ? 'bg-white/10' : 'bg-neutral-50'}`}>
                      <Home size={16} />
                    </div>
                    <div className="text-left">
                      <p className={`text-[10px] font-black uppercase tracking-tight text-neutral-400`}>Return to Original</p>
                      <p className="text-sm font-bold">{activeRetouchRecord.artworkSnapshot.currentBranch}</p>
                    </div>
                  </div>
                  {returnStrategy === 'original' && <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />}
                </button>
              )}

              <button
                onClick={() => setReturnStrategy('manual')}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${returnStrategy === 'manual'
                  ? 'bg-neutral-900 border-neutral-900 text-white shadow-md'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${returnStrategy === 'manual' ? 'bg-white/10' : 'bg-neutral-50'}`}>
                    <ArrowRight size={16} />
                  </div>
                  <div className="text-left">
                    <p className={`text-[10px] font-black uppercase tracking-tight text-neutral-400`}>Transfer to Another</p>
                    <p className="text-sm font-bold">Select destination manually</p>
                  </div>
                </div>
                {returnStrategy === 'manual' && <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />}
              </button>
            </div>

            {returnStrategy === 'manual' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="relative group">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2 ml-1">Destination Branch</p>
                  <select
                    className="w-full px-4 py-3 pr-10 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500/10 bg-white transition-all appearance-none cursor-pointer hover:border-neutral-300"
                    value={returnBranch}
                    onChange={(e) => setReturnBranch(e.target.value)}
                  >
                    {branches.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 bottom-[14px] pointer-events-none text-neutral-400">
                    <ChevronDown size={14} />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">IT/DR Attachment (Required for T/R)</p>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const url = await compressImage(file);
                            setReturnItdrUrl(prev => [...prev, url]);
                          } catch (err) {
                            console.error('Failed to compress image:', err);
                          }
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className={`p-4 rounded-xl border border-dashed transition-all flex items-center gap-3 ${returnItdrUrl.length > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-neutral-200 text-neutral-400 hover:border-neutral-300'
                      }`}>
                      <Paperclip size={18} />
                      <span className="text-sm font-medium">{returnItdrUrl.length > 0 ? 'IT/DR Attached' : 'Select IT/DR Image'}</span>
                      {returnItdrUrl.length > 0 && <div className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-100">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1 flex items-center justify-between mb-2">
              <span>Handling Agent Name <span className="text-red-500 font-bold">*</span></span>
              <span className="text-red-500 text-[8px] font-black">Required</span>
            </label>
            <input
              type="text"
              required
              value={handlingAgentName}
              onChange={(e) => setHandlingAgentName(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl text-sm font-bold text-[#323130] focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 outline-none transition-all shadow-inner"
              placeholder="Enter handling agent's name..."
            />
          </div>

          <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-100">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1 flex items-center justify-between mb-2">
              <span>Administrative Remarks</span>
              <span className="text-red-500 text-[8px] font-black">Required for Audit</span>
            </label>
            <textarea
              value={returnRemarks}
              onChange={(e) => setReturnRemarks(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl text-sm font-bold text-[#323130] focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 outline-none transition-all min-h-[80px] resize-none shadow-inner"
              placeholder="Required: Additional audit notes for this return..."
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};
