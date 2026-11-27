import {
  CITY_PRESETS,
  type ActionItem,
  type AqiSeverity,
  type AqiThemeTokens,
  type ImpactMetrics,
  type UserAirConfig,
} from '../types/aqi';
import { clampAqi, sanitizeLocation } from './sanitize';

/**
 * Maps numeric AQI (0–500) to the three adaptive visual severity tiers:
 * - Good: 0–100 (Emerald)
 * - Moderate: 101–200 (Amber)
 * - Severe Smog: 201–500 (Crimson)
 */
export function getAqiSeverity(aqi: number): AqiSeverity {
  const clamped = clampAqi(aqi);
  if (clamped <= 100) {
    return 'good';
  }
  if (clamped <= 200) {
    return 'moderate';
  }
  return 'severe';
}

/**
 * Returns granular human-readable air quality band for telemetry callouts.
 */
export function getAqiDetailedBand(aqi: number): string {
  const clamped = clampAqi(aqi);
  if (clamped <= 50) return 'Good';
  if (clamped <= 100) return 'Satisfactory';
  if (clamped <= 200) return 'Moderate';
  if (clamped <= 300) return 'Poor';
  if (clamped <= 400) return 'Very Poor';
  return 'Severe Smog';
}

/**
 * Provides WCAG AAA/AA-verified contrast tokens (all text-on-tint pairs >= 7:1,
 * white-on-CTA buttons >= 5:1) for each AQI severity tier.
 */
export function getAqiTheme(severity: AqiSeverity): AqiThemeTokens {
  switch (severity) {
    case 'good':
      return {
        severity: 'good',
        label: 'Good Air Quality',
        shortLabel: 'Good',
        strokeHex: '#059669',
        gradientStartHex: '#10B981',
        gradientEndHex: '#059669',
        dotClass: 'bg-emerald-600',
        surfaceTintClass: 'bg-emerald-50/90',
        borderTintClass: 'border-emerald-200',
        textAccentClass: 'text-emerald-900',
        ctaBgClass: 'bg-[#047857]',
        ctaHoverClass: 'hover:bg-[#065F46]',
        riskTagClass: 'text-emerald-900 bg-emerald-50 border-emerald-200',
      };
    case 'moderate':
      return {
        severity: 'moderate',
        label: 'Moderate Haze',
        shortLabel: 'Moderate',
        strokeHex: '#D97706',
        gradientStartHex: '#F59E0B',
        gradientEndHex: '#D97706',
        dotClass: 'bg-amber-600',
        surfaceTintClass: 'bg-amber-50/90',
        borderTintClass: 'border-amber-200',
        textAccentClass: 'text-amber-950',
        ctaBgClass: 'bg-[#B45309]',
        ctaHoverClass: 'hover:bg-[#92400E]',
        riskTagClass: 'text-amber-950 bg-amber-50 border-amber-200',
      };
    case 'severe':
      return {
        severity: 'severe',
        label: 'Severe Smog Alert',
        shortLabel: 'Severe Smog',
        strokeHex: '#DC2626',
        gradientStartHex: '#EF4444',
        gradientEndHex: '#B91C1C',
        dotClass: 'bg-red-600',
        surfaceTintClass: 'bg-red-50/90',
        borderTintClass: 'border-red-200',
        textAccentClass: 'text-red-950',
        ctaBgClass: 'bg-[#B91C1C]',
        ctaHoverClass: 'hover:bg-[#991B1B]',
        riskTagClass: 'text-red-950 bg-red-50 border-red-200',
      };
  }
}

/**
 * Estimates PM2.5 and PM10 concentrations (µg/m³) using piecewise linear
 * CPCB/EPA-aligned breakpoints from the AQI value.
 */
export function estimateParticulates(aqi: number): { pm25: number; pm10: number } {
  const clamped = clampAqi(aqi);
  let pm25 = 0;

  if (clamped <= 50) {
    pm25 = (clamped / 50) * 30;
  } else if (clamped <= 100) {
    pm25 = 30 + ((clamped - 50) / 50) * 30;
  } else if (clamped <= 200) {
    pm25 = 60 + ((clamped - 100) / 100) * 30;
  } else if (clamped <= 300) {
    pm25 = 90 + ((clamped - 200) / 100) * 30;
  } else if (clamped <= 400) {
    pm25 = 120 + ((clamped - 300) / 100) * 130;
  } else {
    pm25 = 250 + ((clamped - 400) / 100) * 130;
  }

  const pm10 = pm25 * 1.48;
  return {
    pm25: Math.round(pm25),
    pm10: Math.round(pm10),
  };
}

/**
 * Resolves the human-readable city name for display & prompts.
 */
export function getResolvedCityName(config: UserAirConfig): string {
  if (config.cityId === 'custom') {
    const clean = sanitizeLocation(config.customLocation);
    return clean.length > 0 ? clean : 'Custom City';
  }
  const preset = CITY_PRESETS.find((c) => c.id === config.cityId);
  return preset ? preset.label : 'Delhi NCR';
}

/**
 * Calculates live Direct Impact Scorecard metrics from user's active setup and
 * checked action items. Uses diminishing-returns compounding for realistic
 * PM2.5 reduction percentages (capped at 92%).
 */
export function calculateImpactMetrics(
  config: UserAirConfig,
  actions: readonly ActionItem[],
  completedActionIds: ReadonlySet<string>
): ImpactMetrics {
  // Baseline indoor filtration & low-emission credit from current setup
  let remainingExposure = 1.0;

  if (config.indoorSetup.includes('hepa_purifier')) {
    remainingExposure *= 0.82; // 18% baseline protection
  }
  if (config.indoorSetup.includes('cross_ventilation') && config.aqi <= 150) {
    remainingExposure *= 0.94;
  }
  if (config.indoorSetup.includes('indoor_plants')) {
    remainingExposure *= 0.97;
  }

  let weeklyCo2 = 0;
  if (config.commuteMode === 'walk_cycle') {
    weeklyCo2 += 8.4;
  } else if (config.commuteMode === 'public_transit') {
    weeklyCo2 += 5.2;
  } else if (config.commuteMode === 'remote') {
    weeklyCo2 += 7.0;
  }

  let activeCount = 0;
  for (const action of actions) {
    if (completedActionIds.has(action.id)) {
      activeCount += 1;
      const reductionFactor = Math.max(0, Math.min(0.6, action.pm25ReductionPct / 100));
      remainingExposure *= 1 - reductionFactor;
      weeklyCo2 += action.weeklyCo2SavedKg;
    }
  }

  // Gas stove without active mitigation slightly elevates indoor NO2/PM2.5 baseline
  if (config.indoorSetup.includes('gas_stove') && activeCount === 0) {
    remainingExposure = Math.min(1, remainingExposure * 1.04);
  }

  const pm25ReductionPct = Math.min(92, Math.max(0, Math.round((1 - remainingExposure) * 100)));
  const weeklyCo2SavedKg = Math.round(weeklyCo2 * 10) / 10;

  // Clean Air Score (0–100): blends ambient severity resilience, PM2.5 reduction,
  // low-emission actions, and completion ratio
  const ambientPenalty = Math.round((clampAqi(config.aqi) / 500) * 34);
  const mitigationBonus = Math.round(pm25ReductionPct * 0.52);
  const co2Bonus = Math.min(18, Math.round(weeklyCo2SavedKg * 0.95));
  const completionRatio = actions.length > 0 ? activeCount / actions.length : 0;
  const consistencyBonus = Math.round(completionRatio * 14);

  const rawScore = 44 - ambientPenalty + mitigationBonus + co2Bonus + consistencyBonus;
  const cleanAirScore = Math.max(12, Math.min(100, rawScore));

  return {
    pm25ReductionPct,
    weeklyCo2SavedKg,
    cleanAirScore,
    activeActionCount: activeCount,
    totalActionCount: actions.length,
  };
}
