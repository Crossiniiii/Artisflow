
import React, { useState } from 'react';
import { Artwork, SaleRecord } from '../types';
import { Download, Printer, ArrowLeft, X, ShieldCheck, MapPin, Calendar, User, Package } from 'lucide-react';

interface GatePassModalProps {
  artwork: Artwork;
  sale: SaleRecord;
  onClose: () => void;
}

const GatePassModal: React.FC<GatePassModalProps> = ({ artwork, sale, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('printable-gatepass');
    if (!element) return;

    setIsGenerating(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#faf9f8',
        logging: false,
        useCORS: true,
        allowTaint: true
      });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Gate-Pass-${artwork.code}.pdf`);
    } catch (err) {
      console.error("PDF Generation failed", err);
      alert("Failed to generate PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#323130]/80 backdrop-blur-md p-4 overflow-y-auto print:p-0 print:bg-white transition-all">
      <div className="bg-[#faf9f8] w-full max-w-2xl shadow-2xl rounded-sm overflow-hidden animate-in zoom-in fade-in duration-300 print:shadow-none print:w-[8.5in] print:mx-auto relative border border-[#edebe9]">
        <div className="sticky top-0 z-20 px-8 py-4 bg-[#faf9f8] flex justify-between items-center border-b border-[#edebe9] print:hidden">
          <div className="flex items-center space-x-4">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-[#edebe9] rounded-md transition-colors text-[#323130]"
              title="Back"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h3 className="text-[10px] font-black text-[#323130] uppercase tracking-[0.2em] leading-none">Gate Pass Authority</h3>
              <p className="text-[9px] text-[#605e5c] uppercase font-bold mt-1">Asset Release Documentation</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="bg-white border border-[#edebe9] text-[#323130] px-4 py-2 rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-[#edebe9] transition-all flex items-center space-x-2"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="bg-[#323130] text-white px-4 py-2 rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              <Download size={14} />
              <span>{isGenerating ? 'Generating...' : 'Save PDF'}</span>
            </button>
            <div className="w-px h-6 bg-[#edebe9] mx-1"></div>
            <button onClick={onClose} className="text-[#605e5c] hover:text-[#323130] transition-colors p-1">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Gate Pass Content */}
        <div 
          className="p-12 relative flex flex-col bg-[#faf9f8] min-h-[800px] print:p-12 print:min-h-0 mx-auto transition-all" 
          id="printable-gatepass"
        >
          {/* Header Section */}
          <div className="flex justify-between items-start mb-12 border-b-2 border-[#323130] pb-8">
            <div className="space-y-4">
              <div className="bg-[#323130] text-white px-4 py-2 inline-block">
                <h1 className="text-xl font-black uppercase tracking-[0.3em]">Gate Pass</h1>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-black text-[#323130] uppercase tracking-widest">Galerie Joaquin Registry</p>
                <p className="text-[9px] text-[#605e5c] font-bold uppercase tracking-widest">Administrative Control Office</p>
              </div>
            </div>
            <div className="text-right space-y-2">
              <div className="text-[10px] font-black text-[#a19f9d] uppercase tracking-widest">Pass ID</div>
              <div className="text-lg font-black text-[#323130] tracking-tighter">GP-{artwork.code}-{new Date().getTime().toString().slice(-6)}</div>
              <div className="text-[9px] font-bold text-[#605e5c] uppercase">{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
          </div>

          {/* Asset Section */}
          <div className="grid grid-cols-3 gap-8 mb-12">
            <div className="col-span-1">
              <div className="aspect-square bg-white border border-[#edebe9] p-2 shadow-sm">
                <img 
                  src={artwork.imageUrl} 
                  alt={artwork.title} 
                  className="w-full h-full object-contain grayscale-[0.2]"
                  crossOrigin="anonymous"
                />
              </div>
            </div>
            <div className="col-span-2 space-y-6">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-[#a19f9d] uppercase tracking-widest">Asset Identification</label>
                <h2 className="text-2xl font-black text-[#323130] uppercase tracking-tight leading-none">{artwork.title}</h2>
                <p className="text-sm font-bold text-[#605e5c] uppercase">{artwork.artist}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-[#a19f9d] uppercase tracking-widest">Registry Code</label>
                  <p className="text-xs font-black text-[#323130] uppercase">{artwork.code}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-[#a19f9d] uppercase tracking-widest">Asset Type</label>
                  <p className="text-xs font-black text-[#323130] uppercase">{artwork.medium || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Authorization Details */}
          <div className="space-y-8 mb-12 bg-white border border-[#edebe9] p-8 rounded-sm">
            <div className="flex items-center gap-3">
              <ShieldCheck size={16} className="text-[#323130]" />
              <h4 className="text-[10px] font-black text-[#323130] uppercase tracking-[0.2em]">Authorized Release Information</h4>
            </div>

            <div className="grid grid-cols-2 gap-y-8 gap-x-12">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-[#a19f9d] uppercase tracking-widest block border-b border-[#edebe9] pb-1">Client Destination</label>
                <div className="flex items-start gap-3">
                  <User size={14} className="text-[#605e5c] mt-0.5" />
                  <p className="text-sm font-black text-[#323130] uppercase">{sale.clientName}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-[#a19f9d] uppercase tracking-widest block border-b border-[#edebe9] pb-1">Origin Branch</label>
                <div className="flex items-start gap-3">
                  <MapPin size={14} className="text-[#605e5c] mt-0.5" />
                  <p className="text-sm font-black text-[#323130] uppercase">{artwork.currentBranch}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-[#a19f9d] uppercase tracking-widest block border-b border-[#edebe9] pb-1">Release Protocol</label>
                <div className="flex items-start gap-3">
                  <Package size={14} className="text-[#605e5c] mt-0.5" />
                  <p className="text-xs font-bold text-[#605e5c] uppercase">{sale.isDelivered ? 'Official Logistics Delivery' : 'Authorized Client Pickup'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-[#a19f9d] uppercase tracking-widest block border-b border-[#edebe9] pb-1">Approval Timestamp</label>
                <div className="flex items-start gap-3">
                  <Calendar size={14} className="text-[#605e5c] mt-0.5" />
                  <p className="text-xs font-bold text-[#605e5c] uppercase">{new Date().toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Section */}
          <div className="mt-auto pt-12">
            <div className="grid grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="h-px bg-[#323130] w-full mb-2"></div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-[#323130] uppercase tracking-widest">Gallery Security Signature</p>
                  <p className="text-[8px] text-[#a19f9d] font-bold uppercase mt-1">Verification Required at Exit</p>
                </div>
              </div>
              <div className="space-y-8">
                <div className="h-px bg-[#323130] w-full mb-2"></div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-[#323130] uppercase tracking-widest">Authorized By</p>
                  <p className="text-[8px] text-[#a19f9d] font-bold uppercase mt-1">Registry Administration Office</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="mt-12 pt-6 border-t border-[#edebe9] text-center">
            <p className="text-[8px] text-[#a19f9d] font-medium tracking-tight leading-relaxed max-w-md mx-auto uppercase">
              This document authorizes the release of the asset listed above from the gallery premises. 
              Any unauthorized removal of assets is subject to legal prosecution.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #root, .fixed {
            background-color: white !important;
          }
          #printable-gatepass, #printable-gatepass * {
            visibility: visible;
          }
          #printable-gatepass {
            position: absolute;
            left: 0;
            top: 0;
            width: 8.5in;
            height: 11in;
            margin: 0;
            border: none;
            box-shadow: none;
            background-color: #faf9f8 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default GatePassModal;
