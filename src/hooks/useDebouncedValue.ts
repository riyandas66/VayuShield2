import { useEffect, useState } from 'react';

/**
 * Debounces rapid state changes (slider drags, custom city typing)
 * so heavy recalculations and hash lookups run efficiently.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebounced(value);
    }, delayMs);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [value, delayMs]);

  return debounced;
}
