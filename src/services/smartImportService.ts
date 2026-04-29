import { ArtworkStatus } from '../types';

// Interface for import rows to ensure type safety
interface ImportRow {
  title?: string;
  price?: number;
  status?: string;
  [key: string]: any;
}

// Standardized Field Mappings (The "Knowledge Base" for the AI)
const FIELD_MAPPINGS: Record<string, string[]> = {
  price: ['gp', 'price', 'amount', 'value', 'selling price', 'net to main', 'cost', 'unit price', 'srp'],
  title: ['title', 'title to follow', 'particulars', 'description', 'item', 'artwork', 'art name', 'item name'],
  artist: ['artist', "artist's name", 'name', 'artist name', 'painter'],
  medium: ['medium', 'material', 'technique'],
  dimensions: ['dimensions', 'size', 'size w/o frame', 'measurement'],
  sizeFrame: ['size with frame', 'size frame', 'frame size'],
  currentBranch: ['branch', 'client / branch', 'location'],
  imageUrl: ['imageurl', 'image url', 'images'],
  code: ['code', 'it / dr#', 'inv no', 'inventory no', 'item no', 'sku', 'ref', 'reference', 'stock no', 'id', 'control no', 'dr', 'dr#', 'dr #'],
  year: ['year', 'date', 'created'],
  status: ['status', 'state', 'condition'],
  remarks: ['remarks', 'notes', 'comment'],
  itemCount: ['no. of items', 'items', 'count', 'quantity'],
  rowIndex: ['#', 'no.', 'no']
};

/**
 * Calculates the Levenshtein distance between two strings.
 * Used for fuzzy matching column headers.
 */
const levenshteinDistance = (a: string, b: string): number => {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1,   // insertion
            matrix[i - 1][j] + 1    // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

/**
 * Finds the best matching standard field for a given header.
 * Uses fuzzy matching to handle typos (e.g. "Artst" -> "artist").
 */
export const findBestHeaderMatch = (header: string): string | null => {
  const normalizedHeader = header.toLowerCase().trim();
  
  // 1. Exact Match (Fast Path)
  for (const [field, aliases] of Object.entries(FIELD_MAPPINGS)) {
    // Check for exact match first
    if (aliases.some(alias => normalizedHeader === alias)) {
      return field;
    }
    // Check for word-boundary contains match (e.g., "image url" matches "imageurl" but "grid" doesn't match "id")
    if (aliases.some(alias => {
      // Only use contains for multi-word aliases to avoid false positives
      if (alias.includes(' ')) {
        return normalizedHeader.includes(alias);
      }
      return false;
    })) {
      return field;
    }
  }

  // 2. Fuzzy Match (AI Path)
  let bestMatch: string | null = null;
  let minDistance = Infinity;

  for (const [field, aliases] of Object.entries(FIELD_MAPPINGS)) {
    for (const alias of aliases) {
      const distance = levenshteinDistance(normalizedHeader, alias);
      // Allow a threshold (e.g., distance <= 2 for short words, <= 3 for long)
      const threshold = alias.length > 5 ? 3 : 2;
      
      if (distance <= threshold && distance < minDistance) {
        minDistance = distance;
        bestMatch = field;
      }
    }
  }

  return bestMatch;
};

/**
 * Analyzes the quality of the imported data.
 * Returns a report with stats and potential issues.
 */
export const analyzeImportQuality = (rows: ImportRow[], skippedCount: number = 0, skippedReasons: string[] = []) => {
  const issues: string[] = [];
  let confidenceScore = 100;

  // 0. Report Skipped/Rejected Rows
  if (skippedCount > 0) {
    issues.push(`⚠️ Skipped ${skippedCount} rows that appeared to be invalid or empty.`);
    // Add specific reasons (up to 5 unique reasons to avoid clutter)
    const uniqueReasons = Array.from(new Set(skippedReasons)).slice(0, 5);
    uniqueReasons.forEach(reason => issues.push(`   - ${reason}`));
    if (skippedReasons.length > 5) issues.push(`   - ...and more.`);
    
    // Penalty for skipped rows (if they look like real data)
    confidenceScore -= Math.min(20, skippedCount * 2); 
  }

  // 1. Check for missing critical fields
  const missingTitles = rows.filter(r => !r.title).length;
  const missingPrices = rows.filter(r => !r.price || r.price === 0).length;
  
  if (missingTitles > 0) {
    issues.push(`${missingTitles} items have missing titles (auto-filled with placeholders).`);
    confidenceScore -= 5;
  }
  
  if (missingPrices > 0) {
    issues.push(`${missingPrices} items have a price of 0 or missing.`);
    confidenceScore -= 5;
  }

  // 2. Price Outlier Detection (Simple Z-Score-like check)
  const prices = rows.map(r => r.price).filter((p): p is number => !!p && p > 0);
  if (prices.length > 5) {
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const outliers = rows.filter(r => (r.price || 0) > avg * 10); // 10x the average
    if (outliers.length > 0) {
      issues.push(`Detected ${outliers.length} potential price outliers (significantly higher than average).`);
      confidenceScore -= 5;
    }
  }

  // 3. Status Consistency
  const invalidStatuses = rows.filter(r => {
    const s = (r.status || '').toLowerCase();
    const valid = Object.values(ArtworkStatus).map(vs => vs.toLowerCase());
    return s && !valid.includes(s) && !s.startsWith('it') && !s.includes('#');
  });

  if (invalidStatuses.length > 0) {
    issues.push(`${invalidStatuses.length} items have non-standard statuses (kept as-is).`);
    confidenceScore -= 5;
  }

  return {
    confidenceScore: Math.max(0, confidenceScore),
    issues,
    totalRows: rows.length
  };
};
