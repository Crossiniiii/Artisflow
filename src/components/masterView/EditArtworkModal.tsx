import React, { useState } from 'react';
import { Modal } from '../Modal';
import { Artwork, Branch } from '../../types';
import { compressImage } from '../../utils/imageUtils';
import { formatDimensions } from '../../utils/unitUtils';

interface EditArtworkModalProps {
  artwork: Artwork;
  branches: string[];
  onEdit: (updates: Partial<Artwork>) => void;
  onClose: () => void;
  wrapAction: (
    action: () => Promise<boolean | void> | boolean | void,
    message?: string,
    optionsOrStatus?: any
  ) => Promise<boolean | undefined>;
}

export const EditArtworkModal: React.FC<EditArtworkModalProps> = ({
  artwork,
  branches,
  onEdit,
  onClose,
  wrapAction
}) => {
  const [editForm, setEditForm] = useState<Partial<Artwork>>({
    title: artwork.title,
    artist: artwork.artist,
    medium: artwork.medium,
    dimensions: artwork.dimensions,
    sizeFrame: artwork.sizeFrame || '',
    year: artwork.year,
    price: artwork.price,
    currentBranch: artwork.currentBranch,
    remarks: artwork.remarks || '',
    imageUrl: artwork.imageUrl || '',
    rsaImageUrl: artwork.rsaImageUrl || '',
    orCrImageUrl: artwork.orCrImageUrl || ''
  });

  return (
    <Modal onClose={onClose} title="Edit Artwork Details">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Title</label>
            <input
              type="text"
              className="w-full px-5 py-3 bg-neutral-50 border-0 rounded-sm text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:bg-white hover:bg-neutral-100 transition-all"
              value={editForm.title as string}
              onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Artist</label>
            <input
              type="text"
              className="w-full px-5 py-3 bg-neutral-50 border-0 rounded-sm text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:bg-white hover:bg-neutral-100 transition-all"
              value={editForm.artist as string}
              onChange={(e) => {
                const val = e.target.value;
                setEditForm(prev => ({ 
                  ...prev, 
                  artist: val,
                  dimensions: formatDimensions(prev.dimensions || '', val),
                  sizeFrame: formatDimensions(prev.sizeFrame || '', val)
                }));
              }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Medium</label>
            <input
              type="text"
              className="w-full px-5 py-3 bg-neutral-50 border-0 rounded-sm text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:bg-white hover:bg-neutral-100 transition-all"
              value={editForm.medium as string}
              onChange={(e) => setEditForm(prev => ({ ...prev, medium: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Size</label>
            <input
              type="text"
              className="w-full px-5 py-3 bg-neutral-50 border-0 rounded-sm text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:bg-white hover:bg-neutral-100 transition-all"
              value={editForm.dimensions as string}
              onChange={(e) => setEditForm(prev => ({ ...prev, dimensions: e.target.value }))}
              onBlur={(e) => {
                const val = e.target.value;
                setEditForm(prev => ({ ...prev, dimensions: formatDimensions(val, editForm.artist || '') }));
              }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Frame Size</label>
            <input
              type="text"
              className="w-full px-5 py-3 bg-neutral-50 border-0 rounded-sm text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:bg-white hover:bg-neutral-100 transition-all"
              value={editForm.sizeFrame as string || ''}
              onChange={(e) => setEditForm(prev => ({ ...prev, sizeFrame: e.target.value }))}
              onBlur={(e) => {
                const val = e.target.value;
                setEditForm(prev => ({ ...prev, sizeFrame: formatDimensions(val, editForm.artist || '') }));
              }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Year</label>
            <input
              type="text"
              className="w-full px-5 py-3 bg-neutral-50 border-0 rounded-sm text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:bg-white hover:bg-neutral-100 transition-all"
              value={editForm.year as string}
              onChange={(e) => setEditForm(prev => ({ ...prev, year: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Price</label>
            <input
              type="text"
              inputMode="numeric"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm"
              value={Number(editForm.price || 0)}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, '');
                const parts = val.split('.');
                if (parts.length > 2) parts.splice(2);
                if (parts[0] && parts[0].length > 1) parts[0] = parts[0].replace(/^0+/, '') || '0';
                setEditForm(prev => ({ ...prev, price: parseFloat(parts.join('.')) || 0 }));
              }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Location (Branch)</label>
            <select
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm"
              value={String(editForm.currentBranch)}
              onChange={(e) => setEditForm(prev => ({ ...prev, currentBranch: e.target.value as Branch }))}
            >
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="space-y-1 col-span-2">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Image URL</label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm"
              value={String(editForm.imageUrl || '')}
              onChange={(e) => setEditForm(prev => ({ ...prev, imageUrl: e.target.value }))}
            />
          </div>
          <div className="space-y-2 col-span-2">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Upload Image</label>
            <div className="flex items-center space-x-3">
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const compressed = await compressImage(file, 1000, 1000, 0.7);
                    setEditForm(prev => ({ ...prev, imageUrl: compressed }));
                  } catch (err) {
                    console.error('Upload failed:', err);
                  } finally {
                    e.target.value = '';
                  }
                }}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm"
              />
            </div>
            {editForm.imageUrl && (
              <div className="mt-2">
                <img src={String(editForm.imageUrl)} alt="Preview" className="w-full h-48 object-cover rounded-sm border border-neutral-200" />
              </div>
            )}
          </div>
          <div className="space-y-1 col-span-2">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Remarks</label>
            <textarea
              rows={3}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm resize-none"
              value={String(editForm.remarks || '')}
              onChange={(e) => setEditForm(prev => ({ ...prev, remarks: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex justify-end space-x-3">
          <button onClick={onClose} className="px-6 py-2.5 rounded-md text-neutral-600 font-bold hover:bg-neutral-100 transition-all transform hover:-translate-y-0.5">Cancel</button>
          <button
            onClick={() => wrapAction(async () => { onEdit(editForm); }, 'Updating Artwork...')}
            className="px-8 py-2.5 bg-neutral-900 text-white rounded-md font-bold shadow-lg shadow-neutral-200 hover:shadow-neutral-300 transform hover:-translate-y-0.5 transition-all"
          >
            Save Changes
          </button>
        </div>
      </div>
    </Modal>
  );
};
