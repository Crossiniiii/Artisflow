
export enum UserRole {
  INVENTORY_PERSONNEL = 'Inventory Personnel',
  SALES_AGENT = 'Sales Agent',
  ADMIN = 'Admin',
  EXCLUSIVE = 'Exclusive'
}

export enum ArtworkStatus {
  AVAILABLE = 'Available',
  RESERVED = 'Reserved',
  SOLD = 'Sold',
  DELIVERED = 'Delivered',
  CANCELLED = 'Cancelled',
  EXCLUSIVE_VIEW_ONLY = 'View Only (Exclusive)'
}

export const isInTransitStatus = (status: ArtworkStatus) => status === ArtworkStatus.SOLD;

export type Branch = string;

export enum EventStatus {
  LIVE = 'Live',
  UPCOMING = 'Upcoming',
  RECENT = 'Recent'
}

export type EventType = 'Exhibition' | 'Auction';

export interface ExhibitionEvent {
  id: string;
  title: string;
  location: Branch;
  startDate: string;
  endDate: string;
  status: EventStatus;
  artworkIds: string[];
  type?: EventType;
}

export interface UserPermissions {
  canAddArtwork: boolean;
  canEditArtwork: boolean;
  canManageAccounts: boolean;
  canManageEvents: boolean;
  canAccessCertificate: boolean;
  canAttachITDR: boolean;
  canDeleteArtwork: boolean;
  canSellArtwork: boolean;
  canReserveArtwork: boolean;
  canTransferArtwork: boolean;
  canViewSalesHistory: boolean;
  accessibleTabs?: string[];
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
  lastLogin: string;
  firstName?: string;
  fullName?: string;
  position?: string;
  password?: string;
  permissions?: UserPermissions;
  branch?: Branch;
}

export interface Artwork {
  id: string;
  code: string;
  title: string;
  artist: string;
  medium: string;
  dimensions: string;
  year: string;
  price: number;
  status: ArtworkStatus;
  currentBranch: Branch;
  imageUrl: string;
  itdrImageUrl?: string;
  rsaImageUrl?: string; // RSA / AR
  orCrImageUrl?: string; // OR / CR
  createdAt: string;
  importPeriod?: string; // YYYY-MM representing month/year of import
  sheetName?: string;
  itemCount?: number;
  remarks?: string;
  sizeFrame?: string;
  [key: string]: any;
}

export interface SaleRecord {
  id: string;
  artworkId: string;
  clientName: string;
  agentName: string;
  saleDate: string;
  deliveryDate?: string;
  isDelivered: boolean;
  isCancelled?: boolean;
  artworkSnapshot?: {
    title: string;
    artist: string;
    code: string;
    imageUrl: string;
    price: number;
    currentBranch?: string;
    medium?: string;
    dimensions?: string;
    year?: string;
  };
}

export interface TransferRecord {
  id: string;
  artworkId: string;
  origin: Branch;
  destination: Branch;
  performedBy: string;
  timestamp: string;
}

export interface ActivityLog {
  id: string;
  artworkId: string;
  action: string;
  user: string;
  timestamp: string;
  details?: string;
}

export interface InventoryAudit {
  id: string;
  month: string; // YYYY-MM
  confirmedAt: string;
  confirmedBy: string;
  totalCount: number;
  availableCount: number;
  addedCount: number;
  transferredCount: number;
  soldInGalleryCount: number;
  cancelledCount: number;
  snapshot: Artwork[];
  type?: 'Monthly Audit';
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  type: 'inventory' | 'sales' | 'system';
  artworkId?: string;
}

export interface ImportRecord {
  id: string;
  filename: string;
  importedBy: string;
  timestamp: string;
  recordCount: number;
  status: 'Success' | 'Partial' | 'Failed';
  details?: string;
}

export interface MonitoringEntry {
  id: string;
  date: string;
  description: string;
  code?: string;
  clientOrBranch?: string;
  itemCount?: number;
}

export interface WebAppSettings {
  preventDuplicateImports: boolean;
}

export interface ReturnRecord {
  id: string;
  artworkId: string;
  reason: string;
  returnedBy: string;
  returnDate: string;
  artworkSnapshot: Artwork;
  referenceNumber?: string; // IT/DR Number
  proofImage?: string; // Base64 or URL of the attached proof
  notes?: string;
}

export type TransferStatus = 'Pending' | 'Accepted' | 'Declined' | 'Cancelled' | 'On Hold';

export interface TransferRequest {
  id: string;
  artworkId: string;
  artworkTitle: string;
  artworkCode: string;
  artworkImage: string;
  fromBranch: Branch;
  toBranch: Branch;
  status: TransferStatus;
  requestedBy: string; // User Name
  requestedAt: string; // ISO Date
  respondedBy?: string; // User Name
  respondedAt?: string; // ISO Date
  notes?: string;
}
