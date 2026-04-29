export const parseAttachmentString = (value?: string | string[] | null): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(item => typeof item === 'string' && item.length > 0);
  const trimmed = value.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
      }
    } catch {
      // Fallback to treating as single string below
    }
  }
  return [value];
};

export const serializeAttachmentList = (values?: string[]): string | null => {
  if (!values || values.length === 0) return null;
  return JSON.stringify(values);
};
