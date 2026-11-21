"use client";

import { useEffect, useState } from "react";

/**
 * Returns a debounced copy of `value` that updates after `delayMs` milliseconds of inactivity.
 */
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(() => value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(() => value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
