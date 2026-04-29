
import React from 'react';
import { UserAccount, ActivityLog, UserRole, Artwork, UserPermissions, ArtworkStatus } from '../types';
import { X, Mail, Shield, Clock, Award, Briefcase, Activity } from 'lucide-react';
import { useMemo } from 'react';

interface ProfileModalProps {
  user: UserAccount;
  logs: ActivityLog[];
  artworks: Artwork[];
  permissions: UserPermissions;
  salesCount: number;
  inventoryCount: number;
  onClose: () => void;
  onClearCache: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, logs, artworks, permissions, salesCount, inventoryCount, onClose, onClearCache }) => {
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (!log.artworkId) return true; // System logs or non-artwork logs are visible
      
      const art = artworks.find(a => a.id === log.artworkId);
      if (!art) return true; // If artwork is deleted, we show the log (or maybe false? defaulting to true for now)

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
  }, [logs, artworks, permissions]);

  const imageDiagnostics = useMemo(() => {
    const offenders = artworks
      .filter(art => typeof art.imageUrl === 'string' && art.imageUrl.length > 0)
      .map(art => {
        const src = art.imageUrl || '';
        const isBase64 = src.startsWith('data:image');
        const approxBytes = isBase64
          ? Math.max(0, Math.floor((src.length - (src.indexOf(',') + 1)) * 0.75))
          : src.length;

        return {
          id: art.id,
          title: art.title,
          code: art.code,
          currentBranch: art.currentBranch,
          sourceType: isBase64 ? 'Base64' : 'URL',
          approxBytes
        };
      })
      .sort((a, b) => b.approxBytes - a.approxBytes);

    const base64Count = offenders.filter(item => item.sourceType === 'Base64').length;
    const totalApproxBytes = offenders.reduce((sum, item) => sum + item.approxBytes, 0);

    return {
      totalWithImages: offenders.length,
      base64Count,
      totalApproxBytes,
      topOffenders: offenders.slice(0, 5)
    };
  }, [artworks]);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-4 duration-300">
        <div className="relative h-32 bg-neutral-900 overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-neutral-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 bg-neutral-400/10 rounded-full blur-3xl"></div>
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all hover:scale-105 active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-10 pb-10 relative">
          {/* Avatar Monogram */}
          <div className="absolute -top-12 left-10 w-24 h-24 bg-white rounded-[2rem] p-1.5 shadow-xl">
            <div className="w-full h-full bg-neutral-900 rounded-[1.5rem] flex items-center justify-center text-3xl font-black text-white">
              {user.name ? user.name.charAt(0) : 'U'}
            </div>
          </div>

          <div className="pt-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h2 className="text-3xl font-black text-neutral-900 tracking-tight">{user.name}</h2>
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-1.5 text-neutral-500 text-sm font-medium">
                  <Mail size={14} className="opacity-50" />
                  <span>{user.email}</span>
                </div>
                <div className="h-4 w-px bg-neutral-200"></div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-2 h-2 rounded-full bg-neutral-500"></div>
                  <span className="text-xs font-black text-neutral-400 uppercase tracking-widest">{user.role}</span>
                </div>
              </div>
            </div>
            
            {/* Troubleshooting Button */}
            <div>
                <button
                    onClick={() => {
                        if (window.confirm("This will clear local data and refresh the page. Use this if you are experiencing sync issues. Continue?")) {
                            onClearCache();
                        }
                    }}
                    className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center gap-2"
                >
                    <Activity size={14} />
                    Reset Local Data
                </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
            <StatCard 
              label="Session ID" 
              value={user.id.toUpperCase()} 
              icon={<Shield size={18}/>} 
              color="text-neutral-900" 
            />
            {user.role === UserRole.SALES_AGENT || user.role === UserRole.ADMIN ? (
              <StatCard 
                label="Sales Closed" 
                value={salesCount} 
                icon={<Award size={18}/>} 
                color="text-neutral-600" 
              />
            ) : (
              <StatCard 
                label="Art Registered" 
                value={inventoryCount} 
                icon={<Briefcase size={18}/>} 
                color="text-neutral-600" 
              />
            )}
            <StatCard 
              label="System Logs" 
              value={logs.length} 
              icon={<Activity size={18}/>} 
              color="text-neutral-600" 
            />
          </div>

          <div className="mt-10 space-y-4">
            <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.25em] flex items-center">
              <Clock size={12} className="mr-2" /> Recent Authorized Activity
            </h3>
            <div className="bg-neutral-50 border border-neutral-100 rounded-2xl overflow-hidden">
              <div className="max-h-48 overflow-y-auto divide-y divide-neutral-100">
                {filteredLogs.length > 0 ? filteredLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="p-4 flex items-center justify-between group hover:bg-white transition-colors">
                    <div>
                      <p className="text-xs font-bold text-neutral-900">{log.action}</p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">{log.details || 'System event recorded'}</p>
                    </div>
                    <time className="text-[9px] font-bold text-neutral-300">{new Date(log.timestamp).toLocaleDateString()}</time>
                  </div>
                )) : (
                  <div className="p-8 text-center">
                    <p className="text-xs font-medium text-neutral-400 italic">No activity logs recorded for this session.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.25em] flex items-center">
              <Activity size={12} className="mr-2" /> Image Load Diagnostics
            </h3>

            <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <MiniStat label="With Images" value={imageDiagnostics.totalWithImages} />
                <MiniStat label="Base64 Sources" value={imageDiagnostics.base64Count} />
                <MiniStat label="Approx Payload" value={formatBytes(imageDiagnostics.totalApproxBytes)} />
              </div>

              {imageDiagnostics.topOffenders.length > 0 ? (
                <div className="space-y-2">
                  {imageDiagnostics.topOffenders.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-4 rounded-xl bg-white border border-neutral-100 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-neutral-900 truncate">{item.title}</p>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-1">
                          {item.code || 'No Code'} {item.currentBranch ? `• ${item.currentBranch}` : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] font-black text-neutral-900">{formatBytes(item.approxBytes)}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">{item.sourceType}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-medium text-neutral-400 italic">No loaded image records to inspect yet.</p>
              )}
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-neutral-100 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-pulse"></span>
              <span>Encrypted Personnel Connection</span>
            </div>
            <button className="text-xs font-bold text-neutral-500 hover:text-neutral-900 transition-colors uppercase tracking-widest">
              Security Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color }: { label: string, value: string | number, icon: React.ReactNode, color: string }) => (
  <div className="bg-neutral-50 border border-neutral-100 p-5 rounded-3xl flex flex-col justify-between h-28 hover:border-neutral-200 transition-colors">
    <div className={`p-2 rounded-xl bg-white border border-neutral-100 shadow-sm w-fit ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-lg font-black text-neutral-900 leading-tight">{value}</p>
      <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">{label}</p>
    </div>
  </div>
);

const MiniStat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-xl bg-white border border-neutral-100 px-4 py-3">
    <p className="text-lg font-black text-neutral-900 leading-tight">{value}</p>
    <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">{label}</p>
  </div>
);

export default ProfileModal;
