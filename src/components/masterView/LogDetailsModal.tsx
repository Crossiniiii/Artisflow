import React from 'react';
import { MasterViewModal } from './MasterViewModal';
import { Gavel, Bookmark, FileSpreadsheet } from 'lucide-react';
import { ICONS } from '../../constants';
import { ActivityLog } from '../../types';

interface LogDetailsModalProps {
  log: ActivityLog;
  onClose: () => void;
}

export const LogDetailsModal: React.FC<LogDetailsModalProps> = ({ log, onClose }) => {
  return (
    <MasterViewModal onClose={onClose} title="Activity Log Details" maxWidth="max-w-2xl">
      <div className="space-y-6">
        <div className="flex items-center space-x-4 pb-6 border-b border-neutral-100">
          <div className={`w-12 h-12 rounded-md flex items-center justify-center text-white shadow-md ${(log.action.includes('Sale') || log.action.includes('Sold')) ? 'bg-red-600' :
            log.action.includes('Delivered') ? 'bg-indigo-500' :
              log.action.includes('Transfer') ? 'bg-emerald-500' :
                log.action.includes('Reserved') ? 'bg-amber-500' :
                  log.action.includes('Cancelled') ? 'bg-neutral-500' : 'bg-blue-500'
            }`}>
            {(log.action.includes('Sale') || log.action.includes('Sold')) ? <Gavel size={24} /> :
              log.action.includes('Transfer') ? <div className="w-6 h-6">{ICONS.Transfers}</div> :
                log.action.includes('Reserved') ? <Bookmark size={24} /> :
                  <FileSpreadsheet size={24} />}
          </div>
          <div>
            <h4 className="text-lg font-bold text-neutral-900">{log.action}</h4>
            <p className="text-sm text-neutral-500">{new Date(log.timestamp).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'medium' })}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-neutral-50 p-4 rounded-sm border border-neutral-100">
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">User / Author</p>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-sm bg-neutral-200 flex items-center justify-center text-[10px] font-bold text-neutral-600">
                {log.user.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-bold text-neutral-700">{log.user}</span>
            </div>
          </div>

          <div className="bg-neutral-50 p-4 rounded-sm border border-neutral-100">
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Details</p>
            <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{log.details || 'No additional details provided.'}</p>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-neutral-900 text-white rounded-sm font-bold shadow-lg shadow-neutral-200 hover:shadow-neutral-400 hover:-translate-y-0.5 transition-all"
            >
              Close Details
            </button>
          </div>
        </div>
      </div>
    </MasterViewModal>
  );
};
