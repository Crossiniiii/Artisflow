
import React, { useState, useMemo, useRef } from 'react';
import { utils, writeFile } from 'xlsx';
import ExcelJS from 'exceljs';
import { Artwork, ArtworkStatus, Branch, ExhibitionEvent, SaleRecord, isInTransitStatus, UserPermissions } from '../types';
import { ICONS } from '../constants';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, Download, XCircle, Edit, Trash2, ShoppingBag, Clock, ArrowRightLeft, Image as ImageIcon } from 'lucide-react';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface InventoryProps {
  artworks: Artwork[];
  branches: string[];
  onView: (id: string) => void;
  permissions?: UserPermissions;
  onAdd: (art: Partial<Artwork>) => void;
  onBulkAdd?: (artworks: Partial<Artwork>[], filename?: string) => void;
  onBulkUpdate?: (ids: string[], updates: Partial<Artwork>) => void;
  onBulkTransferRequest?: (ids: string[], toBranch: string) => void;
  onBulkSale?: (ids: string[], client: string, delivered: boolean) => void;
  onAddBranch?: (name: string) => void;
  onEdit?: (id: string, updates: Partial<Artwork>) => void;
  onBulkDelete?: (ids: string[]) => void;
  onBulkReserve?: (ids: string[], details: string) => void;
  events?: ExhibitionEvent[];
  preventDuplicates?: boolean;
  importedFilenames?: string[];
  sales?: SaleRecord[];
}

const Inventory: React.FC<InventoryProps> = ({ 
  artworks, 
  branches, 
  onView, 
  permissions,
  onAdd, 
  onBulkAdd, 
  onBulkUpdate, 
  onBulkTransferRequest,
  onBulkSale, 
  onAddBranch, 
  onEdit, 
  onBulkDelete, 
  onBulkReserve, 
  events = [],
  preventDuplicates = false,
  importedFilenames = [],
  sales = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [sheetFilter, setSheetFilter] = useState<string>('All');
  const [artistFilter, setArtistFilter] = useState<string>('All');
  const [mediumFilter, setMediumFilter] = useState<string>('All');
  const [sizeFilter, setSizeFilter] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<Artwork | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<Partial<Artwork>[]>([]);
  const [importTargetBranch, setImportTargetBranch] = useState<string>('Main Gallery');
  const [importFilename, setImportFilename] = useState<string>('');
  const [importMonthValue, setImportMonthValue] = useState<string>(String(new Date().getMonth() + 1));
  const [importYearValue, setImportYearValue] = useState<string>(String(new Date().getFullYear()));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionModal, setBulkActionModal] = useState<{ type: 'sale' | 'reserve' | 'delete' | 'transfer' } | null>(null);
  const [bulkActionValue, setBulkActionValue] = useState(''); 
  const [bulkActionExtra, setBulkActionExtra] = useState(false); // e.g. "Delivered" checkbox
  
  // Reservation Modal State
  const [reservationTab, setReservationTab] = useState<'person' | 'event'>('person');
  const [reservationClient, setReservationClient] = useState('');
  const [reservationNotes, setReservationNotes] = useState('');
  const [reservationEventName, setReservationEventName] = useState('');

  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('Available');
  const [reserveType, setReserveType] = useState<'person' | 'event'>('person');

  React.useEffect(() => {
    if (editingArtwork) {
      setSelectedStatus(editingArtwork.status);
      setImagePreview(editingArtwork.imageUrl);
    } else {
      setSelectedStatus('Available');
      setImagePreview(null);
    }
  }, [editingArtwork]);

  const [errorModal, setErrorModal] = useState<{title: string, message: string, onConfirm?: () => void} | null>(null);
 
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

  // Date Filters (Month/Year)
  const [dateMonthFilter, setDateMonthFilter] = useState<string>('All');
  const [dateYearFilter, setDateYearFilter] = useState<string>('All');
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const formatImportPeriod = (p?: string) => {
    if (!p) return '';
    const parts = p.split('-');
    if (parts.length < 2) return p;
    const y = parts[0];
    const m = Math.max(1, Math.min(12, parseInt(parts[1], 10)));
    return `${monthNames[m - 1]} ${y}`;
  };

  // Extract effective year-month for filtering (prefers explicit date in year/createdAt, then importPeriod)
  const getArtYearMonth = (art: Artwork): { y: number; m: number } => {
    // 1. Prioritize Import Period (User selected batch) - "Global Feature"
    if (art.importPeriod) {
      const parts = art.importPeriod.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      return { y, m };
    }

    // 2. Check for explicit full date in 'year' specifically (Prioritize Excel date)
    if (art.year) {
      const yearDateMatch = String(art.year).match(/^(\d{4})[-\/](\d{1,2})/);
      if (yearDateMatch) {
          return { y: parseInt(yearDateMatch[1], 10), m: parseInt(yearDateMatch[2], 10) };
      }
      
      // Check for Year only in art.year (Prioritize Excel Year over Import Date)
      const yearOnlyMatch = String(art.year).match(/^(\d{4})$/);
      if (yearOnlyMatch) {
          return { y: parseInt(yearOnlyMatch[1], 10), m: 1 }; // Default to Jan
      }
    }

    // 3. Check createdAt if it exists
    const base = art.createdAt || '';
    
    // Try to find YYYY-MM or YYYY/MM pattern in base
    const dateMatch = base.match(/^(\d{4})[-\/](\d{1,2})/);
    if (dateMatch) {
        return { y: parseInt(dateMatch[1], 10), m: parseInt(dateMatch[2], 10) };
    }

    // 4. Fallback: Parse Year only (default to Jan), or current date
    const d = new Date(base);
    if (!isNaN(d.getTime())) {
      return { y: d.getFullYear(), m: d.getMonth() + 1 };
    }
    
    const yonly = base.match(/^(\d{4})$/);
    if (yonly) return { y: parseInt(yonly[1], 10), m: 1 };
    
    return { y: new Date().getFullYear(), m: new Date().getMonth() + 1 };
  };

  // Set default sheet filter to the first available sheet (preferably 'AVAILABLE')
  React.useEffect(() => {
    if (sheetFilter === 'All' && availableSheets.length > 0) {
      const preferred = availableSheets.find(s => s.toUpperCase().includes('AVAILABLE')) || availableSheets[0];
      setSheetFilter(preferred);
    }
  }, [availableSheets]);

  // Sync image preview when editing
  React.useEffect(() => {
    if (editingArtwork) {
      setImagePreview(editingArtwork.imageUrl);
    } else {
      setImagePreview(null);
    }
  }, [editingArtwork]);

  const filteredArtworks = useMemo(() => {
    return artworks.filter(art => {
      const matchesSearch =
        art.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        art.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
        art.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === 'All' ||
        art.status === statusFilter ||
        (statusFilter === 'In Transit' && isInTransitStatus(art.status));
      const matchesBranch = branchFilter === 'All' || art.currentBranch === branchFilter;
      const matchesSheet = sheetFilter === 'All' || art.sheetName === sheetFilter;
      const matchesArtist = artistFilter === 'All' || art.artist === artistFilter;
      const matchesMedium = mediumFilter === 'All' || art.medium === mediumFilter;
      const matchesSize = !sizeFilter || (art.dimensions && art.dimensions.toLowerCase().includes(sizeFilter.toLowerCase()));

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
      return matchesSearch && matchesStatus && matchesBranch && matchesSheet && matchesDate && matchesArtist && matchesMedium && matchesSize;
    });
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
    sales
  ]);

  const inventoryInsights = useMemo(() => {
    const totalItems = filteredArtworks.length;
    let availableCount = 0;
    let reservedCount = 0;
    let soldCount = 0;
    let deliveredCount = 0;
    let cancelledCount = 0;
    let totalValue = 0;
    let availableValue = 0;

    filteredArtworks.forEach(art => {
      totalValue += art.price || 0;
      if (art.status === ArtworkStatus.AVAILABLE) {
        availableCount += 1;
        availableValue += art.price || 0;
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

    const inTransitCount = filteredArtworks.filter(art => isInTransitStatus(art.status)).length;

    return {
      totalItems,
      availableCount,
      reservedCount,
      soldCount,
      deliveredCount,
      cancelledCount,
      inTransitCount,
      totalValue,
      availableValue
    };
  }, [filteredArtworks]);

  // Force update status filter options to include migrated data if any remained
  // But we did migration in App.tsx, so here we rely on artworks being clean.
  // However, the status filter dropdown should only show standard statuses.


  const exportInventory = () => {
    const workbook = utils.book_new();
    
    // Group artworks by sheet name
    const sheets: Record<string, any[]> = {};
    const dataToExport = filteredArtworks.length > 0 ? filteredArtworks : artworks;

    dataToExport.forEach(art => {
      const sheetName = art.sheetName || 'Inventory';
      if (!sheets[sheetName]) sheets[sheetName] = [];
      
      // Create a clean object for export
      const { id, sheetName: _, imageUrl, ...rest } = art;
      sheets[sheetName].push(rest);
    });

    Object.keys(sheets).forEach(name => {
      const ws = utils.json_to_sheet(sheets[name]);
      utils.book_append_sheet(workbook, ws, name);
    });

    writeFile(workbook, `ArtisFlow_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (preventDuplicates && importedFilenames.includes(file.name)) {
      setErrorModal({
        title: 'Duplicate Import Detected',
        message: `The file "${file.name}" has already been imported.\n\nDuplicate imports are currently restricted. You can change this setting in the Import History tab.`
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setImportFilename(file.name);

    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    
    const parsedData: Partial<Artwork>[] = [];

  workbook.eachSheet((worksheet, sheetId) => {
    const sheetName = worksheet.name;
    if (sheetName.toLowerCase().includes('monitoring')) {
      return;
    }
      
      // Extract Images
      const rowImages: Record<number, string> = {};
      const wbAny = workbook as any;
      if (wbAny.model && wbAny.model.media) {
          worksheet.getImages().forEach(image => {
            const imgModel = wbAny.model.media.find((m: any) => m.index === image.imageId);
            if (imgModel) {
              const buffer = imgModel.buffer;
              let base64 = '';
              // Handle buffer conversion for browser
              // Use explicit any cast to avoid TS errors with Buffer/ArrayBuffer types
              const bufAny = buffer as any;
              
              if (bufAny instanceof ArrayBuffer || (bufAny && bufAny.constructor && bufAny.constructor.name === 'ArrayBuffer')) {
                const bytes = new Uint8Array(bufAny);
                let binary = '';
                for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
                base64 = window.btoa(binary);
              } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(bufAny)) {
                 base64 = bufAny.toString('base64');
              } else {
                 // Fallback if buffer is some other type or array
                 // Try to treat as byte array
                 const bytes = new Uint8Array(bufAny);
                 let binary = '';
                 for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
                 base64 = window.btoa(binary);
              }
              
              const mimeType = imgModel.extension === 'png' ? 'image/png' : 'image/jpeg';
              const targetRow = image.range.tl.nativeRow + 1; // Convert 0-based nativeRow to 1-based rowNumber
              rowImages[targetRow] = `data:${mimeType};base64,${base64}`;
            }
          });
      }

      // Find Header Row
      let headerRowIndex = -1;
      const headerMap: Record<number, string> = {}; 
      
      worksheet.eachRow((row, rowNumber) => {
        if (headerRowIndex !== -1) return;
        // Search deep for headers, just in case
        if (rowNumber > 100) return;

        let hasHeaderKeywords = false;
        row.eachCell((cell, colNumber) => {
          const val = String(cell.value).toLowerCase().trim();
          if (['title', 'artist', 'code', 'price', 'cost', 'srp', 'amount', 'gp', 'particulars', 'date', 'client', 'branch', 'items', 'dr#', 'no. of items', 'sku', 'name'].some(k => val.includes(k))) {
            hasHeaderKeywords = true;
          }
        });

        if (hasHeaderKeywords) {
          headerRowIndex = rowNumber;
          row.eachCell((cell, colNumber) => {
            headerMap[colNumber] = String(cell.value).toLowerCase().trim();
          });
          
          // Force include Column A as Description if it's missing (common in Monitoring Summary)
          if (!headerMap[1]) {
            headerMap[1] = 'description';
          }
        }
      });

      // Parse Data
      if (headerRowIndex !== -1) {
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber <= headerRowIndex) return;

          const entry: any = { sheetName };
          
          const lowerSheet = sheetName.toLowerCase();
          if (lowerSheet.includes('available')) entry.status = ArtworkStatus.AVAILABLE;
          else if (lowerSheet.includes('sold')) entry.status = ArtworkStatus.SOLD;
          else if (lowerSheet.includes('reserved')) entry.status = ArtworkStatus.RESERVED;

          row.eachCell((cell, colNumber) => {
            const header = headerMap[colNumber];
            if (!header) return;

            // Handle various cell types (Rich Text, Formulas, Hyperlinks)
            let val = cell.value;
            if (val && typeof val === 'object') {
              if ('text' in val) val = (val as any).text;
              else if ('hyperlink' in val) val = (val as any).text || (val as any).hyperlink;
              else if ('result' in val) val = (val as any).result;
              else if ('richText' in val) val = (val as any).richText.map((rt: any) => rt.text).join('');
            }

            const value = val;
            const lowerKey = header;

            // Mapping Logic
            if (['gp', 'price', 'amount', 'value', 'selling price', 'net to main', 'cost', 'unit price', 'srp'].includes(lowerKey)) {
              const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.-]/g, ''));
              if (!isNaN(num)) {
                if (['gp', 'price', 'amount', 'value', 'selling price', 'cost', 'unit price', 'srp'].includes(lowerKey)) entry.price = num;
                else entry[lowerKey] = value;
              }
            }
            else if (['title', 'title to follow', 'particulars', 'description', 'item', 'artwork', 'art name', 'item name'].includes(lowerKey)) entry.title = String(value).trim();
            else if (['artist', "artist's name", 'name', 'artist name', 'painter'].includes(lowerKey)) entry.artist = String(value).trim();
            else if (['medium', 'material', 'technique'].includes(lowerKey)) entry.medium = String(value).trim();
            else if (['dimensions', 'size', 'size w/o frame', 'size frame', 'measurement'].includes(lowerKey)) {
                if (entry.dimensions) entry.dimensions += ` / ${String(value).trim()}`;
                else entry.dimensions = String(value).trim();
            }
            else if (['branch', 'client / branch', 'location'].includes(lowerKey)) entry.currentBranch = String(value).trim();
            else if (['imageurl', 'image url', 'images'].includes(lowerKey)) entry.imageUrl = String(value).trim();
            else if (['code', 'it / dr#', 'inv no', 'inventory no', 'item no', 'sku'].includes(lowerKey)) entry.code = String(value).trim();
            else if (['year', 'date'].includes(lowerKey)) {
              if (value instanceof Date) {
                entry.year = value.toISOString().split('T')[0];
              } else {
                entry.year = String(value).trim();
              }
            }
            else if (lowerKey.includes('status')) {
              const valStr = String(value).trim();
              if (valStr.toUpperCase().startsWith('IT') || valStr.includes('#')) {
                entry.status = ArtworkStatus.AVAILABLE;
                entry.remarks = valStr;
              } else {
                // Normalize status to Enum if possible
                const lowerStatus = valStr.toLowerCase();
                if (lowerStatus === 'available') entry.status = ArtworkStatus.AVAILABLE;
                else if (lowerStatus === 'sold') entry.status = ArtworkStatus.SOLD;
                else if (lowerStatus === 'reserved') entry.status = ArtworkStatus.RESERVED;
                else if (lowerStatus === 'delivered') entry.status = ArtworkStatus.DELIVERED;
                else if (lowerStatus === 'cancelled') entry.status = ArtworkStatus.CANCELLED;
                else if (lowerStatus === 'exclusive' || lowerStatus.includes('view only')) entry.status = ArtworkStatus.EXCLUSIVE_VIEW_ONLY;
                else entry.status = valStr;
              }
            }
            else if (lowerKey.includes('remarks')) entry.remarks = String(value).trim();
            else if (['no. of items', 'items', 'count', 'quantity'].includes(lowerKey)) entry.itemCount = Number(value);
            else {
              entry[lowerKey] = value;
            }
          });

          // Attach Extracted Image if available
          if (rowImages[rowNumber]) {
            entry.imageUrl = rowImages[rowNumber];
          }

          // Fallbacks
          if (!entry.title && (entry.particulars || entry.description)) {
            entry.title = entry.particulars || entry.description;
          }
          if (!entry.title && entry.code) entry.title = `Untitled (${entry.code})`;
          if (!entry.artist) entry.artist = 'Unknown Artist';

          // Allow rows with just date/code/title to be imported
          if (entry.title || entry.code || (entry.year && entry.itemCount)) {
             parsedData.push(entry);
          }
        });
      }
    });
    
    setImportPreview(parsedData);
    setShowImportModal(true);
    setImportTargetBranch('Main Gallery'); // Reset to default
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processImport = () => {
    // Handle new branch creation if typed
    if (onAddBranch && importTargetBranch && !branches.includes(importTargetBranch)) {
       onAddBranch(importTargetBranch);
    }

    const finalImport = importPreview.map(item => ({
      ...item,
      currentBranch: importTargetBranch || 'Main Gallery'
    }));

    // Build ISO timestamp for selected Month/Year (use 1st day)
    const customDate = new Date(parseInt(importYearValue), parseInt(importMonthValue) - 1, 1).toISOString();

    if (onBulkAdd) {
      onBulkAdd(finalImport, importFilename, customDate);
    } else {
      finalImport.forEach(art => onAdd(art));
    }
    setShowImportModal(false);
    setImportPreview([]);
    setImportFilename('');
    setImportMonthValue(String(new Date().getMonth() + 1));
    setImportYearValue(String(new Date().getFullYear()));
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredArtworks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredArtworks.map(a => a.id));
    }
  };

  const validateBulkAction = (type: 'sale' | 'reserve' | 'delete' | 'transfer') => {
    const selectedArtworks = artworks.filter(a => selectedIds.includes(a.id));
    
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
      const unavailable = selectedArtworks.filter(a => a.status !== ArtworkStatus.AVAILABLE);
      if (unavailable.length > 0) {
        return { 
          valid: false, 
          title: 'Cannot Reserve Items',
          message: `${unavailable.length} of the selected items are not Available (they are Sold, Reserved, Delivered, or Exclusive View Only).\n\nOnly Available items can be reserved.` 
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
    if (selectedIds.length === 0) {
      setErrorModal({
        title: 'No items selected',
        message: 'Please select at least one artwork before applying an action.'
      });
      return;
    }

    const validation = validateBulkAction(type);
    if (!validation.valid && validation.message) {
      setErrorModal({
        title: validation.title || 'Warning',
        message: validation.message + '\n\nDo you want to proceed anyway?',
        onConfirm: () => {
          setErrorModal(null);
          setBulkActionValue('');
          setBulkActionExtra(false);
          setReservationTab('person');
          setReservationClient('');
          setReservationNotes('');
          setReservationEventName('');
          setBulkActionModal({ type });
        }
      });
      return;
    }

    setBulkActionValue('');
    setBulkActionExtra(false);
    setReservationTab('person');
    setReservationClient('');
    setReservationNotes('');
    setReservationEventName('');
    setBulkActionModal({ type });
  };

  const handleBulkActionSubmit = () => {
    if (!bulkActionModal) return;

    switch (bulkActionModal.type) {
      case 'sale':
        if (onBulkSale && bulkActionValue) {
           onBulkSale(selectedIds, bulkActionValue, bulkActionExtra);
        }
        break;
      case 'reserve':
        if (onBulkReserve) {
           let details = '';
           if (reservationTab === 'person') {
               details = `Reserved for Client: ${reservationClient}`;
               if (reservationNotes) details += ` | Notes: ${reservationNotes}`;
           } else {
               details = `Reserved for Event: ${reservationEventName}`;
               if (reservationNotes) details += ` | Notes: ${reservationNotes}`;
           }
           onBulkReserve(selectedIds, details);
        }
        break;
      case 'transfer':
        if (onBulkTransferRequest && bulkActionValue) {
           onBulkTransferRequest(selectedIds, bulkActionValue as Branch);
        } else if (onBulkUpdate && bulkActionValue) {
           onBulkUpdate(selectedIds, { currentBranch: bulkActionValue as Branch });
        }
        break;
      case 'delete':
        if (onBulkDelete) {
           onBulkDelete(selectedIds);
        }
        break;
    }
    
    setBulkActionModal(null);
    setSelectedIds([]);
    setBulkActionValue('');
    setBulkActionExtra(false);
  };

  return (
    <div className="space-y-6 relative min-h-full pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 flex-1">
          {(permissions?.canEditArtwork || permissions?.canSellArtwork || permissions?.canDeleteArtwork) && (
            <button 
              onClick={handleSelectAll}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-slate-100 to-slate-200 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 hover:from-slate-200 hover:to-slate-300 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 whitespace-nowrap"
            >
              {selectedIds.length === filteredArtworks.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
          
          <div className="relative flex-1 max-w-md group hidden md:block">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
              {ICONS.Search}
            </div>

            <input
              type="text"
              placeholder="Search by title, artist, or code..."
              className="block w-full pl-10 pr-3 py-3 bg-white border border-slate-200 rounded-2xl text-sm placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm group-hover:shadow-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
              <select 
                value={dateMonthFilter}  
                onChange={(e) => setDateMonthFilter(e.target.value)}
                className="bg-slate-50 border-0 rounded-xl px-5 py-3 text-base font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-indigo-50 hover:bg-indigo-50 transition-all cursor-pointer transform hover:scale-105 active:scale-95 duration-200"
              >
                <option value="All">All Months</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{monthNames[m-1]}</option>
                ))}
              </select>
              <select 
                value={dateYearFilter}  
                onChange={(e) => setDateYearFilter(e.target.value)}
                className="bg-slate-50 border-0 rounded-xl px-5 py-3 text-base font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-indigo-50 hover:bg-indigo-50 transition-all cursor-pointer transform hover:scale-105 active:scale-95 duration-200"
              >
                <option value="All">All Years</option>
                {Array.from({ length: new Date().getFullYear() - 1970 + 1 }, (_, i) => new Date().getFullYear() - i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              
              <div className="w-px h-8 bg-slate-200 mx-1"></div>

              <select 
                value={branchFilter} 
                onChange={(e) => setBranchFilter(e.target.value)}
                className="bg-indigo-50/50 border-0 rounded-xl px-5 py-3 text-base font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-indigo-100 hover:bg-indigo-100 transition-all cursor-pointer transform hover:scale-105 active:scale-95 duration-200 min-w-[140px]"
              >
                <option value="All">All Branches</option>
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
              <select 
                value={artistFilter} 
                onChange={(e) => setArtistFilter(e.target.value)}
                className="bg-slate-50 border-0 rounded-xl px-5 py-3 text-base font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-indigo-50 hover:bg-indigo-50 transition-all cursor-pointer min-w-[140px] max-w-[200px]"
              >
                <option value="All">All Artists</option>
                {availableArtists.map(a => <option key={a} value={a}>{a}</option>)}
              </select>

              <select 
                value={mediumFilter} 
                onChange={(e) => setMediumFilter(e.target.value)}
                className="bg-slate-50 border-0 rounded-xl px-5 py-3 text-base font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-indigo-50 hover:bg-indigo-50 transition-all cursor-pointer min-w-[140px] max-w-[200px]"
              >
                <option value="All">All Mediums</option>
                {availableMediums.map(m => <option key={m} value={m}>{m}</option>)}
              </select>

              <input
                type="text"
                placeholder="Size..."
                value={sizeFilter}
                onChange={(e) => setSizeFilter(e.target.value)}
                className="bg-slate-50 border-0 rounded-xl px-4 py-3 text-base font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-indigo-50 hover:bg-indigo-50 transition-all w-[100px]"
              />
            </div>

            <select 
              value={statusFilter}  
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-2xl px-5 py-3 text-base font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer transform hover:scale-105 active:scale-95 duration-200"
            >
              <option value="All">All Statuses</option>
              <option value="In Transit">In Transit</option>
              {Object.values(ArtworkStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {(permissions?.canManageAccounts) && (
              <button 
                onClick={exportInventory}
                className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 font-bold group"
                title="Export Current View"
              >
                <Download size={18} className="group-hover:scale-110 transition-transform" />
                <span className="hidden lg:inline">Export</span>
              </button>
            )}
            <input 
              type="file" 
              accept=".csv, .xlsx, .xls" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange}
            />
            {permissions?.canAddArtwork && (
              <>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl hover:bg-slate-50 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 font-bold group"
                  title="Import from Excel/CSV"
                >
                  <Upload size={18} className="group-hover:scale-110 transition-transform" />
                  <span className="hidden lg:inline">Bulk Import</span>
                </button>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-6 py-3 rounded-2xl hover:from-indigo-700 hover:to-violet-700 hover:shadow-lg hover:shadow-indigo-500/30 transition-all font-bold transform hover:-translate-y-0.5"
                >
                  {ICONS.Add}
                  <span>Register Artwork</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {availableSheets.length > 0 && (
        <div className="flex space-x-2 border-b border-slate-200 overflow-x-auto pb-2 px-1">
          <button
            onClick={() => setSheetFilter('All')}
            className={`px-6 py-3 text-sm font-bold whitespace-nowrap rounded-2xl transition-all transform hover:-translate-y-0.5 shadow-md hover:shadow-lg ${
              sheetFilter === 'All'
              ? 'bg-indigo-600 text-white shadow-indigo-500/30' 
              : 'bg-white text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100'
            }`}
          >
            All Pages
          </button>
          {availableSheets.map(s => (
            <button
              key={s}
              onClick={() => setSheetFilter(s)}
              className={`px-6 py-3 text-sm font-bold whitespace-nowrap rounded-2xl transition-all transform hover:-translate-y-0.5 shadow-md hover:shadow-lg ${
                sheetFilter === s 
                ? 'bg-indigo-600 text-white shadow-indigo-500/30' 
                : 'bg-white text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Items (Current View)
            </span>
            <ShoppingBag className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {inventoryInsights.totalItems.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            After all filters and search are applied.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Available Inventory
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {inventoryInsights.availableCount.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ₱{inventoryInsights.availableValue.toLocaleString()} total list value.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
              Reserved / In Transit
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-extrabold text-slate-900">
            {inventoryInsights.reservedCount.toLocaleString()} Reserved
          </div>
          <div className="text-xs text-slate-600 mt-1">
            {inventoryInsights.inTransitCount.toLocaleString()} marked as in transit.
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Sold / Delivered
            </span>
            <ArrowRightLeft className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-lg font-extrabold text-slate-900">
            {inventoryInsights.soldCount.toLocaleString()} Sold
          </div>
          <div className="text-xs text-slate-600 mt-1">
            {inventoryInsights.deliveredCount.toLocaleString()} Delivered,{' '}
            {inventoryInsights.cancelledCount.toLocaleString()} Cancelled.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredArtworks.map((art) => (
          <div 
            key={art.id} 
            onClick={() => onView(art.id)}
            className={`group bg-white rounded-2xl border ${selectedIds.includes(art.id) ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-slate-200'} overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col h-full hover:-translate-y-1 relative`}
          >
            {(permissions?.canEditArtwork || permissions?.canSellArtwork || permissions?.canDeleteArtwork) && (
              <div 
                onClick={(e) => toggleSelect(art.id, e)}
                className={`absolute top-3 left-3 z-10 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                  selectedIds.includes(art.id) 
                  ? 'bg-blue-600 border-blue-600 text-white' 
                  : 'bg-white/80 backdrop-blur border-slate-300 opacity-0 group-hover:opacity-100'
                }`}
              >
                {selectedIds.includes(art.id) && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </div>
            )}

            <div className="aspect-[4/3] overflow-hidden relative">
              <img 
                src={art.imageUrl} 
                alt={art.title} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 cursor-zoom-in" 
                onClick={(e) => { e.stopPropagation(); setPreviewImageUrl(art.imageUrl); }}
              />
              <div className="absolute top-3 right-3 flex items-center gap-2">
                {(permissions?.canEditArtwork) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingArtwork(art);
                      setShowAddModal(true);
                    }}
                    className="p-1.5 bg-white/90 backdrop-blur rounded-lg shadow-sm hover:bg-white text-slate-600 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100"
                    title="Edit Artwork"
                  >
                    <Edit size={14} />
                  </button>
                )}
                <StatusBadge status={art.status} />
              </div>
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                <p className="text-white text-xs font-medium opacity-90">{art.currentBranch}</p>
              </div>
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <div className="mb-2 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">{art.code}</span>
                <h4 className="text-lg font-bold text-slate-800 leading-tight line-clamp-1 group-hover:text-blue-600 transition-colors">{art.title}</h4>
                <p className="text-sm text-slate-500 font-medium">{art.artist}</p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5"></span>
                    Year: {art.year}
                  </span>
                  {art.importPeriod && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] font-bold uppercase tracking-widest text-indigo-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1.5"></span>
                      Imported: {formatImportPeriod(art.importPeriod)}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-100">
                <p className="text-xs text-slate-400 font-medium">{art.medium}</p>
                <p className="text-base font-bold text-slate-900">₱{art.price.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <Modal onClose={() => setShowImportModal(false)} title="Bulk Import Preview">
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 text-blue-700 rounded-xl text-sm flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Ready to Import</p>
                <p className="opacity-90">Found {importPreview.length} valid records from {new Set(importPreview.map(i => i.sheetName)).size} pages.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                    Import Month
                  </label>
                  <select 
                    value={importMonthValue}
                    onChange={(e) => setImportMonthValue(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>
                        {new Date(0, m - 1).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                    Import Year
                  </label>
                  <select 
                    value={importYearValue}
                    onChange={(e) => setImportYearValue(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
                  >
                    {Array.from({ length: new Date().getFullYear() - 1970 + 1 }, (_, i) => new Date().getFullYear() - i).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                 Import Destination (Branch)
              </label>
              <div className="relative">
                <input 
                  list="branches-list"
                  type="text" 
                  value={importTargetBranch}
                  onChange={(e) => setImportTargetBranch(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
                  placeholder="Select or type new branch name..."
                />
                <datalist id="branches-list">
                  {branches.map(b => <option key={b} value={b} />)}
                </datalist>
                <p className="mt-2 text-xs text-slate-500">
                  Select an existing branch or type a new name to automatically create a new branch location.
                </p>
              </div>
            </div>
            
            <div className="max-h-[40vh] overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase sticky top-0">
                  <tr>
                    <th className="px-4 py-3">Page</th>
                    <th className="px-4 py-3">Image</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Artist</th>
                    <th className="px-4 py-3">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importPreview.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-500 text-xs font-bold uppercase">{item.sheetName}</td>
                      <td className="px-4 py-3">
                        {item.imageUrl && (
                          <img src={item.imageUrl} alt="Preview" className="w-10 h-10 object-cover rounded shadow-sm" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.title}</td>
                      <td className="px-4 py-3 text-slate-500">{item.artist}</td>
                      <td className="px-4 py-3 text-slate-500">₱{item.price?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button 
                onClick={() => setShowImportModal(false)} 
                className="px-5 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={processImport} 
                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
              >
                Import {importPreview.length} Items
              </button>
            </div>
          </div>
        </Modal>
      )}
      
      {/* Registration / Edit Modal */}
      {showAddModal && (
         <Modal 
           onClose={() => {
             setShowAddModal(false);
             setEditingArtwork(null);
           }} 
           title={editingArtwork ? "Edit Artwork Details" : "Register New Artwork"}
         >
           <form onSubmit={async (e) => {
             e.preventDefault();
             if (uploadingImage) return;

             const formData = new FormData(e.currentTarget);
             const file = formData.get('image') as File;
             
             let finalImageUrl = editingArtwork?.imageUrl || '';

             if (file && file.size > 0) {
                 setUploadingImage(true);
                 try {
                    const resizedDataUrl = await new Promise<string>((resolve, reject) => {
                      const img = new Image();
                      img.onload = () => {
                        const maxW = 1200;
                        const maxH = 1200;
                        const w = img.width;
                        const h = img.height;
                        const scale = Math.min(maxW / w, maxH / h, 1);
                        const canvas = document.createElement('canvas');
                        canvas.width = Math.round(w * scale);
                        canvas.height = Math.round(h * scale);
                        const ctx = canvas.getContext('2d');
                        if (!ctx) {
                          reject(new Error('Canvas not available'));
                          return;
                        }
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        const isPng = file.type === 'image/png';
                        const mime = isPng ? 'image/png' : 'image/jpeg';
                        const dataUrl = isPng ? canvas.toDataURL(mime) : canvas.toDataURL(mime, 0.85);
                        resolve(dataUrl);
                      };
                      img.onerror = reject;
                      img.src = URL.createObjectURL(file);
                    });
                    finalImageUrl = resizedDataUrl;
            } catch (err: any) {
                    alert(`Upload failed: ${err.message || err}`);
            } finally {
                     setUploadingImage(false);
                 }
             }

             const status = selectedStatus as ArtworkStatus;
             const statusNote = formData.get('statusNote') as string;
             let remarks = formData.get('remarks') as string;
         
             if (status === ArtworkStatus.RESERVED && statusNote) {
                 const typePrefix = reserveType === 'event' ? 'Reserved For Event' : 'Reserved For';
                 remarks = `[${typePrefix}: ${statusNote}]\n${remarks}`;
             } else if (status === ArtworkStatus.SOLD && statusNote) {
                 remarks = `[Sold To: ${statusNote}]\n${remarks}`;
             }

             const data = {
               code: formData.get('code') as string,
               status: status,
               title: formData.get('title') as string,
               artist: formData.get('artist') as string,
               medium: formData.get('medium') as string,
               dimensions: formData.get('dimensions') as string,
               price: parseFloat(formData.get('price') as string) || 0,
              currentBranch: formData.get('branch') as Branch || 'Main Gallery',
              year: formData.get('year') as string,
              imageUrl: finalImageUrl,
              sheetName: formData.get('sheetName') as string,
              sizeFrame: formData.get('sizeFrame') as string,
              importPeriod: formData.get('importPeriod') as string,
              remarks: remarks
            };

            if (editingArtwork && onEdit) {
                onEdit(editingArtwork.id, data);
             } else {
                onAdd(data);
             }
             setShowAddModal(false);
             setEditingArtwork(null);
           }} className="space-y-4">
             {/* Image Upload UI */}
             <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative group">
                <input 
                    type="file" 
                    name="image" 
                    accept="image/*" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            setImagePreview(URL.createObjectURL(file));
                        }
                    }}
                />
                {imagePreview ? (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-white font-bold flex items-center gap-2"><ImageIcon size={20} /> Change Image</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-slate-400 py-8">
                        <ImageIcon size={48} className="mb-2 opacity-50" />
                        <p className="text-sm font-bold">Click to upload artwork image</p>
                        <p className="text-xs">Supports JPG, PNG</p>
                    </div>
                )}
             </div>

             <div>
                <label className="text-xs font-bold text-slate-400 uppercase">ID (Code)</label>
                <input name="code" defaultValue={editingArtwork?.code} placeholder="Auto-generated if empty" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
             </div>

             <div className="space-y-4">
                <label className="text-xs font-bold text-slate-400 uppercase">Initial Status</label>
                <div className="flex p-1 bg-slate-100 rounded-xl">
                    {[ArtworkStatus.AVAILABLE, ArtworkStatus.RESERVED, ArtworkStatus.SOLD].map(status => {
                        const isSelected = selectedStatus === status;
                        let activeClass = '';
                        if (status === ArtworkStatus.AVAILABLE) activeClass = 'bg-emerald-100 text-emerald-800 shadow-sm ring-1 ring-emerald-200';
                        else if (status === ArtworkStatus.RESERVED) activeClass = 'bg-amber-100 text-amber-800 shadow-sm ring-1 ring-amber-200';
                        else if (status === ArtworkStatus.SOLD) activeClass = 'bg-rose-100 text-rose-800 shadow-sm ring-1 ring-rose-200';

                        return (
                           <button
                             key={status}
                             type="button"
                             onClick={() => setSelectedStatus(status)}
                             className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                isSelected ? activeClass : 'text-slate-500 hover:bg-slate-200/50'
                             }`}
                           >
                             {status}
                           </button>
                        );
                    })}
                </div>
                
                {selectedStatus === ArtworkStatus.RESERVED && (
                    <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100 animate-in fade-in slide-in-from-top-2 space-y-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-amber-800 uppercase">Reserved For</span>
                            <div className="flex bg-amber-100/50 rounded-lg p-0.5">
                                <button 
                                    type="button" 
                                    onClick={() => setReserveType('person')}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${reserveType === 'person' ? 'bg-white text-amber-900 shadow-sm' : 'text-amber-700 hover:bg-amber-200/50'}`}
                                >
                                    Person
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setReserveType('event')}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${reserveType === 'event' ? 'bg-white text-amber-900 shadow-sm' : 'text-amber-700 hover:bg-amber-200/50'}`}
                                >
                                    Event
                                </button>
                            </div>
                        </div>

                        {reserveType === 'person' ? (
                            <input 
                                name="statusNote" 
                                placeholder="Enter Client Name (e.g. John Doe)" 
                                className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all" 
                            />
                        ) : (
                            <div className="relative">
                                <select 
                                    name="statusNote" 
                                    className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all appearance-none"
                                >
                                    <option value="">Select Event...</option>
                                    {events.map(evt => (
                                        <option key={evt.id} value={evt.title}>{evt.title}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-amber-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {selectedStatus === ArtworkStatus.SOLD && (
                     <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-100 animate-in fade-in slide-in-from-top-2">
                        <label className="block text-xs font-bold text-rose-800 uppercase mb-2">Sold To (Client Name)</label>
                        <input 
                            name="statusNote" 
                            placeholder="Enter Client Name" 
                            className="w-full px-4 py-2.5 bg-white border border-rose-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all" 
                        />
                    </div>
                )}
             </div>

             <div><label className="text-xs font-bold text-slate-400 uppercase">Title</label><input name="title" defaultValue={editingArtwork?.title} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" /></div>
             <div className="grid grid-cols-2 gap-4">
               <div><label className="text-xs font-bold text-slate-400 uppercase">Artist</label><input name="artist" defaultValue={editingArtwork?.artist} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" /></div>
               <div><label className="text-xs font-bold text-slate-400 uppercase">Year</label><input name="year" defaultValue={editingArtwork?.year} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" /></div>
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div><label className="text-xs font-bold text-slate-400 uppercase">Medium</label><input name="medium" defaultValue={editingArtwork?.medium} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" /></div>
               <div><label className="text-xs font-bold text-slate-400 uppercase">Dimensions</label><input name="dimensions" defaultValue={editingArtwork?.dimensions} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" /></div>
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div><label className="text-xs font-bold text-slate-400 uppercase">Price (₱)</label><input name="price" type="number" defaultValue={editingArtwork?.price} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" /></div>
               <div>
                 <label className="text-xs font-bold text-slate-400 uppercase">Location</label>
                <select name="branch" defaultValue={editingArtwork?.currentBranch} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
               </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div><label className="text-xs font-bold text-slate-400 uppercase">Sheet Name</label><input name="sheetName" defaultValue={editingArtwork?.sheetName} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" /></div>
               <div><label className="text-xs font-bold text-slate-400 uppercase">Size Frame</label><input name="sizeFrame" defaultValue={editingArtwork?.sizeFrame} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" /></div>
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div><label className="text-xs font-bold text-slate-400 uppercase">Import Period</label><input name="importPeriod" type="month" defaultValue={editingArtwork?.importPeriod} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" /></div>
             </div>
             <div><label className="text-xs font-bold text-slate-400 uppercase">Remarks</label><textarea name="remarks" defaultValue={editingArtwork?.remarks} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm h-20 resize-none" /></div>
             <div className="flex justify-end space-x-3 pt-4">
               <button type="button" onClick={() => { setShowAddModal(false); setEditingArtwork(null); }} className="px-5 py-2.5 rounded-xl text-slate-600 font-medium">Cancel</button>
               <button type="submit" disabled={uploadingImage} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold disabled:opacity-70 disabled:cursor-not-allowed">
                   {uploadingImage ? 'Uploading...' : (editingArtwork ? 'Save Changes' : 'Register Artwork')}
               </button>
             </div>
           </form>
         </Modal>
      )}

      {/* Floating Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-40 animate-in slide-in-from-bottom-6 fade-in duration-300 border border-slate-700/50 backdrop-blur-sm bg-slate-900/95 max-w-[90vw]">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Selection</span>
            <span className="font-bold text-lg">{selectedIds.length} Artworks</span>
          </div>

          <div className="h-8 w-px bg-slate-700"></div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!(permissions?.canSellArtwork ?? true)}
              onClick={() => handleBulkActionClick('sale')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-100"
            >
              <ShoppingBag size={14} />
              <span>Mark as Sold</span>
            </button>
            <button
              type="button"
              disabled={!(permissions?.canReserveArtwork ?? true)}
              onClick={() => handleBulkActionClick('reserve')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-300 text-amber-900 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-amber-300"
            >
              <Clock size={14} />
              <span>Reserve</span>
            </button>
            <button
              type="button"
              disabled={!(permissions?.canEditArtwork ?? true)}
              onClick={() => handleBulkActionClick('transfer')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-100 text-indigo-800 hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-100"
            >
              <ArrowRightLeft size={14} />
              <span>Transfer</span>
            </button>
            <button
              type="button"
              disabled={!(permissions?.canDeleteArtwork ?? true)}
              onClick={() => handleBulkActionClick('delete')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-rose-600"
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          </div>

          <button
            onClick={() => setSelectedIds([])}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all transform hover:scale-105 hover:shadow-md"
            title="Clear Selection"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Bulk Action Modal */}
      {bulkActionModal && (
        <Modal onClose={() => setBulkActionModal(null)} title={
           bulkActionModal.type === 'sale' ? 'Bulk Sale' :
           bulkActionModal.type === 'reserve' ? 'Bulk Reserve' :
           bulkActionModal.type === 'transfer' ? 'Bulk Transfer' : 'Confirm Deletion'
        }>
           <div className="space-y-4">
              <p className="text-slate-600 text-sm">
                 You are about to {bulkActionModal.type} <strong>{selectedIds.length}</strong> selected artworks.
              </p>
              
              {bulkActionModal.type === 'sale' && (
                 <>
                    <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Client Name</label>
                       <input 
                          autoFocus
                          type="text" 
                          value={bulkActionValue}
                          onChange={(e) => setBulkActionValue(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          placeholder="Enter client name..."
                       />
                    </div>
                    <label className="flex items-center space-x-2 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                       <input 
                          type="checkbox" 
                          checked={bulkActionExtra}
                          onChange={(e) => setBulkActionExtra(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                       />
                       <span className="text-sm font-medium text-slate-700">Mark items as Delivered immediately?</span>
                    </label>
                 </>
              )}

              {bulkActionModal.type === 'reserve' && (
                 <div className="space-y-4">
                    <div className="flex p-1 bg-slate-100 rounded-xl">
                       <button
                          onClick={() => setReservationTab('person')}
                          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                             reservationTab === 'person' 
                             ? 'bg-white text-slate-900 shadow-sm' 
                             : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                          }`}
                       >
                          Person
                       </button>
                       <button
                          onClick={() => setReservationTab('event')}
                          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                             reservationTab === 'event' 
                             ? 'bg-white text-slate-900 shadow-sm' 
                             : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                          }`}
                       >
                          Event
                       </button>
                    </div>

                    {reservationTab === 'person' ? (
                        <>
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Client Name</label>
                              <input 
                                 autoFocus
                                 type="text" 
                                 value={reservationClient}
                                 onChange={(e) => setReservationClient(e.target.value)}
                                 className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                 placeholder="Enter full name..."
                              />
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Purpose & Details</label>
                              <textarea 
                                 value={reservationNotes}
                                 onChange={(e) => setReservationNotes(e.target.value)}
                                 className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm h-24 resize-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                 placeholder="Additional notes for reservation..."
                              />
                           </div>
                        </>
                    ) : (
                        <>
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Event Name</label>
                              <div className="relative">
                                <input 
                                   autoFocus
                                   type="text" 
                                   list="event-suggestions"
                                   value={reservationEventName}
                                   onChange={(e) => setReservationEventName(e.target.value)}
                                   className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                   placeholder="Select or enter event name..."
                                />
                                <datalist id="event-suggestions">
                                   {events.map(evt => (
                                      <option key={evt.id} value={evt.title} />
                                   ))}
                                </datalist>
                              </div>
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Purpose & Details</label>
                              <textarea 
                                 value={reservationNotes}
                                 onChange={(e) => setReservationNotes(e.target.value)}
                                 className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm h-24 resize-none"
                                 placeholder="Additional notes for reservation..."
                              />
                           </div>
                        </>
                    )}
                 </div>
              )}

              {bulkActionModal.type === 'transfer' && (
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Destination Branch</label>
                    <select 
                       value={bulkActionValue}
                       onChange={(e) => setBulkActionValue(e.target.value)}
                       className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    >
                       <option value="">Select Branch...</option>
                       {branches.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                 </div>
              )}

              {bulkActionModal.type === 'delete' && (
                 <div className="p-4 bg-rose-50 text-rose-700 rounded-xl text-sm flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p>This action cannot be undone. The selected artworks will be permanently removed from the inventory.</p>
                 </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                 <button onClick={() => setBulkActionModal(null)} className="px-5 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-50">Cancel</button>
                 <button 
                    onClick={handleBulkActionSubmit}
                    disabled={
                       bulkActionModal.type === 'delete' ? false :
                       bulkActionModal.type === 'reserve' ? (
                          reservationTab === 'person' ? !reservationClient : !reservationEventName
                       ) : !bulkActionValue
                    }
                    className={`px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all ${
                       bulkActionModal.type === 'delete' 
                       ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-500/30' 
                       : bulkActionModal.type === 'reserve'
                       ? 'bg-amber-300 text-amber-900 hover:bg-amber-400 shadow-amber-500/20'
                       : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                 >
                    Confirm {bulkActionModal.type === 'sale' ? 'Sale' : bulkActionModal.type === 'delete' ? 'Delete' : bulkActionModal.type === 'reserve' ? 'Reservation' : 'Action'}
                 </button>
              </div>
           </div>
        </Modal>
      )}

      {/* Error Modal */}
      {errorModal && (
        <Modal onClose={() => setErrorModal(null)} title={errorModal.title}>
          <div className="space-y-4">
            <div className={`p-4 rounded-xl flex items-start gap-3 ${errorModal.onConfirm ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-700'}`}>
              <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
              <div className="text-sm whitespace-pre-line leading-relaxed">
                {errorModal.message}
              </div>
            </div>
            <div className="flex justify-end space-x-3">
               {errorModal.onConfirm && (
                   <button 
                     onClick={errorModal.onConfirm} 
                     className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
                   >
                     Yes, Proceed Anyway
                   </button>
               )}
               <button 
                 onClick={() => setErrorModal(null)} 
                 className={`px-6 py-2.5 rounded-xl font-bold transition-colors ${errorModal.onConfirm ? 'text-slate-600 hover:bg-slate-50' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
               >
                 {errorModal.onConfirm ? 'Cancel' : 'Okay, I understand'}
               </button>
            </div>
          </div>
        </Modal>
      )}

      {previewImageUrl && (
        <Modal onClose={() => setPreviewImageUrl(null)} title="Artwork Image">
          <div className="space-y-4">
            <img src={previewImageUrl} className="w-full max-h-[80vh] object-contain rounded-xl border border-slate-200" alt="Artwork" />
            <div className="flex justify-end space-x-3">
              <button onClick={() => setPreviewImageUrl(null)} className="px-6 py-2.5 rounded-xl text-slate-600 font-medium">Close</button>
              <button onClick={() => {
                const w = window.open('', '_blank');
                if (!w) return;
                w.document.write(`<html><head><title>Artwork</title></head><body style="margin:0"><img src="${previewImageUrl}" style="max-width:100%;height:auto;display:block"/></body></html>`);
                w.document.close();
                w.focus();
                w.onload = () => w.print();
              }} className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-200">Print</button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};

const Modal: React.FC<{ children: React.ReactNode, onClose: () => void, title: string }> = ({ children, onClose, title }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
      <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white"><h3 className="text-lg font-bold text-slate-800">{title}</h3><button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XCircle /></button></div>
      <div className="p-8">{children}</div>
    </div>
  </div>
);

// FIX: Added missing StatusBadge component used on line 253
const StatusBadge: React.FC<{ status: ArtworkStatus }> = ({ status }) => {
  const styles = {
    [ArtworkStatus.AVAILABLE]: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    [ArtworkStatus.RESERVED]: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    [ArtworkStatus.SOLD]: 'bg-rose-100 text-rose-700 border-rose-200',
    [ArtworkStatus.DELIVERED]: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    [ArtworkStatus.CANCELLED]: 'bg-slate-200 text-slate-700 border-slate-300',
  };
  return <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border shadow-sm ${styles[status]}`}>{status}</span>;
};

export default Inventory;
