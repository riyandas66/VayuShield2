import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CITY_PRESETS,
  type AirQualityPlan,
  type CityPresetId,
  type CommuteMode,
  type HouseholdMember,
  type IndoorEquipment,
  type PlanSource,
  type UserAirConfig,
  type WeatherState,
} from './types/aqi';
import {
  calculateImpactMetrics,
  estimateParticulates,
  getAqiSeverity,
  getAqiTheme,
  getResolvedCityName,
} from './utils/aqiMath';
import { clampAqi, createConfigHash } from './utils/sanitize';
import { generateFallbackPlan } from './services/fallbackEngine';
import { generatePersonalizedPlan, getCachedPlan } from './services/geminiService';
import { fetchCityWeather } from './services/weatherService';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { Header } from './components/Header';
import { ControlRail } from './components/ControlRail';
import { HeroTelemetryCard } from './components/HeroTelemetryCard';
import { ImpactScorecard } from './components/ImpactScorecard';
import { DailyRoutine } from './components/DailyRoutine';
import { ActionMatrix } from './components/ActionMatrix';

const COMPLETED_ACTIONS_KEY = 'vayushield_completed_actions_v1';

const INITIAL_CONFIG: UserAirConfig = {
  cityId: 'delhi',
  customLocation: '',
  aqi: 312,
  household: ['commuters'],
  indoorSetup: ['hepa_purifier', 'gas_stove'],
  commuteMode: 'public_transit',
};

function loadSavedCompletedActions(hash: string): Set<string> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return new Set<string>(['zc-wet-mop']);
  }
  try {
    const raw = window.localStorage.getItem(COMPLETED_ACTIONS_KEY);
    if (!raw) return new Set<string>(['zc-wet-mop']);
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return new Set<string>(['zc-wet-mop']);
    }
    const list = (parsed as Record<string, unknown>)[hash];
    if (Array.isArray(list)) {
      return new Set<string>(list.filter((id): id is string => typeof id === 'string'));
    }
  } catch {
    // Fallback cleanly
  }
  return new Set<string>(['zc-wet-mop']);
}

function persistCompletedActions(hash: string, ids: ReadonlySet<string>): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    const raw = window.localStorage.getItem(COMPLETED_ACTIONS_KEY);
    const parsed: Record<string, string[]> =
      raw && typeof JSON.parse(raw) === 'object' && JSON.parse(raw) !== null
        ? (JSON.parse(raw) as Record<string, string[]>)
        : {};
    parsed[hash] = Array.from(ids);
    window.localStorage.setItem(COMPLETED_ACTIONS_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore storage quota issues
  }
}

export default function App() {
  const [config, setConfig] = useState<UserAirConfig>(INITIAL_CONFIG);
  const [isMobileControlsOpen, setIsMobileControlsOpen] = useState(false);
  const [isScorecardHighlighted, setIsScorecardHighlighted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState<string | undefined>(undefined);
  const [weatherState, setWeatherState] = useState<WeatherState>({
    status: 'loading',
    data: null,
  });
  const [weatherRefreshNonce, setWeatherRefreshNonce] = useState(0);

  // Debounce rapid slider & text input changes so plan hash lookups stay smooth
  const debouncedAqi = useDebouncedValue(config.aqi, 140);
  const debouncedCustomLocation = useDebouncedValue(config.customLocation, 220);

  const effectiveConfig = useMemo<UserAirConfig>(
    () => ({
      ...config,
      aqi: debouncedAqi,
      customLocation: debouncedCustomLocation,
    }),
    [config, debouncedAqi, debouncedCustomLocation]
  );

  const configHash = useMemo(
    () => createConfigHash(effectiveConfig),
    [effectiveConfig]
  );

  const [planState, setPlanState] = useState<{
    plan: AirQualityPlan;
    source: PlanSource;
    hash: string;
  }>(() => {
    const initialHash = createConfigHash(INITIAL_CONFIG);
    const cached = getCachedPlan(initialHash);
    if (cached) {
      return { plan: cached, source: 'cache', hash: initialHash };
    }
    return {
      plan: generateFallbackPlan(INITIAL_CONFIG),
      source: 'fallback',
      hash: initialHash,
    };
  });

  const [completedActionIds, setCompletedActionIds] = useState<Set<string>>(() =>
    loadSavedCompletedActions(createConfigHash(INITIAL_CONFIG))
  );

  const abortControllerRef = useRef<AbortController | null>(null);
  const weatherAbortRef = useRef<AbortController | null>(null);

  // Fetch live OpenWeather telemetry when city preset, debounced custom location, or manual refresh changes
  useEffect(() => {
    weatherAbortRef.current?.abort();
    const controller = new AbortController();
    weatherAbortRef.current = controller;

    let isCurrent = true;
    const bypassCache = weatherRefreshNonce > 0;
    setWeatherState((prev) => ({
      status: 'loading',
      data: prev.data,
    }));

    fetchCityWeather(effectiveConfig.cityId, effectiveConfig.customLocation, {
      bypassCache,
      signal: controller.signal,
    })
      .then((result) => {
        if (isCurrent) {
          setWeatherState(result);
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        if (isCurrent) {
          setWeatherState({
            status: 'error',
            data: null,
            errorMessage: 'Weather service unavailable while offline.',
          });
        }
      });

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [effectiveConfig.cityId, effectiveConfig.customLocation, weatherRefreshNonce]);

  const handleRefreshWeather = useCallback(() => {
    setWeatherRefreshNonce((n) => n + 1);
  }, []);

  // Synchronize deterministic / cached plan instantly when configuration settles
  useEffect(() => {
    if (planState.hash === configHash) {
      return;
    }
    const cached = getCachedPlan(configHash);
    if (cached) {
      setPlanState({ plan: cached, source: 'cache', hash: configHash });
    } else {
      setPlanState({
        plan: generateFallbackPlan(effectiveConfig),
        source: 'fallback',
        hash: configHash,
      });
    }
    setNotice(undefined);
    setCompletedActionIds(loadSavedCompletedActions(configHash));
  }, [configHash, effectiveConfig, planState.hash]);

  // Immediate live visual feedback for AQI gauge, theme, and particulates
  const severity = useMemo(() => getAqiSeverity(config.aqi), [config.aqi]);
  const theme = useMemo(() => getAqiTheme(severity), [severity]);
  const particulates = useMemo(() => estimateParticulates(config.aqi), [config.aqi]);
  const resolvedCityName = useMemo(() => getResolvedCityName(config), [config]);

  const impact = useMemo(
    () => calculateImpactMetrics(config, planState.plan.actions, completedActionIds),
    [config, planState.plan.actions, completedActionIds]
  );

  const handleSelectCity = useCallback((cityId: CityPresetId) => {
    const preset = CITY_PRESETS.find((c) => c.id === cityId);
    setConfig((prev) => ({
      ...prev,
      cityId,
      aqi: preset ? preset.defaultAqi : prev.aqi,
    }));
  }, []);

  const handleAqiChange = useCallback((nextAqi: number) => {
    setConfig((prev) => ({ ...prev, aqi: clampAqi(nextAqi) }));
  }, []);

  const handleCustomLocationChange = useCallback((rawLocation: string) => {
    setConfig((prev) => ({ ...prev, customLocation: rawLocation }));
  }, []);

  const handleToggleHousehold = useCallback((member: HouseholdMember) => {
    setConfig((prev) => {
      const exists = prev.household.includes(member);
      const next = exists
        ? prev.household.filter((m) => m !== member)
        : [...prev.household, member];
      return { ...prev, household: next };
    });
  }, []);

  const handleToggleIndoor = useCallback((equipment: IndoorEquipment) => {
    setConfig((prev) => {
      const exists = prev.indoorSetup.includes(equipment);
      const next = exists
        ? prev.indoorSetup.filter((e) => e !== equipment)
        : [...prev.indoorSetup, equipment];
      return { ...prev, indoorSetup: next };
    });
  }, []);

  const handleSelectCommute = useCallback((commuteMode: CommuteMode) => {
    setConfig((prev) => ({ ...prev, commuteMode }));
  }, []);

  const handleToggleAction = useCallback(
    (actionId: string) => {
      setCompletedActionIds((prev) => {
        const next = new Set(prev);
        if (next.has(actionId)) {
          next.delete(actionId);
        } else {
          next.add(actionId);
        }
        persistCompletedActions(configHash, next);
        return next;
      });
    },
    [configHash]
  );

  const handleResetChecks = useCallback(() => {
    const empty = new Set<string>();
    setCompletedActionIds(empty);
    persistCompletedActions(configHash, empty);
  }, [configHash]);

  const handleImpactClick = useCallback(() => {
    const el = document.getElementById('impact-scorecard');
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setIsScorecardHighlighted(true);
    window.setTimeout(() => setIsScorecardHighlighted(false), 1200);
  }, []);

  const handleGeneratePlan = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsGenerating(true);
    setNotice(undefined);

    try {
      const result = await generatePersonalizedPlan(effectiveConfig, {
        bypassCache: false,
        signal: controller.signal,
        weather: weatherState.data,
      });

      setPlanState({
        plan: result.plan,
        source: result.source,
        hash: result.cacheHash,
      });
      setNotice(result.notice);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      setNotice('Unable to refresh plan right now. Showing local environmental guidance.');
    } finally {
      setIsGenerating(false);
    }
  }, [effectiveConfig, weatherState.data]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      <a
        href="#main-workspace"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:text-white"
      >
        Skip to main dashboard
      </a>

      <Header
        activeCityId={config.cityId}
        resolvedCityName={resolvedCityName}
        aqi={config.aqi}
        theme={theme}
        impact={impact}
        onSelectCity={handleSelectCity}
        onImpactClick={handleImpactClick}
        onOpenMobileControls={() => setIsMobileControlsOpen(true)}
      />

      <div className="mx-auto flex w-full max-w-[1440px] flex-1 gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <ControlRail
          config={config}
          theme={theme}
          isMobileOpen={isMobileControlsOpen}
          onCloseMobile={() => setIsMobileControlsOpen(false)}
          onAqiChange={handleAqiChange}
          onCustomLocationChange={handleCustomLocationChange}
          onToggleHousehold={handleToggleHousehold}
          onToggleIndoor={handleToggleIndoor}
          onSelectCommute={handleSelectCommute}
        />

        <main
          id="main-workspace"
          className="flex-1 min-w-0"
          aria-label="Urban air quality dashboard workspace"
        >
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <HeroTelemetryCard
              cityName={resolvedCityName}
              aqi={config.aqi}
              pm25={particulates.pm25}
              pm10={particulates.pm10}
              theme={theme}
              plan={planState.plan}
              planSource={planState.source}
              isGenerating={isGenerating}
              notice={notice}
              weatherState={weatherState}
              onGeneratePlan={handleGeneratePlan}
              onRefreshWeather={handleRefreshWeather}
            />

            <ImpactScorecard
              impact={impact}
              theme={theme}
              isHighlighted={isScorecardHighlighted}
              onResetChecks={handleResetChecks}
            />

            <DailyRoutine
              routine={planState.plan.routine}
              isLoading={isGenerating}
            />

            <ActionMatrix
              actions={planState.plan.actions}
              completedActionIds={completedActionIds}
              isLoading={isGenerating}
              onToggleAction={handleToggleAction}
            />
          </div>
        </main>
      </div>

      <footer className="border-t border-slate-200/80 bg-white/60 mt-8">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-slate-500 sm:px-6 lg:px-8">
          <span>VayuShield — Urban Air Quality &amp; Low-Emission Assistant</span>
          <span>
            Guidance reflects CPCB/WHO PM2.5 exposure research · Informational use only
          </span>
        </div>
      </footer>
    </div>
  );
}
