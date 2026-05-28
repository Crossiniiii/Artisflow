import React, { useState } from 'react';
import { Modal } from '../Modal';
import { Trash2, AlertTriangle, Upload, Plus } from 'lucide-react';
import { Artwork, ArtworkStatus } from '../../types';
import { compressImage } from '../../utils/imageUtils';

interface DeliveryAttachModalProps {
  artwork: Artwork;
  onDeliver?: (id: string, itdr: string[], rsa: string[], orcr: string[]) => Promise<boolean | void> | boolean | void;
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

export const DeliveryAttachModal: React.FC<DeliveryAttachModalProps> = ({
  artwork,
  onDeliver,
  onClose,
  wrapAction
}) => {
  const [activeDeliveryAttachmentTab, setActiveDeliveryAttachmentTab] = useState<'itdr' | 'rsa' | 'orcr'>('itdr');
  const [deliveryItdr, setDeliveryItdr] = useState<string[]>([]);
  const [deliveryRsa, setDeliveryRsa] = useState<string[]>([]);
  const [deliveryOrcr, setDeliveryOrcr] = useState<string[]>([]);

  const hasItdr = deliveryItdr.length > 0 || !!artwork.itdrImageUrl;
  const hasRsa = deliveryRsa.length > 0 || !!artwork.rsaImageUrl;

  return (
    <Modal onClose={onClose} title="Delivery Documentation Required">
      <div className="space-y-6">
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-sm flex items-start space-x-3">
          <div className="text-amber-500"><AlertTriangle size={24} /></div>
          <div>
            <p className="text-sm font-bold text-amber-900">Missing Attachments</p>
            <p className="text-xs text-amber-700 mt-1">
              Mandatory IT/DR and RSA documents must be attached before marking this artwork as Delivered.
            </p>
          </div>
        </div>

        {/* Delivery Attachments */}
        <div className="space-y-4 pt-2">
          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2">
            Attachments <span className="text-red-500 font-bold normal-case">(Required for Delivery)</span>
          </label>

          <div className="flex p-1 bg-neutral-100 rounded-sm">
            <button
              onClick={() => setActiveDeliveryAttachmentTab('itdr')}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeDeliveryAttachmentTab === 'itdr' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'}`}
            >
              IT/DR <span className="text-red-500 ml-1">{!artwork.itdrImageUrl ? '*' : ''}</span>
            </button>
            <button
              onClick={() => setActiveDeliveryAttachmentTab('rsa')}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeDeliveryAttachmentTab === 'rsa' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'}`}
            >
              RSA / AR <span className="text-red-500 ml-1">{!artwork.rsaImageUrl ? '*' : ''}</span>
            </button>
            <button
              onClick={() => setActiveDeliveryAttachmentTab('orcr')}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeDeliveryAttachmentTab === 'orcr' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'}`}
            >
              OR / CR
            </button>
          </div>

          <div className="relative">
            {(() => {
              const existingImages = activeDeliveryAttachmentTab === 'itdr' ? parseAttachmentString(artwork.itdrImageUrl) : activeDeliveryAttachmentTab === 'rsa' ? parseAttachmentString(artwork.rsaImageUrl) : parseAttachmentString(artwork.orCrImageUrl);
              const newImages = activeDeliveryAttachmentTab === 'itdr' ? deliveryItdr : activeDeliveryAttachmentTab === 'rsa' ? deliveryRsa : deliveryOrcr;
              const allImages = newImages.length > 0 ? newImages : existingImages;
              const isExisting = newImages.length === 0 && existingImages.length > 0;
              const setImages = activeDeliveryAttachmentTab === 'itdr' ? setDeliveryItdr : activeDeliveryAttachmentTab === 'rsa' ? setDeliveryRsa : setDeliveryOrcr;

              return allImages.length === 0 ? (
                <label className="flex flex-col items-center justify-center w-full h-32 bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-md cursor-pointer hover:bg-white hover:border-neutral-300 hover:shadow-lg hover:shadow-neutral-500/10 transition-all group">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (!files.length) return;
                      try {
                        const compressed = await Promise.all(files.map(f => compressImage(f, 800, 800, 0.6)));
                        setImages(prev => [...prev, ...compressed]);
                      } catch (err) {
                        console.error('Upload failed:', err);
                      } finally {
                        e.target.value = '';
                      }
                    }}
                  />
                  <div className="p-3 bg-white rounded-sm shadow-sm mb-2 group-hover:scale-110 transition-transform ring-1 ring-neutral-100">
                    <Upload size={20} className="text-neutral-400 group-hover:text-neutral-700 transition-colors" />
                  </div>
                  <span className="text-xs font-bold text-neutral-500 group-hover:text-neutral-900 transition-colors">Upload {activeDeliveryAttachmentTab.toUpperCase()}</span>
                </label>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                    {allImages.map((img, i) => (
                      <div key={i} className="relative group rounded-md overflow-hidden shadow-sm ring-1 ring-neutral-100 h-20">
                        <img src={img} className="w-full h-full object-cover" alt={`${activeDeliveryAttachmentTab.toUpperCase()} ${i + 1}`} />
                        {!isExisting && (
                          <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                            <button
                              onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                              className="p-1.5 bg-white text-red-600 rounded-full shadow-lg hover:scale-110 transition-transform"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {!isExisting && (
                      <label className="flex flex-col items-center justify-center h-20 bg-neutral-50 border border-dashed border-neutral-200 rounded-md cursor-pointer hover:border-neutral-300 transition-all group">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || []);
                            if (!files.length) return;
                            const compressed = await Promise.all(files.map(f => compressImage(f, 800, 800, 0.6)));
                            setImages(prev => [...prev, ...compressed]);
                            e.target.value = '';
                          }}
                        />
                        <Plus size={16} className="text-neutral-300 group-hover:text-neutral-500 transition-colors" />
                      </label>
                    )}
                  </div>
                  <div className="text-center text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    {activeDeliveryAttachmentTab.toUpperCase()} — {isExisting ? 'Existing' : `${allImages.length} Attached`}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button onClick={onClose} className="px-6 py-2.5 rounded-md text-neutral-600 font-bold hover:bg-neutral-100 transition-all transform hover:-translate-y-0.5">Cancel</button>
          <button
            onClick={() => {
              if (onDeliver) {
                wrapAction(async () => {
                  await onDeliver(artwork.id, deliveryItdr, deliveryRsa, deliveryOrcr);
                  onClose();
                }, 'Processing Delivery...', ArtworkStatus.DELIVERED);
              }
            }}
            className="px-8 py-2.5 bg-neutral-900 text-white rounded-md font-bold shadow-lg shadow-neutral-200 hover:shadow-neutral-300 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!hasItdr || !hasRsa}
          >
            Confirm Delivery
          </button>
        </div>
      </div>
    </Modal>
  );
};
