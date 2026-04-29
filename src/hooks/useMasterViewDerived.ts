import { useMemo } from 'react';
import {
  ActivityLog,
  Artwork,
  ArtworkStatus,
  FramerRecord,
  ReturnRecord,
  SaleRecord
} from '../types';

interface UseMasterViewDerivedParams {
  artwork: Artwork;
  logs: ActivityLog[];
  sale?: SaleRecord;
  framerRecords?: FramerRecord[];
  returnRecords?: ReturnRecord[];
  activityFilter: string;
}

export const useMasterViewDerived = ({
  artwork,
  logs,
  sale,
  framerRecords = [],
  returnRecords = [],
  activityFilter
}: UseMasterViewDerivedParams) => {
  const activeFramerRecord = useMemo(() => {
    if (artwork.status !== ArtworkStatus.FOR_FRAMING) return null;
    return framerRecords.find(r =>
      (r.artworkId === artwork.id || r.artworkSnapshot?.code === artwork.code) &&
      r.status === 'Open'
    ) || null;
  }, [framerRecords, artwork.id, artwork.code, artwork.status]);

  const activeRetouchRecord = useMemo(() => {
    if (artwork.status !== ArtworkStatus.FOR_RETOUCH) return null;
    return returnRecords.find(r =>
      (r.artworkId === artwork.id || r.artworkSnapshot?.code === artwork.code) &&
      r.status === 'Open' &&
      r.returnType === 'For Retouch'
    ) || null;
  }, [returnRecords, artwork.id, artwork.code, artwork.status]);

  const latestFramerLog = useMemo(() => {
    if (artwork.status !== ArtworkStatus.FOR_FRAMING) return null;
    const log = logs.find(l => l.action.toLowerCase().includes('sent to framer') || l.action.toLowerCase().includes('for framing'));
    if (log) return log;

    if (activeFramerRecord) {
      return {
        timestamp: activeFramerRecord.sentDate,
        details: activeFramerRecord.damageDetails,
        action: 'Sent to Framer',
        user: 'System'
      } as ActivityLog;
    }
    return null;
  }, [logs, artwork.status, activeFramerRecord]);

  const latestRetouchLog = useMemo(() => {
    if (artwork.status !== ArtworkStatus.FOR_RETOUCH) return null;
    const log = logs.find(l => l.action.toLowerCase().includes('sent for retouch') || l.action.toLowerCase().includes('for retouch'));
    if (log) return log;

    if (activeRetouchRecord) {
      return {
        timestamp: activeRetouchRecord.returnDate,
        details: activeRetouchRecord.remarks || activeRetouchRecord.reason,
        action: 'Sent for Retouch',
        user: 'System'
      } as ActivityLog;
    }
    return null;
  }, [logs, artwork.status, activeRetouchRecord]);

  const effectiveLogs = useMemo(() => {
    let combined = [...logs];
    const hasSaleLog = logs.some(l => l.action.toLowerCase().includes('sale declared') || l.action.toLowerCase() === 'sold');
    const isSold = String(artwork.status).toLowerCase() === 'sold' || String(artwork.status).toLowerCase() === 'delivered';

    if (isSold && !hasSaleLog) {
      let saleDate = sale?.saleDate || artwork.createdAt;
      if (!sale?.saleDate && artwork.year && artwork.year.match(/^\d{4}-\d{2}-\d{2}/)) {
        saleDate = artwork.year;
      } else if (!sale?.saleDate && artwork.year && artwork.year.match(/^\d{4}$/)) {
        saleDate = `${artwork.year}-01-01T00:00:00.000Z`;
      }

      combined.push({
        id: 'synthetic-sale-log',
        artworkId: artwork.id,
        action: 'Sold (Imported)',
        user: 'System (Imported)',
        timestamp: saleDate,
        details: sale ? `Sold to ${sale.clientName}` : 'Marked as Sold during import'
      });
    }

    if (activityFilter !== 'All') {
      combined = combined.filter(log => {
        const action = log.action.toLowerCase();
        if (activityFilter === 'Sale') return action.includes('sale') || action.includes('sold');
        if (activityFilter === 'Reservation') return action.includes('reserved');
        if (activityFilter === 'Transfer') return action.includes('transfer');
        if (activityFilter === 'Edit') return action.includes('edit') || action.includes('updated');
        return true;
      });
    }

    return combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs, artwork, sale, activityFilter]);

  const transferLogs = useMemo(
    () => logs.filter(l => l.action === 'Transferred' || l.action.includes('Transfer')),
    [logs]
  );

  return {
    activeFramerRecord,
    activeRetouchRecord,
    latestFramerLog,
    latestRetouchLog,
    effectiveLogs,
    transferLogs
  };
};
