
/**
 * Helper to convert camelCase to snake_case for Supabase
 */
const toSnakeCase = (str: string) => {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

/**
 * Helper to convert snake_case to camelCase for Frontend
 */
const toCamelCase = (str: string) => {
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
            if (obj[key] === undefined) return acc;
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

