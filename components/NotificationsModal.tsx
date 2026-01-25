import React, { useMemo, useState } from 'react';
import { AppNotification } from '../types';
import { X, Search, Calendar, Clock, Info } from 'lucide-react';

interface NotificationsModalProps {
  notifications: AppNotification[];
  onClose: () => void;
  onSelect: (notification: AppNotification) => void;
}

const NotificationsModal: React.FC<NotificationsModalProps> = ({ notifications, onClose, onSelect }) => {
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  const availableYears = useMemo(() => {
    const years = new Set(notifications.map(n => new Date(n.timestamp).getFullYear().toString()));
    const currentYear = new Date().getFullYear();
    // Always show at least the last 5 years for navigation
    for (let i = 0; i < 5; i++) {
      years.add((currentYear - i).toString());
    }
    return Array.from(years).sort((a: string, b: string) => b.localeCompare(a));
  }, [notifications]);

  const filtered = useMemo(() => {
    let list = notifications;

    // Month filter takes precedence if set (it's more specific)
    if (month) {
      const start = new Date(month + '-01').toISOString();
      // Calculate end of month properly
      const [y, m] = month.split('-').map(Number);
      const end = new Date(y, m, 0, 23, 59, 59, 999).toISOString();
      list = list.filter(n => n.timestamp >= start && n.timestamp <= end);
    } 
    // Otherwise filter by year if selected
    else if (selectedYear) {
      list = list.filter(n => new Date(n.timestamp).getFullYear().toString() === selectedYear);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [notifications, search, month, selectedYear]);

  const handleYearSelect = (year: string | null) => {
    if (year === selectedYear && year !== null) {
      setSelectedYear(null);
    } else {
      setSelectedYear(year);
    }
    setMonth(''); // Clear specific month when selecting a whole year
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMonth(e.target.value);
    setSelectedYear(null); // Clear year selection when picking a specific month
  };

  const getTimeLabel = (timestamp: string) => {
    const d = new Date(timestamp);
    return d.toLocaleString();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4">
      <div className="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Notifications</p>
            <h2 className="text-lg font-black text-slate-900">Activity History</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-slate-200 transition-all hover:scale-105 hover:shadow-md active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title or message..."
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-slate-400" />
              <input
                type="month"
                value={month}
                onChange={handleMonthChange}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleYearSelect(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                !selectedYear && !month
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              All Time
            </button>
            {availableYears.map(year => (
              <button
                key={year}
                onClick={() => handleYearSelect(year)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all transform duration-200 ${
                  selectedYear === year
                    ? 'bg-indigo-600 text-white shadow-md scale-105'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:shadow-sm hover:-translate-y-0.5'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[480px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">
              No notifications found for this view.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((n) => (
                <button 
                  key={n.id} 
                  onClick={() => onSelect(n)}
                  className="w-full text-left px-6 py-4 flex items-start gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div
                    className={
                      'mt-1 p-2 rounded-xl ' +
                      (n.type === 'inventory'
                        ? 'bg-blue-50 text-blue-600'
                        : n.type === 'sales'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-slate-50 text-slate-600')
                    }
                  >
                    <Info size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-slate-900 truncate">{n.title}</p>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <Clock size={10} />
                        <span>{getTimeLabel(n.timestamp)}</span>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 whitespace-pre-line">
                      {n.message}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsModal;

