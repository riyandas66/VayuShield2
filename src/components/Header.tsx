import {
  CITY_PRESETS,
  type AqiThemeTokens,
  type CityPresetId,
  type ImpactMetrics,
} from '../types/aqi';
import { BrandShieldIcon, SlidersIcon } from './Icons';

interface HeaderProps {
  activeCityId: CityPresetId;
  resolvedCityName: string;
  aqi: number;
  theme: AqiThemeTokens;
  impact: ImpactMetrics;
  onSelectCity: (cityId: CityPresetId) => void;
  onImpactClick: () => void;
  onOpenMobileControls: () => void;
}

export function Header({
  activeCityId,
  resolvedCityName,
  aqi,
  theme,
  impact,
  onSelectCity,
  onImpactClick,
  onOpenMobileControls,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand mark & live AQI telemetry status */}
        <div className="flex items-center gap-4 min-w-0">
          <a
            href="#main-workspace"
            className="flex items-center gap-2.5 text-slate-900 whitespace-nowrap shrink-0 focus-visible:rounded-md"
            aria-label="VayuShield home"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-900"
              style={{ color: theme.strokeHex }}
            >
              <BrandShieldIcon className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-slate-900">
              VayuShield
            </span>
          </a>

          <div
            className={`hidden sm:inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0 ${theme.surfaceTintClass} ${theme.borderTintClass} ${theme.textAccentClass}`}
            role="status"
            aria-live="polite"
            aria-label={`Live air quality for ${resolvedCityName}: AQI ${aqi}, ${theme.shortLabel}`}
          >
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${theme.dotClass}`}
              />
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${theme.dotClass}`}
              />
            </span>
            <span className="font-mono font-semibold tabular-nums">AQI {aqi}</span>
            <span aria-hidden="true" className="opacity-45">
              ·
            </span>
            <span>{theme.shortLabel}</span>
          </div>
        </div>

        {/* Zone 2: City Quick-Switcher */}
        <nav
          aria-label="City air quality presets"
          className="hidden lg:flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/80 p-1"
        >
          {CITY_PRESETS.map((city) => {
            const isActive = city.id === activeCityId;
            return (
              <button
                key={city.id}
                type="button"
                onClick={() => onSelectCity(city.id)}
                aria-pressed={isActive}
                className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {city.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Interactive Impact Summary & Mobile Configure trigger */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onImpactClick}
            className="inline-flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200 whitespace-nowrap shrink-0"
            aria-label={`View Impact Summary: Clean Air Score ${impact.cleanAirScore} out of 100, ${impact.pm25ReductionPct}% PM2.5 reduction`}
          >
            <span className="text-slate-600">Impact</span>
            <span className="font-mono font-semibold tabular-nums text-slate-950">
              {impact.cleanAirScore}/100
            </span>
            <span
              className="hidden md:inline font-mono text-[11px] font-medium tabular-nums text-emerald-800"
              aria-hidden="true"
            >
              -{impact.pm25ReductionPct}% PM2.5
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenMobileControls}
            className="inline-flex lg:hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            aria-label="Open configuration controls"
          >
            <SlidersIcon className="h-3.5 w-3.5" />
            <span>Configure</span>
          </button>
        </div>
      </div>

      {/* Compact single-row city bar on mobile/tablet */}
      <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto border-t border-slate-100 px-4 py-2 bg-white/90">
        {CITY_PRESETS.map((city) => {
          const isActive = city.id === activeCityId;
          return (
            <button
              key={city.id}
              type="button"
              onClick={() => onSelectCity(city.id)}
              aria-pressed={isActive}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {city.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
