import type { UserAirConfig } from '../types/aqi';

const MAX_LOCATION_LENGTH = 60;
const MAX_TEXT_LENGTH = 420;

/**
 * Strips HTML tags, dangerous URI schemes, control characters, and disallowed
 * punctuation from user-supplied custom city/location strings.
 */
export function sanitizeLocation(rawInput: string): string {
  if (typeof rawInput !== 'string') {
    return '';
  }

  let cleaned = rawInput
    // Remove script/style blocks completely before stripping remaining tags
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    // Strip any HTML tags
    .replace(/<[^>]*>/g, '')
    // Strip javascript: / data: / vbscript: protocols
    .replace(/\b(?:javascript|data|vbscript)\s*:/gi, '')
    // Remove ASCII control chars and zero-width characters
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '')
    // Allow letters, numbers, spaces, hyphens, commas, periods, parentheses, slashes
    .replace(/[^a-zA-Z0-9\s,.\-()/]/g, '')
    // Normalize space before commas and collapse whitespace
    .replace(/\s+,/g, ',')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length > MAX_LOCATION_LENGTH) {
    cleaned = cleaned.slice(0, MAX_LOCATION_LENGTH).trim();
  }

  return cleaned;
}

/**
 * Sanitizes general plain-text strings coming from external JSON responses
 * before rendering them in React text nodes.
 */
export function sanitizePlainText(rawInput: string, maxLength = MAX_TEXT_LENGTH): string {
  if (typeof rawInput !== 'string') {
    return '';
  }

  const cleaned = rawInput
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1).trim()}…` : cleaned;
}

/**
 * Clamps an AQI reading into the valid 0–500 range as an integer.
 */
export function clampAqi(value: number): number {
  if (!Number.isFinite(value)) {
    return 100;
  }
  return Math.max(0, Math.min(500, Math.round(value)));
}

/**
 * Creates a stable, deterministic hash string for a UserAirConfig so
 * localStorage caching avoids duplicate Gemini API calls (0 tokens on cache hit).
 */
export function createConfigHash(config: UserAirConfig): string {
  const normalized = {
    cityId: config.cityId,
    customLocation:
      config.cityId === 'custom'
        ? sanitizeLocation(config.customLocation).toLowerCase()
        : '',
    // Bucket AQI in steps of 5 for high cache reuse while preserving precision
    aqiBucket: Math.round(clampAqi(config.aqi) / 5) * 5,
    household: [...config.household].sort(),
    indoorSetup: [...config.indoorSetup].sort(),
    commuteMode: config.commuteMode,
  };

  const serialized = JSON.stringify(normalized);
  // Deterministic 32-bit FNV-1a hash
  let hash = 2166136261;
  for (let i = 0; i < serialized.length; i += 1) {
    hash ^= serialized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `vs_v1_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
