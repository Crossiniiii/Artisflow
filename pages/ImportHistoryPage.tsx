import React, { useState } from 'react';
import { ImportRecord } from '../types';
import { Search, FileSpreadsheet, Clock, Download, CheckCircle, AlertCircle, HelpCircle, ShieldCheck, ShieldAlert } from 'lucide-react';

interface ImportHistoryPageProps {
  logs: ImportRecord[];
  preventDuplicates: boolean;
  onTogglePreventDuplicates: (val: boolean) => void;
}

const ImportHistoryPage: React.FC<ImportHistoryPageProps> = ({ logs, preventDuplicates, onTogglePreventDuplicates }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter(log => {
    return (
      log.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.importedBy.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const exportImportLogs = () => {
    const headers = ['Timestamp', 'Filename', 'Imported By', 'Record Count', 'Status', 'Details'];
    const rows = filteredLogs.map(log => {
      return [
        log.timestamp,
        `"${log.filename}"`,
        `"${log.importedBy}"`,
        log.recordCount,
        log.status,
        `"${(log.details || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ArtisFlow_ImportHistory_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Import History</h1>
          <p className="text-sm text-slate-500">Track all Excel/CSV file imports and their status.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div 
            onClick={() => onTogglePreventDuplicates(!preventDuplicates)}
            className={`flex items-center space-x-2 px-6 py-3 rounded-2xl border cursor-pointer transition-all select-none shadow-sm hover:shadow-md transform hover:-translate-y-0.5 ${
              preventDuplicates 
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {preventDuplicates ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
            <span className="text-sm font-bold">
              {preventDuplicates ? 'Duplicates Blocked' : 'Allow Duplicates'}
            </span>
            <div className={`w-8 h-4 rounded-full relative transition-colors ml-2 ${preventDuplicates ? 'bg-indigo-500' : 'bg-slate-300'}`}>
               <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${preventDuplicates ? 'left-[18px]' : 'left-0.5'}`} />
            </div>
          </div>

          <div className="relative w-full md:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search by filename or user..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={exportImportLogs}
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
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Filename</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Imported By</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Records</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => {
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
                      <div className="flex items-center space-x-2">
                        <FileSpreadsheet size={16} className="text-emerald-600" />
                        <span className="text-sm font-bold text-slate-700">{log.filename}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-600">{log.importedBy}</span>
                    </td>
                     <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-900">{log.recordCount}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border flex w-fit items-center gap-1 ${
                        log.status === 'Success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        log.status === 'Partial' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        'bg-rose-50 text-rose-600 border-rose-100'
                      }`}>
                        {log.status === 'Success' && <CheckCircle size={10} />}
                        {log.status === 'Partial' && <HelpCircle size={10} />}
                        {log.status === 'Failed' && <AlertCircle size={10} />}
                        {log.status}
                      </span>
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
              <FileSpreadsheet size={32} />
            </div>
            <p className="text-slate-400 font-bold text-sm">No import history matches your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportHistoryPage;
