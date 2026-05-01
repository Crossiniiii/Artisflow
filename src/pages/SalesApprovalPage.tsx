import React, { useEffect, useMemo, useState } from 'react';
import { SaleRecord, Artwork, SaleStatus, UserPermissions } from '../types';
import { CheckCircle, XCircle, FileImage, FileText, ShieldCheck, LayoutGrid, Rows3, Eye, ExternalLink, Calendar, User, Mail, Phone, Tag, Info, AlertCircle, MessageSquare, ChevronRight } from 'lucide-react';
import { OptimizedImage } from '../components/OptimizedImage';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useActionProcessing } from '../hooks/useActionProcessing';
import LoadingOverlay from '../components/LoadingOverlay';

interface SalesApprovalPageProps {
  sales: SaleRecord[];
  artworks: Artwork[];
  onApproveSale: (saleId: string) => void;
  onDeclineSale: (saleId: string, reason?: string, requestedFiles?: string[]) => void;
  userPermissions?: UserPermissions;
}

const SalesApprovalPage: React.FC<SalesApprovalPageProps> = ({ 
  sales, 
  artworks, 
  onApproveSale, 
  onDeclineSale, 
  userPermissions 
}) => {
  const [requestedFiles, setRequestedFiles] = useState<Set<string>>(new Set());

  const pendingSales = useMemo(() => {
    const latestPendingByArtwork = new Map<string, SaleRecord>();

    [...sales]
      .filter(s => s.status === SaleStatus.FOR_SALE_APPROVAL && !s.isCancelled)
      .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())
      .forEach(sale => {
        if (!latestPendingByArtwork.has(sale.artworkId)) {
          latestPendingByArtwork.set(sale.artworkId, sale);
        }
      });

    return Array.from(latestPendingByArtwork.values());
  }, [sales]);

  const [contactConfirmed, setContactConfirmed] = useState<Record<string, boolean>>({});
  const { isProcessing, processMessage, processProgress, wrapAction } = useActionProcessing({ itemTitle: 'Sales Approval', itemCode: 'SAL' });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [declineSaleId, setDeclineSaleId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
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
        await Promise.resolve(onDeclineSale(declineSaleId, declineReason, Array.from(requestedFiles)));
        setIsDeclineModalOpen(false);
        setDeclineSaleId(null);
        setDeclineReason('');
        setRequestedFiles(new Set());
        if (selectedSale?.id === declineSaleId) setSelectedSale(null);
      }, 'Synchronizing Sale Decline with Database...');
    }
  };

  const renderSaleCard = (sale: SaleRecord) => {
    const art = sale.artworkSnapshot || getArtwork(sale.artworkId);

    return (
      <div 
        key={sale.id} 
        onClick={() => setSelectedSale(sale)}
        className="group relative cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-[0_18px_32px_rgba(37,99,235,0.10)]"
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
            Pending Approval
          </span>
          {sale.requestedAttachments && sale.requestedAttachments.length > 0 && (
            <span className="inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-700 animate-pulse">
              Re-upload Verification
            </span>
          )}
        </div>
        {art && (
          <div className="flex items-center gap-4 mb-6">
            {art.imageUrl ? (
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_4px_12px_rgba(15,23,42,0.06)]">
                <OptimizedImage src={art.imageUrl} alt={art.title} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
                <FileImage size={24} />
              </div>
            )}
            <div>
              <h4 className="font-bold text-neutral-900 tracking-tight line-clamp-1">{art.title}</h4>
              <p className="text-xs font-medium text-neutral-500">{art.artist}</p>
              <p className="text-xs font-bold text-neutral-900 mt-1">{formatCurrency(art.price || 0)}</p>
            </div>
          </div>
        )}
          <div className="mb-6 space-y-3 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Client</span>
            <span className="text-xs font-bold text-neutral-900">{sale.clientName}</span>
          </div>
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Agent</span>
            <span className="text-xs font-bold text-neutral-900">{sale.agentName}</span>
          </div>
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Requested On</span>
            <span className="text-xs font-medium text-neutral-600">{new Date(sale.saleDate).toLocaleDateString()}</span>
          </div>
          {sale.downpayment !== undefined && (
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Downpayment</span>
              <span className="text-xs font-bold text-emerald-600">{formatCurrency(sale.downpayment)}</span>
            </div>
          )}
        </div>

        <div className="mb-4 flex items-start gap-2 rounded-lg border border-sky-100 bg-[linear-gradient(180deg,rgba(239,246,255,0.95),rgba(248,250,252,0.85))] p-3">
          <input
            type="checkbox"
            id={`confirm-${sale.id}`}
            checked={!!contactConfirmed[sale.id]}
            onChange={() => handleToggleConfirm(sale.id)}
            className="mt-1 w-4 h-4 rounded border-gray-300 text-neutral-900 focus:ring-neutral-900"
          />
          <label htmlFor={`confirm-${sale.id}`} className="text-xs font-medium text-neutral-700 leading-tight">
            I confirm that the buyer has been contacted via contact number or email.
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={(e) => handleDeclineClick(e, sale.id)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-red-600 transition-colors hover:border-red-300 hover:bg-red-50"
          >
            <XCircle size={14} />
            Decline
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              wrapAction(async () => {
                await Promise.resolve(onApproveSale(sale.id));
              }, 'Processing Sale Approval...');
            }}
            disabled={!contactConfirmed[sale.id]}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] transition-colors ${
              contactConfirmed[sale.id]
                ? 'bg-[#0f172a] text-white shadow-[0_10px_20px_rgba(15,23,42,0.16)] hover:bg-[#0b1220]'
                : 'cursor-not-allowed bg-slate-200 text-slate-400'
            }`}
          >
            <CheckCircle size={14} />
            Approve
          </button>
        </div>
      </div>
    );
  };

  const renderSaleRow = (sale: SaleRecord) => {
    const art = sale.artworkSnapshot || getArtwork(sale.artworkId);

    return (
      <div
        key={sale.id}
        onClick={() => setSelectedSale(sale)}
        className="cursor-pointer rounded-lg border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition-all duration-200 hover:border-sky-300 hover:shadow-[0_16px_30px_rgba(37,99,235,0.08)]"
      >
        <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            {art?.imageUrl ? (
              <div className="w-16 h-16 rounded-md overflow-hidden bg-neutral-100 flex-shrink-0">
                <OptimizedImage src={art.imageUrl} alt={art.title} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-md bg-neutral-100 flex items-center justify-center text-neutral-400 flex-shrink-0">
                <FileImage size={24} />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                  Pending Approval
                </span>
              </div>
              <h4 className="font-bold text-neutral-900 tracking-tight">{art?.title || 'Untitled Artwork'}</h4>
              <p className="text-sm text-neutral-500">{art?.artist || 'Unknown Artist'}</p>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm lg:grid-cols-5">
                <div>
                  <span className="block text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Client</span>
                  <span className="font-bold text-neutral-900">{sale.clientName}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Agent</span>
                  <span className="font-medium text-neutral-700">{sale.agentName}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Requested On</span>
                  <span className="font-medium text-neutral-700">{new Date(sale.saleDate).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Price</span>
                  <span className="font-bold text-neutral-900">{formatCurrency(art?.price || 0)}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Downpayment</span>
                  <span className="font-bold text-emerald-600">
                    {sale.downpayment !== undefined ? formatCurrency(sale.downpayment) : 'None'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full lg:max-w-sm">
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-sky-100 bg-[linear-gradient(180deg,rgba(239,246,255,0.95),rgba(248,250,252,0.85))] p-3">
              <input
                type="checkbox"
                id={`confirm-list-${sale.id}`}
                checked={!!contactConfirmed[sale.id]}
                onChange={() => handleToggleConfirm(sale.id)}
                className="mt-1 w-4 h-4 rounded border-gray-300 text-neutral-900 focus:ring-neutral-900"
              />
              <label htmlFor={`confirm-list-${sale.id}`} className="text-xs font-medium text-neutral-700 leading-tight">
                Buyer contact has been confirmed by phone or email.
              </label>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={(e) => handleDeclineClick(e, sale.id)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-red-600 transition-colors hover:border-red-300 hover:bg-red-50"
              >
                <XCircle size={14} />
                Decline
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  wrapAction(async () => {
                    await Promise.resolve(onApproveSale(sale.id));
                  }, 'Processing Sale Approval...');
                }}
                disabled={!contactConfirmed[sale.id]}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] transition-colors ${
                  contactConfirmed[sale.id]
                    ? 'bg-[#0f172a] text-white shadow-[0_10px_20px_rgba(15,23,42,0.16)] hover:bg-[#0b1220]'
                    : 'cursor-not-allowed bg-slate-200 text-slate-400'
                }`}
              >
                <CheckCircle size={14} />
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

  return (
    <div className="min-h-screen w-full max-w-none bg-[radial-gradient(circle_at_top_left,rgba(219,234,254,0.45),transparent_22%),linear-gradient(180deg,#f6f9fc_0%,#eef3f8_100%)] px-8 py-8 pb-20">
      {isProcessing && createPortal(
        <LoadingOverlay 
          isVisible={isProcessing} 
          title={processMessage} 
          progress={{ current: processProgress, total: 100 }}
        />, 
        document.body
      )}
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-[-0.05em] text-slate-950">Sales Approval</h1>
          <p className="text-sm text-slate-500 mt-2 font-medium">Review and verify new sale declarations from agents.</p>
        </div>
      </div>

      {pendingSales.length === 0 ? (
        <div className="bg-white border text-center py-20 rounded-md shadow-sm border-neutral-200/60">
          <ShieldCheck className="mx-auto text-neutral-300 mb-4" size={48} />
          <h3 className="text-lg font-bold text-neutral-900 tracking-tight">All Caught Up</h3>
          <p className="text-sm text-neutral-500 mt-2">There are no pending sales requiring approval.</p>
        </div>
      ) : (
        <div>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {pendingSales.map(renderSaleCard)}
            </div>
          ) : (
            <div className="space-y-4">
              {pendingSales.map(renderSaleRow)}
            </div>
          )}
        </div>
      )}

      {/* Sale Detail Modal */}
      <AnimatePresence>
        {selectedSale && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(15,23,42,0.52)] p-4 backdrop-blur-[6px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="flex max-h-[86vh] w-full max-w-[1080px] flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_28px_72px_rgba(15,23,42,0.20)]"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-slate-200 bg-[linear-gradient(180deg,rgba(247,250,253,0.98),rgba(255,255,255,1))] px-8 py-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-slate-900 bg-[#0f172a] text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)]">
                    <Info size={26} />
                  </div>
                  <div>
                      <h2 className="text-[1.75rem] font-black uppercase tracking-[-0.04em] text-slate-950">Sale Declaration Review</h2>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">ID: {selectedSale.id.substring(0, 8)}</span>
                      <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                      <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">Pending Approval</span>
                      {selectedSale.requestedAttachments && selectedSale.requestedAttachments.length > 0 && (
                        <span className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-indigo-700 animate-pulse">Re-upload Verification</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSale(null)}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-slate-400 shadow-[0_8px_18px_rgba(15,23,42,0.06)] transition-all hover:border-slate-300 hover:text-slate-900 active:scale-95"
                >
                  <XCircle size={22} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="custom-scrollbar flex-1 overflow-y-auto bg-[linear-gradient(180deg,#ffffff_0%,#f5f9fd_100%)] px-8 py-7">
                <div className="grid grid-cols-1 lg:grid-cols-[1.04fr_0.96fr] gap-8">
                  {/* Left Column: Artwork & Snapshot */}
                  <div className="space-y-8">
                    <section>
                       <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Artwork Snapshot</h3>
                       <div className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                        {selectedSale.artworkSnapshot?.imageUrl ? (
                            <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
                            <OptimizedImage src={selectedSale.artworkSnapshot.imageUrl} alt="Artwork" className="w-full h-full object-contain bg-white" />
                          </div>
                        ) : (
                           <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 shadow-inner">
                            <FileImage size={28} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Code: {selectedSale.artworkSnapshot?.code || 'N/A'}</p>
                          <h4 className="text-[1.5rem] font-black text-slate-950 leading-tight mb-1">{selectedSale.artworkSnapshot?.title || 'Untitled'}</h4>
                          <p className="text-sm font-bold text-slate-500">{selectedSale.artworkSnapshot?.artist || 'Unknown Artist'}</p>
                           <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
                            <Tag size={12} className="fill-emerald-600/10" />
                            <span className="text-xs font-black uppercase tracking-tighter">{formatCurrency(selectedSale.artworkSnapshot?.price || 0)}</span>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section>
                       <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Client Information</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                           <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-400"><User size={16} /></div>
                          <div className="min-w-0"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Name</p><p className="text-sm font-bold text-slate-950 truncate">{selectedSale.clientName}</p></div>
                        </div>
                         <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                           <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-400"><Mail size={16} /></div>
                          <div className="min-w-0"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email</p><p className="text-sm font-medium text-slate-700 truncate">{selectedSale.clientEmail || 'N/A'}</p></div>
                        </div>
                         <div className="col-span-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                           <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-400"><Phone size={16} /></div>
                          <div className="min-w-0"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contact</p><p className="text-sm font-medium text-slate-700 truncate">{selectedSale.clientContact || 'N/A'}</p></div>
                        </div>
                      </div>
                    </section>
                    
                    {selectedSale.requestedAttachments && selectedSale.requestedAttachments.length > 0 && (
                      <section className="animate-in fade-in slide-in-from-top-2 duration-500">
                        <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-indigo-400">Re-upload Context</h3>
                        <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-5 shadow-sm">
                          <div className="flex flex-wrap gap-2 mb-4">
                            {selectedSale.requestedAttachments.map(req => (
                              <span key={req} className="px-3 py-1 bg-white border border-indigo-200 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">
                                {req === 'itdr' ? 'IT/DR' : req === 'rsa' ? 'RSA/AR' : 'OR/CR'} REQUIRED
                              </span>
                            ))}
                          </div>
                          {selectedSale.declineReason && (
                            <div className="bg-white/80 border border-indigo-100 rounded-lg p-4">
                              <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2">Previous Decline Reason</p>
                              <p className="text-sm font-medium text-slate-700 italic">"{selectedSale.declineReason}"</p>
                            </div>
                          )}
                        </div>
                      </section>
                    )}

                    <section>
                       <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Approval Checklist</h3>
                       <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                        {[
                          {
                            key: 'buyerContacted' as const,
                            title: 'Buyer contact confirmed',
                            detail: 'Phone or email confirmation has been completed.'
                          },
                          {
                            key: 'clientDetailsVerified' as const,
                            title: 'Client details verified',
                            detail: 'Name, email, and mobile number are correct and complete.'
                          },
                          {
                            key: 'pricingVerified' as const,
                            title: 'Pricing and payment reviewed',
                            detail: 'Valuation, downpayment request, and sale setup are correct.'
                          },
                          {
                            key: 'documentsVerified' as const,
                            title: 'Required attachments reviewed',
                            detail: 'Submitted proofs are valid and readable for this declaration.'
                          }
                        ].map((item, index) => (
                          <label
                            key={item.key}
                             className={`flex cursor-pointer items-start gap-3 px-5 py-4 transition-colors hover:bg-slate-50 ${index !== 0 ? 'border-t border-slate-100' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedSaleChecklist[item.key]}
                              onChange={() => handleChecklistToggle(selectedSale, item.key)}
                              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-900"
                            />
                            <div>
                              <p className="text-sm font-bold text-slate-900">{item.title}</p>
                              <p className="text-xs text-slate-500 mt-1">{item.detail}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </section>
                  </div>

                  {/* Right Column: Attachments & metadata */}
                  <div className="space-y-8">
                    <section>
                       <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Transaction Details</h3>
                       <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                         <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 p-4">
                          <div className="flex items-center gap-3"><Calendar className="text-slate-400" size={16} /><span className="text-xs font-bold text-slate-700">Sale Date</span></div>
                          <span className="text-sm font-black text-slate-950">{new Date(selectedSale.saleDate).toLocaleDateString()}</span>
                        </div>
                         <div className="flex items-center justify-between border-b border-slate-200 p-4">
                          <div className="flex items-center gap-3"><Tag className="text-slate-400" size={16} /><span className="text-xs font-bold text-slate-700">Requested Downpayment</span></div>
                          <span className="text-sm font-black text-emerald-700">{formatCurrency(selectedSale.downpayment || 0)}</span>
                        </div>
                         <div className="flex items-center justify-between bg-slate-50/80 p-4">
                          <div className="flex items-center gap-3"><User className="text-slate-400" size={16} /><span className="text-xs font-bold text-slate-700">Handling Agent</span></div>
                          <span className="text-sm font-black text-slate-950">{selectedSale.agentName}</span>
                        </div>
                      </div>
                    </section>

                    <section>
                       <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Verification Attachments</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {selectedSaleAttachments.map((attachment) => {
                          const previewUrl = attachment.urls[0];
                          const previewKind = getAttachmentKind(previewUrl);
                          const toneClasses = attachment.tone === 'emerald'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : attachment.tone === 'amber'
                              ? 'border-amber-200 bg-amber-50 text-amber-700'
                              : 'border-blue-200 bg-blue-50 text-blue-700';

                          return (
                            <button
                              key={attachment.label}
                              type="button"
                              onClick={() => setActiveAttachmentGroup({ label: attachment.label, urls: attachment.urls })}
                               className="rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition-all hover:border-sky-300 hover:shadow-[0_14px_28px_rgba(37,99,235,0.08)] focus:outline-none focus:ring-2 focus:ring-sky-200"
                            >
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.18em]">{attachment.label}</p>
                                  <p className="mt-1 text-xs font-medium text-slate-500">
                                    {attachment.urls.length > 0 ? `${attachment.urls.length} file${attachment.urls.length > 1 ? 's' : ''} attached` : 'No proof uploaded'}
                                  </p>
                                </div>
                                 <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${attachment.urls.length > 0 ? toneClasses : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                                  {attachment.urls.length > 0 ? 'Ready' : 'Missing'}
                                </span>
                              </div>

                               <div className="overflow-hidden rounded-lg border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
                                <div className="p-3">
                                   <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white">
                                  {previewUrl ? (
                                    <>
                                      {previewKind === 'image' ? (
                                        <>
                                          <OptimizedImage src={previewUrl} alt={attachment.label} className="w-full h-full object-contain bg-white p-2" />
                                          <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent flex items-center justify-between">
                                            <span className="text-[11px] font-bold text-white">Preview</span>
                                            <a
                                              href={previewUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              onClick={e => e.stopPropagation()}
                                               className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-900 shadow-[0_6px_14px_rgba(15,23,42,0.08)] transition-colors hover:bg-slate-100"
                                            >
                                              <Eye size={12} />
                                              View
                                            </a>
                                          </div>
                                        </>
                                      ) : (
                                        <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-4 text-center bg-slate-50">
                                           <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
                                            {previewKind === 'pdf' ? <FileText size={24} /> : <FileImage size={24} />}
                                          </div>
                                          <div className="space-y-1">
                                            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                                              {previewKind === 'pdf' ? 'PDF Document' : 'Attachment File'}
                                            </p>
                                            <p className="text-xs font-medium text-slate-600 line-clamp-2 break-all">
                                              {getAttachmentName(previewUrl)}
                                            </p>
                                          </div>
                                          <a
                                            href={previewUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={e => e.stopPropagation()}
                                             className="inline-flex items-center gap-2 rounded-md bg-[#0f172a] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white shadow-[0_8px_18px_rgba(15,23,42,0.12)] transition-colors hover:bg-[#0b1220]"
                                          >
                                            <ExternalLink size={12} />
                                            Open File
                                          </a>
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                  <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-300">
                                      <AlertCircle size={20} />
                                      <span className="text-[10px] font-black uppercase tracking-[0.16em]">Missing</span>
                                    </div>
                                  )}
                                </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex flex-col items-center justify-between gap-5 border-t border-slate-200 bg-slate-50/80 px-8 py-6 sm:flex-row">
                <div className="flex w-full flex-1 items-start gap-3 rounded-xl border border-sky-200 bg-[linear-gradient(180deg,rgba(239,246,255,0.95),rgba(248,250,252,0.9))] p-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)] sm:w-auto">
                    <div className="mt-0.5 w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Approval requirements checklist</p>
                      <p className="text-[11px] text-slate-600 mt-1">
                        Complete all review checks before approving. If declined, your comment will be sent back to the declaring agent’s inbox.
                      </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={(e) => handleDeclineClick(e, selectedSale.id)}
                    className="flex-1 rounded-xl border border-red-200 bg-white px-8 py-3.5 text-[10px] font-black uppercase tracking-[0.18em] text-red-600 shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition-all hover:bg-red-50 active:scale-95 sm:flex-none"
                  >
                    Decline Sale
                  </button>
                  <button
                    onClick={() => wrapAction(async () => {
                      await Promise.resolve(onApproveSale(selectedSale.id));
                      setSelectedSale(null);
                    }, 'Processing Sale Approval...')}
                    disabled={!isSaleReadyForApproval(selectedSale)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-10 py-3.5 text-[10px] font-black uppercase tracking-[0.18em] transition-all active:scale-95 sm:flex-none ${
                      isSaleReadyForApproval(selectedSale)
                        ? 'bg-[#0f172a] text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)] hover:bg-[#0b1220]'
                        : 'cursor-not-allowed bg-slate-200 text-slate-400 shadow-none'
                    }`}
                  >
                    <CheckCircle size={14} />
                    Approve Transaction
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeAttachmentGroup && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[115] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="bg-white rounded-[20px] w-full max-w-4xl max-h-[84vh] overflow-hidden shadow-[0_30px_80px_rgba(15,23,42,0.22)] border border-[#d7e0ee] flex flex-col"
            >
              <div className="px-6 py-5 border-b border-[#d9e2ef] flex items-center justify-between bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,1))]">
                <div>
                  <h3 className="text-xl font-black text-slate-950 tracking-tight">{activeAttachmentGroup.label} Attachments</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">
                    {activeAttachmentGroup.urls.length > 0
                      ? `${activeAttachmentGroup.urls.length} file${activeAttachmentGroup.urls.length > 1 ? 's' : ''} available`
                      : 'No proof uploaded for this requirement'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveAttachmentGroup(null)}
                  className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
                {activeAttachmentGroup.urls.length === 0 ? (
                  <div className="h-full min-h-[320px] rounded-[16px] border border-[#dbe4f0] bg-white flex flex-col items-center justify-center gap-3 text-slate-300">
                    <AlertCircle size={24} />
                    <p className="text-xs font-black uppercase tracking-[0.16em]">No Attachment Available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {activeAttachmentGroup.urls.map((url, index) => {
                      const kind = getAttachmentKind(url);
                      const fileName = getAttachmentName(url, index);
                      return (
                        <div key={`${activeAttachmentGroup.label}-${url}-${index}`} className="rounded-[16px] border border-[#dbe4f0] bg-white overflow-hidden shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                          <div className="px-4 py-3 border-b border-[#e8eef6] flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">File {index + 1}</p>
                              <p className="text-sm font-semibold text-slate-700 truncate">{fileName}</p>
                            </div>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white hover:bg-slate-800 transition-colors"
                            >
                              <ExternalLink size={12} />
                              Open
                            </a>
                          </div>
                          <div className="p-4">
                            <div className="aspect-[4/3] w-full overflow-hidden rounded-[12px] border border-[#dbe4f0] bg-white flex items-center justify-center">
                              {kind === 'image' ? (
                                <OptimizedImage src={url} alt={fileName} className="w-full h-full object-contain bg-white p-3" />
                              ) : (
                                <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center bg-slate-50">
                                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-slate-500 shadow-sm border border-slate-200">
                                    {kind === 'pdf' ? <FileText size={28} /> : <FileImage size={28} />}
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                                      {kind === 'pdf' ? 'PDF Document' : 'Attachment File'}
                                    </p>
                                    <p className="text-xs font-medium text-slate-600 break-all">{fileName}</p>
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl p-10 font-sans"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-4 transform rotate-6 border border-red-100">
                  <AlertCircle size={32} />
                </div>
                <h3 className="text-2xl font-black text-neutral-900 tracking-tight">Decline Sale</h3>
                <p className="text-sm text-neutral-500 mt-2 font-medium">Please provide a reason. This will be sent as a message to the agent.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2 px-1">
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Reason / Comment</label>
                    <span className="text-[10px] font-bold text-neutral-300">Required</span>
                  </div>
                  <textarea
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    placeholder="e.g. Incomplete attachments, Incorrect price snapshot, Client details mismatch..."
                    className="w-full h-32 px-5 py-4 bg-neutral-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-neutral-200 transition-all resize-none placeholder:text-neutral-300"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest px-1 block mb-3">Request Re-upload (Optional)</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: 'itdr', label: 'IT/DR (Inventory Transfer)' },
                      { id: 'rsa', label: 'RSA/AR (Sales Agreement)' },
                      { id: 'orcr', label: 'OR/CR (Receipt/Registration)' }
                    ].map((file) => (
                      <button
                        key={file.id}
                        onClick={() => {
                          const next = new Set(requestedFiles);
                          if (next.has(file.id)) next.delete(file.id);
                          else next.add(file.id);
                          setRequestedFiles(next);
                        }}
                        className={`flex items-center justify-between px-5 py-3.5 rounded-2xl border transition-all ${
                          requestedFiles.has(file.id)
                            ? 'bg-red-50 border-red-200 text-red-700 shadow-sm'
                            : 'bg-white border-neutral-100 text-neutral-600 hover:bg-neutral-50'
                        }`}
                      >
                        <span className="text-xs font-bold">{file.label}</span>
                        {requestedFiles.has(file.id) ? (
                          <div className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                            <CheckCircle size={12} strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="w-5 h-5 border-2 border-neutral-200 rounded-full" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setIsDeclineModalOpen(false);
                      setDeclineSaleId(null);
                    }}
                    className="flex-1 py-4 bg-neutral-100 text-neutral-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-200 transition-all transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDecline}
                    disabled={!declineReason.trim()}
                    className="flex-1 py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 disabled:opacity-30 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                  >
                    <MessageSquare size={14} />
                    Confirm & Send
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
