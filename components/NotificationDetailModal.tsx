import React, { useMemo } from 'react';
import { AppNotification, Artwork } from '../types';
import { X, Clock, Info, CheckCircle2, AlertCircle, ShoppingBag, Box, ArrowRight } from 'lucide-react';

interface NotificationDetailModalProps {
  notification: AppNotification;
  onClose: () => void;
  artworks?: Artwork[];
  onViewArtwork?: (id: string) => void;
}

const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({ notification, onClose, artworks, onViewArtwork }) => {
  const relatedArtwork = useMemo(() => {
    if (!notification.artworkId || !artworks) return null;
    return artworks.find(a => a.id === notification.artworkId);
  }, [notification, artworks]);

  const getIcon = () => {
    switch (notification.type) {
      case 'inventory':
        return <Box size={32} className="text-blue-500" />;
      case 'sales':
        return <ShoppingBag size={32} className="text-emerald-500" />;
      default:
        return <Info size={32} className="text-slate-500" />;
    }
  };

  const getHeaderColor = () => {
    switch (notification.type) {
      case 'inventory':
        return 'bg-blue-500';
      case 'sales':
        return 'bg-emerald-500';
      default:
        return 'bg-slate-500';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative">
        {/* Header Strip */}
        <div className={`h-2 w-full ${getHeaderColor()}`} />
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-8">
          <div className="flex items-start space-x-5">
            <div className={`p-3 rounded-2xl ${
              notification.type === 'inventory' ? 'bg-blue-50' : 
              notification.type === 'sales' ? 'bg-emerald-50' : 'bg-slate-50'
            }`}>
              {getIcon()}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                   notification.type === 'inventory' ? 'bg-blue-100 text-blue-700' : 
                   notification.type === 'sales' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                }`}>
                  {notification.type}
                </span>
                {!notification.isRead && (
                  <span className="flex items-center space-x-1 text-[10px] font-bold text-blue-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                    <span>New</span>
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight mb-2">
                {notification.title}
              </h2>
              <div className="flex items-center text-slate-400 text-xs font-bold uppercase tracking-wider mb-6">
                <Clock size={12} className="mr-1.5" />
                {new Date(notification.timestamp).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="mt-2 bg-slate-50 rounded-2xl p-5 border border-slate-100">
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
              {notification.message}
            </p>
          </div>

          {relatedArtwork && (
            <div className="mt-6 border-t border-slate-100 pt-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Related Artwork</h3>
              <div 
                onClick={() => {
                  if (onViewArtwork) {
                    onViewArtwork(relatedArtwork.id);
                    onClose();
                  }
                }}
                className="group flex items-center gap-4 p-3 bg-white border border-slate-200 rounded-2xl hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                  <img 
                    src={relatedArtwork.imageUrl} 
                    alt={relatedArtwork.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                    {relatedArtwork.title}
                  </h4>
                  <p className="text-xs text-slate-500 truncate">{relatedArtwork.artist}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">
                      {relatedArtwork.code}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                      relatedArtwork.status === 'Available' ? 'bg-emerald-100 text-emerald-700' :
                      relatedArtwork.status === 'Sold' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {relatedArtwork.status}
                    </span>
                  </div>
                </div>
                <div className="p-2 text-slate-300 group-hover:text-indigo-500 transition-colors">
                  <ArrowRight size={20} />
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-slate-900/20"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationDetailModal;
