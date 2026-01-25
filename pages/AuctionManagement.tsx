
import React, { useState } from 'react';
import { ExhibitionEvent, EventStatus, Artwork, Branch, ArtworkStatus } from '../types';
import { ICONS } from '../constants';
import { Gavel } from 'lucide-react';

interface AuctionManagementProps {
  events: ExhibitionEvent[];
  artworks: Artwork[];
  branches: string[];
  onAddEvent: (event: Partial<ExhibitionEvent>) => void;
  onDeleteEvent: (id: string) => void;
  onUpdateEvent: (id: string, updates: Partial<ExhibitionEvent>) => void;
  onViewArt?: (id: string) => void;
  canEdit?: boolean;
}

const AuctionManagement: React.FC<AuctionManagementProps> = ({ events, artworks, branches, onAddEvent, onDeleteEvent, onUpdateEvent, onViewArt, canEdit = true }) => {
  const [showModal, setShowModal] = useState(false);
  const [viewingEvent, setViewingEvent] = useState<ExhibitionEvent | null>(null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'RESERVED' | 'SOLD' | 'AVAILABLE'>('ALL');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ExhibitionEvent>>({
    title: '',
    location: 'Main Gallery' as Branch,
    startDate: '',
    endDate: '',
    status: EventStatus.UPCOMING,
    artworkIds: [],
    type: 'Auction'
  });
  const formatImportPeriod = (p?: string) => {
    if (!p) return '';
    const parts = p.split('-');
    if (parts.length < 2) return p;
    const y = parts[0];
    const m = Math.max(1, Math.min(12, parseInt(parts[1], 10)));
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${monthNames[m - 1]} ${y}`;
  };

  const handleOpenEdit = (event: ExhibitionEvent) => {
    setEditingId(event.id);
    setFormData(event);
    setShowModal(true);
  };

  const handleSave = () => {
    if (editingId) {
      onUpdateEvent(editingId, formData);
    } else {
      onAddEvent(formData);
    }
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      title: '',
      location: 'Main Gallery' as Branch,
      startDate: '',
      endDate: '',
      status: EventStatus.UPCOMING,
      artworkIds: [],
      type: 'Auction'
    });
  };

  const toggleArtwork = (id: string) => {
    const current = formData.artworkIds || [];
    if (current.includes(id)) {
      setFormData({ ...formData, artworkIds: current.filter(i => i !== id) });
    } else {
      setFormData({ ...formData, artworkIds: [...current, id] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Auction House</h1>
          <p className="text-sm text-slate-500">Manage auctions and bidding events.</p>
        </div>
        {canEdit && (
          <button 
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center space-x-2 px-6 py-3.5 bg-slate-800 text-white rounded-2xl hover:bg-slate-700 transition-all shadow-md hover:shadow-lg font-bold transform hover:-translate-y-0.5"
          >
            <Gavel size={20} />
            <span>Schedule Auction</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {events.filter(e => e.type === 'Auction').map((event) => (
          <div key={event.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className={`absolute top-0 right-0 px-4 py-1 text-[10px] font-bold uppercase tracking-widest ${
              event.status === EventStatus.LIVE ? 'bg-emerald-500 text-white' : 
              event.status === EventStatus.UPCOMING ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {event.status}
            </div>
            
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900 pr-16">{event.title}</h3>
              <p className="text-xs text-slate-500 font-medium flex items-center space-x-2 mt-1">
                <span>{event.location}</span>
                <span>•</span>
                <span>{event.startDate}</span>
              </p>
            </div>

            <div 
              className="space-y-4 cursor-pointer hover:bg-slate-50 p-3 -mx-3 rounded-2xl transition-colors"
              onClick={() => {
                setViewingEvent(event);
                setFilterStatus('ALL');
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auction Lots</p>
                <span className="text-xs font-bold text-slate-800">{event.artworkIds.length} Works</span>
              </div>
              <div className="flex -space-x-3 overflow-hidden pl-1">
                {event.artworkIds.slice(0, 5).map((id) => {
                  const art = artworks.find(a => a.id === id);
                  return art ? (
                    <img 
                      key={id} 
                      src={art.imageUrl} 
                      className="inline-block h-10 w-10 rounded-full ring-2 ring-white object-cover cursor-pointer hover:ring-blue-200 transition-shadow" 
                      alt="" 
                      onClick={(e) => { e.stopPropagation(); onViewArt?.(art.id); }}
                    />
                  ) : null;
                })}
                {event.artworkIds.length > 5 && (
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 ring-2 ring-white">
                    +{event.artworkIds.length - 5}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
              {canEdit && (
                <>
                  <button 
                    onClick={() => handleOpenEdit(event)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button 
                    onClick={() => onDeleteEvent(event.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {viewingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{viewingEvent.title}</h3>
                <p className="text-sm text-slate-500">Auction Lots ({viewingEvent.artworkIds.length} items)</p>
              </div>
              <button onClick={() => setViewingEvent(null)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="px-8 pt-4 pb-0 flex space-x-2">
              {(['ALL', 'RESERVED', 'SOLD', 'AVAILABLE'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-6 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm hover:shadow-md border transform hover:-translate-y-0.5 ${
                    filterStatus === status 
                      ? 'bg-slate-900 text-white border-slate-900' 
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {status === 'ALL' ? 'All Items' : status}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-8">
               {viewingEvent.artworkIds.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                    <p>No artworks assigned yet.</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {viewingEvent.artworkIds
                      .filter(id => {
                        const art = artworks.find(a => a.id === id);
                        if (!art) return false;
                        if (filterStatus === 'ALL') return true;
                        if (filterStatus === 'AVAILABLE') return art.status === ArtworkStatus.AVAILABLE;
                        if (filterStatus === 'RESERVED') return art.status === ArtworkStatus.RESERVED;
                        if (filterStatus === 'SOLD') return art.status === ArtworkStatus.SOLD || art.status === ArtworkStatus.DELIVERED;
                        return true;
                      })
                      .map(id => {
                      const art = artworks.find(a => a.id === id);
                       if (!art) return null;
                       return (
                          <div 
                            key={art.id} 
                            className="flex items-start space-x-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all cursor-pointer"
                            onClick={() => onViewArt?.(art.id)}
                          >
                             <img src={art.imageUrl} className="w-16 h-16 rounded-lg object-cover shadow-sm bg-white" alt="" />
                             <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{art.title}</h4>
                                <p className="text-xs text-slate-500 truncate">{art.artist}</p>
                                <p className="text-[10px] font-bold text-indigo-500 mt-0.5">Imported: {formatImportPeriod(art.importPeriod) || 'Unknown'}</p>
                                <span className={`mt-2 inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                                   art.status === ArtworkStatus.AVAILABLE ? 'bg-emerald-100 text-emerald-700' : 
                                   art.status === ArtworkStatus.SOLD ? 'bg-amber-100 text-amber-700' : 
                                   art.status === ArtworkStatus.RESERVED ? 'bg-purple-100 text-purple-700' :
                                   art.status === ArtworkStatus.DELIVERED ? 'bg-indigo-100 text-indigo-700' :
                                   'bg-slate-200 text-slate-600'
                                }`}>
                                   {art.status}
                                </span>
                             </div>
                          </div>
                       );
                    })}
                 </div>
               )}
            </div>
            
            <div className="px-8 py-6 border-t border-slate-100 bg-white flex justify-end">
              <button onClick={() => setViewingEvent(null)} className="px-6 py-2.5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Auction' : 'Schedule Auction'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-6">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Auction Details</h4>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Auction Title</label>
                    <input 
                      type="text" 
                      className="w-full px-5 py-3 bg-slate-50 border-0 rounded-xl text-base font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-indigo-50 hover:bg-indigo-50 transition-all"
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Start Date</label>
                      <input 
                        type="date" 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                        value={formData.startDate}
                        onChange={e => setFormData({...formData, startDate: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">End Date</label>
                      <input 
                        type="date" 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                        value={formData.endDate}
                        onChange={e => setFormData({...formData, endDate: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Location</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                        value={formData.location}
                        onChange={e => setFormData({ ...formData, location: e.target.value as Branch })}
                        placeholder="Type auction location"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Status</label>
                      <select 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                        value={formData.status}
                        onChange={e => setFormData({...formData, status: e.target.value as EventStatus})}
                      >
                        <option value={EventStatus.UPCOMING}>Upcoming</option>
                        <option value={EventStatus.LIVE}>Live Now</option>
                        <option value={EventStatus.RECENT}>Recent/Closed</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Lot Selection (Link Artworks)</h4>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl h-[400px] overflow-y-auto p-4 space-y-2">
                  {artworks.filter(art => art.status === ArtworkStatus.AVAILABLE || formData.artworkIds?.includes(art.id)).map((art) => (
                    <button
                      key={art.id}
                      onClick={() => toggleArtwork(art.id)}
                      className={`w-full flex items-center space-x-3 p-3 rounded-xl border transition-all ${
                        formData.artworkIds?.includes(art.id) 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                        : 'bg-white border-slate-200 text-slate-800 hover:border-blue-400'
                      }`}
                    >
                      <img src={art.imageUrl} className="w-10 h-10 rounded object-cover border border-black/10" alt="" />
                      <div className="text-left flex-1 min-w-0">
                        <p className={`text-xs font-bold truncate ${formData.artworkIds?.includes(art.id) ? 'text-white' : 'text-slate-800'}`}>{art.title}</p>
                        <p className={`text-[10px] ${formData.artworkIds?.includes(art.id) ? 'text-blue-100' : 'text-slate-400'}`}>{art.artist}</p>
                        <p className={`text-[10px] font-bold mt-0.5 ${formData.artworkIds?.includes(art.id) ? 'text-blue-100' : 'text-indigo-500'}`}>
                          Imported: {formatImportPeriod(art.importPeriod) || 'Unknown'}
                        </p>
                      </div>
                      {formData.artworkIds?.includes(art.id) && (
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-8 py-6 border-t border-slate-100 bg-white flex justify-end space-x-3">
              <button onClick={() => setShowModal(false)} className="px-6 py-2.5 rounded-2xl font-bold text-slate-600 hover:bg-slate-100 transition-all shadow-sm hover:shadow-md border border-slate-200 transform hover:-translate-y-0.5">Cancel</button>
              <button 
                onClick={handleSave}
                disabled={!canEdit || !formData.title}
                className="px-10 py-2.5 bg-slate-900 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl hover:bg-slate-800 disabled:opacity-50 transition-all transform hover:-translate-y-0.5"
              >
                {editingId ? 'Update Auction' : 'Schedule Auction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuctionManagement;
