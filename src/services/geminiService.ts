import type {
  AirQualityPlan,
  CachedPlanEntry,
  PlanGenerationResult,
  UserAirConfig,
  WeatherTelemetry,
} from '../types/aqi';
import { createConfigHash, sanitizeLocation, clampAqi } from '../utils/sanitize';
import { validateAirQualityPlan } from '../utils/schemaValidator';
import { generateFallbackPlan } from './fallbackEngine';

const CACHE_STORAGE_KEY = 'vayushield_plan_cache_v1';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const MAX_CACHE_ENTRIES = 25;

interface PlanApiResponse {
  plan?: unknown;
  source?: string;
  error?: string;
}

function readCacheStore(): Record<string, CachedPlanEntry> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, CachedPlanEntry>;
  } catch {
    return {};
  }
}

function writeCacheStore(store: Record<string, CachedPlanEntry>): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    const entries = Object.values(store)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, MAX_CACHE_ENTRIES);

    const pruned: Record<string, CachedPlanEntry> = {};
    for (const entry of entries) {
      pruned[entry.hash] = entry;
    }
    window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(pruned));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function getCachedPlan(hash: string): AirQualityPlan | null {
  const store = readCacheStore();
  const entry = store[hash];
  if (!entry) return null;

  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    delete store[hash];
    writeCacheStore(store);
    return null;
  }

  return validateAirQualityPlan(entry.plan);
}

export function saveCachedPlan(
  hash: string,
  plan: AirQualityPlan,
  source: 'gemini' | 'fallback'
): void {
  const store = readCacheStore();
  store[hash] = {
    hash,
    createdAt: Date.now(),
    source,
    plan,
  };
  writeCacheStore(store);
}

/**
 * Generates a personalized air-quality protection plan.
 * 1. Checks localStorage hash cache first (0 API tokens on cache hit) unless bypassCache is true.
 * 2. Calls the server-side Gemini 2.5 Flash JSON proxy endpoint (/api/plan).
 * 3. Strictly validates the returned JSON schema before rendering.
 * 4. Falls back deterministically to the local science engine if offline or unavailable.
 */
export async function generatePersonalizedPlan(
  config: UserAirConfig,
  options: {
    bypassCache?: boolean;
    signal?: AbortSignal;
    weather?: WeatherTelemetry | null;
  } = {}
): Promise<PlanGenerationResult> {
  const sanitizedConfig: UserAirConfig = {
    ...config,
    aqi: clampAqi(config.aqi),
    customLocation: sanitizeLocation(config.customLocation),
  };

  const cacheHash = createConfigHash(sanitizedConfig);

  if (!options.bypassCache) {
    const cached = getCachedPlan(cacheHash);
    if (cached) {
      return {
        plan: cached,
        source: 'cache',
        cacheHash,
      };
    }
  }

  try {
    const requestPayload = options.weather
      ? { ...sanitizedConfig, weather: options.weather }
      : sanitizedConfig;

    const response = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
      signal: options.signal,
    });

    if (response.ok) {
      const payload = (await response.json()) as PlanApiResponse;
      const validated = validateAirQualityPlan(payload.plan);

      if (validated) {
        saveCachedPlan(cacheHash, validated, 'gemini');
        return {
          plan: validated,
          source: 'gemini',
          cacheHash,
        };
      }
    }

    let notice = 'Switched to local environmental model (offline or unconfigured API).';
    try {
      const errBody = (await response.json()) as PlanApiResponse;
      if (typeof errBody.error === 'string' && errBody.error.trim()) {
        notice = `${errBody.error} Showing local environmental plan.`;
      }
    } catch {
      // Keep default notice
    }

    const fallbackPlan = generateFallbackPlan(sanitizedConfig);
    return {
      plan: fallbackPlan,
      source: 'fallback',
      cacheHash,
      notice,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    const fallbackPlan = generateFallbackPlan(sanitizedConfig);
    return {
      plan: fallbackPlan,
      source: 'fallback',
      cacheHash,
      notice: 'Network unavailable — running local environmental science engine.',
    };
  }
}
