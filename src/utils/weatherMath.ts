import type { DispersionAssessment, WeatherTelemetry } from '../types/aqi';
import { sanitizePlainText } from './sanitize';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Strictly validates weather telemetry payloads returned by /api/weather
 * or stored in localStorage before rendering.
 */
export function validateWeatherTelemetry(raw: unknown): WeatherTelemetry | null {
  if (!isRecord(raw)) return null;

  if (
    typeof raw.cityResolved !== 'string' ||
    typeof raw.temperatureC !== 'number' ||
    typeof raw.feelsLikeC !== 'number' ||
    typeof raw.humidityPct !== 'number' ||
    typeof raw.windSpeedKmh !== 'number' ||
    typeof raw.condition !== 'string' ||
    typeof raw.fetchedAt !== 'number'
  ) {
    return null;
  }

  if (
    !Number.isFinite(raw.temperatureC) ||
    !Number.isFinite(raw.feelsLikeC) ||
    !Number.isFinite(raw.humidityPct) ||
    !Number.isFinite(raw.windSpeedKmh) ||
    !Number.isFinite(raw.fetchedAt)
  ) {
    return null;
  }

  const cityResolved = sanitizePlainText(raw.cityResolved, 80);
  const condition = sanitizePlainText(raw.condition, 60);
  if (!cityResolved || !condition) return null;

  return {
    cityResolved,
    temperatureC: Math.round(raw.temperatureC * 10) / 10,
    feelsLikeC: Math.round(raw.feelsLikeC * 10) / 10,
    humidityPct: Math.max(0, Math.min(100, Math.round(raw.humidityPct))),
    windSpeedKmh: Math.max(0, Math.round(raw.windSpeedKmh * 10) / 10),
    condition,
    fetchedAt: raw.fetchedAt,
  };
}

/**
 * Computes particulate dispersion dynamics from real-time meteorological readings:
 * - Wind speed < 8 km/h indicates weak horizontal advection (particulate trapping).
 * - Humidity >= 75% accelerates hygroscopic PM2.5 growth and haze persistence.
 * - Wind speed >= 18 km/h promotes rapid horizontal clearing of fine aerosols.
 */
export function assessParticulateDispersion(
  weather: Pick<WeatherTelemetry, 'temperatureC' | 'humidityPct' | 'windSpeedKmh'>
): DispersionAssessment {
  const { temperatureC, humidityPct, windSpeedKmh } = weather;

  if (windSpeedKmh < 8) {
    const humidityNote =
      humidityPct >= 75
        ? 'High humidity amplifies hygroscopic PM2.5 haze.'
        : temperatureC <= 15
          ? 'Cool surface air reinforces shallow thermal inversion.'
          : 'Weak wind speed slows horizontal clearing of street-level exhaust.';
    return {
      rating: 'stagnant',
      label: 'Low Dispersion',
      detail: humidityNote,
    };
  }

  if (windSpeedKmh >= 18 && humidityPct < 78) {
    return {
      rating: 'favorable',
      label: 'Active Clearing',
      detail: 'Brisk surface winds actively dilute fine particulates across the basin.',
    };
  }

  const moderateDetail =
    humidityPct >= 78
      ? 'Moderate airflow helps mixing, though high moisture keeps haze suspended.'
      : 'Steady breeze supports gradual daytime dispersion of urban particulates.';

  return {
    rating: 'moderate',
    label: 'Moderate Mixing',
    detail: moderateDetail,
  };
}
