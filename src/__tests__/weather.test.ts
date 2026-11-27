import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assessParticulateDispersion,
  validateWeatherTelemetry,
} from '../utils/weatherMath';
import { fetchCityWeather } from '../services/weatherService';

describe('validateWeatherTelemetry', () => {
  it('accepts valid payloads and clamps/rounds numeric telemetry safely', () => {
    const valid = validateWeatherTelemetry({
      cityResolved: '<b>New Delhi</b>',
      temperatureC: 19.44,
      feelsLikeC: 18.9,
      humidityPct: 84.6,
      windSpeedKmh: 5.42,
      condition: 'Haze',
      fetchedAt: Date.now(),
    });

    expect(valid).not.toBeNull();
    expect(valid?.cityResolved).toBe('New Delhi');
    expect(valid?.temperatureC).toBe(19.4);
    expect(valid?.humidityPct).toBe(85);
    expect(valid?.windSpeedKmh).toBe(5.4);
  });

  it('rejects malformed payloads', () => {
    expect(validateWeatherTelemetry(null)).toBeNull();
    expect(validateWeatherTelemetry({ temperatureC: '25' })).toBeNull();
    expect(
      validateWeatherTelemetry({
        cityResolved: 'Delhi',
        temperatureC: Number.NaN,
        feelsLikeC: 20,
        humidityPct: 50,
        windSpeedKmh: 10,
        condition: 'Clear',
        fetchedAt: Date.now(),
      })
    ).toBeNull();
  });
});

describe('assessParticulateDispersion', () => {
  it('flags stagnant low-dispersion air when wind speed is below 8 km/h', () => {
    const result = assessParticulateDispersion({
      temperatureC: 14,
      humidityPct: 82,
      windSpeedKmh: 4.5,
    });
    expect(result.rating).toBe('stagnant');
    expect(result.label).toBe('Low Dispersion');
    expect(result.detail.toLowerCase()).toContain('humidity');
  });

  it('identifies active clearing when winds are brisk and humidity is moderate', () => {
    const result = assessParticulateDispersion({
      temperatureC: 26,
      humidityPct: 52,
      windSpeedKmh: 22.3,
    });
    expect(result.rating).toBe('favorable');
    expect(result.label).toBe('Active Clearing');
  });

  it('identifies moderate mixing for intermediate wind conditions', () => {
    const result = assessParticulateDispersion({
      temperatureC: 24,
      humidityPct: 60,
      windSpeedKmh: 12,
    });
    expect(result.rating).toBe('moderate');
    expect(result.label).toBe('Moderate Mixing');
  });
});

describe('fetchCityWeather', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns live weather and caches valid responses in localStorage', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          weather: {
            cityResolved: 'New Delhi',
            temperatureC: 21.5,
            feelsLikeC: 21.0,
            humidityPct: 78,
            windSpeedKmh: 6.2,
            condition: 'Mist',
            fetchedAt: Date.now(),
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const first = await fetchCityWeather('delhi', '');
    expect(first.status).toBe('live');
    expect(first.data?.temperatureC).toBe(21.5);
    expect(first.data?.humidityPct).toBe(78);
    expect(first.data?.windSpeedKmh).toBe(6.2);

    // Second call hits 5-minute cache with 0 network calls
    const second = await fetchCityWeather('delhi', '');
    expect(second.status).toBe('live');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('returns unconfigured state when server responds 503', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          configured: false,
          error: 'OpenWeather API key not configured.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const result = await fetchCityWeather('mumbai', '');
    expect(result.status).toBe('unconfigured');
    expect(result.data).toBeNull();
    expect(result.errorMessage).toContain('OpenWeather API key');
  });
});
