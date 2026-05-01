
import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Artwork, SaleRecord, ArtworkStatus, ExhibitionEvent, EventStatus, UserAccount, UserRole } from '../types';
import { ICONS } from '../constants';
import { PieChart, Pie, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { TrendingUp, ArrowRight, Activity, Box, Sparkles, Clock } from 'lucide-react';
import { supabase } from '../supabase';
import { OptimizedImage } from '../components/OptimizedImage';

interface DashboardProps {
  artworks: Artwork[];
  sales: SaleRecord[];
  events: ExhibitionEvent[];
  isLoadingEvents?: boolean;
  isLoadingArtworks?: boolean;
  accounts: UserAccount[];
  onSelectArt: (id: string) => void;
  onManageEvents: () => void;
  onNavigateFromStat?: (target: 'sales' | 'operations' | 'reservations') => void;
  currentUser?: UserAccount | null;
}

const Dashboard: React.FC<DashboardProps> = ({ artworks, sales, events, isLoadingEvents, isLoadingArtworks, accounts, onSelectArt, onManageEvents, onNavigateFromStat, currentUser }) => {
  const [activeStat, setActiveStat] = useState<'inventory' | 'sold' | 'reserved' | 'revenue' | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000); // Update every 30s
    return () => clearInterval(timer);
  }, [artworks, sales, events, currentUser]);

  const completedSales = useMemo(
    () => (sales || []).filter(sale => !sale.isCancelled),
    [sales]
  );

  const formatImportPeriod = (p?: string) => {
    if (!p) return '';
    const parts = p.split('-');
    if (parts.length < 2) return p;
    const y = parts[0];
    const m = Math.max(1, Math.min(12, parseInt(parts[1], 10)));
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[m - 1]} ${y}`;
  };

  const permissions = currentUser?.permissions;

  const filteredArtworks = useMemo(() => {
    return (artworks || []).filter(art => {
      // Filter out invalid/ghost artworks
      if (!art.id || !art.title) return false;

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

  const soldArtworks = useMemo(
    () => filteredArtworks.filter(a => a.status === ArtworkStatus.SOLD || a.status === ArtworkStatus.DELIVERED),
    [filteredArtworks]
  );

  const totalInventory = filteredArtworks.length;
  const totalSold = soldArtworks.length;
  const totalReserved = filteredArtworks.filter(a => a.status === ArtworkStatus.RESERVED).length;
  const totalGrossRevenue = soldArtworks.reduce((sum, art) => sum + (art.price || 0), 0);

  const totalCollectedRevenue = useMemo(() => {
    const salesMap = new Map(completedSales.map(s => [s.artworkId, s]));
    return soldArtworks.reduce((sum, art) => {
      const sale = salesMap.get(art.id);
      if (!sale) return sum + (art.price || 0); // Assume fully paid if no sale record
      
      // If not a downpayment sale and approved, it's a full payment
      if (sale.status === 'Approved' && !sale.isDownpayment) {
        return sum + (art.price || 0);
      }
      
      // Only include approved downpayments if the sale is approved
      const basePaid = sale.status === 'Approved' ? (sale.downpayment || 0) : 0;
      
      // Only include verified installments
      const totalInstallments = (sale.installments || []).filter(i => !i.isPending).reduce((s, i) => s + i.amount, 0);
      
      return sum + basePaid + totalInstallments;
    }, 0);
  }, [soldArtworks, completedSales]);

  const stats = [
    {
      id: 'inventory' as const,
      label: 'Total Inventory',
      value: totalInventory,
      icon: ICONS.Inventory,
      gradient: 'from-black to-neutral-900',
      shadow: 'shadow-neutral-200',
      textColor: 'text-white',
      target: 'inventory' as const
    },
    {
      id: 'sold' as const,
      label: 'Total Sold',
      value: totalSold.toLocaleString(),
      icon: ICONS.Sales,
      gradient: 'from-neutral-900 to-neutral-900',
      shadow: 'shadow-neutral-200',
      textColor: 'text-white',
      target: 'sales' as const
    },
    {
      id: 'reserved' as const,
      label: 'Total Reserved',
      value: totalReserved,
      icon: <Clock size={24} className="text-neutral-900" />,
      gradient: 'from-neutral-900 to-neutral-900',
      shadow: 'shadow-neutral-200',
      textColor: 'text-white',
      target: 'inventory' as const
    },
    {
      id: 'revenue' as const,
      label: 'Gross Sales',
      value: `₱${totalGrossRevenue.toLocaleString()}`,
      subValue: `₱${totalCollectedRevenue.toLocaleString()} Collected`,
      icon: <TrendingUp size={24} className="text-neutral-900" />,
      gradient: 'from-neutral-700 to-neutral-600',
      shadow: 'shadow-neutral-200',
      textColor: 'text-white',
      target: 'sales' as const
    },
  ];

  const displayName = useMemo(
    () => currentUser?.firstName || currentUser?.fullName || currentUser?.name || 'there',
    [currentUser]
  );

  const reservedArtworks = useMemo(
    () => filteredArtworks.filter(a => a.status === ArtworkStatus.RESERVED),
    [filteredArtworks]
  );

  const revenueDetails = useMemo(
    () => {
      // Create a map for faster lookup (O(N) instead of O(N^2))
      const salesMap = new Map(completedSales.map(s => [s.artworkId, s]));

      // Map sold artworks to include sale details if available
      return soldArtworks.map(art => {
        const sale = salesMap.get(art.id);
        return { art, sale };
      });
    },
    [soldArtworks, completedSales]
  );

  const [userPresence, setUserPresence] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!currentUser) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    const timer = window.setTimeout(() => {
      channel = supabase.channel('online-users', {
        config: {
          presence: {
            key: currentUser.id,
          },
        },
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel!.presenceState();
          const presenceMap: Record<string, any> = {};
          Object.keys(state).forEach((key) => {
            const presenceEntry = state[key][0];
            presenceMap[key] = presenceEntry;
          });
          setUserPresence(presenceMap);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel!.track({
              id: currentUser.id,
              name: currentUser.name || currentUser.fullName || 'User',
              state: 'online',
              last_changed: Date.now(),
            });
          }
        });
    }, 2000);

    return () => {
      window.clearTimeout(timer);
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [currentUser]);

  const teamStatus = useMemo(() => {
    return (accounts || [])
      .map(acc => {
        const presence = userPresence[acc.id];
        const isMe = currentUser?.id === acc.id;
        const lastSeen = presence?.last_changed || (acc.lastLogin ? new Date(acc.lastLogin).getTime() : null);

        // Consider online if explicitly online OR seen within the last minute
        const isOnline = isMe || presence?.state === 'online' || (lastSeen && (now - lastSeen < 60000));

        return { ...acc, isOnline, lastSeen, isMe };
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
  }, [accounts, currentUser, userPresence, now]);

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

  const parseReservationDetails = (remarks?: string) => {
    if (!remarks) return null;
    const parts = remarks.split('|').map(p => p.trim());
    const targetPart = parts.find(p => p.toLowerCase().startsWith('target:'));
    return targetPart ? targetPart.substring(7).trim() : null;
  };

  const statusData = [
    { name: 'Available', value: filteredArtworks.filter(a => a.status === ArtworkStatus.AVAILABLE).length },
    { name: 'Reserved', value: reservedArtworks.length },
    { name: 'Sold', value: soldArtworks.length },
  ];

  const COLORS = ['#0a0a0a', '#525252', '#a3a3a3'];

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="relative overflow-hidden rounded-md bg-white p-[1px] shadow-sm border border-neutral-200">
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white text-neutral-900 rounded-md px-8 py-7">
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <div className="absolute -right-20 -top-24 w-64 h-64 bg-neutral-100 blur-3xl rounded-full" />
            <div className="absolute -left-16 -bottom-24 w-72 h-72 bg-neutral-100 blur-3xl rounded-full" />
          </div>
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center space-x-2 rounded-sm bg-neutral-100 px-3 py-1 border border-neutral-200 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">
              <Sparkles size={12} />
              <span>Gallery Intelligence</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-neutral-900">
              Hi, {displayName}
            </h1>
            <p className="text-sm md:text-base text-neutral-500 max-w-xl">
              Here&apos;s what&apos;s happening across your collection, branches, and sales today.
            </p>
            <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
              <button 
                onClick={() => setActiveStat('inventory')}
                className="inline-flex items-center px-2.5 py-1 rounded-sm bg-neutral-100 border border-neutral-200 text-neutral-700 font-bold uppercase tracking-wider transition-all hover:bg-neutral-200 hover:scale-105 active:scale-95 cursor-pointer"
              >
                {totalInventory} in catalog
              </button>
              <button 
                onClick={() => setActiveStat('sold')}
                className="inline-flex items-center px-2.5 py-1 rounded-sm bg-neutral-900 border border-neutral-700 text-white font-bold uppercase tracking-wider transition-all hover:bg-black hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white mr-1.5 animate-pulse" />
                {totalSold} sold
              </button>
              <button 
                onClick={() => setActiveStat('reserved')}
                className="inline-flex items-center px-2.5 py-1 rounded-sm bg-neutral-100 border border-neutral-200 text-neutral-600 font-bold uppercase tracking-wider transition-all hover:bg-neutral-200 hover:scale-105 active:scale-95 cursor-pointer"
              >
                {totalReserved} reserved
              </button>
              <button 
                onClick={() => setActiveStat('revenue')}
                className="inline-flex items-center px-2.5 py-1 rounded-sm bg-neutral-100 border border-neutral-200 text-neutral-600 font-bold uppercase tracking-wider transition-all hover:bg-neutral-200 hover:scale-105 active:scale-95 cursor-pointer"
              >
                ₱{totalCollectedRevenue.toLocaleString()} collected
              </button>
            </div>
          </div>
          <div className="relative z-10 flex flex-col items-end gap-3">
            <div className="text-right">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Today&apos;s Date</p>
              <p className="text-xs md:text-sm font-bold text-neutral-900">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="inline-flex items-center space-x-2 rounded-sm bg-emerald-600 px-3 py-1 border border-emerald-500 text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>Dashboard Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-[1512px]:gap-4"
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
      >
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            className={`relative overflow-hidden rounded-md p-6 max-[1512px]:p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md bg-gradient-to-br ${stat.gradient} cursor-pointer active:scale-[0.99] group border border-neutral-200`}
            onClick={() => setActiveStat(stat.id)}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 }
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Background Decorative Circles */}
            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-neutral-100 blur-2xl opacity-50"></div>
            <div className="absolute -left-4 -bottom-4 w-20 h-20 rounded-full bg-neutral-50 blur-xl opacity-50"></div>

            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-sm bg-white text-neutral-900 border border-neutral-100 shadow-sm`}>
                  {stat.icon}
                </div>
                {i === 2 && <div className="px-2 py-1 rounded-sm bg-neutral-100 text-neutral-600 text-[10px] font-bold border border-neutral-200 flex items-center gap-1">
                  <TrendingUp size={12} /> +12%
                </div>}
              </div>

              <div className="mt-6">
                <p className={`text-3xl font-black tracking-tight ${stat.textColor} drop-shadow-sm`}>{stat.value}</p>
                <div className="flex justify-between items-center mt-1">
                  <p className={`text-xs font-bold uppercase tracking-widest opacity-60 ${stat.textColor}`}>{stat.label}</p>
                  {(stat as any).subValue && (
                    <p className={`text-[10px] font-black uppercase tracking-widest bg-white/20 px-1.5 py-0.5 rounded ${stat.textColor}`}>
                      {(stat as any).subValue}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Exhibition Schedule */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-md border border-neutral-200 shadow-sm h-full relative overflow-hidden group">
            {/* Decorative top bar */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-neutral-700 via-neutral-900 to-neutral-900 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <div className="flex items-center justify-between mb-8 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Activity size={18} className="text-neutral-900" />
                  <h3 className="text-xl font-black text-neutral-900 tracking-tight">Gallery Schedule</h3>
                </div>
                <p className="text-sm text-neutral-500 font-medium">Live events, exhibitions, and showcases.</p>
              </div>
              {(currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.INVENTORY_PERSONNEL) && (
                <button
                  onClick={onManageEvents}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-sm bg-neutral-50 text-neutral-700 text-xs font-bold hover:bg-neutral-100 transition-all shadow-sm hover:shadow-md border border-neutral-200 transform hover:-translate-y-0.5"
                >
                  View Calendar <ArrowRight size={14} />
                </button>
              )}
            </div>

            <div className="space-y-8 relative z-10">
              {(isLoadingEvents || isLoadingArtworks) && events.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                  <div className="w-10 h-10 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin"></div>
                  <p className="text-neutral-500 text-sm font-medium">Synchronizing gallery schedule...</p>
                </div>
              ) : (() => {
                const activeEvents = (events || []).filter(e => {
                  if (e.status === EventStatus.RECENT) return false;
                  // Dynamic filter if dates are provided and not timeless
                  if (e.endDate && !e.isTimeless) {
                    const end = new Date(e.endDate);
                    end.setHours(23, 59, 59, 999);
                    if (now > end.getTime()) {
                      // Only hide if it's strictly enforced or if it's very old
                      if (e.isStrictDuration || (now - end.getTime() > 7 * 24 * 60 * 60 * 1000)) {
                        return false;
                      }
                    }
                  }
                  return true;
                });

                if (activeEvents.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-16 text-center bg-neutral-50/50 rounded-md border border-dashed border-neutral-200">
                      <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4 text-neutral-400">
                        <Box size={24} />
                      </div>
                      <p className="text-neutral-900 font-bold">No Active Exhibitions</p>
                      <p className="text-neutral-500 text-sm mt-1">Schedule a new event to get started.</p>
                    </div>
                  );
                }

                return activeEvents.map((event) => (
                  <div key={event.id} className="relative pl-8 before:absolute before:left-3 before:top-3 before:bottom-0 before:w-0.5 before:bg-neutral-100 last:before:hidden">
                    {/* Timeline Dot */}
                    <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-white shadow-md z-10 ${event.status === EventStatus.LIVE ? 'bg-neutral-900 ring-4 ring-neutral-900/20' : 'bg-emerald-500'
                      }`}></div>

                    <div className="bg-neutral-50/50 hover:bg-white p-5 rounded-md border border-neutral-100 hover:border-neutral-200 hover:shadow-lg transition-all duration-300 group/card">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-3">
                            <EventBadge status={event.status} />
                            <h4 className="text-lg font-bold text-neutral-900 group-hover/card:text-neutral-600 transition-colors">{event.title}</h4>
                          </div>
                          <p className="text-sm text-neutral-500 font-medium flex items-center space-x-2">
                            <span className="bg-white px-2 py-1 rounded-sm border border-neutral-100 text-xs shadow-sm">{event.location}</span>
                            <span className="text-neutral-300">•</span>
                            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wide">
                              {new Date(event.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              {event.isTimeless ? ' — Indefinite' : ` — ${new Date(event.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        {event.artworkIds.slice(0, 4).map(artId => {
                          const art = (filteredArtworks || []).find(a => a.id === artId);
                          return art ? (
                            <button
                              key={artId}
                              onClick={() => onSelectArt(art.id)}
                              className="flex items-center space-x-3 bg-white hover:bg-neutral-100 border border-neutral-200 hover:border-neutral-300 p-1 pr-4 rounded-sm transition-all group/art shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                            >
                              <OptimizedImage
                                src={art.imageUrl}
                                className="w-8 h-8 rounded-md object-cover ring-2 ring-white"
                                alt={art.title}
                              />
                              <div className="text-left">
                                <p className="text-[11px] font-bold text-neutral-700 group-hover/art:text-neutral-900 line-clamp-1">{art.title}</p>
                              </div>
                            </button>
                          ) : null;
                        })}
                        {event.artworkIds.length > 4 && (
                          <div className="h-11 px-4 flex items-center justify-center bg-neutral-100 rounded-sm text-[10px] font-bold text-neutral-500 border border-neutral-200">
                            +{event.artworkIds.length - 4} more
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              })()}
            </div>
          </div>
        </div>

        {/* Status Distribution & Recent Additions */}
        <div className="space-y-8">
          {/* Online Users Section */}
          <div className="bg-white p-6 rounded-md border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-neutral-900 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-4 bg-neutral-900 rounded-full"></span>
                Team Status
              </h3>
              <span className="bg-neutral-100 text-neutral-700 text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider flex items-center gap-1 border border-neutral-200">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-pulse"></span>
                {teamStatus.filter(u => u.isOnline).length} Active
              </span>
            </div>
            <div className="space-y-3">
              {teamStatus.length === 0 ? (
                <p className="text-sm text-neutral-400">No other team members.</p>
              ) : (
                teamStatus.map(user => (
                  <div key={user.id} className="flex items-center space-x-3 p-3 hover:bg-neutral-50 rounded-md transition-colors">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      {user.isOnline ? (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                      ) : (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-neutral-400 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-neutral-900 truncate">
                        {user.name} {user.isMe && <span className="text-neutral-400 font-normal ml-1">(You)</span>}
                      </p>
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide">
                        {user.role}
                        {user.branch && (
                          <>
                            <span className="text-neutral-300 mx-1.5">•</span>
                            <span className="text-neutral-400">{user.branch}</span>
                          </>
                        )}
                      </p>
                    </div>
                    {user.isOnline ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-sm">Online</span>
                    ) : (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-neutral-400 bg-neutral-50 px-2 py-1 rounded-sm">
                        <Clock size={10} />
                        <span>{formatLastSeen(user.lastSeen)}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-md border border-neutral-200 shadow-sm h-[380px] flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5">
              <Box size={100} />
            </div>
            <h3 className="text-sm font-black text-neutral-900 mb-2 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-4 bg-neutral-500 rounded-full"></span>
              Distribution
            </h3>
            <div className="flex-1 w-full min-h-[250px] relative">
              <div className="absolute inset-0">
                {statusData.some(d => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {statusData.map((_, index) => (
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
                        wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#525252' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-neutral-400 text-xs font-bold">
                    No data to visualize
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-md border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-neutral-900 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-4 bg-neutral-900 rounded-full"></span>
                Newest
              </h3>
              <span className="bg-neutral-100 text-neutral-700 text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider border border-neutral-200">Just In</span>
            </div>

            <div className="space-y-4">
              {(artworks || []).slice(-3).reverse().map((art) => (
                <div
                  key={art.id}
                  onClick={() => onSelectArt(art.id)}
                  className="flex items-center space-x-4 p-3 hover:bg-neutral-50 rounded-md cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md group border border-transparent hover:border-neutral-100"
                >
                  <div className="relative">
                    <OptimizedImage
                      src={art.imageUrl}
                      alt={art.title}
                      className="w-14 h-14 rounded-md object-cover shadow-sm group-hover:shadow-md transition-shadow"
                    />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-neutral-900 border-2 border-white rounded-full"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-neutral-900 truncate group-hover:text-neutral-600 transition-colors">{art.title}</p>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-0.5">{art.artist}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {art.importPeriod && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-neutral-50 border border-neutral-200 text-[9px] font-black uppercase tracking-widest text-neutral-600">
                          Imported: {formatImportPeriod(art.importPeriod)}
                        </span>
                      )}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-neutral-100 border border-neutral-200 text-[9px] font-black uppercase tracking-widest text-neutral-900">
                        Added: {new Date(art.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-neutral-900 mt-1.5">₱{(art.price || 0).toLocaleString()}</p>
                  </div>
                  <div className="p-2 rounded-sm bg-neutral-50 text-neutral-300 group-hover:bg-neutral-200 group-hover:text-neutral-900 transition-colors">
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
          <div className="bg-white rounded-md w-full max-w-3xl max-h-[85vh] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">
                  Stat Details
                </p>
                <h3 className="text-lg font-bold text-neutral-900">
                  {activeStat === 'inventory' && 'Total Inventory'}
                  {activeStat === 'sold' && 'Total Sold'}
                  {activeStat === 'reserved' && 'Total Reserved'}
                  {activeStat === 'revenue' && 'Total Revenue'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {(activeStat === 'revenue' || activeStat === 'sold') && (
                  <button
                    onClick={() => {
                      onNavigateFromStat?.('sales');
                      setActiveStat(null);
                    }}
                    className="px-4 py-2 rounded-md text-xs font-bold text-neutral-700 bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 transition-all transform hover:-translate-y-0.5"
                  >
                    Open Sales View
                  </button>
                )}
                {activeStat === 'reserved' && (
                  <button
                    onClick={() => {
                      onNavigateFromStat?.('reservations');
                      setActiveStat(null);
                    }}
                    className="px-4 py-2 rounded-md text-xs font-bold text-neutral-700 bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 transition-all transform hover:-translate-y-0.5"
                  >
                    Open Reservation View
                  </button>
                )}
                {activeStat === 'inventory' && (
                  <button
                    onClick={() => {
                      onNavigateFromStat?.('operations');
                      setActiveStat(null);
                    }}
                    className="px-4 py-2 rounded-md text-xs font-bold text-neutral-700 bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 transition-all transform hover:-translate-y-0.5"
                  >
                    Open Gallery Operations
                  </button>
                )}
                <button
                  onClick={() => setActiveStat(null)}
                  className="p-2 rounded-full bg-neutral-50 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
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
                  <p className="text-xs text-neutral-500 mb-2">
                    Showing the latest inventory items.
                  </p>
                  {filteredArtworks.length === 0 ? (
                    <p className="text-sm text-neutral-400">No artworks in inventory.</p>
                  ) : (
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                      {filteredArtworks.slice().reverse().slice(0, 20).map(art => (
                        <div
                          key={art.id}
                          className="flex items-center justify-between p-3 rounded-md border border-neutral-100 hover:bg-neutral-50 cursor-pointer"
                          onClick={() => {
                            onSelectArt(art.id);
                            setActiveStat(null);
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <OptimizedImage
                              src={art.imageUrl}
                              alt={art.title}
                              className="w-10 h-10 rounded-sm object-cover"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-neutral-900 truncate">
                                {art.title}
                              </p>
                              <p className="text-[11px] text-neutral-500 truncate">
                                {art.artist} • {art.currentBranch}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-neutral-500">
                              {art.status}
                            </p>
                            <p className="text-sm font-bold text-neutral-900">
                              ₱{(art.price || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeStat === 'sold' && (
                <>
                  <p className="text-xs text-neutral-500 mb-2">
                    Recently sold artworks.
                  </p>
                  {soldArtworks.length === 0 ? (
                    <p className="text-sm text-neutral-400">No sold artworks found.</p>
                  ) : (
                    <div className="space-y-3">
                      {soldArtworks.slice(0, 20).map(art => (
                        <div
                          key={art.id}
                          className="flex items-center justify-between p-3 rounded-md border border-neutral-100 hover:bg-neutral-50/40 cursor-pointer"
                          onClick={() => {
                            onSelectArt(art.id);
                            setActiveStat(null);
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <OptimizedImage
                              src={art.imageUrl}
                              alt={art.title}
                              className="w-10 h-10 rounded-sm object-cover"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-neutral-900 truncate">
                                {art.title}
                              </p>
                              <p className="text-[11px] text-neutral-500 truncate">
                                {art.artist} • {art.currentBranch}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm font-bold text-neutral-700">
                            ₱{(art.price || 0).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeStat === 'revenue' && (
                <>
                  <p className="text-xs text-neutral-500 mb-2">
                    Recent sales revenue details.
                  </p>
                  {revenueDetails.length === 0 ? (
                    <p className="text-sm text-neutral-400">No recorded sales yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {revenueDetails.slice().reverse().slice(0, 20).map(({ sale, art }) => (
                        <div
                          key={art?.id || Math.random()}
                          className="flex items-center justify-between p-3 rounded-md border border-neutral-100 hover:bg-neutral-50/40"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {art && (
                              <OptimizedImage
                                src={art.imageUrl}
                                alt={art.title}
                                className="w-10 h-10 rounded-sm object-cover"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-neutral-900 truncate">
                                {art?.title || 'Artwork'}
                              </p>
                              <p className="text-[11px] text-neutral-500 truncate">
                                {sale ? (
                                  <>
                                    {sale.clientName} • {new Date(sale.saleDate).toLocaleDateString()}
                                  </>
                                ) : (
                                  <>
                                    {art?.artist} • {art?.status}
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm font-bold text-neutral-700">
                            ₱{(art?.price || 0).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeStat === 'reserved' && (
                <>
                  <p className="text-xs text-neutral-500 mb-2">
                    Artworks currently reserved.
                  </p>
                  {reservedArtworks.length === 0 ? (
                    <p className="text-sm text-neutral-400">No reserved artworks.</p>
                  ) : (
                    <div className="space-y-3">
                      {reservedArtworks.slice(0, 20).map(art => {
                        const reservationTarget = parseReservationDetails(art.remarks) || art.reservedForEventName;

                        return (
                          <div
                            key={art.id}
                            className="flex items-center justify-between p-3 rounded-md border border-neutral-100 hover:bg-neutral-50/40 cursor-pointer"
                            onClick={() => {
                              onSelectArt(art.id);
                              setActiveStat(null);
                            }}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <OptimizedImage
                                src={art.imageUrl}
                                alt={art.title}
                                className="w-10 h-10 rounded-sm object-cover"
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-neutral-900 truncate">
                                  {art.title}
                                </p>
                                <p className="text-[11px] text-neutral-500 truncate">
                                  {art.artist} • {art.currentBranch}
                                </p>
                                {reservationTarget && (
                                  <p className="text-[10px] font-bold text-neutral-700 truncate mt-0.5 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-pulse"></span>
                                    Reserved for: {reservationTarget}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold border border-orange-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-1.5 animate-pulse"></span>
                              {art.status}
                            </span>
                          </div>
                        )
                      })}
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
    [EventStatus.LIVE]: 'bg-neutral-900 text-white shadow-lg shadow-neutral-900/30 border-transparent',
    [EventStatus.UPCOMING]: 'bg-neutral-700 text-white shadow-lg shadow-neutral-700/30 border-transparent',
    [EventStatus.RECENT]: 'bg-neutral-100 text-neutral-500 border-neutral-200',
    [EventStatus.CLOSED]: 'bg-neutral-200 text-neutral-600 border-neutral-300',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[status]} flex items-center gap-1.5 whitespace-nowrap`}>
      {status === EventStatus.LIVE && <span className="inline-block w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>}
      {status}
    </span>
  );
};

export default Dashboard;
