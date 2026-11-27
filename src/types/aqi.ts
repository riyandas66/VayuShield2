export type CityPresetId = 'delhi' | 'guwahati' | 'mumbai' | 'bengaluru' | 'custom';

export interface CityPreset {
  id: CityPresetId;
  label: string;
  defaultAqi: number;
  region: string;
  primaryPollutant: string;
  lat?: number;
  lon?: number;
}

export type HouseholdMember = 'kids' | 'elderly' | 'commuters' | 'pets';

export type IndoorEquipment =
  | 'hepa_purifier'
  | 'cross_ventilation'
  | 'indoor_plants'
  | 'gas_stove';

export type CommuteMode =
  | 'public_transit'
  | 'walk_cycle'
  | 'two_wheeler'
  | 'car_cab'
  | 'remote';

export type AqiSeverity = 'good' | 'moderate' | 'severe';

export type RiskLevel = 'low' | 'moderate' | 'high';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export type ActionCategory = 'zero_cost' | 'indoor_setup' | 'sustainable_swaps';

export interface UserAirConfig {
  cityId: CityPresetId;
  customLocation: string;
  aqi: number;
  household: HouseholdMember[];
  indoorSetup: IndoorEquipment[];
  commuteMode: CommuteMode;
}

export interface RoutineBlock {
  id: string;
  timeOfDay: TimeOfDay;
  timeWindow: string;
  title: string;
  riskLevel: RiskLevel;
  summary: string;
  steps: string[];
  rationale: string;
}

export interface ActionItem {
  id: string;
  category: ActionCategory;
  title: string;
  description: string;
  pm25ReductionPct: number;
  weeklyCo2SavedKg: number;
  effortLabel: string;
}

export interface AirQualityPlan {
  advisoryHeadline: string;
  advisoryDetail: string;
  dominantPollutant: string;
  safeVentilationWindow: string;
  routine: RoutineBlock[];
  actions: ActionItem[];
}

export interface ImpactMetrics {
  pm25ReductionPct: number;
  weeklyCo2SavedKg: number;
  cleanAirScore: number;
  activeActionCount: number;
  totalActionCount: number;
}

export type PlanSource = 'gemini' | 'cache' | 'fallback';

export interface CachedPlanEntry {
  hash: string;
  createdAt: number;
  source: 'gemini' | 'fallback';
  plan: AirQualityPlan;
}

export interface PlanGenerationResult {
  plan: AirQualityPlan;
  source: PlanSource;
  cacheHash: string;
  notice?: string;
}

export type DispersionRating = 'stagnant' | 'moderate' | 'favorable';

export interface WeatherTelemetry {
  cityResolved: string;
  temperatureC: number;
  feelsLikeC: number;
  humidityPct: number;
  windSpeedKmh: number;
  condition: string;
  fetchedAt: number;
}

export interface DispersionAssessment {
  rating: DispersionRating;
  label: string;
  detail: string;
}

export type WeatherStatus = 'loading' | 'live' | 'unconfigured' | 'error';

export interface WeatherState {
  status: WeatherStatus;
  data: WeatherTelemetry | null;
  errorMessage?: string;
}

export interface AqiThemeTokens {
  severity: AqiSeverity;
  label: string;
  shortLabel: string;
  strokeHex: string;
  gradientStartHex: string;
  gradientEndHex: string;
  dotClass: string;
  surfaceTintClass: string;
  borderTintClass: string;
  textAccentClass: string;
  ctaBgClass: string;
  ctaHoverClass: string;
  riskTagClass: string;
}

export const CITY_PRESETS: readonly CityPreset[] = [
  {
    id: 'delhi',
    label: 'Delhi NCR',
    defaultAqi: 312,
    region: 'Indo-Gangetic Basin',
    primaryPollutant: 'PM2.5 & NO2',
    lat: 28.6139,
    lon: 77.209,
  },
  {
    id: 'guwahati',
    label: 'Guwahati',
    defaultAqi: 158,
    region: 'Brahmaputra Valley',
    primaryPollutant: 'PM10 & PM2.5',
    lat: 26.1445,
    lon: 91.7362,
  },
  {
    id: 'mumbai',
    label: 'Mumbai',
    defaultAqi: 124,
    region: 'Coastal Konkan',
    primaryPollutant: 'PM2.5 & Coastal Dust',
    lat: 19.076,
    lon: 72.8777,
  },
  {
    id: 'bengaluru',
    label: 'Bengaluru',
    defaultAqi: 68,
    region: 'Deccan Plateau',
    primaryPollutant: 'PM10 & Traffic Exhaust',
    lat: 12.9716,
    lon: 77.5946,
  },
  {
    id: 'custom',
    label: 'Custom',
    defaultAqi: 180,
    region: 'Custom Location',
    primaryPollutant: 'PM2.5',
  },
] as const;

export const HOUSEHOLD_OPTIONS: ReadonlyArray<{
  id: HouseholdMember;
  label: string;
  detail: string;
}> = [
  { id: 'kids', label: 'Kids', detail: 'Developing lungs' },
  { id: 'elderly', label: 'Elderly', detail: 'Cardiopulmonary care' },
  { id: 'commuters', label: 'Commuters', detail: 'Peak traffic exposure' },
  { id: 'pets', label: 'Pets', detail: 'Low-altitude dust' },
];

export const INDOOR_EQUIPMENT_OPTIONS: ReadonlyArray<{
  id: IndoorEquipment;
  label: string;
}> = [
  { id: 'hepa_purifier', label: 'HEPA Purifier' },
  { id: 'cross_ventilation', label: 'Cross-Ventilation' },
  { id: 'indoor_plants', label: 'Indoor Plants' },
  { id: 'gas_stove', label: 'Gas Stove' },
];

export const COMMUTE_OPTIONS: ReadonlyArray<{
  id: CommuteMode;
  label: string;
  baselineCo2KgPerWeek: number;
}> = [
  { id: 'public_transit', label: 'Public Transit', baselineCo2KgPerWeek: 6.4 },
  { id: 'walk_cycle', label: 'Walk / Cycle', baselineCo2KgPerWeek: 0 },
  { id: 'two_wheeler', label: 'Two-Wheeler', baselineCo2KgPerWeek: 11.8 },
  { id: 'car_cab', label: 'Car / Cab', baselineCo2KgPerWeek: 24.5 },
  { id: 'remote', label: 'Remote / WFH', baselineCo2KgPerWeek: 1.2 },
];
