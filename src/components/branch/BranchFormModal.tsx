import React from 'react';
import { Plus, X, Upload } from 'lucide-react';
import { compressBase64Image } from '../../services/imageService';
import LoadingOverlay from '../LoadingOverlay';

interface BranchFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingBranch: string | null;
  branchName: string;
  setBranchName: (name: string) => void;
  branchAddress: string;
  setBranchAddress: (address: string) => void;
  branchCategory: string;
  setBranchCategory: (category: string) => void;
  branchLogo: string | null;
  setBranchLogo: (logo: string | null) => void;
  isExclusive: boolean;
  setIsExclusive: (exclusive: boolean) => void;
  existingCategories: string[];
  onSubmit: (e: React.FormEvent) => void;
  canEdit: boolean;
  isSyncing: boolean;
  syncProgress: number;
  processMessage: string;
}

export const BranchFormModal: React.FC<BranchFormModalProps> = ({
  isOpen,
  onClose,
  editingBranch,
  branchName,
  setBranchName,
  branchAddress,
  setBranchAddress,
  branchCategory,
  setBranchCategory,
  branchLogo,
  setBranchLogo,
  isExclusive,
  setIsExclusive,
  existingCategories,
  onSubmit,
  canEdit,
  isSyncing,
  syncProgress,
  processMessage
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm p-4">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 border border-neutral-200/80">
          <div className="px-6 py-4 bg-neutral-900 text-white flex justify-between items-center">
            <h3 className="font-bold text-sm tracking-[0.18em] uppercase">
              {editingBranch ? 'Edit Branch' : 'Add New Branch'}
            </h3>
            <button onClick={onClose} className="text-white/80 hover:text-white">
              <Plus size={24} className="rotate-45" />
            </button>
          </div>

          <form onSubmit={onSubmit} className="p-6 space-y-4">
            {!editingBranch && (
              <div className="flex border-b border-neutral-200 mb-4">
                <button
                  type="button"
                  onClick={() => setIsExclusive(false)}
                  className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${!isExclusive ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-400 hover:text-neutral-600'}`}
                >
                  Standard Branch
                </button>
                <button
                  type="button"
                  onClick={() => setIsExclusive(true)}
                  className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${isExclusive ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-400 hover:text-neutral-600'}`}
                >
                  Exclusive
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">Branch Name</label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="e.g., North Wing Gallery"
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">Address</label>
              <input
                type="text"
                value={branchAddress}
                onChange={(e) => setBranchAddress(e.target.value)}
                placeholder="e.g., 123 Art Street, Makati City"
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">Category</label>
              <select
                value={branchCategory}
                onChange={(e) => setBranchCategory(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 appearance-none cursor-pointer"
              >
                {existingCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">Branch Logo</label>
              <div className="relative group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                      const rawBase64 = ev.target?.result as string;
                      const compressed = await compressBase64Image(rawBase64, 512, 200 * 1024); // Smaller for logos
                      setBranchLogo(compressed);
                    };
                    reader.readAsDataURL(file);
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <div className="w-full py-6 bg-neutral-50 border-2 border-neutral-200 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 group-hover:bg-neutral-100 transition-all">
                  {branchLogo ? (
                    <div className="relative">
                      <img src={branchLogo} alt="Logo Preview" className="h-16 w-16 object-contain rounded-lg" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setBranchLogo(null);
                        }}
                        className="absolute -top-2 -right-2 p-1 bg-rose-500 text-white rounded-full shadow-sm hover:bg-rose-600 transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload size={20} className="text-neutral-400" />
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider text-center px-4">
                        Upload Logo (PNG/JPG)
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-white border border-neutral-200 text-neutral-700 font-bold rounded-xl hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canEdit || !branchName.trim()}
                className="flex-1 px-4 py-3 bg-neutral-900 text-white font-bold rounded-xl hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingBranch ? 'Save Changes' : 'Create Branch'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <LoadingOverlay
        isVisible={isSyncing}
        title={processMessage}
        progress={{ current: syncProgress, total: 100 }}
      />
    </>
  );
};
