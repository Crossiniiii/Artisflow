
import {
  Box,
  ShoppingCart,
  Truck,
  History,
  LayoutDashboard,
  Plus,
  Search,
  ArrowRightLeft,
  User,
  Shield,
  PackageCheck,
  Users,
  Calendar,
  MessageSquare,
  AlertCircle,
  RotateCcw,
  CreditCard
} from 'lucide-react';

import { UserRole, UserPermissions } from './types';

// Set this to true to run the app with local data only (bypassing Firestore)
export const IS_DEMO_MODE = false;


export const BRANCH_CATEGORIES = [
  'Gallery',
  'Warehouse',
  'Private Collection',
  'Partner Space',
  'Pop-up',
  'Other'
];

export const APP_TABS = [
  { id: 'finance', label: 'Finance' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'analytics', label: 'Inventory Insights' },
  { id: 'import-history', label: 'Import History' },
  { id: 'snapshots', label: 'Artwork Timeline' },
  { id: 'operations', label: 'Gallery Operations' },
  { id: 'sales-history', label: 'Sales History' },
  { id: 'deliveries', label: 'Deliveries' },
  { id: 'artwork-transfer', label: 'Artwork T/R' },
  { id: 'audit-logs', label: 'System Audit Logs' },
  { id: 'accounts', label: 'User Accounts' },
  { id: 'chat', label: 'Inbox' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'requests', label: 'My Requests' }
];



export const getDefaultAccessibleTabs = (role: UserRole): string[] => {
  switch (role) {
    case UserRole.ADMIN:
      return ['finance', 'dashboard', 'analytics', 'import-history', 'snapshots', 'operations', 'sales-history', 'deliveries', 'approvals', 'artwork-transfer', 'audit-logs', 'accounts', 'chat'];
    case UserRole.INVENTORY_PERSONNEL:
      return ['finance', 'dashboard', 'analytics', 'import-history', 'snapshots', 'operations', 'sales-history', 'deliveries', 'artwork-transfer', 'accounts', 'chat'];
    case UserRole.SALES_AGENT:
      return ['dashboard', 'sales-history', 'deliveries', 'artwork-transfer', 'requests', 'accounts', 'chat'];
    case UserRole.EXCLUSIVE:
      return ['dashboard'];
    default:
      return ['dashboard'];
  }
};

export const getDefaultPermissions = (role: UserRole): UserPermissions => {
  switch (role) {
    case UserRole.ADMIN:
      return {
        canAddArtwork: true,
        canEditArtwork: true,
        canManageAccounts: true,
        canManageEvents: true,
        canAccessCertificate: true,
        canAttachITDR: true,
        canDeleteArtwork: true,
        canSellArtwork: true,
        canReserveArtwork: true,
        canTransferArtwork: true,
        canViewSalesHistory: true,
        canViewReserved: true,
        canViewAuctioned: true,
        canViewExhibit: true,
        canViewForFraming: true,
        canViewBackToArtist: true,
        accessibleTabs: getDefaultAccessibleTabs(UserRole.ADMIN),
      };
    case UserRole.INVENTORY_PERSONNEL:
      return {
        canAddArtwork: true,
        canEditArtwork: true,
        canManageAccounts: true, // Opened up as per user request
        canManageEvents: true, // Opened up as per user request
        canAccessCertificate: false,
        canAttachITDR: true,
        canDeleteArtwork: true,
        canSellArtwork: true,
        canReserveArtwork: true,
        canTransferArtwork: true,
        canViewSalesHistory: true,
        canViewReserved: true,
        canViewAuctioned: true,
        canViewExhibit: true,
        canViewForFraming: true,
        canViewBackToArtist: true,
        accessibleTabs: getDefaultAccessibleTabs(UserRole.INVENTORY_PERSONNEL),
      };
    case UserRole.SALES_AGENT:
      return {
        canAddArtwork: false,
        canEditArtwork: false,
        canManageAccounts: false,
        canManageEvents: false,
        canAccessCertificate: true,
        canAttachITDR: false,
        canDeleteArtwork: false,
        canSellArtwork: true,
        canReserveArtwork: true,
        canTransferArtwork: false,
        canViewSalesHistory: true,
        canViewReserved: true,
        canViewAuctioned: true,
        canViewExhibit: true,
        canViewForFraming: true,
        canViewBackToArtist: true,
        accessibleTabs: getDefaultAccessibleTabs(UserRole.SALES_AGENT),
      };
    case UserRole.EXCLUSIVE:
      return {
        canAddArtwork: false,
        canEditArtwork: false,
        canManageAccounts: false,
        canManageEvents: false,
        canAccessCertificate: false,
        canAttachITDR: false,
        canDeleteArtwork: false,
        canSellArtwork: false,
        canReserveArtwork: false,
        canTransferArtwork: false,
        canViewSalesHistory: false,
        canViewReserved: false,
        canViewAuctioned: false,
        canViewExhibit: false,
        canViewForFraming: false,
        canViewBackToArtist: false,
        accessibleTabs: getDefaultAccessibleTabs(UserRole.EXCLUSIVE),
      };
    default:
      return {
        canAddArtwork: false,
        canEditArtwork: false,
        canManageAccounts: false,
        canManageEvents: false,
        canAccessCertificate: false,
        canAttachITDR: false,
        canDeleteArtwork: false,
        canSellArtwork: false,
        canReserveArtwork: false,
        canTransferArtwork: false,
        canViewSalesHistory: false,
        canViewReserved: false,
        canViewAuctioned: false,
        canViewExhibit: false,
        canViewForFraming: false,
        canViewBackToArtist: false,
        accessibleTabs: getDefaultAccessibleTabs(UserRole.SALES_AGENT),
      };
  }
};


export const ICONS = {
  Dashboard: <LayoutDashboard size={20} />,
  Finance: <CreditCard size={20} />,
  Inventory: <Box size={20} />,
  Sales: <ShoppingCart size={20} />,
  Transfers: <ArrowRightLeft size={20} />,
  History: <History size={20} />,
  Add: <Plus size={20} />,
  Search: <Search size={20} />,
  Truck: <Truck size={20} />,
  User: <User size={20} />,
  Users: <Users size={20} />,
  Shield: <Shield size={20} />,
  Deliver: <PackageCheck size={20} />,
  Calendar: <Calendar size={20} />,
  Chat: <MessageSquare size={20} />,
  Warning: <AlertCircle size={20} />,
  Refresh: <RotateCcw size={20} />
};
