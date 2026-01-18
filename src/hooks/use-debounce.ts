import { useEffect, useState } from 'react';

/**
 * Custom hook for debouncing a value
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds (default: 400ms)
 * @param minLength - Minimum character length before debouncing starts (default: 0)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 400, minLength: number = 0): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // If minLength is specified and value is a string, check length
    if (minLength > 0 && typeof value === 'string') {
      if (value.length > 0 && value.length < minLength) {
        // Don't update if below minimum length
        setDebouncedValue('' as T);
        return;
      }
    }

    // Set up the debounce timer
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup function to cancel the timeout if value changes
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay, minLength]);

  return debouncedValue;
}
