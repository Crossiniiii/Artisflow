import React from 'react';
import { Artwork, SaleRecord, UserPermissions, ArtworkStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Box, Calendar } from 'lucide-react';
import AIInsights from '../components/AIInsights';

interface AnalyticsPageProps {
  artworks: Artwork[];
  sales: SaleRecord[];
  logs: unknown[];
  events: unknown[];
  audits: unknown[];
  userRole: unknown;
  permissions?: Partial<UserPermissions>;
  onConfirmAudit?: () => Promise<void>;
}

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ artworks, sales, permissions }) => {
  const filteredArtworks = React.useMemo(() => {
    return artworks.filter(art => {
      // View Control Permissions
      const canViewReserved = permissions?.canViewReserved ?? true;
      const canViewAuctioned = permissions?.canViewAuctioned ?? true;
      const canViewExhibit = permissions?.canViewExhibit ?? true;
      const canViewForFraming = permissions?.canViewForFraming ?? true;
      const canViewBackToArtist = permissions?.canViewBackToArtist ?? true;

      if (art.status === ArtworkStatus.RESERVED) {
        const isAuction = (art.remarks || '').includes('[Reserved For Auction:');
        const isEvent = (art.remarks || '').includes('[Reserved For Event:');

        if (isAuction) {
          if (!canViewAuctioned) return false;
        } else if (isEvent) {
          if (!canViewExhibit) return false;
        } else {
          if (!canViewReserved) return false;
        }
      } else if (art.status === ArtworkStatus.FOR_FRAMING) {
        if (!canViewForFraming) return false;
      } else if (art.status === ArtworkStatus.FOR_RETOUCH) {
        if (!canViewBackToArtist) return false;
      }

      return true;
    });
  }, [artworks, permissions]);

  const now = new Date();

  const getGrowthData = () => {
    const months = [];
    const monthNames = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const count = filteredArtworks.filter(art => {
        const created = new Date(art.createdAt);
        return created.getMonth() === m && created.getFullYear() === y;
      }).length;
      months.push({ name: monthNames[m], count });
    }
    return months;
  };

  const growthData = getGrowthData();
  const currentMonthAdded = growthData[growthData.length - 1].count;
  const totalOverall = filteredArtworks.length;
  const baselineCount = totalOverall - currentMonthAdded;

  const salesWithArt = sales
    .map(sale => {
      const art = filteredArtworks.find(a => a.id === sale.artworkId);
      return { sale, art };
    })
    .filter(item => item.art);

  const filteredSales = salesWithArt.map(item => item.sale);

  return (
    <div className="space-y-8 pb-10 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <span className="px-2 py-0.5 bg-neutral-900 text-white text-[10px] font-black uppercase tracking-widest rounded shadow-sm">Reporting</span>
            <div className="h-px w-8 bg-neutral-300"></div>
          </div>
          <h1 className="text-4xl font-black text-neutral-900 tracking-tight">Acquisition Analytics</h1>
          <p className="text-neutral-500 mt-2 max-w-xl">Comprehensive tracking of curation velocity, stock movement, and regulatory audit history.</p>
        </div>
        <div className="bg-white border border-neutral-200 px-6 py-4 rounded-3xl shadow-sm flex items-center space-x-4">
          <div className="text-right">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Active Cycle</p>
            <p className="text-sm font-black text-neutral-900">{now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="w-10 h-10 bg-neutral-100 rounded-2xl flex items-center justify-center text-neutral-600 border border-neutral-200">
            <Calendar size={20} />
          </div>
        </div>
      </div>

      <AIInsights artworks={filteredArtworks} sales={filteredSales} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12 bg-white text-neutral-900 p-10 rounded-[3rem] shadow-xl relative overflow-hidden group border border-neutral-200">
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-neutral-100 rounded-full blur-3xl group-hover:bg-neutral-200 transition-colors duration-700"></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500 mb-10 flex items-center">
                <Box size={14} className="mr-2" /> Live Inventory Formula
              </p>
              <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 max-w-2xl">
                <div className="space-y-2 text-center">
                  <p className="text-5xl font-black text-neutral-900">{baselineCount}</p>
                  <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Baseline</p>
                </div>
                <div className="text-neutral-300 font-bold text-2xl">+</div>
                <div className="space-y-2 text-center">
                  <p className="text-5xl font-black text-neutral-400">{currentMonthAdded}</p>
                  <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Added</p>
                </div>
                <div className="text-neutral-300 font-bold text-2xl">=</div>
                <div className="space-y-2 text-center">
                  <p className="text-6xl font-black text-neutral-900">{totalOverall}</p>
                  <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Total</p>
                </div>
              </div>
            </div>
            <div className="mt-12 flex items-center space-x-4 bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
              <div className="p-2 rounded-xl bg-white text-neutral-900 border border-neutral-200 shadow-sm">
                <TrendingUp size={18} />
              </div>
              <p className="text-sm font-medium text-neutral-600">The collection expanded by <span className="font-bold text-neutral-900">{((currentMonthAdded / (baselineCount || 1)) * 100).toFixed(1)}%</span> this month.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-12 bg-white p-10 rounded-[3rem] border border-neutral-200 shadow-sm">
          <h3 className="text-xl font-black text-neutral-900 tracking-tight mb-8">Stock Movement Trends</h3>
          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#737373' }} dy={15} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#d4d4d4' }} />
                <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)' }} />
                <Bar dataKey="count" radius={[12, 12, 0, 0]} barSize={60}>
                  {growthData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === growthData.length - 1 ? '#171717' : '#d4d4d4'} />
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
