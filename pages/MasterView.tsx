
import React, { useState, useMemo } from 'react';
import { 
  Artwork, 
  ArtworkStatus, 
  ActivityLog, 
  SaleRecord, 
  UserRole,
  Branch,
  ExhibitionEvent,
  UserPermissions
} from '../types';
import { ICONS } from '../constants';
import CertificateModal from '../components/CertificateModal';
import { XCircle, Bookmark, Edit, Paperclip, ChevronDown, Trash2, RotateCcw, AlertTriangle, Upload, Tag } from 'lucide-react';

interface MasterViewProps {
  artwork: Artwork;
  branches: string[];
  logs: ActivityLog[];
  sale?: SaleRecord;
  userRole: UserRole;
  userPermissions?: UserPermissions;
  onTransfer: (id: string, destination: Branch) => void;
  onSale: (id: string, client: string) => void;
  onCancelSale: (id: string) => void;
  onDeliver: (id: string) => void;
  onEdit: (updates: Partial<Artwork>) => void;
  onBack: () => void;
  // Note: We'd ideally pass events here for the dropdown, assuming it's managed in App state
  events?: ExhibitionEvent[]; 
  onReserve?: (id: string, details: string) => void;
  onDelete?: (id: string) => void;
  onReturn?: (id: string, reason: string, referenceNumber?: string, proofImage?: string, notes?: string) => void;
}

const MasterView: React.FC<MasterViewProps> = ({ 
  artwork, branches, logs, sale, userRole, userPermissions, onTransfer, onSale, onCancelSale, onDeliver, onReturn, onEdit, onBack, events = [], onReserve, onDelete 
}) => {
  const [modalMode, setModalMode] = useState<'transfer' | 'sale' | 'reserve' | 'certificate' | 'edit' | 'attach-unified' | 'return' | 'none'>('none');
  const [activeAttachmentTab, setActiveAttachmentTab] = useState<'itdr' | 'rsa' | 'orcr'>('itdr');
  const [transferBranch, setTransferBranch] = useState<Branch>(branches[0] as Branch);
  const [clientName, setClientName] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [returnRefNumber, setReturnRefNumber] = useState('');
  const [returnProofImage, setReturnProofImage] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [editForm, setEditForm] = useState<Partial<Artwork>>({
    title: artwork.title,
    artist: artwork.artist,
    medium: artwork.medium,
    dimensions: artwork.dimensions,
    year: artwork.year,
    price: artwork.price,
    currentBranch: artwork.currentBranch,
    remarks: artwork.remarks,
    imageUrl: artwork.imageUrl,
    rsaImageUrl: artwork.rsaImageUrl,
    orCrImageUrl: artwork.orCrImageUrl
  });
  const [itdrUrl, setItdrUrl] = useState<string>(artwork.itdrImageUrl || '');
  const [timelineView, setTimelineView] = useState<'activity' | 'transfers'>('activity');
  const [showItdrPreview, setShowItdrPreview] = useState(false);
  const [showRsaPreview, setShowRsaPreview] = useState(false);
  const [showOrCrPreview, setShowOrCrPreview] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [tempAttachmentUrl, setTempAttachmentUrl] = useState<string>(''); // For RSA/ORCR attachments
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  const effectiveLogs = useMemo(() => {
    const combined = [...logs];
    // Inject "Sold" event if missing and status warrants it
    const hasSaleLog = logs.some(l => l.action.toLowerCase().includes('sale declared') || l.action.toLowerCase() === 'sold');
    
    const isSold = String(artwork.status).toLowerCase() === 'sold' || String(artwork.status).toLowerCase() === 'delivered';
    
    if (isSold && !hasSaleLog) {
       // Determine best available date
       let saleDate = sale?.saleDate || artwork.createdAt;
       // Try to parse year if it looks like a full date
       if (!sale?.saleDate && artwork.year && artwork.year.match(/^\d{4}-\d{2}-\d{2}/)) {
           saleDate = artwork.year; // Use the specific date from Excel if mapped to year
       } else if (!sale?.saleDate && artwork.year && artwork.year.match(/^\d{4}$/)) {
           // If only year is available, default to Jan 1st of that year for sorting purposes, 
           // but display might just show date. 
           // We'll keep it as is or try to construct a date.
           // For timeline sorting, we need a valid ISO string.
           saleDate = `${artwork.year}-01-01T00:00:00.000Z`;
       }

       combined.push({
         id: 'synthetic-sale-log',
         artworkId: artwork.id,
         action: 'Sold (Imported)',
         user: 'System (Imported)',
         timestamp: saleDate,
         details: sale ? `Sold to ${sale.client}` : 'Marked as Sold during import'
       });
    }
    return combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs, artwork, sale]);

  // Sync local form state with prop updates
  React.useEffect(() => {
    setEditForm({
      title: artwork.title,
      artist: artwork.artist,
      medium: artwork.medium,
      dimensions: artwork.dimensions,
      year: artwork.year,
      price: artwork.price,
      currentBranch: artwork.currentBranch,
      remarks: artwork.remarks,
      imageUrl: artwork.imageUrl,
      rsaImageUrl: artwork.rsaImageUrl,
      orCrImageUrl: artwork.orCrImageUrl
    });
    setItdrUrl(artwork.itdrImageUrl || '');
  }, [artwork]);

  const handlePrintItdr = () => {
    if (!artwork.itdrImageUrl) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>IT/DR</title></head><body style="margin:0"><img src="${artwork.itdrImageUrl}" style="max-width:100%;height:auto;display:block"/></body></html>`);
    w.document.close();
    w.focus();
    w.onload = () => w.print();
  };

  const handlePrintRsa = () => {
    if (!artwork.rsaImageUrl) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>RSA / AR</title></head><body style="margin:0"><img src="${artwork.rsaImageUrl}" style="max-width:100%;height:auto;display:block"/></body></html>`);
    w.document.close();
    w.focus();
    w.onload = () => w.print();
  };

  const handlePrintOrCr = () => {
    if (!artwork.orCrImageUrl) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>OR / CR</title></head><body style="margin:0"><img src="${artwork.orCrImageUrl}" style="max-width:100%;height:auto;display:block"/></body></html>`);
    w.document.close();
    w.focus();
    w.onload = () => w.print();
  };

  
  // Reservation States
  const [reserveType, setReserveType] = useState<'Person' | 'Event'>('Person');
  const [reserveTarget, setReserveTarget] = useState('');
  const [reserveNotes, setReserveNotes] = useState('');

  const isImmutable = artwork.status === ArtworkStatus.SOLD || artwork.status === ArtworkStatus.DELIVERED;
  const canGenerateCert = (artwork.status === ArtworkStatus.SOLD || artwork.status === ArtworkStatus.DELIVERED) && sale && !sale.isCancelled;
  const transferLogs = logs.filter(l => l.action === 'Transferred' || l.action.includes('Transfer'));
  const formatImportPeriod = (p?: string) => {
    if (!p) return '';
    const parts = p.split('-');
    if (parts.length < 2) return p || '';
    const y = parts[0];
    const m = Math.max(1, Math.min(12, parseInt(parts[1], 10)));
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${monthNames[m - 1]} ${y}`;
  };

  const handleReserve = () => {
    if (!onReserve) return;
    const target = reserveTarget && reserveTarget.trim().length > 0 ? reserveTarget.trim() : 'N/A';
    const detailString = `Type: ${reserveType} | Target: ${target} | Notes: ${reserveNotes}`;
    onReserve(artwork.id, detailString);
    setModalMode('none');
    resetReserveForm();
  };

  const resetReserveForm = () => {
    setReserveType('Person');
    setReserveTarget('');
    setReserveNotes('');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center space-x-2 text-slate-500 hover:text-slate-800 font-bold px-4 py-2 rounded-xl hover:bg-slate-100 transition-all transform hover:-translate-y-0.5">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          <span>Back to Previous Tab</span>
        </button>
        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Master File ID: {artwork.id}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
            <div className="md:w-2/5 aspect-square relative">
              <img 
                src={artwork.imageUrl} 
                className="w-full h-full object-cover cursor-zoom-in" 
                alt={artwork.title} 
                onClick={() => setShowImagePreview(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            </div>
            <div className="p-8 flex-1 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-tighter">{artwork.code}</span>
                  <StatusBadge status={artwork.status} />
                </div>
                <h1 className="text-3xl font-bold text-slate-900 leading-tight">{artwork.title}</h1>
                <p className="text-lg text-slate-500 font-medium">{artwork.artist}, {artwork.year}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                    Added: {new Date(artwork.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm pt-4 border-t border-slate-100">
                <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Medium</p><p className="text-slate-700 font-medium">{artwork.medium}</p></div>
                <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Dimensions</p><p className="text-slate-700 font-medium">{artwork.dimensions}</p></div>
                <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Valuation</p><p className="text-slate-900 font-bold">₱{artwork.price.toLocaleString()}</p></div>
                <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Location</p><p className="text-slate-700 font-medium">{artwork.currentBranch}</p></div>
              </div>

              {/* Extra Details from Import */}
              {Object.keys(artwork).filter(key => !['id', 'code', 'title', 'artist', 'medium', 'dimensions', 'year', 'price', 'status', 'currentBranch', 'imageUrl', 'createdAt'].includes(key)).length > 0 && (
                <div className="pt-4 border-t border-slate-100 mt-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Additional Details</p>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                     {Object.keys(artwork)
                       .filter(key => !['id', 'code', 'title', 'artist', 'medium', 'dimensions', 'year', 'price', 'status', 'currentBranch', 'imageUrl', 'createdAt'].includes(key))
                       .map(key => (
                         <div key={key}>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{key}</p>
                           <p className="text-slate-700 font-medium">{String((artwork as any)[key])}</p>
                         </div>
                     ))}
                  </div>
                </div>
              )}

              {(artwork.status === ArtworkStatus.DELIVERED || artwork.status === ArtworkStatus.CANCELLED) && (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-start space-x-3">
                  <div className="text-slate-400">{ICONS.Shield}</div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">Record Finalized</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">This record is finalized due to its current status. Activity is restricted for audit integrity.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <h3 className="text-xl font-bold text-slate-800">Artwork History</h3>
                <span className="text-xs font-normal text-slate-400">(Audit Trail)</span>
              </div>
              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setTimelineView('activity')}
                  className={`px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all transform duration-200 ${
                    timelineView === 'activity' ? 'bg-white text-slate-900 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Activity
                </button>
                <button
                  onClick={() => setTimelineView('transfers')}
                  className={`px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all transform duration-200 ${
                    timelineView === 'transfers' ? 'bg-white text-slate-900 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  History Transfer
                </button>
              </div>
            </div>
            {timelineView === 'activity' && (
              <div className="space-y-6">
                {effectiveLogs.map((log) => (
                  <div 
                    key={log.id} 
                    onClick={() => setSelectedLog(log)}
                    className="relative pl-8 pb-6 last:pb-0 border-l-2 border-slate-100 cursor-pointer group hover:bg-slate-50/50 rounded-r-xl transition-all duration-200 pr-4"
                  >
                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm transition-transform group-hover:scale-110 ${
                      log.action.includes('Sale') ? 'bg-amber-500' : 
                      log.action.includes('Delivered') ? 'bg-indigo-500' : 
                      log.action.includes('Transfer') ? 'bg-blue-500' : 
                      log.action.includes('Reserved') ? 'bg-yellow-500' :
                      log.action.includes('Cancelled') ? 'bg-rose-500' : 'bg-slate-400'
                    }`}></div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{log.action}</p>
                        <time className="text-[10px] text-slate-400 font-medium">{new Date(log.timestamp).toLocaleString()}</time>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{log.details || 'System event recorded'}</p>
                      <div className="mt-2 inline-flex items-center space-x-1.5 px-2 py-0.5 bg-slate-100 group-hover:bg-slate-200 rounded text-[10px] text-slate-500 font-bold uppercase transition-colors">
                        <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                        <span>Auth: {log.user}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {timelineView === 'transfers' && (
              <div className="space-y-4">
                {transferLogs.length === 0 && (
                  <p className="text-sm text-slate-500">No transfer history recorded for this artwork.</p>
                )}
                {transferLogs.map((log) => (
                  <div key={log.id} onClick={() => setSelectedLog(log)} className="flex items-start justify-between border-b border-slate-100 pb-4 last:border-b-0 last:pb-0 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{log.details || 'Transferred'}</p>
                      <p className="text-xs text-slate-500 mt-1">Authorized by {log.user}</p>
                    </div>
                    <time className="text-xs text-slate-400 font-medium">{new Date(log.timestamp).toLocaleString()}</time>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm sticky top-8">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Operations Panel</h3>
            <div className="space-y-3">
              {userPermissions?.canEditArtwork && (
                <>
                  <ActionButton 
                    label="Edit Artwork" 
                    icon={<Edit size={20}/>} 
                    variant="emerald" 
                    disabled={isImmutable} 
                    onClick={() => setModalMode('edit')} 
                  />
                  <ActionButton 
                    label="Transfer to Branch" 
                    icon={ICONS.Transfers} 
                    disabled={!(artwork.status === ArtworkStatus.AVAILABLE || artwork.status === ArtworkStatus.EXCLUSIVE_VIEW_ONLY)} 
                    onClick={() => setModalMode('transfer')} 
                  />
                  {onDelete && userPermissions?.canDeleteArtwork && (
                    <ActionButton 
                      label="Delete Artwork" 
                      icon={<Trash2 size={20}/>} 
                      variant="rose" 
                      disabled={isImmutable} 
                      onClick={() => {
                        if (window.confirm("Are you sure you want to permanently delete this artwork? This action cannot be undone.")) {
                          onDelete(artwork.id);
                        }
                      }} 
                    />
                  )}
                  {onReturn && userPermissions?.canDeleteArtwork && (
                    <ActionButton 
                      label="Return to Artist" 
                      icon={<RotateCcw size={20}/>} 
                      variant="slate" 
                      disabled={isImmutable} 
                      onClick={() => setModalMode('return')} 
                    />
                  )}
                </>
              )}

              {userPermissions?.canReserveArtwork && (
                  <ActionButton 
                    label="Reserve Artwork" 
                    icon={<Bookmark size={20}/>} 
                    variant="yellow" 
                    disabled={artwork.status !== ArtworkStatus.AVAILABLE} 
                    onClick={() => setModalMode('reserve')} 
                  />
              )}

              {userPermissions?.canSellArtwork && (
                <>
                  <ActionButton 
                    label="Declare Sale" 
                    icon={ICONS.Sales} 
                    variant="amber" 
                    disabled={!(artwork.status === ArtworkStatus.AVAILABLE || artwork.status === ArtworkStatus.RESERVED)} 
                    onClick={() => setModalMode('sale')} 
                  />
                  <ActionButton 
                    label="Mark as Delivered" 
                    icon={ICONS.Deliver} 
                    variant="indigo" 
                    disabled={artwork.status !== ArtworkStatus.SOLD} 
                    onClick={() => onDeliver(artwork.id)} 
                  />
                </>
              )}

              {(artwork.status === ArtworkStatus.SOLD || artwork.status === ArtworkStatus.DELIVERED) && userPermissions?.canAttachITDR && (
                <ActionButton 
                  label="Attach IT/DR/RSA/AR/OR/CR" 
                  icon={<Paperclip size={20}/>} 
                  variant="indigo" 
                  onClick={() => {
                    setTempAttachmentUrl(artwork.itdrImageUrl || ''); 
                    setActiveAttachmentTab('itdr');
                    setModalMode('attach-unified');
                  }}  
                />
              )}

              {artwork.status === ArtworkStatus.SOLD && userPermissions?.canSellArtwork && (
                <ActionButton 
                  label="Cancel Sale Order" 
                  icon={<XCircle size={20}/>} 
                  variant="rose" 
                  onClick={() => { if(confirm("Cancel this sale? Artwork will be marked as Cancelled.")) onCancelSale(artwork.id); }} 
                />
              )}

              {canGenerateCert && (userPermissions?.canAccessCertificate ?? true) && <ActionButton label="Generate Certificate" icon={ICONS.History} variant="emerald" onClick={() => setModalMode('certificate')} />}
              
              {artwork.itdrImageUrl && (userPermissions?.canAttachITDR ?? true) && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <ActionButton label="View IT/DR" icon={<Paperclip size={20}/>} variant="slate" onClick={() => setShowItdrPreview(true)} />
                  <ActionButton label="Print IT/DR" icon={<Paperclip size={20}/>} variant="slate" onClick={handlePrintItdr} />
                </div>
              )}

              {artwork.rsaImageUrl && (userPermissions?.canAttachITDR ?? true) && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <ActionButton label="View RSA/AR" icon={<Paperclip size={20}/>} variant="slate" onClick={() => setShowRsaPreview(true)} />
                  <ActionButton label="Print RSA/AR" icon={<Paperclip size={20}/>} variant="slate" onClick={handlePrintRsa} />
                </div>
              )}

              {artwork.orCrImageUrl && (userPermissions?.canAttachITDR ?? true) && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <ActionButton label="View OR/CR" icon={<Paperclip size={20}/>} variant="slate" onClick={() => setShowOrCrPreview(true)} />
                  <ActionButton label="Print OR/CR" icon={<Paperclip size={20}/>} variant="slate" onClick={handlePrintOrCr} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {modalMode === 'edit' && (
        <Modal onClose={() => setModalMode('none')} title="Edit Artwork Details">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Title</label>
                <input 
                  type="text" 
                  className="w-full px-5 py-3 bg-slate-50 border-0 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-indigo-50 hover:bg-indigo-50 transition-all"
                  value={editForm.title as string}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Artist</label>
                <input 
                  type="text" 
                  className="w-full px-5 py-3 bg-slate-50 border-0 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-indigo-50 hover:bg-indigo-50 transition-all"
                  value={editForm.artist as string}
                  onChange={(e) => setEditForm(prev => ({ ...prev, artist: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Medium</label>
                <input 
                  type="text" 
                  className="w-full px-5 py-3 bg-slate-50 border-0 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-indigo-50 hover:bg-indigo-50 transition-all"
                  value={editForm.medium as string}
                  onChange={(e) => setEditForm(prev => ({ ...prev, medium: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dimensions</label>
                <input 
                  type="text" 
                  className="w-full px-5 py-3 bg-slate-50 border-0 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-indigo-50 hover:bg-indigo-50 transition-all"
                  value={editForm.dimensions as string}
                  onChange={(e) => setEditForm(prev => ({ ...prev, dimensions: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Year</label>
                <input 
                  type="text" 
                  className="w-full px-5 py-3 bg-slate-50 border-0 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-indigo-50 hover:bg-indigo-50 transition-all"
                  value={editForm.year as string}
                  onChange={(e) => setEditForm(prev => ({ ...prev, year: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Price</label>
                <input 
                  type="number" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  value={Number(editForm.price || 0)}
                  onChange={(e) => setEditForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location (Branch)</label>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  value={String(editForm.currentBranch)}
                  onChange={(e) => setEditForm(prev => ({ ...prev, currentBranch: e.target.value as Branch }))}
                >
                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Image URL</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  value={String(editForm.imageUrl || '')}
                  onChange={(e) => setEditForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Upload Image</label>
                <div className="flex items-center space-x-3">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
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
                          const out = isPng ? canvas.toDataURL(mime) : canvas.toDataURL(mime, 0.85);
                          resolve(out);
                        };
                        img.onerror = reject;
                        img.src = URL.createObjectURL(file);
                      });
                      setEditForm(prev => ({ ...prev, imageUrl: dataUrl }));
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                {editForm.imageUrl && (
                  <div className="mt-2">
                    <img src={String(editForm.imageUrl)} alt="Preview" className="w-full h-48 object-cover rounded-xl border border-slate-200" />
                  </div>
                )}
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Remarks</label>
                <textarea 
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none"
                  value={String(editForm.remarks || '')}
                  onChange={(e) => setEditForm(prev => ({ ...prev, remarks: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setModalMode('none')} className="px-6 py-2.5 rounded-2xl text-slate-600 font-bold hover:bg-slate-100 transition-all transform hover:-translate-y-0.5">Cancel</button>
              <button 
                onClick={() => { onEdit(editForm); setModalMode('none'); }} 
                className="px-8 py-2.5 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transform hover:-translate-y-0.5 transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </Modal>
      )}
      {modalMode === 'return' && (
        <Modal onClose={() => setModalMode('none')} title="Return Artwork to Artist">
          <div className="space-y-8 px-2">
            {/* Warning Banner */}
            <div className="relative overflow-hidden bg-rose-50/50 border border-rose-100 rounded-2xl p-5 group">
              <div className="absolute -right-4 -top-4 text-rose-100 opacity-50 group-hover:opacity-100 transition-opacity rotate-12">
                <AlertTriangle size={80} />
              </div>
              <div className="relative flex gap-4">
                <div className="shrink-0 w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-rose-500 ring-1 ring-rose-100">
                  <AlertTriangle size={20} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-rose-950 uppercase tracking-wide">Irreversible Action</h4>
                  <p className="text-xs text-rose-600/90 font-medium leading-relaxed max-w-md">
                    This artwork will be permanently removed from active inventory and archived in "Returned" status.
                    Sales history will be preserved, but this action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
               {/* Left Column: Details */}
               <div className="lg:col-span-7 space-y-6">
                <div className="group space-y-3">
                  <label className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-widest group-focus-within:text-rose-600 transition-colors">
                    Reason for Return <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <textarea 
                      className="w-full pl-5 pr-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-medium text-slate-700 focus:outline-none focus:bg-white focus:border-rose-100 focus:ring-4 focus:ring-rose-500/10 transition-all resize-none placeholder:text-slate-400/70"
                      rows={6}
                      placeholder="Describe the reason for return (e.g., Artist request, Contract expiration, Damaged...)"
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                    />
                    <div className="absolute bottom-4 right-4 text-[10px] font-bold text-slate-300">
                      {returnReason.length} chars
                    </div>
                  </div>
                </div>
                
                <div className="group space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest group-focus-within:text-indigo-600 transition-colors">Additional Notes</label>
                    <input 
                      type="text"
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-medium text-slate-700 focus:outline-none focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400/70"
                      placeholder="Any internal remarks or instructions..."
                      value={returnNotes}
                      onChange={(e) => setReturnNotes(e.target.value)}
                    />
                </div>
              </div>
              
              {/* Right Column: Documentation */}
              <div className="lg:col-span-5 space-y-6">
                  <div className="group space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest group-focus-within:text-indigo-600 transition-colors">IT / DR Reference No.</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <Tag size={16} />
                      </div>
                      <input 
                        type="text"
                        className="w-full pl-11 pr-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400/70 uppercase tracking-wider"
                        placeholder="IT-2024-001"
                        value={returnRefNumber}
                        onChange={(e) => setReturnRefNumber(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Proof of Return</label>
                    
                    {!returnProofImage ? (
                        <label className="block group cursor-pointer relative overflow-hidden">
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const maxW = 1200, maxH = 1200;
                                    const dataUrl = await new Promise<string>((resolve, reject) => {
                                        const img = new Image();
                                        img.onload = () => {
                                            const w = img.width, h = img.height;
                                            const scale = Math.min(maxW/w, maxH/h, 1);
                                            const canvas = document.createElement('canvas');
                                            canvas.width = Math.round(w * scale);
                                            canvas.height = Math.round(h * scale);
                                            const ctx = canvas.getContext('2d');
                                            if(!ctx) { reject('Canvas error'); return; }
                                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                                            resolve(canvas.toDataURL('image/jpeg', 0.8));
                                        };
                                        img.onerror = reject;
                                        img.src = URL.createObjectURL(file);
                                    });
                                    setReturnProofImage(dataUrl);
                                }}
                            />
                            <div className="flex flex-col items-center justify-center w-full aspect-[4/3] bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl transition-all group-hover:bg-white group-hover:border-indigo-300 group-hover:shadow-xl group-hover:shadow-indigo-500/10 group-hover:scale-[1.02]">
                                <div className="p-4 bg-white rounded-2xl shadow-sm mb-4 group-hover:shadow-md group-hover:bg-indigo-50 transition-all ring-1 ring-slate-100 group-hover:ring-indigo-100">
                                    <Upload size={24} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                </div>
                                <span className="text-sm font-bold text-slate-600 group-hover:text-indigo-700">Upload Proof</span>
                                <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide">JPG or PNG</span>
                            </div>
                        </label>
                    ) : (
                        <div className="relative group rounded-3xl overflow-hidden shadow-lg shadow-slate-200/50 ring-1 ring-slate-100 aspect-[4/3]">
                             <img src={returnProofImage} className="w-full h-full object-cover" alt="Proof" />
                             <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3">
                                <p className="text-white text-xs font-bold uppercase tracking-widest">Image Attached</p>
                                <button 
                                    onClick={() => setReturnProofImage('')}
                                    className="px-5 py-2 bg-white text-rose-600 rounded-xl text-xs font-bold shadow-lg hover:bg-rose-50 transition-colors flex items-center gap-2 transform hover:scale-105 active:scale-95"
                                >
                                    <Trash2 size={14} />
                                    Remove
                                </button>
                             </div>
                             <div className="absolute top-4 right-4 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-lg shadow-emerald-500/20">
                                Attached
                             </div>
                        </div>
                    )}
                  </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-8 border-t border-slate-100/50">
              <button 
                onClick={() => setModalMode('none')} 
                className="px-6 py-3 rounded-2xl text-slate-500 font-bold hover:bg-slate-50 hover:text-slate-800 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (onReturn && returnReason.trim()) {
                    onReturn(artwork.id, returnReason, returnRefNumber, returnProofImage, returnNotes);
                    setModalMode('none');
                  }
                }} 
                disabled={!returnReason.trim()}
                className="flex items-center gap-3 px-8 py-3 bg-rose-600 text-white rounded-2xl font-bold shadow-xl shadow-rose-200 hover:bg-rose-700 hover:shadow-rose-300 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              >
                <span>Confirm Return</span>
                <div className="w-px h-4 bg-white/20"></div>
                <RotateCcw size={18} />
              </button>
            </div>
          </div>
        </Modal>
      )}
      {modalMode === 'attach-unified' && (
        <Modal onClose={() => setModalMode('none')} title="Manage Attachments">
          <div className="space-y-6">
            <div className="flex p-1 bg-slate-100 rounded-xl">
              <button 
                onClick={() => { setActiveAttachmentTab('itdr'); setTempAttachmentUrl(artwork.itdrImageUrl || ''); }}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeAttachmentTab === 'itdr' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
              >
                IT/DR
              </button>
              <button 
                onClick={() => { setActiveAttachmentTab('rsa'); setTempAttachmentUrl(artwork.rsaImageUrl || ''); }}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeAttachmentTab === 'rsa' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
              >
                RSA / AR
              </button>
              <button 
                onClick={() => { setActiveAttachmentTab('orcr'); setTempAttachmentUrl(artwork.orCrImageUrl || ''); }}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeAttachmentTab === 'orcr' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
              >
                OR / CR
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {activeAttachmentTab === 'itdr' ? 'IT/DR Document' : activeAttachmentTab === 'rsa' ? 'RSA / AR Image' : 'OR / CR Image'}
                </label>
                <div className="flex items-center space-x-3">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      const isItdr = activeAttachmentTab === 'itdr';
                      const maxW = isItdr ? 1600 : 1200;
                      const maxH = isItdr ? 1600 : 1200;
                      
                      const dataUrl = await new Promise<string>((resolve, reject) => {
                        const img = new Image();
                        img.onload = () => {
                          const w = img.width;
                          const h = img.height;
                          const scale = Math.min(maxW / w, maxH / h, 1);
                          const canvas = document.createElement('canvas');
                          canvas.width = Math.round(w * scale);
                          canvas.height = Math.round(h * scale);
                          const ctx = canvas.getContext('2d');
                          if (!ctx) { reject(new Error('Canvas')); return; }
                          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                          
                          if (isItdr) {
                             const isPng = file.type === 'image/png';
                             const mime = isPng ? 'image/png' : 'image/jpeg';
                             resolve(isPng ? canvas.toDataURL(mime) : canvas.toDataURL(mime, 0.85));
                          } else {
                             resolve(canvas.toDataURL('image/jpeg', 0.8));
                          }
                        };
                        img.onerror = reject;
                        img.src = URL.createObjectURL(file);
                      });
                      setTempAttachmentUrl(dataUrl);
                    }}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                </div>
                {tempAttachmentUrl ? (
                   <img src={tempAttachmentUrl} alt="Preview" className="w-full h-48 object-cover rounded-xl mt-2 border border-slate-200" />
                ) : (
                   <div className="w-full h-48 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 text-sm">No image attached</div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3">
                <button onClick={() => setModalMode('none')} className="px-6 py-2.5 rounded-xl text-slate-600 font-medium">Cancel</button>
                <button 
                  onClick={() => { 
                    const update = activeAttachmentTab === 'itdr' ? { itdrImageUrl: tempAttachmentUrl } 
                                 : activeAttachmentTab === 'rsa' ? { rsaImageUrl: tempAttachmentUrl }
                                 : { orCrImageUrl: tempAttachmentUrl };
                    onEdit(update); 
                    setModalMode('none'); 
                  }} 
                  className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 disabled:opacity-50"
                >
                  Save {activeAttachmentTab.toUpperCase()}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
      {showItdrPreview && artwork.itdrImageUrl && (
        <Modal onClose={() => setShowItdrPreview(false)} title="IT/DR Document">
          <div className="space-y-4">
            <img src={artwork.itdrImageUrl} className="w-full max-h-[70vh] object-contain rounded-xl border border-slate-200" alt="IT/DR" />
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowItdrPreview(false)} className="px-6 py-2.5 rounded-2xl text-slate-600 font-bold hover:bg-slate-100 transition-all transform hover:-translate-y-0.5">Close</button>
              <button onClick={handlePrintItdr} className="px-8 py-2.5 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transform hover:-translate-y-0.5 transition-all">Print</button>
            </div>
          </div>
        </Modal>
      )}
      {showImagePreview && (
        <Modal onClose={() => setShowImagePreview(false)} title="Artwork Image">
          <div className="space-y-4">
            <img src={artwork.imageUrl} className="w-full max-h-[80vh] object-contain rounded-xl border border-slate-200" alt={artwork.title} />
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowImagePreview(false)} className="px-6 py-2.5 rounded-2xl text-slate-600 font-bold hover:bg-slate-100 transition-all transform hover:-translate-y-0.5">Close</button>
              <button onClick={() => {
                const w = window.open('', '_blank');
                if (!w) return;
                w.document.write(`<html><head><title>${artwork.title}</title></head><body style="margin:0"><img src="${artwork.imageUrl}" style="max-width:100%;height:auto;display:block"/></body></html>`);
                w.document.close();
                w.focus();
                w.onload = () => w.print();
              }} className="px-8 py-2.5 bg-slate-900 text-white rounded-2xl font-bold shadow-lg shadow-slate-200 hover:shadow-xl transform hover:-translate-y-0.5 transition-all">Print</button>
            </div>
          </div>
        </Modal>
      )}
      {modalMode === 'transfer' && (
        <Modal onClose={() => setModalMode('none')} title="Branch Transfer Authorization">
          <div className="space-y-6">
            <div className="flex items-center space-x-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <img src={artwork.imageUrl} className="w-16 h-16 rounded object-cover shadow-sm" alt="Thumbnail" />
              <div><p className="text-xs font-bold text-blue-600 uppercase">{artwork.code}</p><p className="text-sm font-bold text-slate-800">{artwork.title}</p></div>
            </div>
            <select className="w-full px-5 py-3 bg-slate-50 border-0 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-indigo-50 hover:bg-indigo-50 transition-all cursor-pointer" value={transferBranch} onChange={(e) => setTransferBranch(e.target.value as Branch)}>
                {branches.filter(b => b !== artwork.currentBranch).map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <div className="flex justify-end space-x-3"><button onClick={() => setModalMode('none')} className="px-6 py-2.5 rounded-2xl text-slate-600 font-bold hover:bg-slate-100 transition-all transform hover:-translate-y-0.5">Cancel</button><button onClick={() => { onTransfer(artwork.id, transferBranch); setModalMode('none'); }} className="px-8 py-2.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 hover:shadow-blue-300 transform hover:-translate-y-0.5 transition-all">Authorize Transfer</button></div>
          </div>
        </Modal>
      )}

      {modalMode === 'reserve' && (
        <Modal onClose={() => setModalMode('none')} title="Artwork Reservation Setup">
          <div className="space-y-6">
            <div className="flex p-1 bg-slate-100 rounded-xl">
              <button 
                onClick={() => setReserveType('Person')}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${reserveType === 'Person' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
              >
                Person
              </button>
              <button 
                onClick={() => setReserveType('Event')}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${reserveType === 'Event' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
              >
                Event
              </button>
            </div>

            <div className="space-y-4">
              {reserveType === 'Person' ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Name</label>
                  <input 
                    type="text" 
                    placeholder="Enter full name..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    value={reserveTarget}
                    onChange={(e) => setReserveTarget(e.target.value)}
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Exhibition</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    value={reserveTarget}
                    onChange={(e) => setReserveTarget(e.target.value)}
                  >
                    <option value="">Choose an event...</option>
                    {events.map(e => <option key={e.id} value={e.title}>{e.title}</option>)}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Purpose & Details</label>
                <textarea 
                  placeholder="Additional notes for reservation..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none"
                  value={reserveNotes}
                  onChange={(e) => setReserveNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button onClick={() => setModalMode('none')} className="px-6 py-2.5 rounded-xl text-slate-600 font-medium">Cancel</button>
              <button 
                onClick={handleReserve} 
                className="px-8 py-2.5 bg-yellow-500 text-white rounded-xl font-bold shadow-lg shadow-yellow-200 disabled:opacity-50"
              >
                Confirm Reservation
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modalMode === 'sale' && (
        <Modal onClose={() => setModalMode('none')} title="Sales Declaration Entry">
          <div className="space-y-6">
            <input type="text" placeholder="Full Client Name" className="w-full px-5 py-3 bg-slate-50 border-0 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-indigo-50 hover:bg-indigo-50 transition-all" value={clientName} onChange={(e) => setClientName(e.target.value)} />
            <div className="flex justify-end space-x-3"><button onClick={() => setModalMode('none')} className="px-6 py-2.5 rounded-2xl text-slate-600 font-bold hover:bg-slate-100 transition-all transform hover:-translate-y-0.5">Cancel</button><button onClick={() => { if (clientName) onSale(artwork.id, clientName); setModalMode('none'); }} className="px-8 py-2.5 bg-amber-500 text-white rounded-2xl font-bold shadow-lg shadow-amber-200 hover:shadow-amber-300 transform hover:-translate-y-0.5 transition-all" disabled={!clientName}>Confirm Sale</button></div>
          </div>
        </Modal>
      )}

      {modalMode === 'certificate' && sale && <CertificateModal artwork={artwork} sale={sale} onClose={() => setModalMode('none')} />}





      {showRsaPreview && (
        <Modal onClose={() => setShowRsaPreview(false)} title="RSA / AR Preview">
          <div className="space-y-4">
             <img src={artwork.rsaImageUrl} alt="RSA/AR" className="w-full h-auto rounded-xl" />
             <div className="flex justify-end space-x-3">
               <button onClick={() => setShowRsaPreview(false)} className="px-6 py-2.5 rounded-xl text-slate-600 font-medium">Close</button>
               <button onClick={handlePrintRsa} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200">Print</button>
             </div>
          </div>
        </Modal>
      )}

      {showOrCrPreview && (
        <Modal onClose={() => setShowOrCrPreview(false)} title="OR / CR Preview">
          <div className="space-y-4">
             <img src={artwork.orCrImageUrl} alt="OR/CR" className="w-full h-auto rounded-xl" />
             <div className="flex justify-end space-x-3">
               <button onClick={() => setShowOrCrPreview(false)} className="px-6 py-2.5 rounded-xl text-slate-600 font-medium">Close</button>
               <button onClick={handlePrintOrCr} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200">Print</button>
             </div>
          </div>
        </Modal>
      )}

      {selectedLog && (
        <Modal onClose={() => setSelectedLog(null)} title="Activity Log Details">
          <div className="space-y-4">
             <div className="bg-slate-50 p-4 rounded-xl space-y-3">
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</p>
                  <p className="text-sm font-bold text-slate-800">{selectedLog.action}</p>
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</p>
                  <p className="text-sm font-medium text-slate-700">{new Date(selectedLog.timestamp).toLocaleString()}</p>
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized By</p>
                  <p className="text-sm font-medium text-slate-700">{selectedLog.user}</p>
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Log ID</p>
                  <p className="text-xs font-mono text-slate-500">{selectedLog.id}</p>
               </div>
             </div>
             
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Full Details</p>
                <div className="p-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {selectedLog.details || 'No additional details recorded.'}
                </div>
             </div>

             <div className="flex justify-end">
               <button onClick={() => setSelectedLog(null)} className="px-6 py-2.5 rounded-xl text-slate-600 font-medium bg-slate-100 hover:bg-slate-200 transition-all">Close</button>
             </div>
          </div>
        </Modal>
      )}
    </div>

  );
};

const ActionButton: React.FC<{ label: string, icon: React.ReactNode, variant?: string, disabled?: boolean, onClick: () => void }> = ({ label, icon, variant, disabled, onClick }) => {
  const styles = {
    default: 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-200',
    amber: 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200',
    yellow: 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-yellow-100',
    indigo: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200',
    emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200',
    rose: 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-200',
  };
  const activeStyle = variant ? styles[variant as keyof typeof styles] : styles.default;
  return (
    <button disabled={disabled} onClick={onClick} className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl font-bold text-sm transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-30 disabled:cursor-not-allowed ${activeStyle}`}>
      <div className="flex items-center space-x-3">{icon}<span>{label}</span></div>
      <svg className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
    </button>
  );
};

const Modal: React.FC<{ children: React.ReactNode, onClose: () => void, title: string }> = ({ children, onClose, title }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
      <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white"><h3 className="text-lg font-bold text-slate-800">{title}</h3><button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XCircle /></button></div>
      <div className="p-8">{children}</div>
    </div>
  </div>
);

const StatusBadge: React.FC<{ status: ArtworkStatus }> = ({ status }) => {
  const styles = {
    [ArtworkStatus.AVAILABLE]: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    [ArtworkStatus.RESERVED]: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    [ArtworkStatus.SOLD]: 'bg-rose-100 text-rose-700 border-rose-200',
    [ArtworkStatus.DELIVERED]: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    [ArtworkStatus.CANCELLED]: 'bg-slate-200 text-slate-700 border-slate-300',
  };
  return <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border shadow-sm ${styles[status]}`}>{status}</span>;
};

export default MasterView;
