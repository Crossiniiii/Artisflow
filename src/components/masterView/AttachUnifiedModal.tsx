import React, { useState } from 'react';
import { Modal } from '../Modal';
import { Trash2, Plus } from 'lucide-react';
import { Artwork } from '../../types';
import { compressImage } from '../../utils/imageUtils';

interface AttachUnifiedModalProps {
  artwork: Artwork;
  onEdit: (updates: Partial<Artwork>) => void;
  onClose: () => void;
  wrapAction: (
    action: () => Promise<boolean | void> | boolean | void,
    message?: string,
    optionsOrStatus?: any
  ) => Promise<boolean | undefined>;
}

const parseAttachmentString = (urlStr: string | string[] | null | undefined): string[] => {
  if (!urlStr) return [];
  if (Array.isArray(urlStr)) return urlStr;
  try {
    const parsed = JSON.parse(urlStr);
    if (Array.isArray(parsed)) return parsed;
    return [urlStr];
  } catch {
    return [urlStr];
  }
};

export const AttachUnifiedModal: React.FC<AttachUnifiedModalProps> = ({
  artwork,
  onEdit,
  onClose,
  wrapAction
}) => {
  const [activeAttachmentTab, setActiveAttachmentTab] = useState<'itdr' | 'rsa' | 'orcr'>('itdr');
  const [tempItdr, setTempItdr] = useState<string[]>(() => parseAttachmentString(artwork.itdrImageUrl));
  const [tempRsa, setTempRsa] = useState<string[]>(() => parseAttachmentString(artwork.rsaImageUrl));
  const [tempOrcr, setTempOrcr] = useState<string[]>(() => parseAttachmentString(artwork.orCrImageUrl));

  return (
    <Modal onClose={onClose} title="Manage Attachments">
      <div className="space-y-6">
        <div className="flex p-1 bg-neutral-100 rounded-sm">
          <button
            onClick={() => setActiveAttachmentTab('itdr')}
            className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-sm transition-all ${activeAttachmentTab === 'itdr' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
          >
            IT/DR ({tempItdr.length})
          </button>
          <button
            onClick={() => setActiveAttachmentTab('rsa')}
            className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-sm transition-all ${activeAttachmentTab === 'rsa' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
          >
            RSA ({tempRsa.length})
          </button>
          <button
            onClick={() => setActiveAttachmentTab('orcr')}
            className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-sm transition-all ${activeAttachmentTab === 'orcr' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
          >
            OR/CR ({tempOrcr.length})
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center justify-between">
              <span>{activeAttachmentTab === 'itdr' ? 'IT/DR Documents' : activeAttachmentTab === 'rsa' ? 'RSA / AR Images' : 'OR / CR Images'}</span>
              <span className="text-neutral-300 normal-case font-medium">Add multiple files</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[320px] overflow-y-auto pr-1">
              {(activeAttachmentTab === 'itdr' ? tempItdr : activeAttachmentTab === 'rsa' ? tempRsa : tempOrcr).map((url, idx) => (
                <div key={idx} className="relative group aspect-square rounded-md overflow-hidden border border-neutral-200 shadow-sm bg-neutral-50">
                  <img src={url} className="w-full h-full object-cover" alt="Attachment" />
                  <div className="absolute inset-0 bg-neutral-900/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[1px]">
                    <button
                      onClick={() => {
                        if (activeAttachmentTab === 'itdr') setTempItdr(prev => prev.filter((_, i) => i !== idx));
                        else if (activeAttachmentTab === 'rsa') setTempRsa(prev => prev.filter((_, i) => i !== idx));
                        else setTempOrcr(prev => prev.filter((_, i) => i !== idx));
                      }}
                      className="p-1.5 bg-white text-red-600 rounded-full shadow-lg hover:scale-110 transition-transform"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              <label className="relative flex flex-col items-center justify-center aspect-square bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-md cursor-pointer hover:bg-white hover:border-neutral-300 hover:shadow-md transition-all group">
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
                      if (activeAttachmentTab === 'itdr') setTempItdr(prev => [...prev, ...compressed]);
                      else if (activeAttachmentTab === 'rsa') setTempRsa(prev => [...prev, ...compressed]);
                      else setTempOrcr(prev => [...prev, ...compressed]);
                    } catch (err) {
                      console.error('Batch upload failed:', err);
                    } finally {
                      e.target.value = '';
                    }
                  }}
                />
                <div className="flex flex-col items-center">
                  <Plus size={20} className="text-neutral-400 group-hover:text-neutral-700 transition-colors mb-1" />
                  <span className="text-[10px] font-bold text-neutral-400 group-hover:text-neutral-900 uppercase tracking-tight">Add</span>
                </div>
              </label>
            </div>

            {(activeAttachmentTab === 'itdr' ? tempItdr : activeAttachmentTab === 'rsa' ? tempRsa : tempOrcr).length === 0 && (
              <div className="text-[11px] text-neutral-400 text-center py-4 italic">No attachments found for this category.</div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-100">
            <button onClick={onClose} className="px-6 py-2.5 rounded-md text-neutral-600 font-bold hover:bg-neutral-100 transition-all">Cancel</button>
            <button
              onClick={() => {
                const update = {
                  itdrImageUrl: JSON.stringify(tempItdr),
                  rsaImageUrl: JSON.stringify(tempRsa),
                  orCrImageUrl: JSON.stringify(tempOrcr)
                };

                wrapAction(async () => {
                  await onEdit(update);
                  onClose();
                }, 'Saving Attachments...');
              }}
              className="px-8 py-2.5 bg-neutral-900 text-white rounded-md font-bold hover:bg-black shadow-lg shadow-neutral-200 transform hover:-translate-y-0.5 transition-all"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
