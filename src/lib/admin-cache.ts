/**
 * Utility functions for caching Admin state in localStorage to prevent 
 * redundant server calls and improve admin dashboard performance.
 */

export const CACHE_KEYS = {
  SCHEDULES: 'admin_cache_schedules',
  BOOKINGS: 'admin_cache_bookings',
  CAMERAS_ACTIVE: 'admin_cache_cameras_active',
  CAMERAS_ALL: 'admin_cache_cameras_all',
  PHOTOS: 'admin_cache_photos',
} as const;

// Default cache TTL: 5 minutes
export const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

interface CacheEnvelope<T> {
  timestamp: number;
  data: T;
}

/**
 * Retrieve cached data from localStorage if available and not expired.
 */
export function getAdminCache<T>(key: string, maxAgeMs: number = DEFAULT_CACHE_TTL): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed: CacheEnvelope<T> = JSON.parse(raw);
    const now = Date.now();

    if (now - parsed.timestamp < maxAgeMs) {
      return parsed.data;
    }
  } catch (error) {
    console.error(`[AdminCache] Error reading key "${key}":`, error);
  }
  return null;
}

/**
 * Save data into localStorage with current timestamp.
 */
export function setAdminCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    const envelope: CacheEnvelope<T> = {
      timestamp: Date.now(),
      data,
    };
    localStorage.setItem(key, JSON.stringify(envelope));
  } catch (error) {
    console.error(`[AdminCache] Error setting key "${key}":`, error);
  }
}

/**
 * Clear specific cache or all admin caches from localStorage.
 */
export function clearAdminCache(key?: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (key) {
      localStorage.removeItem(key);
    } else {
      Object.values(CACHE_KEYS).forEach(k => localStorage.removeItem(k));
    }
  } catch (error) {
    console.error('[AdminCache] Error clearing cache:', error);
  }
}
