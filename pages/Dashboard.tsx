
import React, { useMemo, useState, useEffect } from 'react';
import { Artwork, SaleRecord, ArtworkStatus, ExhibitionEvent, EventStatus, isInTransitStatus, UserAccount, UserRole } from '../types';
import { ICONS } from '../constants';
import { PieChart, Pie, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { TrendingUp, ArrowRight, Activity, Box, Sparkles, Clock } from 'lucide-react';
import { rtdb } from '../firebase';
import { ref, onValue } from 'firebase/database';

interface DashboardProps {
  artworks: Artwork[];
  sales: SaleRecord[];
  events: ExhibitionEvent[];
  accounts: UserAccount[];
  onSelectArt: (id: string) => void;
  onManageEvents: () => void;
  onNavigateFromStat?: (target: 'inventory' | 'sales' | 'operations') => void;
  currentUser?: UserAccount | null;
}

const Dashboard: React.FC<DashboardProps> = ({ artworks, sales, events, accounts, onSelectArt, onManageEvents, onNavigateFromStat, currentUser }) => {
  const inTransit = artworks.filter(a => isInTransitStatus(a.status));
  const [activeStat, setActiveStat] = useState<'inventory' | 'available' | 'revenue' | 'inTransit' | null>(null);

  const completedSales = useMemo(
    () => sales.filter(sale => !sale.isCancelled),
    [sales]
  );

  const formatImportPeriod = (p?: string) => {
    if (!p) return '';
    const parts = p.split('-');
    if (parts.length < 2) return p;
    const y = parts[0];
    const m = Math.max(1, Math.min(12, parseInt(parts[1], 10)));
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${monthNames[m - 1]} ${y}`;
  };
  const totalInventory = artworks.length;
  const totalAvailable = artworks.filter(a => a.status === ArtworkStatus.AVAILABLE).length;
  const totalSold = completedSales.length;
  const totalInTransit = inTransit.length;

  const stats = [
    { 
      id: 'inventory' as const,
      label: 'Total Inventory', 
      value: totalInventory, 
      icon: ICONS.Inventory, 
      gradient: 'from-slate-800 to-slate-900',
      shadow: 'shadow-slate-200',
      textColor: 'text-white',
      target: 'inventory' as const
    },
    { 
      id: 'available' as const,
      label: 'Available Now', 
      value: totalAvailable, 
      icon: ICONS.Add, 
      gradient: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-100',
      textColor: 'text-white',
      target: 'inventory' as const
    },
    { 
      id: 'revenue' as const,
      label: 'Paintings Sold', 
      value: totalSold.toLocaleString(),
      icon: ICONS.Sales, 
      gradient: 'from-amber-400 to-orange-500',
      shadow: 'shadow-amber-100',
      textColor: 'text-white',
      target: 'sales' as const
    },
    { 
      id: 'inTransit' as const,
      label: 'In Transit', 
      value: totalInTransit, 
      icon: ICONS.Truck, 
      gradient: 'from-indigo-500 to-blue-600',
      shadow: 'shadow-indigo-100',
      textColor: 'text-white',
      target: 'inventory' as const
    },
  ];

  const displayName = useMemo(
    () => currentUser?.firstName || currentUser?.fullName || currentUser?.name || 'there',
    [currentUser]
  );

  const availableArtworks = useMemo(
    () => artworks.filter(a => a.status === ArtworkStatus.AVAILABLE),
    [artworks]
  );

  const inTransitArtworks = inTransit;

  const revenueDetails = useMemo(
    () =>
      completedSales
        .map(sale => {
          const art = artworks.find(a => a.id === sale.artworkId);
          return { sale, art };
        })
        .filter(x => x.art),
    [completedSales, artworks]
  );

  const [userPresence, setUserPresence] = useState<Record<string, any>>({});

  useEffect(() => {
    const statusRef = ref(rtdb, '/status');
    const unsubscribe = onValue(statusRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUserPresence(data);
      } else {
        setUserPresence({});
      }
    });

    return () => unsubscribe();
  }, []);

  const teamStatus = useMemo(() => {
    return accounts
      .map(acc => {
        const presence = userPresence[acc.id];
        // If it's the current user, they are effectively online if they are viewing this
        // But we also check presence for consistency, or force true for self if desired.
        // However, relying on RTDB presence for self confirms the connection works.
        const isOnline = presence?.state === 'online';
        const lastSeen = presence?.last_changed || (acc.lastLogin ? new Date(acc.lastLogin).getTime() : null);
        
        return {
          ...acc,
          isOnline,
          lastSeen,
          isMe: currentUser?.id === acc.id
        };
      })
      .sort((a, b) => {
        // Current user first
        if (a.isMe) return -1;
        if (b.isMe) return 1;
        
        // Sort by Branch (alphabetical)
        const branchA = a.branch || '';
        const branchB = b.branch || '';
        if (branchA !== branchB) {
          // Put those with branch first, or just alphabetical
          // If one has no branch, put it at the end
          if (!branchA) return 1;
          if (!branchB) return -1;
          return branchA.localeCompare(branchB);
        }

        // Then by Online status
        if (a.isOnline && !b.isOnline) return -1;
        if (!a.isOnline && b.isOnline) return 1;
        // Then by last seen (recent first)
        return (b.lastSeen || 0) - (a.lastSeen || 0);
      });
  }, [accounts, currentUser, userPresence]);

  const formatLastSeen = (timestamp: number) => {
    if (!timestamp) return 'Offline';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    
    return new Date(timestamp).toLocaleDateString();
  };

  const statusData = [
    { name: 'Available', value: artworks.filter(a => a.status === ArtworkStatus.AVAILABLE).length },
    { name: 'Sold', value: inTransit.length },
    { name: 'Delivered', value: artworks.filter(a => a.status === ArtworkStatus.DELIVERED).length },
  ];

  const COLORS = ['#10b981', '#f59e0b', '#6366f1'];

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="relative overflow-hidden rounded-[2.2rem] bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-emerald-500 p-[1px] shadow-xl shadow-indigo-500/20">
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-950 text-slate-50 rounded-[2.1rem] px-8 py-7">
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <div className="absolute -right-20 -top-24 w-64 h-64 bg-fuchsia-500/40 blur-3xl rounded-full" />
            <div className="absolute -left-16 -bottom-24 w-72 h-72 bg-emerald-400/40 blur-3xl rounded-full" />
          </div>
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center space-x-2 rounded-full bg-white/5 px-3 py-1 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100">
              <Sparkles size={12} />
              <span>Gallery Intelligence</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              Hi, {displayName}
            </h1>
            <p className="text-sm md:text-base text-slate-200 max-w-xl">
              Here&apos;s what&apos;s happening across your collection, branches, and sales today.
            </p>
            <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-900/60 border border-slate-700 text-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                {totalAvailable} available now
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-900/40 border border-slate-700 text-slate-100">
                {totalInventory} in catalog
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-900/40 border border-slate-700 text-amber-200">
                {totalSold} paintings sold
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-900/40 border border-slate-700 text-indigo-200">
                {totalInTransit} in transit
              </span>
            </div>
          </div>
          <div className="relative z-10 flex flex-col items-end gap-3">
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Today&apos;s Date</p>
              <p className="text-xs md:text-sm font-bold text-slate-50">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="inline-flex items-center space-x-2 rounded-full bg-white/5 px-3 py-1 border border-white/10 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Dashboard Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div 
            key={i} 
            className={`relative overflow-hidden rounded-[2rem] p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl bg-gradient-to-br ${stat.gradient} cursor-pointer active:scale-[0.99]`}
            onClick={() => setActiveStat(stat.id)}
          >
            {/* Background Decorative Circles */}
            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10 blur-2xl"></div>
            <div className="absolute -left-4 -bottom-4 w-20 h-20 rounded-full bg-black/5 blur-xl"></div>
            
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-2xl bg-white/20 backdrop-blur-sm text-white border border-white/10 shadow-inner`}>
                  {stat.icon}
                </div>
                {i === 2 && <div className="px-2 py-1 rounded-lg bg-white/20 text-white text-[10px] font-bold backdrop-blur-sm border border-white/10 flex items-center gap-1">
                  <TrendingUp size={12} /> +12%
                </div>}
              </div>
              
              <div className="mt-6">
                <p className={`text-3xl font-black tracking-tight ${stat.textColor} drop-shadow-sm`}>{stat.value}</p>
                <p className={`text-xs font-bold uppercase tracking-widest opacity-80 mt-1 ${stat.textColor}`}>{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Exhibition Schedule */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 h-full relative overflow-hidden group">
             {/* Decorative top bar */}
             <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <div className="flex items-center justify-between mb-8 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Activity size={18} className="text-blue-500" />
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Gallery Schedule</h3>
                </div>
                <p className="text-sm text-slate-500 font-medium">Live events, exhibitions, and showcases.</p>
              </div>
              {(currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.INVENTORY_PERSONNEL) && (
                <button 
                  onClick={onManageEvents}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-slate-50 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-all shadow-sm hover:shadow-md border border-slate-200 transform hover:-translate-y-0.5"
                >
                  View Calendar <ArrowRight size={14} />
                </button>
              )}
            </div>

            <div className="space-y-8 relative z-10">
              {events.filter(e => e.status !== EventStatus.RECENT).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                    <Box size={24} />
                  </div>
                  <p className="text-slate-900 font-bold">No Active Exhibitions</p>
                  <p className="text-slate-500 text-sm mt-1">Schedule a new event to get started.</p>
                </div>
              ) : (
                events.filter(e => e.status !== EventStatus.RECENT).map((event) => (
                  <div key={event.id} className="relative pl-8 before:absolute before:left-3 before:top-3 before:bottom-0 before:w-0.5 before:bg-slate-100 last:before:hidden">
                    {/* Timeline Dot */}
                    <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-white shadow-md z-10 ${
                      event.status === EventStatus.LIVE ? 'bg-emerald-500 ring-4 ring-emerald-500/20' : 'bg-blue-500'
                    }`}></div>

                    <div className="bg-slate-50/50 hover:bg-white p-5 rounded-3xl border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all duration-300 group/card">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-3">
                            <EventBadge status={event.status} />
                            <h4 className="text-lg font-bold text-slate-900 group-hover/card:text-blue-600 transition-colors">{event.title}</h4>
                          </div>
                          <p className="text-sm text-slate-500 font-medium flex items-center space-x-2">
                            <span className="bg-white px-2 py-1 rounded-xl border border-slate-100 text-xs shadow-sm">{event.location}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                              {new Date(event.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — {new Date(event.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        {event.artworkIds.slice(0, 4).map(artId => {
                          const art = artworks.find(a => a.id === artId);
                          return art ? (
                            <button 
                              key={artId}
                              onClick={() => onSelectArt(art.id)}
                              className="flex items-center space-x-3 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-100 p-1.5 pr-4 rounded-full transition-all group/art shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                            >
                              <img src={art.imageUrl} className="w-8 h-8 rounded-full object-cover ring-2 ring-white" alt="" />
                              <div className="text-left">
                                <p className="text-[11px] font-bold text-slate-700 group-hover/art:text-blue-600 line-clamp-1">{art.title}</p>
                              </div>
                            </button>
                          ) : null;
                        })}
                        {event.artworkIds.length > 4 && (
                          <div className="h-11 px-4 flex items-center justify-center bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 border border-slate-200">
                            +{event.artworkIds.length - 4} more
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Status Distribution & Recent Additions */}
        <div className="space-y-8">
          {/* Online Users Section */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
                Team Status
              </h3>
              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {teamStatus.filter(u => u.isOnline).length} Active
              </span>
            </div>
            <div className="space-y-3">
              {teamStatus.length === 0 ? (
                 <p className="text-sm text-slate-400">No other team members.</p>
              ) : (
                teamStatus.map(user => (
                  <div key={user.id} className="flex items-center space-x-3 p-3 hover:bg-slate-50 rounded-2xl transition-colors">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      {user.isOnline ? (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                      ) : (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-slate-400 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {user.name} {user.isMe && <span className="text-slate-400 font-normal ml-1">(You)</span>}
                      </p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        {user.role}
                        {user.branch && (
                          <>
                            <span className="text-slate-300 mx-1.5">•</span>
                            <span className="text-slate-400">{user.branch}</span>
                          </>
                        )}
                      </p>
                    </div>
                    {user.isOnline ? (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Online</span>
                    ) : (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full">
                        <Clock size={10} />
                        <span>{formatLastSeen(user.lastSeen)}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 h-[380px] flex flex-col relative overflow-hidden">
             <div className="absolute top-0 right-0 p-6 opacity-5">
               <Box size={100} />
             </div>
            <h3 className="text-sm font-black text-slate-800 mb-2 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-4 bg-indigo-500 rounded-full"></span>
              Distribution
            </h3>
            <div className="flex-1 -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    cornerRadius={10}
                    stroke="none"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
                Newest
              </h3>
              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Just In</span>
            </div>
            
            <div className="space-y-4">
              {artworks.slice(-3).reverse().map((art) => (
                <div 
                  key={art.id} 
                  onClick={() => onSelectArt(art.id)}
                  className="flex items-center space-x-4 p-3 hover:bg-slate-50 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md group border border-transparent hover:border-slate-100"
                >
                  <div className="relative">
                    <img src={art.imageUrl} alt={art.title} className="w-14 h-14 rounded-2xl object-cover shadow-sm group-hover:shadow-md transition-shadow" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 border-2 border-white rounded-full"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{art.title}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{art.artist}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {art.importPeriod && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[9px] font-black uppercase tracking-widest text-indigo-700">
                          Imported: {formatImportPeriod(art.importPeriod)}
                        </span>
                      )}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-[9px] font-black uppercase tracking-widest text-emerald-700">
                        Added: {new Date(art.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-emerald-600 mt-1.5">₱{art.price.toLocaleString()}</p>
                  </div>
                  <div className="p-2 rounded-full bg-slate-50 text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                    <ArrowRight size={14} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {activeStat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[85vh] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Stat Details
                </p>
                <h3 className="text-lg font-bold text-slate-900">
                  {activeStat === 'inventory' && 'Total Inventory'}
                  {activeStat === 'available' && 'Available Now'}
                  {activeStat === 'revenue' && 'Paintings Sold'}
                  {activeStat === 'inTransit' && 'In Transit'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {activeStat === 'revenue' && (
                  <button
                    onClick={() => {
                      onNavigateFromStat?.('sales');
                      setActiveStat(null);
                    }}
                    className="px-4 py-2 rounded-2xl text-xs font-bold text-amber-700 bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-all transform hover:-translate-y-0.5"
                  >
                    Open Sales View
                  </button>
                )}
                {activeStat !== 'revenue' && (
                  <button
                    onClick={() => {
                      onNavigateFromStat?.('inventory');
                      setActiveStat(null);
                    }}
                    className="px-4 py-2 rounded-2xl text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all transform hover:-translate-y-0.5"
                  >
                    Open Inventory View
                  </button>
                )}
                <button
                  onClick={() => setActiveStat(null)}
                  className="p-2 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {activeStat === 'inventory' && (
                <>
                  <p className="text-xs text-slate-500 mb-2">
                    Showing the latest inventory items.
                  </p>
                  {artworks.length === 0 ? (
                    <p className="text-sm text-slate-400">No artworks in inventory.</p>
                  ) : (
                    <div className="space-y-3">
                      {artworks.slice(-10).reverse().map(art => (
                        <div
                          key={art.id}
                          className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 cursor-pointer"
                          onClick={() => {
                            onSelectArt(art.id);
                            setActiveStat(null);
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={art.imageUrl}
                              alt={art.title}
                              className="w-10 h-10 rounded-xl object-cover"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900 truncate">
                                {art.title}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {art.artist} • {art.currentBranch}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-slate-500">
                              {art.status}
                            </p>
                            <p className="text-sm font-bold text-slate-900">
                              ₱{art.price.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeStat === 'available' && (
                <>
                  <p className="text-xs text-slate-500 mb-2">
                    Available artworks ready for sale.
                  </p>
                  {availableArtworks.length === 0 ? (
                    <p className="text-sm text-slate-400">No available artworks right now.</p>
                  ) : (
                    <div className="space-y-3">
                      {availableArtworks.slice(0, 10).map(art => (
                        <div
                          key={art.id}
                          className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 hover:bg-emerald-50/40 cursor-pointer"
                          onClick={() => {
                            onSelectArt(art.id);
                            setActiveStat(null);
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={art.imageUrl}
                              alt={art.title}
                              className="w-10 h-10 rounded-xl object-cover"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900 truncate">
                                {art.title}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {art.artist} • {art.currentBranch}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm font-bold text-emerald-600">
                            ₱{art.price.toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeStat === 'revenue' && (
                <>
                  <p className="text-xs text-slate-500 mb-2">
                    Recent paintings sold based on recorded sales.
                  </p>
                  {revenueDetails.length === 0 ? (
                    <p className="text-sm text-slate-400">No recorded sales yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {revenueDetails.slice(-10).reverse().map(({ sale, art }) => (
                        <div
                          key={sale.id}
                          className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 hover:bg-amber-50/40"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {art && (
                              <img
                                src={art.imageUrl}
                                alt={art.title}
                                className="w-10 h-10 rounded-xl object-cover"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900 truncate">
                                {art?.title || 'Artwork'}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {sale.clientName} • {new Date(sale.saleDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm font-bold text-amber-600">
                            ₱{(art?.price || 0).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeStat === 'inTransit' && (
                <>
                  <p className="text-xs text-slate-500 mb-2">
                    Items currently marked as in transit.
                  </p>
                  {inTransitArtworks.length === 0 ? (
                    <p className="text-sm text-slate-400">No artworks are in transit.</p>
                  ) : (
                    <div className="space-y-3">
                      {inTransitArtworks.slice(0, 10).map(art => (
                        <div
                          key={art.id}
                          className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 hover:bg-indigo-50/40 cursor-pointer"
                          onClick={() => {
                            onSelectArt(art.id);
                            setActiveStat(null);
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={art.imageUrl}
                              alt={art.title}
                              className="w-10 h-10 rounded-xl object-cover"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900 truncate">
                                {art.title}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                From {art.currentBranch}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs font-bold text-indigo-600">
                            {art.status}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const EventBadge: React.FC<{ status: EventStatus }> = ({ status }) => {
  const styles = {
    [EventStatus.LIVE]: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 border-transparent',
    [EventStatus.UPCOMING]: 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 border-transparent',
    [EventStatus.RECENT]: 'bg-slate-100 text-slate-500 border-slate-200',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[status]} flex items-center gap-1.5`}>
      {status === EventStatus.LIVE && <span className="inline-block w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>}
      {status}
    </span>
  );
};

export default Dashboard;
