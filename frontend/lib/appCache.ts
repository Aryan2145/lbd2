"use client";

/**
 * Snapshot of AppStore state persisted to localStorage so a refresh hydrates
 * instantly from cache, then refetches in the background. Cache is wiped on
 * logout so a different user on the same device cannot see stale data.
 *
 * Bump the version suffix whenever the shape of any persisted slice changes.
 */
const CACHE_KEY = "lbd_app_cache_v1";

// Chronological slices grow unbounded — cap them to the recent window so
// localStorage stays well under quota even for long-time users.
const DAYS_TO_KEEP = 90;

export interface CachedAppData {
  goals:              unknown[];
  habits:             unknown[];
  tasks:              unknown[];
  eventGroups:        unknown[];
  weekEvents:         unknown[];
  weekPlans:          unknown[];
  eveningReflections: { date: string }[];
  weeklyReviews:      unknown[];
  bucketEntries:      unknown[];
  tickets:            unknown[];
  userProfile:        unknown;
}

interface CacheEnvelope {
  ts:   number;
  data: CachedAppData;
}

function cutoffISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - DAYS_TO_KEEP);
  return d.toISOString().slice(0, 10);
}

export function readAppCache(): CachedAppData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope;
    return parsed?.data ?? null;
  } catch {
    return null;
  }
}

export function writeAppCache(data: CachedAppData): void {
  if (typeof window === "undefined") return;
  try {
    const cutoff = cutoffISO();
    const trimmed: CachedAppData = {
      ...data,
      eveningReflections: (data.eveningReflections ?? []).filter(r => r.date >= cutoff),
    };
    const payload: CacheEnvelope = { ts: Date.now(), data: trimmed };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Quota exceeded or serialization issue — drop the cache so we don't
    // keep tripping on a corrupted entry on every save.
    try { window.localStorage.removeItem(CACHE_KEY); } catch {}
  }
}

export function clearAppCache(): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(CACHE_KEY); } catch {}
}
