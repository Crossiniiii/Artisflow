import React from 'react';
import { MasterViewModal } from './MasterViewModal';
import { parseAttachmentString } from '../../utils/attachmentUtils';

interface AttachmentPreviewModalProps {
  type: 'itdr' | 'rsa' | 'orcr';
  imageUrl: string | string[] | null | undefined;
  onClose: () => void;
}

export const AttachmentPreviewModal: React.FC<AttachmentPreviewModalProps> = ({ type, imageUrl, onClose }) => {
  const title = type === 'itdr' ? 'IT/DR Document' : type === 'rsa' ? 'RSA / AR Preview' : 'OR / CR Preview';
  const printTitle = type === 'itdr' ? 'IT/DR' : type === 'rsa' ? 'RSA / AR' : 'OR / CR';
  const urls = parseAttachmentString(imageUrl);

  const handlePrint = () => {
    if (!imageUrl) return;
    const w = window.open('', '_blank');
    if (!w) return;
    const firstUrl = urls[0] || '';
    w.document.write(`<html><head><title>${printTitle}</title></head><body style="margin:0"><img src="${firstUrl}" style="max-width:100%;height:auto;display:block"/></body></html>`);
    w.document.close();
    w.focus();
    w.onload = () => w.print();
  };

  return (
    <MasterViewModal onClose={onClose} title={title} maxWidth="max-w-3xl">
      <div className="space-y-4">
        <div className={urls.length > 1 ? 'grid grid-cols-2 gap-3' : ''}>
          {urls.map((url, i) => (
            <img key={i} src={url} alt={`${printTitle} ${i + 1}`}
              className="w-full h-auto rounded-sm cursor-zoom-in hover:opacity-95 transition-opacity shadow-sm border border-neutral-100"
              onClick={() => window.open(url, '_blank')} title="Click to view full size" />
          ))}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium text-neutral-400">Click image to open in new tab</span>
          <div className="flex space-x-3">
            <button onClick={onClose} className="px-6 py-2.5 rounded-sm text-neutral-600 font-medium hover:bg-neutral-100 transition-colors">Close</button>
            <button onClick={handlePrint} className="px-8 py-2.5 bg-neutral-900 text-white rounded-sm font-bold shadow-lg shadow-neutral-200 hover:shadow-neutral-400 hover:-translate-y-0.5 transition-all">Print Document</button>
          </div>
        </div>
      </div>
    </MasterViewModal>
  );
};
