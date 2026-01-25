
import React, { useState } from 'react';
import { Artwork, SaleRecord } from '../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Download, Printer } from 'lucide-react';

interface CertificateModalProps {
  artwork: Artwork;
  sale: SaleRecord;
  onClose: () => void;
}

const CertificateModal: React.FC<CertificateModalProps> = ({ artwork, sale, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('printable-certificate');
    if (!element) return;
    
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(element, { 
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false
      });
      const imgData = canvas.toDataURL('image/png');
      
      // Calculate dimensions to fit A4 or similar, or just use image size
      // Using A4 portrait: 595.28 x 841.89 px at 72dpi
      // But we can just set the PDF to the image size for best fidelity
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Certificate-${artwork.code}.pdf`);
    } catch (err) {
      console.error("PDF Generation failed", err);
      alert("Failed to generate PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 overflow-y-auto print:p-0 print:bg-white print:backdrop-blur-none">
      <div className="bg-white w-full max-w-4xl shadow-2xl rounded-3xl overflow-hidden animate-in zoom-in fade-in duration-300 print:shadow-none print:rounded-none">
        <div className="px-8 py-4 bg-slate-100 flex justify-between items-center border-b border-slate-200 print:hidden">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Document Preview: Certificate of Sale</h3>
          <div className="flex items-center space-x-2">
            <button 
              onClick={handlePrint}
              className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5 flex items-center space-x-2"
              title="Print Certificate"
            >
              <Printer size={16} />
              <span>Print</span>
            </button>
            <button 
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center space-x-2 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
              title="Download as PDF"
            >
              <Download size={16} />
              <span>{isGenerating ? 'Generating...' : 'Save PDF'}</span>
            </button>
            <div className="w-px h-6 bg-slate-300 mx-2"></div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Certificate Content */}
        <div className="p-16 flex flex-col items-center text-center space-y-12 print:p-12" id="printable-certificate">
          <div className="space-y-4">
            <h1 className="text-4xl font-serif text-slate-900 uppercase tracking-[0.2em] italic">ArtisFlow</h1>
            <div className="h-0.5 w-48 bg-slate-200 mx-auto"></div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Global Gallery Systems | Certificate of Sale</p>
          </div>

          <div className="space-y-6">
            <p className="text-lg text-slate-600 font-serif italic">This document officially certifies the change of ownership for the following work of art:</p>
            
            <div className="py-8 space-y-2">
              <h2 className="text-5xl font-bold text-slate-900 font-serif">{artwork.title}</h2>
              <p className="text-xl text-slate-500 font-medium">{artwork.artist}, {artwork.year}</p>
            </div>

            <div className="grid grid-cols-2 gap-8 max-w-lg mx-auto text-sm border-y border-slate-100 py-8">
              <div className="text-left space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Medium</p>
                <p className="text-slate-800 font-medium">{artwork.medium}</p>
              </div>
              <div className="text-left space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dimensions</p>
                <p className="text-slate-800 font-medium">{artwork.dimensions}</p>
              </div>
              <div className="text-left space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Archive Code</p>
                <p className="text-slate-800 font-medium font-mono">{artwork.code}</p>
              </div>
              <div className="text-left space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acquisition Price</p>
                <p className="text-slate-800 font-bold">₱{artwork.price.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-base text-slate-600 font-serif italic">Successfully acquired by</p>
            <p className="text-3xl font-bold text-slate-900 border-b-2 border-slate-900 inline-block px-12 py-2">{sale.clientName}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-4">on this day {new Date(sale.saleDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          <div className="pt-12 grid grid-cols-2 gap-32 w-full max-w-2xl">
            <div className="flex flex-col items-center">
              <div className="w-full border-b border-slate-300 mb-2 py-4 italic font-serif text-slate-400">Digital Signature</div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Gallery Director</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full border-4 border-slate-100 flex items-center justify-center relative mb-2">
                 <div className="absolute inset-2 border border-slate-200 rounded-full flex items-center justify-center text-slate-200 font-black text-[10px] uppercase rotate-12">ArtisFlow Official</div>
                 <div className="font-serif text-2xl font-bold text-slate-300">AF</div>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Official Seal</p>
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-certificate, #printable-certificate * {
            visibility: visible;
          }
          #printable-certificate {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default CertificateModal;
