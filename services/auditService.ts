import { ActivityLog, Artwork, ArtworkStatus, InventoryAudit, UserRole } from '../types';

export const buildMonthlyAudit = (
  artworks: Artwork[],
  logs: ActivityLog[],
  userRole: UserRole
): InventoryAudit => {
  const now = new Date();
  const monthKey = now.toISOString().substring(0, 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  return {
    id: Math.random().toString(36).substr(2, 9),
    month: monthKey,
    confirmedAt: now.toISOString(),
    confirmedBy: userRole,
    totalCount: artworks.length,
    availableCount: artworks.filter(a => a.status === ArtworkStatus.AVAILABLE).length,
    addedCount: artworks.filter(a => a.createdAt >= startOfMonth).length,
    transferredCount: logs.filter(l => l.action === 'Transferred' && l.timestamp >= startOfMonth).length,
    soldInGalleryCount: artworks.filter(a => a.status === ArtworkStatus.SOLD).length,
    cancelledCount: artworks.filter(a => a.status === ArtworkStatus.CANCELLED).length,
    snapshot: [...artworks],
    type: 'Monthly Audit'
  };
};
