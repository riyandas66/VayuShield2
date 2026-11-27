import { useState } from 'react';
import type { RiskLevel, RoutineBlock, TimeOfDay } from '../types/aqi';
import { ChevronDownIcon, CloudSunIcon, MoonIcon, SunIcon } from './Icons';

interface DailyRoutineProps {
  routine: readonly RoutineBlock[];
  isLoading: boolean;
}

const RISK_META: Record<RiskLevel, { label: string; badgeClass: string; dotClass: string }> = {
  low: {
    label: 'Low Risk',
    badgeClass: 'text-emerald-900 bg-emerald-50 border-emerald-200',
    dotClass: 'bg-emerald-600',
  },
  moderate: {
    label: 'Moderate Risk',
    badgeClass: 'text-amber-950 bg-amber-50 border-amber-200',
    dotClass: 'bg-amber-600',
  },
  high: {
    label: 'High Exposure',
    badgeClass: 'text-red-950 bg-red-50 border-red-200',
    dotClass: 'bg-red-600',
  },
};

function TimeSlotIcon({ timeOfDay }: { timeOfDay: TimeOfDay }) {
  switch (timeOfDay) {
    case 'morning':
      return <SunIcon className="h-4 w-4 text-amber-700" />;
    case 'afternoon':
      return <CloudSunIcon className="h-4 w-4 text-sky-700" />;
    case 'evening':
      return <MoonIcon className="h-4 w-4 text-slate-700" />;
  }
}

const TIME_LABELS: Record<TimeOfDay, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};

export function DailyRoutine({ routine, isLoading }: DailyRoutineProps) {
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(
    () => new Set<string>()
  );

  const toggleRationale = (id: string): void => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <section
      aria-labelledby="daily-routine-heading"
      className="bento-card xl:col-span-6 rounded-2xl p-6 sm:p-7 flex flex-col gap-5"
    >
      <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <p className="text-xs font-medium text-slate-500">Time-Blocked Protocol</p>
          <h2
            id="daily-routine-heading"
            className="mt-1 font-display text-xl font-bold text-slate-950"
          >
            Daily Air-Safe Routine
          </h2>
        </div>
        <span className="text-xs text-slate-500 whitespace-nowrap">
          3 diurnal phases
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-6" aria-busy="true" aria-label="Loading daily routine">
          {[0, 1, 2].map((idx) => (
            <div key={idx} className="space-y-2.5 border-b border-slate-100 pb-5 last:border-none">
              <div className="skeleton-bar h-4 w-1/3 rounded-md bg-slate-200" />
              <div className="skeleton-bar h-5 w-2/3 rounded-md bg-slate-200" />
              <div className="skeleton-bar h-3.5 w-full rounded-md bg-slate-100" />
              <div className="skeleton-bar h-3.5 w-5/6 rounded-md bg-slate-100" />
            </div>
          ))}
        </div>
      ) : (
        <ol className="relative space-y-6 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
          {routine.map((block) => {
            const risk = RISK_META[block.riskLevel];
            const isExpanded = expandedIds.has(block.id);
            const drawerId = `rationale-${block.id}`;

            return (
              <li key={block.id} className="relative pl-10">
                {/* Timeline Marker */}
                <span
                  className="absolute left-0 top-0.5 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white shadow-2xs"
                  aria-hidden="true"
                >
                  <TimeSlotIcon timeOfDay={block.timeOfDay} />
                </span>

                <div className="space-y-2.5 pb-5 border-b border-slate-100 last:border-b-0 last:pb-0">
                  {/* Phase + Window + Risk Tag */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="font-semibold text-slate-900">
                        {TIME_LABELS[block.timeOfDay]}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span className="font-mono tabular-nums text-slate-600">
                        {block.timeWindow}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${risk.badgeClass}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${risk.dotClass}`}
                        aria-hidden="true"
                      />
                      {risk.label}
                    </span>
                  </div>

                  {/* Title & Summary */}
                  <div>
                    <h3 className="font-display text-base font-semibold text-slate-950">
                      {block.title}
                    </h3>
                    <p className="mt-1 text-xs sm:text-[13px] leading-relaxed text-slate-600">
                      {block.summary}
                    </p>
                  </div>

                  {/* Concrete Steps */}
                  <ul className="space-y-1.5 pt-1 text-xs sm:text-[13px] text-slate-800">
                    {block.steps.map((step, stepIndex) => (
                      <li key={stepIndex} className="flex items-start gap-2 leading-relaxed">
                        <span
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400"
                          aria-hidden="true"
                        />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Expandable Scientific Rationale Drawer */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => toggleRationale(block.id)}
                      aria-expanded={isExpanded}
                      aria-controls={drawerId}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 transition-colors py-1"
                    >
                      <span>Why this matters</span>
                      <ChevronDownIcon
                        className={`h-3.5 w-3.5 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {isExpanded && (
                      <div
                        id={drawerId}
                        className="mt-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 py-3 text-xs leading-relaxed text-slate-700"
                      >
                        <p className="font-semibold text-slate-900">
                          Atmospheric Science Note
                        </p>
                        <p className="mt-1">{block.rationale}</p>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
