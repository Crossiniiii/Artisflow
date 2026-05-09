import React, { useEffect, useMemo, useState } from 'react';
import { SaleRecord, Artwork, SaleStatus, UserPermissions } from '../types';
import { CheckCircle, XCircle, FileImage, FileText, ShieldCheck, Shield, Clock, LayoutGrid, Rows3, Eye, ExternalLink, Calendar, User, Mail, Phone, Tag, Info, AlertCircle, MessageSquare, ChevronRight, Trash2 } from 'lucide-react';
import { OptimizedImage } from '../components/OptimizedImage';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { OptimizedTextarea } from '../components/OptimizedTextarea';
import { useActionProcessing } from '../hooks/useActionProcessing';
import LoadingOverlay from '../components/LoadingOverlay';

interface SalesApprovalPageProps {
  sales: SaleRecord[];
  artworks: Artwork[];
  onApproveSale: (saleId: string) => void;
  onDeclineSale: (saleId: string, reason?: string, requestedFiles?: string[]) => void;
  onBulkDeleteSales?: (ids: string[]) => void;
  userPermissions?: UserPermissions;
  hideHeader?: boolean;
}

const SalesApprovalPage: React.FC<SalesApprovalPageProps> = ({ 
  sales, 
  artworks, 
  onApproveSale, 
  onDeclineSale, 
  onBulkDeleteSales,
  userPermissions,
  hideHeader
}) => {
  const [activeTab, setActiveTab] = useState<'approval' | 'history'>('approval');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  const [requestedFiles, setRequestedFiles] = useState<Set<string>>(new Set());

  const pendingSales = useMemo(() => {
    const pending = sales.filter(s => s.status === SaleStatus.FOR_SALE_APPROVAL && !s.isCancelled);
    const byArtwork = new Map<string, SaleRecord>();
    const malformed: SaleRecord[] = [];

    pending.forEach(sale => {
      // If artworkId is missing or "undefined", don't group it as it's likely corrupted data
      if (!sale.artworkId || sale.artworkId === 'undefined' || sale.artworkId === 'null') {
        malformed.push(sale);
      } else if (!byArtwork.has(sale.artworkId)) {
        byArtwork.set(sale.artworkId, sale);
      }
    });

    return [...Array.from(byArtwork.values()), ...malformed]
      .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
  }, [sales]);

  const [contactConfirmed, setContactConfirmed] = useState<Record<string, boolean>>({});
  const { isProcessing, processMessage, processProgress, wrapAction } = useActionProcessing({ itemTitle: 'Sales Approval', itemCode: 'SAL' });
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [declineSaleId, setDeclineSaleId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [declineMode, setDeclineMode] = useState<'remediation' | 'straight'>('remediation');
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [activeAttachmentGroup, setActiveAttachmentGroup] = useState<{
    label: string;
    urls: string[];
  } | null>(null);
  const [approvalChecklist, setApprovalChecklist] = useState<Record<string, {
    buyerContacted: boolean;
    clientDetailsVerified: boolean;
    pricingVerified: boolean;
    documentsVerified: boolean;
  }>>({});

  useEffect(() => {
    if (pendingSales.length === 0) {
      if (selectedSale) setSelectedSale(null);
      return;
    }

    if (selectedSale && !pendingSales.some(sale => sale.id === selectedSale.id)) {
      setSelectedSale(null);
    }
  }, [pendingSales, selectedSale]);

  const handleToggleConfirm = (saleId: string) => {
    setContactConfirmed(prev => ({ ...prev, [saleId]: !prev[saleId] }));
  };

  const getChecklistState = (sale: SaleRecord | null) => {
    if (!sale) {
      return {
        buyerContacted: false,
        clientDetailsVerified: false,
        pricingVerified: false,
        documentsVerified: false
      };
    }

    return approvalChecklist[sale.id] || {
      buyerContacted: !!contactConfirmed[sale.id],
      clientDetailsVerified: false,
      pricingVerified: false,
      documentsVerified: false
    };
  };

  const handleChecklistToggle = (
    sale: SaleRecord,
    key: 'buyerContacted' | 'clientDetailsVerified' | 'pricingVerified' | 'documentsVerified'
  ) => {
    setApprovalChecklist(prev => {
      const current = prev[sale.id] || getChecklistState(sale);
      const next = {
        ...current,
        [key]: !current[key]
      };
      return { ...prev, [sale.id]: next };
    });

    if (key === 'buyerContacted') {
      setContactConfirmed(prev => ({ ...prev, [sale.id]: !getChecklistState(sale).buyerContacted }));
    }
  };

  const isSaleReadyForApproval = (sale: SaleRecord | null) => {
    const checklist = getChecklistState(sale);
    return checklist.buyerContacted
      && checklist.clientDetailsVerified
      && checklist.pricingVerified
      && checklist.documentsVerified;
  };


  const getArtwork = (id: string) => artworks.find(a => a.id === id);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };

  const getAttachmentKind = (url?: string) => {
    if (!url) return 'missing';
    const normalized = url.toLowerCase();
    if (normalized.startsWith('data:image/')) return 'image';
    if (normalized.startsWith('data:application/pdf')) return 'pdf';
    if (/\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/.test(normalized)) return 'image';
    if (/\.(pdf)(\?|$)/.test(normalized)) return 'pdf';
    return 'file';
  };

  const getAttachmentName = (url?: string, index?: number) => {
    if (!url) return 'Missing file';
    try {
      if (url.startsWith('data:')) {
        const typeLabel = getAttachmentKind(url) === 'pdf' ? 'PDF Document' : 'Image File';
        return `${typeLabel}${typeof index === 'number' ? ` ${index + 1}` : ''}`;
      }
      const pathname = new URL(url).pathname;
      const lastSegment = pathname.split('/').filter(Boolean).pop();
      return lastSegment || `Attachment ${typeof index === 'number' ? index + 1 : ''}`.trim();
    } catch {
      const trimmed = url.split('?')[0].split('/').pop();
      return trimmed || `Attachment ${typeof index === 'number' ? index + 1 : ''}`.trim();
    }
  };

  const handleDeclineClick = (e: React.MouseEvent, saleId: string) => {
    e.stopPropagation();
    setDeclineSaleId(saleId);
    setDeclineReason('');
    setDeclineMode('remediation');
    setRequestedFiles(new Set());
    setIsDeclineModalOpen(true);
  };

  const normalizeAttachmentUrls = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value
        .flatMap(item => normalizeAttachmentUrls(item))
        .filter((url, index, self) => !!url && self.indexOf(url) === index);
    }

    if (typeof value !== 'string') return [];

    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        return normalizeAttachmentUrls(JSON.parse(trimmed));
      } catch {
        return [];
      }
    }

    return [trimmed];
  };

  const confirmDecline = async () => {
    if (declineSaleId) {
      await wrapAction(async () => {
        const filesToRequest = declineMode === 'straight' ? [] : Array.from(requestedFiles);
        const reasonToSubmit = declineMode === 'straight' ? 'Straight rejection' : declineReason;
        await Promise.resolve(onDeclineSale(declineSaleId, reasonToSubmit, filesToRequest));
        setIsDeclineModalOpen(false);
        setDeclineSaleId(null);
        setDeclineReason('');
        setDeclineMode('remediation');
        setRequestedFiles(new Set());
        if (selectedSale?.id === declineSaleId) setSelectedSale(null);
      }, 'Synchronizing Sale Decline with Database...', { silent: true });
    }
  };

  const handleDeleteSale = async (e: React.MouseEvent, saleId: string) => {
    e.stopPropagation();
    if (!onBulkDeleteSales) return;
    
    const confirmMessage = "Are you sure you want to permanently delete this sale record? This action cannot be undone and will remove it from the verification queue.";
    if (window.confirm(confirmMessage)) {
      await wrapAction(async () => {
        await Promise.resolve(onBulkDeleteSales([saleId]));
        if (selectedSale?.id === saleId) setSelectedSale(null);
      }, 'Permanently Removing Sale Record...', { silent: true });
    }
  };

  const renderSaleCard = (sale: SaleRecord) => {
    const liveArt = getArtwork(sale.artworkId);
    const isCorrupted = !liveArt && (!sale.artworkSnapshot || !sale.artworkSnapshot.title || sale.artworkSnapshot.title === 'Untitled Artwork');
    
    // Prioritize live data for visuals (image, title, artist) but keep snapshot as fallback
    // and prioritize snapshot for financial context (price) if available
    const art = {
      ...(liveArt || {}),
      ...(sale.artworkSnapshot || {}),
      // Force live image if snapshot is missing it
      imageUrl: sale.artworkSnapshot?.imageUrl || liveArt?.imageUrl || '',
      title: sale.artworkSnapshot?.title || liveArt?.title || 'Untitled Artwork',
      artist: sale.artworkSnapshot?.artist || liveArt?.artist || 'Unknown Artist',
      price: sale.artworkSnapshot?.price || liveArt?.price || 0
    };

    return (
      <div 
        key={sale.id} 
        onClick={() => setSelectedSale(sale)}
        className="group relative flex flex-col cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all duration-300 hover:border-blue-400 hover:shadow-[0_20px_40px_rgba(15,23,42,0.12)]"
      >
        {/* Card Header with Badges */}
        <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-1.5">
          {userPermissions?.canManageAccounts && (
            <button
              onClick={(e) => handleDeleteSale(e, sale.id)}
              className="mb-1 p-1.5 rounded-full bg-white/90 text-slate-400 hover:text-red-600 hover:bg-white shadow-sm border border-slate-200 transition-colors"
              title="Delete Record"
            >
              <Trash2 size={12} />
            </button>
          )}
          {(!sale.isDownpayment || sale.downpayment === (art?.price || 0)) ? (
            <span className="inline-flex items-center rounded-full bg-emerald-100/80 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald-800 backdrop-blur-sm border border-emerald-200/50">
              Full Payment
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-amber-100/80 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-800 backdrop-blur-sm border border-amber-200/50">
              Downpayment
            </span>
          )}
          {sale.requestedAttachments && sale.requestedAttachments.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-white shadow-lg shadow-blue-200 animate-pulse">
              Re-upload
            </span>
          )}
        </div>

        {/* Hero Section with Image */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-50">
          {art.imageUrl ? (
            <OptimizedImage 
              src={art.imageUrl} 
              alt={art.title} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300 bg-[linear-gradient(45deg,#f8fafc_25%,#f1f5f9_25%,#f1f5f9_50%,#f8fafc_50%,#f8fafc_75%,#f1f5f9_75%,#f1f5f9_100%)] bg-[length:40px_40px]">
              <FileImage size={48} strokeWidth={1} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
            <div className="text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mb-1">Total Valuation</p>
              <p className="text-xl font-black">{formatCurrency(art.price)}</p>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 p-6 flex flex-col">
          <div className="mb-5">
            <h4 className={`text-lg font-bold tracking-tight leading-snug line-clamp-1 ${isCorrupted ? 'text-red-600' : 'text-slate-900'}`}>{art.title}</h4>
            <p className="text-sm font-medium text-slate-500">{art.artist}</p>
            
            <div className={`mt-4 rounded-lg p-3 border ${isCorrupted ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100/50'}`}>
              <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${isCorrupted ? 'text-red-700' : 'text-orange-700'}`}>
                <AlertCircle size={12} />
                {isCorrupted ? 'CORRUPTED DATA DETECTED' : 'PENDING VERIFICATION'}
              </p>
              <p className={`text-[9px] font-bold mt-1 leading-tight uppercase tracking-tight ${isCorrupted ? 'text-red-600' : 'text-orange-600'}`}>
                {isCorrupted 
                  ? 'Artwork ID is invalid or artwork has been deleted. Please delete this record.' 
                  : 'No downpayments have been accepted yet'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-4 mb-6 border-t border-slate-100 pt-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Client</p>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                   <User size={10} />
                </div>
                <span className="text-xs font-bold text-slate-700 line-clamp-1">{sale.clientName}</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Agent</p>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                   <Shield size={10} />
                </div>
                <span className="text-xs font-bold text-slate-700 line-clamp-1">{sale.agentName}</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Requested On</p>
              <div className="flex items-center gap-2">
                <Calendar size={12} className="text-slate-400" />
                <span className="text-xs font-medium text-slate-600">{new Date(sale.saleDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                {(!sale.isDownpayment || sale.downpayment === (art?.price || 0)) ? 'Final Price' : 'Downpayment'}
              </p>
              <span className="text-xs font-black text-emerald-600">{formatCurrency(sale.downpayment || 0)}</span>
            </div>
          </div>

          {/* Interaction Area */}
          <div className="mt-auto space-y-4">
            <div className="relative group/check flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4 transition-all hover:bg-blue-50">
              <div className="relative flex items-center mt-0.5">
                <input
                  type="checkbox"
                  id={`confirm-${sale.id}`}
                  checked={!!contactConfirmed[sale.id]}
                  onChange={() => handleToggleConfirm(sale.id)}
                  className="peer h-5 w-5 cursor-pointer appearance-none rounded border-2 border-blue-200 transition-all checked:bg-blue-600 checked:border-blue-600"
                />
                <CheckCircle size={12} className="absolute left-1 top-1 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
              </div>
              <label htmlFor={`confirm-${sale.id}`} className="cursor-pointer text-xs font-medium text-slate-700 leading-relaxed">
                I verify that the buyer has been contacted and all details are accurate.
              </label>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={(e) => handleDeclineClick(e, sale.id)}
                className="h-11 px-4 rounded-lg border border-slate-200 bg-white text-xs font-bold uppercase tracking-widest text-slate-600 transition-all hover:border-red-200 hover:text-red-600 hover:bg-red-50 active:scale-95"
              >
                Decline
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  wrapAction(async () => {
                    await Promise.resolve(onApproveSale(sale.id));
                  }, 'Finalizing Sale Approval...', { silent: true });
                }}
                disabled={!contactConfirmed[sale.id] || isProcessing}
                className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                  contactConfirmed[sale.id]
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-[0.98]'
                    : 'cursor-not-allowed bg-slate-100 text-slate-400'
                }`}
              >
                <ShieldCheck size={16} />
                Approve Sale
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };


  const renderSaleRow = (sale: SaleRecord) => {
    const liveArt = getArtwork(sale.artworkId);
    const art = {
      ...(liveArt || {}),
      ...(sale.artworkSnapshot || {}),
      imageUrl: sale.artworkSnapshot?.imageUrl || liveArt?.imageUrl || '',
      title: sale.artworkSnapshot?.title || liveArt?.title || 'Untitled Artwork',
      artist: sale.artworkSnapshot?.artist || liveArt?.artist || 'Unknown Artist',
      price: sale.artworkSnapshot?.price || liveArt?.price || 0
    };

    return (
      <div
        key={sale.id}
        onClick={() => setSelectedSale(sale)}
        className="group relative cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all duration-300 hover:border-blue-400 hover:shadow-[0_12px_24px_rgba(15,23,42,0.08)]"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          {/* Artwork Info */}
          <div className="flex items-center gap-5 lg:w-[400px] shrink-0">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
              {art.imageUrl ? (
                <OptimizedImage src={art.imageUrl} alt={art.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-300">
                  <FileImage size={24} />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                {(!sale.isDownpayment || sale.downpayment === (art?.price || 0)) ? (
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[8px] font-black uppercase tracking-wider rounded border border-emerald-100">Full</span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[8px] font-black uppercase tracking-wider rounded border border-amber-100">Down</span>
                )}
                <span className="text-[10px] font-bold text-slate-400">#{sale.id.slice(0, 6)}</span>
              </div>
              <h4 className="font-bold text-slate-900 tracking-tight truncate leading-none mb-1">{art.title}</h4>
              <p className="text-xs font-medium text-slate-500">{art.artist}</p>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 px-4 border-l border-slate-100 lg:mx-4">
             <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Client</p>
                <p className="text-xs font-bold text-slate-700 truncate">{sale.clientName}</p>
             </div>
             <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Agent</p>
                <p className="text-xs font-bold text-slate-700 truncate">{sale.agentName}</p>
             </div>
             <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</p>
                <p className="text-xs font-medium text-slate-600">{new Date(sale.saleDate).toLocaleDateString()}</p>
             </div>
             <div className="space-y-1 text-right sm:text-left">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Collection</p>
                <p className="text-xs font-black text-emerald-600">{formatCurrency(sale.downpayment || 0)}</p>
             </div>
             <div className="hidden xl:flex flex-col justify-center border-l border-slate-100 pl-4">
                <p className="text-[9px] font-black text-orange-600 uppercase tracking-tight leading-none mb-1">Awaiting Approval</p>
                <p className="text-[8px] font-bold text-orange-400 uppercase tracking-tight leading-none">Zero ledger impact</p>
             </div>
          </div>

          {/* Action Area */}
          <div className="flex flex-col sm:flex-row items-center gap-4 lg:w-[420px] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-100 pt-5 lg:pt-0 lg:pl-6">
            <div className="flex-1 relative flex items-start gap-2.5 rounded-lg border border-blue-50 bg-blue-50/30 p-2.5 transition-colors hover:bg-blue-50">
               <input
                type="checkbox"
                id={`confirm-row-${sale.id}`}
                checked={!!contactConfirmed[sale.id]}
                onChange={() => handleToggleConfirm(sale.id)}
                className="mt-0.5 h-4 w-4 rounded border-blue-200 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor={`confirm-row-${sale.id}`} className="text-[10px] font-medium text-slate-600 leading-tight">
                Verified buyer details
              </label>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
               <button
                onClick={(e) => handleDeclineClick(e, sale.id)}
                className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                title="Decline"
              >
                <XCircle size={18} />
              </button>
              {userPermissions?.canManageAccounts && (
                <button
                  onClick={(e) => handleDeleteSale(e, sale.id)}
                  className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                  title="Force Delete"
                >
                  <Trash2 size={18} />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  wrapAction(async () => {
                    await Promise.resolve(onApproveSale(sale.id));
                  }, 'Approving Sale...', { silent: true });
                }}
                disabled={!contactConfirmed[sale.id] || isProcessing}
                className={`h-10 px-6 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${
                  contactConfirmed[sale.id]
                    ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 active:scale-95'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const selectedSaleArtwork = selectedSale ? getArtwork(selectedSale.artworkId) : null;
  const selectedSaleAttachments = selectedSale
    ? [
        {
          label: 'IT / DR',
          urls: (() => {
            const saleUrls = normalizeAttachmentUrls(selectedSale.itdrUrl);
            return saleUrls.length > 0 ? saleUrls : normalizeAttachmentUrls(selectedSaleArtwork?.itdrImageUrl);
          })(),
          tone: 'emerald'
        },
        {
          label: 'RSA / AR',
          urls: (() => {
            const saleUrls = normalizeAttachmentUrls(selectedSale.rsaUrl);
            return saleUrls.length > 0 ? saleUrls : normalizeAttachmentUrls(selectedSaleArtwork?.rsaImageUrl);
          })(),
          tone: 'amber'
        },
        {
          label: 'OR / CR',
          urls: (() => {
            const saleUrls = normalizeAttachmentUrls(selectedSale.orCrUrl);
            return saleUrls.length > 0 ? saleUrls : normalizeAttachmentUrls(selectedSaleArtwork?.orCrImageUrl);
          })(),
          tone: 'blue'
        }
      ]
    : [];
  const selectedSaleChecklist = getChecklistState(selectedSale);


  // Approval History
  const approvalHistory = useMemo(() => {
    return sales
      .filter(s => s.status === SaleStatus.APPROVED || s.status === SaleStatus.DECLINED)
      .map(s => {
        const art = artworks.find(a => a.id === s.artworkId);
        return {
          ...s,
          artwork: art,
          branch: art?.currentBranch || 'Main'
        };
      })
      .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
  }, [sales, artworks]);

  const branches = ['All', ...Array.from(new Set(approvalHistory.map(h => h.branch)))].filter(b => b !== 'Main').sort();
  const filteredHistory = selectedBranch === 'All' 
    ? approvalHistory 
    : approvalHistory.filter(h => h.branch === selectedBranch);

  const handleToggleSelectAllHistory = () => {
    if (selectedHistoryIds.length === filteredHistory.length && filteredHistory.length > 0) {
      setSelectedHistoryIds([]);
    } else {
      setSelectedHistoryIds(filteredHistory.map(h => h.id));
    }
  };

  const handleToggleSelectHistory = (id: string) => {
    setSelectedHistoryIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (onBulkDeleteSales && selectedHistoryIds.length > 0) {
      await Promise.resolve(onBulkDeleteSales(selectedHistoryIds));
      setSelectedHistoryIds([]);
    }
  };

  return (
    <div className={`max-w-[1600px] mx-auto w-full ${hideHeader ? '' : 'p-4 md:p-8 space-y-10'}`}>
      <LoadingOverlay isVisible={isProcessing} title={processMessage} />
      {/* Header Section */}
      {!hideHeader && (
        <div className="flex flex-col gap-6 border-b-2 border-neutral-900 pb-8">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">Sales Approval</h1>
              <p className="text-xs font-bold text-neutral-400 mt-1 uppercase tracking-widest">Review and verify sale declarations</p>
            </div>
            <div className="flex items-center gap-6 text-right">
              <div className="pr-6 border-r border-neutral-200">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Queue</p>
                <p className="text-2xl font-black text-neutral-900">{pendingSales.length}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Total Verified</p>
                <p className="text-2xl font-black text-neutral-900">{approvalHistory.length}</p>
              </div>
            </div>
          </div>

          {/* Primary Tabs */}
          <div className="flex gap-1 p-1 bg-neutral-100 rounded-sm w-fit border border-neutral-200">
            <button
              onClick={() => setActiveTab('approval')}
              className={`px-8 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-sm transition-all flex items-center gap-2 ${activeTab === 'approval' ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/50' : 'text-neutral-400 hover:text-neutral-600'}`}
            >
              <ShieldCheck size={14} />
              Pending
              {pendingSales.length > 0 && (
                <span className="ml-1 w-4 h-4 bg-indigo-600 text-white text-[8px] flex items-center justify-center rounded-full">
                  {pendingSales.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-8 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-sm transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/50' : 'text-neutral-400 hover:text-neutral-600'}`}
            >
              <Clock size={14} />
              History
            </button>
          </div>
        </div>
      )}

      {hideHeader && (
         <div className="flex gap-1 p-1 bg-neutral-100 rounded-sm w-fit border border-neutral-200 mb-8">
            <button
              onClick={() => setActiveTab('approval')}
              className={`px-8 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-sm transition-all flex items-center gap-2 ${activeTab === 'approval' ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/50' : 'text-neutral-400 hover:text-neutral-600'}`}
            >
              Pending Approval
              {pendingSales.length > 0 && (
                <span className="ml-1 w-4 h-4 bg-indigo-600 text-white text-[8px] flex items-center justify-center rounded-full">
                  {pendingSales.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-8 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-sm transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/50' : 'text-neutral-400 hover:text-neutral-600'}`}
            >
              Approval History
            </button>
          </div>
      )}

      <AnimatePresence mode="wait">
        {activeTab === 'approval' ? (
          <motion.div
            key="approval"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Approval Notice Banner */}
            <div className="bg-[#FFF4CE] border border-[#FED9CC] rounded-sm p-5 flex items-start gap-4 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-[#794500] text-white">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#794500] uppercase tracking-tight">Status: Pending Administrative Approval</h4>
                  <p className="text-xs text-[#794500] mt-1 leading-relaxed max-w-2xl">
                    This declaration is currently in the verification queue. No downpayments have been processed, and the sale will only be committed to the ledger once an administrator approves the transaction.
                  </p>
                </div>
              </div>

              {pendingSales.length === 0 ? (
              <div className="py-24 bg-neutral-50 rounded-sm border border-dashed border-neutral-200 flex flex-col items-center justify-center text-neutral-300 gap-4">
                <ShieldCheck size={56} strokeWidth={1} />
                <div className="text-center">
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-neutral-400">Queue Synchronized</p>
                  <p className="text-[10px] font-bold mt-1 tracking-widest">No pending sale declarations require verification.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-sm border transition-all ${viewMode === 'grid' ? 'bg-neutral-900 text-white border-neutral-900 shadow-md' : 'bg-white text-neutral-400 border-neutral-200'}`}
                    >
                      <LayoutGrid size={16} />
                    </button>
                    <button 
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-sm border transition-all ${viewMode === 'list' ? 'bg-neutral-900 text-white border-neutral-900 shadow-md' : 'bg-white text-neutral-400 border-neutral-200'}`}
                    >
                      <Rows3 size={16} />
                    </button>
                  </div>
                </div>

                <div className={viewMode === 'grid' ? "grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" : "space-y-4"}>
                  {pendingSales.map(sale => (
                    <div key={sale.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                      {viewMode === 'grid' ? renderSaleCard(sale) : renderSaleRow(sale)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            <div className="flex flex-col gap-8">
              {/* Branch Selector */}
              <div className="flex flex-wrap gap-2 p-1 bg-neutral-100 rounded-sm w-fit border border-neutral-200">
                {branches.map(branch => (
                  <button
                    key={branch}
                    onClick={() => setSelectedBranch(branch)}
                    className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all ${selectedBranch === branch ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/50' : 'text-neutral-400 hover:text-neutral-600'}`}
                  >
                    {branch}
                  </button>
                ))}
              </div>

              <div className="bg-white rounded-sm border border-neutral-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200">
                      <th className="px-6 py-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedHistoryIds.length === filteredHistory.length && filteredHistory.length > 0}
                          onChange={handleToggleSelectAllHistory}
                          className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                        />
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Artwork</th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Client</th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Agent</th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Branch</th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Total Value</th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Approval Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredHistory.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-24 text-center text-[10px] font-bold text-neutral-300 uppercase tracking-widest italic">
                          No historical sale records found
                        </td>
                      </tr>
                    ) : (
                      filteredHistory.map((h) => (
                        <tr key={h.id} className={`hover:bg-neutral-50/30 transition-all group ${selectedHistoryIds.includes(h.id) ? 'bg-indigo-50/30' : ''}`}>
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedHistoryIds.includes(h.id)}
                              onChange={() => handleToggleSelectHistory(h.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-sm bg-neutral-50 overflow-hidden border border-neutral-100 shadow-sm">
                                {h.artwork?.imageUrl && <img src={h.artwork.imageUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt="" />}
                              </div>
                              <div>
                                <span className="text-[11px] font-black text-neutral-900 uppercase tracking-tight block">{h.artwork?.title}</span>
                                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">{h.artwork?.artist}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[11px] font-bold text-neutral-600">{h.clientName}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[11px] font-bold text-neutral-600">{h.agentName}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 rounded-sm bg-neutral-50 text-neutral-500 text-[9px] font-black uppercase tracking-widest border border-neutral-200">
                              {h.branch}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-widest border ${h.status === SaleStatus.APPROVED ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                              {h.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[11px] font-black text-neutral-900">₱{(h.artwork?.price || 0).toLocaleString()}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex items-center gap-2 text-neutral-400">
                              <Calendar size={12} />
                              <span className="text-[10px] font-bold">{new Date(h.saleDate).toLocaleDateString()}</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Selection Bar */}
              <AnimatePresence>
                {selectedHistoryIds.length > 0 && (
                  <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-6 px-8 py-4 bg-neutral-900 text-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-neutral-800"
                  >
                    <div className="flex items-center gap-3 pr-6 border-r border-neutral-700">
                      <div className="w-6 h-6 rounded-full bg-indigo-500 text-white text-[10px] font-black flex items-center justify-center">
                        {selectedHistoryIds.length}
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest text-neutral-400">Selected</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedHistoryIds([])}
                        className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleBulkDelete}
                        className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-rose-900/20"
                      >
                        <Trash2 size={14} />
                        Delete Permanently
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Sale Detail Modal */}
      <AnimatePresence>
        {selectedSale && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 p-4 md:p-6 backdrop-blur-sm overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-[0_32px_80px_rgba(0,0,0,0.35),0_4px_24px_rgba(0,0,0,0.1)]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                    <ShieldCheck size={18} strokeWidth={2} />
                  </div>
                  <div>
                      <h2 className="text-lg font-bold text-slate-800 tracking-tight leading-none">Review Declaration</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {selectedSale.id.substring(0, 8)}</span>
                      <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-widest rounded">Pending</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSale(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                >
                  <XCircle size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-5">
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.8fr] gap-5">
                  {/* Left Column */}
                  <div className="space-y-8">
                    {/* Artwork Details Card */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-2.5 mb-4 border-b border-slate-100 pb-3">
                         <LayoutGrid size={14} className="text-blue-600" />
                         <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Artwork Details</h3>
                      </div>
                      {(() => {
                        const liveArt = artworks.find(a => a.id === selectedSale.artworkId);
                        const displayArt = liveArt || selectedSale.artworkSnapshot;
                        
                        return (
                          <div className="flex gap-5">
                            {displayArt?.imageUrl ? (
                                <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                                <OptimizedImage src={displayArt.imageUrl} alt="Artwork" className="w-full h-full object-contain" />
                              </div>
                            ) : (
                               <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-slate-300">
                                <FileImage size={24} />
                              </div>
                            )}
                            <div className="min-w-0 flex-1 py-0.5">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{displayArt?.code || 'N/A'}</p>
                              <h4 className="text-lg font-black text-slate-900 leading-tight mb-1 truncate">{displayArt?.title || 'Untitled'}</h4>
                              <p className="text-sm font-bold text-slate-500 mb-3">{displayArt?.artist || 'Unknown Artist'}</p>
                               <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-emerald-700 border border-emerald-100">
                                <Tag size={12} />
                                <span className="text-xs font-black tracking-tight">{formatCurrency(displayArt?.price || 0)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Client Info Card */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-2.5 mb-4 border-b border-slate-100 pb-3">
                         <User size={14} className="text-blue-600" />
                         <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Client Information</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                         <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 transition-all hover:bg-slate-100">
                           <div className="flex items-center gap-2 mb-1 text-slate-400"><User size={12} /><span className="text-[9px] font-black uppercase tracking-widest">Full Name</span></div>
                           <p className="text-sm font-bold text-slate-700">{selectedSale.clientName}</p>
                        </div>
                         <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 transition-all hover:bg-slate-100">
                           <div className="flex items-center gap-2 mb-1 text-slate-400"><Mail size={12} /><span className="text-[9px] font-black uppercase tracking-widest">Email Address</span></div>
                           <p className="text-sm font-bold text-slate-700 truncate">{selectedSale.clientEmail || 'N/A'}</p>
                        </div>
                         <div className="col-span-full rounded-lg border border-slate-100 bg-slate-50 p-3 transition-all hover:bg-slate-100">
                           <div className="flex items-center gap-2 mb-1 text-slate-400"><Phone size={12} /><span className="text-[9px] font-black uppercase tracking-widest">Contact Number</span></div>
                           <p className="text-sm font-bold text-slate-700">{selectedSale.clientContact || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    
                    {selectedSale.requestedAttachments && selectedSale.requestedAttachments.length > 0 && (
                      <div className="rounded-md border border-[#CFE4FA] bg-[#F0F6FF] p-6 shadow-sm">
                         <div className="flex items-center gap-3 mb-4">
                           <Clock size={16} className="text-[#0078D4]" />
                           <h3 className="text-sm font-semibold text-[#005A9E]">Re-upload Context</h3>
                         </div>
                         <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                              {selectedSale.requestedAttachments.map(req => (
                                <span key={req} className="px-2 py-1 bg-white border border-[#A19F9D] text-[#323130] text-[10px] font-bold uppercase tracking-wider rounded-sm shadow-sm">
                                  {req === 'itdr' ? 'IT/DR' : req === 'rsa' ? 'RSA/AR' : 'OR/CR'} REQUIRED
                                </span>
                              ))}
                            </div>
                            {selectedSale.declineReason && (
                              <div className="bg-white border-l-4 border-[#0078D4] rounded-sm p-4 shadow-sm">
                                <p className="text-[10px] font-bold text-[#605E5C] uppercase tracking-wider mb-1">Previous Admin Feedback</p>
                                <p className="text-sm font-medium text-[#323130] italic leading-relaxed">"{selectedSale.declineReason}"</p>
                              </div>
                            )}
                         </div>
                      </div>
                    )}

                    {/* Approval Checklist Card */}
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 bg-white">
                         <ShieldCheck size={14} className="text-blue-600" />
                         <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Approval Checklist</h3>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {[
                          {
                            key: 'buyerContacted' as const,
                            title: 'Buyer confirmed',
                            detail: 'Contact verification complete.'
                          },
                          {
                            key: 'clientDetailsVerified' as const,
                            title: 'Details verified',
                            detail: 'Info is correct/complete.'
                          },
                          {
                            key: 'pricingVerified' as const,
                            title: 'Pricing reviewed',
                            detail: 'Setup & price verified.'
                          },
                          {
                            key: 'documentsVerified' as const,
                            title: 'Proofs reviewed',
                            detail: 'Files valid & readable.'
                          }
                        ].map((item) => (
                          <label
                            key={item.key}
                             className="flex cursor-pointer items-start gap-3 px-5 py-3 transition-all hover:bg-slate-50"
                          >
                            <div className="relative flex items-center mt-0.5">
                              <input
                                type="checkbox"
                                checked={selectedSaleChecklist[item.key]}
                                onChange={() => handleChecklistToggle(selectedSale, item.key)}
                                className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-slate-300 transition-all checked:bg-blue-600 checked:border-blue-600"
                              />
                              <CheckCircle size={10} className="absolute left-0.5 top-0.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-700 leading-none mb-1">{item.title}</p>
                              <p className="text-[10px] text-slate-500 leading-tight">{item.detail}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-8">
                    {/* Transaction Metadata Card */}
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                      <div className="px-5 py-4 border-b border-slate-100 bg-white flex items-center gap-2.5">
                         <Shield size={14} className="text-blue-600" />
                         <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Transaction Details</h3>
                      </div>
                      <div className="divide-y divide-slate-50">
                         <div className="flex items-center justify-between px-5 py-3.5">
                           <div className="flex items-center gap-2.5 text-slate-400"><Calendar size={12} /><span className="text-[10px] font-bold uppercase tracking-widest">Sale Date</span></div>
                           <span className="text-xs font-black text-slate-800">{new Date(selectedSale.saleDate).toLocaleDateString()}</span>
                        </div>
                         <div className="flex items-center justify-between px-5 py-3.5">
                           <div className="flex items-center gap-2.5 text-slate-400"><Tag size={12} /><span className="text-[10px] font-bold uppercase tracking-widest">Downpayment</span></div>
                           <span className="text-xs font-black text-emerald-600">{formatCurrency(selectedSale.downpayment || 0)}</span>
                        </div>
                         <div className="flex items-center justify-between px-6 py-4 bg-[#FAF9F8]">
                           <div className="flex items-center gap-3 text-[#605E5C]"><User size={14} /><span className="text-xs font-semibold">Handling Agent</span></div>
                           <span className="text-sm font-bold text-[#323130]">{selectedSale.agentName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Verification Attachments Section */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5 px-1">
                         <Eye size={14} className="text-blue-600" />
                         <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Verification Attachments</h3>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        {selectedSaleAttachments.map((attachment) => {
                          const previewUrl = attachment.urls[0];
                          const previewKind = getAttachmentKind(previewUrl);
                          const isReady = attachment.urls.length > 0;

                          return (
                            <button
                              key={attachment.label}
                              type="button"
                              onClick={() => setActiveAttachmentGroup({ label: attachment.label, urls: attachment.urls })}
                              className="group flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm transition-all hover:border-blue-500 hover:shadow-md text-left"
                            >
                              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
                                <div>
                                  <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{attachment.label}</p>
                                  <p className="text-[9px] text-slate-500 mt-0.5">
                                    {isReady ? `${attachment.urls.length} document(s) attached` : 'No proof uploaded'}
                                  </p>
                                </div>
                                <div className={`flex h-5 items-center px-2 rounded-md text-[8px] font-black uppercase tracking-widest border ${isReady ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                  {isReady ? 'Ready' : 'Missing'}
                                </div>
                              </div>

                               <div className="p-3 bg-slate-50">
                                 <div className="relative aspect-video w-full rounded-lg border border-slate-100 bg-white flex items-center justify-center overflow-hidden">
                                  {previewUrl ? (
                                    <>
                                      {previewKind === 'image' ? (
                                        <OptimizedImage src={previewUrl} alt={attachment.label} className="w-full h-full object-contain" />
                                      ) : (
                                        <div className="flex flex-col items-center gap-3">
                                           <div className="h-12 w-12 flex items-center justify-center bg-[#F3F2F1] text-[#605E5C] rounded-sm">
                                            {previewKind === 'pdf' ? <FileText size={24} /> : <FileImage size={24} />}
                                          </div>
                                          <p className="text-[10px] font-semibold text-[#605E5C] uppercase tracking-widest">{previewKind === 'pdf' ? 'PDF' : 'FILE'}</p>
                                        </div>
                                      )}
                                      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/5 flex items-center justify-center">
                                        <div className="opacity-0 translate-y-2 transition-all group-hover:opacity-100 group-hover:translate-y-0 flex items-center gap-2">
                                           <div className="bg-white text-[#323130] text-[10px] font-bold px-4 py-2 rounded-sm shadow-md flex items-center gap-2 border border-[#E1E1E1]">
                                             <Eye size={12} />
                                             Expand View
                                           </div>
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="flex flex-col items-center gap-2 text-[#A19F9D]">
                                      <AlertCircle size={20} />
                                      <span className="text-[9px] font-bold uppercase tracking-widest">Awaiting Upload</span>
                                    </div>
                                  )}
                                </div>
                               </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>              {/* Modal Footer */}
              <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row">
                <div className="flex items-start gap-3 px-4 py-3 bg-slate-50 rounded-lg border border-slate-100 max-w-sm">
                    <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Requirement Notice</p>
                      <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                        Verify all items before approval. Declined declarations notify the agent.
                      </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => handleDeclineClick(e, selectedSale.id)}
                    className="h-10 px-6 rounded-lg border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-50 transition-all active:scale-95"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => wrapAction(async () => {
                      await Promise.resolve(onApproveSale(selectedSale.id));
                      setSelectedSale(null);
                    }, 'Processing Sale Approval...', { silent: true })}
                    disabled={!isSaleReadyForApproval(selectedSale) || isProcessing}
                    className={`h-10 px-8 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg ${
                      isSaleReadyForApproval(selectedSale) 
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200' 
                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                    }`}
                  >
                    Approve Declaration
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeAttachmentGroup && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/60 p-4 md:p-6 backdrop-blur-sm overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 12 }}
              className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-[0_32px_80px_rgba(0,0,0,0.35),0_4px_24px_rgba(0,0,0,0.1)]"
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                    <FileImage size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight leading-none">{activeAttachmentGroup.label}</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{activeAttachmentGroup.urls.length} Documents Verified</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveAttachmentGroup(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="custom-scrollbar flex-1 overflow-y-auto px-6 py-6">
                {activeAttachmentGroup.urls.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                    <AlertCircle size={48} className="mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest">No attachments found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {activeAttachmentGroup.urls.map((url, index) => {
                      const kind = getAttachmentKind(url);
                      const fileName = getAttachmentName(url, index);
                      return (
                        <div key={`${activeAttachmentGroup.label}-${url}-${index}`} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all">
                          <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between gap-3 bg-white">
                            <div className="min-w-0">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">DOC {index + 1}</p>
                              <p className="text-xs font-bold text-slate-700 truncate">{fileName}</p>
                            </div>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-700 transition-all active:scale-95 shadow-sm"
                            >
                              <ExternalLink size={12} />
                              Open
                            </a>
                          </div>
                          <div className="p-4 bg-slate-50">
                            <div className="aspect-[16/10] w-full overflow-hidden rounded-lg border border-slate-100 bg-white flex items-center justify-center">
                              {kind === 'image' ? (
                                <OptimizedImage src={url} alt={fileName} className="w-full h-full object-contain p-2" />
                              ) : (
                                <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-4 text-center">
                                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100 text-slate-400 border border-slate-200 shadow-sm">
                                    {kind === 'pdf' ? <FileText size={24} /> : <FileImage size={24} />}
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                      {kind === 'pdf' ? 'Acrobat' : 'System'}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-600 break-all">{fileName}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Decline Reason Modal */}
      <AnimatePresence>
        {isDeclineModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[140] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.35)] border border-slate-200"
            >
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center border border-rose-100">
                    <AlertCircle size={18} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 tracking-tight leading-none">Decline Declaration</h3>
                </div>
                <button
                  onClick={() => {
                    setIsDeclineModalOpen(false);
                    setDeclineSaleId(null);
                    setDeclineMode('remediation');
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6 bg-slate-50">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Rejection Type</label>
                  <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-200/60 p-1">
                    {[
                      { id: 'remediation', label: 'Request Fixes' },
                      { id: 'straight', label: 'Straight Reject' }
                    ].map(option => (
                      <button
                        key={option.id}
                        onClick={() => {
                          setDeclineMode(option.id as 'remediation' | 'straight');
                          if (option.id === 'straight') setRequestedFiles(new Set());
                        }}
                        className={`h-9 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
                          declineMode === option.id
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {declineMode === 'remediation' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Required Feedback</label>
                    <OptimizedTextarea
                      value={declineReason}
                      onChange={(e: any) => setDeclineReason(e.target.value)}
                      placeholder="Enter the specific reason for declining..."
                      className="w-full h-32 px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none placeholder:text-slate-300 shadow-sm"
                    />
                  </div>
                )}

                {declineMode === 'remediation' ? (
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Request Re-uploads</label>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: 'itdr', label: 'IT/DR Record' },
                        { id: 'rsa', label: 'RSA/AR Agreement' },
                        { id: 'orcr', label: 'OR/CR Documents' }
                      ].map((file) => (
                        <button
                          key={file.id}
                          onClick={() => {
                            const next = new Set(requestedFiles);
                            if (next.has(file.id)) next.delete(file.id);
                            else next.add(file.id);
                            setRequestedFiles(next);
                          }}
                          className={`flex items-center justify-between px-4 py-2.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${
                            requestedFiles.has(file.id)
                              ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                              : 'bg-white border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600'
                          }`}
                        >
                          {file.label}
                          {requestedFiles.has(file.id) && <CheckCircle size={12} />}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-rose-100 bg-rose-50 p-4">
                    <p className="text-[10px] font-black text-rose-700 uppercase tracking-widest">Straight Rejection</p>
                    <p className="mt-2 text-xs font-bold leading-relaxed text-rose-900">
                      This sale declaration will be declined without requesting new documents from the agent.
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                   <button
                    onClick={() => {
                      setIsDeclineModalOpen(false);
                      setDeclineSaleId(null);
                      setDeclineMode('remediation');
                    }}
                    className="flex-1 h-10 rounded-lg border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDecline}
                    disabled={declineMode === 'remediation' && !declineReason.trim()}
                    className={`flex-1 h-10 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg ${
                      declineMode === 'straight' || declineReason.trim()
                        ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200'
                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                    }`}
                  >
                    {declineMode === 'straight' ? 'Straight Reject' : 'Confirm Decline'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SalesApprovalPage;
