import { supabase } from '../../supabase';
import { Artwork } from '../../types';
import { repairBase64Image, validateImageUrl } from '../../utils/imageValidator';

type WithId = { id: string };

export const PROFILE_COLUMNS = 'id, name, first_name, full_name, email, role, branch, status, permissions, last_login, position';
export const LOGIN_PROFILE_COLUMNS = 'id, name, first_name, full_name, email, role, status';
export const DASHBOARD_ARTWORK_COLUMNS = 'id, title, artist, code, status, price, remarks, current_branch, created_at, import_period, reserved_for_event_name';
export const FULL_ARTWORK_COLUMNS = 'id, code, title, artist, medium, dimensions, year, price, status, current_branch, created_at, updated_at, remarks, reservation_expiry, reserved_for_event_id, reserved_for_event_name, size_frame, sold_at_branch, deleted_at, import_period';

export const ARTWORK_SYNC_PAGE_SIZE = 40;
export const ARTWORK_SYNC_MAX_RETRIES = 2;
export const DASHBOARD_IMAGE_SYNC_LIMIT = 80;
export const ARTWORK_SYNC_FAILURE_BACKOFF_MS = 30 * 1000;
export const OPERATIONS_ROW_LIMITS = {
  logs: 120,
  audits: 48,
  imports: 40,
  returns: 80,
  framers: 80,
  transfers: 120,
  notifications: 30
} as const;
export const NOTIFICATION_BOOT_DELAY_MS = 8000;
export const SYNC_CACHE_PREFIX = 'artisflow-sync-cache';
export const CACHE_TTL_MS = {
  artworks: 60 * 1000,
  'all-artworks': 60 * 1000,
  sales: 45 * 1000,
  events: 2 * 60 * 1000,
  accounts: 5 * 60 * 1000,
  branches: 5 * 60 * 1000
} as const;

export const normalizeBranchLogo = async (logoUrl?: string | null): Promise<string | undefined> => {
  if (!logoUrl) return undefined;

  if (logoUrl.startsWith('data:image')) {
    return repairBase64Image(logoUrl) || undefined;
  }

  const isValid = await validateImageUrl(logoUrl);
  return isValid ? logoUrl : undefined;
};

export const getCacheKey = (userId: string, key: string) => `${SYNC_CACHE_PREFIX}:${userId}:${key}`;

export const readCache = <T,>(userId: string, key: string): T | null => {
  try {
    const raw = sessionStorage.getItem(getCacheKey(userId, key));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { timestamp?: number; data?: T } | T;
    if (
      parsed &&
      typeof parsed === 'object' &&
      'timestamp' in parsed &&
      'data' in parsed
    ) {
      const ttl = CACHE_TTL_MS[key as keyof typeof CACHE_TTL_MS] ?? 60 * 1000;
      const age = Date.now() - (parsed.timestamp || 0);
      if (age > ttl) {
        sessionStorage.removeItem(getCacheKey(userId, key));
        return null;
      }
      return parsed.data ?? null;
    }

    return parsed as T;
  } catch {
    return null;
  }
};

export const writeCache = (userId: string, key: string, value: unknown) => {
  try {
    sessionStorage.setItem(getCacheKey(userId, key), JSON.stringify({
      timestamp: Date.now(),
      data: value
    }));
  } catch {
    // Best-effort only.
  }
};

export const compactArtworkForCache = (artwork: Artwork) => {
  const {
    imageUrl,
    itdrImageUrl,
    rsaImageUrl,
    orCrImageUrl,
    ...rest
  } = artwork;
  return rest;
};

export const hydrateCachedArtwork = (artwork: Partial<Artwork>): Artwork | null => {
  if (!artwork || !artwork.id || !artwork.title) return null;

  return {
    code: '',
    artist: '',
    medium: '',
    dimensions: '',
    year: '',
    price: 0,
    status: artwork.status || '' as any,
    currentBranch: '',
    createdAt: '',
    updatedAt: '',
    remarks: '',
    reservationExpiry: undefined,
    reservedForEventId: undefined,
    reservedForEventName: undefined,
    sizeFrame: '',
    soldAtBranch: undefined,
    deletedAt: undefined,
    importPeriod: undefined,
    imageUrl: '',
    itdrImageUrl: '',
    rsaImageUrl: '',
    orCrImageUrl: '',
    ...artwork
  } as Artwork;
};

export const fetchPagedRows = async (table: string, columns: string, from: number, to: number, attempt = 0): Promise<any[]> => {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, to);

  if (error) {
    const isRetryableTimeout = (error.message || '').toLowerCase().includes('timeout');
    if (isRetryableTimeout && attempt < ARTWORK_SYNC_MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, 600 * (attempt + 1)));
      return fetchPagedRows(table, columns, from, to, attempt + 1);
    }
    throw error;
  }

  return data || [];
};

export const upsertRealtimeRecord = <T extends WithId>(
  items: T[],
  record: T,
  limit?: number
): T[] => {
  const withoutExisting = items.filter(item => item.id !== record.id);
  const next = [record, ...withoutExisting];
  return typeof limit === 'number' ? next.slice(0, limit) : next;
};

export const updateRealtimeRecord = <T extends WithId>(
  items: T[],
  record: T
): T[] => items.map(item => item.id === record.id ? { ...item, ...record } : item);

export const removeRealtimeRecord = <T extends WithId>(
  items: T[],
  recordId: string
): T[] => items.filter(item => item.id !== recordId);

export const isSupabaseMissingRelationError = (error: any) => {
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  return error?.code === 'PGRST205'
    || error?.status === 404
    || message.includes('could not find the table')
    || message.includes('relation')
    || details.includes('relation');
};

export const isSupabaseBadQueryError = (error: any) => {
  const message = String(error?.message || '').toLowerCase();
  return error?.status === 400
    || error?.code === 'PGRST100'
    || error?.code === '42703'
    || message.includes('column')
    || message.includes('order')
    || message.includes('failed to parse');
};
