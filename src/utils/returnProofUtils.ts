export const normalizeReturnProofImages = (value?: string | string[] | null): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);

  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
      }
    } catch {
      // Fall through to legacy single-value handling.
    }
  }

  return [trimmed];
};

export const serializeReturnProofImages = (images: string[]): string | undefined => {
  const cleaned = images.filter(Boolean);
  if (cleaned.length === 0) return undefined;
  if (cleaned.length === 1) return cleaned[0];
  return JSON.stringify(cleaned);
};
