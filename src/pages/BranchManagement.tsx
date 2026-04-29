import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Edit2, MapPin, Building2, Search, Package, Sparkles, ArrowLeft, XCircle, AlertCircle, AlertTriangle, ShoppingBag, Clock, ArrowRightLeft, Calendar, CheckCircle2, ClipboardCheck, Gavel, X, Eye, EyeOff, Frame, RotateCcw, Image as ImageIcon, Wrench, Upload, RefreshCw, ChevronRight } from 'lucide-react';
import { Artwork, ArtworkStatus, Branch, ExhibitionEvent, SaleRecord, UserPermissions } from '../types';
import { PriceRangeFilter } from '../components/PriceRangeFilter';
import { BulkActionModal } from '../components/modals/BulkActionModal';
import { compressImage } from '../utils/imageUtils';
import { compressBase64Image } from '../services/imageService';
import { BRANCH_CATEGORIES } from '../constants';
import { OptimizedImage } from '../components/OptimizedImage';
import { useActionProcessing } from '../hooks/useActionProcessing';
import LoadingOverlay from '../components/LoadingOverlay';

interface BranchManagementProps {
  branches: string[];
  exclusiveBranches?: string[];
  branchAddresses?: Record<string, string>;
  branchCategories?: Record<string, string>;
  branchLogos?: Record<string, string>;
  artworks: Artwork[];
  onAddBranch: (name: string, isExclusive?: boolean, category?: string, logoUrl?: string) => void;
  onUpdateBranch: (oldName: string, newName: string, category?: string, address?: string, logoUrl?: string) => void;
  onDeleteBranch: (name: string) => void;
  onUpdateBranchAddress?: (name: string, address: string) => void;
  onViewArtwork?: (id: string) => void;
  events?: ExhibitionEvent[];
  onBulkSale?: (ids: string[], client: string, delivered: boolean, eventInfo?: { id: string; name: string }, attachments?: { itdrUrl?: string[]; rsaUrl?: string[]; orCrUrl?: string[] }, totalDownpayment?: number, clientEmail?: string, clientContact?: string, perArtworkDownpayments?: Record<string, number>) => void;
  onBulkReserve?: (ids: string[], details: string, expiryDate?: string, eventId?: string, eventName?: string) => void;
  onBulkTransferRequest?: (ids: string[], targetBranch: string, attachments?: { itdrUrl?: string }) => void;
  onBulkDeleteArtworks?: (ids: string[]) => void;
  onBulkUpdateArtworks?: (ids: string[], updates: Partial<Artwork>) => void;
  onBulkSendToFramer?: (ids: string[], damageDetails: string, attachmentUrl?: string) => void;
  onBulkReturnArtwork?: (ids: string[], reason: string, returnType: any, referenceNumber?: string, proofImage?: string | string[], remarks?: string) => void;
  onAddToAuction?: (artworkIds: string[], auctionId: string, name: string) => void;
  onTabChange?: (tab: 'inventory' | 'events' | 'branches' | 'returned' | 'framer' | 'auctions' | 'reservations' | 'monitoring' | 'sales') => void;
  sales?: SaleRecord[];
  canEdit?: boolean;
  permissions?: UserPermissions;
}


const BranchManagement: React.FC<BranchManagementProps> = ({
  branches,
  exclusiveBranches,
  branchAddresses,
  branchCategories,
  branchLogos = {},
  artworks,
  onAddBranch,
  onUpdateBranch,
  onDeleteBranch,
  onUpdateBranchAddress,
  onViewArtwork,
  events,
  onBulkSale,
  onBulkReserve,
  onBulkTransferRequest,
  onBulkDeleteArtworks,
  onBulkUpdateArtworks,
  onBulkSendToFramer,
  onBulkReturnArtwork,
  onAddToAuction,
  onTabChange,
  sales,
  canEdit = true,
  permissions
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<string | null>(null);
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchCategory, setBranchCategory] = useState(BRANCH_CATEGORIES[0]);
  const [branchLogo, setBranchLogo] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [artistStatusFilter, setArtistStatusFilter] = useState<ArtworkStatus | 'All' | 'Auction'>('All');
  const [selectedArtworkIds, setSelectedArtworkIds] = useState<string[]>([]);
  const [activeBranch, setActiveBranch] = useState<string | null>(null);

  const {
    isProcessing: isSyncing,
    processProgress: syncProgress,
    processMessage,
    wrapAction
  } = useActionProcessing({ itemTitle: 'Branches', itemCode: 'BRN' });

  const permittedArtworks = useMemo(() => {
    return (artworks || []).filter(art => {
      if (!art.id || !art.title) return false;

      const canViewReserved = permissions?.canViewReserved ?? true;
      const canViewAuctioned = permissions?.canViewAuctioned ?? true;
      const canViewExhibit = permissions?.canViewExhibit ?? true;
      const canViewForFraming = permissions?.canViewForFraming ?? true;
      const canViewBackToArtist = permissions?.canViewBackToArtist ?? true;

      if (art.status === ArtworkStatus.RESERVED) {
        const isAuction = (art.remarks || '').includes('[Reserved For Auction:');
        const isEvent = (art.remarks || '').includes('[Reserved For Event:');

        if (isAuction) {
          if (!canViewAuctioned) return false;
        } else if (isEvent) {
          if (!canViewExhibit) return false;
        } else {
          if (!canViewReserved) return false;
        }
      } else if (art.status === ArtworkStatus.FOR_FRAMING) {
        if (!canViewForFraming) return false;
      } else if (art.status === ArtworkStatus.FOR_RETOUCH) {
        if (!canViewBackToArtist) return false;
      }

      return true;
    });
  }, [artworks, permissions]);


  const priceStats = useMemo(() => {
    const branchArtworks = activeBranch ? permittedArtworks.filter(a => a.currentBranch === activeBranch) : [];
    const prices = branchArtworks.map(a => a.price || 0).filter(p => p > 0);

    if (prices.length === 0) return { min: 0, max: 100000, avg: 0 };
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const sum = prices.reduce((a, b) => a + b, 0);
    return { min, max, avg: Math.round(sum / prices.length) };
  }, [permittedArtworks, activeBranch]);

  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);

  React.useEffect(() => {
    if (priceStats.max > 0) {
      setPriceRange([priceStats.min, priceStats.max]);
    } else {
      setPriceRange([0, 100000]);
    }
  }, [priceStats.min, priceStats.max, activeBranch]);

  const [artistFilter, setArtistFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [mediumFilter, setMediumFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('Newest');
  const [bulkActionModal, setBulkActionModal] = useState<{ type: 'sale' | 'reserve' | 'delete' | 'transfer' | 'auction' | 'framer' | 'return' } | null>(null);
  const [bulkActionValue, setBulkActionValue] = useState('');
  const [bulkClientEmail, setBulkClientEmail] = useState('');
  const [bulkClientContact, setBulkClientContact] = useState('');
  const [bulkDownpayment, setBulkDownpayment] = useState('');
  const [bulkSaleDownpayments, setBulkSaleDownpayments] = useState<Record<string, string>>({});
  const [bulkSaleInstallmentsEnabled, setBulkSaleInstallmentsEnabled] = useState<Record<string, boolean>>({});
  const [bulkActionExtra, setBulkActionExtra] = useState(false);
  const [bulkSaleEventId, setBulkSaleEventId] = useState('');
  const [bulkTempItdr, setBulkTempItdr] = useState<string | string[] | null>(null);
  const [bulkTempRsa, setBulkTempRsa] = useState<string | string[] | null>(null);
  const [bulkTempOrCr, setBulkTempOrCr] = useState<string | string[] | null>(null);
  const [activeBulkAttachmentTab, setActiveBulkAttachmentTab] = useState<'itdr' | 'rsa' | 'orcr'>('itdr');
  const [reservationDetails, setReservationDetails] = useState('');
  const [reservationTab, setReservationTab] = useState<'person' | 'event' | 'auction'>('person');
  const [reservationClient, setReservationClient] = useState('');
  const [reservationEventId, setReservationEventId] = useState('');

  const [bulkFramerDamage, setBulkFramerDamage] = useState('');
  const [bulkReturnReason, setBulkReturnReason] = useState('');
  const [bulkReturnType, setBulkReturnType] = useState<'Artist Reclaim' | 'For Retouch'>('Artist Reclaim');
  const [bulkReturnRef, setBulkReturnRef] = useState('');
  const [bulkReturnNotes, setBulkReturnNotes] = useState('');
  const [reservationAuctionId, setReservationAuctionId] = useState('');
  const [reservationDays, setReservationDays] = useState(3);
  const [reservationHours, setReservationHours] = useState(0);
  const [reservationMinutes, setReservationMinutes] = useState(0);
  const [dateMonthFilter, setDateMonthFilter] = useState<string>('All');
  const [dateYearFilter, setDateYearFilter] = useState<string>('All');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const [modalSearch, setModalSearch] = useState('');
  const [modalMedium, setModalMedium] = useState('All');
  const [modalYear, setModalYear] = useState('All');
  const [modalStatus, setModalStatus] = useState('All');
  const [modalSize, setModalSize] = useState('All');
  const [modalFramedSize, setModalFramedSize] = useState('All');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isExclusive, setIsExclusive] = useState(false);
  const [errorModal, setErrorModal] = useState<{ title: string; message: string; onConfirm?: () => void } | null>(null);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const filteredBranches = branches.filter(b =>
    b.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedBranches = useMemo(() => {
    const groups: Record<string, string[]> = {};

    filteredBranches.forEach(branch => {
      let category = branchCategories?.[branch];

      if (category === undefined || category === null) {
        const brandParts = branch.split(' - ');
        if (brandParts.length > 1) {
          category = brandParts[0].trim();
        } else {
          const firstWord = branch.split(' ')[0];
          category = (firstWord && firstWord.length > 2) ? firstWord : 'Other';
        }
      }

      if (!category) category = 'Other';

      if (!groups[category]) {
        groups[category] = [branch];
      } else {
        groups[category].push(branch);
      }
    });

    return groups;
  }, [filteredBranches, branchCategories]);

  const activeCategories = useMemo(() => {
    const keys = Object.keys(groupedBranches).filter(cat => groupedBranches[cat].length > 0);
    return keys.sort((a, b) => {
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;

      const idxA = BRANCH_CATEGORIES.indexOf(a);
      const idxB = BRANCH_CATEGORIES.indexOf(b);

      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;

      return a.localeCompare(b);
    });
  }, [groupedBranches]);

  const getBranchArtworks = (branch: string) => permittedArtworks.filter(a => a.currentBranch === branch);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !branchName.trim()) return;

    await wrapAction(async () => {
      if (editingBranch) {
        onUpdateBranch(editingBranch, branchName, branchCategory, branchAddress.trim(), branchLogo || undefined);
      } else {
        onAddBranch(branchName, isExclusive, branchCategory, branchLogo || undefined);
        if (branchAddress.trim()) {
          onUpdateBranchAddress?.(branchName, branchAddress.trim());
        }
      }
      handleClose();
    }, editingBranch ? 'Updating Branch Record...' : 'Registering New Branch...');
  };

  const handleEdit = (branch: string) => {
    setEditingBranch(branch);
    setBranchName(branch);
    setBranchAddress(branchAddresses?.[branch] || '');

    let initialCategory = branchCategories?.[branch];
    if (!initialCategory || initialCategory === 'Other') {
      const brandParts = branch.split(' - ');
      if (brandParts.length > 1) {
        initialCategory = brandParts[0].trim();
      } else {
        const firstWord = branch.split(' ')[0];
        initialCategory = firstWord.length > 2 ? firstWord : 'Other';
      }
    }

    setBranchCategory(initialCategory || 'Gallery');
    setBranchLogo(branchLogos?.[branch] || null);
    setIsExclusive(exclusiveBranches?.includes(branch) || false);
    setIsModalOpen(true);
  };

  const handleDelete = async (branch: string) => {
    if (!canEdit) return;
    if (window.confirm(`Are you sure you want to delete "${branch}"? This might affect existing records.`)) {
      await wrapAction(async () => {
        onDeleteBranch(branch);
      }, `Decommissioning ${branch}...`);
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingBranch(null);
    setBranchName('');
    setBranchAddress('');
    setBranchCategory(BRANCH_CATEGORIES[0]);
    setBranchLogo(null);
    setIsExclusive(false);
  };

  const handleDeleteArtwork = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const canDelete = permissions ? permissions.canDeleteArtwork : canEdit;
    if (!canDelete || !onBulkDeleteArtworks) return;

    if (window.confirm('Are you sure you want to permanently delete this artwork? This action cannot be undone.')) {
      wrapAction(async () => {
        onBulkDeleteArtworks([id]);
      }, 'Deleting artwork...');
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const hasPermission = permissions
      ? (permissions.canDeleteArtwork || permissions.canSellArtwork || permissions.canReserveArtwork || permissions.canTransferArtwork || permissions.canEditArtwork)
      : canEdit;
    if (!hasPermission) return;
    setSelectedArtworkIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllForArtist = (arts: Artwork[]) => {
    const hasPermission = permissions
      ? (permissions.canDeleteArtwork || permissions.canSellArtwork || permissions.canReserveArtwork || permissions.canTransferArtwork || permissions.canEditArtwork)
      : canEdit;
    if (!hasPermission) return;
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
    setArtistStatusFilter('All');
    setBulkActionModal(null);
    setBulkActionValue('');
    setBulkClientEmail('');
    setBulkClientContact('');
    setBulkDownpayment('');
    setBulkSaleDownpayments({});
    setBulkSaleInstallmentsEnabled({});
    setBulkActionExtra(false);
    setReservationDetails('');
    setArtistFilter('All');
    setMediumFilter('All');
    setModalSize('All');
    setReservationDays(3);
    setReservationHours(0);
    setReservationMinutes(0);
    setModalSearch('');
    setModalMedium('All');
    setModalYear('All');
  };

  const handleCloseBulkModal = () => {
    setBulkActionModal(null);
    setBulkActionValue('');
    setBulkClientEmail('');
    setBulkClientContact('');
    setBulkDownpayment('');
    setBulkSaleDownpayments({});
    setBulkSaleInstallmentsEnabled({});
    setBulkActionExtra(false);
    setBulkTempItdr(null);
    setBulkTempRsa(null);
    setBulkTempOrCr(null);
    setActiveBulkAttachmentTab('itdr');
    setReservationDetails('');
    setIsCartOpen(true);
    setReservationTab('person');
    setReservationClient('');
    setReservationEventId('');
    setReservationDays(3);
    setReservationHours(0);
    setReservationMinutes(0);
    setBulkSaleEventId('');
    setBulkFramerDamage('');
    setBulkReturnReason('');
    setBulkReturnNotes('');
    setBulkReturnRef('');
  };

  const validateBulkAction = (type: 'sale' | 'reserve' | 'delete' | 'transfer' | 'auction' | 'framer' | 'return') => {
    const selectedArtworks = permittedArtworks.filter(a => selectedArtworkIds.includes(a.id));
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
    if (type === 'reserve' || type === 'auction') {
      const notReservable = selectedArtworks.filter(a => a.status === ArtworkStatus.SOLD || a.status === ArtworkStatus.DELIVERED || a.status === ArtworkStatus.CANCELLED || a.status === ArtworkStatus.EXCLUSIVE_VIEW_ONLY);
      if (notReservable.length > 0) {
        return {
          valid: false,
          title: type === 'auction' ? 'Cannot Add to Auction' : 'Cannot Reserve Items',
          message: `${notReservable.length} of the selected items cannot be ${type === 'auction' ? 'added to auction' : 'reserved'} because they are Sold, Delivered, Cancelled, or Exclusive View Only.\n\nOnly Available items can be used.`
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
    if (type === 'framer') {
      const locked = selectedArtworks.filter(a => a.status === ArtworkStatus.SOLD || a.status === ArtworkStatus.DELIVERED);
      if (locked.length > 0) {
        return {
          valid: false,
          title: 'Cannot Send to Framer',
          message: `${locked.length} of the selected items are Sold or Delivered. Please ensure only Available artworks are sent for framing.`
        };
      }
    }
    return { valid: true };
  };

  const handleBulkActionClick = (type: 'sale' | 'reserve' | 'delete' | 'transfer' | 'auction' | 'framer' | 'return') => {
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
          setBulkFramerDamage('');
          setBulkReturnReason('');
          setBulkReturnRef('');
          setBulkReturnNotes('');

          if (type === 'auction') {
            setReservationTab('auction');
            setBulkActionModal({ type: 'reserve' });
          } else {
            setReservationTab(type === 'reserve' ? 'person' : 'person');
            setBulkActionModal({ type: type as any });
          }
          setIsCartOpen(true);
        }
      });
      return;
    }

    setBulkActionValue('');
    setBulkClientEmail('');
    setBulkClientContact('');
    setBulkDownpayment('');
    setBulkSaleDownpayments({});
    setBulkSaleInstallmentsEnabled({});
    setBulkActionExtra(false);
    setReservationDetails('');
    setBulkFramerDamage('');
    setBulkReturnReason('');
    setBulkReturnRef('');
    setBulkReturnNotes('');

    if (type === 'auction') {
      setReservationTab('auction');
      setBulkActionModal({ type: 'reserve' });
    } else {
      setReservationTab('person');
      setBulkActionModal({ type: type as any });
    }
    setIsCartOpen(true);
  };

  const handleBulkActionSubmit = async (targetTabInput?: any) => {
    if (!bulkActionModal || selectedArtworkIds.length === 0) return;

    // Derive target tab if not provided (e.g. called from onClick which passes MouseEvent)
    let targetTab: any = typeof targetTabInput === 'string' ? targetTabInput : null;

    if (!targetTab) {
      if (bulkActionModal.type === 'sale') targetTab = 'sales';
      else if (bulkActionModal.type === 'reserve') targetTab = 'reservations';
      else if (bulkActionModal.type === 'framer') targetTab = 'framer';
      else if (bulkActionModal.type === 'return') targetTab = 'returned';
      else if (bulkActionModal.type === 'transfer') targetTab = 'inventory';
      else targetTab = 'inventory';
    }

    await wrapAction(async () => {
      const bulkItdrList = Array.isArray(bulkTempItdr) ? bulkTempItdr : bulkTempItdr ? [bulkTempItdr] : [];
      const bulkRsaList = Array.isArray(bulkTempRsa) ? bulkTempRsa : bulkTempRsa ? [bulkTempRsa] : [];
      const bulkOrCrList = Array.isArray(bulkTempOrCr) ? bulkTempOrCr : bulkTempOrCr ? [bulkTempOrCr] : [];
      const primaryBulkItdr = bulkItdrList[0];

      switch (bulkActionModal.type) {
        case 'sale':
          if (onBulkSale && bulkActionValue) {
            const selectedEvent = events?.find(e => e.id === bulkSaleEventId);
            const downpaymentAmount = bulkDownpayment ? parseFloat(bulkDownpayment.replace(/,/g, '')) : undefined;
            const perArtworkDownpayments = Object.fromEntries(
              Object.entries(bulkSaleDownpayments)
                .map(([artworkId, value]) => [artworkId, parseFloat(value.replace(/,/g, ''))] as const)
                .filter(([, value]) => !Number.isNaN(value) && value > 0)
            );

            await Promise.resolve(onBulkSale(selectedArtworkIds, bulkActionValue, bulkActionExtra,
              selectedEvent ? { id: selectedEvent.id, name: selectedEvent.title } : undefined,
              {
                itdrUrl: bulkItdrList.length > 0 ? bulkItdrList : undefined,
                rsaUrl: bulkRsaList.length > 0 ? bulkRsaList : undefined,
                orCrUrl: bulkOrCrList.length > 0 ? bulkOrCrList : undefined
              },
              downpaymentAmount,
              bulkClientEmail || undefined,
              bulkClientContact || undefined,
              Object.keys(perArtworkDownpayments).length > 0 ? perArtworkDownpayments : undefined
            ));
            setBulkTempItdr(null);
            setBulkTempRsa(null);
            setBulkTempOrCr(null);
            setActiveBulkAttachmentTab('itdr');
            setBulkSaleEventId('');
          }
          break;
        case 'reserve':
          if (reservationTab === 'auction') {
            if (onAddToAuction && reservationAuctionId) {
              const auctionEvent = events?.find(e => e.id === reservationAuctionId);
              const auctionName = auctionEvent ? auctionEvent.title : 'Auction';
              await Promise.resolve(onAddToAuction(selectedArtworkIds, reservationAuctionId, auctionName));
            }
          } else if (onBulkReserve) {
            let details = '';
            if (reservationTab === 'person') {
              if (!reservationClient.trim()) {
                throw new Error('Please enter a client name.');
              }
              details = `Type: Person | Target: ${reservationClient} | Notes: ${reservationDetails}`;
            } else {
              if (!reservationEventId) {
                throw new Error('Please select an event.');
              }
              const event = events?.find(e => e.id === reservationEventId);
              const eventName = event ? event.title : 'Unknown Event';
              details = `Type: Event | Target: ${eventName} | Notes: ${reservationDetails}`;
            }

            let expiryDate: string | undefined = undefined;
            if (reservationTab === 'person' && (reservationDays > 0 || reservationHours > 0 || reservationMinutes > 0)) {
              const now = new Date();
              const expiry = new Date(now.getTime() + (reservationDays * 24 * 60 * 60 * 1000) + (reservationHours * 60 * 60 * 1000) + (reservationMinutes * 60 * 1000));
              expiryDate = expiry.toISOString();
            }

            await Promise.resolve(onBulkReserve(selectedArtworkIds, details, expiryDate, reservationTab === 'event' ? reservationEventId : undefined, reservationTab === 'event' ? (events?.find(e => e.id === reservationEventId)?.title) : undefined));
          }
          break;
        case 'transfer':
          if (onBulkTransferRequest && bulkActionValue) {
            await Promise.resolve(onBulkTransferRequest(selectedArtworkIds, bulkActionValue, { itdrUrl: primaryBulkItdr || undefined }));
            setBulkTempItdr(null);
            setBulkTempRsa(null);
            setBulkTempOrCr(null);
            setActiveBulkAttachmentTab('itdr');
          } else if (onBulkUpdateArtworks && bulkActionValue) {
            const updates: Partial<Artwork> = { currentBranch: bulkActionValue as Branch };
            const isTargetExclusive = exclusiveBranches?.includes(bulkActionValue);
            const isSourceExclusive = activeBranch && exclusiveBranches?.includes(activeBranch);
            if (isTargetExclusive) {
              updates.status = ArtworkStatus.EXCLUSIVE_VIEW_ONLY;
            } else if (isSourceExclusive) {
              updates.status = ArtworkStatus.AVAILABLE;
            }
            await Promise.resolve(onBulkUpdateArtworks(selectedArtworkIds, updates));
          }
          break;
        case 'delete':
          if (onBulkDeleteArtworks) {
            await Promise.resolve(onBulkDeleteArtworks(selectedArtworkIds));
          }
          break;
        case 'framer':
          if (onBulkSendToFramer && bulkFramerDamage.trim()) {
            await Promise.resolve(onBulkSendToFramer(selectedArtworkIds, bulkFramerDamage, primaryBulkItdr || undefined));
          }
          break;
        case 'return':
          if (onBulkReturnArtwork && bulkReturnReason.trim()) {
            await Promise.resolve(onBulkReturnArtwork(selectedArtworkIds, bulkReturnReason, bulkReturnType, bulkReturnRef || undefined, primaryBulkItdr || undefined, bulkReturnNotes || undefined));
          }
          break;
      }

      setBulkActionModal(null);
      setSelectedArtworkIds([]);
      setBulkActionValue('');
      setBulkClientEmail('');
      setBulkClientContact('');
      setBulkDownpayment('');
      setBulkSaleDownpayments({});
      setBulkSaleInstallmentsEnabled?.({});
      setBulkActionExtra(false);
      setReservationDetails('');
      setReservationTab('person');
      setReservationClient('');
      setBulkTempItdr(null);
      setBulkTempRsa(null);
      setBulkTempOrCr(null);
      setActiveBulkAttachmentTab('itdr');
      setBulkFramerDamage('');
      setBulkReturnReason('');
      setBulkReturnRef('');
      setBulkReturnNotes('');
      setIsCartOpen(false);

      if (onTabChange) {
        onTabChange(targetTab);
      }
    }, `Synchronizing Bulk ${bulkActionModal.type.charAt(0).toUpperCase() + bulkActionModal.type.slice(1)} Workflow...`);
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

  const totalBranches = branches.length;
  const totalArtworks = permittedArtworks.length;
  const totalAvailable = permittedArtworks.filter(a => a.status === ArtworkStatus.AVAILABLE).length;
  const uniqueArtists = Array.from(new Set(permittedArtworks.map(a => a.artist))).length;

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
    if (artistFilter !== 'All' && art.artist !== artistFilter) return false;

    if (statusFilter !== 'All') {
      if (statusFilter === 'Sold/Delivered') {
        if (art.status !== ArtworkStatus.SOLD && art.status !== ArtworkStatus.DELIVERED) return false;
      } else if (art.status !== statusFilter) {
        return false;
      }
    }

    if (mediumFilter !== 'All' && art.medium !== mediumFilter) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = art.title.toLowerCase().includes(q);
      const matchesId = art.id.toLowerCase().includes(q);
      const matchesDim = art.dimensions?.toLowerCase().includes(q);
      const matchesArtist = art.artist.toLowerCase().includes(q);
      if (!matchesTitle && !matchesId && !matchesDim && !matchesArtist) return false;
    }

    const price = art.price || 0;
    if (price < priceRange[0] || price > priceRange[1]) return false;

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
  const cartArtworks = useMemo(() => {
    const rawCart = permittedArtworks.filter(a => selectedArtworkIds.includes(String(a.id)));
    return Array.from(new Map(rawCart.map(item => [String(item.id), item])).values());
  }, [permittedArtworks, selectedArtworkIds]);

  const cartItemCount = cartArtworks.length;
  const cartTotalValue = useMemo(
    () => cartArtworks.reduce((sum, art) => sum + (art.price || 0), 0),
    [cartArtworks]
  );
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

  const retouchForArtist =
    selectedArtist
      ? activeBranchArtworks.filter(
        a => a.artist === selectedArtist && a.status === ArtworkStatus.FOR_RETOUCH
      )
      : [];

  const framerForArtist =
    selectedArtist
      ? activeBranchArtworks.filter(
        a => a.artist === selectedArtist && a.status === ArtworkStatus.FOR_FRAMING
      )
      : [];

  const auctionForArtist =
    selectedArtist
      ? activeBranchArtworks.filter(
        a => a.artist === selectedArtist && events?.some(e => e.type === 'Auction' && e.artworkIds.includes(a.id))
      )
      : [];

  const getCurrentList = () => {
    const artistArts = selectedArtist ? activeBranchArtworks.filter(a => a.artist === selectedArtist) : [];

    switch (artistStatusFilter) {
      case 'All': return artistArts;
      case ArtworkStatus.AVAILABLE: return availableForArtist;
      case ArtworkStatus.RESERVED: return reservedForArtist;
      case ArtworkStatus.SOLD: return soldForArtist;
      case ArtworkStatus.EXCLUSIVE_VIEW_ONLY: return exclusiveForArtist;
      case ArtworkStatus.FOR_RETOUCH: return retouchForArtist;
      case ArtworkStatus.FOR_FRAMING: return framerForArtist;
      case 'Auction': return auctionForArtist;
      default: return availableForArtist;
    }
  };

  const currentList = getCurrentList();

  const filteredCurrentList = useMemo(() => {
    let list = currentList;

    if (showSelectedOnly) {
      list = list.filter(a => selectedArtworkIds.includes(a.id));
    }

    if (modalSearch.trim()) {
      const q = modalSearch.toLowerCase();
      list = list.filter(a =>
        (a.title || '').toLowerCase().includes(q) ||
        (a.id || '').toLowerCase().includes(q)
      );
    }
    if (modalStatus !== 'All') {
      list = list.filter(a => a.status === modalStatus);
    }
    if (modalMedium !== 'All') {
      list = list.filter(a => a.medium === modalMedium);
    }
    if (modalYear !== 'All') {
      list = list.filter(a => {
        const d = new Date(a.date || a.createdAt);
        return !isNaN(d.getTime()) && d.getFullYear().toString() === modalYear;
      });
    }
    if (modalSize !== 'All') {
      list = list.filter(a => a.dimensions === modalSize);
    }
    if (modalFramedSize !== 'All') {
      list = list.filter(a => a.sizeFrame === modalFramedSize);
    }

    return Array.from(
      new Map(list.map((art) => [art.id, art])).values()
    );
  }, [currentList, modalSearch, modalStatus, modalMedium, modalYear, modalSize, modalFramedSize, showSelectedOnly, selectedArtworkIds]);

  const modalUniqueMediums = useMemo(() => Array.from(new Set(currentList.map(a => a.medium).filter(Boolean))).sort(), [currentList]);
  const modalUniqueYears = useMemo(() => Array.from(new Set(currentList.map(a => {
    const d = new Date(a.date || a.createdAt);
    return !isNaN(d.getTime()) ? d.getFullYear().toString() : '';
  }).filter(Boolean))).sort().reverse(), [currentList]);
  const modalUniqueStatuses = useMemo(() => Array.from(new Set(currentList.map(a => a.status).filter(Boolean))).sort(), [currentList]);
  const modalUniqueSizes = useMemo(() => Array.from(new Set(currentList.map(a => a.dimensions).filter(Boolean))).sort(), [currentList]);
  const modalUniqueFramedSizes = useMemo(() => Array.from(new Set(currentList.map(a => a.sizeFrame).filter(Boolean))).sort(), [currentList]);

  const allSelectedForArtist =
    filteredCurrentList.length > 0 &&
    filteredCurrentList.every(a => selectedArtworkIds.includes(a.id));

  React.useEffect(() => {
    if (!selectedArtist) return;

    const currentCount =
      artistStatusFilter === 'All' ? (availableForArtist.length + reservedForArtist.length + soldForArtist.length + exclusiveForArtist.length + retouchForArtist.length + framerForArtist.length) :
        artistStatusFilter === ArtworkStatus.AVAILABLE ? availableForArtist.length :
          artistStatusFilter === ArtworkStatus.RESERVED ? reservedForArtist.length :
            artistStatusFilter === ArtworkStatus.SOLD ? soldForArtist.length :
              artistStatusFilter === ArtworkStatus.EXCLUSIVE_VIEW_ONLY ? exclusiveForArtist.length :
                artistStatusFilter === ArtworkStatus.FOR_RETOUCH ? retouchForArtist.length :
                  artistStatusFilter === ArtworkStatus.FOR_FRAMING ? framerForArtist.length :
                    artistStatusFilter === 'Auction' ? auctionForArtist.length : 0;

    if (currentCount === 0) {
      if (availableForArtist.length > 0) setArtistStatusFilter(ArtworkStatus.AVAILABLE);
      else if (reservedForArtist.length > 0) setArtistStatusFilter(ArtworkStatus.RESERVED);
      else if (soldForArtist.length > 0) setArtistStatusFilter(ArtworkStatus.SOLD);
      else if (exclusiveForArtist.length > 0) setArtistStatusFilter(ArtworkStatus.EXCLUSIVE_VIEW_ONLY);
      else if (retouchForArtist.length > 0) setArtistStatusFilter(ArtworkStatus.FOR_RETOUCH);
      else if (framerForArtist.length > 0) setArtistStatusFilter(ArtworkStatus.FOR_FRAMING);
      else if (auctionForArtist.length > 0) setArtistStatusFilter('Auction');
    }
  }, [
    selectedArtist,
    artistStatusFilter,
    availableForArtist.length,
    reservedForArtist.length,
    soldForArtist.length,
    exclusiveForArtist.length,
    retouchForArtist.length,
    framerForArtist.length,
    auctionForArtist.length
  ]);

  return (
    <div className="space-y-8 pb-10 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <div className="relative overflow-hidden rounded-md bg-gradient-to-r from-neutral-200 via-neutral-100 to-white p-[1px] shadow-xl shadow-neutral-200/50">
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white text-neutral-900 rounded-md px-8 py-7">
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <div className="absolute -right-20 -top-24 w-64 h-64 bg-neutral-100 blur-3xl rounded-md" />
            <div className="absolute -left-16 -bottom-24 w-72 h-72 bg-neutral-50 blur-3xl rounded-md" />
          </div>
          <div className="relative z-10 space-y-3">
            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center px-3 py-1 rounded-sm text-[10px] font-black uppercase tracking-[0.2em] bg-neutral-100 border border-neutral-200 text-neutral-600">
                <Sparkles size={12} className="mr-1.5" />
                Administration
              </span>
              <span className="hidden md:inline-block h-px w-10 bg-neutral-200"></span>
              <span className="hidden md:inline-block text-[11px] font-semibold text-neutral-500">
                Design a vibrant network of ArtisFlow locations.
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-neutral-900">
              Branch Management
            </h1>
            <p className="text-sm md:text-base text-neutral-500 max-w-2xl">
              Curate galleries, warehouses, and private collections in one colorful control room.
            </p>
          </div>
          <div className="relative z-10 flex flex-col items-end gap-3">
            <div className="flex items-center space-x-2 rounded-sm bg-emerald-100 px-3 py-1 border border-emerald-200 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              <div className="w-1.5 h-1.5 rounded-sm bg-emerald-500 animate-pulse" />
              <span>Operations Live</span>
            </div>
            {canEdit && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center space-x-2 px-6 py-3 rounded-md bg-neutral-900 text-white text-sm font-black shadow-lg shadow-neutral-200 hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-sm bg-white text-neutral-900">
                  <Plus size={16} />
                </span>
                <span>Launch New Branch</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-md border border-neutral-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Active Branches</p>
              <p className="mt-1 text-2xl font-black text-neutral-900">{totalBranches}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-neutral-100 text-neutral-900 border border-neutral-200 shadow-sm">
              <Building2 size={18} />
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-md border border-neutral-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Total Artworks</p>
              <p className="mt-1 text-2xl font-black text-neutral-900">{totalArtworks}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-neutral-100 text-neutral-900 border border-neutral-200 shadow-sm">
              <Package size={18} />
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-md border border-neutral-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Ready To Exhibit</p>
              <p className="mt-1 text-2xl font-black text-neutral-900">{totalAvailable}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-neutral-100 text-neutral-900 border border-neutral-200 shadow-sm">
              <Sparkles size={18} />
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-md border border-neutral-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Artists Represented</p>
              <p className="mt-1 text-2xl font-black text-neutral-900">{uniqueArtists}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-neutral-100 text-neutral-900 border border-neutral-200 shadow-sm">
              <MapPin size={18} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur rounded-md border border-neutral-200/80 shadow-xl shadow-neutral-200/50 overflow-hidden">
        <div className="p-6 border-b border-neutral-100/80 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-50/80">
          <div>
            <h3 className="text-lg font-black text-neutral-900 flex items-center gap-2">
              Active Locations
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-[11px] font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
                {branches.length} in network
              </span>
            </h3>
            <p className="text-[12px] text-neutral-500 mt-1">
              Drag open a branch to explore artists and pieces on site.
            </p>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input
              type="text"
              placeholder="Search branches, cities, spaces..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-md text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 shadow-sm"
            />
          </div>
        </div>

        <div className="p-10 space-y-12">
          {filteredBranches.length > 0 ? (
            activeCategories.map(category => {
              const categoryBranches = groupedBranches[category];
              const isSearchActive = searchTerm.trim().length > 0;
              const isCollapsed = isSearchActive ? false : (collapsedCategories[category] ?? false);

              return (
                <div key={category} className="space-y-4">
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsedCategories(prev => ({
                        ...prev,
                        [category]: !(prev[category] ?? false)
                      }))
                    }
                    className="w-full flex items-center justify-between rounded-md px-2 py-2 text-left hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <h3 className="text-2xl font-black text-neutral-900 tracking-tight">
                        {category}
                      </h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-[11px] font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200">
                        {categoryBranches.length}
                      </span>
                    </div>
                    <ChevronRight
                      size={18}
                      className={`text-neutral-400 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`}
                    />
                  </button>

                  {!isCollapsed && (
                    <div className="space-y-2">
                      {categoryBranches.map((branch) => {
                        const branchArtworks = getBranchArtworks(branch);

                        return (
                          <div key={branch} className="group relative">
                            <div
                              className="p-4 flex items-center justify-between rounded-md hover:bg-neutral-50 transition-all duration-200 cursor-pointer border border-transparent hover:border-neutral-100"
                              onClick={() => {
                                setActiveBranch(branch);
                                setSelectedArtist(null);
                              }}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-4">
                                  {branchLogos?.[branch] ? (
                                    <div className="w-10 h-10 rounded-sm overflow-hidden bg-neutral-100 flex-shrink-0 border border-neutral-100">
                                      <OptimizedImage src={branchLogos[branch]} alt={branch} className="w-full h-full object-cover" />
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 rounded-sm bg-neutral-100 flex items-center justify-center text-neutral-400 flex-shrink-0 border border-neutral-100">
                                      <Building2 size={18} />
                                    </div>
                                  )}
                                  <span className="text-lg text-neutral-800 font-semibold group-hover:text-black transition-colors">
                                    {branch}
                                  </span>
                                  {exclusiveBranches?.includes(branch) && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-wider bg-neutral-900 text-white shadow-sm">
                                      Exclusive
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-xs text-neutral-400 font-medium mt-1">
                                  <div className="flex items-center gap-1.5">
                                    <MapPin size={12} className="text-neutral-300" />
                                    <span className="truncate max-w-[400px]">{branchAddresses?.[branch] || 'No Address Listed'}</span>
                                  </div>
                                  <span>•</span>
                                  <div className="flex items-center gap-1.5">
                                    <Package size={12} className="text-neutral-300" />
                                    <span>{branchArtworks.length} items on site</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                {canEdit && (
                                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEdit(branch);
                                      }}
                                      className="p-2.5 text-neutral-400 hover:text-neutral-900 hover:bg-white rounded-sm transition-all border border-transparent hover:border-neutral-200 shadow-sm hover:shadow-md"
                                      title="Edit Details"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(branch);
                                      }}
                                      className="p-2.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-sm transition-all border border-transparent hover:border-red-100"
                                      title="Delete Location"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                )}
                                <ChevronRight size={18} className="text-neutral-300 group-hover:text-neutral-900 group-hover:translate-x-1 transition-all" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-neutral-50 rounded-sm flex items-center justify-center mb-4">
                <Search size={24} className="text-neutral-300" />
              </div>
              <p className="text-neutral-400 font-medium">No locations found matching your search.</p>
            </div>
          )}
        </div>

      </div>

      {errorModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center">
              <h3 className="text-sm font-bold text-neutral-900">{errorModal.title}</h3>
              <button
                onClick={() => setErrorModal(null)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div
                className={`p-4 rounded-xl flex items-start gap-3 ${errorModal.onConfirm ? 'bg-neutral-50 text-neutral-900' : 'bg-neutral-50 text-neutral-900'
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
                    className="px-5 py-2.5 bg-neutral-900 text-white rounded-xl text-sm font-bold hover:bg-black"
                  >
                    Yes, Proceed Anyway
                  </button>
                )}
                <button
                  onClick={() => setErrorModal(null)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold ${errorModal.onConfirm
                    ? 'text-neutral-600 hover:bg-neutral-50'
                    : 'bg-neutral-900 text-white hover:bg-black'
                    }`}
                >
                  {errorModal.onConfirm ? 'Cancel' : 'Okay'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeBranch && createPortal(
        <div
          className={`fixed inset-x-0 top-0 z-[120] flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4 transition-all duration-300`}
          style={{
            bottom: '0'
          }}
        >
          <div className={`bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-neutral-200 transition-all duration-300 max-h-full`}>
            <div className="px-6 py-4 border-b border-neutral-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white relative">
              <div className="flex items-start gap-4 pr-0 md:pr-20 w-full md:w-auto">
                <button
                  onClick={handleCloseBranchModal}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-neutral-100 text-neutral-900 border border-neutral-200 hover:bg-neutral-200 text-xs font-bold shadow-sm transition-all hover:scale-105"
                >
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-sm text-[10px] font-black uppercase tracking-[0.2em] bg-neutral-100 border border-neutral-200 text-neutral-600">
                      <Sparkles size={12} className="mr-1.5" />
                      Branch Overview
                    </span>
                    <span className="hidden md:inline text-[11px] text-neutral-500 font-semibold">
                      Performance and inventory snapshot.
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-neutral-900 flex items-center gap-3">
                    {branchLogos?.[activeBranch] && (
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0 border border-neutral-100">
                        <OptimizedImage src={branchLogos[activeBranch]} alt={activeBranch} className="w-full h-full object-cover" />
                      </div>
                    )}
                    {activeBranch}
                    <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-semibold uppercase tracking-[0.18em] bg-neutral-100 border border-neutral-200 text-neutral-600">
                      {branchTotalItems} items
                    </span>
                  </h2>
                  <p className="text-xs text-neutral-500">
                    {activeBranchAddress || 'Address not set'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseBranchModal}
                className="absolute right-6 top-1/2 -translate-y-1/2 p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-sm transition-colors z-10"
                title="Close"
              >
                <XCircle size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-neutral-50">
              <div className="max-w-6xl mx-auto px-6 pt-6 pb-24 space-y-4">
                {!exclusiveBranches?.includes(activeBranch) && (branchTotalItems === 0 || branchAvailableCount > 0 || branchReservedCount > 0 || branchSoldCount > 0 || branchDeliveredCount > 0) && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white border border-neutral-200 rounded-md p-4 shadow-sm flex flex-col">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Total Items</span>
                        <span className="mt-1 text-2xl font-black text-neutral-900">{branchTotalItems.toLocaleString()}</span>
                      </div>
                      <div className="bg-white border border-neutral-200 rounded-md p-4 shadow-sm flex flex-col">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-700">Available</span>
                        <span className="mt-1 text-2xl font-black text-neutral-900">{branchAvailableCount.toLocaleString()}</span>
                        <span className="text-[11px] text-neutral-500 mt-1">₱{branchAvailableValue.toLocaleString()} value</span>
                      </div>
                      <div className="bg-white border border-neutral-200 rounded-md p-4 shadow-sm flex flex-col">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-700">Reserved</span>
                        <span className="mt-1 text-xl font-black text-neutral-900">{branchReservedCount.toLocaleString()}</span>
                        <span className="text-[11px] text-neutral-500 mt-1">{branchCancelledCount.toLocaleString()} cancelled</span>
                      </div>
                      <div className="bg-white border border-neutral-200 rounded-md p-4 shadow-sm flex flex-col">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-700">Sold / Delivered</span>
                        <span className="mt-1 text-xl font-black text-neutral-900">
                          {branchSoldCount.toLocaleString()} Sold
                        </span>
                        <span className="text-[11px] text-neutral-500 mt-1">
                          {branchDeliveredCount.toLocaleString()} Delivered
                        </span>
                      </div>
                    </div>
                  </>
                )}
                <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm">
                  <div className="px-6 py-5 border-b border-neutral-100 flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-neutral-50 to-transparent pointer-events-none" />

                    <div className="relative z-10 flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-sm bg-neutral-900 text-white shadow-lg shadow-neutral-900/20">
                        <Sparkles size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-neutral-900 tracking-tight">Branch Inventory Explorer</h3>
                        <p className="text-sm font-medium text-neutral-500">Manage local stock and audits</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-white border-b border-neutral-100">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative group flex-1">
                          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-neutral-900 transition-colors" />
                          <input
                            type="text"
                            placeholder="Search title, artist, or ID..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm font-bold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 transition-all shadow-sm"
                          />
                        </div>
                        <div className="w-full md:w-80 h-full flex gap-2">
                          <div className="flex-1 h-full bg-neutral-50 border border-neutral-200 rounded-sm px-4 py-2 flex items-center shadow-sm">
                            <PriceRangeFilter
                              min={priceStats.min}
                              max={priceStats.max}
                              value={priceRange}
                              onChange={setPriceRange}
                              average={priceStats.avg}
                              className="w-full h-8"
                            />
                          </div>
                          <button
                            onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
                            className={`md:hidden px-4 py-2 rounded-xl border flex items-center justify-center transition-colors ${isMobileFiltersOpen
                              ? 'bg-neutral-900 text-white border-neutral-900'
                              : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                              }`}
                          >
                            <span className="sr-only">Filters</span>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className={`transition-transform duration-200 ${isMobileFiltersOpen ? 'rotate-180' : ''}`}
                            >
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className={`flex flex-col md:flex-row flex-wrap items-start md:items-center gap-3 transition-all duration-300 overflow-hidden ${isMobileFiltersOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 md:max-h-none md:opacity-100'
                        }`}>
                        <div className="flex items-center bg-white rounded-sm border border-neutral-200 shadow-sm hover:border-neutral-300 transition-colors">
                          <div className="pl-3 pr-2 py-2.5 border-r border-neutral-100 bg-neutral-50 rounded-l-sm">
                            <Calendar size={14} className="text-neutral-400" />
                          </div>
                          <select
                            value={dateMonthFilter}
                            onChange={e => setDateMonthFilter(e.target.value)}
                            className="bg-transparent border-0 px-3 py-2.5 text-xs font-bold text-neutral-700 focus:ring-0 cursor-pointer min-w-[100px]"
                          >
                            <option value="All">All Months</option>
                            {monthNames.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
                          </select>
                          <div className="w-px h-5 bg-neutral-200" />
                          <select
                            value={dateYearFilter}
                            onChange={e => setDateYearFilter(e.target.value)}
                            className="bg-transparent border-0 px-3 py-2.5 text-xs font-bold text-neutral-700 focus:ring-0 cursor-pointer rounded-r-sm min-w-[80px]"
                          >
                            <option value="All">All Years</option>
                            {availableYearOptions.map(y => <option key={y} value={String(y)}>{y}</option>)}
                          </select>
                        </div>

                        <select
                          value={statusFilter}
                          onChange={e => setStatusFilter(e.target.value)}
                          className="bg-white border border-neutral-200 rounded-sm px-4 py-2.5 text-xs font-bold text-neutral-700 shadow-sm focus:outline-none focus:border-neutral-900 hover:border-neutral-300 transition-all cursor-pointer min-w-[140px]"
                        >
                          <option value="All">All Statuses</option>
                          {Object.values(ArtworkStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>

                        <select
                          value={artistFilter}
                          onChange={e => setArtistFilter(e.target.value)}
                          className="bg-white border border-neutral-200 rounded-sm px-4 py-2.5 text-xs font-bold text-neutral-700 shadow-sm focus:outline-none focus:border-neutral-900 hover:border-neutral-300 transition-all cursor-pointer min-w-[140px]"
                        >
                          <option value="All">All Artists</option>
                          {branchArtists.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>

                        <select
                          value={mediumFilter}
                          onChange={e => setMediumFilter(e.target.value)}
                          className="bg-white border border-neutral-200 rounded-sm px-4 py-2.5 text-xs font-bold text-neutral-700 shadow-sm focus:outline-none focus:border-neutral-900 hover:border-neutral-300 transition-all cursor-pointer min-w-[140px]"
                        >
                          <option value="All">All Mediums</option>
                          {branchMediums.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {activeBranchArtworks.length > 0 ? (
                      <>
                        <div className="relative z-10">
                          <p className="text-[11px] font-medium text-neutral-600 mb-2">
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
                                  className={`flex flex-col items-stretch rounded-md border text-left text-xs transition-all shadow-sm overflow-hidden ${isActiveArtist
                                    ? 'bg-neutral-900 text-white border-transparent shadow-md'
                                    : 'bg-white/95 border-neutral-100 hover:border-neutral-300 hover:shadow-md'
                                    }`}
                                >
                                  {sampleArt && (
                                    <div className={`aspect-[4/3] overflow-hidden ${isActiveArtist ? 'bg-black/20' : 'bg-neutral-100'}`}>
                                      <OptimizedImage
                                        src={sampleArt.imageUrl || undefined}
                                        alt={artist}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                      />
                                    </div>
                                  )}
                                  <div className="px-3 py-3 flex flex-col gap-0.5">
                                    <span className={`text-sm font-bold truncate ${isActiveArtist ? 'text-white' : 'text-neutral-900'}`}>{artist}</span>
                                    <span className={`text-[11px] ${isActiveArtist ? 'text-neutral-100' : 'text-neutral-500'}`}>
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
                      <div className="relative z-10 text-center py-8 text-neutral-400">
                        <Package size={32} className="mx-auto mb-2 opacity-60" />
                        <p className="text-sm">No artworks currently at this location.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {(activeBranch && selectedArtist) ? createPortal(
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-neutral-900/80 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-4 py-4 sm:px-6 sm:py-4 border-b border-neutral-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
              <div className="flex items-center gap-3 w-full sm:w-auto pr-0 sm:pr-24">
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="w-9 h-9 rounded-sm flex items-center justify-center transition-all bg-neutral-100 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-600 flex-shrink-0"
                  title="Review Selection"
                >
                  <ShoppingBag size={18} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-[11px] font-bold text-neutral-500 uppercase tracking-[0.18em] truncate">
                    Artworks
                  </p>
                  <p className="text-sm font-bold text-neutral-900 truncate">
                    {selectedArtist} at {activeBranch}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedArtist(null)}
                className="w-full sm:w-auto static sm:absolute sm:right-6 sm:top-1/2 sm:-translate-y-1/2 inline-flex items-center justify-center gap-2 px-3 py-2 sm:py-1.5 rounded-xl sm:rounded-full text-xs font-semibold text-neutral-600 bg-neutral-100 sm:bg-transparent hover:bg-neutral-200 sm:hover:bg-neutral-100 z-10 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                <span>Close Viewer</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                    Paintings by {selectedArtist}
                  </p>
                  <span
                    onClick={() => setArtistStatusFilter('All')}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${artistStatusFilter === 'All'
                      ? 'text-white bg-neutral-900 border-neutral-900 shadow-sm'
                      : 'text-neutral-500 bg-neutral-50 border-neutral-100 hover:bg-neutral-100'
                      }`}
                  >
                    {availableForArtist.length + reservedForArtist.length + soldForArtist.length + exclusiveForArtist.length + retouchForArtist.length + framerForArtist.length} pieces
                  </span>
                  <span
                    onClick={() => setArtistStatusFilter(ArtworkStatus.AVAILABLE)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border ${artistStatusFilter === ArtworkStatus.AVAILABLE
                      ? 'text-white bg-emerald-600 border-emerald-600'
                      : 'text-neutral-600 bg-neutral-50 border-neutral-100 cursor-pointer hover:bg-neutral-100 transition-colors'
                      }`}
                  >
                    {availableForArtist.length} available
                  </span>
                  {reservedForArtist.length > 0 && (
                    <span
                      onClick={() => setArtistStatusFilter(ArtworkStatus.RESERVED)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${artistStatusFilter === ArtworkStatus.RESERVED
                        ? 'text-neutral-900 bg-neutral-100 border-neutral-200'
                        : 'text-neutral-700 bg-neutral-50 border-neutral-100 cursor-pointer hover:bg-neutral-100 transition-colors'
                        }`}
                    >
                      {reservedForArtist.length} reserved
                    </span>
                  )}
                  {soldForArtist.length > 0 && (
                    <span
                      onClick={() => setArtistStatusFilter(ArtworkStatus.SOLD)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${artistStatusFilter === ArtworkStatus.SOLD
                        ? 'text-red-700 bg-red-50 border-red-200'
                        : 'text-neutral-600 bg-neutral-50 border-red-200 cursor-pointer hover:bg-neutral-100 transition-colors'
                        }`}
                    >
                      {soldForArtist.length} sold
                    </span>
                  )}
                  {exclusiveForArtist.length > 0 && (
                    <span
                      onClick={() => setArtistStatusFilter(ArtworkStatus.EXCLUSIVE_VIEW_ONLY)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${artistStatusFilter === ArtworkStatus.EXCLUSIVE_VIEW_ONLY
                        ? 'text-neutral-900 bg-neutral-200 border-neutral-300'
                        : 'text-neutral-600 bg-neutral-100 border-neutral-200 cursor-pointer hover:bg-neutral-200 transition-colors'
                        }`}
                    >
                      {exclusiveForArtist.length} view only
                    </span>
                  )}
                  {auctionForArtist.length > 0 && (
                    <span
                      onClick={() => setArtistStatusFilter('Auction')}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${artistStatusFilter === 'Auction'
                        ? 'text-amber-900 bg-amber-100 border-amber-200'
                        : 'text-neutral-600 bg-neutral-50 border-neutral-100 cursor-pointer hover:bg-neutral-100 transition-colors'
                        }`}
                    >
                      {auctionForArtist.length} auction
                    </span>
                  )}
                  {retouchForArtist.length > 0 && (
                    <span
                      onClick={() => setArtistStatusFilter(ArtworkStatus.FOR_RETOUCH)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${artistStatusFilter === ArtworkStatus.FOR_RETOUCH
                        ? 'text-purple-900 bg-purple-100 border-purple-200'
                        : 'text-neutral-600 bg-neutral-50 border-neutral-100 cursor-pointer hover:bg-neutral-100 transition-colors'
                        }`}
                    >
                      {retouchForArtist.length} retouch
                    </span>
                  )}
                  {framerForArtist.length > 0 && (
                    <span
                      onClick={() => setArtistStatusFilter(ArtworkStatus.FOR_FRAMING)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${artistStatusFilter === ArtworkStatus.FOR_FRAMING
                        ? 'text-blue-900 bg-blue-100 border-blue-200'
                        : 'text-neutral-600 bg-neutral-50 border-neutral-100 cursor-pointer hover:bg-neutral-100 transition-colors'
                        }`}
                    >
                      {framerForArtist.length} framer
                    </span>
                  )}
                  <span className="ml-2 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Showing: {
                      artistStatusFilter === 'All' ? 'Total Portfolio' :
                        artistStatusFilter === ArtworkStatus.AVAILABLE ? 'Available' :
                          artistStatusFilter === ArtworkStatus.RESERVED ? 'Reserved' :
                            artistStatusFilter === ArtworkStatus.EXCLUSIVE_VIEW_ONLY ? 'Not For Sale' :
                              artistStatusFilter === ArtworkStatus.SOLD ? 'Sold' :
                                artistStatusFilter === 'Auction' ? 'Auction' :
                                  artistStatusFilter === ArtworkStatus.FOR_RETOUCH ? 'For Retouch' :
                                    artistStatusFilter === ArtworkStatus.FOR_FRAMING ? 'For Framing' :
                                      'Items'
                    }
                  </span>
                </div>
                {filteredCurrentList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSelectAllForArtist(filteredCurrentList)}
                    disabled={!canEdit}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors ${!canEdit ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed' : 'bg-neutral-900 text-neutral-50 border-neutral-700 hover:bg-black'}`}
                  >
                    {allSelectedForArtist ? 'Clear Selection' : 'Select All'}
                  </button>
                )}
              </div>

              <div className="flex flex-col xl:flex-row items-center gap-3 mb-4 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                <div className="relative flex-1 w-full">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search in this view..."
                    value={modalSearch}
                    onChange={e => setModalSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-neutral-900 transition-colors"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                  <select
                    value={modalStatus}
                    onChange={e => setModalStatus(e.target.value)}
                    className="flex-1 min-w-[120px] bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-neutral-900 cursor-pointer"
                  >
                    <option value="All">All Statuses</option>
                    {modalUniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select
                    value={modalMedium}
                    onChange={e => setModalMedium(e.target.value)}
                    className="flex-1 min-w-[120px] bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-neutral-900 cursor-pointer"
                  >
                    <option value="All">All Mediums</option>
                    {modalUniqueMediums.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select
                    value={modalYear}
                    onChange={e => setModalYear(e.target.value)}
                    className="flex-1 min-w-[100px] bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-neutral-900 cursor-pointer"
                  >
                    <option value="All">All Years</option>
                    {modalUniqueYears.map(y => <option key={y} value={String(y)}>{y}</option>)}
                  </select>
                  <select
                    value={modalSize}
                    onChange={e => setModalSize(e.target.value)}
                    className="flex-1 min-w-[120px] bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-neutral-900 cursor-pointer"
                  >
                    <option value="All">All Sizes</option>
                    {modalUniqueSizes.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select
                    value={modalFramedSize}
                    onChange={e => setModalFramedSize(e.target.value)}
                    className="flex-1 min-w-[120px] bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-neutral-900 cursor-pointer"
                  >
                    <option value="All">Framed Sizes</option>
                    {modalUniqueFramedSizes.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {filteredCurrentList.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {filteredCurrentList.map(art => (
                    <div
                      key={art.id}
                      onClick={() => onViewArtwork?.(art.id)}
                      className={`group bg-white rounded-xl sm:rounded-2xl border ${selectedArtworkIds.includes(art.id)
                        ? 'border-neutral-900 ring-2 sm:ring-4 ring-neutral-900/10'
                        : 'border-neutral-200'
                        } overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col h-full hover:-translate-y-1 relative`}
                    >
                      <div
                        onClick={(e) => toggleSelect(art.id, e)}
                        className={`absolute top-2 left-2 z-10 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedArtworkIds.includes(art.id)
                          ? 'bg-neutral-900 border-neutral-900 text-white'
                          : 'bg-white/80 backdrop-blur border-neutral-300 opacity-0 group-hover:opacity-100'
                          } ${!canEdit ? 'hidden' : 'cursor-pointer'}`}
                      >
                        {selectedArtworkIds.includes(art.id) && (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>

                      <button
                        onClick={(e) => handleDeleteArtwork(art.id, e)}
                        className={`absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/80 backdrop-blur border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all opacity-0 group-hover:opacity-100 ${!canEdit ? 'hidden' : 'cursor-pointer'}`}
                        title="Delete Artwork"
                      >
                        <Trash2 size={12} />
                      </button>
                      <div className="w-full aspect-[4/5] sm:aspect-[4/3] overflow-hidden relative flex-shrink-0 bg-neutral-100">
                        <OptimizedImage
                          src={art.imageUrl || undefined}
                          alt={art.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        {art.status === ArtworkStatus.RESERVED && (
                          <div className="absolute bottom-0 left-0 right-0 bg-amber-500/90 text-white text-[9px] font-bold px-2 py-1 text-center backdrop-blur-sm">
                            {art.reservationDetails || 'RESERVED'}
                          </div>
                        )}
                      </div>
                      <div className="p-2 sm:p-4 flex-1 flex flex-col min-w-0">
                        <div className="mb-1 space-y-0.5">
                          <h4 className="text-xs sm:text-sm font-bold text-neutral-900 leading-tight line-clamp-1 group-hover:text-neutral-600 transition-colors">
                            {art.title}
                          </h4>
                          <p className="text-[10px] sm:text-xs text-neutral-500 line-clamp-1">
                            {art.medium}
                          </p>
                          <p className="text-[9px] sm:text-[11px] text-neutral-400 line-clamp-1">
                            {art.dimensions}
                          </p>
                        </div>
                        <div className="mt-auto pt-2 flex items-center justify-between border-t border-neutral-100">
                          <p className="text-[10px] sm:text-[11px] text-neutral-500 font-medium truncate">
                            ₱{(art.price || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-neutral-400">
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
        </div>,
        document.body
      ) : null}

      {selectedArtworkIds.length > 0 && !isCartOpen && createPortal(
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[125] animate-in slide-in-from-bottom-10 fade-in duration-500 max-w-[95vw]">
          <div className="relative group">
            <div className="relative bg-[#323130]/95 backdrop-blur-md text-white pl-5 pr-3 py-3 rounded-full shadow-[0_12px_24_px_-4px_rgba(0,0,0,0.3),0_0_1px_rgba(255,255,255,0.1)] flex items-center gap-5 border border-white/10 hover:border-white/20 transition-all duration-300">
              <div
                className="flex items-center gap-4 cursor-pointer group/item"
                onClick={() => setIsCartOpen(true)}
              >
                <div className="bg-[#0078d4] p-2.5 rounded-full shadow-lg shadow-[#0078d4]/20 transform transition-all group-hover/item:scale-105 group-hover/item:rotate-3">
                  <Sparkles size={16} strokeWidth={2.5} className="text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a19f9d] leading-none mb-1.5">Queue Action</span>
                  <p className="font-bold text-[13px] tracking-tight text-white leading-none">
                    Review {selectedArtworkIds.length} Artwork{selectedArtworkIds.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className="h-8 w-px bg-white/10"></div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedArtworkIds([]);
                }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#c8c6c4] hover:text-white hover:bg-white/10 transition-all duration-200 transform hover:scale-110 active:scale-95"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isCartOpen && createPortal(
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-neutral-900/40 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-300">
          <div className="bg-[#f3f2f1] w-full max-w-5xl h-[90vh] rounded-xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col border border-white/20 relative">

            {/* Microsoft Fluent Header */}
            <div className="px-6 py-4 bg-white border-b border-[#edebe9] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#0078d4] text-white flex items-center justify-center shadow-lg shadow-[#0078d4]/10">
                  {bulkActionModal?.type === 'sale' ? <Sparkles size={20} strokeWidth={2.5} /> : <ShoppingBag size={20} strokeWidth={2.5} />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#323130] tracking-tight leading-none">
                    {bulkActionModal?.type === 'sale' ? 'Process Sale Declaration' : 'Artwork Batch Workspace'}
                  </h2>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#f3f2f1] rounded-md border border-[#edebe9]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#107c10]"></span>
                      <span className="text-[10px] font-bold text-[#605e5c] uppercase tracking-wider">
                        {cartItemCount} Item{cartItemCount !== 1 ? 's' : ''} Selected
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-[#a19f9d] italic">
                      Ready for automated workflow
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="h-9 px-4 rounded-md bg-[#f3f2f1] text-[#323130] text-xs font-semibold hover:bg-[#edebe9] transition-all flex items-center gap-2 border border-[#edebe9]"
                >
                  <X size={14} />
                  <span>Close Workspace</span>
                </button>
              </div>
            </div>
            {bulkActionModal ? (
              <div className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                  <div className="space-y-4">
                    {!(bulkActionModal.type === 'framer' || bulkActionModal.type === 'return') && (
                      <p className="text-neutral-600 text-sm">
                        You are about to {bulkActionModal.type === 'delete' ? 'delete' : bulkActionModal.type}{' '}
                        <strong>{selectedArtworkIds.length}</strong> selected artworks.
                      </p>
                    )}

                    {bulkActionModal.type === 'sale' && (
                      <div className="space-y-6">
                        {/* Sale Info Section */}
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                              Client Name
                            </label>
                            <input
                              autoFocus
                              type="text"
                              value={bulkActionValue}
                              onChange={e => setBulkActionValue(e.target.value)}
                              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm"
                              placeholder="Enter client name..."
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                              Event / Auction (Optional)
                            </label>
                            <select
                              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-neutral-500/20 focus:border-neutral-500 transition-all"
                              value={bulkSaleEventId}
                              onChange={(e) => setBulkSaleEventId(e.target.value)}
                            >
                              <option value="">Direct Sale (No Event)</option>
                              {events?.filter(e => {
                                if (e.status === 'Recent' || e.status === 'Closed') return false;
                                if (e.isStrictDuration && e.endDate) {
                                  const end = new Date(e.endDate);
                                  end.setHours(23, 59, 59, 999);
                                  if (end.getTime() < Date.now()) return false;
                                }
                                return true;
                              }).map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                              Downpayment (Optional)
                            </label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">₱</span>
                              <input
                                type="text"
                                value={bulkDownpayment}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9.]/g, '');
                                  if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                                    setBulkDownpayment(val);
                                  }
                                }}
                                onBlur={() => {
                                  if (bulkDownpayment) {
                                    const num = parseFloat(bulkDownpayment);
                                    if (!isNaN(num)) {
                                      setBulkDownpayment(num.toFixed(2));
                                    }
                                  }
                                }}
                                className="w-full pl-8 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-neutral-500/20 focus:border-neutral-500 transition-all"
                                placeholder="0.00"
                              />
                            </div>
                            {bulkDownpayment && !isNaN(parseFloat(bulkDownpayment)) && parseFloat(bulkDownpayment) > 0 && (
                              <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-100 flex flex-col gap-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-neutral-500">Total Price:</span>
                                  <span className="font-bold text-neutral-900">
                                    ₱{cartArtworks.reduce((sum, art) => sum + (art.price || 0), 0).toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-neutral-500">Downpayment:</span>
                                  <span className="font-bold text-red-600">
                                    -₱{parseFloat(bulkDownpayment).toLocaleString()}
                                  </span>
                                </div>
                                <div className="h-px bg-red-200 my-1"></div>
                                <div className="flex justify-between text-sm font-bold">
                                  <span className="text-red-700">Remaining Balance:</span>
                                  <span className="text-red-700">
                                    ₱{(cartArtworks.reduce((sum, art) => sum + (art.price || 0), 0) - parseFloat(bulkDownpayment)).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          <label className="flex items-center space-x-2 p-3 bg-neutral-50 rounded-lg cursor-pointer">
                            <input
                              type="checkbox"
                              checked={bulkActionExtra}
                              onChange={e => setBulkActionExtra(e.target.checked)}
                              className="rounded text-neutral-900 focus:ring-neutral-500"
                            />
                            <span className="text-sm font-medium text-neutral-700">
                              Mark items as Delivered immediately?
                            </span>
                          </label>
                        </div>

                        {/* Attachments Section */}
                        <div className="pt-4 border-t border-neutral-100 space-y-4">
                          <label className="block text-xs font-bold text-neutral-500 uppercase">
                            Attachments (Required for Sale/Delivery)
                          </label>
                          <div className="flex p-1 bg-neutral-50 rounded-xl border border-neutral-200">
                            {(['itdr', 'rsa', 'orcr'] as const).map((tab) => (
                              <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveBulkAttachmentTab(tab)}
                                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${activeBulkAttachmentTab === tab
                                  ? 'bg-neutral-900 text-white shadow-sm'
                                  : 'text-neutral-400 hover:text-neutral-600'
                                  }`}
                              >
                                {tab === 'itdr' ? 'IT/DR' : tab === 'rsa' ? 'RSA/AR' : 'OR/CR'}
                              </button>
                            ))}
                          </div>

                          <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 border-dashed">
                            <label className={`block text-[10px] font-bold uppercase tracking-widest mb-2 ${((activeBulkAttachmentTab === 'itdr' && bulkActionExtra) || activeBulkAttachmentTab === 'rsa') ? 'text-red-600' : 'text-neutral-400'
                              }`}>
                              {activeBulkAttachmentTab === 'itdr' ? (bulkActionExtra ? 'IT/DR Document (Required for Delivery)' : 'IT/DR Document') : activeBulkAttachmentTab === 'rsa' ? 'RSA / AR Image (Required)' : 'OR / CR Image'}
                            </label>
                            <input
                              key={activeBulkAttachmentTab}
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;

                                const reader = new FileReader();
                                reader.onload = async (ev) => {
                                  const rawBase64 = ev.target?.result as string;
                                  const compressed = await compressBase64Image(rawBase64);

                                  if (activeBulkAttachmentTab === 'itdr') setBulkTempItdr(compressed);
                                  else if (activeBulkAttachmentTab === 'rsa') setBulkTempRsa(compressed);
                                  else if (activeBulkAttachmentTab === 'orcr') setBulkTempOrCr(compressed);
                                };
                                reader.readAsDataURL(file);
                              }}
                              className="block w-full text-xs text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-neutral-900 file:text-white hover:file:bg-neutral-800"
                            />

                            {((activeBulkAttachmentTab === 'itdr' ? bulkTempItdr : activeBulkAttachmentTab === 'rsa' ? bulkTempRsa : bulkTempOrCr)) ? (
                              <div className="relative mt-4 group">
                                <img
                                  src={Array.isArray(activeBulkAttachmentTab === 'itdr' ? bulkTempItdr : activeBulkAttachmentTab === 'rsa' ? bulkTempRsa : bulkTempOrCr)
                                    ? (activeBulkAttachmentTab === 'itdr' ? (bulkTempItdr as string[])[0] : activeBulkAttachmentTab === 'rsa' ? (bulkTempRsa as string[])[0] : (bulkTempOrCr as string[])[0])
                                    : (activeBulkAttachmentTab === 'itdr' ? bulkTempItdr as string : activeBulkAttachmentTab === 'rsa' ? bulkTempRsa as string : bulkTempOrCr as string)}
                                  alt="Preview"
                                  className="w-full h-48 object-contain bg-white rounded-xl border border-neutral-200"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (activeBulkAttachmentTab === 'itdr') setBulkTempItdr(null);
                                    else if (activeBulkAttachmentTab === 'rsa') setBulkTempRsa(null);
                                    else if (activeBulkAttachmentTab === 'orcr') setBulkTempOrCr(null);
                                  }}
                                  className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur shadow-sm rounded-full text-red-500 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ) : (
                              <div className="w-full h-48 flex flex-col items-center justify-center text-neutral-400 gap-2">
                                <Package size={24} className="opacity-20" />
                                <p className="text-[10px] font-medium uppercase tracking-widest">No Attachment</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {bulkActionModal.type === 'reserve' && (
                      <div className="space-y-4">
                        <div className="flex p-1 bg-neutral-100 rounded-xl">
                          <button
                            type="button"
                            onClick={() => setReservationTab('person')}
                            className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${reservationTab === 'person'
                              ? 'bg-white text-neutral-900 shadow-sm'
                              : 'text-neutral-500 hover:text-neutral-700'
                              }`}
                          >
                            Person
                          </button>
                          <button
                            type="button"
                            onClick={() => setReservationTab('event')}
                            className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${reservationTab === 'event'
                              ? 'bg-white text-neutral-900 shadow-sm'
                              : 'text-neutral-500 hover:text-neutral-700'
                              }`}
                          >
                            Event
                          </button>
                          <button
                            type="button"
                            onClick={() => setReservationTab('auction')}
                            className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${reservationTab === 'auction'
                              ? 'bg-white text-neutral-900 shadow-sm'
                              : 'text-neutral-500 hover:text-neutral-700'
                              }`}
                          >
                            Auction
                          </button>
                        </div>

                        {reservationTab === 'person' && (
                          <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                              Client Name
                            </label>
                            <input
                              autoFocus
                              type="text"
                              value={reservationClient}
                              onChange={e => setReservationClient(e.target.value)}
                              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm"
                              placeholder="Enter client name..."
                            />
                          </div>
                        )}

                        {reservationTab === 'event' && (
                          <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                              Select Event
                            </label>
                            <select
                              value={reservationEventId}
                              onChange={e => setReservationEventId(e.target.value)}
                              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm"
                            >
                              <option value="">Select an upcoming event...</option>
                              {events
                                ?.filter(e => e.status !== 'Recent' && (!e.type || e.type === 'Exhibition'))
                                .filter(e => {
                                  if (e.status === 'Closed') return false;
                                  if (e.isStrictDuration && e.endDate) {
                                    const end = new Date(e.endDate);
                                    end.setHours(23, 59, 59, 999);
                                    if (end.getTime() < Date.now()) return false;
                                  }
                                  return true;
                                })
                                .map(e => (
                                  <option key={e.id} value={e.id}>
                                    {e.title} ({e.status})
                                  </option>
                                ))}
                            </select>
                          </div>
                        )}

                        {reservationTab === 'auction' && (
                          <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                              Select Auction
                            </label>
                            <select
                              value={reservationAuctionId}
                              onChange={e => setReservationAuctionId(e.target.value)}
                              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm"
                            >
                              <option value="">Select an auction...</option>
                              {events
                                ?.filter(e => e.type === 'Auction' && e.status !== 'Recent')
                                .filter(e => {
                                  if (e.status === 'Closed') return false;
                                  if (e.isStrictDuration && e.endDate) {
                                    const end = new Date(e.endDate);
                                    end.setHours(23, 59, 59, 999);
                                    if (end.getTime() < Date.now()) return false;
                                  }
                                  return true;
                                })
                                .map(e => (
                                  <option key={e.id} value={e.id}>
                                    {e.title} ({e.status})
                                  </option>
                                ))}
                            </select>
                          </div>
                        )}

                        {reservationTab === 'person' && (
                          <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                              Duration
                            </label>
                            <div className="flex gap-2">
                              {(['Days', 'Hours', 'Minutes'] as const).map(u => {
                                const val = u === 'Days' ? reservationDays : u === 'Hours' ? reservationHours : reservationMinutes;
                                return (
                                  <div key={u} className="flex-1">
                                    <label className="block text-[10px] text-neutral-400 mb-0.5">{u}</label>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={val}
                                      onFocus={(e) => e.target.select()}
                                      onChange={e => {
                                        const raw = e.target.value.replace(/\D/g, '');
                                        const v = Math.max(0, parseInt(raw, 10) || 0);
                                        if (u === 'Days') setReservationDays(v);
                                        else if (u === 'Hours') setReservationHours(Math.min(23, v));
                                        else setReservationMinutes(Math.min(59, v));
                                      }}
                                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}


                        {reservationTab !== 'auction' && (
                          <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                              Additional Notes
                            </label>
                            <textarea
                              value={reservationDetails}
                              onChange={e => setReservationDetails(e.target.value)}
                              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm h-20 resize-none"
                              placeholder="Any additional details..."
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {bulkActionModal.type === 'framer' && (
                      <div className="space-y-6">
                        {/* Status Banner */}
                        <div className="bg-neutral-50 border border-neutral-100 rounded-[2rem] p-6 flex gap-5 transition-all">
                          <div className="shrink-0 w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center ring-1 ring-neutral-200 text-neutral-600">
                            <Wrench size={24} />
                          </div>
                          <div className="space-y-1.5 pt-0.5">
                            <h4 className="text-[13px] font-black uppercase tracking-wider text-neutral-900">Framing/Retouch</h4>
                            <p className="text-[11px] font-bold leading-relaxed text-neutral-500">
                              The artwork will be marked as "For Framing" and removed from available inventory. You can track its status in the "For Framing" tab in Operations.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">
                            Damage / Repair Details <span className="text-neutral-500 font-black">*</span>
                          </label>
                          <textarea
                            autoFocus
                            value={bulkFramerDamage}
                            onChange={e => setBulkFramerDamage(e.target.value)}
                            className="w-full px-6 py-5 bg-neutral-50 border-none rounded-[2rem] text-sm font-medium text-neutral-700 focus:ring-4 focus:ring-neutral-500/5 transition-all resize-none placeholder:text-neutral-300 min-h-[160px]"
                            placeholder="Describe the damage or required repairs..."
                          />
                        </div>

                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">
                            Attach IT/DR <span className="text-neutral-400 font-bold lowercase italic">(Optional)</span>
                          </label>
                          <div className="relative group">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = async (ev) => {
                                  const rawBase64 = ev.target?.result as string;
                                  const compressed = await compressBase64Image(rawBase64);
                                  setBulkTempItdr(compressed);
                                };
                                reader.readAsDataURL(file);
                              }}
                              className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            />
                            <div className="w-full py-10 bg-white border-2 border-neutral-100 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-4 group-hover:bg-neutral-50 transition-all">
                              {bulkTempItdr ? (
                                <div className="relative w-full px-6">
                                  <img src={Array.isArray(bulkTempItdr) ? bulkTempItdr[0] : bulkTempItdr as string} alt="Preview" className="w-full h-32 object-contain rounded-xl" />
                                  <button onClick={() => setBulkTempItdr(null)} className="absolute top-0 right-8 p-1.5 bg-rose-500 text-white rounded-full">
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="w-14 h-14 bg-neutral-50 rounded-2xl flex items-center justify-center text-neutral-400 group-hover:scale-110 transition-transform shadow-inner">
                                    <Upload size={24} />
                                  </div>
                                  <div className="text-center">
                                    <p className="text-[13px] font-black text-neutral-900 mb-0.5">Upload Document</p>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-center gap-8 pt-4">
                          <button
                            type="button"
                            onClick={handleCloseBulkModal}
                            className="text-[13px] font-black text-neutral-500 hover:text-neutral-900 transition-colors uppercase tracking-[0.2em]"
                          >
                            Back to Cart
                          </button>
                          <button
                            type="button"
                            onClick={handleBulkActionSubmit}
                            disabled={!bulkFramerDamage.trim()}
                            className="px-10 py-5 bg-neutral-900 text-white text-[13px] font-black uppercase tracking-[0.2em] rounded-[2rem] shadow-xl shadow-neutral-200 hover:shadow-2xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Send to Framer
                          </button>
                        </div>
                      </div>
                    )}

                    {bulkActionModal.type === 'return' && (
                      <div className="space-y-8">
                        {/* Return Type Selection */}
                        <div className="bg-neutral-100/50 p-2 rounded-[2rem] flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setBulkReturnType('Artist Reclaim')}
                            className={`flex-1 py-4 px-6 rounded-[1.8rem] text-[11px] font-black uppercase tracking-widest transition-all ${bulkReturnType === 'Artist Reclaim' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
                          >
                            Return (Void)
                          </button>
                          <button
                            type="button"
                            onClick={() => setBulkReturnType('For Retouch')}
                            className={`flex-1 py-4 px-6 rounded-[1.8rem] text-[11px] font-black uppercase tracking-widest transition-all ${bulkReturnType === 'For Retouch' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
                          >
                            For Retouch
                          </button>
                        </div>

                        {/* Status Banner */}
                        {bulkReturnType === 'Artist Reclaim' ? (
                          <div className="bg-white border border-neutral-100 rounded-[2rem] p-6 flex gap-5 transition-all shadow-sm">
                            <div className="shrink-0 w-12 h-12 bg-neutral-50 rounded-2xl flex items-center justify-center text-rose-500">
                              <AlertTriangle size={24} />
                            </div>
                            <div className="space-y-1.5 pt-0.5">
                              <h4 className="text-[13px] font-black uppercase tracking-wider text-rose-900">Permanent Return (Void)</h4>
                              <p className="text-[11px] font-bold leading-relaxed text-neutral-500">
                                This action is a VOID. The artwork will be permanently removed from inventory. Audit trail and data will be preserved. IT/DR attachment is REQUIRED.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-white border border-neutral-100 rounded-[2rem] p-6 flex gap-5 transition-all shadow-sm">
                            <div className="shrink-0 w-12 h-12 bg-neutral-50 rounded-2xl flex items-center justify-center text-neutral-400">
                              <RotateCcw size={24} />
                            </div>
                            <div className="space-y-1.5 pt-0.5">
                              <h4 className="text-[13px] font-black uppercase tracking-wider text-neutral-900">Temporary Status Change</h4>
                              <p className="text-[11px] font-bold leading-relaxed text-neutral-500">
                                The artwork status will change to "For Retouch". It remains in the inventory but is marked as unavailable. You can return it to the branch later.
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                          {/* Column 1: Details */}
                          <div className="space-y-6">
                            <div className="space-y-3">
                              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">
                                Reason for Return <span className="text-neutral-500 font-black">*</span>
                              </label>
                              <div className="relative">
                                <textarea
                                  value={bulkReturnReason}
                                  onChange={e => setBulkReturnReason(e.target.value)}
                                  className="w-full px-5 py-4 bg-neutral-50 border-none rounded-[1.5rem] text-sm font-medium text-neutral-700 min-h-[140px] resize-none placeholder:text-neutral-300"
                                  placeholder="Describe the reason for return (e.g., Artist request, Contract expiration, Damaged...)"
                                />
                                <div className="absolute bottom-4 right-4 text-[9px] font-bold text-neutral-300 uppercase tracking-widest">
                                  {bulkReturnReason.length} chars
                                </div>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">
                                Additional Notes
                              </label>
                              <input
                                type="text"
                                value={bulkReturnNotes}
                                onChange={e => setBulkReturnNotes(e.target.value)}
                                className="w-full px-5 py-4 bg-neutral-50 border-none rounded-[1.5rem] text-sm font-medium text-neutral-700 placeholder:text-neutral-300"
                                placeholder="Any internal remarks or instructions..."
                              />
                            </div>
                          </div>

                          {/* Column 2: Logistics */}
                          <div className="space-y-6">
                            <div className="space-y-3">
                              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">
                                IT / DR Reference No.
                              </label>
                              <div className="relative group">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400">
                                  <ClipboardCheck size={18} />
                                </div>
                                <input
                                  type="text"
                                  value={bulkReturnRef}
                                  onChange={e => setBulkReturnRef(e.target.value)}
                                  className="w-full pl-12 pr-5 py-4 bg-neutral-50 border-none rounded-[1.5rem] text-sm font-black text-neutral-400 placeholder:text-neutral-300 tracking-wider uppercase"
                                  placeholder="IT-2024-001"
                                />
                              </div>
                            </div>

                            <div className="space-y-3">
                              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">
                                Proof of Return (IT/DR) <span className="text-neutral-500 font-black">*</span>
                              </label>
                              <div className="relative group">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = async (ev) => {
                                      const rawBase64 = ev.target?.result as string;
                                      const compressed = await compressBase64Image(rawBase64);
                                      setBulkTempItdr(compressed);
                                    };
                                    reader.readAsDataURL(file);
                                  }}
                                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                />
                                <div className="w-full py-8 bg-white border-2 border-neutral-100 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-3 group-hover:bg-neutral-50 transition-all">
                                  {bulkTempItdr ? (
                                    <div className="relative w-full px-4">
                                      <img src={Array.isArray(bulkTempItdr) ? bulkTempItdr[0] : bulkTempItdr as string} alt="Preview" className="w-full h-24 object-contain rounded-xl" />
                                      <button onClick={() => setBulkTempItdr(null)} className="absolute top-0 right-4 p-1 bg-rose-500 text-white rounded-full">
                                        <X size={10} />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="w-12 h-12 bg-neutral-50 rounded-2xl flex items-center justify-center text-neutral-400 group-hover:scale-110 transition-transform shadow-inner">
                                        <Upload size={20} />
                                      </div>
                                      <div className="text-center">
                                        <p className="text-[12px] font-black text-neutral-900 mb-0.5">Upload Proof</p>
                                        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">JPG OR PNG</p>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-center gap-10 pt-4">
                          <button
                            type="button"
                            onClick={handleCloseBulkModal}
                            className="text-[14px] font-black text-neutral-500 hover:text-neutral-900 transition-colors uppercase tracking-[0.2em]"
                          >
                            Back to Cart
                          </button>
                          <button
                            type="button"
                            onClick={handleBulkActionSubmit}
                            disabled={!bulkReturnReason.trim() || (bulkReturnType === 'Artist Reclaim' && !bulkTempItdr)}
                            className="px-10 py-5 bg-neutral-400 text-white text-[14px] font-black rounded-[2rem] shadow-xl shadow-neutral-200 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                          >
                            <span>{bulkReturnType === 'Artist Reclaim' ? 'Confirm Void' : 'Mark For Retouch'}</span>
                            <span className="w-px h-4 bg-white/30" />
                            <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                          </button>
                        </div>
                      </div>
                    )}

                    {bulkActionModal.type === 'transfer' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                            Destination Branch
                          </label>
                          <select
                            value={bulkActionValue}
                            onChange={e => setBulkActionValue(e.target.value)}
                            className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm"
                          >
                            <option value="">Select Branch...</option>
                            {branches.map(b => (
                              <option key={b} value={b}>
                                {b}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Attachments Section for Transfer */}
                        <div className="pt-4 border-t border-neutral-100 space-y-4">
                          <label className="block text-xs font-bold text-neutral-500 uppercase">
                            Attachments (Required for Transfer)
                          </label>
                          <div className="flex p-1 bg-neutral-50 rounded-xl border border-neutral-200">
                            {(['itdr', 'rsa', 'orcr'] as const).map((tab) => (
                              <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveBulkAttachmentTab(tab)}
                                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${activeBulkAttachmentTab === tab
                                  ? 'bg-neutral-900 text-white shadow-sm'
                                  : 'text-neutral-400 hover:text-neutral-600'
                                  }`}
                              >
                                {tab === 'itdr' ? 'IT/DR' : tab === 'rsa' ? 'RSA/AR' : 'OR/CR'}
                              </button>
                            ))}
                          </div>

                          <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 border-dashed">
                            <label className={`block text-[10px] font-bold uppercase tracking-widest mb-2 ${activeBulkAttachmentTab === 'itdr' ? 'text-red-600' : 'text-neutral-400'}`}>
                              {activeBulkAttachmentTab === 'itdr' ? 'IT/DR Document (Required)' : activeBulkAttachmentTab === 'rsa' ? 'RSA / AR Image' : 'OR / CR Image'}
                            </label>
                            <input
                              key={activeBulkAttachmentTab}
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;

                                const reader = new FileReader();
                                reader.onload = async (ev) => {
                                  const rawBase64 = ev.target?.result as string;
                                  const compressed = await compressBase64Image(rawBase64);

                                  if (activeBulkAttachmentTab === 'itdr') setBulkTempItdr(compressed);
                                  else if (activeBulkAttachmentTab === 'rsa') setBulkTempRsa(compressed);
                                  else if (activeBulkAttachmentTab === 'orcr') setBulkTempOrCr(compressed);
                                };
                                reader.readAsDataURL(file);
                              }}
                              className="block w-full text-xs text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-neutral-900 file:text-white hover:file:bg-neutral-800"
                            />

                            {((activeBulkAttachmentTab === 'itdr' ? bulkTempItdr : activeBulkAttachmentTab === 'rsa' ? bulkTempRsa : bulkTempOrCr)) ? (
                              <div className="relative mt-4 group">
                                <img
                                  src={Array.isArray(activeBulkAttachmentTab === 'itdr' ? bulkTempItdr : activeBulkAttachmentTab === 'rsa' ? bulkTempRsa : bulkTempOrCr)
                                    ? (activeBulkAttachmentTab === 'itdr' ? (bulkTempItdr as string[])[0] : activeBulkAttachmentTab === 'rsa' ? (bulkTempRsa as string[])[0] : (bulkTempOrCr as string[])[0])
                                    : (activeBulkAttachmentTab === 'itdr' ? bulkTempItdr as string : activeBulkAttachmentTab === 'rsa' ? bulkTempRsa as string : bulkTempOrCr as string)}
                                  alt="Preview"
                                  className="w-full h-48 object-contain bg-white rounded-xl border border-neutral-200"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (activeBulkAttachmentTab === 'itdr') setBulkTempItdr(null);
                                    else if (activeBulkAttachmentTab === 'rsa') setBulkTempRsa(null);
                                    else if (activeBulkAttachmentTab === 'orcr') setBulkTempOrCr(null);
                                  }}
                                  className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur shadow-sm rounded-full text-red-500 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ) : (
                              <div className="mt-4 w-full h-48 bg-white rounded-xl border border-neutral-200 border-dashed flex flex-col items-center justify-center text-neutral-400">
                                <Plus size={24} className="mb-2" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">
                                  Click to attach image
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {bulkActionModal.type === 'delete' && (
                      <div className="p-4 bg-neutral-50 text-neutral-700 rounded-lg text-sm flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p>
                          This action cannot be undone. The selected artworks will be permanently
                          removed from this branch inventory.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className={`px-6 py-4 border-t border-neutral-200 gap-3 bg-neutral-50 ${bulkActionModal.type === 'sale' ? 'flex justify-end' : 'flex items-center justify-between'}`}>
                  <div className={`text-[11px] text-neutral-500 ${bulkActionModal.type === 'sale' ? 'hidden' : ''}`}>
                    <span>
                      Confirm{' '}
                      {bulkActionModal.type === 'sale'
                        ? 'sale'
                        : bulkActionModal.type === 'reserve'
                          ? 'reservation'
                          : bulkActionModal.type === 'transfer'
                            ? 'transfer'
                            : bulkActionModal.type === 'framer'
                              ? 'framing'
                              : bulkActionModal.type === 'return'
                                ? 'return'
                                : 'deletion'}{' '}
                      for all items in the cart.
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleCloseBulkModal}
                      className={bulkActionModal.type === 'sale'
                        ? 'px-6 py-2.5 rounded-md text-neutral-600 font-bold hover:bg-neutral-100 transition-all transform hover:-translate-y-0.5'
                        : 'px-6 py-2.5 rounded-xl text-xs font-bold text-neutral-600 border border-neutral-300 hover:bg-neutral-50 hover:border-neutral-400 transition-all uppercase tracking-wide'}
                    >
                      {bulkActionModal.type === 'sale' ? 'Cancel' : 'Back to Cart'}
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkActionSubmit}
                      disabled={
                        bulkActionModal.type === 'delete' ? false :
                          bulkActionModal.type === 'reserve' ? (
                            reservationTab === 'person' ? !reservationClient :
                              reservationTab === 'event' ? !reservationEventId :
                                !reservationAuctionId
                          ) :
                            bulkActionModal.type === 'sale' ? (
                              !bulkActionValue || !bulkClientContact || (bulkActionExtra ? (!bulkTempItdr || !bulkTempRsa) : !bulkTempRsa)
                            ) :
                              bulkActionModal.type === 'transfer' ? (!bulkActionValue || !bulkTempItdr) :
                                bulkActionModal.type === 'framer' ? !bulkFramerDamage :
                                  bulkActionModal.type === 'return' ? !bulkReturnReason :
                                    !bulkActionValue
                      }
                      className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.1em] shadow-lg transition-all ${(bulkActionModal.type === 'delete' ? false :
                        bulkActionModal.type === 'reserve' ? (
                          reservationTab === 'person' ? !reservationClient :
                            reservationTab === 'event' ? !reservationEventId :
                              !reservationAuctionId
                        ) :
                          bulkActionModal.type === 'sale' ? (
                            !bulkActionValue ||
                            !bulkClientContact ||
                            (bulkActionExtra ? (!bulkTempItdr || !bulkTempRsa) : !bulkTempRsa)
                          ) :
                            bulkActionModal.type === 'transfer' ? (!bulkActionValue || !bulkTempItdr) :
                              !bulkActionValue)
                        ? 'bg-neutral-200 text-neutral-400 border border-neutral-200 cursor-not-allowed shadow-none'
                        : bulkActionModal.type === 'sale'
                          ? 'bg-neutral-900 text-white hover:bg-black shadow-neutral-200 hover:shadow-neutral-300 hover:-translate-y-0.5 rounded-md'
                          : 'bg-neutral-900 text-white hover:bg-black shadow-neutral-900/30 hover:shadow-neutral-900/50 hover:-translate-y-0.5'
                        } disabled:opacity-100 disabled:cursor-not-allowed`}
                    >
                      Confirm{' '}
                      {bulkActionModal.type === 'sale'
                        ? 'Sale'
                        : bulkActionModal.type === 'delete'
                          ? 'Delete'
                          : bulkActionModal.type === 'reserve'
                            ? 'Reservation'
                            : bulkActionModal.type === 'framer'
                              ? 'Framing'
                              : bulkActionModal.type === 'return'
                                ? 'Return'
                                : 'Action'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Artworks List — Top Section (scrollable) */}
                <div className="custom-scrollbar flex-1 overflow-y-auto bg-[linear-gradient(180deg,#ffffff_0%,#f9fbfd_100%)] px-10 py-6">
                  {cartArtworks.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 max-w-full mx-auto">
                      {cartArtworks.map((art, idx) => (
                        <div
                          key={art.id}
                          className="group relative flex items-center rounded-xl border border-[#dfe3e8] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_10px_24px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#0078d4]/40 hover:shadow-[0_18px_32px_rgba(0,120,212,0.10)]"
                        >
                          <div className="absolute left-0 top-6 bottom-6 w-1 bg-[#0078d4] opacity-0 transition-all duration-300 group-hover:opacity-100" />

                          <div className="flex items-center gap-5 flex-1 min-w-0">
                            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-[#dfe3e8] bg-[#f8f9fa] shadow-[0_6px_16px_rgba(0,0,0,0.05)] transition-transform duration-500 group-hover:scale-[1.03]">
                              {art.imageUrl ? (
                                <OptimizedImage
                                  src={art.imageUrl || undefined}
                                  alt={art.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[#c8c6c4]">
                                  <ImageIcon size={28} />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2.5 mb-1.5">
                                <span className="rounded-md border border-[#deecf9] bg-[#eff6fc] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-[#0078d4]">
                                  ASSET-{String(idx + 1).padStart(2, '0')}
                                </span>
                                <span className="text-[9px] font-black text-[#a19f9d] uppercase tracking-[0.25em] truncate">
                                  {art.code}
                                </span>
                              </div>
                              <h4 className="truncate text-base font-black leading-none tracking-[-0.03em] text-[#323130]">
                                {art.title}
                              </h4>
                              <div className="flex items-center gap-3 mt-2 text-[11px] text-[#605e5c] font-bold">
                                <span className="text-black">{art.artist}</span>
                                <span className="w-1 h-1 rounded-full bg-[#c8c6c4]" />
                                <span className="truncate opacity-60 uppercase font-black text-[8px]">{art.medium}</span>
                                {art.currentBranch && (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-[#c8c6c4]" />
                                    <div className="flex items-center gap-1 text-[#0078d4]">
                                      <MapPin size={11} />
                                      <span className="truncate">{art.currentBranch}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="ml-6 flex shrink-0 items-center gap-6 border-l border-[#edebe9] pl-6 text-right">
                            <div>
                              <p className="text-[9px] font-black text-[#a19f9d] uppercase tracking-[0.25em] mb-1">Valuation</p>
                              <p className="text-lg font-black text-[#323130] tracking-tight">
                                ₱{(art.price || 0).toLocaleString()}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedArtworkIds(prev => prev.filter(id => id !== art.id))}
                              className="group/trash flex h-10 w-10 items-center justify-center rounded-lg border border-[#edebe9] bg-white text-[#a4262c] transition-all hover:border-rose-200 hover:bg-rose-50 hover:shadow-[0_8px_18px_rgba(164,38,44,0.10)]"
                              title="Remove item"
                            >
                              <Trash2 size={20} className="group-hover/trash:scale-110 transition-transform" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-6 text-[#a19f9d]">
                      <div className="flex h-24 w-24 items-center justify-center rounded-[20px] border border-[#edebe9] bg-[#f8f9fa] shadow-inner">
                        <ShoppingBag size={40} className="text-[#c8c6c4]" />
                      </div>
                      <div className="text-center space-y-1.5">
                        <p className="text-xl font-black text-[#323130] tracking-tight">Workspace Entry Vacant</p>
                        <p className="text-xs font-bold text-[#a19f9d] uppercase tracking-widest">Select items from branch inventory</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Section — Summary + Actions */}
                <div className="shrink-0 border-t border-[#edebe9] bg-[linear-gradient(180deg,#fbfcfe_0%,#f5f7fa_100%)]">
                  <div className="custom-scrollbar overflow-y-auto max-h-[50vh] px-10 py-8">
                    {/* Inline Summary Stats */}
                    <div className="flex items-center gap-6 mb-8">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#edebe9] bg-white text-[#0078d4] shadow-[0_4px_10px_rgba(0,0,0,0.04)]">
                          <Sparkles size={16} />
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-[#323130] tracking-tighter">{cartItemCount}</span>
                          <span className="text-[10px] font-black text-[#a19f9d] uppercase tracking-widest">Units</span>
                        </div>
                      </div>
                      <div className="w-px h-8 bg-[#edebe9]" />
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-[#323130]">₱{(cartTotalValue / 1000).toFixed(1)}k</span>
                        <span className="rounded-md bg-green-50 px-2 py-0.5 text-[10px] font-black uppercase text-[#107c10]">Live</span>
                      </div>
                      <div className="w-px h-8 bg-[#edebe9]" />
                      <span className="flex items-center gap-1.5 rounded-md bg-[#0f172a] px-3 py-1 text-[9px] font-black text-white">
                        <CheckCircle2 size={11} strokeWidth={3} /> VERIFIED
                      </span>
                      <div className="flex-1" />
                      <button
                        type="button"
                        onClick={() => setIsCartOpen(false)}
                        className="group flex items-center gap-2 rounded-xl bg-[#0f172a] px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-[0_10px_20px_rgba(15,23,42,0.16)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <span>Dismiss</span>
                        <X size={14} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
                      </button>
                    </div>

                    {/* Operations Grid */}
                    <div className="flex items-center gap-4 mb-5">
                      <h3 className="text-[9px] font-black text-[#a19f9d] uppercase tracking-[0.25em] shrink-0">Operations</h3>
                      <div className="h-px w-full bg-[#edebe9]"></div>
                    </div>

                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                      {!(activeBranch && exclusiveBranches?.includes(activeBranch)) && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleBulkActionClick('sale')}
                            disabled={permissions ? !permissions.canSellArtwork : !canEdit}
                            className="group flex items-center gap-4 rounded-xl bg-[linear-gradient(135deg,#3d7edb_0%,#2665bf_100%)] p-4 text-white shadow-[0_12px_24px_rgba(0,120,212,0.20)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_32px_rgba(0,120,212,0.28)] disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/18 shrink-0">
                              <ShoppingBag size={20} />
                            </div>
                            <div className="text-left min-w-0">
                              <p className="text-sm font-black tracking-tight leading-none uppercase">Sale</p>
                              <p className="text-[8px] font-bold uppercase tracking-widest opacity-60 mt-1">Transaction</p>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleBulkActionClick('reserve')}
                            disabled={permissions ? !permissions.canReserveArtwork : !canEdit}
                            className="group flex items-center gap-4 rounded-xl border border-[#e3e7eb] bg-white p-4 text-[#323130] shadow-[0_8px_18px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#0078d4]/35 hover:shadow-[0_14px_28px_rgba(0,120,212,0.08)] disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#edebe9] bg-[#f3f2f1] text-[#0078d4] shrink-0">
                              <Clock size={20} />
                            </div>
                            <div className="text-left min-w-0">
                              <p className="text-sm font-black tracking-tight leading-none">Reserve</p>
                              <p className="text-[8px] font-bold uppercase tracking-widest text-[#a19f9d] mt-1">Hold Asset</p>
                            </div>
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => handleBulkActionClick('transfer')}
                        disabled={permissions ? !permissions.canTransferArtwork : !canEdit}
                        className="group flex items-center gap-4 rounded-xl border border-[#e3e7eb] bg-white p-4 text-[#323130] shadow-[0_8px_18px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#0078d4]/35 hover:shadow-[0_14px_28px_rgba(0,120,212,0.08)] disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#edebe9] bg-[#f3f2f1] text-[#0078d4] shrink-0">
                          <ArrowRightLeft size={20} />
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-sm font-black tracking-tight leading-none">Transfer</p>
                          <p className="text-[8px] font-bold uppercase tracking-widest text-[#a19f9d] mt-1">Branch Route</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleBulkActionClick('framer')}
                        disabled={permissions ? !permissions.canEditArtwork : !canEdit}
                        className="group flex items-center gap-4 rounded-xl border border-[#e3e7eb] bg-white p-4 text-[#323130] shadow-[0_8px_18px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-0.5 hover:border-[#0078d4]/35 hover:shadow-[0_14px_28px_rgba(0,120,212,0.08)] disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#edebe9] bg-[#f3f2f1] text-[#0078d4] shrink-0">
                          <Frame size={20} className="group-hover:rotate-12 transition-transform" />
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-sm font-black tracking-tight leading-none">Framing</p>
                          <p className="text-[8px] font-bold uppercase tracking-widest text-[#a19f9d] mt-1">Repair</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleBulkActionClick('return')}
                        disabled={permissions ? !permissions.canEditArtwork : !canEdit}
                        className="group flex items-center gap-4 rounded-xl border border-[#e3e7eb] bg-white p-4 text-[#323130] shadow-[0_8px_18px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-0.5 hover:border-[#0078d4]/35 hover:shadow-[0_14px_28px_rgba(0,120,212,0.08)] disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#edebe9] bg-[#f3f2f1] text-[#0078d4] shrink-0">
                          <RotateCcw size={20} className="group-hover:rotate-[-12deg] transition-transform" />
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-sm font-black tracking-tight leading-none">Voiding</p>
                          <p className="text-[8px] font-bold uppercase tracking-widest text-[#a19f9d] mt-1">Return</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleBulkActionClick('delete')}
                        disabled={permissions ? !permissions.canDeleteArtwork : !canEdit}
                        className="group flex items-center gap-4 rounded-xl border border-rose-100 bg-white p-4 text-rose-400 shadow-[0_8px_18px_rgba(0,0,0,0.02)] transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-20 disabled:cursor-not-allowed"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-400 shrink-0 group-hover:text-rose-600">
                          <Trash2 size={20} />
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-sm font-black tracking-tight leading-none">Purge</p>
                          <p className="text-[8px] font-bold uppercase tracking-widest mt-1 opacity-60">Delete</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Bulk Action Modal */}
      {bulkActionModal && (
        <BulkActionModal
          bulkActionModal={bulkActionModal}
          onClose={() => {
            setBulkActionModal(null);
            setBulkTempItdr(null);
            setBulkTempRsa(null);
            setBulkTempOrCr(null);
            setActiveBulkAttachmentTab('itdr');
          }}
          selectedIds={selectedArtworkIds}
          setSelectedIds={setSelectedArtworkIds}
          artworks={permittedArtworks}
          bulkActionValue={bulkActionValue}
          setBulkActionValue={setBulkActionValue}
          bulkClientEmail={bulkClientEmail}
          setBulkClientEmail={setBulkClientEmail}
          bulkClientContact={bulkClientContact}
          setBulkClientContact={setBulkClientContact}
          bulkDownpayment={bulkDownpayment}
          setBulkDownpayment={setBulkDownpayment}
          bulkSaleDownpayments={bulkSaleDownpayments}
          setBulkSaleDownpayments={setBulkSaleDownpayments}
          bulkSaleInstallmentsEnabled={bulkSaleInstallmentsEnabled}
          setBulkSaleInstallmentsEnabled={setBulkSaleInstallmentsEnabled}
          bulkActionExtra={bulkActionExtra}
          setBulkActionExtra={setBulkActionExtra}
          bulkSaleEventId={bulkSaleEventId}
          setBulkSaleEventId={setBulkSaleEventId}
          events={events || []}
          branches={branches}
          activeBulkAttachmentTab={activeBulkAttachmentTab}
          setActiveBulkAttachmentTab={setActiveBulkAttachmentTab}
          bulkTempItdr={bulkTempItdr}
          setBulkTempItdr={setBulkTempItdr}
          bulkTempRsa={bulkTempRsa}
          setBulkTempRsa={setBulkTempRsa}
          bulkTempOrcr={bulkTempOrCr}
          setBulkTempOrcr={setBulkTempOrCr}
          reservationTab={reservationTab}
          setReservationTab={setReservationTab}
          reservationClient={reservationClient}
          setReservationClient={setReservationClient}
          reservationEventName={reservationEventId}
          setReservationEventName={setReservationEventId}
          reservationAuctionId={reservationAuctionId}
          setReservationAuctionId={setReservationAuctionId}
          reservationDays={reservationDays}
          setReservationDays={setReservationDays}
          reservationHours={reservationHours}
          setReservationHours={setReservationHours}
          reservationMinutes={reservationMinutes}
          setReservationMinutes={setReservationMinutes}
          reservationNotes={reservationDetails}
          setReservationNotes={setReservationDetails}
          framerDamageDetails={bulkFramerDamage}
          setFramerDamageDetails={setBulkFramerDamage}
          returnType={bulkReturnType}
          setReturnType={setBulkReturnType}
          returnReason={bulkReturnReason}
          setReturnReason={setBulkReturnReason}
          returnProofImage={bulkTempItdr}
          setReturnProofImage={(val) => {
            setBulkTempItdr(Array.isArray(val) ? val : ((val as string) || null));

          }}
          onSubmit={handleBulkActionSubmit}
        />
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && createPortal(
        <>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 border border-neutral-200/80">
              <div className="px-6 py-4 bg-neutral-900 text-white flex justify-between items-center">
                <h3 className="font-bold text-sm tracking-[0.18em] uppercase">
                  {editingBranch ? 'Edit Branch' : 'Add New Branch'}
                </h3>
                <button onClick={handleClose} className="text-white/80 hover:text-white">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {!editingBranch && (
                  <div className="flex border-b border-neutral-200 mb-4">
                    <button
                      type="button"
                      onClick={() => setIsExclusive(false)}
                      className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${!isExclusive ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-400 hover:text-neutral-600'}`}
                    >
                      Standard Branch
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsExclusive(true)}
                      className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${isExclusive ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-400 hover:text-neutral-600'}`}
                    >
                      Exclusive
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">Branch Name</label>
                  <input
                    type="text"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="e.g., North Wing Gallery"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">Address</label>
                  <input
                    type="text"
                    value={branchAddress}
                    onChange={(e) => setBranchAddress(e.target.value)}
                    placeholder="e.g., 123 Art Street, Makati City"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">Category</label>
                  <input
                    type="text"
                    value={branchCategory}
                    onChange={(e) => setBranchCategory(e.target.value)}
                    placeholder="Type a category..."
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">Branch Logo</label>
                  <div className="relative group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = async (ev) => {
                          const rawBase64 = ev.target?.result as string;
                          const compressed = await compressBase64Image(rawBase64, 512, 200 * 1024); // Smaller for logos
                          setBranchLogo(compressed);
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-full py-6 bg-neutral-50 border-2 border-neutral-200 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 group-hover:bg-neutral-100 transition-all">
                      {branchLogo ? (
                        <div className="relative">
                          <img src={branchLogo} alt="Logo Preview" className="h-16 w-16 object-contain rounded-lg" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setBranchLogo(null);
                            }}
                            className="absolute -top-2 -right-2 p-1 bg-rose-500 text-white rounded-full shadow-sm hover:bg-rose-600 transition-colors"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload size={20} className="text-neutral-400" />
                          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider text-center px-4">
                            Upload Logo (PNG/JPG)
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex space-x-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-3 bg-white border border-neutral-200 text-neutral-700 font-bold rounded-xl hover:bg-neutral-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!canEdit || !branchName.trim()}
                    className="flex-1 px-4 py-3 bg-neutral-900 text-white font-bold rounded-xl hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingBranch ? 'Save Changes' : 'Create Branch'}
                  </button>
                </div>
              </form>
            </div>
          </div>
          <LoadingOverlay
            isVisible={isSyncing}
            title={processMessage}
            progress={{ current: syncProgress, total: 100 }}
          />
        </>,
        document.body
      )}
    </div>
  );
};

export default BranchManagement;
