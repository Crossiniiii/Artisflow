
import React, { useState } from 'react';
import { ActivityLog, Artwork } from '../types';
import { Search, Filter, ShieldCheck, Clock, User, Download } from 'lucide-react';

interface AuditLogsPageProps {
  logs: ActivityLog[];
  artworks: Artwork[];
  onViewArtwork: (id: string) => void;
}

const AuditLogsPage: React.FC<AuditLogsPageProps> = ({ logs, artworks, onViewArtwork }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter(log => {
    const art = artworks.find(a => a.id === log.artworkId);
    return (
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      art?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      art?.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const exportAuditLogs = () => {
    const headers = ['Timestamp', 'Authorized User', 'Action', 'Artwork Ref', 'Details'];
    const rows = filteredLogs.map(log => {
      const art = artworks.find(a => a.id === log.artworkId);
      return [
        log.timestamp,
        `"${log.user.replace(/"/g, '""')}"`,
        log.action,
        art ? `${art.code}: ${art.title}` : 'System/Deleted',
        `"${(log.details || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ArtisFlow_AuditLog_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">System Audit Ledger</h1>
          <p className="text-sm text-slate-500">Immutable record of all user activities and inventory state changes.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search by user, action, or art code..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={exportAuditLogs}
            className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-md hover:shadow-lg font-bold group transform hover:-translate-y-0.5"
          >
            <Download size={18} className="group-hover:scale-110 transition-transform" />
            <span>Export</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized User</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action Executed</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Artwork Reference</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => {
                const art = artworks.find(a => a.id === log.artworkId);
                return (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2 text-slate-500">
                        <Clock size={14} className="opacity-50" />
                        <span className="text-xs font-medium">
                          {new Date(log.timestamp).toLocaleString(undefined, {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div 
                        className="flex items-center space-x-2 cursor-pointer hover:bg-slate-100 p-1.5 -ml-1.5 rounded-lg transition-colors group/user"
                        onClick={() => setSearchTerm(log.user)}
                        title="Filter by this user"
                      >
                        <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[10px] font-black text-emerald-600 group-hover/user:bg-emerald-100 transition-colors">
                          {log.user.charAt(0)}
                        </div>
                        <span className="text-sm font-bold text-slate-700 group-hover/user:text-emerald-700 transition-colors">{log.user}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span 
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border cursor-pointer hover:shadow-sm transition-all hover:scale-105 active:scale-95 inline-block ${
                        log.action.includes('Sale') ? 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100' :
                        log.action.includes('Transferred') ? 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100' :
                        log.action.includes('Created') ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' :
                        log.action.includes('Cancelled') ? 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100' :
                        'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'
                      }`}
                        onClick={() => setSearchTerm(log.action)}
                        title="Filter by this action"
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {art ? (
                        <div 
                          className="flex items-center space-x-2 cursor-pointer hover:bg-indigo-50 p-1.5 -ml-1.5 rounded-lg transition-colors group/art"
                          onClick={() => onViewArtwork(art.id)}
                          title="View artwork details"
                        >
                          <img src={art.imageUrl} className="w-6 h-6 rounded-md object-cover shadow-sm group-hover/art:ring-2 ring-indigo-200 transition-all" alt="" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate group-hover/art:text-indigo-700 transition-colors">{art.title}</p>
                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{art.code}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Reference Deleted</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-500 leading-relaxed max-w-xs truncate" title={log.details}>
                        {log.details || '—'}
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {filteredLogs.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4 border border-slate-100">
              <ShieldCheck size={32} />
            </div>
            <p className="text-slate-400 font-bold text-sm">No activity logs match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogsPage;
