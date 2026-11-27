import type { CityPresetId, WeatherState, WeatherTelemetry } from '../types/aqi';
import { sanitizeLocation } from '../utils/sanitize';
import { validateWeatherTelemetry } from '../utils/weatherMath';

const WEATHER_CACHE_KEY = 'vayushield_weather_cache_v1';
const WEATHER_TTL_MS = 1000 * 60 * 5; // 5 minutes

interface WeatherApiResponse {
  weather?: unknown;
  configured?: boolean;
  error?: string;
}

function makeWeatherKey(cityId: CityPresetId, customLocation: string): string {
  if (cityId === 'custom') {
    return `custom:${sanitizeLocation(customLocation).toLowerCase()}`;
  }
  return `preset:${cityId}`;
}

function readWeatherCache(key: string): WeatherTelemetry | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const store: unknown = JSON.parse(raw);
    if (typeof store !== 'object' || store === null || Array.isArray(store)) {
      return null;
    }
    const entry = (store as Record<string, unknown>)[key];
    const valid = validateWeatherTelemetry(entry);
    if (!valid) return null;
    if (Date.now() - valid.fetchedAt > WEATHER_TTL_MS) {
      return null;
    }
    return valid;
  } catch {
    return null;
  }
}

function writeWeatherCache(key: string, data: WeatherTelemetry): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    const raw = window.localStorage.getItem(WEATHER_CACHE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    const store: Record<string, WeatherTelemetry> =
      typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Record<string, WeatherTelemetry>)
        : {};
    store[key] = data;
    window.localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Fetches live OpenWeather meteorological telemetry through the server-side
 * /api/weather proxy so OPENWEATHER_API_KEY stays strictly on the server.
 */
export async function fetchCityWeather(
  cityId: CityPresetId,
  customLocation: string,
  options: { bypassCache?: boolean; signal?: AbortSignal } = {}
): Promise<WeatherState> {
  const cleanCustom = sanitizeLocation(customLocation);

  if (cityId === 'custom' && cleanCustom.length < 2) {
    return {
      status: 'error',
      data: null,
      errorMessage: 'Enter a city name to load live weather telemetry.',
    };
  }

  const cacheKey = makeWeatherKey(cityId, cleanCustom);
  if (!options.bypassCache) {
    const cached = readWeatherCache(cacheKey);
    if (cached) {
      return { status: 'live', data: cached };
    }
  }

  const params = new URLSearchParams({ cityId });
  if (cityId === 'custom') {
    params.set('location', cleanCustom);
  }

  try {
    const response = await fetch(`/api/weather?${params.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: options.signal,
    });

    const payload = (await response.json().catch(() => ({}))) as WeatherApiResponse;

    if (response.ok) {
      const validated = validateWeatherTelemetry(payload.weather);
      if (validated) {
        writeWeatherCache(cacheKey, validated);
        return { status: 'live', data: validated };
      }
      return {
        status: 'error',
        data: null,
        errorMessage: 'Weather payload failed validation.',
      };
    }

    if (response.status === 503 || payload.configured === false) {
      return {
        status: 'unconfigured',
        data: null,
        errorMessage:
          payload.error ??
          'Set OPENWEATHER_API_KEY in Settings > Secrets to enable live weather telemetry.',
      };
    }

    return {
      status: 'error',
      data: null,
      errorMessage: payload.error ?? 'Unable to load live weather for this location.',
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    return {
      status: 'error',
      data: null,
      errorMessage: 'Weather service unavailable while offline.',
    };
  }
}
