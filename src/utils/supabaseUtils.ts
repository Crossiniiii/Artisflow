
/**
 * Helper to convert camelCase to snake_case for Supabase
 */
export const toSnakeCase = (str: string) => {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

/**
 * Helper to convert snake_case to camelCase for Frontend
 */
export const toCamelCase = (str: string) => {
    return str.replace(/([-_][a-z])/g, group =>
        group.toUpperCase().replace('-', '').replace('_', '')
    );
};

/**
 * Map an entire object's keys from camelCase to snake_case
 */
export const mapToSnakeCase = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => mapToSnakeCase(v));
    } else if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
        return Object.keys(obj).reduce((acc, key) => {
            const snakeKey = toSnakeCase(key);
            acc[snakeKey] = mapToSnakeCase(obj[key]);
            return acc;
        }, {} as any);
    }
    return obj;
};

/**
 * Map an entire object's keys from snake_case to camelCase
 */
export const mapFromSnakeCase = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => mapFromSnakeCase(v));
    } else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const camelKey = toCamelCase(key);
            acc[camelKey] = mapFromSnakeCase(obj[key]);
            return acc;
        }, {} as any);
    }
    return obj;
};

/**
 * Sanitize object for Supabase/PostgreSQL
 * - Removes undefined values
 * - Handles Dates
 */
export const sanitizeForSupabase = (obj: any): any => {
    if (typeof obj === 'number' && isNaN(obj)) {
        return null;
    }
    if (obj === undefined) {
        return null; // Or delete the key
    }
    if (obj instanceof Date) {
        return obj.toISOString();
    }
    if (Array.isArray(obj)) {
        return obj.map(v => sanitizeForSupabase(v));
    } else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const value = obj[key];
            if (value !== undefined) {
                acc[key] = sanitizeForSupabase(value);
            }
            return acc;
        }, {} as any);
    }
    return obj;
};
