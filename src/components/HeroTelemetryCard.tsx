import type {
  AirQualityPlan,
  AqiThemeTokens,
  DispersionRating,
  PlanSource,
  WeatherState,
} from '../types/aqi';
import { assessParticulateDispersion } from '../utils/weatherMath';
import { AqiGauge } from './AqiGauge';
import {
  DropletIcon,
  InfoCircleIcon,
  RefreshIcon,
  ThermometerIcon,
  WindIcon,
} from './Icons';

interface HeroTelemetryCardProps {
  cityName: string;
  aqi: number;
  pm25: number;
  pm10: number;
  theme: AqiThemeTokens;
  plan: AirQualityPlan;
  planSource: PlanSource;
  isGenerating: boolean;
  notice?: string;
  weatherState: WeatherState;
  onGeneratePlan: () => void;
  onRefreshWeather: () => void;
}

const SOURCE_LABELS: Record<PlanSource, string> = {
  gemini: 'Gemini 2.5 Flash JSON',
  cache: 'Cached Plan · 0 API tokens',
  fallback: 'Local Environmental Engine',
};

const DISPERSION_BADGE_STYLES: Record<DispersionRating, string> = {
  stagnant: 'text-red-950 bg-red-50 border-red-200',
  moderate: 'text-amber-950 bg-amber-50 border-amber-200',
  favorable: 'text-emerald-900 bg-emerald-50 border-emerald-200',
};

export function HeroTelemetryCard({
  cityName,
  aqi,
  pm25,
  pm10,
  theme,
  plan,
  planSource,
  isGenerating,
  notice,
  weatherState,
  onGeneratePlan,
  onRefreshWeather,
}: HeroTelemetryCardProps) {
  const dispersion =
    weatherState.status === 'live' && weatherState.data
      ? assessParticulateDispersion(weatherState.data)
      : null;

  return (
    <section
      aria-labelledby="hero-telemetry-heading"
      className="bento-card xl:col-span-8 rounded-2xl p-6 sm:p-7 flex flex-col justify-between gap-6"
    >
      {/* Top Context Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Environmental Telemetry · {cityName}
          </p>
          <h1
            id="hero-telemetry-heading"
            className="mt-1 font-display text-2xl sm:text-[26px] font-bold text-slate-950 text-balance"
          >
            {theme.label}
          </h1>
        </div>

        <div className="text-right text-xs text-slate-600">
          <p className="font-medium text-slate-800">{SOURCE_LABELS[planSource]}</p>
          <p className="mt-0.5 text-slate-500">
            Primary: <span className="font-medium text-slate-700">{plan.dominantPollutant}</span>
          </p>
        </div>
      </div>

      {/* Main Split: Gauge + Advisory & CTA */}
      <div className="flex flex-col md:flex-row items-center md:items-stretch gap-6 lg:gap-8">
        <div className="flex items-center justify-center md:pr-2">
          <AqiGauge aqi={aqi} theme={theme} pm25={pm25} pm10={pm10} />
        </div>

        <div className="flex flex-1 flex-col justify-between gap-5 min-w-0">
          {/* Editorial Smog Advisory Banner */}
          {isGenerating ? (
            <div
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5"
              aria-busy="true"
              aria-label="Generating personalized air quality advisory"
            >
              <div className="skeleton-bar h-4 w-3/4 rounded-md bg-slate-200" />
              <div className="skeleton-bar h-3.5 w-full rounded-md bg-slate-200" />
              <div className="skeleton-bar h-3.5 w-5/6 rounded-md bg-slate-200" />
            </div>
          ) : (
            <div
              className={`rounded-xl border p-4 ${theme.surfaceTintClass} ${theme.borderTintClass}`}
              role="region"
              aria-label="Real-time smog advisory"
            >
              <div className="flex items-start gap-2.5">
                <InfoCircleIcon
                  className={`mt-0.5 h-4 w-4 shrink-0 ${theme.textAccentClass}`}
                />
                <div className="space-y-1.5 min-w-0">
                  <p className={`text-sm font-semibold leading-snug ${theme.textAccentClass}`}>
                    {plan.advisoryHeadline}
                  </p>
                  <p className="text-xs sm:text-[13px] leading-relaxed text-slate-800">
                    {plan.advisoryDetail}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Ventilation Window + Primary Action */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 border-t border-slate-100 pt-3.5">
              <span>Recommended Ventilation Window</span>
              <span className="font-mono font-semibold tabular-nums text-slate-900">
                {plan.safeVentilationWindow}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onGeneratePlan}
                disabled={isGenerating}
                className={`group relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-xs transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-65 disabled:cursor-not-allowed disabled:hover:translate-y-0 whitespace-nowrap ${theme.ctaBgClass} ${theme.ctaHoverClass}`}
              >
                <span className="cta-shimmer-layer" aria-hidden="true" />
                <RefreshIcon
                  className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`}
                />
                <span>
                  {isGenerating ? 'Synthesizing Plan…' : 'Generate Personalized Plan'}
                </span>
              </button>

              <p className="text-xs text-slate-500">
                Auto-cached by profile hash to save tokens
              </p>
            </div>

            {notice && (
              <p
                role="status"
                aria-live="polite"
                className="text-xs text-slate-600"
              >
                {notice}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Live OpenWeather Meteorological Dispersion Strip */}
      <div
        className="border-t border-slate-100 pt-4 space-y-3"
        aria-label="Real-time meteorological dispersion telemetry"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-900">
              OpenWeather Dispersion Telemetry
            </span>
            {weatherState.status === 'live' && weatherState.data && (
              <>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span className="text-slate-600">
                  {weatherState.data.condition}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {dispersion && (
              <span
                data-testid="dispersion-rating"
                className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${DISPERSION_BADGE_STYLES[dispersion.rating]}`}
              >
                {dispersion.label}
              </span>
            )}
            <button
              type="button"
              onClick={onRefreshWeather}
              disabled={weatherState.status === 'loading'}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-950 disabled:opacity-50 transition-colors whitespace-nowrap"
              aria-label="Refresh OpenWeather telemetry"
            >
              <RefreshIcon
                className={`h-3.5 w-3.5 ${weatherState.status === 'loading' ? 'animate-spin' : ''}`}
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Three-Column Meteorological Readings */}
        {weatherState.status === 'loading' ? (
          <div
            className="grid grid-cols-3 gap-4"
            aria-busy="true"
            aria-label="Loading live temperature, humidity, and wind speed"
          >
            {[0, 1, 2].map((idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="skeleton-bar h-3 w-20 rounded-sm bg-slate-200" />
                <div className="skeleton-bar h-6 w-16 rounded-sm bg-slate-200" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-0 sm:divide-x sm:divide-slate-100">
            <div className="flex items-center gap-3 sm:pr-4">
              <ThermometerIcon className="h-4 w-4 shrink-0 text-slate-500" />
              <div>
                <p className="text-[11px] font-medium text-slate-500">Temperature</p>
                <p
                  data-testid="weather-temperature"
                  className="font-mono text-base font-semibold tabular-nums text-slate-950"
                >
                  {weatherState.data
                    ? `${weatherState.data.temperatureC.toFixed(1)}°C`
                    : '—'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:px-4">
              <DropletIcon className="h-4 w-4 shrink-0 text-slate-500" />
              <div>
                <p className="text-[11px] font-medium text-slate-500">Humidity</p>
                <p
                  data-testid="weather-humidity"
                  className="font-mono text-base font-semibold tabular-nums text-slate-950"
                >
                  {weatherState.data ? `${weatherState.data.humidityPct}%` : '—'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:pl-4">
              <WindIcon className="h-4 w-4 shrink-0 text-slate-500" />
              <div>
                <p className="text-[11px] font-medium text-slate-500">Wind Speed</p>
                <p
                  data-testid="weather-wind"
                  className="font-mono text-base font-semibold tabular-nums text-slate-950"
                >
                  {weatherState.data
                    ? `${weatherState.data.windSpeedKmh.toFixed(1)} km/h`
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Dispersion Science Note or Honest Configuration/Error Notice */}
        {dispersion ? (
          <p className="text-xs text-slate-600" role="status" aria-live="polite">
            <span className="font-medium text-slate-800">Dispersion impact:</span>{' '}
            {dispersion.detail}
          </p>
        ) : weatherState.status !== 'loading' && weatherState.errorMessage ? (
          <p className="text-xs text-slate-600" role="status" aria-live="polite">
            {weatherState.errorMessage}
          </p>
        ) : null}
      </div>
    </section>
  );
}
