import React, { useState, useMemo } from 'react';
import { Artwork, SaleRecord, ArtworkStatus, ActivityLog } from '../types';
import { Calendar, Search, Filter, Download, DollarSign, Package, TrendingUp } from 'lucide-react';
import { utils, writeFile } from 'xlsx';

interface TimeMachinePageProps {
  artworks: Artwork[];
  sales: SaleRecord[];
  logs: ActivityLog[];
  onViewArtwork?: (id: string) => void;
}

const TimeMachinePage: React.FC<TimeMachinePageProps> = ({ artworks, sales, logs, onViewArtwork }) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('All');

  // Helper: Extract effective year-month for filtering (Matches Inventory.tsx logic)
  const getArtYearMonth = (art: Artwork): { y: number; m: number } => {
    // 1. Prioritize Import Period (User selected batch) - "Global Feature"
    if (art.importPeriod) {
      const parts = art.importPeriod.split('-');
      return { y: parseInt(parts[0], 10), m: parseInt(parts[1], 10) };
    }

    // 2. Check for explicit full date in 'year' specifically (Prioritize Excel date)
    if (art.year) {
      const yearDateMatch = String(art.year).match(/^(\d{4})[-\/](\d{1,2})/);
      if (yearDateMatch) {
          return { y: parseInt(yearDateMatch[1], 10), m: parseInt(yearDateMatch[2], 10) };
      }
      // Check for Year only in art.year (Prioritize Excel Year over Import Date)
      const yearOnlyMatch = String(art.year).match(/^(\d{4})$/);
      if (yearOnlyMatch) {
          return { y: parseInt(yearOnlyMatch[1], 10), m: 1 }; // Default to Jan
      }
    }

    // 3. Check createdAt if it exists
    const base = art.createdAt || '';
    const dateMatch = base.match(/^(\d{4})[-\/](\d{1,2})/);
    if (dateMatch) {
        return { y: parseInt(dateMatch[1], 10), m: parseInt(dateMatch[2], 10) };
    }

    // 4. Fallback: Parse Year only or current
    const d = new Date(base);
    if (!isNaN(d.getTime())) {
      return { y: d.getFullYear(), m: d.getMonth() + 1 };
    }
    const yonly = base.match(/^(\d{4})$/);
    if (yonly) return { y: parseInt(yonly[1], 10), m: 1 };
    
    return { y: new Date().getFullYear(), m: new Date().getMonth() + 1 };
  };

  const currentYear = new Date().getFullYear();
  const earliestYear = 1970;

  const selectedYear = useMemo(() => parseInt(selectedDate.split('-')[0], 10), [selectedDate]);
  const selectedMonth = useMemo(() => parseInt(selectedDate.split('-')[1], 10), [selectedDate]);
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Calculate the end of the selected month
  const endOfMonth = useMemo(() => {
    const [year, month] = selectedDate.split('-').map(Number);
    return new Date(year, month, 0, 23, 59, 59, 999).toISOString();
  }, [selectedDate]);

  const startOfMonth = useMemo(() => {
    const [year, month] = selectedDate.split('-').map(Number);
    return new Date(year, month - 1, 1, 0, 0, 0, 0).toISOString();
  }, [selectedDate]);

  const availableBranches = useMemo(() => {
    const set = new Set(artworks.map(a => a.currentBranch).filter(Boolean));
    return Array.from(set).sort();
  }, [artworks]);

  // Reconstruct Unified State
  const unifiedData = useMemo(() => {
    // 1. Filter artworks based on Inventory Logic (Strict Month/Year Match)
    const existedArtworks = artworks.filter(art => {
      const { y, m } = getArtYearMonth(art);
      return y === selectedYear && m === selectedMonth;
    });

    // 2. Determine status and sale details for each artwork
    return existedArtworks.map(art => {
      // Check for sales
      const sale = sales.find(s => s.artworkId === art.id && !s.isCancelled);
      
      let historicalStatus = art.status; 
      let saleDetails = undefined;
      let isMonthlySale = false;

      // Priority 1: Sale Record exists (Definitive Sold Proof)
      if (sale) {
         historicalStatus = ArtworkStatus.SOLD;
         saleDetails = {
           price: sale.amount,
           date: sale.saleDate,
           client: sale.clientName
         };
         isMonthlySale = sale.saleDate >= startOfMonth && sale.saleDate <= endOfMonth;
      } 
      // Priority 2: Static Status (Imported as Sold)
      else if (art.status === ArtworkStatus.SOLD || art.status === ArtworkStatus.DELIVERED) {
          historicalStatus = ArtworkStatus.SOLD;
          // Try to infer sale date from creation/year if possible
          const inferredDate = art.year && art.year.match(/^\d{4}-\d{2}-\d{2}/) ? art.year : art.createdAt;
          
          saleDetails = {
              price: art.price,
              date: inferredDate, 
              client: 'Imported/External'
          };
          isMonthlySale = inferredDate >= startOfMonth && inferredDate <= endOfMonth;
      } else {
          historicalStatus = ArtworkStatus.AVAILABLE;
      }

      return {
        ...art,
        status: historicalStatus,
        saleDetails: saleDetails ? { ...saleDetails, isMonthlySale } : undefined
      };
    });
  }, [artworks, sales, selectedYear, selectedMonth, endOfMonth, startOfMonth]);

  const filteredData = useMemo(() => {
    return unifiedData.filter(art => {
      const matchesSearch = art.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           art.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           art.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (art.saleDetails?.clientName || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBranch = branchFilter === 'All' || art.currentBranch === branchFilter;
      return matchesSearch && matchesBranch;
    });
  }, [unifiedData, searchTerm, branchFilter]);

  // Stats
  const stats = useMemo(() => {
    const soldCount = unifiedData.filter(a => a.status === ArtworkStatus.SOLD).length;
    const availableCount = unifiedData.filter(a => a.status === ArtworkStatus.AVAILABLE).length;
    const monthSoldCount = unifiedData.filter(a => a.saleDetails?.isMonthlySale).length;

    return { soldCount, availableCount, monthSoldCount };
  }, [unifiedData]);

  const exportData = () => {
    const wb = utils.book_new();
    
    const data = filteredData.map(item => ({
      Code: item.code,
      Title: item.title,
      Artist: item.artist,
      Status: item.status,
      Price: item.price,
      'Sale Date': item.saleDetails ? new Date(item.saleDetails.saleDate).toLocaleDateString() : '',
      'Client': item.saleDetails?.clientName || '',
      'Agent': item.saleDetails?.agentName || '',
      'Is Monthly Sale': item.saleDetails?.isMonthlySale ? 'Yes' : ''
    }));

    const ws = utils.json_to_sheet(data);
    utils.book_append_sheet(wb, ws, "Unified Data");

    writeFile(wb, `ArtworkTimeline_${selectedDate}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-fuchsia-100 text-fuchsia-600 rounded-xl">
              <Calendar size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Artwork Timeline</h1>
              <p className="text-sm text-slate-500">View application state for any past month.</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
              <select
                value={selectedMonth}
                onChange={(e) => {
                  const m = parseInt(e.target.value, 10);
                  const mm = String(m).padStart(2, '0');
                  setSelectedDate(`${selectedYear}-${mm}`);
                }}
                className="bg-slate-50 border-0 rounded-xl px-5 py-3 text-base font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-indigo-50 hover:bg-indigo-50 transition-all cursor-pointer transform hover:scale-105 active:scale-95 duration-200"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{monthNames[m-1]}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => {
                  const y = parseInt(e.target.value, 10);
                  const mm = String(selectedMonth).padStart(2, '0');
                  setSelectedDate(`${y}-${mm}`);
                }}
                className="bg-slate-50 border-0 rounded-xl px-5 py-3 text-base font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-indigo-50 hover:bg-indigo-50 transition-all cursor-pointer transform hover:scale-105 active:scale-95 duration-200"
              >
                {Array.from({ length: currentYear - earliestYear + 1 }, (_, i) => currentYear - i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <div className="w-px h-8 bg-slate-200 mx-1"></div>

              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="bg-indigo-50/50 border-0 rounded-xl px-5 py-3 text-base font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-indigo-100 hover:bg-indigo-100 transition-all cursor-pointer transform hover:scale-105 active:scale-95 duration-200 min-w-[140px]"
              >
                <option value="All">All Branches</option>
                {availableBranches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <button
              onClick={exportData}
              className="flex items-center space-x-2 px-6 py-3.5 bg-slate-800 text-white rounded-2xl hover:bg-slate-700 transition-all shadow-md hover:shadow-lg font-bold transform hover:-translate-y-0.5"
            >
              <Download size={20} />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-400 uppercase">Total Items</span>
              <Package size={16} className="text-indigo-500" />
            </div>
            <p className="text-2xl font-black text-indigo-900">{unifiedData.length}</p>
          </div>
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-400 uppercase">Available</span>
              <Package size={16} className="text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-900">{stats.availableCount}</p>
          </div>
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-400 uppercase">Sold (Cumulative)</span>
              <TrendingUp size={16} className="text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-900">{stats.soldCount}</p>
          </div>
          <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-rose-400 uppercase">Sold ({selectedDate})</span>
              <Package size={16} className="text-rose-500" />
            </div>
            <p className="text-2xl font-black text-rose-900">{stats.monthSoldCount}</p>
          </div>
        </div>

      </div>

      {/* Content Area */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center space-x-2">
          <Search className="text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search historical inventory, sales, clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm"
          />

        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Code</th>
                <th className="px-6 py-3">Image</th>
                <th className="px-6 py-3">Artwork</th>
                <th className="px-6 py-3">Artist</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Sale Date</th>
                <th className="px-6 py-3">Client</th>
                <th className="px-6 py-3 text-right">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((art) => (
                <tr 
                  key={art.id} 
                  className={`hover:bg-slate-50 ${art.saleDetails?.isMonthlySale ? 'bg-rose-50/30' : ''} ${onViewArtwork ? 'cursor-pointer' : ''}`}
                  onClick={() => onViewArtwork && onViewArtwork(art.id)}
                >
                  <td className="px-6 py-4 font-mono text-slate-500 text-xs">{art.code}</td>
                  <td className="px-6 py-4">
                    <img
                      src={art.imageUrl}
                      alt={art.title}
                      className="w-10 h-10 object-cover rounded shadow-sm"
                    />
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">{art.title}</td>
                  <td className="px-6 py-4 text-slate-600">{art.artist}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      art.status === 'Available' ? 'bg-emerald-100 text-emerald-700' :
                      art.status === 'Sold' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {art.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-xs">
                    {art.saleDetails ? new Date(art.saleDetails.saleDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-xs">
                    {art.saleDetails ? art.saleDetails.clientName : '-'}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-slate-600">
                    ${art.price.toLocaleString()}
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    No records found for this period.
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

export default TimeMachinePage;
