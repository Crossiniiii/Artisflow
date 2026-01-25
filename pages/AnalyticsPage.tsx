
import React from 'react';
import { Artwork, UserRole, SaleRecord, ActivityLog, ExhibitionEvent, UserPermissions } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Box, Calendar, DollarSign, ArrowUpRight } from 'lucide-react';
import AIInsights from '../components/AIInsights';

interface AnalyticsPageProps {
  artworks: Artwork[];
  sales: SaleRecord[];
  logs: ActivityLog[];
  events: ExhibitionEvent[];
  userRole: UserRole;
  permissions?: Partial<UserPermissions>;
}

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ artworks, sales, logs, events, userRole, permissions }) => {
  const canViewSalesStats = false; // Feature disabled as per request

  const now = new Date();
  
  const getGrowthData = () => {
    const months = [];
    const monthNames = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const count = artworks.filter(art => {
        const created = new Date(art.createdAt);
        return created.getMonth() === m && created.getFullYear() === y;
      }).length;
      months.push({ name: monthNames[m], count });
    }
    return months;
  };

  const growthData = getGrowthData();
  const currentMonthAdded = growthData[growthData.length - 1].count;
  const totalOverall = artworks.length;
  const baselineCount = totalOverall - currentMonthAdded;

  const salesWithArt = sales
    .map(sale => {
      const art = artworks.find(a => a.id === sale.artworkId);
      return { sale, art };
    })
    .filter(item => item.art);

  const clientSummary = Object.values(
    salesWithArt.reduce((acc, item) => {
      const sale = item.sale;
      const art = item.art;
      const key = sale.clientName || 'Unknown Client';
      const price = art ? art.price || 0 : 0;
      if (!acc[key]) {
        acc[key] = { client: key, count: 0, revenue: 0 };
      }
      acc[key].count += 1;
      acc[key].revenue += price;
      return acc;
    }, {} as Record<string, { client: string; count: number; revenue: number }>)
  ).sort((a: any, b: any) => b.revenue - a.revenue);

  const branchSummary = Object.values(
    salesWithArt.reduce((acc, item) => {
      const sale = item.sale;
      const art = item.art;
      const branch = art?.currentBranch || 'Unknown Branch';
      const price = art ? art.price || 0 : 0;
      if (!acc[branch]) {
        acc[branch] = { branch, count: 0, revenue: 0 };
      }
      acc[branch].count += 1;
      acc[branch].revenue += price;
      return acc;
    }, {} as Record<string, { branch: string; count: number; revenue: number }>)
  ).sort((a: any, b: any) => b.revenue - a.revenue);

  const handleExportSalesCsv = () => {
    // Feature disabled
  };

  return (
    <div className="space-y-8 pb-10 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded shadow-sm">Reporting</span>
            <div className="h-px w-8 bg-slate-300"></div>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Acquisition Analytics</h1>
          <p className="text-slate-500 mt-2 max-w-xl">Comprehensive tracking of curation velocity, stock movement, and regulatory audit history.</p>
        </div>
        <div className="bg-white border border-slate-200 px-6 py-4 rounded-3xl shadow-sm flex items-center space-x-4">
           <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Cycle</p>
              <p className="text-sm font-black text-slate-800">{now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
           </div>
           <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100">
              <Calendar size={20} />
           </div>
        </div>
      </div>

      <AIInsights artworks={artworks} sales={sales} />
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12 bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group border border-white/5">
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-colors duration-700"></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-10 flex items-center">
                <Box size={14} className="mr-2" /> Live Inventory Formula
              </p>
              <div className="flex items-center justify-between max-w-2xl">
                <div className="space-y-2 text-center">
                  <p className="text-5xl font-black">{baselineCount}</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Baseline</p>
                </div>
                <div className="text-slate-700 font-bold text-2xl">+</div>
                <div className="space-y-2 text-center">
                  <p className="text-5xl font-black text-emerald-400">{currentMonthAdded}</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Added</p>
                </div>
                <div className="text-slate-700 font-bold text-2xl">=</div>
                <div className="space-y-2 text-center">
                  <p className="text-6xl font-black text-white">{totalOverall}</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Total</p>
                </div>
              </div>
            </div>
            <div className="mt-12 flex items-center space-x-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
               <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <TrendingUp size={18} />
               </div>
               <p className="text-sm font-medium text-slate-300">The collection expanded by <span className="font-bold text-white">{((currentMonthAdded / (baselineCount || 1)) * 100).toFixed(1)}%</span> this month.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-12 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
          <h3 className="text-xl font-black text-slate-800 tracking-tight mb-8">Stock Movement Trends</h3>
          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 700, fill: '#64748b'}} dy={15}/>
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 700, fill: '#cbd5e1'}} />
                <Tooltip contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)'}}/>
                <Bar dataKey="count" radius={[12, 12, 0, 0]} barSize={60}>
                  {growthData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === growthData.length - 1 ? '#10b981' : '#0f172a'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
