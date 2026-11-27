import type { AqiThemeTokens, ImpactMetrics } from '../types/aqi';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';

interface ImpactScorecardProps {
  impact: ImpactMetrics;
  theme: AqiThemeTokens;
  isHighlighted: boolean;
  onResetChecks: () => void;
}

export function ImpactScorecard({
  impact,
  theme,
  isHighlighted,
  onResetChecks,
}: ImpactScorecardProps) {
  const animatedPm25 = useAnimatedNumber(impact.pm25ReductionPct, 260, 0);
  const animatedCo2 = useAnimatedNumber(impact.weeklyCo2SavedKg, 260, 1);
  const animatedScore = useAnimatedNumber(impact.cleanAirScore, 260, 0);

  return (
    <section
      id="impact-scorecard"
      aria-labelledby="impact-scorecard-heading"
      className={`bento-card xl:col-span-4 rounded-2xl p-6 sm:p-7 flex flex-col justify-between gap-5 ${
        isHighlighted ? 'ring-2 ring-slate-900 ring-offset-2' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <p className="text-xs font-medium text-slate-500">Live Simulation</p>
          <h2
            id="impact-scorecard-heading"
            className="mt-1 font-display text-xl font-bold text-slate-950"
          >
            Direct Impact Scorecard
          </h2>
        </div>

        {impact.activeActionCount > 0 && (
          <button
            type="button"
            onClick={onResetChecks}
            className="text-xs font-medium text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-slate-950 transition-colors whitespace-nowrap shrink-0"
          >
            Reset
          </button>
        )}
      </div>

      {/* Three Stacked Quantified KPIs separated by clean hairlines (no nested cards) */}
      <div className="divide-y divide-slate-100">
        {/* Metric 1: PM2.5 Exposure Reduction */}
        <div className="py-3.5 first:pt-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-medium text-slate-600">
              PM2.5 Exposure Reduction
            </span>
            <span
              data-testid="metric-pm25-reduction"
              className="font-mono text-2xl font-semibold tabular-nums text-emerald-800"
            >
              {animatedPm25}%
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Compounded indoor filtration and avoidance efficiency
          </p>
        </div>

        {/* Metric 2: Weekly CO2 Saved */}
        <div className="py-3.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-medium text-slate-600">
              Weekly CO2 Saved
            </span>
            <span
              data-testid="metric-co2-saved"
              className="font-mono text-2xl font-semibold tabular-nums text-slate-950"
            >
              {animatedCo2.toFixed(1)} <span className="text-sm font-medium text-slate-500">kg</span>
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Low-emission commute and household energy swaps
          </p>
        </div>

        {/* Metric 3: Clean Air Score */}
        <div className="pt-3.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-medium text-slate-600">
              Clean Air Score
            </span>
            <span
              data-testid="metric-clean-air-score"
              className="font-mono text-2xl font-semibold tabular-nums text-slate-950"
            >
              {animatedScore}
              <span className="text-sm font-medium text-slate-500">/100</span>
            </span>
          </div>

          <div
            className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-label="Clean Air Score"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={impact.cleanAirScore}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${impact.cleanAirScore}%`,
                backgroundColor: theme.strokeHex,
              }}
            />
          </div>
        </div>
      </div>

      {/* Live Status Announcement Footer */}
      <div
        role="status"
        aria-live="polite"
        className="flex items-center justify-between border-t border-slate-100 pt-3.5 text-xs text-slate-600"
      >
        <span>Active Actions</span>
        <span className="font-mono font-semibold tabular-nums text-slate-900">
          {impact.activeActionCount} / {impact.totalActionCount} selected
        </span>
      </div>
    </section>
  );
}
