
import React, { useState } from 'react';
import { Artwork, SaleRecord } from '../types';
import { Download, Printer, ArrowLeft, X } from 'lucide-react';

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
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#fdfbf7',
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
      pdf.save(`Certificate-Authenticity-${artwork.code}.pdf`);
    } catch (err) {
      console.error("PDF Generation failed", err);
      alert("Failed to generate PDF");
    } finally {
      setIsGenerating(false);
    }
  };


  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-900/90 backdrop-blur-md p-4 overflow-y-auto print:p-0 print:bg-white transition-all">
      <div className="bg-[#fdfbf7] w-full max-w-3xl shadow-2xl rounded-sm overflow-hidden animate-in zoom-in fade-in duration-300 print:shadow-none print:w-[8in] print:mx-auto relative">
        <div className="sticky top-0 z-20 px-4 sm:px-8 py-3 bg-neutral-100/95 backdrop-blur-sm flex justify-between items-center border-b border-neutral-200 print:hidden">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-neutral-200 rounded-full transition-colors text-neutral-600 flex items-center space-x-1"
              title="Back"
            >
              <ArrowLeft size={18} />
              <span className="hidden sm:inline text-xs font-bold">Back</span>
            </button>
            <h3 className="text-[9px] sm:text-[10px] font-bold text-neutral-500 uppercase tracking-widest leading-none truncate max-w-[150px] sm:max-w-none">Certificate Preview</h3>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={handlePrint}
              className="bg-white border border-neutral-200 text-neutral-700 px-3 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold hover:bg-neutral-50 transition-all shadow-sm flex items-center space-x-1 sm:space-x-2"
            >
              <Printer size={14} />
              <span className="hidden xs:inline">Print</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="bg-neutral-900 text-white px-3 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold hover:bg-black transition-all shadow-md flex items-center space-x-1 sm:space-x-2 disabled:opacity-50"
            >
              <Download size={14} />
              <span className="hidden xs:inline">{isGenerating ? 'Saving...' : 'Save PDF'}</span>
            </button>
            <div className="w-px h-5 bg-neutral-300 mx-1"></div>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 transition-colors p-1" title="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Certificate Content */}
        <div 
          className="p-6 sm:p-10 relative flex flex-col items-center bg-[#fdfbf7] min-h-[800px] sm:min-h-[920px] print:p-10 print:min-h-0 mx-auto transition-all" 
          id="printable-certificate"
          style={{ 
            backgroundImage: 'radial-gradient(#d4c4a8 0.5px, transparent 0.5px)', 
            backgroundSize: '40px 40px', 
            width: '100%',
            maxWidth: '720px' 
          }}
        >

          {/* Artwork Image Container */}
          <div className="relative mb-10 group flex justify-center w-full">
            <div className="bg-white p-3 shadow-lg border border-neutral-200/50 inline-block">
              <img 
                src={artwork.imageUrl} 
                alt={artwork.title} 
                className="max-h-[250px] w-auto object-contain"
                crossOrigin="anonymous"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/fdfbf7/c5a059?text=Artwork+Image';
                }}
              />
            </div>
          </div>

          {/* Main Title Area */}
          <div className="w-full max-w-xl text-center mb-5 sm:mb-6 transition-all">
            <h2 className="text-xl sm:text-2xl font-serif text-[#1a1a1a] mb-2 font-medium">Certificate of Authenticity</h2>
            <p className="text-[8px] sm:text-[10px] text-neutral-500 font-serif italic border-t border-neutral-200/60 pt-2 mx-auto inline-block">
              This is to certify the Authenticity of the Artwork as properly described below:
            </p>
          </div>
          
          {/* Middle Watermark - Positioned behind the details */}
          <div className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 -z-0 opacity-[0.03] select-none pointer-events-none w-full text-center overflow-hidden">
            <h3 className="text-5xl md:text-6xl font-serif font-black tracking-[0.15em] whitespace-nowrap uppercase">GALERIE JOAQUIN</h3>
          </div>

          {/* Detail List */}
          <div className="w-full max-w-lg space-y-2 sm:space-y-3 mb-6 sm:mb-8 sm:pl-4 relative z-10 transition-all">
            {[
              { label: 'Title:', value: artwork.title.toUpperCase(), isSerif: true },
              { label: 'Artist:', value: artwork.artist, isSerif: true },
              { label: 'Size:', value: artwork.dimensions },
              { label: 'Medium:', value: artwork.medium },
              { label: 'Code:', value: artwork.code },
              { label: 'Remarks:', value: '' },
            ].map((detail, idx) => (
              <div key={idx} className="flex items-baseline group py-0.5">
                <span className="w-20 sm:w-24 text-[8px] sm:text-[9px] font-bold text-neutral-400 uppercase tracking-[0.2em]">{detail.label}</span>
                <div className="flex-1 flex items-baseline border-b border-neutral-100/40 pb-0.5">
                  <span className="text-[13px] sm:text-[15px] text-neutral-800 font-serif font-medium tracking-wide truncate">
                    {detail.value}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="relative w-full text-center mt-4 mb-10">
            
            <div className="relative z-10 space-y-10">
               <div className="space-y-1">
                 <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Provenance:</p>
                 <p className="text-[12px] text-neutral-600 font-serif italic">This artwork is guaranteed original and officially documented in the gallery’s master registry.</p>
               </div>

               <div className="flex flex-col items-center">
                 <p className="text-[13px] text-neutral-800 font-serif mb-1">
                   <span className="font-bold">Date Issued:</span> {new Date(sale.saleDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                 </p>
                 
                 <div className="mt-12 flex flex-col items-center">
                   <div className="w-64 h-[0.5px] bg-neutral-300"></div>
                   <p className="mt-2 text-[10px] font-bold text-neutral-600 uppercase tracking-widest leading-normal">
                     Mr. Jack M. Teotico / Galerie Joaquin
                   </p>
                 </div>
               </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="mt-auto pt-6 border-t border-neutral-200/50 w-full text-center">
            <p className="text-[8px] text-neutral-400 font-medium tracking-tight leading-relaxed max-w-md mx-auto">
              2/F, #371 P.Guevarra St. cor. Montessori Lane, Addition Hills, San Juan, Metro Manila, Philippines<br />
              Tel (+632) 8723 9253 | Email: info@galeriejoaquin.com<br />
              <span className="text-[#c5a059] font-bold">www.galeriejoaquin.com</span>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @font-face {
          font-family: 'Signature';
          src: local('Cursive');
        }
        @media print {
          body * {
            visibility: hidden;
          }
          #root, .fixed {
            background-color: white !important;
          }
          #printable-certificate, #printable-certificate * {
            visibility: visible;
          }
          #printable-certificate {
            position: absolute;
            left: 0;
            top: 0;
            width: 8in;
            height: 10in;
            margin: 0;
            border: none;
            box-shadow: none;
            background-color: #fdfbf7 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-certificate {
          animation: fadeIn 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default CertificateModal;
