import { useRef, useState, type KeyboardEvent } from 'react';
import type { ActionCategory, ActionItem } from '../types/aqi';
import { CheckIcon } from './Icons';

interface ActionMatrixProps {
  actions: readonly ActionItem[];
  completedActionIds: ReadonlySet<string>;
  isLoading: boolean;
  onToggleAction: (actionId: string) => void;
}

const CATEGORY_TABS: ReadonlyArray<{
  id: ActionCategory;
  label: string;
}> = [
  { id: 'zero_cost', label: 'Zero-Cost Hacks' },
  { id: 'indoor_setup', label: 'Indoor Setup' },
  { id: 'sustainable_swaps', label: 'Sustainable Swaps' },
];

export function ActionMatrix({
  actions,
  completedActionIds,
  isLoading,
  onToggleAction,
}: ActionMatrixProps) {
  const [activeTab, setActiveTab] = useState<ActionCategory>('zero_cost');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const visibleActions = actions.filter((item) => item.category === activeTab);

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number
  ): void => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
      return;
    }
    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex =
      (currentIndex + delta + CATEGORY_TABS.length) % CATEGORY_TABS.length;
    const nextTab = CATEGORY_TABS[nextIndex];
    setActiveTab(nextTab.id);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <section
      aria-labelledby="action-matrix-heading"
      className="bento-card xl:col-span-6 rounded-2xl p-6 sm:p-7 flex flex-col gap-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Interactive Impact Checklist
          </p>
          <h2
            id="action-matrix-heading"
            className="mt-1 font-display text-xl font-bold text-slate-950"
          >
            Indoor Air &amp; Low-Emission Swaps
          </h2>
        </div>
        <span className="text-xs text-slate-500">
          Toggle actions to update scorecard
        </span>
      </div>

      {/* Accessible WAI-ARIA Tablist */}
      <div
        role="tablist"
        aria-label="Action categories"
        className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1"
      >
        {CATEGORY_TABS.map((tab, index) => {
          const isSelected = tab.id === activeTab;
          const tabActions = actions.filter((a) => a.category === tab.id);
          const doneCount = tabActions.filter((a) =>
            completedActionIds.has(a.id)
          ).length;

          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              id={`tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => handleTabKeyDown(e, index)}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
                isSelected
                  ? 'bg-white text-slate-950 shadow-xs ring-1 ring-slate-200/90'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="truncate">{tab.label}</span>
              {doneCount > 0 && (
                <span className="font-mono text-[11px] tabular-nums text-emerald-800">
                  ({doneCount})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Tab Panel */}
      <div
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        className="space-y-3"
      >
        {isLoading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading recommended actions">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 p-4 space-y-2"
              >
                <div className="skeleton-bar h-4 w-3/4 rounded-md bg-slate-200" />
                <div className="skeleton-bar h-3.5 w-full rounded-md bg-slate-100" />
              </div>
            ))}
          </div>
        ) : (
          visibleActions.map((item) => {
            const isChecked = completedActionIds.has(item.id);
            return (
              <button
                key={item.id}
                type="button"
                role="checkbox"
                aria-checked={isChecked}
                onClick={() => onToggleAction(item.id)}
                className={`group w-full rounded-xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 ${
                  isChecked
                    ? 'border-emerald-300 bg-emerald-50/55 shadow-2xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                      isChecked
                        ? 'border-emerald-700 bg-emerald-700 text-white'
                        : 'border-slate-300 bg-white text-transparent group-hover:border-slate-400'
                    }`}
                    aria-hidden="true"
                  >
                    <CheckIcon className="h-3.5 w-3.5" />
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span
                        className={`text-sm font-semibold leading-snug ${
                          isChecked ? 'text-emerald-950' : 'text-slate-950'
                        }`}
                      >
                        {item.title}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
                        {item.effortLabel}
                      </span>
                    </div>

                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {item.description}
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums">
                      <span className="font-semibold text-emerald-800">
                        -{item.pm25ReductionPct}% PM2.5
                      </span>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span className="font-medium text-slate-700">
                        {item.weeklyCo2SavedKg.toFixed(1)} kg CO2/wk
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
