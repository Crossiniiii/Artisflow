import React, { useState } from 'react';
import { Modal } from '../Modal';
import { Trash2, Plus } from 'lucide-react';
import { Artwork, Branch } from '../../types';
import { compressImage } from '../../utils/imageUtils';

interface BranchTransferModalProps {
  artwork: Artwork;
  branches: string[];
  onTransfer?: (id: string, destination: Branch, attachments?: { itdrUrl?: string | string[] }, remarks?: string) => void;
  onClose: () => void;
  wrapAction: (
    action: () => Promise<boolean | void> | boolean | void,
    message?: string,
    optionsOrStatus?: any
  ) => Promise<boolean | undefined>;
}

export const BranchTransferModal: React.FC<BranchTransferModalProps> = ({
  artwork,
  branches,
  onTransfer,
  onClose,
  wrapAction
}) => {
  const [transferBranch, setTransferBranch] = useState<Branch>(
    branches.filter(b => b !== artwork.currentBranch)[0] as Branch
  );
  const [transferItdr, setTransferItdr] = useState<string[]>([]);
  const [transferRemarks, setTransferRemarks] = useState('');
  const [handlingAgentName, setHandlingAgentName] = useState('');

  return (
    <Modal onClose={onClose} title="Branch Transfer Authorization">
      <div className="space-y-6">
        <div className="flex items-center space-x-4 p-4 bg-neutral-50 border border-neutral-200 rounded-sm">
          <img src={artwork.imageUrl} className="w-16 h-16 rounded object-cover shadow-sm" alt="Thumbnail" />
          <div>
            <p className="text-xs font-bold text-neutral-500 uppercase">{artwork.code}</p>
            <p className="text-sm font-bold text-neutral-900">{artwork.title}</p>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Destination Branch</label>
          <select 
            className="w-full px-5 py-3 bg-neutral-50 border-0 rounded-sm text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:bg-white hover:bg-neutral-100 transition-all cursor-pointer" 
            value={transferBranch} 
            onChange={(e) => setTransferBranch(e.target.value as Branch)}
          >
            {branches.filter(b => b !== artwork.currentBranch).map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div className="space-y-4 pt-2">
          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center justify-between">
            <span>IT/DR Documents <span className="text-red-500 font-bold normal-case">(Mandatory)</span></span>
            <span className="text-neutral-300 normal-case font-medium">{transferItdr.length} Attached</span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            {transferItdr.map((url, idx) => (
              <div key={idx} className="relative group aspect-video rounded-md overflow-hidden border border-neutral-200 shadow-sm bg-neutral-50">
                <img src={url} className="w-full h-full object-cover" alt={`Attachment ${idx + 1}`} />
                <div className="absolute inset-0 bg-neutral-900/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[1px]">
                  <button
                    onClick={() => setTransferItdr(prev => prev.filter((_, i) => i !== idx))}
                    className="p-2 bg-white text-red-600 rounded-full shadow-lg hover:scale-110 transition-transform"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            <label className="relative flex flex-col items-center justify-center aspect-video bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-md cursor-pointer hover:bg-white hover:border-neutral-300 hover:shadow-md transition-all group">
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
                    setTransferItdr(prev => [...prev, ...compressed]);
                  } catch (err) {
                    console.error('Batch upload failed:', err);
                  } finally {
                    e.target.value = '';
                  }
                }}
              />
              <div className="flex flex-col items-center">
                <Plus size={20} className="text-neutral-400 group-hover:text-neutral-700 transition-colors mb-1" />
                <span className="text-[10px] font-bold text-neutral-400 group-hover:text-neutral-900 uppercase tracking-tight">Add Files</span>
              </div>
            </label>
          </div>
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1 flex items-center justify-between">
            <span>Handling Agent Name <span className="text-red-500 font-bold">*</span></span>
            <span className="text-red-500 text-[8px] font-black">Required</span>
          </label>
          <input
            type="text"
            value={handlingAgentName}
            onChange={(e) => setHandlingAgentName(e.target.value)}
            className="w-full px-4 py-3 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-bold text-[#323130] focus:bg-white focus:ring-1 focus:ring-[#0078d4] focus:border-[#0078d4] outline-none transition-all"
            placeholder="Enter handling agent's name..."
            required
          />
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1 flex items-center justify-between">
            <span>Administrative Remarks</span>
            <span className="text-red-500 text-[8px] font-black">Required for Audit</span>
          </label>
          <textarea
            value={transferRemarks}
            onChange={(e) => setTransferRemarks(e.target.value)}
            className="w-full px-4 py-3 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-bold text-[#323130] focus:bg-white focus:ring-1 focus:ring-[#0078d4] focus:border-[#0078d4] outline-none transition-all min-h-[80px] resize-none"
            placeholder="Required: Additional audit notes for this transfer..."
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-100">
          <button onClick={onClose} className="px-6 py-2.5 rounded-md text-neutral-600 font-bold hover:bg-neutral-100 transition-all transform hover:-translate-y-0.5">Cancel</button>
          <button
            onClick={() => wrapAction(async () => {
              const fullRemarks = transferRemarks.trim() 
                ? `${transferRemarks} | Handling Agent: ${handlingAgentName.trim()}`
                : `Handling Agent: ${handlingAgentName.trim()}`;
              await onTransfer?.(artwork.id, transferBranch, { itdrUrl: transferItdr }, fullRemarks);
              onClose();
            }, 'Transferring Artwork...')}
            disabled={transferItdr.length === 0 || !transferRemarks.trim() || !handlingAgentName.trim()}
            className={`px-8 py-2.5 rounded-md font-bold transition-all transform hover:-translate-y-0.5 shadow-lg ${
              transferItdr.length > 0 && transferRemarks.trim() && handlingAgentName.trim()
                ? 'bg-neutral-900 text-white hover:bg-black shadow-neutral-200 hover:shadow-neutral-300'
                : 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed shadow-none'
            }`}
          >
            Authorize Transfer
          </button>
        </div>
      </div>
    </Modal>
  );
};
