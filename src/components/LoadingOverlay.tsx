import React from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert, FileSpreadsheet, Database, Gavel, Image as ImageIcon, Plus, RefreshCw, X, File, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import { Artwork, ImportFailedItem } from '../types';

interface LoadingOverlayProps {
  isVisible: boolean;
  title?: string;
  message?: string;
  progress?: {
    current: number;
    total: number;
  };
  skippedItems?: string[];
  summary?: {
    created: Artwork[];
    updated: Artwork[];
    failed: ImportFailedItem[];
  };
  onClose?: () => void;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible, title = 'Processing Workflow', message, progress, skippedItems = [], summary, onClose }) => {
  const [activeTab, setActiveTab] = React.useState<'created' | 'updated' | 'failed'>('created');
  const [displayPercentage, setDisplayPercentage] = React.useState(0);
  const [displayCurrent, setDisplayCurrent] = React.useState(0);

  // High-performance catch-up animation
  React.useEffect(() => {
    if (progress && progress.total > 0) {
      const targetPercentage = Math.round((progress.current / progress.total) * 100);
      const targetCurrent = progress.current;

      let animationFrame: number;
      const animate = () => {
        let changed = false;
        
        setDisplayPercentage(prev => {
          if (prev < targetPercentage) {
            changed = true;
            const diff = targetPercentage - prev;
            const step = Math.max(1, Math.ceil(diff / 4)); 
            return Math.min(prev + step, targetPercentage);
          }
          if (prev > targetPercentage) {
            changed = true;
            return targetPercentage;
          }
          return prev;
        });

        setDisplayCurrent(prev => {
          if (prev < targetCurrent) {
            changed = true;
            const diff = targetCurrent - prev;
            const step = Math.max(1, Math.ceil(diff / 3)); 
            return Math.min(prev + step, targetCurrent);
          }
          if (prev > targetCurrent) {
            changed = true;
            return targetCurrent;
          }
          return prev;
        });

        if (changed) {
          animationFrame = requestAnimationFrame(animate);
        }
      };

      animationFrame = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animationFrame);
    } else if (!progress) {
      setDisplayPercentage(0);
      setDisplayCurrent(0);
    }
  }, [progress]);

  if (!isVisible && !summary) return null;

  // Render Summary View if summary exists
  if (summary) {
    const { created, updated, failed } = summary;

    return createPortal(
      <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-md z-[300] flex items-center justify-center p-4 transition-all duration-300">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-300 overflow-hidden border border-white/20">

          {/* Summary Header */}
          <div className="p-8 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-neutral-900 tracking-tight">Sync Complete</h3>
              <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">Database reconciliation summary</p>
            </div>
            <button
              onClick={onClose}
              className="p-3 hover:bg-neutral-100 rounded-xl transition-all group"
            >
              <X className="w-6 h-6 text-neutral-400 group-hover:text-neutral-900 transition-colors" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 bg-white">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-2">
                   <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                      <Plus size={20} strokeWidth={2.5} />
                   </div>
                   <h4 className="text-2xl font-black text-emerald-900">{created.length}</h4>
                   <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">New Assets Created</p>
                </div>
                <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 space-y-2">
                   <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                      <RefreshCw size={20} strokeWidth={2.5} />
                   </div>
                   <h4 className="text-2xl font-black text-amber-900">{updated.length}</h4>
                   <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Records Synchronized</p>
                </div>
                <div className="p-6 bg-rose-50 rounded-2xl border border-rose-100 space-y-2">
                   <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600">
                      <ShieldAlert size={20} strokeWidth={2.5} />
                   </div>
                   <h4 className="text-2xl font-black text-rose-900">{failed.length}</h4>
                   <p className="text-[10px] font-black text-rose-600 uppercase tracking-wider">Synchronization Failures</p>
                </div>
             </div>
             
             <div className="space-y-4">
                <h5 className="text-[11px] font-black text-neutral-400 uppercase tracking-[0.2em] border-b border-neutral-100 pb-2">Recent Transformations</h5>
                <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2">
                   {[...created, ...updated].slice(0, 50).map((art, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-3 hover:bg-neutral-50 rounded-xl transition-all border border-transparent hover:border-neutral-100">
                         <div className="w-12 h-12 rounded-lg bg-neutral-100 overflow-hidden flex-shrink-0">
                            {art.imageUrl && <img src={art.imageUrl} className="w-full h-full object-cover" alt="" />}
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-neutral-900 truncate">{art.title}</p>
                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{art.code} • {art.artist}</p>
                         </div>
                         <div className="px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200">
                            <span className="text-[9px] font-black text-neutral-600 uppercase tracking-tighter">Verified</span>
                         </div>
                      </div>
                   ))}
                   {failed.map((f, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                         <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
                            <X size={16} />
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-rose-900 truncate">Failed Row {f.rowNumber}</p>
                            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider truncate">{f.reason}</p>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          </div>

          <div className="p-6 border-t border-neutral-100 bg-white flex justify-end">
            <button
              onClick={onClose}
              className="bg-neutral-900 text-white px-10 py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-black transition-all hover:shadow-xl hover:-translate-y-0.5"
            >
              Acknowledge Sync Result
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-md z-[500] flex items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="w-full max-w-md bg-white/95 rounded-[2.5rem] p-12 shadow-2xl border border-white/20 flex flex-col items-center gap-10 transform animate-in zoom-in-95 duration-500">
        
        <div className="relative">
          <div className="w-24 h-24 rounded-[2.5rem] bg-[#0078d4]/10 flex items-center justify-center text-[#0078d4] animate-pulse">
            <Sparkles size={40} strokeWidth={2.5} />
          </div>
          <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-white shadow-xl border border-neutral-100 flex items-center justify-center text-[#107c10]">
            <CheckCircle2 size={20} strokeWidth={3} className="animate-in zoom-in duration-700 delay-300" />
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-[#0078d4]/10 rounded-full animate-spin duration-[10s]"></div>
        </div>
        
        <div className="text-center space-y-3">
          <h3 className="text-2xl font-black text-[#323130] tracking-tight whitespace-nowrap">{title}</h3>
          <p className="text-[11px] font-black text-[#a19f9d] uppercase tracking-[0.25em] leading-relaxed max-w-[280px] mx-auto">
            {message || (displayPercentage <= 30 ? "Initializing workspace sequence..." :
             displayPercentage <= 60 ? "Synchronizing batch assets..." :
             displayPercentage <= 90 ? "Finalizing transaction manifests..." :
             "Transaction verified. Completing...")}
          </p>
        </div>

        <div className="w-full space-y-5">
          <div className="h-3 w-full bg-[#f3f2f1] rounded-full overflow-hidden border border-[#edebe9] p-0.5">
            <div 
              className="h-full bg-gradient-to-r from-[#0078d4] to-[#2b88d8] transition-all duration-700 ease-out rounded-full shadow-[0_0_15px_rgba(0,120,212,0.4)] relative"
              style={{ width: `${displayPercentage}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
            </div>
          </div>
          
          <div className="flex justify-between items-center px-2">
             <div className="flex items-center gap-2">
                <Loader2 size={12} className="text-[#0078d4] animate-spin" />
                <span className="text-[11px] font-black text-[#0078d4] tracking-[0.15em]">{displayPercentage}% {displayPercentage === 100 ? 'COMPLETE' : 'SYNCING'}</span>
             </div>
             <div className="flex gap-1.5">
               {[30, 60, 90].map(step => (
                 <div key={step} className={`w-2 h-2 rounded-full transition-all duration-500 ${displayPercentage >= step ? 'bg-[#0078d4] shadow-[0_0_8px_rgba(0,120,212,0.3)]' : 'bg-[#edebe9]'}`} />
               ))}
             </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default LoadingOverlay;
