import React, { useState, useEffect, useMemo, useRef } from 'react';
import { utils, writeFile } from 'xlsx';
import {
  Artwork,
  SaleRecord,
  TransferRecord,
  ReturnRecord,
  MonitoringSummary,
  InventoryTransaction,
  ArtworkStatus
} from '../types';
import { supabase } from '../supabase';
import { mapToSnakeCase, mapFromSnakeCase } from '../utils/supabaseUtils';
import { generateUUID } from '../utils/idUtils';
import { 
  Calculator, Calendar, FileText, Trash2, ChevronDown, ChevronUp, Printer, 
  CheckCircle, Check, AlertCircle, Download, FileSpreadsheet, ImageIcon, 
  Edit, Save, Plus, X, Minus, Loader2, ArrowLeft, Filter, Shield, RotateCcw, ShoppingBag
} from 'lucide-react';

interface MonitoringSummaryPageProps {
  artworks: Artwork[];
  sales: SaleRecord[];
  transfers: TransferRecord[];
  returns: ReturnRecord[];
  currentUser: any;
  onBack?: () => void;
  permissions?: any;
}

const ExportDropdown = React.memo(({ onExportExcel, onExportPDF, onExportImage }: { onExportExcel: () => void, onExportPDF: () => void, onExportImage: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative z-20" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center space-x-2 bg-white border border-neutral-200 text-neutral-700 px-4 py-2 rounded-md hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-300 transition-all shadow-sm hover:shadow-md font-bold text-sm"
        title="Export Options"
      >
        <Download size={16} />
        <span className="hidden sm:inline">Export</span>
        <ChevronDown size={14} className={`ml-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-neutral-100 rounded-md shadow-xl shadow-neutral-200/50 p-2 z-50 animate-in fade-in zoom-in-95 duration-75">
          <button
            onClick={() => { setIsOpen(false); onExportExcel(); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 font-bold rounded-md transition-colors text-sm"
          >
            <FileSpreadsheet size={16} />
            <span>Excel Report</span>
          </button>
          <button
            onClick={() => { setIsOpen(false); onExportPDF(); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 font-bold rounded-md transition-colors text-sm"
          >
            <FileText size={16} />
            <div className="flex flex-col items-start text-left">
              <span>PDF Document</span>
              <span className="text-[10px] text-neutral-400 font-normal">A4 / Long Bond</span>
            </div>
          </button>
          <button
            onClick={() => { setIsOpen(false); onExportImage(); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 font-bold rounded-md transition-colors text-sm"
          >
            <ImageIcon size={16} />
            <div className="flex flex-col items-start text-left">
              <span>Image Capture</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
});

const MonitoringSummaryPage: React.FC<MonitoringSummaryPageProps> = ({
  artworks,
  sales,
  transfers,
  returns,
  currentUser,
  onBack,
  permissions: propPermissions
}) => {
  // Apply permissions filter
  const permissions = propPermissions || currentUser?.permissions;
  const filteredArtworks = useMemo(() => {
    return (artworks || []).filter(art => {
      // View Control Permissions
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

  const [currentSummary, setCurrentSummary] = useState<MonitoringSummary | null>(null);
  const [isTallyModalOpen, setIsTallyModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dashboard State
  const [allSummaries, setAllSummaries] = useState<MonitoringSummary[]>([]);
  const [filterMonth, setFilterMonth] = useState<number | 'all'>('all');
  const [filterYear, setFilterYear] = useState<number | 'all'>('all');
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);

  // Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
  const [deleteAction, setDeleteAction] = useState<'single' | 'bulk'>('single');

  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editingSummary, setEditingSummary] = useState<MonitoringSummary | null>(null);

  const activeSummary = isEditing ? editingSummary : currentSummary;

  // Load dashboard data on mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Derived state for filtered summaries
  const filteredSummaries = useMemo(() => {
    let result = [...allSummaries];
    if (filterMonth !== 'all') {
      result = result.filter(s => s.month === filterMonth);
    }
    if (filterYear !== 'all') {
      result = result.filter(s => s.year === filterYear);
    }
    // Sort by date desc (newest first)
    result.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
    return result;
  }, [allSummaries, filterMonth, filterYear]);

  const loadDashboardData = async () => {
    setIsLoadingDashboard(true);
    try {
      const { data, error } = await supabase
        .from('monitoring_summaries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      const summaries = mapFromSnakeCase(data || []) as MonitoringSummary[];
      setAllSummaries(summaries);
    } catch (err) {
      console.error("Error loading dashboard:", err);
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  const handleDeleteSummary = () => {
    if (!currentSummary) return;
    setDeleteAction('single');
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteSingle = async () => {
    if (!currentSummary) return;
    try {
      const { error } = await supabase.from('monitoring_summaries').delete().eq('id', currentSummary.id);
      if (error) throw error;
      
      setCurrentSummary(null);
      setIsEditing(false);
      setEditingSummary(null);
      loadDashboardData(); // Refresh dashboard
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error('Error deleting summary:', error);
      alert('Failed to delete summary: ' + (error as any).message);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    setDeleteAction('bulk');
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteBulk = async () => {
    setIsLoadingDashboard(true);
    try {
      const { error } = await supabase.from('monitoring_summaries').delete().in('id', Array.from(selectedIds));
      if (error) throw error;

      setSelectedIds(new Set());
      setIsSelectionMode(false);
      loadDashboardData();
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      console.error("Error deleting summaries:", err);
      alert("Failed to delete some summaries: " + err.message);
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  const handleConfirmPhysicalCheck = () => {
    if (!currentSummary) return;
    setIsCheckModalOpen(true);
  };

  const executePhysicalCheckConfirmation = async () => {
    if (!currentSummary) return;

    try {
      const updateData = {
        isPhysicalCheckConfirmed: true,
        physicalCheckConfirmedAt: new Date().toISOString(),
        physicalCheckConfirmedBy: currentUser?.name || 'Unknown'
      };

      const { error } = await supabase.from('monitoring_summaries').update(mapToSnakeCase(updateData)).eq('id', currentSummary.id);
      if (error) throw error;

      const updatedSummary = {
        ...currentSummary,
        ...updateData
      };
      setCurrentSummary(updatedSummary);
      setAllSummaries(prev => prev.map(s => s.id === updatedSummary.id ? updatedSummary : s));

      setIsCheckModalOpen(false);
    } catch (error) {
      console.error("Error confirming physical check:", error);
      alert("Failed to confirm physical check.");
    }
  };

  const handleUndoPhysicalCheck = async () => {
    if (!currentSummary) return;
    if (!window.confirm("Are you sure you want to undo the verification?")) return;

    try {
      const updateData = {
        isPhysicalCheckConfirmed: false,
        physicalCheckConfirmedAt: undefined,
        physicalCheckConfirmedBy: undefined
      };

      const { error } = await supabase.from('monitoring_summaries').update(mapToSnakeCase(updateData)).eq('id', currentSummary.id);
      if (error) throw error;

      const updatedSummary = {
        ...currentSummary,
        ...updateData
      };

      setCurrentSummary(updatedSummary);
      setAllSummaries(prev => prev.map(s => s.id === updatedSummary.id ? updatedSummary : s));
    } catch (error) {
      console.error("Error undoing physical check:", error);
      alert("Failed to undo physical check.");
    }
  };

  const recalculateTotals = (summary: MonitoringSummary): MonitoringSummary => {
    const totalItemsIn = summary.itemsIn.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const totalItemsOutSold = summary.itemsOutSold.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const totalItemsOutTransfer = summary.itemsOutTransfer.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

    const beginningInventory = Number(summary.beginningInventory) || 0;
    const soldPiecesStillInGallery = Number(summary.soldPiecesStillInGallery) || 0;

    const availableInventory = beginningInventory + totalItemsIn - totalItemsOutSold - totalItemsOutTransfer;
    const totalInventory = availableInventory + soldPiecesStillInGallery;

    return {
      ...summary,
      totalItemsIn,
      totalItemsOutSold,
      totalItemsOutTransfer,
      availableInventory,
      totalInventory
    };
  };

  const handleAddSummary = async () => {
    const summaryId = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase.from('monitoring_summaries').select('*').eq('id', summaryId).single();

      let summaryToLoad: MonitoringSummary;

      if (data) {
        summaryToLoad = mapFromSnakeCase(data) as MonitoringSummary;
        setCurrentSummary(summaryToLoad);
        setEditingSummary(JSON.parse(JSON.stringify(summaryToLoad)));
        setIsEditing(true);
      } else {
        // Init new report (Empty Format)
        const newSummary: MonitoringSummary = {
          id: summaryId,
          month: selectedMonth,
          year: selectedYear,
          createdAt: new Date().toISOString(),
          createdBy: currentUser?.name || 'System',
          beginningInventory: 0,
          totalItemsIn: 0,
          totalItemsOutSold: 0,
          totalItemsOutTransfer: 0,
          availableInventory: 0,
          soldPiecesStillInGallery: 0,
          totalInventory: 0,
          itemsIn: [],
          itemsOutSold: [],
          itemsOutTransfer: []
        };
        // We don't save yet, just set local state
        setCurrentSummary(newSummary);
        setEditingSummary(newSummary);
        setIsEditing(true);
      }
      setIsTallyModalOpen(false);
    } catch (err: any) {
      console.error("Error loading summary:", err);
      setError("Failed to load summary: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditReport = () => {
    if (!currentSummary) return;
    setEditingSummary(JSON.parse(JSON.stringify(currentSummary))); // Deep copy
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (window.confirm('Discard unsaved changes?')) {
      setIsEditing(false);
      setEditingSummary(null);
      // If we were creating a new one (currentSummary might not exist in DB yet), 
      // check if it exists in allSummaries to determine if we should go back to dashboard
      const exists = allSummaries.find(s => s.id === currentSummary?.id);
      if (!exists) {
        setCurrentSummary(null); // Go back to dashboard
      }
    }
  };

  const handleBackToDashboard = () => {
    if (isEditing) {
      if (window.confirm('Discard unsaved changes?')) {
        setIsEditing(false);
        setEditingSummary(null);
        setCurrentSummary(null);
      }
    } else {
      setCurrentSummary(null);
    }
  };

  const handleSaveReport = async () => {
    if (!editingSummary) return;
    setIsLoading(true);
    setError(null);

    try {
      const finalSummary = recalculateTotals(editingSummary);
      
      const { error } = await supabase
        .from('monitoring_summaries')
        .upsert(mapToSnakeCase(finalSummary));

      if (error) throw error;

      setIsEditing(false);
      setEditingSummary(null);
      setCurrentSummary(finalSummary);
      await loadDashboardData(); // Refresh list
    } catch (err: any) {
      console.error('Error saving summary:', err);
      setError('Failed to save summary: ' + err.message);
      alert('Failed to save summary: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: keyof MonitoringSummary, value: any) => {
    if (!editingSummary) return;
    const updated = { ...editingSummary, [field]: value };
    setEditingSummary(recalculateTotals(updated));
  };

  const updateRow = (section: 'itemsIn' | 'itemsOutSold' | 'itemsOutTransfer', index: number, field: keyof InventoryTransaction, value: any) => {
    if (!editingSummary) return;
    const list = [...editingSummary[section]];
    list[index] = { ...list[index], [field]: value };
    const updated = { ...editingSummary, [section]: list };
    setEditingSummary(recalculateTotals(updated));
  };

  const addRow = (section: 'itemsIn' | 'itemsOutSold' | 'itemsOutTransfer') => {
    if (!editingSummary) return;
    const newRow: InventoryTransaction = {
      id: generateUUID(),
      date: new Date().toISOString().split('T')[0],
      type: section === 'itemsIn' ? 'IN' : section === 'itemsOutSold' ? 'SOLD' : 'PULLOUT',
      quantity: 1,
      referenceNo: '',
      clientBranch: '',
      artworkTitle: '',
      artworkCode: '',
      artworkId: ''
    };
    const updated = { ...editingSummary, [section]: [...editingSummary[section], newRow] };
    setEditingSummary(recalculateTotals(updated));
  };

  const removeRow = (section: 'itemsIn' | 'itemsOutSold' | 'itemsOutTransfer', index: number) => {
    if (!editingSummary) return;
    const list = [...editingSummary[section]];
    list.splice(index, 1);
    const updated = { ...editingSummary, [section]: list };
    setEditingSummary(recalculateTotals(updated));
  };

  const getMonthName = (m: number) => {
    return new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' });
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = () => {
    if (!currentSummary) return;
    setIsExporting(true);

    setTimeout(() => {
      try {
        const workbook = utils.book_new();

        // Sheet 1: Summary Overview
        const summaryData = [
          ['Monitoring Summary Report'],
          ['Period', `${getMonthName(currentSummary.month)} ${currentSummary.year}`],
          ['Generated By', currentSummary.createdBy],
          ['Date Generated', new Date(currentSummary.createdAt).toLocaleDateString()],
          ['Reference ID', currentSummary.id],
          [''],
          ['METRICS', 'VALUE'],
          ['Beginning Inventory', currentSummary.beginningInventory],
          ['Total Items In', currentSummary.totalItemsIn],
          ['Total Items Out (Sold)', currentSummary.totalItemsOutSold],
          ['Total Items Out (Transfer)', currentSummary.totalItemsOutTransfer],
          ['Available Inventory', currentSummary.availableInventory],
          ['Sold Pieces (Still In Gallery)', currentSummary.soldPiecesStillInGallery],
          ['Total Inventory', currentSummary.totalInventory]
        ];
        const wsSummary = utils.aoa_to_sheet(summaryData);
        utils.book_append_sheet(workbook, wsSummary, 'Summary Overview');

        // Helper to format rows
        const formatRows = (rows: InventoryTransaction[]) => rows.map(item => ({
          Date: item.date,
          'IT/DR #': item.referenceNo,
          'Client/Branch': item.clientBranch,
          'Quantity': item.quantity
        }));

        if (currentSummary.itemsIn.length > 0) {
          const wsIn = utils.json_to_sheet(formatRows(currentSummary.itemsIn));
          utils.book_append_sheet(workbook, wsIn, 'Items In');
        }

        if (currentSummary.itemsOutSold.length > 0) {
          const wsSold = utils.json_to_sheet(formatRows(currentSummary.itemsOutSold));
          utils.book_append_sheet(workbook, wsSold, 'Items Out (Sold)');
        }

        if (currentSummary.itemsOutTransfer.length > 0) {
          const wsTransfer = utils.json_to_sheet(formatRows(currentSummary.itemsOutTransfer));
          utils.book_append_sheet(workbook, wsTransfer, 'Items Out (Transfer)');
        }

        writeFile(workbook, `Monitoring_Summary_${getMonthName(currentSummary.month)}_${currentSummary.year}.xlsx`);
      } catch (error) {
        console.error("Export error", error);
        alert("Failed to generate Excel file.");
      } finally {
        setIsExporting(false);
      }
    }, 100);
  };

  const handleExportPDF = async () => {
    if (!currentSummary) return;
    setIsExporting(true);
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const element = document.getElementById('monitoring-report-content');
      if (!element) return;

      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: [612, 936]
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`Monitoring_Summary_${getMonthName(currentSummary.month)}_${currentSummary.year}.pdf`);

    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Could not export PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportImage = async () => {
    if (!currentSummary) return;
    setIsExporting(true);
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const element = document.getElementById('monitoring-report-content');
      if (!element) return;

      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(element, {
        scale: 1.25,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 1200
      });

      const link = document.createElement('a');
      link.download = `Monitoring_Summary_${getMonthName(currentSummary.month)}_${currentSummary.year}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

    } catch (error) {
      console.error('Error exporting image:', error);
      alert('Could not export image.');
    } finally {
      setIsExporting(false);
    }
  };

  const renderTransactionRow = (
    item: InventoryTransaction,
    idx: number,
    section: 'itemsIn' | 'itemsOutSold' | 'itemsOutTransfer'
  ) => {
    if (isEditing) {
      return (
        <div key={`${section}-${idx}`} className="grid grid-cols-12 border-b border-neutral-100 text-xs bg-white hover:bg-neutral-50 group transition-colors">
          <div className="col-span-1 px-3 py-2 border-r border-neutral-100 flex items-center justify-center">
            <button 
              onClick={() => removeRow(section, idx)} 
              className="text-neutral-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-all"
              title="Remove Row"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <div className="col-span-2 px-3 py-2 border-r border-neutral-100">
            <input
              type="date"
              value={item.date}
              onChange={(e) => updateRow(section, idx, 'date', e.target.value)}
              className="w-full bg-transparent focus:outline-none font-medium text-neutral-900"
            />
          </div>
          <div className="col-span-3 px-3 py-2 border-r border-neutral-100">
            <input
              type="text"
              value={item.referenceNo}
              onChange={(e) => updateRow(section, idx, 'referenceNo', e.target.value)}
              className="w-full bg-transparent focus:outline-none font-bold text-neutral-900 placeholder:neutral-300"
              placeholder="IT/DR #"
            />
          </div>
          <div className="col-span-5 px-3 py-2 border-r border-neutral-100">
            <input
              type="text"
              value={item.clientBranch}
              onChange={(e) => updateRow(section, idx, 'clientBranch', e.target.value)}
              className="w-full bg-transparent focus:outline-none font-medium text-neutral-600 placeholder:neutral-300"
              placeholder="Client/Branch Allocation"
            />
          </div>
          <div className="col-span-1 px-3 py-2">
            <input
              type="text"
              inputMode="numeric"
              value={item.quantity}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                updateRow(section, idx, 'quantity', Math.max(1, parseInt(val, 10) || 0));
              }}
              className="w-full bg-transparent focus:outline-none font-black text-neutral-900 text-center"
            />
          </div>
        </div>
      );
    }

    return (
      <div key={`${section}-${idx}`} className="grid grid-cols-12 border-b border-neutral-100 text-[11px] bg-white group hover:bg-neutral-50/50 transition-colors">
        <div className="col-span-1 px-3 py-2.5 border-r border-neutral-100 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-neutral-200 group-hover:bg-neutral-400 transition-colors" />
        </div>
        <div className="col-span-2 px-3 py-2.5 border-r border-neutral-100 text-neutral-500 font-medium">{item.date}</div>
        <div className="col-span-3 px-3 py-2.5 border-r border-neutral-100 text-neutral-900 font-bold tracking-tight">{item.referenceNo}</div>
        <div className="col-span-5 px-3 py-2.5 border-r border-neutral-100 text-neutral-600 font-medium truncate">{item.clientBranch || '-'}</div>
        <div className="col-span-1 px-3 py-2.5 text-center font-black text-neutral-900">{item.quantity}</div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            {!activeSummary && onBack && (
              <button
                onClick={onBack}
                className="bg-white border border-neutral-200 text-neutral-500 hover:text-neutral-900 p-2 rounded-md transition-colors shadow-sm"
                title="Back to Inventory"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
              <Calculator className="text-neutral-900" size={24} />
              Monitoring Summary
            </h1>
          </div>
          <p className="text-neutral-500 font-medium ml-12">Monthly inventory reports.</p>
        </div>

        <div className="flex items-center gap-2">
          {error && (
            <div className="mr-4 text-red-600 text-sm bg-red-50 px-3 py-1 rounded-sm border border-red-200">
              {error}
            </div>
          )}

          {activeSummary ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleBackToDashboard}
                className="bg-white border border-neutral-200 text-neutral-600 px-4 py-3 rounded-md font-bold hover:bg-neutral-50 transition-colors flex items-center gap-2"
              >
                <ArrowLeft size={18} />
                <span>Back</span>
              </button>

              {isEditing && (
                <>
                  <button
                    onClick={handleCancelEdit}
                    className="bg-white border border-neutral-200 text-neutral-600 px-6 py-3 rounded-md font-bold hover:bg-neutral-50 transition-colors flex items-center gap-2"
                  >
                    <X size={18} />
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={handleSaveReport}
                    className="bg-green-600 text-white px-6 py-3 rounded-md font-bold hover:bg-green-700 transition-colors flex items-center gap-2 shadow-lg shadow-green-600/20"
                  >
                    <Save size={18} />
                    <span>Save Report</span>
                  </button>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsTallyModalOpen(true)}
              className="bg-neutral-900 text-white px-6 py-3 rounded-md font-bold hover:bg-neutral-800 transition-colors flex items-center gap-2 shadow-lg shadow-neutral-900/20"
            >
              <Plus size={18} />
              <span>Add Summary</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden bg-white rounded-md border border-neutral-100 shadow-xl shadow-neutral-200/50">
        {activeSummary ? (
          <div className="flex-1 flex flex-col overflow-hidden overflow-x-auto custom-scrollbar">
            <div id="monitoring-report-content" className="flex-1 p-8 bg-white min-w-[800px]">
              {/* Report Header */}
              <div className="flex justify-between items-start mb-6 pb-6 border-b border-neutral-200">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-neutral-900 uppercase tracking-wide">INVENTORY MONITORING FORM</h2>
                    {activeSummary.isPhysicalCheckConfirmed && (
                      <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-sm text-xs font-bold border border-emerald-200">
                        <Shield size={14} className="fill-emerald-600 text-white" />
                        Verified by {activeSummary.physicalCheckConfirmedBy || 'Unknown'}
                      </span>
                    )}
                  </div>
                  <p className="text-neutral-600 mt-1">As of {getMonthName(activeSummary.month)} {activeSummary.year}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2" data-html2canvas-ignore="true">
                    {!isEditing && (
                      <>
                        <button
                          onClick={handleDeleteSummary}
                          className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          title="Delete this report"
                        >
                          <Trash2 size={16} />
                        </button>
                        <div className="h-6 w-px bg-neutral-200 mx-1"></div>
                        <button
                          onClick={handleEditReport}
                          className="flex items-center space-x-2 bg-neutral-100 text-neutral-700 px-4 py-2 rounded-md hover:bg-neutral-200 transition-colors font-bold text-sm"
                        >
                          <Edit size={16} />
                          <span>Edit Report</span>
                        </button>

                        {!activeSummary.isPhysicalCheckConfirmed ? (
                          <button
                            onClick={handleConfirmPhysicalCheck}
                            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors font-bold text-sm shadow-md shadow-indigo-600/20 ml-2"
                          >
                            <Shield size={16} />
                            <span>Confirm Physical Check</span>
                          </button>
                        ) : (
                          <button
                            onClick={handleUndoPhysicalCheck}
                            className="flex items-center space-x-2 bg-neutral-100 text-neutral-600 px-4 py-2 rounded-md hover:bg-neutral-200 hover:text-red-600 transition-colors font-bold text-sm ml-2"
                            title="Undo Verification"
                          >
                            <RotateCcw size={16} />
                            <span>Undo Verify</span>
                          </button>
                        )}
                      </>
                    )}
                    <div className="print:hidden">
                      <ExportDropdown
                        onExportExcel={handleExportExcel}
                        onExportPDF={handleExportPDF}
                        onExportImage={handleExportImage}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* PREMIUM REPORT LAYOUT */}
              <div className="bg-white rounded-2xl border border-neutral-100 shadow-xl overflow-hidden min-h-[800px] flex flex-col">
                {/* Header Section */}
                <div className="bg-neutral-900 px-10 py-12 text-white relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full -mr-32 -mt-32" />
                   <div className="relative z-10 flex justify-between items-end">
                      <div>
                        <div className="flex items-center gap-3 mb-2 opacity-60">
                           <Calculator size={14} />
                           <span className="text-[10px] font-black uppercase tracking-[0.3em]">Monthly Registry Summary</span>
                        </div>
                        <h2 className="text-4xl font-black tracking-tighter">
                           {getMonthName(activeSummary.month)} <span className="text-blue-400">{activeSummary.year}</span>
                        </h2>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Generated by</p>
                         <p className="text-sm font-bold">{activeSummary.createdBy}</p>
                      </div>
                   </div>
                </div>

                <div className="p-10 flex-1 flex flex-col">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-4 gap-6 mb-12">
                    {[
                      { label: 'Beginning Inventory', value: activeSummary.beginningInventory, icon: Calculator, editable: 'beginningInventory' },
                      { label: 'Total Items In', value: activeSummary.totalItemsIn, icon: Plus },
                      { label: 'Sold (In Gallery)', value: activeSummary.soldPiecesStillInGallery, icon: ShoppingBag, editable: 'soldPiecesStillInGallery' },
                      { label: 'Total Stock', value: activeSummary.totalInventory, icon: Shield, highlight: true }
                    ].map((stat, i) => (
                      <div key={i} className={`p-6 rounded-2xl border transition-all ${stat.highlight ? 'bg-neutral-900 border-neutral-900 text-white shadow-lg' : 'bg-neutral-50 shadow-sm border-neutral-100'}`}>
                        <div className="flex items-center gap-2 mb-3">
                           <stat.icon size={14} className={stat.highlight ? 'text-blue-400' : 'text-neutral-400'} />
                           <span className={`text-[10px] font-black uppercase tracking-widest ${stat.highlight ? 'opacity-60' : 'text-neutral-400'}`}>{stat.label}</span>
                        </div>
                        {isEditing && (stat as any).editable ? (
                          <input
                            type="text"
                            inputMode="numeric"
                            value={(editingSummary as any)[(stat as any).editable]}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => updateField((stat as any).editable as any, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
                            className={`w-full bg-transparent border-b ${stat.highlight ? 'border-white/20 focus:border-white' : 'border-neutral-200 focus:border-neutral-900'} focus:outline-none text-2xl font-black tracking-tight`}
                          />
                        ) : (
                          <p className="text-3xl font-black tracking-tighter">{stat.value}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Transactions Blocks */}
                  <div className="space-y-16">
                    {[
                      { title: 'Artworks Received', section: 'itemsIn' as const, color: 'bg-blue-600' },
                      { title: 'Artworks Released (Sales)', section: 'itemsOutSold' as const, color: 'bg-emerald-600' },
                      { title: 'Artworks Released (Transfers)', section: 'itemsOutTransfer' as const, color: 'bg-amber-600' }
                    ].map((block) => (
                      <div key={block.section} className="relative">
                         <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                               <div className={`w-1 h-6 rounded-full ${block.color}`} />
                               <h3 className="text-xs font-black text-neutral-900 uppercase tracking-[0.2em]">{block.title}</h3>
                            </div>
                            {isEditing && (
                              <button 
                                onClick={() => addRow(block.section)}
                                className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-neutral-800 transition-all hover:-translate-y-0.5 shadow-lg"
                              >
                                <Plus size={12} /> Add Entry
                              </button>
                            )}
                         </div>

                         <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden shadow-sm">
                            <div className="grid grid-cols-12 bg-neutral-50 border-b border-neutral-100 px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center">
                               <div className="col-span-1">Ref</div>
                               <div className="col-span-2 text-left">Date</div>
                               <div className="col-span-3 text-left">Document #</div>
                               <div className="col-span-5 text-left">Recipient / Branch</div>
                               <div className="col-span-1">Qty</div>
                            </div>
                            
                            {activeSummary[block.section].map((item, idx) => renderTransactionRow(item, idx, block.section))}
                            
                            {activeSummary[block.section].length === 0 && (
                              <div className="py-12 bg-white flex flex-col items-center justify-center gap-2 opacity-20">
                                 <ShoppingBag size={24} />
                                 <p className="text-[10px] font-black uppercase tracking-widest">No Movements recorded</p>
                              </div>
                            )}

                            <div className="grid grid-cols-12 bg-neutral-50 px-6 py-4 border-t border-neutral-100">
                               <div className="col-span-11 text-right">
                                  <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mr-6">Section Total</span>
                               </div>
                               <div className="col-span-1 text-center font-black text-neutral-900">
                                  {(activeSummary as any)[`total${block.section[0].toUpperCase()}${block.section.slice(1)}`]}
                                </div>
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="mt-20 pt-10 border-t border-neutral-100 flex flex-col items-center">
                     <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.3em] mb-4">Official Inventory Document</p>
                     <div className="flex items-center gap-2 text-xs font-bold text-neutral-300">
                        <span>AS OF</span>
                        <span className="text-neutral-900">
                          {new Date(activeSummary.year, activeSummary.month, 0).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col p-8">
            {/* Dashboard View */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-neutral-900">Saved Reports</h2>
                {filteredSummaries.length > 0 && (
                  <button
                    onClick={() => {
                      setIsSelectionMode(!isSelectionMode);
                      setSelectedIds(new Set());
                    }}
                    className={`text-sm font-bold px-3 py-1.5 rounded-lg transition-colors ${isSelectionMode
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                  >
                    {isSelectionMode ? 'Cancel Selection' : 'Select'}
                  </button>
                )}
                {isSelectionMode && selectedIds.size > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    className="text-sm font-bold px-3 py-1.5 rounded-md bg-red-100 text-red-600 hover:bg-red-200 transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={14} />
                    Delete ({selectedIds.size})
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                {/* Filters */}
                <div className="flex items-center gap-2 bg-neutral-100 p-1 rounded-xl">
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="bg-transparent text-sm font-bold text-neutral-600 px-3 py-1.5 focus:outline-none"
                  >
                    <option value="all">All Months</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{getMonthName(m)}</option>
                    ))}
                  </select>
                  <div className="w-px h-4 bg-neutral-300"></div>
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="bg-transparent text-sm font-bold text-neutral-600 px-3 py-1.5 focus:outline-none"
                  >
                    <option value="all">All Years</option>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {isLoadingDashboard ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2">
                <Loader2 className="animate-spin text-neutral-900" size={32} />
                <p className="text-neutral-500 font-medium">Loading reports...</p>
              </div>
            ) : filteredSummaries.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto">
                {filteredSummaries.map((summary) => (
                  <div
                    key={summary.id}
                    onClick={() => {
                      if (isSelectionMode) {
                        toggleSelection(summary.id);
                      } else {
                        setCurrentSummary(summary);
                      }
                    }}
                    className={`flex flex-col text-left bg-white border p-6 rounded-2xl transition-all group relative cursor-pointer ${isSelectionMode && selectedIds.has(summary.id)
                      ? 'border-blue-500 shadow-md ring-1 ring-blue-500 bg-blue-50/10'
                      : 'border-neutral-200 hover:border-neutral-900 hover:shadow-lg hover:shadow-neutral-900/5'
                      }`}
                  >
                    {isSelectionMode && (
                      <div className={`absolute top-4 right-4 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${selectedIds.has(summary.id)
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-neutral-300 bg-white'
                        }`}>
                        {selectedIds.has(summary.id) && <CheckCircle size={14} className="text-white" />}
                      </div>
                    )}

                    <div className="flex justify-between items-start w-full mb-4">
                      <div className="flex items-center gap-2">
                        <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                          {summary.year}
                        </div>
                        {summary.isPhysicalCheckConfirmed && (
                          <div className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                            <Shield size={12} className="fill-emerald-600 text-white" />
                            <span>Verified by {summary.physicalCheckConfirmedBy || 'Unknown'}</span>
                          </div>
                        )}
                      </div>
                      {!isSelectionMode && (
                        <FileText size={20} className="text-neutral-300 group-hover:text-neutral-900 transition-colors" />
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-neutral-900 mb-1">
                      {getMonthName(summary.month)}
                    </h3>
                    <div className="text-sm text-neutral-500 flex flex-col gap-1 mt-auto pt-4">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-300"></span>
                        Created by {summary.createdBy?.split(' ')[0] || 'System'}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs opacity-70">
                        {new Date(summary.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-neutral-300">
                <Calculator size={64} className="mb-4 opacity-20" />
                <p className="text-lg font-medium">No reports found.</p>
                <button
                  onClick={() => setIsTallyModalOpen(true)}
                  className="mt-4 bg-neutral-100 text-neutral-900 px-6 py-2 rounded-md font-bold hover:bg-neutral-200 transition-colors"
                >
                  Create New Report
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tally Modal */}
      {isTallyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-black mb-2">Create New Summary</h2>
            <p className="text-neutral-500 mb-6">Select the month and year for the report.</p>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2">Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full p-3 rounded-md border border-neutral-200 font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{getMonthName(m)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full p-3 rounded-md border border-neutral-200 font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsTallyModalOpen(false)}
                className="flex-1 py-3 font-bold text-neutral-500 hover:bg-neutral-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSummary}
                className="flex-1 py-3 bg-neutral-900 text-white font-bold rounded-md hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
                Create & Edit
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={32} />
              </div>
              <h2 className="text-2xl font-black text-neutral-900 mb-2">Confirm Deletion</h2>
              <p className="text-neutral-500">
                {deleteAction === 'bulk'
                  ? `Are you sure you want to permanently delete ${selectedIds.size} selected summaries? This action cannot be undone.`
                  : 'Are you sure you want to permanently delete this summary? This action cannot be undone.'
                }
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-3 font-bold text-neutral-500 hover:bg-neutral-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteAction === 'bulk' ? confirmDeleteBulk : confirmDeleteSingle}
                disabled={isLoadingDashboard}
                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
              >
                {isLoadingDashboard ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Physical Check Confirmation Modal */}
      {isCheckModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-4">
                <Shield size={32} />
              </div>
              <h2 className="text-2xl font-black text-neutral-900 mb-2">Confirm Physical Check</h2>
              <p className="text-neutral-500">
                Are you sure you want to confirm the physical inventory check? This will mark the report as verified and cannot be undone.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsCheckModalOpen(false)}
                className="flex-1 py-3 font-bold text-neutral-500 hover:bg-neutral-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executePhysicalCheckConfirmation}
                className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <Shield size={18} />
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonitoringSummaryPage;
