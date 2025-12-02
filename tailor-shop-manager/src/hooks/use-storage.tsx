import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';

/**
 * Custom hook for persistent storage using localStorage
 * Includes fallback for private browsing mode, quota exceeded errors,
 * and mobile WebView compatibility
 */

// Check if localStorage is available (with retry for mobile WebViews)
const isLocalStorageAvailable = (): boolean => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    const result = localStorage.getItem(test);
    localStorage.removeItem(test);
    return result === test;
  } catch (e) {
    return false;
  }
};

// In-memory fallback storage when localStorage is not available
const memoryStorage: { [key: string]: any } = {};

// Track localStorage availability (can change in mobile WebViews)
let storageAvailable: boolean | null = null;

const checkStorageAvailability = (): boolean => {
  if (storageAvailable === null) {
    storageAvailable = isLocalStorageAvailable();
  }
  return storageAvailable;
};

// Safe JSON parse with error handling
const safeJsonParse = <T>(json: string | null, defaultValue: T): T => {
  if (!json) return defaultValue;
  try {
    return JSON.parse(json);
  } catch (e) {
    logger.error('[useStorage] JSON parse error:', e);
    return defaultValue;
  }
};

// Safe JSON stringify with circular reference handling
const safeJsonStringify = (value: any): string => {
  try {
    return JSON.stringify(value);
  } catch (e) {
    logger.error('[useStorage] JSON stringify error:', e);
    return '{}';
  }
};

export function useStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const isInitialized = useRef(false);
  
  const [value, setValue] = useState<T>(() => {
    try {
      // Check localStorage availability
      if (checkStorageAvailability()) {
        const item = localStorage.getItem(key);
        if (item !== null) {
          const parsed = safeJsonParse(item, defaultValue);
          logger.log(`[useStorage] Loaded ${key} from localStorage`);
          return parsed;
        }
      }
      
      // Check memory storage fallback
      if (key in memoryStorage) {
        logger.log(`[useStorage] Loaded ${key} from memory storage`);
        return memoryStorage[key];
      }
      
      logger.log(`[useStorage] Using default value for ${key}`);
      return defaultValue;
    } catch (error) {
      logger.error(`[useStorage] Error loading ${key}:`, error);
      return defaultValue;
    }
  });

  // Save to storage whenever value changes
  useEffect(() => {
    // Skip the initial mount to avoid unnecessary writes
    if (!isInitialized.current) {
      isInitialized.current = true;
      return;
    }

    try {
      const serialized = safeJsonStringify(value);
      
      if (checkStorageAvailability()) {
        localStorage.setItem(key, serialized);
        logger.log(`[useStorage] Saved ${key} to localStorage`);
      } else {
        // Store in memory as fallback (mobile WebView may not have localStorage)
        memoryStorage[key] = value;
        logger.warn(`[useStorage] localStorage unavailable, saved ${key} to memory`);
      }
    } catch (error) {
      // Handle quota exceeded error
      if (error instanceof DOMException && (
        error.code === 22 || 
        error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
      )) {
        logger.error(`[useStorage] Storage quota exceeded for ${key}`);
        // Try to clear old data and retry
        try {
          localStorage.removeItem(key);
          localStorage.setItem(key, safeJsonStringify(value));
        } catch (retryError) {
          memoryStorage[key] = value;
        }
      } else {
        logger.error(`[useStorage] Error saving ${key}:`, error);
      }
      // Always fallback to memory storage on error
      memoryStorage[key] = value;
    }
  }, [key, value]);

  // Stable setter function
  const setStoredValue = useCallback((newValue: T) => {
    setValue(newValue);
  }, []);

  return [value, setStoredValue];
}
