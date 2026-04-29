import React, { useState, useMemo, useEffect } from 'react';
import { SaleRecord, SaleStatus, Artwork, UserPermissions } from '../types';
import { Search, Filter, Calendar, Banknote, History, CreditCard, Package, User, PlusCircle, Trash2, X, Mail, Phone, MapPin, CheckCircle2 } from 'lucide-react';
import { OptimizedImage } from './OptimizedImage';
import { supabase } from '../supabase';
import { repairBase64Image } from '../utils/imageValidator';

interface SalesViewProps {
  sales: SaleRecord[];
  artworks: Artwork[];
  branches: string[];
  permissions?: UserPermissions;
  onAddInstallment?: (saleId: string, amount: number, date: string, reference?: string) => void;
  onDeleteSale?: (saleId: string) => void | Promise<boolean | void>;
}

const SalesView: React.FC<SalesViewProps> = ({ sales, artworks, branches, onAddInstallment, onDeleteSale }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  const [paymentStatus, setPaymentStatus] = useState<'Fully Paid' | 'Partially Paid'>('Fully Paid');
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [selectedPartialSale, setSelectedPartialSale] = useState<SaleRecord | null>(null);
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<SaleRecord | null>(null);
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [installmentDate, setInstallmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [installmentReference, setInstallmentReference] = useState('');
  const [imageOverrides, setImageOverrides] = useState<Record<string, string>>({});

  const validSales = sales.filter(s => {
    if (s.isCancelled) return false;
    // Exclude sales still pending approval or declined
    if (s.status === SaleStatus.FOR_SALE_APPROVAL || s.status === SaleStatus.DECLINED) return false;
    return true;
  });

  const getDisplayArtwork = (sale: SaleRecord) => {
    const liveArtwork = artworks.find(a => a.id === sale.artworkId);
    const snapshot = sale.artworkSnapshot;

    if (!liveArtwork && !snapshot) return null;
    if (!liveArtwork) return snapshot || null;
    if (!snapshot) return liveArtwork;

    return {
      ...snapshot,
      ...liveArtwork,
      imageUrl: imageOverrides[sale.artworkId] || liveArtwork.imageUrl || snapshot.imageUrl || '',
      currentBranch: liveArtwork.currentBranch || snapshot.currentBranch || 'Unknown'
    };
  };

  useEffect(() => {
    const missingIds = validSales
      .map(sale => sale.artworkId)
      .filter(Boolean)
      .filter((artworkId, index, ids) => ids.indexOf(artworkId) === index)
      .filter(artworkId => {
        const liveArtwork = artworks.find(a => a.id === artworkId);
        const snapshot = validSales.find(s => s.artworkId === artworkId)?.artworkSnapshot;
        return !imageOverrides[artworkId] && !(liveArtwork?.imageUrl) && !(snapshot?.imageUrl);
      });

    if (missingIds.length === 0) return;

    let cancelled = false;

    void (async () => {
      try {
        const { data, error } = await supabase
          .from('artworks')
          .select('id, image_url')
          .in('id', missingIds);

        if (error || !data || cancelled) return;

        const resolved: Record<string, string> = {};
        data.forEach((row: any) => {
          const rawImage = typeof row.image_url === 'string' ? row.image_url : '';
          const normalizedImage = rawImage.startsWith('data:image')
            ? repairBase64Image(rawImage) || ''
            : rawImage;
          if (normalizedImage) {
            resolved[String(row.id)] = normalizedImage;
          }
        });

        if (!cancelled && Object.keys(resolved).length > 0) {
          setImageOverrides(prev => ({ ...prev, ...resolved }));
        }
      } catch {
        // Keep the card fallback when the backend cannot supply images.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [validSales, artworks, imageOverrides]);

  const stats = useMemo(() => {
    const totalSalesCount = validSales.length;
    let totalGrossAmount = 0;
    let totalCollectedRevenue = 0;
    let fullPaymentsRevenue = 0;
    let installmentRevenue = 0;
    let pendingBalance = 0;
    let downpaymentCount = 0;

    validSales.forEach(sale => {
      const art = getDisplayArtwork(sale);
      if (!art) return;
      
      const price = art.price || 0;
      const totalInstallments = (sale.installments || []).reduce((sum, inst) => sum + inst.amount, 0);
      const totalPaid = (sale.downpayment || 0) + totalInstallments;

      totalGrossAmount += price;
      totalCollectedRevenue += totalPaid;

      // Define partial condition: Explicit DP recorded and (unpaid balance OR price is 0/TBD)
      const isPartial = !!(sale.downpayment && (totalPaid < price || price === 0));

      if (isPartial) {
        downpaymentCount++;
        installmentRevenue += totalPaid;
        pendingBalance += (price === 0 ? 0 : Math.max(0, price - totalPaid));
      } else {
        fullPaymentsRevenue += totalPaid;
        // If price is higher than totalPaid but it's not marked as partial, we still count what's paid
        // but typically for "Fully Paid", price === totalPaid.
      }
    });

    return { 
      totalSalesCount, 
      totalGrossAmount, 
      totalCollectedRevenue, 
      fullPaymentsRevenue, 
      installmentRevenue, 
      pendingBalance, 
      downpaymentCount 
    };
  }, [validSales, artworks]);

  const filteredSales = validSales.filter(sale => {
    const art = getDisplayArtwork(sale);
    if (!art) return false;

    const matchesSearch = 
      (art.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (art.artist || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.clientEmail || '').toLowerCase().includes(searchTerm.toLowerCase());

    const branch = art.currentBranch || 'Unknown';
    const matchesBranch = selectedBranch === 'All' || branch === selectedBranch;

    const price = art.price || 0;
    const totalInstallments = (sale.installments || []).reduce((sum, inst) => sum + inst.amount, 0);
    const totalPaid = (sale.downpayment || 0) + totalInstallments;

    const isPartial = !!(sale.downpayment && (totalPaid < price || price === 0));
    const matchesPayment = paymentStatus === 'Partially Paid' ? isPartial : !isPartial;

    return matchesSearch && matchesBranch && matchesPayment;
  }).sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());

  const selectedSaleDetailArtwork = selectedSaleDetail ? getDisplayArtwork(selectedSaleDetail) : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Total Gross Sales</h4>
            <div className="p-2 bg-neutral-900 text-white rounded-lg group-hover:scale-110 transition-transform shadow-lg shadow-neutral-900/20">
              <Package size={18} />
            </div>
          </div>
          <p className="text-xl font-black text-neutral-900 line-clamp-1">₱{stats.totalGrossAmount.toLocaleString()}</p>
          <p className="text-xs text-neutral-500 mt-1 font-medium">Total value of {stats.totalSalesCount} sold artworks</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow group border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Collected Revenue</h4>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform">
              <Banknote size={18} />
            </div>
          </div>
          <p className="text-xl font-black text-emerald-700 line-clamp-1">₱{stats.totalCollectedRevenue.toLocaleString()}</p>
          <div className="flex flex-col mt-1">
            <p className="text-[10px] text-neutral-500 font-bold uppercase">
              Full: <span className="text-neutral-900">₱{stats.fullPaymentsRevenue.toLocaleString()}</span>
            </p>
            <p className="text-[10px] text-neutral-500 font-bold uppercase">
              Partial: <span className="text-neutral-900">₱{stats.installmentRevenue.toLocaleString()}</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow group border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Balance to Collect</h4>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg group-hover:scale-110 transition-transform">
              <History size={18} />
            </div>
          </div>
          <p className="text-xl font-black text-orange-700 line-clamp-1">₱{stats.pendingBalance.toLocaleString()}</p>
          <p className="text-xs text-neutral-500 mt-1 font-medium">From {stats.downpaymentCount} accounts</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Active Partial</h4>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
              <CreditCard size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-neutral-900">{stats.downpaymentCount}</p>
          <p className="text-xs text-neutral-500 mt-1 font-medium">Paintings with downpayments</p>
        </div>
      </div>

      {/* Primary Navigation Sub-tabs */}
      <div className="flex items-center gap-2 p-1 bg-neutral-100 rounded-2xl inline-flex">
        <button
          onClick={() => setPaymentStatus('Fully Paid')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
            paymentStatus === 'Fully Paid'
              ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-black/5'
              : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200/50'
          }`}
        >
          Fully Paid Artworks
        </button>
        <button
          onClick={() => setPaymentStatus('Partially Paid')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
            paymentStatus === 'Partially Paid'
              ? 'bg-white text-orange-700 shadow-sm ring-1 ring-black/5'
              : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200/50'
          }`}
        >
          Partially Paid (Installments)
        </button>
      </div>

      {/* Controls & Filters Container */}
      <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input
              type="text"
              placeholder="Search sales (Title, Artist, Client)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-50 border-none rounded-xl pl-10 pr-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:bg-white transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-neutral-100 rounded-lg text-xs font-bold text-neutral-500 uppercase tracking-wider mr-2">
              <Filter size={14} />
              <span>Filters</span>
            </div>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-3 py-2 bg-neutral-50 border-none rounded-lg text-sm text-neutral-600 font-medium focus:outline-none focus:ring-2 focus:ring-neutral-500/20 cursor-pointer hover:bg-neutral-100 transition-colors"
            >
              <option value="All">All Branches</option>
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredSales.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-24 text-neutral-400 bg-white rounded-3xl border border-dashed border-neutral-200">
            <Banknote size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium text-neutral-600">No sales found</p>
            <p className="text-sm text-neutral-400">Try adjusting your search or filters</p>
          </div>
        ) : (
          filteredSales.map((sale) => {
            const art = getDisplayArtwork(sale);
            if (!art) return null;

            const price = art.price || 0;
            const totalInstallments = (sale.installments || []).reduce((sum, inst) => sum + inst.amount, 0);
            const totalPaid = (sale.downpayment || 0) + totalInstallments;
            const isPartial = !!(sale.downpayment && (totalPaid < price || price === 0));
            const displayImage = art.imageUrl || '';

            return (
              <div
                key={sale.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedSaleDetail(sale)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedSaleDetail(sale);
                  }
                }}
                className="h-full overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-neutral-300"
              >
                <div className="flex items-stretch flex-1 overflow-hidden">
                  <div className="w-1/3 min-h-[160px] bg-neutral-100 relative shrink-0">
                     {displayImage && !displayImage.includes('picsum.photos') ? (
                        <OptimizedImage
                          src={displayImage || undefined}
                          alt={art.title}
                          containerClassName="absolute inset-0 h-full w-full"
                          className="h-full w-full object-cover"
                        />
                     ) : (
                       <div className="w-full h-full flex flex-col items-center justify-center text-neutral-300">
                         <Package size={24} className="mb-2 opacity-50"/>
                         <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 text-center px-2">No Image</span>
                       </div>
                    )}
                  </div>
                  
                  <div className="flex-1 p-5 flex flex-col justify-between ml-2">
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-[10px] bg-neutral-100 border border-neutral-200 text-neutral-500 px-1.5 py-0.5 rounded font-bold tracking-wider">{art.code}</span>
                        <div className="flex items-center gap-2">
                          {isPartial ? (
                            <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-1 rounded-md font-bold uppercase tracking-wider">Installment</span>
                          ) : (
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md font-bold uppercase tracking-wider">Fully Paid</span>
                          )}
                          {onDeleteSale && (
                             <button
                               type="button"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 void onDeleteSale(sale.id);
                               }}
                               className="h-8 w-8 shrink-0 rounded-lg border border-red-200 bg-red-50 text-red-600 transition-colors hover:bg-red-100 hover:text-red-700"
                               aria-label={`Delete sale record for ${art.title}`}
                               title="Delete sale record"
                            >
                              <Trash2 size={14} className="mx-auto" />
                            </button>
                          )}
                        </div>
                      </div>
                      <h4 className="text-base font-bold text-neutral-900 leading-tight mb-1 line-clamp-1">{art.title}</h4>
                      <p className="text-xs text-neutral-500 font-medium line-clamp-1 mb-3">by {art.artist}</p>
                      
                      <div className="flex items-center gap-2 mb-1">
                        <User size={14} className="text-neutral-400" />
                        <span className="text-sm font-semibold text-neutral-700 line-clamp-1">{sale.clientName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-neutral-400" />
                        <span className="text-xs text-neutral-500 font-medium">{new Date(sale.saleDate).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-neutral-50">
                      {isPartial ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-neutral-500">Total Price:</span>
                            <span className="text-neutral-900 font-medium">₱{price.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-emerald-600">Paid so far:</span>
                            <span className="text-emerald-700">₱{((sale.downpayment || 0) + (sale.installments || []).reduce((s, i) => s + i.amount, 0)).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-orange-600">Balance:</span>
                            <span className="text-orange-700">₱{(price - ((sale.downpayment || 0) + (sale.installments || []).reduce((s, i) => s + i.amount, 0))).toLocaleString()}</span>
                          </div>
                          {onAddInstallment && (
                             <button
                               type="button"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setSelectedPartialSale(sale);
                                 setInstallmentAmount('');
                                 setInstallmentDate(new Date().toISOString().split('T')[0]);
                                 setInstallmentReference('');
                                 setIsInstallmentModalOpen(true);
                               }}
                               className="mt-3 w-full py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                             >
                               <PlusCircle size={14} /> Add Installment
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                           <span className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Total Value</span>
                           <span className="text-lg font-black text-emerald-600">₱{price.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedSaleDetail && selectedSaleDetailArtwork && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] border border-neutral-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-neutral-100 bg-neutral-50/70 px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
                  {selectedSaleDetailArtwork.imageUrl ? (
                    <OptimizedImage
                      src={selectedSaleDetailArtwork.imageUrl}
                      alt={selectedSaleDetailArtwork.title}
                      containerClassName="absolute inset-0 h-full w-full"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-neutral-300">
                      <Package size={22} />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Sale Record</p>
                  <h3 className="mt-1 text-2xl font-black tracking-tight text-neutral-900">{selectedSaleDetailArtwork.title}</h3>
                  <p className="text-sm font-medium text-neutral-500">by {selectedSaleDetailArtwork.artist}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSaleDetail(null)}
                className="rounded-full p-2 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6">
                <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-50">
                  <div className="relative aspect-[4/3] w-full bg-white">
                    {selectedSaleDetailArtwork.imageUrl ? (
                      <OptimizedImage
                        src={selectedSaleDetailArtwork.imageUrl}
                        alt={selectedSaleDetailArtwork.title}
                        containerClassName="absolute inset-0 h-full w-full"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-neutral-300">
                        <Package size={28} />
                        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">No Image</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">Artwork Code</p>
                    <p className="mt-2 text-sm font-bold text-neutral-900">{selectedSaleDetailArtwork.code || 'N/A'}</p>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">Branch</p>
                    <p className="mt-2 text-sm font-bold text-neutral-900">{selectedSaleDetailArtwork.currentBranch || 'Unknown'}</p>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">Medium</p>
                    <p className="mt-2 text-sm font-bold text-neutral-900">{selectedSaleDetailArtwork.medium || 'Unspecified'}</p>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">Year / Size</p>
                    <p className="mt-2 text-sm font-bold text-neutral-900">{[selectedSaleDetailArtwork.year, selectedSaleDetailArtwork.dimensions].filter(Boolean).join(' • ') || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">Payment Status</p>
                    {(selectedSaleDetail.downpayment || 0) + (selectedSaleDetail.installments || []).reduce((sum, installment) => sum + installment.amount, 0) < (selectedSaleDetailArtwork.price || 0) && (selectedSaleDetail.downpayment || 0) > 0 ? (
                      <span className="rounded-md bg-orange-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-orange-700">Installment</span>
                    ) : (
                      <span className="rounded-md bg-emerald-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">Fully Paid</span>
                    )}
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-500">Sale Date</span>
                      <span className="font-bold text-neutral-900">{new Date(selectedSaleDetail.saleDate).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-500">Artwork Value</span>
                      <span className="font-bold text-neutral-900">₱{(selectedSaleDetailArtwork.price || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-500">Downpayment</span>
                      <span className="font-bold text-neutral-900">₱{(selectedSaleDetail.downpayment || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-500">Installments Received</span>
                      <span className="font-bold text-neutral-900">₱{(selectedSaleDetail.installments || []).reduce((sum, installment) => sum + installment.amount, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
                      <span className="text-sm font-bold text-neutral-700">Remaining Balance</span>
                      <span className="text-lg font-black text-emerald-600">₱{Math.max((selectedSaleDetailArtwork.price || 0) - ((selectedSaleDetail.downpayment || 0) + (selectedSaleDetail.installments || []).reduce((sum, installment) => sum + installment.amount, 0)), 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">Client Details</p>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-3 text-sm text-neutral-700">
                      <User size={16} className="text-neutral-400" />
                      <span className="font-semibold">{selectedSaleDetail.clientName}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-neutral-700">
                      <Mail size={16} className="text-neutral-400" />
                      <span>{selectedSaleDetail.clientEmail || 'No email recorded'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-neutral-700">
                      <Phone size={16} className="text-neutral-400" />
                      <span>{selectedSaleDetail.clientContact || 'No contact recorded'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-neutral-700">
                      <MapPin size={16} className="text-neutral-400" />
                      <span>{selectedSaleDetail.soldAtEventName || 'Direct gallery sale'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-neutral-700">
                      <CheckCircle2 size={16} className="text-neutral-400" />
                      <span>{selectedSaleDetail.isDelivered ? 'Delivered' : 'Awaiting delivery'}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">Installment History</p>
                    <span className="text-xs font-bold text-neutral-400">{(selectedSaleDetail.installments || []).length} entries</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {(selectedSaleDetail.installments || []).length > 0 ? (
                      selectedSaleDetail.installments!.map((installment) => (
                        <div key={installment.id} className="rounded-2xl border border-neutral-100 bg-neutral-50 px-4 py-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-neutral-900">₱{installment.amount.toLocaleString()}</span>
                            <span className="text-xs font-medium text-neutral-500">{new Date(installment.date).toLocaleDateString()}</span>
                          </div>
                          <p className="mt-1 text-xs text-neutral-500">{installment.reference || 'No reference provided'}</p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-400">
                        No installment entries yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Installment Modal */}
      {isInstallmentModalOpen && selectedPartialSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-neutral-100 bg-neutral-50/50">
              <h3 className="text-xl font-black text-neutral-900 tracking-tight">Log Installment</h3>
              <button
                onClick={() => setIsInstallmentModalOpen(false)}
                className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Amount (PHP)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={installmentAmount}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    const parts = val.split('.');
                    if (parts.length > 2) parts.splice(2);
                    if (parts[0] && parts[0].length > 1) parts[0] = parts[0].replace(/^0+/, '') || '0';
                    setInstallmentAmount(parts.join('.'));
                  }}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Date Received</label>
                <input
                  type="date"
                  value={installmentDate}
                  onChange={(e) => setInstallmentDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Reference / Notes</label>
                <input
                  type="text"
                  value={installmentReference}
                  onChange={(e) => setInstallmentReference(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                  placeholder="e.g., Bank Transfer Ref #12345"
                />
              </div>
            </div>

            <div className="p-6 bg-neutral-50 border-t border-neutral-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsInstallmentModalOpen(false)}
                className="px-6 py-2.5 rounded-xl font-bold text-sm text-neutral-600 hover:bg-neutral-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const amt = parseFloat(installmentAmount);
                  if (isNaN(amt) || amt <= 0) return alert('Enter a valid amount.');
                  
                  if (onAddInstallment) {
                    onAddInstallment(selectedPartialSale.id, amt, installmentDate, installmentReference);
                  }
                  setIsInstallmentModalOpen(false);
                }}
                disabled={!installmentAmount || !installmentDate}
                className="px-6 py-2.5 rounded-xl font-bold text-sm bg-neutral-900 text-white hover:bg-black disabled:opacity-50 transition-all flex items-center gap-2"
              >
                <PlusCircle size={16} /> Save Installment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesView;
