import { describe, expect, it } from 'vitest';
import {
  clampAqi,
  createConfigHash,
  sanitizeLocation,
  sanitizePlainText,
} from '../utils/sanitize';
import type { UserAirConfig } from '../types/aqi';

describe('sanitizeLocation', () => {
  it('strips HTML tags and script blocks from custom location inputs', () => {
    const dirty = '<script>alert("xss")</script><b>Pune</b>, India';
    expect(sanitizeLocation(dirty)).toBe('Pune, India');
  });

  it('removes javascript: and data: URI schemes and disallowed symbols', () => {
    expect(sanitizeLocation('javascript:alert(1) Kolkata; DROP TABLE')).toBe(
      'alert(1) Kolkata DROP TABLE'
    );
    expect(sanitizeLocation('data:text/html;base64,abc Jaipur')).toBe(
      'text/htmlbase64,abc Jaipur'
    );
  });

  it('collapses excess whitespace and caps length to 60 characters', () => {
    const longInput = `  New   ${'Delhi'.repeat(20)}  `;
    const result = sanitizeLocation(longInput);
    expect(result.length).toBeLessThanOrEqual(60);
    expect(result.startsWith('New Delhi')).toBe(true);
  });
});

describe('sanitizePlainText & clampAqi', () => {
  it('strips embedded markup and control characters from plain text', () => {
    expect(sanitizePlainText('Keep <em>windows</em>\u0007 closed')).toBe(
      'Keep windows closed'
    );
  });

  it('clamps AQI cleanly within 0..500', () => {
    expect(clampAqi(-45)).toBe(0);
    expect(clampAqi(247.6)).toBe(248);
    expect(clampAqi(999)).toBe(500);
    expect(clampAqi(Number.NaN)).toBe(100);
  });
});

describe('createConfigHash', () => {
  it('produces identical hashes regardless of household/indoor array order', () => {
    const configA: UserAirConfig = {
      cityId: 'delhi',
      customLocation: '',
      aqi: 312,
      household: ['kids', 'elderly'],
      indoorSetup: ['gas_stove', 'hepa_purifier'],
      commuteMode: 'public_transit',
    };
    const configB: UserAirConfig = {
      ...configA,
      household: ['elderly', 'kids'],
      indoorSetup: ['hepa_purifier', 'gas_stove'],
    };

    expect(createConfigHash(configA)).toBe(createConfigHash(configB));
  });

  it('produces different hashes when commute mode or city changes', () => {
    const base: UserAirConfig = {
      cityId: 'guwahati',
      customLocation: '',
      aqi: 160,
      household: ['commuters'],
      indoorSetup: ['cross_ventilation'],
      commuteMode: 'car_cab',
    };

    expect(createConfigHash(base)).not.toBe(
      createConfigHash({ ...base, commuteMode: 'walk_cycle' })
    );
  });
});
