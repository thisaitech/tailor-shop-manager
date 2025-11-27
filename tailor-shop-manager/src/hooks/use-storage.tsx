import { useState, useEffect } from 'react';

/**
 * Custom hook for persistent storage using localStorage
 * Mimics useKV API but uses localStorage instead of Spark backend
 */
export function useStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      console.log(`[useStorage] Loading ${key}:`, item ? JSON.parse(item) : defaultValue);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      console.log(`[useStorage] Saving ${key}:`, value);
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  }, [key, value]);

  return [value, setValue];
}
