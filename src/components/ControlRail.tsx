import { useEffect } from 'react';
import {
  COMMUTE_OPTIONS,
  HOUSEHOLD_OPTIONS,
  INDOOR_EQUIPMENT_OPTIONS,
  type AqiThemeTokens,
  type CommuteMode,
  type HouseholdMember,
  type IndoorEquipment,
  type UserAirConfig,
} from '../types/aqi';
import { getAqiDetailedBand } from '../utils/aqiMath';
import { sanitizeLocation } from '../utils/sanitize';
import { CheckIcon, CloseIcon } from './Icons';

interface ControlRailProps {
  config: UserAirConfig;
  theme: AqiThemeTokens;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onAqiChange: (aqi: number) => void;
  onCustomLocationChange: (rawLocation: string) => void;
  onToggleHousehold: (member: HouseholdMember) => void;
  onToggleIndoor: (equipment: IndoorEquipment) => void;
  onSelectCommute: (mode: CommuteMode) => void;
}

export function ControlRail({
  config,
  theme,
  isMobileOpen,
  onCloseMobile,
  onAqiChange,
  onCustomLocationChange,
  onToggleHousehold,
  onToggleIndoor,
  onSelectCommute,
}: ControlRailProps) {
  const detailedBand = getAqiDetailedBand(config.aqi);
  const sanitizedPreview = sanitizeLocation(config.customLocation);
  const wasSanitized =
    config.customLocation.trim().length > 0 &&
    sanitizedPreview !== config.customLocation.trim();

  // Escape key dismissal for mobile drawer
  useEffect(() => {
    if (!isMobileOpen) return;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, onCloseMobile]);

  const panelBody = (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900">
            Exposure Profile
          </h2>
          <p className="mt-0.5 text-xs text-slate-600">
            Tune ambient AQI and home conditions
          </p>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="inline-flex lg:hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
          aria-label="Close configuration panel"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Custom Location Input when Custom city preset is active */}
      {config.cityId === 'custom' && (
        <div className="space-y-2">
          <label
            htmlFor="custom-city-input"
            className="block text-xs font-semibold text-slate-800"
          >
            Custom Location
          </label>
          <input
            id="custom-city-input"
            type="text"
            value={config.customLocation}
            onChange={(e) => onCustomLocationChange(e.target.value)}
            maxLength={60}
            placeholder="e.g., Pune, Kolkata, Jaipur"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
          />
          {wasSanitized && (
            <p className="text-[11px] text-slate-600" role="status">
              Sanitized location: <span className="font-medium text-slate-900">{sanitizedPreview || 'Custom City'}</span>
            </p>
          )}
        </div>
      )}

      {/* Custom AQI Range Slider (0–500) */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <label
            htmlFor="aqi-range-slider"
            className="text-xs font-semibold text-slate-800"
          >
            Ambient AQI Level
          </label>
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-semibold tabular-nums text-slate-950">
              {config.aqi}
            </span>
            <span
              className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${theme.riskTagClass}`}
            >
              {detailedBand}
            </span>
          </div>
        </div>

        <input
          id="aqi-range-slider"
          type="range"
          min={0}
          max={500}
          step={1}
          value={config.aqi}
          onChange={(e) => onAqiChange(Number(e.target.value))}
          aria-label="Ambient Air Quality Index"
          aria-valuemin={0}
          aria-valuemax={500}
          aria-valuenow={config.aqi}
          aria-valuetext={`${config.aqi}, ${detailedBand}`}
          className="aqi-slider"
        />

        <div
          className="flex justify-between font-mono text-[11px] tabular-nums text-slate-500"
          aria-hidden="true"
        >
          <span>0 Good</span>
          <span>150 Mod</span>
          <span>300 Poor</span>
          <span>500 Sev</span>
        </div>
      </div>

      {/* Household Profile Segmented Controls */}
      <fieldset className="space-y-2.5">
        <legend className="text-xs font-semibold text-slate-800">
          Household Profile
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {HOUSEHOLD_OPTIONS.map((member) => {
            const active = config.household.includes(member.id);
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => onToggleHousehold(member.id)}
                aria-pressed={active}
                className={`flex flex-col items-start rounded-lg border px-3 py-2 text-left transition-all duration-200 ${
                  active
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                    : 'border-slate-200 bg-slate-50/70 text-slate-800 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <span className="text-xs font-semibold whitespace-nowrap">
                  {member.label}
                </span>
                <span
                  className={`mt-0.5 text-[11px] leading-tight ${
                    active ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {member.detail}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Indoor Setup Toggle Chips */}
      <fieldset className="space-y-2.5">
        <legend className="text-xs font-semibold text-slate-800">
          Indoor Setup
        </legend>
        <div className="flex flex-wrap gap-2">
          {INDOOR_EQUIPMENT_OPTIONS.map((item) => {
            const active = config.indoorSetup.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggleIndoor(item.id)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                  active
                    ? `${theme.surfaceTintClass} ${theme.borderTintClass} ${theme.textAccentClass} font-semibold`
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`flex h-3.5 w-3.5 items-center justify-center rounded-xs border ${
                    active
                      ? 'border-current bg-current/10'
                      : 'border-slate-300 bg-transparent'
                  }`}
                  aria-hidden="true"
                >
                  {active && <CheckIcon className="h-2.5 w-2.5" />}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Commute Mode Radio Group */}
      <fieldset className="space-y-2.5">
        <legend className="text-xs font-semibold text-slate-800">
          Primary Commute Mode
        </legend>
        <div role="radiogroup" aria-label="Primary commute mode" className="space-y-1.5">
          {COMMUTE_OPTIONS.map((option) => {
            const selected = config.commuteMode === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onSelectCommute(option.id)}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-xs font-medium transition-all duration-200 ${
                  selected
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="whitespace-nowrap">{option.label}</span>
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    selected ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {option.baselineCo2KgPerWeek === 0
                    ? '0 kg CO2'
                    : `${option.baselineCo2KgPerWeek} kg/wk`}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Rail */}
      <aside
        aria-label="Air quality configuration controls"
        className="hidden lg:block w-[312px] shrink-0"
      >
        <div className="bento-card sticky top-24 rounded-2xl p-5">
          {panelBody}
        </div>
      </aside>

      {/* Mobile Collapsible Drawer */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Air quality configuration controls"
        >
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-full max-w-xs overflow-y-auto bg-white p-5 shadow-xl">
            {panelBody}
          </aside>
        </div>
      )}
    </>
  );
}
