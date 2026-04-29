import React, { useState, useMemo } from 'react';
import { SaleRecord, Artwork, ArtworkStatus, SaleStatus, UserPermissions } from '../types';
import { ICONS } from '../constants';
import { X, Clock } from 'lucide-react';
import CertificateModal from '../components/CertificateModal';
import { OptimizedImage } from '../components/OptimizedImage';
import { createPortal } from 'react-dom';
import { useActionProcessing } from '../hooks/useActionProcessing';
import LoadingOverlay from '../components/LoadingOverlay';

const SaleDetailModal = ({ 
  sale, 
  artwork, 
  onClose 
}: { 
  sale: SaleRecord, 
  artwork: Artwork, 
  onClose: () => void 
}) => {
  if (!sale || !artwork) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-md shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-100 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-black text-neutral-900">Sale Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-sm transition-colors">
            <X size={20} className="text-neutral-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
            {/* Artwork Info */}
            <div className="flex gap-4">
                <div className="w-24 h-24 bg-neutral-100 rounded-sm overflow-hidden flex-shrink-0 border border-neutral-200">
                    <OptimizedImage
                        src={artwork.imageUrl || undefined}
                        alt={artwork.title}
                        className="w-full h-full object-cover"
                    />
                </div>
                <div>
                    <h3 className="font-bold text-neutral-900 leading-tight">{artwork.title}</h3>
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mt-1">{artwork.code}</p>
                    <p className="text-sm text-neutral-600 mt-1">{artwork.artist}</p>
                    <div className="flex gap-2 mt-2">
                         {sale.isCancelled ? (
                            <span className="px-2 py-0.5 bg-neutral-100 text-neutral-500 rounded-md text-[10px] font-bold uppercase">Cancelled</span>
                          ) : sale.isDelivered ? (
                            <span className="px-2 py-0.5 bg-neutral-200 text-neutral-900 rounded-md text-[10px] font-bold uppercase">Delivered</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md text-[10px] font-bold uppercase">In Transit</span>
                          )}
                    </div>
                </div>
            </div>

            {/* Financials */}
            <div className="bg-neutral-50 rounded-md p-4 space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-neutral-500 uppercase">Sale Price</span>
                    <span className="font-black text-neutral-900">₱{artwork.price.toLocaleString()}</span>
                </div>
                {sale.downpayment && (
                    <>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-neutral-500">Downpayment</span>
                        <span className="font-bold text-red-600">- ₱{sale.downpayment.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-neutral-200 my-2"></div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-neutral-500 uppercase">Balance</span>
                        <span className="font-black text-neutral-900">₱{(artwork.price - sale.downpayment).toLocaleString()}</span>
                    </div>
                    </>
                )}
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <span className="block text-[10px] font-bold text-neutral-400 uppercase">Client</span>
                    <span className="font-medium text-neutral-900 truncate" title={sale.clientName}>{sale.clientName}</span>
                </div>
                <div>
                    <span className="block text-[10px] font-bold text-neutral-400 uppercase">Agent</span>
                    <span className="font-medium text-neutral-900 truncate" title={sale.agentName}>{sale.agentName}</span>
                </div>
                <div>
                    <span className="block text-[10px] font-bold text-neutral-400 uppercase">Branch</span>
                    <span className="font-medium text-neutral-900 truncate">{artwork.currentBranch || sale.artworkSnapshot?.currentBranch || '-'}</span>
                </div>
                <div>
                    <span className="block text-[10px] font-bold text-neutral-400 uppercase">Date</span>
                    <span className="font-medium text-neutral-900">{new Date(sale.saleDate).toLocaleDateString()}</span>
                </div>
            </div>
            
            {/* Attachments */}
             {(sale.itdrUrl?.length || sale.rsaUrl?.length || sale.orCrUrl?.length) && (
                <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Attachments</h4>
                    <div className="flex flex-wrap gap-2">
                        {sale.itdrUrl?.map((url, idx) => (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-white border border-neutral-200 rounded-sm text-xs font-bold text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 transition-colors">
                                <span>ITDR {sale.itdrUrl!.length > 1 ? idx + 1 : ''}</span>
                            </a>
                        ))}
                         {sale.rsaUrl?.map((url, idx) => (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-white border border-neutral-200 rounded-sm text-xs font-bold text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 transition-colors">
                                <span>RSA / AR {sale.rsaUrl!.length > 1 ? idx + 1 : ''}</span>
                            </a>
                        ))}
                         {sale.orCrUrl?.map((url, idx) => (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-white border border-neutral-200 rounded-sm text-xs font-bold text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 transition-colors">
                                <span>OR / CR {sale.orCrUrl!.length > 1 ? idx + 1 : ''}</span>
                            </a>
                        ))}
                    </div>
                </div>
             )}
        </div>

      </div>
    </div>
  );
};

interface SalesRecordPageProps {
  sales: SaleRecord[];
  artworks: Artwork[];
  onBulkDelete?: (ids: string[]) => void;
  canExport?: boolean;
  canDelete?: boolean;
  onCancelSale?: (id: string) => void;
  initialSaleId?: string | null;
  onClearInitialSaleId?: () => void;
  onViewArtwork?: (id: string) => void;
  userPermissions?: UserPermissions;
}

const SalesRecordPage: React.FC<SalesRecordPageProps> = ({ 
  sales, 
  artworks, 
  onBulkDelete, 
  canExport = true, 
  canDelete = true, 
  onCancelSale,
  initialSaleId,
  onClearInitialSaleId,
  onViewArtwork,
  userPermissions
}) => {
  const [selectedSalePair, setSelectedSalePair] = useState<{art: Artwork, sale: SaleRecord} | null>(null);
  const [selectedSaleDetailPair, setSelectedSaleDetailPair] = useState<{art: Artwork, sale: SaleRecord} | null>(null);
  const { isProcessing, processMessage, processProgress, wrapAction } = useActionProcessing({ itemTitle: 'Sales Records', itemCode: 'REC' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Filter Artworks based on Permissions
  const filteredArtworks = useMemo(() => {
    return artworks.filter(artwork => {
      const canViewReserved = userPermissions?.canViewReserved ?? true;
      const canViewAuctioned = userPermissions?.canViewAuctioned ?? true;
      const canViewExhibit = userPermissions?.canViewExhibit ?? true;
      const canViewForFraming = userPermissions?.canViewForFraming ?? true;
      const canViewBackToArtist = userPermissions?.canViewBackToArtist ?? true;

      if (artwork.status === ArtworkStatus.RESERVED) {
        const isAuction = (artwork.remarks || '').includes('[Reserved For Auction:');
        const isEvent = (artwork.remarks || '').includes('[Reserved For Event:');

        if (isAuction) {
          if (!canViewAuctioned) return false;
        } else if (isEvent) {
          if (!canViewExhibit) return false;
        } else {
          if (!canViewReserved) return false;
        }
      } else if (artwork.status === ArtworkStatus.FOR_FRAMING) {
        if (!canViewForFraming) return false;
      } else if (artwork.status === ArtworkStatus.FOR_RETOUCH) {
        if (!canViewBackToArtist) return false;
      }
      return true;
    });
  }, [artworks, userPermissions]);

  // Effect to handle initial sale selection (deep link / post-sale redirect)
  React.useEffect(() => {
    if (initialSaleId) {
        const sale = sales.find(s => s.id === initialSaleId);
        if (sale) {
            const art = filteredArtworks.find(a => a.id === sale.artworkId);
              
              // Check if artwork exists in raw list but is filtered out (permission denied)
              const isRestricted = !art && artworks.find(a => a.id === sale.artworkId);
              
              if (isRestricted) {
                return;
              }

              const displayArt = art || (sale.artworkSnapshot ? {
                id: sale.artworkId,
                status: ArtworkStatus.SOLD,
                sheetName: 'Unknown',
                createdAt: sale.saleDate,
                ...sale.artworkSnapshot
              } as Artwork : undefined);
            
            if (displayArt) {
                setSelectedSaleDetailPair({ art: displayArt, sale });
                onClearInitialSaleId?.();
            }
        }
    }
  }, [initialSaleId, sales, filteredArtworks]);
  
  // Filters
  const [showRecentOnly, setShowRecentOnly] = useState(true);
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [artistFilter, setArtistFilter] = useState<string>('All');
  const [clientFilter, setClientFilter] = useState<string>('All');
  const [yearFilter, setYearFilter] = useState<string>('All');
  const [monthFilter, setMonthFilter] = useState<string>('All');
  const [mediumFilter, setMediumFilter] = useState<string>('All');
  const [sizeFilter, setSizeFilter] = useState<string>('');

  // 1. Synthesize Virtual Sales from Imported/Existing Artworks that are SOLD/DELIVERED but missing in sales log
  const allSales = useMemo(() => {
    const validSales = sales.filter(s => s.status !== SaleStatus.FOR_SALE_APPROVAL);
    const existingSaleArtworkIds = new Set(validSales.map(s => s.artworkId));
    
    const virtualSales = Array.from(
      new Map(
        filteredArtworks
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
      })
      .map(sale => [sale.id, sale] as const)
      ).values()
    );

    return [...validSales, ...virtualSales].sort((a, b) => {
      const dateA = new Date(a.saleDate).getTime();
      const dateB = new Date(b.saleDate).getTime();
      return dateB - dateA;
    });
  }, [sales, filteredArtworks]);

  // 2. Compute Available Options for Filters
  const { availableBranches, availableArtists, availableClients, availableYears, availableMediums } = useMemo(() => {
    const branches = new Set<string>();
    const artists = new Set<string>();
    const clients = new Set<string>();
    const years = new Set<string>();
    const mediums = new Set<string>();

    allSales.forEach(sale => {
      const art = filteredArtworks.find(a => a.id === sale.artworkId) || (sale.artworkSnapshot as Artwork);
      if (art?.currentBranch) branches.add(art.currentBranch);
      if (art?.artist) artists.add(art.artist);
      if (art?.medium) mediums.add(art.medium);
      if (sale.clientName) clients.add(sale.clientName);
      
      const date = new Date(sale.saleDate);
      if (!isNaN(date.getTime())) {
        years.add(date.getFullYear().toString());
      }
    });

    return {
      availableBranches: Array.from(branches).sort(),
      availableArtists: Array.from(artists).sort(),
      availableClients: Array.from(clients).sort(),
      availableYears: Array.from(years).sort((a, b) => b.localeCompare(a)), // Descending
      availableMediums: Array.from(mediums).sort()
    };
  }, [allSales, filteredArtworks]);

  const filteredSales = useMemo(() => {
    const result = allSales.filter(sale => {
      // Check for permission restriction first
      const rawArt = artworks.find(a => a.id === sale.artworkId);
      const permittedArt = filteredArtworks.find(a => a.id === sale.artworkId);
      
      // If artwork exists in database but is hidden by permissions, do not show the sale
      if (rawArt && !permittedArt) {
        return false;
      }

      const art = permittedArt || (sale.artworkSnapshot as Artwork);
      
      // Branch Filter
      if (branchFilter !== 'All' && art?.currentBranch !== branchFilter) return false;

      // Artist Filter
      if (artistFilter !== 'All' && art?.artist !== artistFilter) return false;

      // Client Filter
      if (clientFilter !== 'All' && sale.clientName !== clientFilter) return false;

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

    // Sort based on showRecentOnly (True = Newest First, False = Oldest First)
    if (!showRecentOnly) {
      return result.reverse();
    }
    return result;
  }, [allSales, filteredArtworks, branchFilter, artistFilter, clientFilter, yearFilter, monthFilter, mediumFilter, sizeFilter, showRecentOnly]);
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const selectAll = () => {
    if (selectedIds.length === filteredSales.length) setSelectedIds([]);
    else setSelectedIds(filteredSales.map(s => s.id));
  };

  const exportSales = () => {
    const headers = ['Sale ID', 'Artwork Code', 'Title', 'Client', 'Agent', 'Branch', 'Sale Date', 'Price', 'Downpayment', 'Remaining Balance', 'Delivery Status'];
    const rows = sales.map(sale => {
      const art = filteredArtworks.find(a => a.id === sale.artworkId);
      const snapshot = sale.artworkSnapshot;
      
      const title = art?.title || snapshot?.title || 'Unknown';
      const safeTitle = `"${title.replace(/"/g, '""')}"`;
      
      const safeClient = `"${sale.clientName.replace(/"/g, '""')}"`;
      
      const branch = art?.currentBranch || snapshot?.currentBranch || 'Unknown';
      const code = art?.code || snapshot?.code || 'N/A';
      const price = art?.price || snapshot?.price || 0;
      const downpayment = sale.downpayment || 0;
      const balance = price - downpayment;

      return [
        sale.id,
        code,
        safeTitle,
        safeClient,
        sale.agentName,
        branch,
        sale.saleDate,
        price,
        downpayment,
        balance,
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
          <h1 className="text-2xl font-bold text-neutral-900">Sales Ledger</h1>
          <p className="text-sm text-neutral-500">Historical records of all finalized artwork sales.</p>
        </div>
        {canExport && (
          <button 
            onClick={exportSales}
            className="flex items-center space-x-2 bg-white border border-neutral-200 text-neutral-700 px-6 py-3 rounded-md hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-400 transition-all shadow-md hover:shadow-lg font-bold group transform hover:-translate-y-0.5"
          >
            <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            <span>Export CSV</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 w-full animate-in fade-in slide-in-from-top-4 duration-500">
          {/* Recently Sold Toggle */}
          <button
            onClick={() => setShowRecentOnly(!showRecentOnly)}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-bold transition-all ${
              showRecentOnly 
                ? 'bg-neutral-200 text-neutral-900 shadow-sm border border-neutral-300' 
                : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:shadow-md'
            }`}
            title="Toggle Recently Sold"
          >
            <Clock size={16} />
            <span>Recently Sold</span>
          </button>

          {/* Branch Filter */}
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="w-full bg-white border border-neutral-200 rounded-md px-4 py-3 text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:border-neutral-500 hover:shadow-md transition-all cursor-pointer appearance-none"
            title="Filter by Branch"
          >
            <option value="All">All Branches</option>
            {availableBranches.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          {/* Artist Filter */}
          <select
            value={artistFilter}
            onChange={(e) => setArtistFilter(e.target.value)}
            className="w-full bg-white border border-neutral-200 rounded-md px-4 py-3 text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:border-neutral-500 hover:shadow-md transition-all cursor-pointer appearance-none"
            title="Filter by Artist"
          >
            <option value="All">All Artists</option>
            {availableArtists.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* Client Filter */}
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="w-full bg-white border border-neutral-200 rounded-md px-4 py-3 text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:border-neutral-500 hover:shadow-md transition-all cursor-pointer appearance-none"
            title="Filter by Client"
          >
            <option value="All">All Clients</option>
            {availableClients.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Medium Filter */}
          <select
            value={mediumFilter}
            onChange={(e) => setMediumFilter(e.target.value)}
            className="w-full bg-white border border-neutral-200 rounded-md px-4 py-3 text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:border-neutral-500 hover:shadow-md transition-all cursor-pointer appearance-none"
            title="Filter by Medium"
          >
            <option value="All">All Mediums</option>
            {availableMediums.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {/* Year Filter */}
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="w-full bg-white border border-neutral-200 rounded-md px-4 py-3 text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:border-neutral-500 hover:shadow-md transition-all cursor-pointer appearance-none"
            title="Filter by Year"
          >
            <option value="All">All Years</option>
            {availableYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Month Filter */}
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="w-full bg-white border border-neutral-200 rounded-md px-4 py-3 text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:border-neutral-500 hover:shadow-md transition-all cursor-pointer appearance-none"
            title="Filter by Month"
          >
            <option value="All">All Months</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m.toString()}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>

          {/* Size Filter with Clear Button */}
          <div className="relative w-full">
            <input
              type="text"
              value={sizeFilter}
              onChange={(e) => setSizeFilter(e.target.value)}
              placeholder="Size (e.g. 24x36)"
              className="w-full bg-white border border-neutral-200 rounded-md px-4 py-3 text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:border-neutral-500 hover:shadow-md transition-all pr-10"
            />
            {(branchFilter !== 'All' || artistFilter !== 'All' || clientFilter !== 'All' || mediumFilter !== 'All' || yearFilter !== 'All' || monthFilter !== 'All' || sizeFilter !== '') && (
              <button
                  onClick={() => {
                      setBranchFilter('All');
                      setArtistFilter('All');
                      setClientFilter('All');
                      setMediumFilter('All');
                      setYearFilter('All');
                      setMonthFilter('All');
                      setSizeFilter('');
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-neutral-500 hover:bg-neutral-100 rounded-lg transition-colors"
                  title="Clear All Filters"
              >
                  <X size={16} />
              </button>
            )}
          </div>
      </div>
    </div>

      <div className="bg-white rounded-md border border-neutral-200 shadow-sm overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-100">
              <th className="px-6 py-4">
                {canDelete && <input type="checkbox" checked={selectedIds.length === filteredSales.length && filteredSales.length > 0} onChange={selectAll} />}
              </th>
              <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Artwork</th>
              <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Client</th>
              <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Branch</th>
              <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Agent</th>
              <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Date</th>
              <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Value</th>
              <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center">Certificate</th>
              <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredSales.map((sale) => {
              const art = filteredArtworks.find(a => a.id === sale.artworkId);
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
                  className="hover:bg-neutral-50 transition-colors group cursor-pointer"
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
                    <div 
                      className={`flex items-center space-x-3 ${displayArt && onViewArtwork ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (displayArt && onViewArtwork) {
                          onViewArtwork(displayArt.id);
                        }
                      }}
                    >
                      <OptimizedImage
                        src={displayArt?.imageUrl || undefined}
                        className="w-10 h-10 rounded-sm object-cover"
                        alt="Thumb"
                      />
                      <div>
                        <p className="text-sm font-bold text-neutral-900 line-clamp-1">{displayArt?.title || 'Unknown Artwork'}</p>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">{displayArt?.code || 'N/A'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-neutral-700">{sale.clientName}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-neutral-600">{displayArt?.currentBranch || '-'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-1.5">
                      <div className="w-5 h-5 rounded-sm bg-neutral-200 flex items-center justify-center text-[8px] font-bold">{sale.agentName[0]}</div>
                      <p className="text-xs text-neutral-600 font-medium">{sale.agentName}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-neutral-600 tabular-nums">{new Date(sale.saleDate).toLocaleDateString()}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm font-black text-neutral-900">₱{(displayArt?.price || 0).toLocaleString()}</p>
                    {sale.downpayment && (
                      <div className="mt-1 flex flex-col items-end space-y-0.5">
                        <span className="text-[10px] text-red-600 font-bold">
                          Down: ₱{sale.downpayment.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-bold">
                          Bal: ₱{((displayArt?.price || 0) - sale.downpayment).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => displayArt && setSelectedSalePair({art: displayArt, sale})}
                      className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-sm hover:shadow-md transition-all"
                      title="Generate Certificate"
                      disabled={!displayArt}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    {sale.isCancelled ? (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-neutral-100 text-neutral-500 rounded-md text-[10px] font-bold uppercase">
                        <span className="w-1.5 h-1.5 bg-neutral-400 rounded-sm"></span>
                        <span>Cancelled</span>
                      </span>
                    ) : sale.isDelivered ? (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-neutral-200 text-neutral-900 border border-neutral-300 rounded-md text-[10px] font-bold uppercase">
                        <span className="w-1.5 h-1.5 bg-neutral-50 rounded-sm"></span>
                        <span>Delivered</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-md text-[10px] font-bold uppercase tracking-tight">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-sm animate-pulse"></span>
                        <span>Awaiting Transit</span>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden">
          <div className="divide-y divide-neutral-100">
            {filteredSales.map((sale) => {
              const art = filteredArtworks.find(a => a.id === sale.artworkId);
              const displayArt = art || (sale.artworkSnapshot ? {
                id: sale.artworkId,
                status: ArtworkStatus.SOLD,
                sheetName: 'Unknown',
                createdAt: sale.saleDate,
                ...sale.artworkSnapshot
              } as Artwork : undefined);

              return (
                <div 
                  key={sale.id}
                  className="p-4 hover:bg-neutral-50 transition-colors cursor-pointer"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('button')) return;
                    if (displayArt) setSelectedSaleDetailPair({art: displayArt, sale});
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    {canDelete && (
                      <div className="pt-1">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(sale.id)} 
                          onChange={() => toggleSelect(sale.id)} 
                          className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                        />
                      </div>
                    )}
                    
                    {/* Image */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                      <OptimizedImage
                        src={displayArt?.imageUrl || undefined}
                        className="w-full h-full object-cover"
                        alt="Thumb"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-bold text-neutral-900 line-clamp-2">{displayArt?.title || 'Unknown Artwork'}</p>
                          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">{displayArt?.code || 'N/A'}</p>
                        </div>
                        {sale.isCancelled ? (
                          <span className="inline-flex items-center px-2 py-0.5 bg-neutral-100 text-neutral-500 rounded-md text-[10px] font-bold uppercase">
                            Cancelled
                          </span>
                        ) : sale.isDelivered ? (
                          <span className="inline-flex items-center px-2 py-0.5 bg-neutral-200 text-neutral-900 border border-neutral-300 rounded-md text-[10px] font-bold uppercase">
                            Delivered
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md text-[10px] font-bold uppercase tracking-tight">
                            Transit
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-neutral-400 font-bold uppercase block">Client</span>
                          <span className="font-medium text-neutral-700 truncate block">{sale.clientName}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-neutral-400 font-bold uppercase block">Value</span>
                          <span className="font-black text-neutral-900">₱{(displayArt?.price || 0).toLocaleString()}</span>
                        </div>
                      </div>

                      {sale.downpayment && (
                        <div className="flex justify-between items-center bg-neutral-50 p-2 rounded-md">
                          <div className="text-[10px]">
                            <span className="text-neutral-400 font-bold uppercase block">Down</span>
                            <span className="font-bold text-red-600">₱{sale.downpayment.toLocaleString()}</span>
                          </div>
                          <div className="text-[10px] text-right">
                            <span className="text-neutral-400 font-bold uppercase block">Balance</span>
                            <span className="font-bold text-neutral-700">₱{((displayArt?.price || 0) - sale.downpayment).toLocaleString()}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                        <div className="flex items-center space-x-1.5">
                          <div className="w-4 h-4 rounded-sm bg-neutral-200 flex items-center justify-center text-[8px] font-bold">{sale.agentName[0]}</div>
                          <p className="text-[10px] text-neutral-600 font-medium">{sale.agentName}</p>
                          <span className="text-[10px] text-neutral-400">•</span>
                          <span className="text-[10px] text-neutral-600 font-medium tabular-nums">{new Date(sale.saleDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] text-neutral-400">{displayArt?.currentBranch || '-'}</span>
                           <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                displayArt && setSelectedSalePair({art: displayArt, sale});
                              }}
                              className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-all"
                              title="Generate Certificate"
                              disabled={!displayArt}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {sales.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-neutral-400 font-medium italic">No sales recorded yet.</p>
          </div>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-lg text-neutral-900 pl-6 pr-4 py-3 rounded-md shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex items-center gap-5 z-40 animate-in slide-in-from-bottom-8 fade-in duration-300 border border-neutral-200/60 max-w-[90vw]">
          <div className="flex flex-col justify-center">
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1.5">Selection</span>
            <span className="font-bold text-base leading-none">{selectedIds.length} Sales</span>
          </div>
          <div className="h-7 w-px bg-neutral-200/60 mx-1"></div>
          <button 
            onClick={() => wrapAction(async () => {
              if (onBulkDelete) {
                await Promise.resolve(onBulkDelete(selectedIds));
                setSelectedIds([]);
              }
            }, 'Synchronizing Sale Record Deletions...')}
            className="bg-neutral-50 hover:bg-neutral-100 text-neutral-900 border border-neutral-200/60 px-6 py-2.5 rounded-md text-sm font-bold transition-all shadow-sm transform active:scale-95 flex items-center gap-2"
          >
            <span>Delete Selected</span>
          </button>
          <button 
            onClick={() => setSelectedIds([])}
            className="p-1.5 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-700 transition-colors ml-1"
            title="Clear Selection"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {selectedSaleDetailPair && (
        <SaleDetailModal 
          artwork={selectedSaleDetailPair.art} 
          sale={selectedSaleDetailPair.sale} 
          onClose={() => setSelectedSaleDetailPair(null)} 
        />
      )}

      {selectedSalePair && (
        <CertificateModal 
          artwork={selectedSalePair.art} 
          sale={selectedSalePair.sale} 
          onClose={() => setSelectedSalePair(null)} 
        />
      )}

      {createPortal(
        <LoadingOverlay
          isVisible={isProcessing}
          title={processMessage}
          progress={{ current: processProgress, total: 100 }}
        />,
        document.body
      )}
    </div>
  );
};

export default SalesRecordPage;
