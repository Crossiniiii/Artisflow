import React, { useState, useMemo } from 'react';
import { ReturnRecord } from '../types';
import { Search, Filter, Calendar, User, FileText, Package, X, MapPin, Layers, Maximize2, Tag, TrendingUp, Clock, AlertCircle, Edit, Save, Upload } from 'lucide-react';

interface ReturnToArtistViewProps {
  returnRecords: ReturnRecord[];
  onUpdateReturnRecord?: (id: string, updates: Partial<ReturnRecord>) => void;
}

const Modal: React.FC<{ children: React.ReactNode, onClose: () => void, title: string }> = ({ children, onClose, title }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
    <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200 ring-1 ring-white/20">
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <h3 className="text-lg font-black text-slate-800 tracking-tight">{title}</h3>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
          <X size={20} />
        </button>
      </div>
      <div className="p-8">
        {children}
      </div>
    </div>
  </div>
);

const ReturnToArtistView: React.FC<ReturnToArtistViewProps> = ({ returnRecords, onUpdateReturnRecord }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  const [selectedArtist, setSelectedArtist] = useState<string>('All');
  const [selectedMedium, setSelectedMedium] = useState<string>('All');
  const [selectedSize, setSelectedSize] = useState<string>('All');
  const [selectedRecord, setSelectedRecord] = useState<ReturnRecord | null>(null);
  
  // Edit State
  const [isEditingProof, setIsEditingProof] = useState(false);
  const [editForm, setEditForm] = useState<{ referenceNumber: string; proofImage: string }>({ referenceNumber: '', proofImage: '' });
  const [isUploading, setIsUploading] = useState(false);

  const handleSelectRecord = (record: ReturnRecord) => {
    setSelectedRecord(record);
    setEditForm({
        referenceNumber: record.referenceNumber || '',
        proofImage: record.proofImage || ''
    });
    setIsEditingProof(false);
  };

  const handleSaveProof = () => {
    if (!selectedRecord || !onUpdateReturnRecord) return;
    
    const updates: Partial<ReturnRecord> = {
        referenceNumber: editForm.referenceNumber,
        proofImage: editForm.proofImage
    };

    onUpdateReturnRecord(selectedRecord.id, updates);
    
    // Update local state
    setSelectedRecord({ ...selectedRecord, ...updates });
    setIsEditingProof(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const maxW = 1200;
                const maxH = 1200;
                const w = img.width;
                const h = img.height;
                const scale = Math.min(maxW / w, maxH / h, 1);
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(w * scale);
                canvas.height = Math.round(h * scale);
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas not available'));
                    return;
                }
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const isPng = file.type === 'image/png';
                const mime = isPng ? 'image/png' : 'image/jpeg';
                resolve(isPng ? canvas.toDataURL(mime) : canvas.toDataURL(mime, 0.85));
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
        setEditForm(prev => ({ ...prev, proofImage: dataUrl }));
    } catch (err) {
        console.error('Error processing image:', err);
        alert('Failed to process image. Please try again.');
    } finally {
        setIsUploading(false);
    }
  };

  const branches = useMemo(() => ['All', ...Array.from(new Set(returnRecords.map(r => r.artworkSnapshot.currentBranch))).sort()], [returnRecords]);
  const artists = useMemo(() => ['All', ...Array.from(new Set(returnRecords.map(r => r.artworkSnapshot.artist))).sort()], [returnRecords]);
  const mediums = useMemo(() => ['All', ...Array.from(new Set(returnRecords.map(r => r.artworkSnapshot.medium))).sort()], [returnRecords]);
  const sizes = useMemo(() => ['All', ...Array.from(new Set(returnRecords.map(r => r.artworkSnapshot.dimensions))).sort()], [returnRecords]);

  // Dashboard Stats
  const stats = useMemo(() => {
    const total = returnRecords.length;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
    const recent = returnRecords.filter(r => new Date(r.returnDate) > thirtyDaysAgo).length;

    const reasonCounts = returnRecords.reduce((acc, curr) => {
      acc[curr.reason] = (acc[curr.reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    const branchCounts = returnRecords.reduce((acc, curr) => {
      acc[curr.artworkSnapshot.currentBranch] = (acc[curr.artworkSnapshot.currentBranch] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topBranch = Object.entries(branchCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return { total, recent, topReason, topBranch };
  }, [returnRecords]);

  const filteredRecords = returnRecords.filter(record => {
    const matchesSearch = 
      record.artworkSnapshot.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.artworkSnapshot.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.referenceNumber && record.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesBranch = selectedBranch === 'All' || record.artworkSnapshot.currentBranch === selectedBranch;
    const matchesArtist = selectedArtist === 'All' || record.artworkSnapshot.artist === selectedArtist;
    const matchesMedium = selectedMedium === 'All' || record.artworkSnapshot.medium === selectedMedium;
    const matchesSize = selectedSize === 'All' || record.artworkSnapshot.dimensions === selectedSize;

    return matchesSearch && matchesBranch && matchesArtist && matchesMedium && matchesSize;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Returns</h4>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
              <Package size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-800">{stats.total}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Lifetime records</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Returns</h4>
            <div className="p-2 bg-green-50 text-green-600 rounded-lg group-hover:scale-110 transition-transform">
              <Clock size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-800">{stats.recent}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Last 30 days</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Reason</h4>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg group-hover:scale-110 transition-transform">
              <AlertCircle size={18} />
            </div>
          </div>
          <p className="text-lg font-black text-slate-800 line-clamp-1" title={stats.topReason}>{stats.topReason}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Most common cause</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Branch</h4>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:scale-110 transition-transform">
              <MapPin size={18} />
            </div>
          </div>
          <p className="text-lg font-black text-slate-800 line-clamp-1" title={stats.topBranch}>{stats.topBranch}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Highest return rate</p>
        </div>
      </div>

      {/* Controls & Filters Container */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search returns (Title, Artist, Reason, IT/DR #)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
             <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">
              <Filter size={14} />
              <span>Filters</span>
            </div>
            {[
              { value: selectedBranch, onChange: setSelectedBranch, options: branches, label: 'Branch' },
              { value: selectedArtist, onChange: setSelectedArtist, options: artists, label: 'Artist' },
              { value: selectedMedium, onChange: setSelectedMedium, options: mediums, label: 'Medium' },
              { value: selectedSize, onChange: setSelectedSize, options: sizes, label: 'Size' }
            ].map((filter, idx) => (
              <select 
                key={idx}
                value={filter.value} 
                onChange={(e) => filter.onChange(e.target.value)}
                className="px-3 py-2 bg-slate-50 border-none rounded-lg text-sm text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                {filter.options.map(o => <option key={o} value={o}>{o === 'All' ? `All ${filter.label}s` : o}</option>)}
              </select>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredRecords.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-24 text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
            <Package size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium text-slate-600">No return records found</p>
            <p className="text-sm text-slate-400">Try adjusting your search or filters</p>
          </div>
        ) : (
          filteredRecords.map((record) => (
            <div 
              key={record.id}
              onClick={() => handleSelectRecord(record)}
              className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col h-full hover:-translate-y-1 relative"
            >
              <div className="aspect-[4/3] overflow-hidden relative">
                <img 
                  src={record.artworkSnapshot.imageUrl} 
                  alt={record.artworkSnapshot.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                />
                <div className="absolute top-3 right-3">
                   <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border shadow-sm bg-rose-100 text-rose-700 border-rose-200 backdrop-blur-md">
                     RETURNED
                   </span>
                </div>
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-900/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                   <p className="text-white text-xs font-medium flex items-center gap-1">
                      <MapPin size={12} />
                      {record.artworkSnapshot.currentBranch}
                   </p>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <div className="mb-3 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">{record.artworkSnapshot.code}</span>
                  <h4 className="text-lg font-bold text-slate-800 leading-tight line-clamp-1 group-hover:text-blue-600 transition-colors">{record.artworkSnapshot.title}</h4>
                  <p className="text-sm text-slate-500 font-medium">by {record.artworkSnapshot.artist}</p>
                </div>
                
                <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-100">
                  <div className="flex items-center gap-2">
                     <span className="text-xs text-slate-500 font-medium px-2 py-1 bg-slate-50 rounded-md">
                        {record.artworkSnapshot.medium}
                     </span>
                  </div>
                  <p className="text-base font-bold text-slate-900">₱{record.artworkSnapshot.price.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Details Modal */}
      {selectedRecord && (
        <Modal title="Return Record Details" onClose={() => setSelectedRecord(null)}>
          <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="w-32 h-32 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100 shadow-sm">
                    {selectedRecord.artworkSnapshot.imageUrl ? (
                    <img 
                        src={selectedRecord.artworkSnapshot.imageUrl} 
                        alt={selectedRecord.artworkSnapshot.title}
                        className="w-full h-full object-cover"
                    />
                    ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Package size={24} />
                    </div>
                    )}
                </div>
                <div className="flex-1 pt-1">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">{selectedRecord.artworkSnapshot.title}</h2>
                    <p className="text-lg text-slate-500 font-medium mb-4">by {selectedRecord.artworkSnapshot.artist}</p>
                    <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg tracking-wide">
                            {selectedRecord.artworkSnapshot.year}
                        </span>
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg tracking-wide">
                            {selectedRecord.artworkSnapshot.medium}
                        </span>
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg tracking-wide">
                            {selectedRecord.artworkSnapshot.dimensions}
                        </span>
                    </div>
                </div>
            </div>

            {/* Return Information Box - Matched to Reference */}
            <div className="bg-rose-50/80 rounded-2xl p-6 border border-rose-100">
                <h4 className="text-xs font-black text-rose-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <FileText size={14} className="text-rose-600" />
                    RETURN INFORMATION
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12 mb-6">
                    <div>
                        <label className="text-[10px] font-bold text-rose-800/60 uppercase tracking-wider block mb-1">RETURN DATE</label>
                        <p className="text-slate-900 font-semibold">{new Date(selectedRecord.returnDate).toLocaleString()}</p>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-rose-800/60 uppercase tracking-wider block mb-1">PROCESSED BY</label>
                        <p className="text-slate-900 font-semibold">{selectedRecord.returnedBy}</p>
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-bold text-rose-800/60 uppercase tracking-wider block mb-2">REASON FOR RETURN</label>
                    <div className="bg-white p-4 rounded-xl border border-rose-100 shadow-sm">
                        <p className="text-slate-800 font-medium italic">
                            "{selectedRecord.reason}"
                        </p>
                    </div>
                </div>

                 {selectedRecord.notes && (
                    <div className="mt-6 pt-6 border-t border-rose-100/50">
                        <label className="text-[10px] font-bold text-rose-800/60 uppercase tracking-wider block mb-2">ADDITIONAL NOTES</label>
                        <p className="text-slate-700 text-sm">{selectedRecord.notes}</p>
                    </div>
                )}
            </div>

            {/* Proof Section */}
            {(selectedRecord.referenceNumber || selectedRecord.proofImage || onUpdateReturnRecord) && (
                <div className="pt-2 border-t border-slate-100 mt-6">
                     <div className="flex items-center justify-between mb-4 mt-6">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Tag size={14} />
                            PROOF OF RETURN (IT/DR)
                        </h4>
                        {onUpdateReturnRecord && !isEditingProof && (
                            <button 
                                onClick={() => setIsEditingProof(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                            >
                                <Edit size={12} />
                                Edit Proof
                            </button>
                        )}
                     </div>
                    
                    {isEditingProof ? (
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
                            {/* Reference Number Input */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Reference Number (IT/DR #)</label>
                                <input 
                                    type="text" 
                                    value={editForm.referenceNumber}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                                    placeholder="Enter IT or DR Number..."
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                />
                            </div>

                            {/* Image Upload */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Proof Image</label>
                                
                                {editForm.proofImage ? (
                                    <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white">
                                        <img src={editForm.proofImage} alt="Proof Preview" className="w-full h-48 object-contain bg-slate-100/50" />
                                        <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <label className="cursor-pointer px-4 py-2 bg-white/90 backdrop-blur text-slate-700 rounded-lg text-xs font-bold hover:bg-white transition-colors shadow-lg">
                                                Change Image
                                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                            </label>
                                            <button 
                                                onClick={() => setEditForm(prev => ({ ...prev, proofImage: '' }))}
                                                className="px-4 py-2 bg-rose-500/90 backdrop-blur text-white rounded-lg text-xs font-bold hover:bg-rose-500 transition-colors shadow-lg"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <label className={`
                                        flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl 
                                        bg-slate-50 hover:bg-slate-100 hover:border-indigo-400 transition-all cursor-pointer group
                                        ${isUploading ? 'opacity-50 pointer-events-none' : ''}
                                    `}>
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            {isUploading ? (
                                                <div className="animate-spin text-indigo-500 mb-2"><Package size={24} /></div>
                                            ) : (
                                                <Upload className="w-8 h-8 mb-3 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                            )}
                                            <p className="mb-1 text-sm text-slate-500 font-medium group-hover:text-indigo-600">
                                                {isUploading ? 'Processing...' : 'Click to upload proof'}
                                            </p>
                                            <p className="text-xs text-slate-400">PNG, JPG (Max. 1200x1200px)</p>
                                        </div>
                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                                    </label>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button 
                                    onClick={() => {
                                        setIsEditingProof(false);
                                        setEditForm({
                                            referenceNumber: selectedRecord.referenceNumber || '',
                                            proofImage: selectedRecord.proofImage || ''
                                        });
                                    }}
                                    className="px-4 py-2 text-slate-500 font-bold text-sm hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSaveProof}
                                    className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95"
                                >
                                    <Save size={16} />
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {(selectedRecord.referenceNumber || selectedRecord.proofImage) ? (
                                <>
                                    {selectedRecord.referenceNumber && (
                                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="p-2 bg-white rounded-lg shadow-sm text-slate-400">
                                                <Tag size={18} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reference Number</label>
                                                <p className="text-base font-bold text-slate-700 font-mono">{selectedRecord.referenceNumber}</p>
                                            </div>
                                        </div>
                                    )}

                                    {selectedRecord.proofImage && (
                                        <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 relative group">
                                            <img src={selectedRecord.proofImage} alt="Proof" className="w-full h-auto max-h-[300px] object-contain" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <a href={selectedRecord.proofImage} download={`Proof-${selectedRecord.id}`} className="px-4 py-2 bg-white rounded-full text-slate-900 font-bold text-sm shadow-lg hover:scale-105 transition-transform">
                                                    Download Image
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <p className="text-slate-400 text-sm font-medium">No proof of return attached.</p>
                                    <p className="text-slate-400 text-xs mt-1">Click "Edit Proof" to add details.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ReturnToArtistView;