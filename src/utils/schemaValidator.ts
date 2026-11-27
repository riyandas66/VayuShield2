import type {
  ActionCategory,
  ActionItem,
  AirQualityPlan,
  RiskLevel,
  RoutineBlock,
  TimeOfDay,
} from '../types/aqi';
import { sanitizePlainText } from './sanitize';

const VALID_TIMES: ReadonlySet<TimeOfDay> = new Set(['morning', 'afternoon', 'evening']);
const VALID_RISKS: ReadonlySet<RiskLevel> = new Set(['low', 'moderate', 'high']);
const VALID_CATEGORIES: ReadonlySet<ActionCategory> = new Set([
  'zero_cost',
  'indoor_setup',
  'sustainable_swaps',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateRoutineBlock(raw: unknown, index: number): RoutineBlock | null {
  if (!isRecord(raw)) return null;

  const timeOfDay = raw.timeOfDay;
  const riskLevel = raw.riskLevel;

  if (typeof timeOfDay !== 'string' || !VALID_TIMES.has(timeOfDay as TimeOfDay)) {
    return null;
  }
  if (typeof riskLevel !== 'string' || !VALID_RISKS.has(riskLevel as RiskLevel)) {
    return null;
  }
  if (
    typeof raw.timeWindow !== 'string' ||
    typeof raw.title !== 'string' ||
    typeof raw.summary !== 'string' ||
    typeof raw.rationale !== 'string' ||
    !Array.isArray(raw.steps)
  ) {
    return null;
  }

  const steps = raw.steps
    .filter((s): s is string => typeof s === 'string')
    .map((s) => sanitizePlainText(s, 180))
    .filter((s) => s.length > 0)
    .slice(0, 4);

  if (steps.length === 0) return null;

  const title = sanitizePlainText(raw.title, 90);
  const summary = sanitizePlainText(raw.summary, 200);
  const rationale = sanitizePlainText(raw.rationale, 360);
  const timeWindow = sanitizePlainText(raw.timeWindow, 40);

  if (!title || !summary || !rationale || !timeWindow) return null;

  const rawId = typeof raw.id === 'string' ? sanitizePlainText(raw.id, 40) : '';

  return {
    id: rawId || `routine-${timeOfDay}-${index}`,
    timeOfDay: timeOfDay as TimeOfDay,
    timeWindow,
    title,
    riskLevel: riskLevel as RiskLevel,
    summary,
    steps,
    rationale,
  };
}

function validateActionItem(raw: unknown, index: number): ActionItem | null {
  if (!isRecord(raw)) return null;

  const category = raw.category;
  if (typeof category !== 'string' || !VALID_CATEGORIES.has(category as ActionCategory)) {
    return null;
  }
  if (
    typeof raw.title !== 'string' ||
    typeof raw.description !== 'string' ||
    typeof raw.pm25ReductionPct !== 'number' ||
    typeof raw.weeklyCo2SavedKg !== 'number' ||
    !Number.isFinite(raw.pm25ReductionPct) ||
    !Number.isFinite(raw.weeklyCo2SavedKg)
  ) {
    return null;
  }

  const title = sanitizePlainText(raw.title, 90);
  const description = sanitizePlainText(raw.description, 220);
  const effortLabel =
    typeof raw.effortLabel === 'string' && sanitizePlainText(raw.effortLabel, 32)
      ? sanitizePlainText(raw.effortLabel, 32)
      : 'Daily Habit';

  if (!title || !description) return null;

  const rawId = typeof raw.id === 'string' ? sanitizePlainText(raw.id, 48) : '';

  return {
    id: rawId || `action-${category}-${index}`,
    category: category as ActionCategory,
    title,
    description,
    pm25ReductionPct: Math.max(0, Math.min(45, Math.round(raw.pm25ReductionPct))),
    weeklyCo2SavedKg: Math.max(0, Math.min(35, Math.round(raw.weeklyCo2SavedKg * 10) / 10)),
    effortLabel,
  };
}

/**
 * Strictly validates untrusted JSON (from Gemini API or localStorage) against
 * the AirQualityPlan contract before it is ever rendered in the UI.
 */
export function validateAirQualityPlan(raw: unknown): AirQualityPlan | null {
  if (!isRecord(raw)) return null;

  if (
    typeof raw.advisoryHeadline !== 'string' ||
    typeof raw.advisoryDetail !== 'string' ||
    typeof raw.dominantPollutant !== 'string' ||
    typeof raw.safeVentilationWindow !== 'string' ||
    !Array.isArray(raw.routine) ||
    !Array.isArray(raw.actions)
  ) {
    return null;
  }

  const advisoryHeadline = sanitizePlainText(raw.advisoryHeadline, 120);
  const advisoryDetail = sanitizePlainText(raw.advisoryDetail, 300);
  const dominantPollutant = sanitizePlainText(raw.dominantPollutant, 40);
  const safeVentilationWindow = sanitizePlainText(raw.safeVentilationWindow, 60);

  if (!advisoryHeadline || !advisoryDetail || !dominantPollutant || !safeVentilationWindow) {
    return null;
  }

  const routine: RoutineBlock[] = [];
  for (let i = 0; i < raw.routine.length; i += 1) {
    const valid = validateRoutineBlock(raw.routine[i], i);
    if (!valid) return null;
    routine.push(valid);
  }

  // Must contain Morning, Afternoon, Evening
  const routineTimes = new Set(routine.map((r) => r.timeOfDay));
  if (routine.length < 3 || !routineTimes.has('morning') || !routineTimes.has('afternoon') || !routineTimes.has('evening')) {
    return null;
  }

  const actions: ActionItem[] = [];
  const seenIds = new Set<string>();
  for (let i = 0; i < raw.actions.length; i += 1) {
    const valid = validateActionItem(raw.actions[i], i);
    if (!valid) return null;
    if (seenIds.has(valid.id)) {
      valid.id = `${valid.id}-${i}`;
    }
    seenIds.add(valid.id);
    actions.push(valid);
  }

  // Ensure every tab has at least 1 valid action
  const categoriesPresent = new Set(actions.map((a) => a.category));
  if (
    !categoriesPresent.has('zero_cost') ||
    !categoriesPresent.has('indoor_setup') ||
    !categoriesPresent.has('sustainable_swaps')
  ) {
    return null;
  }

  return {
    advisoryHeadline,
    advisoryDetail,
    dominantPollutant,
    safeVentilationWindow,
    routine: routine.slice(0, 3),
    actions: actions.slice(0, 15),
  };
}
