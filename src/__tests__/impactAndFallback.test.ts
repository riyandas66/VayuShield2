import { describe, expect, it } from 'vitest';
import type { UserAirConfig } from '../types/aqi';
import {
  calculateImpactMetrics,
  estimateParticulates,
  getAqiSeverity,
} from '../utils/aqiMath';
import { generateFallbackPlan } from '../services/fallbackEngine';
import { validateAirQualityPlan } from '../utils/schemaValidator';

const BASE_CONFIG: UserAirConfig = {
  cityId: 'delhi',
  customLocation: '',
  aqi: 320,
  household: ['kids', 'elderly'],
  indoorSetup: ['hepa_purifier', 'gas_stove'],
  commuteMode: 'car_cab',
};

describe('AQI severity and particulate estimates', () => {
  it('maps AQI ranges to Good, Moderate, and Severe tiers', () => {
    expect(getAqiSeverity(42)).toBe('good');
    expect(getAqiSeverity(100)).toBe('good');
    expect(getAqiSeverity(101)).toBe('moderate');
    expect(getAqiSeverity(200)).toBe('moderate');
    expect(getAqiSeverity(201)).toBe('severe');
    expect(getAqiSeverity(480)).toBe('severe');
  });

  it('estimates monotonic PM2.5 and PM10 values', () => {
    const good = estimateParticulates(50);
    const severe = estimateParticulates(400);
    expect(severe.pm25).toBeGreaterThan(good.pm25);
    expect(severe.pm10).toBeGreaterThan(severe.pm25);
  });
});

describe('Fallback engine & schema validator', () => {
  it('generates a complete, schema-valid personalized plan for severe smog and sensitive households', () => {
    const plan = generateFallbackPlan(BASE_CONFIG);
    const validated = validateAirQualityPlan(plan);

    expect(validated).not.toBeNull();
    expect(validated?.routine).toHaveLength(3);
    expect(validated?.advisoryDetail.toLowerCase()).toContain('children');
    expect(validated?.advisoryDetail.toLowerCase()).toContain('older adults');

    const categories = new Set(validated?.actions.map((a) => a.category));
    expect(categories.has('zero_cost')).toBe(true);
    expect(categories.has('indoor_setup')).toBe(true);
    expect(categories.has('sustainable_swaps')).toBe(true);
  });

  it('rejects malformed or incomplete JSON payloads in validateAirQualityPlan', () => {
    expect(validateAirQualityPlan(null)).toBeNull();
    expect(validateAirQualityPlan({ advisoryHeadline: 'Missing fields' })).toBeNull();
    expect(
      validateAirQualityPlan({
        advisoryHeadline: 'Test',
        advisoryDetail: 'Detail',
        dominantPollutant: 'PM2.5',
        safeVentilationWindow: '13:00',
        routine: [],
        actions: [],
      })
    ).toBeNull();
  });
});

describe('Impact scorecard dynamic recalculations', () => {
  it('increases PM2.5 reduction, weekly CO2 saved, and Clean Air Score as actions are checked', () => {
    const plan = generateFallbackPlan(BASE_CONFIG);
    const noneChecked = calculateImpactMetrics(BASE_CONFIG, plan.actions, new Set());
    const twoChecked = calculateImpactMetrics(
      BASE_CONFIG,
      plan.actions,
      new Set([plan.actions[0].id, plan.actions[plan.actions.length - 1].id])
    );

    expect(twoChecked.activeActionCount).toBe(2);
    expect(twoChecked.pm25ReductionPct).toBeGreaterThan(noneChecked.pm25ReductionPct);
    expect(twoChecked.weeklyCo2SavedKg).toBeGreaterThan(noneChecked.weeklyCo2SavedKg);
    expect(twoChecked.cleanAirScore).toBeGreaterThan(noneChecked.cleanAirScore);
  });

  it('rewards low-emission commute modes with higher baseline weekly CO2 savings', () => {
    const plan = generateFallbackPlan(BASE_CONFIG);
    const carMetrics = calculateImpactMetrics(BASE_CONFIG, plan.actions, new Set());
    const cycleMetrics = calculateImpactMetrics(
      { ...BASE_CONFIG, commuteMode: 'walk_cycle' },
      plan.actions,
      new Set()
    );

    expect(cycleMetrics.weeklyCo2SavedKg).toBeGreaterThan(carMetrics.weeklyCo2SavedKg);
  });
});
