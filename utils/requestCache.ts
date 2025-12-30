/**
 * Request Cache Utility
 * 
 * In-memory response caching with TTL and cache invalidation
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

// In-memory cache store
const cacheStore = new Map<string, CacheEntry>();

// Default TTLs (in milliseconds)
const DEFAULT_TTL = {
  list: 5 * 1000,        // 5 seconds for list requests
  detail: 30 * 1000,    // 30 seconds for detail requests
  counts: 10 * 1000     // 10 seconds for count requests
};

/**
 * Generate cache key from request
 */
function generateCacheKey(url: string, options?: RequestInit): string {
  const method = options?.method || 'GET';
  const body = options?.body ? JSON.stringify(options.body) : '';
  const headers = options?.headers ? JSON.stringify(options.headers) : '';
  return `${method}:${url}:${body}:${headers}`;
}

/**
 * Check if cache entry is still valid
 */
function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < entry.ttl;
}

/**
 * Get cached response if available and valid
 */
export function getCachedResponse(url: string, options?: RequestInit): any | null {
  const key = generateCacheKey(url, options);
  const entry = cacheStore.get(key);
  
  if (!entry) {
    return null;
  }
  
  if (!isCacheValid(entry)) {
    cacheStore.delete(key);
    return null;
  }
  
  return entry.data;
}

/**
 * Cache a response
 */
export function cacheResponse(
  url: string,
  data: any,
  options?: RequestInit,
  ttl?: number
): void {
  const key = generateCacheKey(url, options);
  const cacheTTL = ttl || DEFAULT_TTL.list;
  
  cacheStore.set(key, {
    data,
    timestamp: Date.now(),
    ttl: cacheTTL
  });
}

/**
 * Invalidate cache entries matching a pattern
 */
export function invalidateCache(pattern: string | RegExp): void {
  const regex = typeof pattern === 'string'
    ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    : pattern;
  
  for (const key of cacheStore.keys()) {
    if (regex.test(key)) {
      cacheStore.delete(key);
    }
  }
}

/**
 * Clear all cache entries
 */
export function clearCache(): void {
  cacheStore.clear();
}

/**
 * Cleanup expired cache entries
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of cacheStore.entries()) {
    if (!isCacheValid(entry)) {
      cacheStore.delete(key);
    }
  }
}

// Run cleanup every minute
if (typeof window !== 'undefined') {
  setInterval(cleanupExpiredEntries, 60 * 1000);
}

export { DEFAULT_TTL };

