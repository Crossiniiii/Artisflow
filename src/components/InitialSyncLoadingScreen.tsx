import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, Database, CheckCircle2 } from 'lucide-react';

interface InitialSyncLoadingScreenProps {
  isLoadingArtworks: boolean;
  isLoadingUsers: boolean;
  isLoadingEvents: boolean;
  isLoadingSales: boolean;
  syncError: string | null;
  isProgressive?: boolean;
}

const InitialSyncLoadingScreen: React.FC<InitialSyncLoadingScreenProps> = ({
  isLoadingArtworks,
  isLoadingUsers,
  isLoadingEvents,
  isLoadingSales,
  syncError,
  isProgressive = false
}) => {
  const [showLongWaitMessage, setShowLongWaitMessage] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLongWaitMessage(true);
    }, 5000); // Show "taking longer than expected" after 5s

    return () => clearTimeout(timer);
  }, []);

  if (syncError) {
    return (
      <div className="fixed inset-0 bg-neutral-50 flex items-center justify-center p-4 z-[9999]">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 border border-neutral-100 text-center">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 mb-2">Sync Error</h2>
          <p className="text-neutral-600 mb-6">{syncError}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const Step = ({ label, isLoading }: { label: string, isLoading: boolean }) => (
    <div className="flex items-center gap-3 py-2 border-b border-neutral-50 last:border-0">
      <div className={`w-5 h-5 flex items-center justify-center rounded-full ${isLoading ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
        {isLoading ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <CheckCircle2 size={12} />
        )}
      </div>
      <span className={`text-sm ${isLoading ? 'text-neutral-900 font-medium' : 'text-neutral-500'}`}>
        {label}
      </span>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-neutral-50 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 border border-neutral-100">
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400">
              <Database size={28} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-neutral-100">
               <Loader2 size={16} className="text-indigo-600 animate-spin" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-neutral-900">
            {isProgressive && !isLoadingUsers ? 'Accessing Dashboard' : 'Synchronizing'}
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            {isProgressive && !isLoadingUsers 
              ? 'Finalizing your session...' 
              : 'Downloading latest data...'}
          </p>
        </div>

        <div className="bg-neutral-50 rounded-xl p-4 mb-6">
          <Step label="Artworks Database" isLoading={isLoadingArtworks} />
          <Step label="User Accounts" isLoading={isLoadingUsers} />
          <Step label="Events & Exhibitions" isLoading={isLoadingEvents} />
          <Step label="Sales Records" isLoading={isLoadingSales} />
        </div>

        {showLongWaitMessage && (
          <p className="text-xs text-center text-neutral-400 animate-pulse">
            This is taking longer than usual. Please wait...
          </p>
        )}
        
        <div className="text-center mt-6">
            <p className="text-[10px] text-neutral-300 uppercase tracking-widest font-semibold">Artisflow Secure Sync</p>
        </div>
      </div>
    </div>
  );
};

export default InitialSyncLoadingScreen;
