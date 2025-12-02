import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

/**
 * Custom hook for persistent storage using localStorage
 * Includes fallback for private browsing mode and quota exceeded errors
 */

// Check if localStorage is available
const isLocalStorageAvailable = (): boolean => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
};

// In-memory fallback storage when localStorage is not available
const memoryStorage: { [key: string]: any } = {};

export function useStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      if (isLocalStorageAvailable()) {
        const item = localStorage.getItem(key);
        logger.log(`[useStorage] Loading ${key}:`, item ? JSON.parse(item) : defaultValue);
        return item ? JSON.parse(item) : defaultValue;
      } else {
        // Use in-memory storage as fallback
        logger.warn(`[useStorage] localStorage not available, using memory storage for ${key}`);
        return memoryStorage[key] !== undefined ? memoryStorage[key] : defaultValue;
      }
    } catch (error) {
      logger.error(`Error loading ${key} from storage:`, error);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      if (isLocalStorageAvailable()) {
        logger.log(`[useStorage] Saving ${key}:`, value);
        localStorage.setItem(key, JSON.stringify(value));
      } else {
        // Store in memory as fallback
        logger.warn(`[useStorage] localStorage not available, storing ${key} in memory`);
        memoryStorage[key] = value;
      }
    } catch (error) {
      // Handle quota exceeded error
      if (error instanceof DOMException && (
        error.code === 22 || 
        error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
      )) {
        logger.error(`[useStorage] Storage quota exceeded for ${key}. Consider clearing old data.`);
      } else {
        logger.error(`Error saving ${key} to storage:`, error);
      }
      // Fallback to memory storage
      memoryStorage[key] = value;
    }
  }, [key, value]);

  return [value, setValue];
}
