import React, { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileSpreadsheet, FileText, Image as ImageIcon } from 'lucide-react';

interface ExportDropdownProps {
  onExportExcel: () => void;
  onExportPDF: () => void;
  onExportImage: () => void;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({
  onExportExcel,
  onExportPDF,
  onExportImage,
  disabled = false,
  className = "",
  buttonClassName = ""
}) => {
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
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={buttonClassName || "flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-all duration-200 font-bold text-sm shadow-md shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"}
        title="Export Options"
      >
        <Download size={14} />
        <span className="hidden sm:inline">Export</span>
        <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.12)] z-[100] py-2 animate-in fade-in slide-in-from-top-2 border-slate-200/60 backdrop-blur-sm">
          <div className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] border-b border-slate-50 mb-1">
            Export Results As
          </div>
          <div className="px-1">
            <button
              onClick={() => { setIsOpen(false); onExportExcel(); }}
              className="w-full text-left px-3 py-2 rounded-md text-[11px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-all group uppercase tracking-wider"
            >
              <div className="w-9 h-9 rounded-md bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 group-hover:scale-110 transition-transform">
                <FileSpreadsheet size={18} />
              </div>
              <div>
                <div className="block">Excel Spreadsheet</div>
                <div className="text-[9px] font-medium text-slate-400 lowercase tracking-normal">Data extraction (.xlsx)</div>
              </div>
            </button>
            <button
              onClick={() => { setIsOpen(false); onExportPDF(); }}
              className="w-full text-left px-3 py-2 rounded-md text-[11px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-all group uppercase tracking-wider"
            >
              <div className="w-9 h-9 rounded-md bg-red-50 flex items-center justify-center text-red-600 border border-red-100 group-hover:scale-110 transition-transform">
                <FileText size={18} />
              </div>
              <div>
                <div className="block">PDF Document</div>
                <div className="text-[9px] font-medium text-slate-400 lowercase tracking-normal">Visual snapshot (.pdf)</div>
              </div>
            </button>
            <button
              onClick={() => { setIsOpen(false); onExportImage(); }}
              className="w-full text-left px-3 py-2 rounded-md text-[11px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-all group uppercase tracking-wider"
            >
              <div className="w-9 h-9 rounded-md bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 group-hover:scale-110 transition-transform">
                <ImageIcon size={18} />
              </div>
              <div>
                <div className="block">PNG Image</div>
                <div className="text-[9px] font-medium text-slate-400 lowercase tracking-normal">High-res capture (.png)</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
