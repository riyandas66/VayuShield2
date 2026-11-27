import type { AqiThemeTokens } from '../types/aqi';
import { getAqiDetailedBand } from '../utils/aqiMath';
import { clampAqi } from '../utils/sanitize';

interface AqiGaugeProps {
  aqi: number;
  theme: AqiThemeTokens;
  pm25: number;
  pm10: number;
}

export function AqiGauge({ aqi, theme, pm25, pm10 }: AqiGaugeProps) {
  const clamped = clampAqi(aqi);
  const detailedBand = getAqiDetailedBand(clamped);

  const size = 216;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // 260-degree editorial arc gauge
  const arcFraction = 260 / 360;
  const arcLength = circumference * arcFraction;
  const progressRatio = Math.min(1, clamped / 500);
  const progressOffset = arcLength * (1 - progressRatio);
  const gradientId = `aqi-gauge-grad-${theme.severity}`;

  return (
    <div
      className="relative flex flex-col items-center justify-center shrink-0"
      role="meter"
      aria-label="Current Air Quality Index gauge"
      aria-valuemin={0}
      aria-valuemax={500}
      aria-valuenow={clamped}
      aria-valuetext={`AQI ${clamped}, ${detailedBand}, estimated PM2.5 ${pm25} micrograms per cubic meter`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={theme.gradientStartHex} />
            <stop offset="100%" stopColor={theme.gradientEndHex} />
          </linearGradient>
        </defs>

        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(140 ${size / 2} ${size / 2})`}
        />

        {/* Animated Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={progressOffset}
          strokeLinecap="round"
          transform={`rotate(140 ${size / 2} ${size / 2})`}
          style={{
            transition: 'stroke-dashoffset 450ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </svg>

      {/* Center Readout */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-2 text-center">
        <span className="text-[11px] font-medium text-slate-500">
          Ambient AQI
        </span>
        <span className="mt-0.5 font-mono text-5xl font-semibold tracking-tight tabular-nums text-slate-950">
          {clamped}
        </span>
        <span
          className={`mt-1.5 text-xs font-semibold ${theme.textAccentClass}`}
        >
          {detailedBand}
        </span>
      </div>

      {/* Particulates Sub-Readout */}
      <div className="-mt-4 flex items-center gap-4 text-xs text-slate-600">
        <div>
          <span className="text-slate-500">PM2.5 </span>
          <span className="font-mono font-semibold tabular-nums text-slate-900">
            {pm25}
          </span>
          <span className="text-[11px] text-slate-500"> µg/m³</span>
        </div>
        <span aria-hidden="true" className="text-slate-300">
          /
        </span>
        <div>
          <span className="text-slate-500">PM10 </span>
          <span className="font-mono font-semibold tabular-nums text-slate-900">
            {pm10}
          </span>
          <span className="text-[11px] text-slate-500"> µg/m³</span>
        </div>
      </div>
    </div>
  );
}
