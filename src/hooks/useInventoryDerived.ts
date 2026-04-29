import { useMemo } from 'react';
import { Artwork, ArtworkStatus, SaleRecord, UserPermissions } from '../types';
import { BRANCH_CATEGORIES } from '../constants';

interface UseInventoryDerivedParams {
  artworks: Artwork[];
  branches: string[];
  branchCategories: Record<string, string>;
  permissions?: UserPermissions;
  searchTerm: string;
  statusFilter: string;
  branchFilter: string;
  sheetFilter: string;
  dateMonthFilter: string;
  dateYearFilter: string;
  artistFilter: string;
  mediumFilter: string;
  sizeFilter: string;
  priceRange: [number, number];
  sales: SaleRecord[];
  metricModal: { type: 'TOTAL' | 'RESERVED' | 'SOLD' | 'REVENUE'; title: string } | null;
  visibleCount: number;
}

export const useInventoryDerived = ({
  artworks,
  branches,
  branchCategories,
  permissions,
  searchTerm,
  statusFilter,
  branchFilter,
  sheetFilter,
  dateMonthFilter,
  dateYearFilter,
  artistFilter,
  mediumFilter,
  sizeFilter,
  priceRange,
  sales,
  metricModal,
  visibleCount
}: UseInventoryDerivedParams) => {
  const activeCategories = useMemo(() => {
    const categoriesInUse = new Set<string>();
    branches.forEach(branch => {
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
      categoriesInUse.add(category);
    });

    const combined = [...BRANCH_CATEGORIES];
    Array.from(categoriesInUse).forEach(cat => {
      if (!combined.includes(cat)) combined.push(cat);
    });

    return combined.filter(cat => Array.from(categoriesInUse).includes(cat)).sort((a, b) => {
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      const idxA = BRANCH_CATEGORIES.indexOf(a);
      const idxB = BRANCH_CATEGORIES.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [branches, branchCategories]);

  const priceStats = useMemo(() => {
    const prices = artworks.map(a => a.price || 0);
    if (prices.length === 0) return { min: 0, max: 100000, avg: 0 };
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const sum = prices.reduce((a, b) => a + b, 0);
    return { min, max, avg: Math.round(sum / prices.length) };
  }, [artworks]);

  const availableSheets = useMemo(() => {
    const sheets = new Set(artworks.map(a => a.sheetName).filter(Boolean));
    return Array.from(sheets).sort() as string[];
  }, [artworks]);

  const availableArtists = useMemo(() => {
    const artists = new Set(artworks.map(a => a.artist).filter(Boolean));
    return Array.from(artists).sort();
  }, [artworks]);

  const availableMediums = useMemo(() => {
    const mediums = new Set(artworks.map(a => a.medium).filter(Boolean));
    return Array.from(mediums).sort();
  }, [artworks]);

  const getArtYearMonth = (art: Artwork): { y: number; m: number } => {
    if ((art.status === 'Sold' || art.status === 'Delivered') && sales) {
      const sale = sales.find(s => s.artworkId === art.id);
      if (sale && sale.saleDate) {
        const d = new Date(sale.saleDate);
        if (!isNaN(d.getTime())) {
          return { y: d.getFullYear(), m: d.getMonth() + 1 };
        }
      }
    }

    if (art.importPeriod) {
      const parts = art.importPeriod.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      return { y, m };
    }

    if (art.year) {
      const yearDateMatch = String(art.year).match(/^(\d{4})[-\/](\d{1,2})/);
      if (yearDateMatch) {
        return { y: parseInt(yearDateMatch[1], 10), m: parseInt(yearDateMatch[2], 10) };
      }

      const yearOnlyMatch = String(art.year).match(/^(\d{4})$/);
      if (yearOnlyMatch) {
        return { y: parseInt(yearOnlyMatch[1], 10), m: 1 };
      }
    }

    const base = art.createdAt || '';
    const dateMatch = base.match(/^(\d{4})[-\/](\d{1,2})/);
    if (dateMatch) {
      return { y: parseInt(dateMatch[1], 10), m: parseInt(dateMatch[2], 10) };
    }

    const d = new Date(base);
    if (!isNaN(d.getTime())) {
      return { y: d.getFullYear(), m: d.getMonth() + 1 };
    }

    const yonly = base.match(/^(\d{4})$/);
    if (yonly) return { y: parseInt(yonly[1], 10), m: 1 };

    return { y: new Date().getFullYear(), m: new Date().getMonth() + 1 };
  };

  const filteredArtworks = useMemo(() => {
    const filtered = artworks.filter(art => {
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

      const term = (searchTerm || '').toLowerCase();
      const matchesSearch =
        (art.title || '').toLowerCase().includes(term) ||
        (art.artist || '').toLowerCase().includes(term) ||
        (art.code || '').toLowerCase().includes(term);
      const matchesStatus =
        statusFilter === 'All' ||
        art.status === statusFilter ||
        (statusFilter === 'In Transit' && (art.status === ArtworkStatus.SOLD));

      const effectiveBranch = (art.status === 'Sold' || art.status === 'Delivered')
        ? (art.soldAtBranch || art.currentBranch)
        : art.currentBranch;
      const matchesBranch = branchFilter === 'All' || effectiveBranch === branchFilter;

      const safeSheetFilter = (sheetFilter || '').toLowerCase();
      const isAvailableTab = safeSheetFilter.includes('available');
      const isSoldPiecesTab = safeSheetFilter.includes('sold pieces');
      const isSoldStatus = ['sold', 'delivered'].includes((art.status || '').toLowerCase());

      const matchesSheet = sheetFilter === 'All' ||
        ((art.sheetName || '').toLowerCase() === safeSheetFilter && (!isAvailableTab || !isSoldStatus)) ||
        (isSoldPiecesTab && isSoldStatus);

      const matchesArtist = artistFilter === 'All' || art.artist === artistFilter;
      const matchesMedium = mediumFilter === 'All' || art.medium === mediumFilter;
      const matchesSize = !sizeFilter || ((art.dimensions || '').toLowerCase().includes((sizeFilter || '').toLowerCase()));

      const price = art.price || 0;
      const matchesPrice = price >= priceRange[0] && price <= priceRange[1];

      let matchesDate = true;
      if (dateYearFilter !== 'All' || dateMonthFilter !== 'All') {
        const { y: effY, m: effM } = getArtYearMonth(art);
        if (dateYearFilter !== 'All' && dateMonthFilter !== 'All') {
          const y = parseInt(dateYearFilter, 10);
          const m = parseInt(dateMonthFilter, 10);
          matchesDate = effY === y && effM === m;
        } else if (dateYearFilter !== 'All') {
          const y = parseInt(dateYearFilter, 10);
          matchesDate = effY === y;
        } else if (dateMonthFilter !== 'All') {
          const m = parseInt(dateMonthFilter, 10);
          matchesDate = effM === m;
        }
      }
      return matchesSearch && matchesStatus && matchesBranch && matchesSheet && matchesDate && matchesArtist && matchesMedium && matchesSize && matchesPrice;
    });

    if ((sheetFilter || '').toLowerCase().includes('sold pieces')) {
      const salesMap = new Map(sales.map(s => [s.artworkId, s]));
      return filtered.sort((a, b) => {
        const saleA = salesMap.get(a.id);
        const saleB = salesMap.get(b.id);
        const dateA = saleA?.saleDate ? new Date(saleA.saleDate).getTime() : 0;
        const dateB = saleB?.saleDate ? new Date(saleB.saleDate).getTime() : 0;
        return dateB - dateA;
      });
    }

    return filtered;
  }, [
    artworks,
    searchTerm,
    statusFilter,
    branchFilter,
    sheetFilter,
    dateMonthFilter,
    dateYearFilter,
    artistFilter,
    mediumFilter,
    sizeFilter,
    priceRange,
    sales,
    permissions
  ]);

  const metricModalArtworks = useMemo(() => {
    if (!metricModal) return [];
    if (metricModal.type === 'TOTAL') return filteredArtworks;
    if (metricModal.type === 'RESERVED') return filteredArtworks.filter(a => a.status === 'Reserved');
    if (metricModal.type === 'SOLD' || metricModal.type === 'REVENUE') return filteredArtworks.filter(a => ['Sold', 'Delivered'].includes(a.status));
    return [];
  }, [metricModal, filteredArtworks]);

  const inventoryInsights = useMemo(() => {
    const totalItems = filteredArtworks.length;
    let availableCount = 0;
    let reservedCount = 0;
    let soldCount = 0;
    let deliveredCount = 0;
    let cancelledCount = 0;
    let totalValue = 0;
    let availableValue = 0;
    let soldValue = 0;
    const artistSales: Record<string, number> = {};

    filteredArtworks.forEach(art => {
      totalValue += art.price || 0;
      if (art.status === ArtworkStatus.AVAILABLE) {
        availableCount += 1;
        availableValue += art.price || 0;
      } else if (art.status === ArtworkStatus.RESERVED) {
        reservedCount += 1;
      } else if (art.status === ArtworkStatus.SOLD) {
        soldCount += 1;
        soldValue += art.price || 0;
        const artist = art.artist || 'Unknown';
        artistSales[artist] = (artistSales[artist] || 0) + (art.price || 0);
      } else if (art.status === ArtworkStatus.DELIVERED) {
        deliveredCount += 1;
        soldValue += art.price || 0;
        const artist = art.artist || 'Unknown';
        artistSales[artist] = (artistSales[artist] || 0) + (art.price || 0);
      } else if (art.status === ArtworkStatus.CANCELLED) {
        cancelledCount += 1;
      }
    });

    let topArtist = 'N/A';
    let maxSales = 0;
    Object.entries(artistSales).forEach(([artist, value]) => {
      if (value > maxSales) {
        maxSales = value;
        topArtist = artist;
      }
    });

    const inTransitCount = filteredArtworks.filter(art => art.status === ArtworkStatus.SOLD).length;

    return {
      totalItems,
      availableCount,
      reservedCount,
      soldCount,
      deliveredCount,
      cancelledCount,
      inTransitCount,
      totalValue,
      availableValue,
      soldValue,
      topArtist
    };
  }, [filteredArtworks]);

  const reportTitle = useMemo(() => {
    const parts = [];
    if (artistFilter !== 'All') parts.push(artistFilter);
    if (mediumFilter !== 'All') parts.push(mediumFilter);
    if (statusFilter !== 'All') parts.push(statusFilter);

    let base = parts.length > 0 ? parts.join(' • ') : 'Inventory Catalog';
    if (branchFilter !== 'All') base += ` — ${branchFilter}`;

    return base;
  }, [artistFilter, mediumFilter, statusFilter, branchFilter]);

  const paginatedArtworks = useMemo(() => {
    return filteredArtworks.slice(0, visibleCount);
  }, [filteredArtworks, visibleCount]);

  return {
    activeCategories,
    priceStats,
    availableSheets,
    availableArtists,
    availableMediums,
    filteredArtworks,
    metricModalArtworks,
    inventoryInsights,
    reportTitle,
    paginatedArtworks
  };
};
