import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/logger';

/**
 * Custom hook for persistent storage using AsyncStorage
 */

// In-memory fallback storage
const memoryStorage: { [key: string]: any } = {};

// Safe JSON parse with error handling
const safeJsonParse = <T,>(json: string | null, defaultValue: T): T => {
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
    const [value, setValue] = useState<T>(defaultValue);

    // Load from storage on mount
    useEffect(() => {
        const loadFromStorage = async () => {
            try {
                const item = await AsyncStorage.getItem(key);
                if (item !== null) {
                    const parsed = safeJsonParse(item, defaultValue);
                    logger.log(`[useStorage] Loaded ${key} from AsyncStorage`);
                    setValue(parsed);
                } else {
                    // If not in storage, check memory (fallback)
                    if (key in memoryStorage) {
                        setValue(memoryStorage[key]);
                    }
                }
            } catch (error) {
                logger.error(`[useStorage] Error loading ${key}:`, error);
            } finally {
                isInitialized.current = true;
            }
        };

        loadFromStorage();
    }, [key, defaultValue]);

    // Stable setter function
    const setStoredValue = useCallback((newValue: T) => {
        setValue(newValue);

        // Async save
        try {
            const serialized = safeJsonStringify(newValue);
            AsyncStorage.setItem(key, serialized).catch(err => {
                logger.error(`[useStorage] Error saving ${key}:`, err);
                memoryStorage[key] = newValue; // Fallback
            });
        } catch (error) {
            logger.error(`[useStorage] Error serializing ${key}:`, error);
            memoryStorage[key] = newValue;
        }
    }, [key]);

    return [value, setStoredValue];
}
