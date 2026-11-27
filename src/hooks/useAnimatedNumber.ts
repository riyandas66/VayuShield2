import { useEffect, useRef, useState } from 'react';

/**
 * Smoothly interpolates numeric scorecard counters using requestAnimationFrame,
 * automatically honoring prefers-reduced-motion and safe test environments.
 */
export function useAnimatedNumber(
  targetValue: number,
  durationMs = 260,
  decimals = 0
): number {
  const [displayValue, setDisplayValue] = useState<number>(targetValue);
  const currentRef = useRef<number>(targetValue);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced || typeof requestAnimationFrame !== 'function') {
      currentRef.current = targetValue;
      setDisplayValue(targetValue);
      return;
    }

    const startValue = currentRef.current;
    const delta = targetValue - startValue;
    if (Math.abs(delta) < 0.01) {
      currentRef.current = targetValue;
      setDisplayValue(targetValue);
      return;
    }

    let frameId = 0;
    const startTime = performance.now();
    const factor = 10 ** decimals;

    const tick = (now: number): void => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      // Cubic ease-out curve matching cubic-bezier(0.16, 1, 0.3, 1) feel
      const eased = 1 - (1 - progress) ** 3;
      const next = Math.round((startValue + delta * eased) * factor) / factor;

      currentRef.current = next;
      setDisplayValue(next);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        currentRef.current = targetValue;
        setDisplayValue(targetValue);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [targetValue, durationMs, decimals]);

  return displayValue;
}
