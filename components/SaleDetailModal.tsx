import React from 'react';
import { SaleRecord, Artwork } from '../types';
import { X, Calendar, User, Truck, DollarSign, Tag, Info } from 'lucide-react';

interface SaleDetailModalProps {
  sale: SaleRecord;
  artwork: Artwork;
  onClose: () => void;
  onCancelSale?: (id: string) => void;
}

const SaleDetailModal: React.FC<SaleDetailModalProps> = ({ sale, artwork, onClose, onCancelSale }) => {
  const [showConfirmCancel, setShowConfirmCancel] = React.useState(false);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-200">
        
        {/* Image Section */}
        <div className="w-full md:w-1/2 bg-slate-100 relative min-h-[300px] md:min-h-full flex items-center justify-center">
            {artwork.imageUrl ? (
                <img 
                src={artwork.imageUrl} 
                alt={artwork.title} 
                className="w-full h-full object-contain p-4"
                />
            ) : (
                <div className="text-slate-400 font-medium">No Image Available</div>
            )}
             {artwork.status === 'Sold' && (
                <div className="absolute top-4 left-4 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                  SOLD
                </div>
              )}
        </div>

        {/* Details Section */}
        <div className="w-full md:w-1/2 flex flex-col">
            <div className="p-6 md:p-8 flex-1 overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">{artwork.title}</h2>
                        <p className="text-lg text-slate-500 font-medium">{artwork.artist}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={24} className="text-slate-400 hover:text-slate-600" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Artwork Details */}
                    <div className="grid grid-cols-2 gap-4">
                         <div className="bg-slate-50 p-3 rounded-2xl">
                            <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Code</span>
                            <span className="font-semibold text-slate-700">{artwork.code}</span>
                         </div>
                         <div className="bg-slate-50 p-3 rounded-2xl">
                            <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Year</span>
                            <span className="font-semibold text-slate-700">{artwork.year || '-'}</span>
                         </div>
                         <div className="bg-slate-50 p-3 rounded-2xl">
                            <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Medium</span>
                            <span className="font-semibold text-slate-700">{artwork.medium || '-'}</span>
                         </div>
                         <div className="bg-slate-50 p-3 rounded-2xl">
                            <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Dimensions</span>
                            <span className="font-semibold text-slate-700">{artwork.dimensions || '-'}</span>
                         </div>
                    </div>

                    <div className="border-t border-slate-100 my-4"></div>

                    {/* Sale Details */}
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Info size={16} /> Sale Information
                    </h3>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <User size={20} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase">Client</p>
                                <p className="font-semibold text-slate-800">{sale.clientName}</p>
                            </div>
                        </div>

                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <DollarSign size={20} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase">Sale Price</p>
                                <p className="font-semibold text-slate-800">₱{artwork.price.toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase">Date Sold</p>
                                <p className="font-semibold text-slate-800">{new Date(sale.saleDate).toLocaleDateString()}</p>
                            </div>
                        </div>

                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                                <Truck size={20} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase">Delivery Status</p>
                                <p className={`font-semibold ${
                                    sale.isCancelled 
                                        ? 'text-slate-500' 
                                        : sale.isDelivered 
                                            ? 'text-emerald-600' 
                                            : 'text-amber-600'
                                }`}>
                                    {sale.isCancelled 
                                        ? 'Sale Cancelled' 
                                        : sale.isDelivered 
                                            ? 'Delivered' 
                                            : 'Awaiting Delivery'}
                                </p>
                            </div>
                        </div>
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                                <Tag size={20} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase">Sold By Agent</p>
                                <p className="font-semibold text-slate-800">{sale.agentName}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between gap-3">
                 {onCancelSale && !sale.isCancelled && (
                   showConfirmCancel ? (
                     <div className="flex items-center gap-2">
                       <span className="text-xs font-bold text-rose-600 uppercase">Confirm Cancel?</span>
                       <button 
                         onClick={() => {
                           onCancelSale(artwork.id);
                           onClose();
                         }}
                         className="px-4 py-2 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors text-sm"
                       >
                         Yes, Cancel Sale
                       </button>
                       <button 
                         onClick={() => setShowConfirmCancel(false)}
                         className="px-4 py-2 bg-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-300 transition-colors text-sm"
                       >
                         No
                       </button>
                     </div>
                   ) : (
                     <button 
                       onClick={() => setShowConfirmCancel(true)}
                       className="px-4 py-2 text-rose-500 font-bold rounded-xl hover:bg-rose-50 transition-colors text-sm border border-transparent hover:border-rose-100"
                     >
                       Cancel Sale
                     </button>
                   )
                 )}
                 <div className="flex-1"></div>
                 <button 
                    onClick={onClose}
                    className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                    Close
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SaleDetailModal;