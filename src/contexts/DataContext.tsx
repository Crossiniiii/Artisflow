import React, { createContext, useContext, ReactNode } from 'react';
import { useDataSync } from '../hooks/useDataSync';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';
import {
  Artwork, SaleRecord, TransferRequest, ActivityLog, UserAccount,
  ExhibitionEvent, InventoryAudit, AppNotification, ImportRecord,
  ReturnRecord, FramerRecord, TransferRecord, Conversation, ChatMessage
} from '../types';

interface DataContextType {
  artworks: Artwork[];
  allArtworksIncludingDeleted: Artwork[];
  setArtworks: React.Dispatch<React.SetStateAction<Artwork[]>>;
  setAllArtworksIncludingDeleted: React.Dispatch<React.SetStateAction<Artwork[]>>;
  sales: SaleRecord[];
  setSales: React.Dispatch<React.SetStateAction<SaleRecord[]>>;
  branches: string[];
  setBranches: React.Dispatch<React.SetStateAction<string[]>>;
  branchAddresses: Record<string, string>;
  setBranchAddresses: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  branchCategories: Record<string, string>;
  setBranchCategories: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  branchLogos: Record<string, string>;
  setBranchLogos: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  exclusiveBranches: string[];
  setExclusiveBranches: React.Dispatch<React.SetStateAction<string[]>>;
  syncError: string | null;
  setSyncError: React.Dispatch<React.SetStateAction<string | null>>;
  logs: ActivityLog[];
  setLogs: React.Dispatch<React.SetStateAction<ActivityLog[]>>;
  accounts: UserAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  isLoadingArtworks: boolean;
  setIsLoadingArtworks: React.Dispatch<React.SetStateAction<boolean>>;
  isLoadingSales: boolean;
  setIsLoadingSales: React.Dispatch<React.SetStateAction<boolean>>;
  isLoadingEvents: boolean;
  setIsLoadingEvents: React.Dispatch<React.SetStateAction<boolean>>;
  isLoadingUsers: boolean;
  setIsLoadingUsers: React.Dispatch<React.SetStateAction<boolean>>;
  transferRequests: TransferRequest[];
  setTransferRequests: React.Dispatch<React.SetStateAction<TransferRequest[]>>;
  transfers: TransferRecord[];
  setTransfers: React.Dispatch<React.SetStateAction<TransferRecord[]>>;
  events: ExhibitionEvent[];
  setEvents: React.Dispatch<React.SetStateAction<ExhibitionEvent[]>>;
  audits: InventoryAudit[];
  setAudits: React.Dispatch<React.SetStateAction<InventoryAudit[]>>;
  importLogs: ImportRecord[];
  setImportLogs: React.Dispatch<React.SetStateAction<ImportRecord[]>>;
  preventDuplicateImports: boolean;
  setPreventDuplicateImports: React.Dispatch<React.SetStateAction<boolean>>;
  notifications: AppNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  returnRecords: ReturnRecord[];
  setReturnRecords: React.Dispatch<React.SetStateAction<ReturnRecord[]>>;
  framerRecords: FramerRecord[];
  setFramerRecords: React.Dispatch<React.SetStateAction<FramerRecord[]>>;
  conversations: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { activeTab, selectedArtworkId } = useUI();
  
  const data = useDataSync({ activeTab, currentUser, selectedArtworkId });

  return (
    <DataContext.Provider value={data}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
