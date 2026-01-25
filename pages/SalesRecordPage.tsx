
import React, { useState, useMemo } from 'react';
import { SaleRecord, Artwork, ArtworkStatus } from '../types';
import { ICONS } from '../constants';
import { X } from 'lucide-react';
import CertificateModal from '../components/CertificateModal';
import SaleDetailModal from '../components/SaleDetailModal';

interface SalesRecordPageProps {
  sales: SaleRecord[];
  artworks: Artwork[];
  onBulkDelete?: (ids: string[]) => void;
  canExport?: boolean;
  canDelete?: boolean;
  onCancelSale?: (id: string) => void;
}

const SalesRecordPage: React.FC<SalesRecordPageProps> = ({ sales, artworks, onBulkDelete, canExport = true, canDelete = true, onCancelSale }) => {
  const [selectedSalePair, setSelectedSalePair] = useState<{art: Artwork, sale: SaleRecord} | null>(null);
  const [selectedSaleDetailPair, setSelectedSaleDetailPair] = useState<{art: Artwork, sale: SaleRecord} | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Filters
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [artistFilter, setArtistFilter] = useState<string>('All');
  const [yearFilter, setYearFilter] = useState<string>('All');
  const [monthFilter, setMonthFilter] = useState<string>('All');
  const [mediumFilter, setMediumFilter] = useState<string>('All');
  const [sizeFilter, setSizeFilter] = useState<string>('');

  // 1. Synthesize Virtual Sales from Imported/Existing Artworks that are SOLD/DELIVERED but missing in sales log
  const allSales = useMemo(() => {
    const existingSaleArtworkIds = new Set(sales.map(s => s.artworkId));
    
    const virtualSales = artworks
      .filter(a => (a.status === 'Sold' || a.status === 'Delivered') && !existingSaleArtworkIds.has(a.id))
      .map(a => {
        // Attempt to extract client name from remarks if available
        const soldToMatch = a.remarks?.match(/\[Sold To: (.*?)\]/);
        const clientName = soldToMatch ? soldToMatch[1] : 'Imported Client';

        return {
          id: `virtual-${a.id}`,
          artworkId: a.id,
          clientName: clientName,
          agentName: 'System Import',
          saleDate: a.createdAt, // Best effort date
          isDelivered: a.status === 'Delivered',
          deliveryDate: a.status === 'Delivered' ? a.createdAt : undefined,
          artworkSnapshot: {
               title: a.title,
               artist: a.artist,
               code: a.code,
               imageUrl: a.imageUrl,
               price: a.price,
               currentBranch: a.currentBranch,
               medium: a.medium,
               dimensions: a.dimensions,
               year: a.year
          }
        } as SaleRecord;
      });

    return [...sales, ...virtualSales];
  }, [sales, artworks]);

  // 2. Compute Available Options for Filters
  const { availableBranches, availableArtists, availableYears, availableMediums } = useMemo(() => {
    const branches = new Set<string>();
    const artists = new Set<string>();
    const years = new Set<string>();
    const mediums = new Set<string>();

    allSales.forEach(sale => {
      const art = artworks.find(a => a.id === sale.artworkId) || (sale.artworkSnapshot as Artwork);
      if (art?.currentBranch) branches.add(art.currentBranch);
      if (art?.artist) artists.add(art.artist);
      if (art?.medium) mediums.add(art.medium);
      
      const date = new Date(sale.saleDate);
      if (!isNaN(date.getTime())) {
        years.add(date.getFullYear().toString());
      }
    });

    return {
      availableBranches: Array.from(branches).sort(),
      availableArtists: Array.from(artists).sort(),
      availableYears: Array.from(years).sort((a, b) => b.localeCompare(a)), // Descending
      availableMediums: Array.from(mediums).sort()
    };
  }, [allSales, artworks]);

  const filteredSales = useMemo(() => {
    return allSales.filter(sale => {
      const art = artworks.find(a => a.id === sale.artworkId) || (sale.artworkSnapshot as Artwork);
      
      // Branch Filter
      if (branchFilter !== 'All' && art?.currentBranch !== branchFilter) return false;

      // Artist Filter
      if (artistFilter !== 'All' && art?.artist !== artistFilter) return false;

      // Medium Filter
      if (mediumFilter !== 'All' && art?.medium !== mediumFilter) return false;

      // Size Filter (Text Search)
      if (sizeFilter) {
        const sizeStr = art?.dimensions || '';
        if (!sizeStr.toLowerCase().includes(sizeFilter.toLowerCase())) return false;
      }

      // Date Filters
      const saleDate = new Date(sale.saleDate);
      if (yearFilter !== 'All' && saleDate.getFullYear().toString() !== yearFilter) return false;
      if (monthFilter !== 'All' && (saleDate.getMonth() + 1).toString() !== monthFilter) return false;

      return true;
    });
  }, [allSales, artworks, branchFilter, artistFilter, yearFilter, monthFilter, mediumFilter, sizeFilter]);
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const selectAll = () => {
    if (selectedIds.length === filteredSales.length) setSelectedIds([]);
    else setSelectedIds(filteredSales.map(s => s.id));
  };

  const exportSales = () => {
    const headers = ['Sale ID', 'Artwork Code', 'Title', 'Client', 'Agent', 'Branch', 'Sale Date', 'Price', 'Delivery Status'];
    const rows = sales.map(sale => {
      const art = artworks.find(a => a.id === sale.artworkId);
      const snapshot = sale.artworkSnapshot;
      
      const title = art?.title || snapshot?.title || 'Unknown';
      const safeTitle = `"${title.replace(/"/g, '""')}"`;
      
      const safeClient = `"${sale.clientName.replace(/"/g, '""')}"`;
      
      const branch = art?.currentBranch || snapshot?.currentBranch || 'Unknown';
      const code = art?.code || snapshot?.code || 'N/A';
      const price = art?.price || snapshot?.price || 0;

      return [
        sale.id,
        code,
        safeTitle,
        safeClient,
        sale.agentName,
        branch,
        sale.saleDate,
        price,
        sale.isDelivered ? 'Delivered' : 'Awaiting Delivery'
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ArtisFlow_SalesHistory_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sales Ledger</h1>
          <p className="text-sm text-slate-500">Historical records of all finalized artwork sales.</p>
        </div>
        {canExport && (
          <button 
            onClick={exportSales}
            className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-md hover:shadow-lg font-bold group transform hover:-translate-y-0.5"
          >
            <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            <span>Export CSV</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap gap-4 items-end">
          {/* Branch Filter */}
          <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 ml-1">Branch</label>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-w-[140px]"
              >
                <option value="All">All Branches</option>
                {availableBranches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
          </div>

          {/* Artist Filter */}
          <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 ml-1">Artist</label>
              <select
                value={artistFilter}
                onChange={(e) => setArtistFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-w-[140px]"
              >
                <option value="All">All Artists</option>
                {availableArtists.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
          </div>

          {/* Medium Filter */}
          <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 ml-1">Medium</label>
              <select
                value={mediumFilter}
                onChange={(e) => setMediumFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-w-[140px]"
              >
                <option value="All">All Mediums</option>
                {availableMediums.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
          </div>

          {/* Year Filter */}
          <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 ml-1">Year</label>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-w-[100px]"
              >
                <option value="All">All Years</option>
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
          </div>

          {/* Month Filter */}
          <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 ml-1">Month</label>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-w-[120px]"
              >
                <option value="All">All Months</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m.toString()}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                ))}
              </select>
          </div>

          {/* Size Filter */}
          <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 ml-1">Size</label>
              <input
                type="text"
                value={sizeFilter}
                onChange={(e) => setSizeFilter(e.target.value)}
                placeholder="e.g. 24x36"
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-[120px]"
              />
          </div>
          
          {/* Clear Filters Button */}
          {(branchFilter !== 'All' || artistFilter !== 'All' || mediumFilter !== 'All' || yearFilter !== 'All' || monthFilter !== 'All' || sizeFilter !== '') && (
              <button
                  onClick={() => {
                      setBranchFilter('All');
                      setArtistFilter('All');
                      setMediumFilter('All');
                      setYearFilter('All');
                      setMonthFilter('All');
                      setSizeFilter('');
                  }}
                  className="px-3 py-2 text-xs font-bold text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors mb-[1px]"
              >
                  Clear All
              </button>
          )}
      </div>
    </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-4">
                {canDelete && <input type="checkbox" checked={selectedIds.length === filteredSales.length && filteredSales.length > 0} onChange={selectAll} />}
              </th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Artwork</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Client</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Branch</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Agent</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Value</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Certificate</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSales.map((sale) => {
              const art = artworks.find(a => a.id === sale.artworkId);
              // Fallback to snapshot if artwork is deleted
              const displayArt = art || (sale.artworkSnapshot ? {
                id: sale.artworkId,
                status: ArtworkStatus.SOLD,
                sheetName: 'Unknown',
                createdAt: sale.saleDate,
                ...sale.artworkSnapshot
              } as Artwork : undefined);

              return (
                <tr 
                  key={sale.id} 
                  className="hover:bg-slate-50 transition-colors group cursor-pointer"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('button')) return;
                    if (displayArt) setSelectedSaleDetailPair({art: displayArt, sale});
                  }}
                >
                  <td className="px-6 py-4">
                    {canDelete && (
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(sale.id)} 
                        onChange={() => toggleSelect(sale.id)} 
                      />
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <img src={displayArt?.imageUrl} className="w-10 h-10 rounded object-cover" alt="Thumb" />
                      <div>
                        <p className="text-sm font-bold text-slate-800 line-clamp-1">{displayArt?.title || 'Unknown Artwork'}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{displayArt?.code || 'N/A'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-slate-700">{sale.clientName}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-slate-600">{displayArt?.currentBranch || '-'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-1.5">
                      <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold">{sale.agentName[0]}</div>
                      <p className="text-xs text-slate-600 font-medium">{sale.agentName}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm font-black text-slate-900">₱{displayArt?.price.toLocaleString() || '0'}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => displayArt && setSelectedSalePair({art: displayArt, sale})}
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl hover:shadow-md transition-all"
                      title="Generate Certificate"
                      disabled={!displayArt}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    {sale.isCancelled ? (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-bold uppercase">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                        <span>Cancelled</span>
                      </span>
                    ) : sale.isDelivered ? (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                        <span>Delivered</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-tight">
                        <span>Awaiting Transit</span>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {sales.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-slate-400 font-medium italic">No sales recorded yet.</p>
          </div>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-40 animate-in slide-in-from-bottom-6 fade-in duration-300 border border-slate-700/50 backdrop-blur-sm bg-slate-900/95 max-w-[90vw]">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Selection</span>
            <span className="font-bold text-lg">{selectedIds.length} Sales</span>
          </div>
          <div className="h-8 w-px bg-slate-700"></div>
          <button 
            onClick={() => { if (onBulkDelete) onBulkDelete(selectedIds); setSelectedIds([]); }}
            className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-rose-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
          >
            <span>Delete Selected</span>
          </button>
          <button 
            onClick={() => setSelectedIds([])}
            className="p-2 hover:bg-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all hover:shadow-md"
            title="Clear Selection"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {selectedSalePair && (
        <CertificateModal 
          artwork={selectedSalePair.art} 
          sale={selectedSalePair.sale} 
          onClose={() => setSelectedSalePair(null)} 
        />
      )}

      {selectedSaleDetailPair && (
        <SaleDetailModal 
          artwork={selectedSaleDetailPair.art} 
          sale={selectedSaleDetailPair.sale} 
          onClose={() => setSelectedSaleDetailPair(null)} 
          onCancelSale={onCancelSale}
        />
      )}
    </div>
  );
};

export default SalesRecordPage;
