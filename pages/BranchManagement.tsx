import React, { useState } from 'react';
import { Plus, Trash2, Edit2, MapPin, Building2, Search, Package, Sparkles, ArrowLeft, XCircle, AlertCircle, ShoppingBag, Clock, ArrowRightLeft } from 'lucide-react';
import { Artwork, ArtworkStatus, Branch, ExhibitionEvent, SaleRecord } from '../types';

interface BranchManagementProps {
  branches: string[];
  exclusiveBranches?: string[];
  branchAddresses?: Record<string, string>;
  artworks: Artwork[];
  onAddBranch: (name: string, isExclusive?: boolean) => void;
  onUpdateBranch: (oldName: string, newName: string) => void;
  onDeleteBranch: (name: string) => void;
  onUpdateBranchAddress?: (name: string, address: string) => void;
  onViewArtwork?: (id: string) => void;
  events?: ExhibitionEvent[];
  onBulkSale?: (ids: string[], client: string, delivered: boolean) => void;
  onBulkReserve?: (ids: string[], details: string) => void;
  onBulkDeleteArtworks?: (ids: string[]) => void;
  onBulkUpdateArtworks?: (ids: string[], updates: Partial<Artwork>) => void;
  sales?: SaleRecord[];
  canEdit?: boolean;
}

const BranchManagement: React.FC<BranchManagementProps> = ({ 
  branches, 
  exclusiveBranches,
  branchAddresses,
  artworks,
  onAddBranch, 
  onUpdateBranch, 
  onDeleteBranch,
  onUpdateBranchAddress,
  onViewArtwork,
  events,
  onBulkSale,
  onBulkReserve,
  onBulkDeleteArtworks,
  onBulkUpdateArtworks,
  sales,
  canEdit = true
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<string | null>(null);
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [artistStatusFilter, setArtistStatusFilter] = useState<ArtworkStatus>(ArtworkStatus.AVAILABLE);
  const [selectedArtworkIds, setSelectedArtworkIds] = useState<string[]>([]);
  const [activeBranch, setActiveBranch] = useState<string | null>(null);
  
  // New Filters
  const [artistFilter, setArtistFilter] = useState<string>('All');
  const [mediumFilter, setMediumFilter] = useState<string>('All');
  const [sizeFilter, setSizeFilter] = useState<string>('');
  const [bulkActionModal, setBulkActionModal] = useState<{ type: 'sale' | 'reserve' | 'delete' | 'transfer' } | null>(null);
  const [bulkActionValue, setBulkActionValue] = useState('');
  const [bulkActionExtra, setBulkActionExtra] = useState(false);
  const [reservationDetails, setReservationDetails] = useState('');
  const [reservationTab, setReservationTab] = useState<'person' | 'event'>('person');
  const [reservationClient, setReservationClient] = useState('');
  const [reservationEventId, setReservationEventId] = useState('');
  const [dateMonthFilter, setDateMonthFilter] = useState<string>('All');
  const [dateYearFilter, setDateYearFilter] = useState<string>('All');
  const [tallyCompleted, setTallyCompleted] = useState(false);
  const [tallyTimestamp, setTallyTimestamp] = useState<string | null>(null);
  const [tallySnapshot, setTallySnapshot] = useState<any | null>(null);
  const [tallyHistory, setTallyHistory] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isExclusive, setIsExclusive] = useState(false);
  const [errorModal, setErrorModal] = useState<{ title: string; message: string; onConfirm?: () => void } | null>(null);

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const filteredBranches = branches.filter(b => 
    b.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getBranchArtworks = (branch: string) => artworks.filter(a => a.currentBranch === branch);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !branchName.trim()) return;

    if (editingBranch) {
      onUpdateBranch(editingBranch, branchName);
      if (branchAddress.trim()) {
        onUpdateBranchAddress?.(branchName, branchAddress.trim());
      }
    } else {
      onAddBranch(branchName, isExclusive);
      if (branchAddress.trim()) {
        onUpdateBranchAddress?.(branchName, branchAddress.trim());
      }
    }
    handleClose();
  };

  const handleEdit = (branch: string) => {
    setEditingBranch(branch);
    setBranchName(branch);
    setBranchAddress(branchAddresses?.[branch] || '');
    setIsExclusive(exclusiveBranches?.includes(branch) || false);
    setIsModalOpen(true);
  };

  const handleDelete = (branch: string) => {
    if (!canEdit) return;
    if (window.confirm(`Are you sure you want to delete "${branch}"? This might affect existing records.`)) {
      onDeleteBranch(branch);
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingBranch(null);
    setBranchName('');
    setBranchAddress('');
    setIsExclusive(false);
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) return;
    setSelectedArtworkIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllForArtist = (arts: Artwork[]) => {
    if (!canEdit) return;
    const ids = arts.map(a => a.id);
    const allSelected = ids.every(id => selectedArtworkIds.includes(id));
    if (allSelected) {
      setSelectedArtworkIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedArtworkIds(prev => Array.from(new Set([...prev, ...ids])));
    }
  };

  const handleCloseBranchModal = () => {
    setActiveBranch(null);
    setSelectedArtist(null);
    setArtistStatusFilter(ArtworkStatus.AVAILABLE);
    setBulkActionModal(null);
    setBulkActionValue('');
    setBulkActionExtra(false);
    setReservationDetails('');
    setArtistFilter('All');
    setMediumFilter('All');
    setSizeFilter('');
  };

  const handleCloseBulkModal = () => {
    setBulkActionModal(null);
    setBulkActionValue('');
    setBulkActionExtra(false);
    setReservationDetails('');
    setIsCartOpen(true);
  };

  const validateBulkAction = (type: 'sale' | 'reserve' | 'delete' | 'transfer') => {
    const selectedArtworks = artworks.filter(a => selectedArtworkIds.includes(a.id));
    if (type === 'sale') {
      const alreadySold = selectedArtworks.filter(a => a.status === ArtworkStatus.SOLD || a.status === ArtworkStatus.DELIVERED || a.status === ArtworkStatus.EXCLUSIVE_VIEW_ONLY);
      if (alreadySold.length > 0) {
        return {
          valid: false,
          title: 'Cannot Process Sale',
          message: `${alreadySold.length} of the selected items cannot be sold (Sold, Delivered, or Exclusive View Only).\n\nPlease deselect these items before processing a sale.`
        };
      }
    }
    if (type === 'reserve') {
      const notReservable = selectedArtworks.filter(a => a.status === ArtworkStatus.SOLD || a.status === ArtworkStatus.DELIVERED || a.status === ArtworkStatus.CANCELLED || a.status === ArtworkStatus.EXCLUSIVE_VIEW_ONLY);
      if (notReservable.length > 0) {
        return {
          valid: false,
          title: 'Cannot Reserve Items',
          message: `${notReservable.length} of the selected items cannot be reserved because they are Sold, Delivered, Cancelled, or Exclusive View Only.\n\nOnly Available items can be reserved.`
        };
      }
    }
    if (type === 'transfer') {
      const locked = selectedArtworks.filter(a => a.status === ArtworkStatus.SOLD || a.status === ArtworkStatus.DELIVERED);
      if (locked.length > 0) {
        return {
          valid: false,
          title: 'Cannot Transfer Items',
          message: `${locked.length} of the selected items are Sold or Delivered and cannot be transferred.`
        };
      }
    }
    return { valid: true };
  };

  const handleBulkActionClick = (type: 'sale' | 'reserve' | 'delete' | 'transfer') => {
    if (selectedArtworkIds.length === 0) {
      setErrorModal({
        title: 'No items selected',
        message: 'Please select at least one artwork in the cart before applying an action.'
      });
      return;
    }

    const validation = validateBulkAction(type);
    if (!validation.valid && validation.message) {
      setErrorModal({
        title: validation.title || 'Please review selection',
        message: validation.message + '\n\nDo you want to proceed anyway?',
        onConfirm: () => {
          setErrorModal(null);
          setBulkActionValue('');
          setBulkActionExtra(false);
          setReservationDetails('');
          setBulkActionModal({ type });
        }
      });
      return;
    }

    setBulkActionValue('');
    setBulkActionExtra(false);
    setReservationDetails('');
    setBulkActionModal({ type });
  };

  const handleBulkActionSubmit = () => {
    if (!bulkActionModal || !canEdit) return;

    switch (bulkActionModal.type) {
      case 'sale':
        if (onBulkSale && bulkActionValue) {
          onBulkSale(selectedArtworkIds, bulkActionValue, bulkActionExtra);
        }
        break;
      case 'reserve':
        if (onBulkReserve) {
          let details = '';
          if (reservationTab === 'person') {
            if (!reservationClient.trim()) {
              alert('Please enter a client name.');
              return;
            }
            details = `Reserved for ${reservationClient}`;
            if (reservationDetails) details += ` - ${reservationDetails}`;
          } else {
            if (!reservationEventId) {
              alert('Please select an event.');
              return;
            }
            const event = events?.find(e => e.id === reservationEventId);
            const eventName = event ? event.title : 'Unknown Event';
            details = `Reserved for Event: ${eventName}`;
            if (reservationDetails) details += ` - ${reservationDetails}`;
          }
          onBulkReserve(selectedArtworkIds, details);
        }
        break;
      case 'transfer':
        if (onBulkUpdateArtworks && bulkActionValue) {
          const updates: Partial<Artwork> = { currentBranch: bulkActionValue as Branch };
          
          const isTargetExclusive = exclusiveBranches?.includes(bulkActionValue);
          const isSourceExclusive = activeBranch && exclusiveBranches?.includes(activeBranch);

          if (isTargetExclusive) {
             updates.status = ArtworkStatus.EXCLUSIVE_VIEW_ONLY;
          } else if (isSourceExclusive) {
             updates.status = ArtworkStatus.AVAILABLE;
          }

          onBulkUpdateArtworks(selectedArtworkIds, updates);
        }
        break;
      case 'delete':
        if (onBulkDeleteArtworks) {
          onBulkDeleteArtworks(selectedArtworkIds);
        }
        break;
    }

    setBulkActionModal(null);
    setSelectedArtworkIds([]);
    setBulkActionValue('');
    setBulkActionExtra(false);
    setReservationDetails('');
    setReservationTab('person');
    setReservationClient('');
    setReservationEventId('');
    setIsCartOpen(false);
  };

  const getArtYearMonth = (art: Artwork): { y: number; m: number } => {
    if (art.importPeriod) {
      const parts = art.importPeriod.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      return { y, m };
    }
    const base = art.createdAt || String(art.year || '');
    const d = new Date(base);
    if (!isNaN(d.getTime())) {
      return { y: d.getFullYear(), m: d.getMonth() + 1 };
    }
    const ym = base.match(/^(\d{4})[-\/](\d{1,2})$/);
    if (ym) return { y: parseInt(ym[1], 10), m: parseInt(ym[2], 10) };
    const yonly = base.match(/^(\d{4})$/);
    if (yonly) return { y: parseInt(yonly[1], 10), m: 1 };
    return { y: new Date().getFullYear(), m: new Date().getMonth() + 1 };
  };

  const now = new Date();
  const tallyTargetYear =
    dateYearFilter !== 'All' ? parseInt(dateYearFilter, 10) : now.getFullYear();
  const tallyTargetMonth =
    dateMonthFilter !== 'All' ? parseInt(dateMonthFilter, 10) : now.getMonth() + 1;
  const currentMonthLabel = `${monthNames[tallyTargetMonth - 1]} ${tallyTargetYear}`;

  React.useEffect(() => {
    if (!activeBranch) {
      setTallyCompleted(false);
      setTallyTimestamp(null);
      setTallySnapshot(null);
      setTallyHistory([]);
      return;
    }
    if (typeof window === 'undefined') return;

    const prefix = `artisflow-branch-tally-${activeBranch}-`;
    const history: any[] = [];
    let currentSnapshot: any | null = null;

    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      const stored = window.localStorage.getItem(key);
      if (!stored) continue;

      const suffix = key.substring(prefix.length);
      const [yStr, mStr] = suffix.split('-');
      const year = parseInt(yStr, 10);
      const month = parseInt(mStr, 10);

      let snapshot: any = { year, month };
      try {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          snapshot = { year, month, ...parsed };
        } else {
          snapshot.timestamp = String(stored);
        }
      } catch {
        snapshot.timestamp = String(stored);
      }

      history.push(snapshot);

      if (year === tallyTargetYear && month === tallyTargetMonth) {
        currentSnapshot = snapshot;
      }
    }

    history.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    setTallyHistory(history);

    if (currentSnapshot) {
      setTallyCompleted(true);
      setTallySnapshot(currentSnapshot);
      setTallyTimestamp(currentSnapshot.timestamp || null);
    } else {
      setTallyCompleted(false);
      setTallySnapshot(null);
      setTallyTimestamp(null);
    }
  }, [activeBranch, tallyTargetYear, tallyTargetMonth]);

  const handleMarkTallyComplete = () => {
    if (!activeBranch || typeof window === 'undefined' || !canEdit) return;
    const ymKey = `${tallyTargetYear}-${tallyTargetMonth}`;
    const key = `artisflow-branch-tally-${activeBranch}-${ymKey}`;
    const existing = window.localStorage.getItem(key);
    if (existing) {
      alert('A physical tally has already been recorded for this branch this month.');
      return;
    }

    const branchAllArtworks = getBranchArtworks(activeBranch);
    const branchMonthArtworks = branchAllArtworks.filter(art => {
      const { y, m } = getArtYearMonth(art);
      if (dateYearFilter !== 'All' && y !== parseInt(dateYearFilter, 10)) return false;
      if (dateMonthFilter !== 'All' && m !== parseInt(dateMonthFilter, 10)) return false;
      return true;
    });

    let totalItems = branchMonthArtworks.length;
    let availableCount = 0;
    let reservedCount = 0;
    let soldCount = 0;
    let deliveredCount = 0;
    let cancelledCount = 0;
    let totalValue = 0;
    let availableValue = 0;

    branchMonthArtworks.forEach(art => {
      const price = art.price || 0;
      totalValue += price;
      if (art.status === ArtworkStatus.AVAILABLE) {
        availableCount += 1;
        availableValue += price;
      } else if (art.status === ArtworkStatus.RESERVED) {
        reservedCount += 1;
      } else if (art.status === ArtworkStatus.SOLD) {
        soldCount += 1;
      } else if (art.status === ArtworkStatus.DELIVERED) {
        deliveredCount += 1;
      } else if (art.status === ArtworkStatus.CANCELLED) {
        cancelledCount += 1;
      }
    });

    const timestamp = new Date().toISOString();
    const snapshot = {
      timestamp,
      year: tallyTargetYear,
      month: tallyTargetMonth,
      totalItems,
      availableCount,
      reservedCount,
      soldCount,
      deliveredCount,
      cancelledCount,
      totalValue,
      availableValue
    };

    window.localStorage.setItem(key, JSON.stringify(snapshot));
    setTallyCompleted(true);
    setTallyTimestamp(timestamp);
    setTallySnapshot(snapshot);
    setTallyHistory(prev => {
      const others = prev.filter(
        entry => !(entry.year === snapshot.year && entry.month === snapshot.month)
      );
      return [...others, snapshot].sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
    });
  };

  const handleResetTally = () => {
    if (!activeBranch || typeof window === 'undefined') return;
    const ymKey = `${tallyTargetYear}-${tallyTargetMonth}`;
    const key = `artisflow-branch-tally-${activeBranch}-${ymKey}`;
    const exists = window.localStorage.getItem(key);
    if (!exists) {
      alert('No tally found to reset for this branch and period.');
      return;
    }
    const confirmed = window.confirm(
      'This will clear the recorded physical tally for this branch and period (demo only).\n\nContinue?'
    );
    if (!confirmed) return;

    window.localStorage.removeItem(key);
    setTallyCompleted(false);
    setTallySnapshot(null);
    setTallyTimestamp(null);
    setTallyHistory(prev =>
      prev.filter(entry => !(entry.year === tallyTargetYear && entry.month === tallyTargetMonth))
    );
  };

  const totalBranches = branches.length;
  const totalArtworks = artworks.length;
  const totalAvailable = artworks.filter(a => a.status === ArtworkStatus.AVAILABLE).length;
  const uniqueArtists = Array.from(new Set(artworks.map(a => a.artist))).length;

  const rawBranchArtworks = activeBranch ? getBranchArtworks(activeBranch) : [];

  const branchArtists = React.useMemo(() => 
    Array.from(new Set(rawBranchArtworks.map(a => a.artist).filter(Boolean))).sort(),
    [rawBranchArtworks]
  );

  const branchMediums = React.useMemo(() => 
    Array.from(new Set(rawBranchArtworks.map(a => a.medium).filter(Boolean))).sort(),
    [rawBranchArtworks]
  );

  const activeBranchArtworks = rawBranchArtworks.filter(art => {
    // New Filters
    if (artistFilter !== 'All' && art.artist !== artistFilter) return false;
    if (mediumFilter !== 'All' && art.medium !== mediumFilter) return false;
    if (sizeFilter && (!art.dimensions || !art.dimensions.toLowerCase().includes(sizeFilter.toLowerCase()))) return false;

    if (dateYearFilter === 'All' && dateMonthFilter === 'All') return true;
    const { y, m } = getArtYearMonth(art);
    if (dateYearFilter !== 'All' && dateMonthFilter !== 'All') {
      const fy = parseInt(dateYearFilter, 10);
      const fm = parseInt(dateMonthFilter, 10);
      return y === fy && m === fm;
    }
    if (dateYearFilter !== 'All') {
      const fy = parseInt(dateYearFilter, 10);
      return y === fy;
    }
    if (dateMonthFilter !== 'All') {
      const fm = parseInt(dateMonthFilter, 10);
      return m === fm;
    }
    return true;
  });
  const availableYearOptions: number[] = [];
  for (let year = now.getFullYear(); year >= 2000; year--) {
    availableYearOptions.push(year);
  }
  const branchTotalItems = activeBranchArtworks.length;
  const branchAvailableCount = activeBranchArtworks.filter(a => a.status === ArtworkStatus.AVAILABLE).length;
  const branchReservedCount = activeBranchArtworks.filter(a => a.status === ArtworkStatus.RESERVED).length;
  const branchSoldCount = activeBranchArtworks.filter(a => a.status === ArtworkStatus.SOLD).length;
  const branchDeliveredCount = activeBranchArtworks.filter(a => a.status === ArtworkStatus.DELIVERED).length;
  const branchCancelledCount = activeBranchArtworks.filter(a => a.status === ArtworkStatus.CANCELLED).length;
  const branchTotalValue = activeBranchArtworks.reduce((sum, art) => sum + (art.price || 0), 0);
  const branchAvailableValue = activeBranchArtworks
    .filter(a => a.status === ArtworkStatus.AVAILABLE)
    .reduce((sum, art) => sum + (art.price || 0), 0);
  const branchAveragePrice = branchTotalItems > 0 ? branchTotalValue / branchTotalItems : 0;
  const branchAvailablePercentage =
    branchTotalItems > 0 ? Math.round((branchAvailableCount / branchTotalItems) * 100) : 0;
  const branchSellThroughPercentage =
    branchTotalItems > 0 ? Math.round(((branchSoldCount + branchDeliveredCount) / branchTotalItems) * 100) : 0;
  const activeBranchAddress = activeBranch ? branchAddresses?.[activeBranch] : undefined;
  const activeBranchIds = new Set(activeBranchArtworks.map(a => a.id));
  const branchSales = (sales || []).filter(
    s => !s.isCancelled && activeBranchIds.has(s.artworkId)
  );
  const branchSalesCount = branchSales.length;
  const branchDeliveredSalesCount = branchSales.filter(s => s.isDelivered).length;
  const branchLastSaleDate =
    branchSalesCount > 0
      ? new Date(
          Math.max(
            ...branchSales.map(s => new Date(s.saleDate).getTime())
          )
        )
      : null;
  const cartArtworks = artworks.filter(a => selectedArtworkIds.includes(a.id));
  const cartItemCount = selectedArtworkIds.length;
  const availableForArtist =
    selectedArtist
      ? activeBranchArtworks.filter(
          a => a.artist === selectedArtist && a.status === ArtworkStatus.AVAILABLE
        )
      : [];
  const reservedForArtist =
    selectedArtist
      ? activeBranchArtworks.filter(
          a => a.artist === selectedArtist && a.status === ArtworkStatus.RESERVED
        )
      : [];
  const soldForArtist =
    selectedArtist
      ? activeBranchArtworks.filter(
          a =>
            a.artist === selectedArtist &&
            (a.status === ArtworkStatus.SOLD || a.status === ArtworkStatus.DELIVERED)
        )
      : [];

  const exclusiveForArtist =
    selectedArtist
      ? activeBranchArtworks.filter(
          a => a.artist === selectedArtist && a.status === ArtworkStatus.EXCLUSIVE_VIEW_ONLY
        )
      : [];

  const getCurrentList = () => {
    switch (artistStatusFilter) {
      case ArtworkStatus.AVAILABLE: return availableForArtist;
      case ArtworkStatus.RESERVED: return reservedForArtist;
      case ArtworkStatus.SOLD: return soldForArtist;
      case ArtworkStatus.EXCLUSIVE_VIEW_ONLY: return exclusiveForArtist;
      default: return availableForArtist;
    }
  };

  const currentList = getCurrentList();

  const allSelectedForArtist =
    currentList.length > 0 &&
    currentList.every(a => selectedArtworkIds.includes(a.id));

  // Auto-switch filter if current selection is empty but others are not
  React.useEffect(() => {
    if (!selectedArtist) return;
    
    // Check if current filter yields results
    const currentCount = 
      artistStatusFilter === ArtworkStatus.AVAILABLE ? availableForArtist.length :
      artistStatusFilter === ArtworkStatus.RESERVED ? reservedForArtist.length :
      artistStatusFilter === ArtworkStatus.SOLD ? soldForArtist.length :
      artistStatusFilter === ArtworkStatus.EXCLUSIVE_VIEW_ONLY ? exclusiveForArtist.length : 0;

    if (currentCount === 0) {
      if (exclusiveForArtist.length > 0) setArtistStatusFilter(ArtworkStatus.EXCLUSIVE_VIEW_ONLY);
      else if (availableForArtist.length > 0) setArtistStatusFilter(ArtworkStatus.AVAILABLE);
      else if (reservedForArtist.length > 0) setArtistStatusFilter(ArtworkStatus.RESERVED);
      else if (soldForArtist.length > 0) setArtistStatusFilter(ArtworkStatus.SOLD);
    }
  }, [selectedArtist, artistStatusFilter, availableForArtist.length, reservedForArtist.length, soldForArtist.length, exclusiveForArtist.length]);

  return (
    <div className="space-y-8 pb-10 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <div className="relative overflow-hidden rounded-[2.2rem] bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-emerald-500 p-[1px] shadow-xl shadow-indigo-500/20">
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-950 text-slate-50 rounded-[2.1rem] px-8 py-7">
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <div className="absolute -right-20 -top-24 w-64 h-64 bg-fuchsia-500/40 blur-3xl rounded-full" />
            <div className="absolute -left-16 -bottom-24 w-72 h-72 bg-emerald-400/40 blur-3xl rounded-full" />
          </div>
          <div className="relative z-10 space-y-3">
            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-white/10 border border-white/20 text-emerald-100">
                <Sparkles size={12} className="mr-1.5" />
                Administration
              </span>
              <span className="hidden md:inline-block h-px w-10 bg-white/20"></span>
              <span className="hidden md:inline-block text-[11px] font-semibold text-white/70">
                Design a vibrant network of ArtisFlow locations.
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">
              Branch Management
            </h1>
            <p className="text-sm md:text-base text-slate-200 max-w-2xl">
              Curate galleries, warehouses, and private collections in one colorful control room.
            </p>
          </div>
          <div className="relative z-10 flex flex-col items-end gap-3">
            <div className="flex items-center space-x-2 rounded-full bg-white/10 px-3 py-1 border border-white/15 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-100">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Operations Live</span>
            </div>
            {canEdit && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center space-x-2 px-6 py-3 rounded-2xl bg-white text-slate-900 text-sm font-black shadow-lg shadow-slate-900/40 hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white">
                  <Plus size={16} />
                </span>
                <span>Launch New Branch</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-500/10 via-fuchsia-500/8 to-emerald-500/10 px-4 py-4 shadow-md shadow-indigo-100">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700">Active Branches</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{totalBranches}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-400 text-white shadow-md">
              <Building2 size={18} />
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-fuchsia-100 bg-gradient-to-br from-fuchsia-500/10 via-rose-500/8 to-amber-500/10 px-4 py-4 shadow-md shadow-fuchsia-100">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fuchsia-700">Total Artworks</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{totalArtworks}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-amber-400 text-white shadow-md">
              <Package size={18} />
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-500/10 via-teal-500/8 to-lime-500/10 px-4 py-4 shadow-md shadow-emerald-100">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Ready To Exhibit</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{totalAvailable}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 text-white shadow-md">
              <Sparkles size={18} />
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900/5 via-slate-900/0 to-slate-900/5 px-4 py-4 shadow-md shadow-slate-100">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">Artists Represented</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{uniqueArtists}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 text-amber-300 shadow-md">
              <MapPin size={18} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur rounded-[2rem] border border-slate-200/80 shadow-xl shadow-indigo-50 overflow-hidden">
        <div className="p-6 border-b border-slate-100/80 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/80">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              Active Locations
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                {branches.length} in network
              </span>
            </h3>
            <p className="text-[12px] text-slate-500 mt-1">
              Drag open a branch to explore artists and pieces on site.
            </p>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search branches, cities, spaces..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-full text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 shadow-sm"
            />
          </div>
        </div>

        <div className="p-2 space-y-3">
          {filteredBranches.length > 0 ? (
            filteredBranches.map((branch) => {
              const branchArtworks = getBranchArtworks(branch);

              return (
                <div key={branch} className="group">
                  <div className="p-4 md:p-5 flex items-center justify-between gap-4 rounded-2xl bg-white border border-slate-100 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-indigo-100 hover:bg-gradient-to-r hover:from-indigo-50 hover:via-fuchsia-50/70 hover:to-emerald-50">
                    <div
                      className="flex items-center space-x-4 cursor-pointer"
                      onClick={() => {
                        setActiveBranch(branch);
                        setSelectedArtist(null);
                        setSelectedArtworkIds([]);
                      }}
                    >
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-emerald-500">
                        <Building2 size={24} />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                          {branch}
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.18em] bg-slate-900 text-amber-300">
                            Node
                          </span>
                          {exclusiveBranches?.includes(branch) && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.18em] bg-purple-900 text-purple-200">
                              Exclusive
                            </span>
                          )}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600 mt-1">
                          <div className="flex items-center">
                            <MapPin size={12} className="mr-1 text-slate-400" />
                            <span>{branchAddresses?.[branch] || 'Address not set'}</span>
                          </div>
                          <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold">
                            <Package size={12} className="mr-1" />
                            <span>{branchArtworks.length} Artwork{branchArtworks.length === 1 ? '' : 's'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      {canEdit && (
                        <div className="hidden sm:flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEdit(branch)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit Branch"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(branch)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Branch"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500/10 via-fuchsia-500/10 to-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-400">
                <Building2 size={32} />
              </div>
              <p className="text-slate-500 font-medium">No branches found matching your search.</p>
              <p className="text-[12px] text-slate-400 mt-1">Try a different keyword or create a new branch above.</p>
            </div>
          )}
        </div>

      </div>

      {errorModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800">{errorModal.title}</h3>
              <button
                onClick={() => setErrorModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div
                className={`p-4 rounded-xl flex items-start gap-3 ${
                  errorModal.onConfirm ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-700'
                }`}
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm whitespace-pre-line leading-relaxed">{errorModal.message}</p>
              </div>
              <div className="flex justify-end space-x-3">
                {errorModal.onConfirm && (
                  <button
                    onClick={() => {
                      const fn = errorModal.onConfirm;
                      setErrorModal(null);
                      if (fn) fn();
                    }}
                    className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800"
                  >
                    Yes, Proceed Anyway
                  </button>
                )}
                <button
                  onClick={() => setErrorModal(null)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold ${
                    errorModal.onConfirm
                      ? 'text-slate-600 hover:bg-slate-50'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {errorModal.onConfirm ? 'Cancel' : 'Okay'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeBranch && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-slate-950 w-full max-w-6xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-start gap-4">
                <button
                  onClick={handleCloseBranchModal}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-slate-200 border border-slate-700 hover:bg-slate-800 text-xs font-semibold"
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-white/10 border border-white/20 text-emerald-100">
                      <Sparkles size={12} className="mr-1.5" />
                      Branch Overview
                    </span>
                    <span className="hidden md:inline text-[11px] text-slate-400 font-semibold">
                      Performance and inventory snapshot for this location.
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-50 flex items-center gap-3">
                    {activeBranch}
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.18em] bg-slate-900/60 border border-slate-700">
                      {branchTotalItems} items
                    </span>
                  </h2>
                  <p className="text-xs text-slate-300">
                    {activeBranchAddress || 'Address not set'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-50">
              <div className="max-w-6xl mx-auto px-6 pt-6 pb-6 space-y-4">
                {!exclusiveBranches?.includes(activeBranch) && (branchTotalItems === 0 || branchAvailableCount > 0 || branchReservedCount > 0 || branchSoldCount > 0 || branchDeliveredCount > 0) && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Items</span>
                        <span className="mt-1 text-2xl font-black text-slate-900">{branchTotalItems.toLocaleString()}</span>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Available</span>
                        <span className="mt-1 text-2xl font-black text-slate-900">{branchAvailableCount.toLocaleString()}</span>
                        <span className="text-[11px] text-slate-500 mt-1">₱{branchAvailableValue.toLocaleString()} value</span>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Reserved</span>
                        <span className="mt-1 text-xl font-black text-slate-900">{branchReservedCount.toLocaleString()}</span>
                        <span className="text-[11px] text-slate-500 mt-1">{branchCancelledCount.toLocaleString()} cancelled</span>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Sold / Delivered</span>
                        <span className="mt-1 text-xl font-black text-slate-900">
                          {branchSoldCount.toLocaleString()} Sold
                        </span>
                        <span className="text-[11px] text-slate-500 mt-1">
                          {branchDeliveredCount.toLocaleString()} Delivered
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Inventory Value</span>
                        <span className="mt-1 text-xl font-black text-slate-900">₱{branchTotalValue.toLocaleString()}</span>
                        <span className="text-[11px] text-slate-500 mt-1">
                          Avg ₱{Math.round(branchAveragePrice).toLocaleString()} per piece
                        </span>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Availability</span>
                        <span className="mt-1 text-xl font-black text-slate-900">{branchAvailablePercentage}%</span>
                        <span className="text-[11px] text-slate-500 mt-1">
                          {branchAvailableCount.toLocaleString()} of {branchTotalItems.toLocaleString()} pieces available
                        </span>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Sell-through</span>
                        <span className="mt-1 text-xl font-black text-slate-900">{branchSellThroughPercentage}%</span>
                        <span className="text-[11px] text-slate-500 mt-1">
                          {branchSoldCount + branchDeliveredCount} sold or delivered
                        </span>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Sales Activity</span>
                    <span className="mt-1 text-xl font-black text-slate-900">
                      {branchSalesCount.toLocaleString()} sale{branchSalesCount === 1 ? '' : 's'}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1">
                      {branchLastSaleDate ? `Last sale ${branchLastSaleDate.toLocaleDateString()}` : 'No sales yet'}
                    </span>
                  </div>
                </div>
              </>
            )}
                <div className="relative bg-white rounded-2xl p-5 border border-indigo-100 shadow-lg shadow-indigo-100/60 space-y-4 overflow-hidden">
                  <div className="pointer-events-none absolute inset-0 opacity-40">
                    <div className="absolute -right-16 -top-20 w-40 h-40 bg-fuchsia-500/40 blur-3xl rounded-full" />
                    <div className="absolute -left-10 -bottom-12 w-44 h-44 bg-emerald-400/40 blur-3xl rounded-full" />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-900 text-slate-50 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-400 to-fuchsia-400 text-white">
                          <Sparkles size={14} />
                        </div>
                        <h5 className="text-xs font-bold uppercase tracking-[0.2em]">
                          Branch Inventory Explorer
                        </h5>
                      </div>
                    </div>
                    <div className="relative z-10 flex flex-col gap-6 bg-white/50 rounded-2xl p-6 border border-indigo-50/50">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                          <div className="space-y-4 w-full md:w-auto">
                            
                            <div className="flex flex-wrap items-end gap-4">
                              {/* New Artwork Filters */}
                              <div className="space-y-2">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                  Filter Artworks
                                </span>
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                                    <select
                                      value={artistFilter}
                                      onChange={e => setArtistFilter(e.target.value)}
                                      className="bg-transparent border-0 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                                    >
                                      <option value="All">All Artists</option>
                                      {branchArtists.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                  </div>
                                  <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                                    <select
                                      value={mediumFilter}
                                      onChange={e => setMediumFilter(e.target.value)}
                                      className="bg-transparent border-0 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                                    >
                                      <option value="All">All Mediums</option>
                                      {branchMediums.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                  </div>
                                  <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                                    <input
                                      type="text"
                                      placeholder="Size..."
                                      value={sizeFilter}
                                      onChange={e => setSizeFilter(e.target.value)}
                                      className="bg-transparent border-0 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-24"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Date Filters */}
                              <div className="space-y-2">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                  Filter Period
                                </span>
                                <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                                  <select
                                    value={dateMonthFilter}
                                    onChange={e => setDateMonthFilter(e.target.value)}
                                    className="bg-transparent border-0 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                                  >
                                    <option value="All">All months</option>
                                    {monthNames.map((m, index) => (
                                      <option key={m} value={String(index + 1)}>
                                        {m}
                                      </option>
                                    ))}
                                  </select>
                                  <div className="w-px h-6 bg-slate-200" />
                                  <select
                                    value={dateYearFilter}
                                    onChange={e => setDateYearFilter(e.target.value)}
                                    className="bg-transparent border-0 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                                  >
                                    <option value="All">All years</option>
                                    {availableYearOptions.map(y => (
                                      <option key={y} value={String(y)}>
                                        {y}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex-1 bg-indigo-50/80 rounded-xl p-4 border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-0.5">
                                Current Period
                              </span>
                              <span className="text-base font-black text-slate-800">
                                {currentMonthLabel} Tally
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-3">
                              {!tallyCompleted && (
                                <span className="hidden sm:inline text-xs font-medium text-slate-500 mr-2">
                                  Verify physical inventory count
                                </span>
                              )}
                              
                              <button
                                type="button"
                                onClick={handleMarkTallyComplete}
                                disabled={tallyCompleted || !canEdit}
                                className={`px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all transform active:scale-95 ${
                                  tallyCompleted || !canEdit
                                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5'
                                }`}
                              >
                                {tallyCompleted ? '✓ Tally Recorded' : 'Confirm Tally'}
                              </button>
                              
                              {tallyCompleted && (
                                <button
                                  type="button"
                                  onClick={handleResetTally}
                                  disabled={!canEdit}
                                  className={`p-2.5 rounded-xl transition-colors ${!canEdit ? 'text-slate-300 cursor-not-allowed' : 'text-rose-500 hover:bg-rose-50 hover:text-rose-600'}`}
                                  title="Reset tally (demo)"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {tallyCompleted && tallyTimestamp && (
                          <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50/50 px-4 py-2 rounded-lg border border-emerald-100 w-fit">
                            <Sparkles size={14} />
                            <span>Verified on {new Date(tallyTimestamp).toLocaleString()}</span>
                          </div>
                        )}
                    </div>

                    {tallyHistory.length > 0 && (
                      <div className="relative z-10 pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <Clock size={16} className="text-slate-400" />
                            Audit History
                          </p>
                          <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                            Last {tallyHistory.length} records
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {tallyHistory.slice(0, 6).map(entry => {
                            const monthIndex = (entry.month || 1) - 1;
                            const label =
                              monthIndex >= 0 && monthIndex < monthNames.length
                                ? `${monthNames[monthIndex]} ${entry.year}`
                                : `${entry.year}-${entry.month}`;
                            const ts = entry.timestamp
                              ? new Date(entry.timestamp).toLocaleDateString()
                              : 'Timestamp unavailable';
                            return (
                              <div
                                key={`${entry.year}-${entry.month}`}
                                className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-3 shadow-sm"
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                                    {label}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {ts}
                                  </span>
                                </div>
                                {typeof entry.totalItems === 'number' ? (
                                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                                    <div>
                                      <div className="font-semibold text-slate-900">
                                        {entry.totalItems.toLocaleString()} items
                                      </div>
                                      <div>
                                        ₱{(entry.totalValue || 0).toLocaleString()} total
                                      </div>
                                      <div>
                                        ₱{(entry.availableValue || 0).toLocaleString()} available
                                      </div>
                                    </div>
                                    <div className="space-y-0.5">
                                      <div>Available: {entry.availableCount ?? 0}</div>
                                      <div>Reserved: {entry.reservedCount ?? 0}</div>
                                      <div>
                                        Sold/Delivered:{' '}
                                        {(entry.soldCount ?? 0) + (entry.deliveredCount ?? 0)}
                                      </div>
                                      <div>Cancelled: {entry.cancelledCount ?? 0}</div>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-slate-500">
                                    Tally recorded; detailed breakdown not available.
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {activeBranchArtworks.length > 0 ? (
                      <>
                        <div className="relative z-10">
                          <p className="text-[11px] font-medium text-slate-600 mb-2">
                            Artists with work at this location.
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Array.from(new Set(activeBranchArtworks.map(a => a.artist))).sort().map(artist => {
                              const artistArtworks = activeBranchArtworks.filter(a => a.artist === artist);
                              const sampleArt = artistArtworks[0];
                              const isActiveArtist = selectedArtist === artist;
                              return (
                                <button
                                  key={artist}
                                  type="button"
                                  onClick={() => setSelectedArtist(artist)}
                                  className={`flex flex-col items-stretch rounded-2xl border text-left text-xs transition-all shadow-sm overflow-hidden ${
                                    isActiveArtist
                                      ? 'bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white border-transparent shadow-md'
                                      : 'bg-white/95 border-slate-100 hover:border-indigo-200 hover:shadow-md'
                                  }`}
                                >
                                  {sampleArt && (
                                    <div className={`aspect-[4/3] overflow-hidden ${isActiveArtist ? 'bg-black/20' : 'bg-slate-100'}`}>
                                      <img
                                        src={sampleArt.imageUrl}
                                        alt={artist}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                      />
                                    </div>
                                  )}
                                  <div className="px-3 py-3 flex flex-col gap-0.5">
                                    <span className={`text-sm font-bold truncate ${isActiveArtist ? 'text-white' : 'text-slate-800'}`}>{artist}</span>
                                    <span className={`text-[11px] ${isActiveArtist ? 'text-slate-100' : 'text-slate-500'}`}>
                                      {artistArtworks.length} piece{artistArtworks.length !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="relative z-10 text-center py-8 text-slate-400">
                        <Package size={32} className="mx-auto mb-2 opacity-60" />
                        <p className="text-sm">No artworks currently at this location.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeBranch && selectedArtist && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-amber-300 flex items-center justify-center">
                  <ShoppingBag size={18} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.18em]">
                    Artworks
                  </p>
                  <p className="text-sm font-bold text-slate-900">
                    {selectedArtist} at {activeBranch}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedArtist(null)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                <XCircle className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Paintings by {selectedArtist}
                  </p>
                  {availableForArtist.length > 0 && (
                    <span
                      onClick={() => setArtistStatusFilter(ArtworkStatus.AVAILABLE)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        artistStatusFilter === ArtworkStatus.AVAILABLE
                          ? 'text-emerald-700 bg-emerald-100 border-emerald-200'
                          : 'text-emerald-600 bg-emerald-50 border-emerald-100 cursor-pointer hover:bg-emerald-100 transition-colors'
                      }`}
                    >
                      {availableForArtist.length} available
                    </span>
                  )}
                  {reservedForArtist.length > 0 && (
                    <span
                      onClick={() => setArtistStatusFilter(ArtworkStatus.RESERVED)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        artistStatusFilter === ArtworkStatus.RESERVED
                          ? 'text-amber-800 bg-amber-100 border-amber-200'
                          : 'text-amber-700 bg-amber-50 border-amber-100 cursor-pointer hover:bg-amber-100 transition-colors'
                      }`}
                    >
                      {reservedForArtist.length} reserved
                    </span>
                  )}
                  {soldForArtist.length > 0 && (
                    <span
                      onClick={() => setArtistStatusFilter(ArtworkStatus.SOLD)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        artistStatusFilter === ArtworkStatus.SOLD
                          ? 'text-rose-800 bg-rose-100 border-rose-200'
                          : 'text-rose-700 bg-rose-50 border-rose-100 cursor-pointer hover:bg-rose-100 transition-colors'
                      }`}
                    >
                      {soldForArtist.length} sold
                    </span>
                  )}
                  {(exclusiveForArtist.length > 0 || activeBranchArtworks.some(a => a.status === ArtworkStatus.EXCLUSIVE_VIEW_ONLY)) && (
                    <span
                      onClick={() => setArtistStatusFilter(ArtworkStatus.EXCLUSIVE_VIEW_ONLY)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        artistStatusFilter === ArtworkStatus.EXCLUSIVE_VIEW_ONLY
                          ? 'text-slate-800 bg-slate-200 border-slate-300'
                          : 'text-slate-600 bg-slate-100 border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors'
                      }`}
                    >
                      {exclusiveForArtist.length} not for sale
                    </span>
                  )}
                  <span className="ml-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Showing: {artistStatusFilter === ArtworkStatus.AVAILABLE ? 'Available' : artistStatusFilter === ArtworkStatus.RESERVED ? 'Reserved' : artistStatusFilter === ArtworkStatus.EXCLUSIVE_VIEW_ONLY ? 'Not For Sale' : 'Sold'}
                  </span>
                </div>
                {currentList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSelectAllForArtist(currentList)}
                    disabled={!canEdit}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors ${!canEdit ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-slate-900 text-slate-50 border-slate-700 hover:bg-slate-800'}`}
                  >
                    {allSelectedForArtist ? 'Clear Selection' : 'Select All'}
                  </button>
                )}
              </div>
              {currentList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {currentList.map(art => (
                    <div
                      key={art.id}
                      onClick={() => onViewArtwork?.(art.id)}
                      className={`group bg-white rounded-2xl border ${
                        selectedArtworkIds.includes(art.id)
                          ? 'border-blue-500 ring-4 ring-blue-500/10'
                          : 'border-slate-200'
                      } overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col h-full hover:-translate-y-1 relative`}
                    >
                      <div
                        onClick={(e) => toggleSelect(art.id, e)}
                        className={`absolute top-3 left-3 z-10 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                          selectedArtworkIds.includes(art.id)
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white/80 backdrop-blur border-slate-300 opacity-0 group-hover:opacity-100'
                        } ${!canEdit ? 'hidden' : 'cursor-pointer'}`}
                      >
                        {selectedArtworkIds.includes(art.id) && (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="aspect-[4/3] overflow-hidden relative">
                        <img
                          src={art.imageUrl}
                          alt={art.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <div className="mb-2 space-y-1">
                          <h4 className="text-sm font-bold text-slate-900 leading-tight line-clamp-1 group-hover:text-blue-600 transition-colors">
                            {art.title}
                          </h4>
                          <p className="text-xs text-slate-500 line-clamp-1">
                            {art.medium}
                          </p>
                          <p className="text-[11px] text-slate-400 line-clamp-1">
                            {art.dimensions}
                          </p>
                        </div>
                        <div className="mt-auto pt-2 flex items-center justify-between border-t border-slate-100">
                          <p className="text-[11px] text-slate-400">
                            ₱{(art.price || 0).toLocaleString()}
                          </p>
                          <p className="text-[11px] font-semibold text-slate-500">
                            {activeBranch}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">
                  {availableForArtist.length + reservedForArtist.length + soldForArtist.length + exclusiveForArtist.length === 0
                    ? 'No paintings for this artist at this branch.'
                    : artistStatusFilter === ArtworkStatus.AVAILABLE
                    ? 'No available paintings for this artist at this branch.'
                    : artistStatusFilter === ArtworkStatus.RESERVED
                    ? 'No reserved paintings for this artist at this branch.'
                    : artistStatusFilter === ArtworkStatus.EXCLUSIVE_VIEW_ONLY
                    ? 'No "Not For Sale" paintings for this artist at this branch.'
                    : 'No sold paintings for this artist at this branch.'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {cartItemCount > 0 && (
        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 right-6 z-[130] inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 text-slate-50 text-xs font-semibold shadow-lg shadow-slate-900/40 hover:bg-slate-800 transition-colors"
        >
          <ShoppingBag size={16} />
          <span>Cart</span>
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/10 text-[11px]">
            {cartItemCount}
          </span>
        </button>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-amber-300 flex items-center justify-center">
                  <ShoppingBag size={18} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.18em]">
                    Artwork Cart
                  </p>
                  <p className="text-sm font-bold text-slate-900">
                    {cartItemCount} item{cartItemCount !== 1 ? 's' : ''} selected
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                <XCircle className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>
            {bulkActionModal ? (
              <div className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div className="space-y-4">
                    <p className="text-slate-600 text-sm">
                      You are about to {bulkActionModal.type}{' '}
                      <strong>{selectedArtworkIds.length}</strong> selected artworks.
                    </p>

                    {bulkActionModal.type === 'sale' && (
                      <>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                            Client Name
                          </label>
                          <input
                            autoFocus
                            type="text"
                            value={bulkActionValue}
                            onChange={e => setBulkActionValue(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                            placeholder="Enter client name..."
                          />
                        </div>
                        <label className="flex items-center space-x-2 p-3 bg-slate-50 rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={bulkActionExtra}
                            onChange={e => setBulkActionExtra(e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm font-medium text-slate-700">
                            Mark items as Delivered immediately?
                          </span>
                        </label>
                      </>
                    )}

                    {bulkActionModal.type === 'reserve' && (
                      <div className="space-y-4">
                        <div className="flex p-1 bg-slate-100 rounded-xl">
                          <button
                            type="button"
                            onClick={() => setReservationTab('person')}
                            className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                              reservationTab === 'person'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            Specific Person
                          </button>
                          <button
                            type="button"
                            onClick={() => setReservationTab('event')}
                            className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                              reservationTab === 'event'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            Exhibition Event
                          </button>
                        </div>

                        {reservationTab === 'person' ? (
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                              Client Name
                            </label>
                            <input
                              autoFocus
                              type="text"
                              value={reservationClient}
                              onChange={e => setReservationClient(e.target.value)}
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                              placeholder="Enter client name..."
                            />
                          </div>
                        ) : (
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                              Select Event
                            </label>
                            <select
                              value={reservationEventId}
                              onChange={e => setReservationEventId(e.target.value)}
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                            >
                              <option value="">Select an upcoming event...</option>
                              {events
                                ?.filter(e => e.status !== 'Recent')
                                .map(e => (
                                  <option key={e.id} value={e.id}>
                                    {e.title} ({e.status})
                                  </option>
                                ))}
                            </select>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                            Additional Notes
                          </label>
                          <textarea
                            value={reservationDetails}
                            onChange={e => setReservationDetails(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm h-20 resize-none"
                            placeholder="Any additional details..."
                          />
                        </div>
                      </div>
                    )}

                    {bulkActionModal.type === 'transfer' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                          Destination Branch
                        </label>
                        <select
                          value={bulkActionValue}
                          onChange={e => setBulkActionValue(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                        >
                          <option value="">Select Branch...</option>
                          {branches.map(b => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {bulkActionModal.type === 'delete' && (
                      <div className="p-4 bg-rose-50 text-rose-700 rounded-lg text-sm flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p>
                          This action cannot be undone. The selected artworks will be permanently
                          removed from this branch inventory.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3 bg-slate-50">
                  <div className="text-[11px] text-slate-500">
                    <span>
                      Confirm{' '}
                      {bulkActionModal.type === 'sale'
                        ? 'sale'
                        : bulkActionModal.type === 'reserve'
                        ? 'reservation'
                        : bulkActionModal.type === 'transfer'
                        ? 'transfer'
                        : 'deletion'}{' '}
                      for all items in the cart.
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCloseBulkModal}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Back to Cart
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkActionSubmit}
                      disabled={
                        bulkActionModal.type === 'delete'
                          ? false
                          : bulkActionModal.type === 'reserve'
                          ? false
                          : !bulkActionValue.trim()
                      }
                      className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all ${
                        bulkActionModal.type === 'delete'
                          ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-500/30'
                          : bulkActionModal.type === 'reserve'
                          ? 'bg-amber-300 text-amber-900 hover:bg-amber-400 shadow-amber-500/20'
                          : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      Confirm{' '}
                      {bulkActionModal.type === 'sale'
                        ? 'Sale'
                        : bulkActionModal.type === 'delete'
                        ? 'Delete'
                        : bulkActionModal.type === 'reserve'
                        ? 'Reservation'
                        : 'Action'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {cartArtworks.length > 0 ? (
                    <div className="grid gap-2">
                      {cartArtworks.map(art => (
                        <div
                          key={art.id}
                          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-200">
                              {art.imageUrl && (
                                <img
                                  src={art.imageUrl}
                                  alt={art.title}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900 line-clamp-1">
                                {art.title}
                              </p>
                              <p className="text-[11px] text-slate-500 line-clamp-1">
                                {art.artist} • {art.currentBranch || 'No branch'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="text-[11px] font-semibold text-slate-700">
                              ₱{(art.price || 0).toLocaleString()}
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedArtworkIds(prev => prev.filter(id => id !== art.id))
                              }
                              className="text-[11px] text-slate-400 hover:text-rose-500"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400 text-sm">
                      <ShoppingBag size={32} className="mb-3 opacity-60" />
                      <p>Your cart is empty.</p>
                    </div>
                  )}
                </div>
                <div className="px-6 py-4 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span>Apply an action to all items in the cart.</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {!(activeBranch && exclusiveBranches?.includes(activeBranch)) && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleBulkActionClick('sale')}
                          disabled={!canEdit}
                          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold ${!canEdit ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-slate-50 hover:bg-slate-800'}`}
                        >
                          <ShoppingBag size={14} />
                          <span>Mark as Sold</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBulkActionClick('reserve')}
                          disabled={!canEdit}
                          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold ${!canEdit ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-amber-300 text-amber-900 hover:bg-amber-400'}`}
                        >
                          <Clock size={14} />
                          <span>Reserve</span>
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => handleBulkActionClick('transfer')}
                      disabled={!canEdit}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold ${!canEdit ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'}`}
                    >
                      <ArrowRightLeft size={14} />
                      <span>Transfer</span>
                    </button>
                    {!(activeBranch && exclusiveBranches?.includes(activeBranch)) && (
                      <button
                        type="button"
                        onClick={() => handleBulkActionClick('delete')}
                        disabled={!canEdit}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold ${!canEdit ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-rose-600 text-white hover:bg-rose-700'}`}
                      >
                        <Trash2 size={14} />
                        <span>Delete</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedArtworkIds([]);
                        setIsCartOpen(false);
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 border border-slate-200/80">
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-emerald-500 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm tracking-[0.18em] uppercase">
                {editingBranch ? 'Edit Branch' : 'Add New Branch'}
              </h3>
              <button onClick={handleClose} className="text-white/80 hover:text-white">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!editingBranch && (
                <div className="flex border-b border-slate-200 mb-4">
                  <button
                    type="button"
                    onClick={() => setIsExclusive(false)}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${!isExclusive ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    Standard Branch
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsExclusive(true)}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${isExclusive ? 'border-purple-500 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    Exclusive
                  </button>
                </div>
              )}
              
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Branch Name</label>
                <input 
                  type="text" 
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g., North Wing Gallery"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Address</label>
                <input 
                  type="text" 
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  placeholder="e.g., 123 Art Street, Makati City"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex space-x-3">
                <button 
                  type="button" 
                  onClick={handleClose}
                  className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={!canEdit || !branchName.trim()}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-emerald-500 text-white font-bold rounded-xl hover:brightness-110 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingBranch ? 'Save Changes' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchManagement;
