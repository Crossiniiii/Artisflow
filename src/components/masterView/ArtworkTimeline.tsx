import React from 'react';
import {
  Artwork,
  ActivityLog,
  SaleRecord
} from '../../types';
import { ChevronDown } from 'lucide-react';

interface ArtworkTimelineProps {
  timelineView: 'activity' | 'transfers' | 'payments';
  setTimelineView: React.Dispatch<React.SetStateAction<'activity' | 'transfers' | 'payments'>>;
  activityFilter: string;
  setActivityFilter: React.Dispatch<React.SetStateAction<string>>;
  sale?: SaleRecord;
  effectiveLogs: ActivityLog[];
  transferLogs: ActivityLog[];
  setSelectedLog: React.Dispatch<React.SetStateAction<ActivityLog | null>>;
  setShowLogDetails: React.Dispatch<React.SetStateAction<boolean>>;
  artwork: Artwork;
}

export const ArtworkTimeline: React.FC<ArtworkTimelineProps> = ({
  timelineView,
  setTimelineView,
  activityFilter,
  setActivityFilter,
  sale,
  effectiveLogs,
  transferLogs,
  setSelectedLog,
  setShowLogDetails,
  artwork
}) => {
  return (
    <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-md border border-neutral-200 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center space-x-3">
          <h3 className="text-xl font-bold text-neutral-900">Artwork History</h3>
          <span className="text-xs font-normal text-neutral-400">(Audit Trail)</span>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {timelineView === 'activity' && (
            <div className="relative w-full sm:w-auto">
              <select
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
                className="w-full sm:w-auto appearance-none bg-neutral-50 border border-neutral-200 text-neutral-600 text-[11px] font-bold uppercase tracking-widest rounded-sm px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
              >
                <option value="All">All Activity</option>
                <option value="Sale">Sales</option>
                <option value="Reservation">Reservations</option>
                <option value="Transfer">Transfers</option>
                <option value="Edit">Edits</option>
                <option value="Payment">Payments</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            </div>
          )}
          <div className="flex p-1 bg-neutral-100 rounded-sm w-full sm:w-auto">
            <button
              onClick={() => setTimelineView('activity')}
              className={`flex-1 sm:flex-none px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-sm transition-all transform duration-200 ${timelineView === 'activity' ? 'bg-white text-neutral-900 shadow-md scale-105' : 'text-neutral-400 hover:text-neutral-600'
                }`}
            >
              Activity
            </button>
            <button
              onClick={() => setTimelineView('transfers')}
              className={`flex-1 sm:flex-none px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-sm transition-all transform duration-200 ${timelineView === 'transfers' ? 'bg-white text-neutral-900 shadow-md scale-105' : 'text-neutral-400 hover:text-neutral-600'
                }`}
            >
              History Transfer
            </button>
            {sale && (
              <button
                onClick={() => setTimelineView('payments')}
                className={`flex-1 sm:flex-none px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-sm transition-all transform duration-200 ${timelineView === 'payments' ? 'bg-white text-neutral-900 shadow-md scale-105' : 'text-neutral-400 hover:text-neutral-600'
                  }`}
              >
                Payments
              </button>
            )}
          </div>
        </div>
      </div>
      {timelineView === 'activity' && (
        <div className="space-y-6">
          {effectiveLogs.map((log) => (
            <div
              key={log.id}
              onClick={() => {
                setSelectedLog(log);
                setShowLogDetails(true);
              }}
              className="relative pl-8 pb-6 last:pb-0 border-l-2 border-neutral-100 group hover:bg-neutral-50 cursor-pointer rounded-r-md transition-all duration-200 pr-4"
            >
              <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-sm border-2 border-white shadow-sm transition-transform group-hover:scale-110 ${
                (log.action.includes('Sale') || log.action.includes('Sold') || log.action.includes('Declined')) ? 'bg-red-600' :
                (log.action.includes('Delivered') || log.action.includes('Accepted') || log.action.includes('Approved')) ? 'bg-emerald-500' :
                log.action.includes('Transfer') ? 'bg-indigo-500' :
                log.action.includes('Reserved') ? 'bg-amber-500' :
                log.action.includes('Submitted') ? 'bg-amber-400' :
                log.action.includes('Cancelled') ? 'bg-neutral-500' : 'bg-blue-500'
              }`}></div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className={`text-sm font-bold transition-colors ${
                    (log.action.includes('Sale') || log.action.includes('Sold') || log.action.includes('Declined')) ? 'text-red-600 group-hover:text-red-700' : 
                    (log.action.includes('Delivered') || log.action.includes('Accepted') || log.action.includes('Approved')) ? 'text-emerald-600 group-hover:text-emerald-700' :
                    log.action.includes('Submitted') ? 'text-amber-600 group-hover:text-amber-700' :
                    'text-neutral-900 group-hover:text-neutral-600'
                  }`}>{log.action}</p>
                  <time className="text-[10px] text-neutral-400 font-medium">{new Date(log.timestamp).toLocaleString()}</time>
                </div>
                <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2">{log.details || 'System event recorded'}</p>
                <div className="mt-2 inline-flex items-center space-x-1.5 px-2 py-0.5 bg-neutral-100 group-hover:bg-neutral-200 rounded-sm text-[10px] text-neutral-500 font-bold uppercase transition-colors">
                  <span className="w-1 h-1 bg-neutral-400 rounded-sm"></span>
                  <span>Auth: {log.user}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {timelineView === 'transfers' && (
        <div className="space-y-4">
          {transferLogs.length === 0 && (
            <p className="text-sm text-neutral-500">No transfer history recorded for this artwork.</p>
          )}
          <div className="relative border-l border-neutral-200 ml-3 space-y-6">
            {transferLogs.map((log) => (
              <div
                key={log.id}
                onClick={() => {
                  setSelectedLog(log);
                  setShowLogDetails(true);
                }}
                className="relative pl-8 pb-6 last:pb-0 group hover:bg-neutral-50 cursor-pointer rounded-r-xl transition-all duration-200 pr-4"
              >
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm transition-transform group-hover:scale-110 bg-emerald-500"></div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold text-neutral-900 group-hover:text-neutral-600 transition-colors">{log.details || 'Transferred'}</p>
                    <time className="text-[10px] text-neutral-400 font-medium">{new Date(log.timestamp).toLocaleString()}</time>
                  </div>
                  <p className="text-xs text-neutral-500 leading-relaxed">Authorized by {log.user}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {timelineView === 'payments' && sale && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Paid</p>
              <p className="text-xl font-black text-emerald-700">
                ₱{((sale.downpayment || 0) + (sale.installments || []).filter(i => !i.isPending).reduce((sum, i) => sum + i.amount, 0)).toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Remaining Balance</p>
              <p className="text-xl font-black text-indigo-700">
                ₱{Math.max(0, (artwork.price || 0) - (sale.downpayment || 0) - (sale.installments || []).filter(i => !i.isPending).reduce((sum, i) => sum + i.amount, 0)).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/50 border-b border-neutral-100">
                  <th className="px-4 py-2 text-[8px] font-black text-neutral-400 uppercase tracking-widest">Date</th>
                  <th className="px-4 py-2 text-[8px] font-black text-neutral-400 uppercase tracking-widest">Type</th>
                  <th className="px-4 py-2 text-[8px] font-black text-neutral-400 uppercase tracking-widest text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                <tr className="hover:bg-neutral-50/30 transition-colors">
                  <td className="px-4 py-3 text-[11px] font-bold text-neutral-600">{new Date(sale.saleDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[8px] font-black uppercase tracking-tight">
                      {sale.isDownpayment ? 'Downpayment' : 'Full Payment'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-black text-neutral-900">₱{sale.downpayment?.toLocaleString()}</td>
                </tr>
                {(sale.installments || []).filter(i => !i.isPending).sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()).map((inst) => (
                  <tr key={inst.id} className="hover:bg-neutral-50/30 transition-colors">
                    <td className="px-4 py-3 text-[11px] font-bold text-neutral-600">{new Date(inst.createdAt || '').toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase tracking-tight">Installment</span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-black text-neutral-900">₱{inst.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
