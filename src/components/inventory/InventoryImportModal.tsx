import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Modal } from '../Modal';
import { Artwork } from '../../types';

interface InventoryImportModalProps {
  showImportModal: boolean;
  setShowImportModal: (val: boolean) => void;
  importPreview: Partial<Artwork>[];
  importMonthValue: string;
  setImportMonthValue: (val: string) => void;
  importYearValue: string;
  setImportYearValue: (val: string) => void;
  importTargetBranch: string;
  setImportTargetBranch: (val: string) => void;
  branches: string[];
  processImport: () => void;
}

export const InventoryImportModal: React.FC<InventoryImportModalProps> = ({
  showImportModal,
  setShowImportModal,
  importPreview,
  importMonthValue,
  setImportMonthValue,
  importYearValue,
  setImportYearValue,
  importTargetBranch,
  setImportTargetBranch,
  branches,
  processImport
}) => {
  if (!showImportModal) return null;

  return (
    <Modal onClose={() => setShowImportModal(false)} title="Bulk Import Preview">
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 text-blue-700 rounded-xl text-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Ready to Import</p>
            <p className="opacity-90">Found {importPreview.length} valid records from {new Set(importPreview.map(i => i.sheetName)).size} pages.</p>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                Import Month
              </label>
              <select 
                value={importMonthValue}
                onChange={(e) => setImportMonthValue(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={String(m)}>
                    {new Date(0, m - 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                Import Year
              </label>
              <select 
                value={importYearValue}
                onChange={(e) => setImportYearValue(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
              >
                {Array.from({ length: new Date().getFullYear() - 1970 + 1 }, (_, i) => new Date().getFullYear() - i).map(y => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
             Import Destination (Branch)
          </label>
          <div className="relative">
            <input 
              list="branches-list"
              type="text" 
              value={importTargetBranch}
              onChange={(e) => setImportTargetBranch(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
              placeholder="Select or type new branch name..."
            />
            <datalist id="branches-list">
              {branches.map(b => <option key={b} value={b} />)}
            </datalist>
            <p className="mt-2 text-xs text-slate-500">
              Select an existing branch or type a new name to automatically create a new branch location.
            </p>
          </div>
        </div>
        
        <div className="max-h-[40vh] overflow-y-auto border border-slate-200 rounded-xl">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase sticky top-0">
              <tr>
                <th className="px-4 py-3">Page</th>
                <th className="px-4 py-3">Image</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Artist</th>
                <th className="px-4 py-3">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {importPreview.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500 text-xs font-bold uppercase">{item.sheetName}</td>
                  <td className="px-4 py-3">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt="Preview" className="w-10 h-10 object-cover rounded shadow-sm" />
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{item.title}</td>
                  <td className="px-4 py-3 text-slate-500">{item.artist}</td>
                  <td className="px-4 py-3 text-slate-500">₱{item.price?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <button 
            onClick={() => setShowImportModal(false)} 
            className="px-5 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={processImport} 
            disabled={!importTargetBranch}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
          >
            Import {importPreview.length} Items
          </button>
        </div>
      </div>
    </Modal>
  );
};
