import React, { useMemo, useState } from 'react';
import { MonitoringEntry } from '../types';
import { Calendar, FileSpreadsheet, PlusCircle, Search, Trash2, Edit, Download } from 'lucide-react';

interface MonitoringSummaryPageProps {
  entries: MonitoringEntry[];
  branches: string[];
  onAddEntry: (entry: Omit<MonitoringEntry, 'id'>) => void;
  onUpdateEntry: (id: string, updates: Partial<MonitoringEntry>) => void;
  onDeleteEntry: (id: string) => void;
  canEdit?: boolean;
  canExport?: boolean;
}

const MonitoringSummaryPage: React.FC<MonitoringSummaryPageProps> = ({ entries, branches, onAddEntry, onUpdateEntry, onDeleteEntry, canEdit = true, canExport = true }) => {
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState<string>(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [form, setForm] = useState<Omit<MonitoringEntry, 'id'>>({
    date: new Date().toISOString(),
    description: '',
    code: '',
    clientOrBranch: branches[0] || 'Main Gallery',
    itemCount: undefined
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const start = new Date(month + '-01').toISOString();
    const end = new Date(new Date(month + '-01').getFullYear(), new Date(month + '-01').getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
    return entries
      .filter(e => e.date >= start && e.date <= end)
      .filter(e => {
        const q = search.toLowerCase();
        return (
          (e.description || '').toLowerCase().includes(q) ||
          (e.code || '').toLowerCase().includes(q) ||
          (e.clientOrBranch || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, month, search]);

  const totalItems = filtered.reduce((sum, e) => sum + (e.itemCount || 0), 0);

  const exportCSV = () => {
    const headers = ['Date', 'Description', 'IT/DR#', 'Client/Branch', 'No. of Items'];
    const rows = filtered.map(e => [
      e.date,
      `"${(e.description || '').replace(/"/g, '""')}"`,
      e.code || '',
      e.clientOrBranch || '',
      e.itemCount ?? ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MonitoringSummary_${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const startNew = () => {
    setEditingId(null);
    setForm({
      date: new Date().toISOString(),
      description: '',
      code: '',
      clientOrBranch: branches[0] || 'Main Gallery',
      itemCount: undefined
    });
  };

  const submitForm = () => {
    if (!form.description?.trim()) return;
    const entryMonth = form.date.substring(0, 7);
    if (!editingId && entryMonth !== month) {
      setMonth(entryMonth);
    }
    if (editingId) {
      onUpdateEntry(editingId, form);
      setEditingId(null);
    } else {
      onAddEntry(form);
    }
    startNew();
  };

  const startEdit = (id: string) => {
    const e = entries.find(x => x.id === id);
    if (!e) return;
    setEditingId(id);
    setForm({ date: e.date, description: e.description, code: e.code, clientOrBranch: e.clientOrBranch, itemCount: e.itemCount });
  };

  return (
    <div className="space-y-8 pb-10 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded shadow-sm">Monitoring</span>
            <div className="h-px w-8 bg-slate-300"></div>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Monitoring Summary</h1>
          <p className="text-slate-500 mt-2 max-w-xl">Manually record monthly stock movements and summary items.</p>
        </div>
        <div className="bg-white border border-slate-200 px-6 py-4 rounded-3xl shadow-sm flex items-center space-x-4">
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Month</p>
            <p className="text-sm font-black text-slate-800">{new Date(month + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100">
            <Calendar size={20} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet size={20} className="text-indigo-600" />
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Monitoring Summary Log</h3>
            </div>
            <div className="flex items-center space-x-2">
              {canExport && (
                <button onClick={exportCSV} className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-md hover:shadow-lg font-bold group transform hover:-translate-y-0.5">
                  <Download size={18} className="group-hover:scale-110 transition-transform" />
                  <span className="hidden md:inline">Export</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search description, code, client/branch..."
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-indigo-300 outline-none transition-all shadow-sm"
              />
            </div>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-white border border-slate-200 rounded-2xl px-6 py-3 text-sm font-medium text-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-indigo-300 transition-all shadow-sm hover:shadow-md"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">IT / DR#</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Client / Branch</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">No. of Items</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap font-medium">{new Date(e.date).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{e.description}</td>
                    <td className="px-6 py-4 text-sm text-indigo-600 font-mono font-medium">{e.code}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{e.clientOrBranch}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">{e.itemCount ?? '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <button onClick={() => startEdit(e.id)} disabled={!canEdit} className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 hover:scale-110 transition-transform shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-slate-100">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => onDeleteEntry(e.id)} disabled={!canEdit} className="p-2 rounded-xl bg-rose-100 text-rose-700 hover:bg-rose-200 hover:scale-110 transition-transform shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-rose-100">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-12 text-center text-slate-400">No monitoring entries for this month.</div>
            )}
          </div>

          <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Recorded Items</div>
            <div className="text-2xl font-black text-slate-800">{totalItems}</div>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-2 mb-6">
            <PlusCircle size={20} className="text-emerald-600" />
            <h3 className="text-xl font-black text-slate-800 tracking-tight">{editingId ? 'Edit Entry' : 'Add Entry'}</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date & Time</label>
              <input
                type="datetime-local"
                disabled={!canEdit}
                value={form.date.substring(0, 16)}
                onChange={(e) => setForm({ ...form, date: new Date(e.target.value).toISOString() })}
                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 hover:border-emerald-400 transition-all shadow-sm disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
              <input
                type="text"
                disabled={!canEdit}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Beginning Inventory, Items In, Items Out (Sold)"
                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 hover:border-emerald-400 transition-all shadow-sm disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">IT / DR#</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="ART-2026-0001"
                  className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 hover:border-emerald-400 transition-all shadow-sm disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Client / Branch</label>
                <input
                  list="branches"
                  disabled={!canEdit}
                  value={form.clientOrBranch}
                  onChange={(e) => setForm({ ...form, clientOrBranch: e.target.value })}
                  placeholder="Main Gallery"
                  className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 hover:border-emerald-400 transition-all shadow-sm disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
                <datalist id="branches">
                  {branches.map(b => <option key={b} value={b} />)}
                </datalist>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">No. of Items</label>
              <input
                type="number"
                min={0}
                disabled={!canEdit}
                value={form.itemCount ?? ''}
                onChange={(e) => setForm({ ...form, itemCount: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="e.g. 79"
                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 hover:border-emerald-400 transition-all shadow-sm disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              {editingId && (
                <button onClick={startNew} className="px-6 py-3 rounded-2xl text-slate-600 font-medium hover:bg-slate-100 hover:text-slate-800 transition-colors">Cancel</button>
              )}
              <button onClick={submitForm} disabled={!canEdit} className="px-6 py-3 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
                {editingId ? 'Save Changes' : 'Add Entry'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoringSummaryPage;
