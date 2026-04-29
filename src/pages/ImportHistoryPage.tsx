import React, { useState, useRef, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { ImportRecord, Artwork, UserPermissions } from '../types';
import { Search, FileSpreadsheet, Clock, Download, CheckCircle, AlertCircle, HelpCircle, Shield, ShieldAlert, Trash2, X, CheckSquare, Square, Copy, RefreshCw, FileText, Image as ImageIcon, ArrowRightLeft, ChevronRight } from 'lucide-react';
import { OptimizedImage } from '../components/OptimizedImage';

interface ImportHistoryPageProps {
  logs: ImportRecord[];
  preventDuplicates: boolean;
  onTogglePreventDuplicates: (val: boolean) => void;
  onDeleteLogs: (ids: string[]) => void;
  artworks: Artwork[];
  onViewArtwork: (artwork: Artwork) => void;
  userPermissions?: UserPermissions;
}

const ImportHistoryPage: React.FC<ImportHistoryPageProps> = ({ logs, preventDuplicates, onTogglePreventDuplicates, onDeleteLogs, artworks, onViewArtwork, userPermissions }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
  const [analyzingLog, setAnalyzingLog] = useState<ImportRecord | null>(null);
  const [comparingLogs, setComparingLogs] = useState<[ImportRecord, ImportRecord] | null>(null);
  const [analysisTab, setAnalysisTab] = useState<'imported' | 'repeating' | 'failed'>('imported');
  const printRef = useRef<HTMLDivElement>(null);

  const permittedArtworks = useMemo(() => {
    return artworks.filter(art => {
      // Permission Checks
      const permissions = userPermissions || {
        canViewReserved: true,
        canViewSalesHistory: true,
        canViewExhibit: true,
        canViewForFraming: true,
        canViewBackToArtist: true,
        canViewAuctioned: true,
        canAddArtwork: true,
        canEditArtwork: true,
        canManageAccounts: true,
        canManageEvents: true,
        canAccessCertificate: true,
        canAttachITDR: true,
        canDeleteArtwork: true,
        canSellArtwork: true,
        canReserveArtwork: true,
        canTransferArtwork: true
      };

      const canViewReserved = permissions.canViewReserved;
      const canViewAuctioned = permissions.canViewAuctioned;
      const canViewExhibit = permissions.canViewExhibit;

      // Check specific statuses
      if (art.status === 'Reserved' && !canViewReserved) return false;
      if (art.status === 'Sold' && !permissions.canViewSalesHistory) return false;
      if (art.status === 'For Framing' && !permissions.canViewForFraming) return false;
      if (art.status === 'For Retouch' && !permissions.canViewBackToArtist) return false; // Assuming Retouch is related to BackToArtist or similar? 
      // Actually Retouch/Artist Reclaim are 'Return' types.
      // Let's check ReturnToArtistView usage. It uses canViewBackToArtist.
      // And status might be 'For Retouch' or just implicitly returned.
      // But ImportHistory just shows status.

      // Standard Remark Checks for Reservations
      const remarks = art.remarks || '';
      const isAuction = remarks.includes('[Reserved For Auction:');
      const isEvent = remarks.includes('[Reserved For Event:');

      if (isAuction && !canViewAuctioned) return false;
      if (isEvent && !canViewExhibit) return false;

      return true;
    });
  }, [artworks, userPermissions]);

  const filteredLogs = logs.filter(log => {
    return (
      log.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.importedBy.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const toggleSelectAll = () => {
    if (selectedLogs.size === filteredLogs.length && filteredLogs.length > 0) {
      setSelectedLogs(new Set());
    } else {
      setSelectedLogs(new Set(filteredLogs.map(l => l.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedLogs);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedLogs(newSelected);
  };

  const handleExportPDF = async () => {
    if (!printRef.current) return;

    try {
      const html2canvas = (await import('html2canvas')).default;

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Import_History_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF', err);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleExportImage = async () => {
    if (!printRef.current) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: '#ffffff'
      });

      const link = document.createElement('a');
      link.download = `Import_History_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to export image', err);
      alert('Failed to generate image. Please try again.');
    }
  };

  const exportImportLogs = (logsToExport = filteredLogs) => {
    const headers = ['Timestamp', 'Filename', 'Imported By', 'Record Count', 'Status', 'Details'];
    const rows = logsToExport.map(log => {
      return [
        log.timestamp,
        `"${log.filename}"`,
        `"${log.importedBy}"`,
        log.recordCount,
        log.status,
        `"${(log.details || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ArtisFlow_ImportHistory_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getLogArtworks = (log: ImportRecord, type: 'imported' | 'updated') => {
    const updatedIds = log.updatedIds || [];
    const allImportedIds = log.importedIds || [];

    if (type === 'updated') {
      if (!updatedIds.length) return [];
      return artworks.filter(a => updatedIds.includes(a.id));
    } else {
      // For 'imported', we show ONLY the new items (exclude updated/repeating ones)
      const newIds = allImportedIds.filter(id => !updatedIds.includes(id));
      if (!newIds.length) return [];
      return artworks.filter(a => newIds.includes(a.id));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {analyzingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-md w-full max-w-5xl h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-neutral-100 flex items-start justify-between bg-neutral-50/50">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 bg-neutral-100 rounded-sm">
                    <FileSpreadsheet className="text-neutral-700" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-neutral-900">{analyzingLog.filename}</h2>
                    <p className="text-sm text-neutral-500 font-medium flex items-center gap-2">
                      <span>Imported by {analyzingLog.importedBy}</span>
                      <span>•</span>
                      <span>{new Date(analyzingLog.timestamp).toLocaleString()}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <span className={`px-2.5 py-1 rounded-sm text-[10px] font-black uppercase tracking-tighter border flex w-fit items-center gap-1 ${analyzingLog.status === 'Success' ? 'bg-neutral-900 text-white border-neutral-900' :
                      analyzingLog.status === 'Partial' ? 'bg-neutral-100 text-neutral-700 border-neutral-200' :
                        'bg-white text-neutral-500 border-neutral-200'
                    }`}>
                    {analyzingLog.status === 'Success' && <CheckCircle size={10} />}
                    {analyzingLog.status === 'Partial' && <HelpCircle size={10} />}
                    {analyzingLog.status === 'Failed' && <AlertCircle size={10} />}
                    {analyzingLog.status}
                  </span>
                  <span className="text-xs font-bold text-neutral-400">•</span>
                  <span className="text-xs font-bold text-neutral-600">{analyzingLog.recordCount} records processed</span>
                  {analyzingLog.updatedIds && analyzingLog.updatedIds.length > 0 && (
                    <>
                      <span className="text-xs font-bold text-neutral-400">•</span>
                      <span className="text-xs font-bold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-sm border border-neutral-200">
                        {analyzingLog.updatedIds.length} repeated
                      </span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => setAnalyzingLog(null)}
                className="p-2 hover:bg-neutral-200 rounded-sm transition-colors text-neutral-400 hover:text-neutral-600"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="px-8 border-b border-neutral-100 flex items-center space-x-8 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setAnalysisTab('imported')}
                className={`py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${analysisTab === 'imported'
                    ? 'border-neutral-900 text-neutral-900'
                    : 'border-transparent text-neutral-400 hover:text-neutral-600'
                  }`}
              >
                <CheckCircle size={16} />
                New Paintings ({
                  (analyzingLog.importedIds?.length || 0) - (analyzingLog.updatedIds?.length || 0)
                })
              </button>
              <button
                onClick={() => setAnalysisTab('repeating')}
                className={`py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${analysisTab === 'repeating'
                    ? 'border-neutral-900 text-neutral-900'
                    : 'border-transparent text-neutral-400 hover:text-neutral-600'
                  }`}
              >
                <RefreshCw size={16} />
                Repeating Paintings ({analyzingLog.updatedIds?.length || 0})
              </button>
              <button
                onClick={() => setAnalysisTab('failed')}
                className={`py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${analysisTab === 'failed'
                    ? 'border-neutral-900 text-neutral-900'
                    : 'border-transparent text-neutral-400 hover:text-neutral-600'
                  }`}
              >
                <ShieldAlert size={16} />
                Failed Items ({analyzingLog.failedItems?.length || 0})
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-neutral-50/30">
              {(() => {
                if (analysisTab === 'failed') {
                  const failedItems = analyzingLog.failedItems || [];
                  if (failedItems.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center h-64 text-center">
                        <div className="w-16 h-16 bg-neutral-100 rounded-sm flex items-center justify-center text-neutral-300 mb-4">
                          <Shield size={32} />
                        </div>
                        <p className="text-neutral-500 font-bold">No failed items found.</p>
                        <p className="text-xs text-neutral-400 mt-1 max-w-xs">
                          Everything in this file was processed successfully!
                        </p>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-3">
                      {failedItems.map((item, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-md border border-rose-100 shadow-sm flex flex-col md:flex-row gap-4 hover:shadow-md transition-shadow">
                          <div className="flex flex-col items-center justify-center w-16 h-16 bg-rose-50 text-rose-600 rounded-sm flex-shrink-0 border border-rose-100">
                            <span className="text-[10px] uppercase font-bold text-rose-400">Row</span>
                            <span className="text-xl font-black">{item.rowNumber}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-neutral-900 text-sm flex items-center gap-2 mb-1">
                              <AlertCircle size={14} className="text-rose-500" />
                              Import Failed
                            </h4>
                            <p className="text-sm text-neutral-600 font-medium mb-3">{item.reason}</p>

                            {/* Try to show meaningful data if available */}
                            {(item.data?.title || item.data?.code || item.data?.artist) && (
                              <div className="flex flex-wrap gap-2 text-xs text-neutral-700 font-bold px-1 mb-2">
                                {item.data.title && <span>Title: {item.data.title}</span>}
                                {item.data.code && <span>Code: {item.data.code}</span>}
                                {item.data.artist && <span>Artist: {item.data.artist}</span>}
                              </div>
                            )}

                            <div className="bg-neutral-50 rounded-sm border border-neutral-100 overflow-hidden">
                              <div className="px-3 py-2 bg-neutral-100/50 border-b border-neutral-100 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                                Raw Data
                              </div>
                              <div className="p-3 text-xs font-mono text-neutral-600 overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(item.data, null, 2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }

                const artworksToShow = getLogArtworks(analyzingLog, analysisTab === 'imported' ? 'imported' : 'updated');

                if (artworksToShow.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                      <div className="w-16 h-16 bg-neutral-100 rounded-sm flex items-center justify-center text-neutral-300 mb-4">
                        {analysisTab === 'imported' ? <FileSpreadsheet size={32} /> : <Copy size={32} />}
                      </div>
                      <p className="text-neutral-500 font-bold">No {analysisTab === 'imported' ? 'imported' : 'repeating'} artworks found for this log.</p>
                      <p className="text-xs text-neutral-400 mt-1 max-w-xs">
                        {analysisTab === 'repeating'
                          ? 'Great! No duplicates were found during this import.'
                          : 'This might be an older import log without detailed tracking.'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {artworksToShow.map(art => (
                      <div
                        key={art.id}
                        onClick={() => onViewArtwork(art)}
                        className={`group bg-white p-4 rounded-md border transition-all cursor-pointer hover:shadow-md ${analysisTab === 'repeating'
                            ? 'border-neutral-300 hover:border-neutral-400 shadow-sm'
                            : 'border-neutral-200 hover:border-neutral-300'
                          }`}
                      >
                        <div className="flex gap-4">
                          <div className="w-20 h-20 rounded-md bg-neutral-100 overflow-hidden flex-shrink-0 relative">
                            {art.imageUrl ? (
                              <OptimizedImage src={art.imageUrl || undefined} alt={art.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-300">
                                <FileSpreadsheet size={24} />
                              </div>
                            )}
                            {analysisTab === 'repeating' && (
                              <div className="absolute top-1 right-1 w-5 h-5 bg-neutral-900 text-white rounded-sm flex items-center justify-center shadow-sm">
                                <RefreshCw size={10} strokeWidth={3} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-neutral-900 truncate group-hover:text-neutral-900 transition-colors">
                              {art.title}
                            </h4>
                            <p className="text-xs text-neutral-500 truncate mb-1">{art.artist}</p>
                            <div className="flex flex-col gap-1 mt-2">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${art.status === 'Available' ? 'bg-neutral-900 text-white' :
                                    art.status === 'Sold' ? 'bg-neutral-200 text-neutral-700' :
                                      'bg-neutral-100 text-neutral-500'
                                  }`}>
                                  {art.status}
                                </span>
                                <span className="text-xs font-bold text-neutral-700">
                                  {art.price.toLocaleString()} {art.currency}
                                </span>
                              </div>
                              <span className="text-[10px] text-neutral-400 font-medium flex items-center gap-1">
                                <Clock size={10} />
                                Added {new Date(art.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        {analysisTab === 'repeating' && (
                          <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center gap-2">
                            <AlertCircle size={12} className="text-neutral-500" />
                            <p className="text-[10px] font-bold text-neutral-500">
                              Merged with existing record
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {comparingLogs && (() => {
        const [oldLog, newLog] = comparingLogs;
        const oldIds = oldLog.importedIds || [];
        const newIds = newLog.importedIds || [];

        // Calculate diffs
        const addedIds = newIds.filter(id => !oldIds.includes(id));
        const repeatedIds = newIds.filter(id => oldIds.includes(id));

        const addedArtworks = permittedArtworks.filter(a => addedIds.includes(a.id));
        const repeatedArtworks = permittedArtworks.filter(a => repeatedIds.includes(a.id));

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-md w-full max-w-7xl max-h-[90vh] h-full md:h-auto shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="px-6 py-4 md:px-8 md:py-6 border-b border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-50/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-neutral-500 text-xs font-bold uppercase tracking-widest mb-2">
                    <ArrowRightLeft size={14} />
                    <span>Import Comparison</span>
                  </div>
                  <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
                    <div className="flex flex-col min-w-0 flex-1 md:flex-none md:max-w-[250px]">
                      <span className="text-xs md:text-sm font-bold text-neutral-400 whitespace-nowrap">{new Date(oldLog.timestamp).toLocaleDateString()}</span>
                      <div className="group relative">
                        <span className="font-bold text-neutral-700 truncate block text-sm md:text-base">{oldLog.filename}</span>
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-neutral-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50">
                          {oldLog.filename}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="text-neutral-300 flex-shrink-0" />
                    <div className="flex flex-col min-w-0 flex-1 md:flex-none md:max-w-[250px]">
                      <span className="text-xs md:text-sm font-bold text-neutral-400 whitespace-nowrap">{new Date(newLog.timestamp).toLocaleDateString()}</span>
                      <div className="group relative">
                        <span className="font-black text-neutral-900 truncate block text-sm md:text-base">{newLog.filename}</span>
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-neutral-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50">
                          {newLog.filename}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setComparingLogs(null)}
                  className="self-end md:self-center p-2 hover:bg-neutral-200 rounded-full transition-colors text-neutral-400 hover:text-neutral-600"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Comparison Content */}
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* Added Column */}
                <div className="flex-1 flex flex-col border-r border-neutral-100 bg-green-50/10">
                  <div className="px-6 py-4 border-b border-neutral-100 bg-white sticky top-0 z-10 flex items-center justify-between">
                    <h3 className="font-bold text-green-700 flex items-center gap-2">
                      <CheckCircle size={18} />
                      Added in New File ({addedArtworks.length})
                    </h3>
                  </div>
                  <div className="p-6 overflow-y-auto flex-1 space-y-3">
                    {addedArtworks.length === 0 ? (
                      <div className="text-center py-12 text-neutral-400">
                        <p>No new artworks added.</p>
                      </div>
                    ) : (
                      addedArtworks.map(art => (
                        <div key={art.id} onClick={() => onViewArtwork(art)} className="bg-white p-3 rounded-md border border-green-100 hover:border-green-300 shadow-sm cursor-pointer transition-all flex gap-3 group">
                          <div className="w-12 h-12 rounded-sm bg-neutral-100 overflow-hidden flex-shrink-0">
                            {art.imageUrl ? (
                              <img src={art.imageUrl} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-300"><ImageIcon size={16} /></div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-neutral-900 truncate text-sm">{art.title}</h4>
                            <p className="text-xs text-neutral-500 truncate">{art.artist}</p>
                            <p className="text-xs font-bold text-neutral-900 mt-1">₱{art.price.toLocaleString()}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Repeated Column */}
                <div className="flex-1 flex flex-col bg-neutral-50/30">
                  <div className="px-6 py-4 border-b border-neutral-100 bg-white sticky top-0 z-10 flex items-center justify-between">
                    <h3 className="font-bold text-neutral-600 flex items-center gap-2">
                      <RefreshCw size={18} />
                      Repeated (Common) ({repeatedArtworks.length})
                    </h3>
                  </div>
                  <div className="p-6 overflow-y-auto flex-1 space-y-3">
                    {repeatedArtworks.length === 0 ? (
                      <div className="text-center py-12 text-neutral-400">
                        <p>No repeated artworks found.</p>
                      </div>
                    ) : (
                      repeatedArtworks.map(art => (
                        <div key={art.id} onClick={() => onViewArtwork(art)} className="bg-white p-3 rounded-md border border-neutral-200 hover:border-neutral-300 shadow-sm cursor-pointer transition-all flex gap-3 opacity-75 hover:opacity-100">
                          <div className="w-12 h-12 rounded-sm bg-neutral-100 overflow-hidden flex-shrink-0">
                            {art.imageUrl ? (
                              <img src={art.imageUrl} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-300"><ImageIcon size={16} /></div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-neutral-900 truncate text-sm">{art.title}</h4>
                            <p className="text-xs text-neutral-500 truncate">{art.artist}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-bold text-neutral-900">₱{art.price.toLocaleString()}</span>
                              <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-500 text-[10px] rounded font-bold">{art.status}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 min-h-[88px]">
          <>
            <div>
              <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Import History</h1>
              <p className="text-sm text-neutral-500">Track all Excel/CSV file imports and their status.</p>
            </div>

            <div className="flex items-center space-x-3">
              <div
                onClick={() => onTogglePreventDuplicates(!preventDuplicates)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-md border cursor-pointer transition-all select-none shadow-sm hover:shadow-md transform hover:-translate-y-0.5 ${preventDuplicates
                    ? 'bg-neutral-100 border-neutral-300 text-neutral-900'
                    : 'bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50'
                  }`}
              >
                {preventDuplicates ? <Shield size={18} /> : <ShieldAlert size={18} />}
                <span className="text-sm font-bold">
                  {preventDuplicates ? 'Duplicates Blocked' : 'Allow Duplicates'}
                </span>
                <div className={`w-8 h-4 rounded-sm relative transition-colors ml-2 ${preventDuplicates ? 'bg-neutral-900' : 'bg-neutral-300'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-sm transition-transform ${preventDuplicates ? 'left-[18px]' : 'left-0.5'}`} />
                </div>
              </div>

              <div className="relative w-full md:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by filename or user..."
                  className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-200 rounded-md text-sm focus:ring-2 focus:ring-neutral-500/20 outline-none shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportImportLogs()}
                  className="flex items-center justify-center w-10 h-10 bg-white border border-neutral-200 text-neutral-700 rounded-md hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-400 transition-all shadow-sm hover:shadow-md"
                  title="Export as CSV"
                >
                  <Download size={18} />
                </button>
                <button
                  onClick={handleExportPDF}
                  className="flex items-center justify-center w-10 h-10 bg-white border border-neutral-200 text-neutral-700 rounded-md hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-400 transition-all shadow-sm hover:shadow-md"
                  title="Export as PDF"
                >
                  <FileText size={18} />
                </button>
                <button
                  onClick={handleExportImage}
                  className="flex items-center justify-center w-10 h-10 bg-white border border-neutral-200 text-neutral-700 rounded-md hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-400 transition-all shadow-sm hover:shadow-md"
                  title="Export as Image"
                >
                  <ImageIcon size={18} />
                </button>
              </div>
            </div>
          </>
      </div>

      {/* Floating Bottom Action Bar */}
      {selectedLogs.size > 0 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-lg text-neutral-900 pl-6 pr-4 py-3 rounded-md shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex items-center gap-5 z-40 animate-in slide-in-from-bottom-8 fade-in duration-300 border border-neutral-200/60 max-w-[90vw]">
          <div className="flex flex-col justify-center">
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1.5">Selection</span>
            <span className="font-bold text-base leading-none">{selectedLogs.size} Logs</span>
          </div>
          <div className="h-7 w-px bg-neutral-200/60 mx-1"></div>
          {selectedLogs.size === 2 && (
            <button
              onClick={() => {
                const selected = logs.filter(l => selectedLogs.has(l.id));
                if (selected.length === 2) {
                  const sorted = selected.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                  setComparingLogs([sorted[0], sorted[1]]);
                }
              }}
              className="bg-neutral-50 hover:bg-neutral-100 text-neutral-900 border border-neutral-200/60 px-5 py-2.5 rounded-md text-sm font-bold transition-all shadow-sm transform active:scale-95 flex items-center gap-2"
            >
              <ArrowRightLeft size={14} />
              <span>Compare</span>
            </button>
          )}
          <button
            onClick={() => {
              const logsToExport = logs.filter(l => selectedLogs.has(l.id));
              exportImportLogs(logsToExport);
            }}
            className="bg-neutral-50 hover:bg-neutral-100 text-neutral-900 border border-neutral-200/60 px-5 py-2.5 rounded-md text-sm font-bold transition-all shadow-sm transform active:scale-95 flex items-center gap-2"
          >
            <Download size={14} />
            <span>Export</span>
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Delete ${selectedLogs.size} logs? This action cannot be undone.`)) {
                onDeleteLogs(Array.from(selectedLogs));
                setSelectedLogs(new Set());
              }
            }}
            className="bg-neutral-50 hover:bg-neutral-100 text-neutral-900 border border-neutral-200/60 px-5 py-2.5 rounded-md text-sm font-bold transition-all shadow-sm transform active:scale-95 flex items-center gap-2"
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
          <button
            onClick={() => setSelectedLogs(new Set())}
            className="p-1.5 hover:bg-neutral-100 rounded-sm text-neutral-400 hover:text-neutral-700 transition-colors ml-1"
            title="Clear Selection"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div ref={printRef} className="bg-white rounded-md border border-neutral-200 shadow-sm overflow-hidden p-6 overflow-x-auto custom-scrollbar">
        <div className="">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-100">
                <th className="pl-6 py-4 w-12 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                  <button onClick={toggleSelectAll} className="hover:text-neutral-900 transition-colors">
                    {selectedLogs.size > 0 && selectedLogs.size === filteredLogs.length ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Timestamp</th>
                <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Filename</th>
                <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Imported By</th>
                <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Records</th>
                <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Details</th>
                <th className="pr-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => setAnalyzingLog(log)}
                  className={`group transition-colors cursor-pointer ${selectedLogs.has(log.id) ? 'bg-neutral-50' : 'hover:bg-neutral-50/50'
                    }`}
                >
                  <td className="pl-6 py-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelect(log.id); }}
                      className={`transition-colors ${selectedLogs.has(log.id) ? 'text-neutral-900' : 'text-neutral-300 group-hover:text-neutral-500'}`}
                    >
                      {selectedLogs.has(log.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2 text-neutral-600 font-bold text-sm">
                      <Clock size={14} className="text-neutral-400" />
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <FileSpreadsheet size={16} className="text-neutral-400" />
                      <span className="font-bold text-neutral-900">{log.filename}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-bold bg-neutral-100 text-neutral-600">
                      {log.importedBy}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-neutral-600">
                    {log.recordCount}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-sm text-xs font-black uppercase tracking-tight border ${log.status === 'Success' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                        log.status === 'Partial' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                          'bg-rose-100 text-rose-800 border-rose-200'
                      }`}>
                      {log.status === 'Success' && <CheckCircle size={12} />}
                      {log.status === 'Partial' && <HelpCircle size={12} />}
                      {log.status === 'Failed' && <AlertCircle size={12} />}
                      <span>{log.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 max-w-xs truncate text-neutral-500 text-sm font-medium" title={log.details}>
                    {log.details || '-'}
                  </td>
                  <td className="pr-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setAnalyzingLog(log); }}
                        className="p-2 bg-white border border-neutral-200 text-neutral-600 rounded-md hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-300 transition-all shadow-sm"
                        title="Analyze Import"
                      >
                        <Search size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Delete this import log?')) {
                            onDeleteLogs([log.id]);
                          }
                        }}
                        className="p-2 bg-white border border-neutral-200 text-neutral-400 rounded-md hover:bg-neutral-100 hover:text-neutral-900 hover:border-neutral-300 transition-all shadow-sm"
                        title="Delete Log"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-4 bg-neutral-50 rounded-sm">
                        <Search size={24} className="text-neutral-300" />
                      </div>
                      <p className="font-bold text-neutral-500">No import logs found</p>
                      <p className="text-sm">Try adjusting your search terms</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ImportHistoryPage;
