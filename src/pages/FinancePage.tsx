
import React, { useState, useMemo } from 'react';
import { 
  CreditCard, 
  TrendingUp, 
  Calendar, 
  Search, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  Download,
  DollarSign,
  PieChart,
  Activity,
  ChevronLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../contexts/DataContext';
import { Artwork, SaleRecord, SaleStatus, ArtworkStatus, InstallmentRecord } from '../types';

type TimeFilter = 'day' | 'week' | 'month' | 'year' | 'specific';

const FinancePage: React.FC = () => {
  const { sales, artworks } = useData();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');
  const [specificDate, setSpecificDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Filtered Sales Logic
  const filteredSales = useMemo(() => {
    const now = new Date();
    return sales.filter(sale => {
      if (sale.status !== SaleStatus.APPROVED || sale.isCancelled) return false;
      
      const saleDate = new Date(sale.saleDate);
      
      switch (timeFilter) {
        case 'day':
          return saleDate.toDateString() === now.toDateString();
        case 'week': {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          return saleDate >= startOfWeek;
        }
        case 'month':
          return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
        case 'year':
          return saleDate.getFullYear() === now.getFullYear();
        case 'specific':
          return saleDate.toISOString().split('T')[0] === specificDate;
        default:
          return true;
      }
    });
  }, [sales, timeFilter, specificDate]);

  // 2. Metrics Calculations
  const metrics = useMemo(() => {
    let fullyPaidRevenue = 0;
    let installmentCollected = 0;
    let installmentRemaining = 0;
    let totalPotentialRevenue = 0;
    let pendingApprovalValue = 0;
    const branchRevenue: Record<string, number> = {};
    const artistRevenue: Record<string, number> = {};

    sales.forEach(sale => {
      if (sale.status === SaleStatus.FOR_SALE_APPROVAL) {
        pendingApprovalValue += sale.artworkSnapshot?.price || 0;
      }
    });

    filteredSales.forEach(sale => {
      const price = sale.artworkSnapshot?.price || 0;
      const branch = sale.artworkSnapshot?.currentBranch || 'Unknown';
      const artist = sale.artworkSnapshot?.artist || 'Unknown';

      totalPotentialRevenue += price;
      branchRevenue[branch] = (branchRevenue[branch] || 0) + price;
      artistRevenue[artist] = (artistRevenue[artist] || 0) + price;

      const hasInstallments = (sale.installments && sale.installments.length > 0) || sale.isDownpayment;

      if (!hasInstallments) {
        fullyPaidRevenue += price;
      } else {
        const downpayment = sale.downpayment || 0;
        const paidInstallments = (sale.installments || [])
          .filter(i => !i.isPending && !i.isDeclined)
          .reduce((sum, i) => sum + i.amount, 0);
        
        const totalCollected = downpayment + paidInstallments;
        installmentCollected += totalCollected;
        installmentRemaining += Math.max(0, price - totalCollected);
      }
    });

    const totalCollectedCombined = fullyPaidRevenue + installmentCollected;
    const conversionRate = sales.length > 0 
      ? (sales.filter(s => s.status === SaleStatus.APPROVED).length / sales.length) * 100 
      : 0;
    
    const avgTransactionValue = filteredSales.length > 0 
      ? totalPotentialRevenue / filteredSales.length 
      : 0;

    const topArtists = Object.entries(artistRevenue)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const revenueByBranch = Object.entries(branchRevenue)
      .sort(([, a], [, b]) => b - a);

    return {
      fullyPaidRevenue,
      installmentCollected,
      installmentRemaining,
      totalPotentialRevenue,
      totalCollectedCombined,
      conversionRate,
      pendingApprovalValue,
      avgTransactionValue,
      topArtists,
      revenueByBranch
    };
  }, [filteredSales, sales]);

  // 3. Installment Tracking List
  const installmentSales = useMemo(() => {
    return sales.filter(sale => {
      if (sale.status !== SaleStatus.APPROVED || sale.isCancelled) return false;
      const hasInstallments = (sale.installments && sale.installments.length > 0) || sale.isDownpayment;
      if (!hasInstallments) return false;
      
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          sale.clientName.toLowerCase().includes(q) ||
          sale.artworkSnapshot?.title.toLowerCase().includes(q) ||
          sale.artworkSnapshot?.code.toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
  }, [sales, searchQuery]);

  const selectedSale = useMemo(() => 
    sales.find(s => s.id === selectedInstallmentId), 
    [sales, selectedInstallmentId]
  );

  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header & Main Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-neutral-900">Finance Control</h1>
          <p className="text-neutral-500 mt-1 font-medium">Real-time revenue monitoring and fiscal projections.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200 relative isolate">
            {(['day', 'week', 'month', 'year', 'specific'] as TimeFilter[]).map(f => {
              const isActive = timeFilter === f;
              return (
                <button
                  key={f}
                  onClick={() => setTimeFilter(f)}
                  className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-colors relative z-10 ${
                    isActive 
                      ? 'text-neutral-900' 
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  <span className="relative z-10">{f}</span>
                  {isActive && (
                    <motion.div
                      layoutId="finance-filter-active"
                      className="absolute inset-0 bg-white rounded-lg shadow-sm -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
          {timeFilter === 'specific' && (
            <input
              type="date"
              value={specificDate}
              onChange={(e) => setSpecificDate(e.target.value)}
              className="px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
            />
          )}
          <button className="p-2.5 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors text-neutral-600">
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {[
          { 
            label: 'Fully Paid Revenue', 
            value: metrics.fullyPaidRevenue, 
            icon: CheckCircle2, 
            color: 'text-emerald-600', 
            bg: 'bg-emerald-50',
            trend: '+12.5%'
          },
          { 
            label: 'Installment Collected', 
            value: metrics.installmentCollected, 
            icon: Clock, 
            color: 'text-blue-600', 
            bg: 'bg-blue-50',
            trend: '+8.2%'
          },
          { 
            label: 'Combined Collected', 
            value: metrics.totalCollectedCombined, 
            icon: TrendingUp, 
            color: 'text-neutral-900', 
            bg: 'bg-neutral-100',
            trend: '+10.1%'
          },
          { 
            label: 'Conversion Rate', 
            value: `${metrics.conversionRate.toFixed(1)}%`, 
            icon: Activity, 
            color: 'text-amber-600', 
            bg: 'bg-amber-50',
            trend: '+2.4%'
          },
        ].map((m, i) => (
          <motion.div 
            key={i}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 }
            }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group cursor-default"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${m.bg} ${m.color} transition-transform group-hover:scale-110`}>
                <m.icon size={22} />
              </div>
              <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md uppercase tracking-wider">
                {m.trend}
              </span>
            </div>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">{m.label}</p>
            <p className="text-2xl font-black text-neutral-900 mt-1">
              {typeof m.value === 'number' ? `₱${m.value.toLocaleString()}` : m.value}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Projections & Combined View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-neutral-900">Fiscal Projection</h3>
              <p className="text-sm text-neutral-500 font-medium">Comparing realized vs. potential revenue.</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-neutral-900" />
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Realized</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-neutral-200" />
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Projected</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm font-bold mb-2">
                <span className="text-neutral-900 uppercase tracking-tight">Total Portfolio Performance</span>
                <span className="text-neutral-900">
                  ₱{metrics.totalCollectedCombined.toLocaleString()} / ₱{metrics.totalPotentialRevenue.toLocaleString()}
                </span>
              </div>
              <div className="h-4 bg-neutral-100 rounded-full overflow-hidden flex">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(metrics.totalCollectedCombined / metrics.totalPotentialRevenue) * 100}%` }}
                  className="h-full bg-neutral-900" 
                />
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(metrics.installmentRemaining / metrics.totalPotentialRevenue) * 100}%` }}
                  className="h-full bg-neutral-200" 
                />
              </div>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-[0.2em] mt-3">
                {((metrics.totalCollectedCombined / metrics.totalPotentialRevenue) * 100).toFixed(1)}% Realized
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-8 border-t border-neutral-100">
              <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200/50">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Total Realized</p>
                <p className="text-xl font-black text-neutral-900">₱{metrics.totalCollectedCombined.toLocaleString()}</p>
                <p className="text-[10px] text-neutral-500 font-medium mt-1">Fully Paid + Paid Installments</p>
              </div>
              <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Assuming All Paid</p>
                <p className="text-xl font-black text-white">₱{metrics.totalPotentialRevenue.toLocaleString()}</p>
                <p className="text-[10px] text-neutral-400 font-medium mt-1">Full contractual value of all sales</p>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
            <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-4">Pipeline Value</h4>
            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-bold text-neutral-500 uppercase">Pending Approvals</p>
                <p className="text-lg font-black text-neutral-900">₱{metrics.pendingApprovalValue.toLocaleString()}</p>
              </div>
              <div className="pt-4 border-t border-neutral-100">
                <p className="text-[9px] font-bold text-neutral-500 uppercase">Avg. Transaction</p>
                <p className="text-lg font-black text-neutral-900">₱{Math.round(metrics.avgTransactionValue).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
            <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-4">Branch Performance</h4>
            <div className="space-y-3">
              {metrics.revenueByBranch.map(([branch, revenue]) => (
                <div key={branch} className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-600">{branch}</span>
                  <span className="text-xs font-black text-neutral-900">₱{revenue.toLocaleString()}</span>
                </div>
              ))}
              {metrics.revenueByBranch.length === 0 && <p className="text-[10px] text-neutral-400 font-bold uppercase py-2">No branch data available</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Artists & Extra Data */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-neutral-900">Top Performing Artists</h3>
              <p className="text-sm text-neutral-500 font-medium">Revenue contribution by artist.</p>
            </div>
            <PieChart size={20} className="text-neutral-300" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-5">
              {metrics.topArtists.map(([artist, revenue], idx) => {
                const percentage = (revenue / (metrics.totalPotentialRevenue || 1)) * 100;
                return (
                  <div key={artist} className="space-y-1.5">
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-black text-neutral-900 uppercase tracking-tight">
                        {idx + 1}. {artist}
                      </span>
                      <span className="text-[10px] font-bold text-neutral-400">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        className="h-full bg-neutral-900" 
                      />
                    </div>
                  </div>
                );
              })}
              {metrics.topArtists.length === 0 && <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest text-center py-10">No artist data found</p>}
            </div>
            
            <div className="bg-neutral-50 rounded-2xl p-6 border border-neutral-200/50 flex flex-col justify-center">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-neutral-200 flex items-center justify-center shadow-sm">
                    <TrendingUp size={14} className="text-neutral-900" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Market Lead</p>
                    <p className="text-sm font-black text-neutral-900">{metrics.topArtists[0]?.[0] || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-neutral-200 flex items-center justify-center shadow-sm">
                    <DollarSign size={14} className="text-neutral-900" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Avg. Ticket</p>
                    <p className="text-sm font-black text-neutral-900">₱{Math.round(metrics.avgTransactionValue).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Installment Tracker List */}
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm flex flex-col h-[600px]">
          <div className="p-6 border-b border-neutral-100">
            <h3 className="text-lg font-black text-neutral-900">Installment Tracker</h3>
            <p className="text-xs text-neutral-500 font-medium mb-4">Active installment plans and collections.</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input
                type="text"
                placeholder="Search clients or artworks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900/10 transition-all"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
            {installmentSales.map(sale => {
              const price = sale.artworkSnapshot?.price || 0;
              const paid = (sale.downpayment || 0) + (sale.installments || []).filter(i => !i.isPending && !i.isDeclined).reduce((sum, i) => sum + i.amount, 0);
              const progress = (paid / price) * 100;

              return (
                <motion.button
                  key={sale.id}
                  onClick={() => setSelectedInstallmentId(sale.id)}
                  whileHover={{ x: 4 }}
                  className="w-full text-left p-4 rounded-xl border border-neutral-100 hover:border-neutral-300 hover:bg-neutral-50 transition-all group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-xs font-black text-neutral-900 uppercase tracking-tight truncate max-w-[150px]">
                        {sale.artworkSnapshot?.title}
                      </p>
                      <p className="text-[10px] text-neutral-400 font-bold uppercase">{sale.clientName}</p>
                    </div>
                    <ChevronRight size={14} className="text-neutral-300 group-hover:text-neutral-900 transition-colors" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase">
                      <span className="text-neutral-500">₱{paid.toLocaleString()}</span>
                      <span className="text-neutral-400">/ ₱{price.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </motion.button>
              );
            })}
            {installmentSales.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
                <CreditCard size={40} className="text-neutral-300 mb-4" />
                <p className="text-sm font-bold text-neutral-500 uppercase tracking-widest">No active installments found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderInstallmentDetail = (sale: SaleRecord) => {
    const price = sale.artworkSnapshot?.price || 0;
    const paidInstallments = (sale.installments || []).filter(i => !i.isPending && !i.isDeclined);
    const downpayment = sale.downpayment || 0;
    const totalPaid = downpayment + paidInstallments.reduce((sum, i) => sum + i.amount, 0);
    const balance = Math.max(0, price - totalPaid);
    const progress = (totalPaid / price) * 100;

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
        <motion.button 
          onClick={() => setSelectedInstallmentId(null)}
          whileHover={{ x: -4 }}
          className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors font-black text-[10px] uppercase tracking-widest"
        >
          <ChevronLeft size={16} />
          Back to Dashboard
        </motion.button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="w-32 h-32 md:w-48 md:h-48 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200 flex-shrink-0">
                  <img 
                    src={sale.artworkSnapshot?.imageUrl} 
                    alt={sale.artworkSnapshot?.title} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 space-y-6">
                  <div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-widest rounded-md">Installment Plan</span>
                    <h2 className="text-3xl font-black text-neutral-900 mt-2">{sale.artworkSnapshot?.title}</h2>
                    <p className="text-neutral-500 font-bold uppercase text-xs tracking-wider mt-1">{sale.artworkSnapshot?.code} • {sale.artworkSnapshot?.artist}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Contract Value</p>
                      <p className="text-xl font-black text-neutral-900">₱{price.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Total Paid</p>
                      <p className="text-xl font-black text-emerald-600">₱{totalPaid.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Outstanding</p>
                      <p className="text-xl font-black text-rose-600">₱{balance.toLocaleString()}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-black uppercase mb-2">
                      <span className="text-neutral-900">Payment Progress</span>
                      <span className="text-neutral-500">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="h-3 bg-neutral-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-emerald-500" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-8 py-6 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="text-lg font-black text-neutral-900">Payment History</h3>
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                  {paidInstallments.length + (sale.downpayment ? 1 : 0)} Total Payments
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-100">
                      <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Date</th>
                      <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Description</th>
                      <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Amount</th>
                      <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {sale.downpayment && (
                      <tr className="group hover:bg-neutral-50 transition-colors">
                        <td className="px-8 py-4 text-xs font-bold text-neutral-600">
                          {new Date(sale.downpaymentRecordedAt || sale.saleDate).toLocaleDateString()}
                        </td>
                        <td className="px-8 py-4">
                          <span className="px-2 py-1 bg-neutral-900 text-white text-[9px] font-black uppercase tracking-widest rounded-md">Downpayment</span>
                        </td>
                        <td className="px-8 py-4 text-xs font-black text-neutral-900 text-right">₱{sale.downpayment.toLocaleString()}</td>
                        <td className="px-8 py-4 text-xs font-medium text-neutral-400 font-mono tracking-tighter">Initial Payment</td>
                      </tr>
                    )}
                    {paidInstallments.map((inst, idx) => (
                      <tr key={inst.id} className="group hover:bg-neutral-50 transition-colors">
                        <td className="px-8 py-4 text-xs font-bold text-neutral-600">
                          {new Date(inst.date).toLocaleDateString()}
                        </td>
                        <td className="px-8 py-4">
                          <span className="text-xs font-bold text-neutral-900">Installment #{idx + 1}</span>
                        </td>
                        <td className="px-8 py-4 text-xs font-black text-neutral-900 text-right">₱{inst.amount.toLocaleString()}</td>
                        <td className="px-8 py-4 text-xs font-medium text-neutral-400 font-mono tracking-tighter">
                          {inst.reference || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Side Details */}
          <div className="space-y-8">
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-black text-neutral-900 uppercase tracking-widest mb-6">Client Profile</h3>
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-600 font-black">
                    {sale.clientName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-black text-neutral-900">{sale.clientName}</p>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase">{sale.clientEmail || 'No Email'}</p>
                  </div>
                </div>
                <div className="pt-5 border-t border-neutral-100 space-y-4">
                  <div>
                    <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">Managed By</p>
                    <p className="text-xs font-bold text-neutral-900">{sale.agentName}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">Sale Date</p>
                    <p className="text-xs font-bold text-neutral-900">{new Date(sale.saleDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">Branch</p>
                    <p className="text-xs font-bold text-neutral-900">{sale.artworkSnapshot?.currentBranch || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-neutral-900 rounded-2xl p-6 text-white shadow-xl shadow-neutral-200/50">
              <h3 className="text-sm font-black uppercase tracking-widest mb-6 opacity-60">Finance Advisory</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 p-1 bg-white/10 rounded-md">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                  </div>
                  <p className="text-xs font-medium text-neutral-300">
                    Collection efficiency is at <span className="text-white font-black">{progress.toFixed(0)}%</span> for this contract.
                  </p>
                </div>
                {balance > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="mt-1 p-1 bg-white/10 rounded-md">
                      <Clock size={14} className="text-amber-400" />
                    </div>
                    <p className="text-xs font-medium text-neutral-300">
                      Remaining balance of <span className="text-white font-black">₱{balance.toLocaleString()}</span> is projected for next collection cycle.
                    </p>
                  </div>
                )}
                <button className="w-full mt-4 py-3 bg-white text-neutral-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-100 transition-colors">
                  Generate Statement
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1400px] mx-auto py-10 px-6 md:px-10 pb-24">
      {selectedInstallmentId && selectedSale ? (
        renderInstallmentDetail(selectedSale)
      ) : (
        renderDashboard()
      )}
    </div>
  );
};

export default FinancePage;
