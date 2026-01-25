import React, { useMemo } from 'react';
import { Artwork, SaleRecord, ArtworkStatus } from '../types';
import { Sparkles, TrendingUp, AlertCircle, Award, User } from 'lucide-react';

interface AIInsightsProps {
  artworks: Artwork[];
  sales: SaleRecord[];
}

const AIInsights: React.FC<AIInsightsProps> = ({ artworks, sales }) => {
  const insights = useMemo(() => {
    // 1. Top Selling Artist
    const artistSales: Record<string, number> = {};
    sales.forEach(sale => {
      const art = artworks.find(a => a.id === sale.artworkId);
      if (art) {
        artistSales[art.artist] = (artistSales[art.artist] || 0) + 1;
      }
    });
    const topArtist = Object.entries(artistSales).sort((a, b) => b[1] - a[1])[0];

    // 2. Inventory Value Distribution
    const totalValue = artworks.reduce((acc, art) => acc + (art.price || 0), 0);
    const availableValue = artworks
      .filter(a => a.status === ArtworkStatus.AVAILABLE)
      .reduce((acc, art) => acc + (art.price || 0), 0);
    
    // 3. Stagnant Inventory (Available > 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const stagnantCount = artworks.filter(a => 
      a.status === ArtworkStatus.AVAILABLE && 
      new Date(a.createdAt) < sixMonthsAgo
    ).length;

    // 4. Sales Trend (This month vs Last month)
    const now = new Date();
    const currentMonth = now.getMonth();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    
    const currentMonthSales = sales.filter(s => new Date(s.saleDate).getMonth() === currentMonth).length;
    const lastMonthSales = sales.filter(s => new Date(s.saleDate).getMonth() === lastMonth).length;
    
    let trend = 0;
    if (lastMonthSales === 0 && currentMonthSales > 0) trend = 100;
    else if (lastMonthSales > 0) trend = ((currentMonthSales - lastMonthSales) / lastMonthSales) * 100;

    const formatCurrency = (val: number) => {
      if (val >= 1000000) return `₱${(val / 1000000).toFixed(2)}M`;
      if (val >= 1000) return `₱${(val / 1000).toFixed(1)}K`;
      return `₱${val.toLocaleString()}`;
    };

    const agentStats: Record<string, { count: number; revenue: number }> = {};
    sales.forEach(sale => {
      const art = artworks.find(a => a.id === sale.artworkId);
      const price = art?.price || 0;
      agentStats[sale.agentName] = {
        count: (agentStats[sale.agentName]?.count || 0) + 1,
        revenue: (agentStats[sale.agentName]?.revenue || 0) + price
      };
    });
    const topAgent = Object.entries(agentStats).sort((a, b) => b[1].revenue - a[1].revenue)[0];

    return [
      {
        title: 'Top Performing Artist',
        value: topArtist ? topArtist[0] : 'N/A',
        detail: topArtist ? `${topArtist[1]} units sold all-time` : 'No sales data yet',
        icon: <Award className="text-amber-500" size={24} />,
        color: 'bg-amber-50'
      },
      {
        title: 'Top Performing Agent',
        value: topAgent ? topAgent[0] : 'N/A',
        detail: topAgent ? `${topAgent[1].count} sales • ${formatCurrency(topAgent[1].revenue)}` : 'No sales data yet',
        icon: <User className="text-indigo-500" size={24} />,
        color: 'bg-indigo-50'
      },
      {
        title: 'Sales Momentum',
        value: `${trend > 0 ? '+' : ''}${trend.toFixed(1)}%`,
        detail: 'vs. previous month',
        icon: <TrendingUp className={trend >= 0 ? 'text-emerald-500' : 'text-rose-500'} size={24} />,
        color: trend >= 0 ? 'bg-emerald-50' : 'bg-rose-50'
      },
      {
        title: 'Stagnant Inventory',
        value: stagnantCount.toString(),
        detail: 'Items > 6 months old',
        icon: <AlertCircle className="text-blue-500" size={24} />,
        color: 'bg-blue-50'
      },
      {
        title: 'Projected Value',
        value: formatCurrency(availableValue),
        detail: 'Total available assets',
        icon: <Sparkles className="text-purple-500" size={24} />,
        color: 'bg-purple-50'
      }
    ];
  }, [artworks, sales]);

  return (
    <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200">
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
          <Sparkles className="text-white" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">AI Data Analysis</h2>
          <p className="text-sm text-slate-500">Automated insights based on your inventory patterns.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {insights.map((insight, idx) => (
          <div key={idx} className={`${insight.color} p-6 rounded-[2rem] border border-slate-100/50 hover:shadow-md transition-shadow`}>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                {insight.icon}
              </div>
              <span className="px-3 py-1 bg-white/60 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500">
                Insight
              </span>
            </div>
            <h3 className="text-3xl font-black text-slate-900 mb-1">{insight.value}</h3>
            <p className="text-sm font-bold text-slate-700 mb-1">{insight.title}</p>
            <p className="text-xs text-slate-500">{insight.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIInsights;
