/**
 * Performance Optimization Utilities for Mobile App
 * Helps reduce re-renders and improve responsiveness
 */

import { useCallback, useRef, useEffect, useState, useMemo } from 'react';

/**
 * Debounce a function call
 * Useful for search inputs, resize handlers, etc.
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Throttle a function call
 * Useful for scroll handlers, window resize, etc.
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Hook for debounced value
 * @param value - Value to debounce
 * @param delay - Debounce delay in ms
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for debounced callback
 * @param callback - Callback to debounce
 * @param delay - Debounce delay in ms
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback(
    debounce((...args: Parameters<T>) => {
      callbackRef.current(...args);
    }, delay) as T,
    [delay]
  );
}

/**
 * Hook for throttled callback
 * @param callback - Callback to throttle
 * @param limit - Throttle limit in ms
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  limit: number
): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback(
    throttle((...args: Parameters<T>) => {
      callbackRef.current(...args);
    }, limit) as T,
    [limit]
  );
}

/**
 * Hook to detect if component is mounted
 * Prevents state updates on unmounted components
 */
export function useIsMounted(): () => boolean {
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return useCallback(() => isMountedRef.current, []);
}

/**
 * Hook for previous value
 * Useful for comparing changes
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Hook to run effect only on updates (not initial mount)
 */
export function useUpdateEffect(effect: () => void | (() => void), deps: any[]): void {
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    return effect();
  }, deps);
}

/**
 * Hook for intersection observer (lazy loading elements)
 */
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1,
        ...options,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [ref, options.root, options.rootMargin, options.threshold]);

  return isIntersecting;
}

/**
 * Hook for measuring component render time (development only)
 */
export function useRenderTime(componentName: string): void {
  if (import.meta.env.PROD) return;

  const startTime = useRef(performance.now());

  useEffect(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;

    if (renderTime > 16) {
      // More than one frame (16ms)
      console.warn(`[Performance] ${componentName} render took ${renderTime.toFixed(2)}ms`);
    }

    startTime.current = performance.now();
  });
}

/**
 * Memoize a list filtering/sorting operation
 * Prevents recalculation on every render
 */
export function useMemoizedList<T>(
  items: T[],
  filterFn?: (item: T) => boolean,
  sortFn?: (a: T, b: T) => number
): T[] {
  return useMemo(() => {
    let result = [...items];

    if (filterFn) {
      result = result.filter(filterFn);
    }

    if (sortFn) {
      result.sort(sortFn);
    }

    return result;
  }, [items, filterFn, sortFn]);
}

/**
 * Virtual list hook for rendering large lists efficiently
 * Only renders items visible in viewport
 */
export function useVirtualList<T>(
  items: T[],
  containerRef: React.RefObject<HTMLElement>,
  itemHeight: number,
  overscan: number = 3
): {
  virtualItems: { item: T; index: number; style: React.CSSProperties }[];
  totalHeight: number;
  scrollToIndex: (index: number) => void;
} {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = throttle(() => {
      setScrollTop(container.scrollTop);
    }, 16);

    const handleResize = () => {
      setContainerHeight(container.clientHeight);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [containerRef]);

  const { virtualItems, totalHeight, scrollToIndex } = useMemo(() => {
    const totalHeight = items.length * itemHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const virtualItems: { item: T; index: number; style: React.CSSProperties }[] = [];

    for (let i = startIndex; i <= endIndex; i++) {
      virtualItems.push({
        item: items[i],
        index: i,
        style: {
          position: 'absolute',
          top: i * itemHeight,
          height: itemHeight,
          left: 0,
          right: 0,
        },
      });
    }

    const scrollToIndex = (index: number) => {
      const container = containerRef.current;
      if (container) {
        container.scrollTop = index * itemHeight;
      }
    };

    return { virtualItems, totalHeight, scrollToIndex };
  }, [items, itemHeight, scrollTop, containerHeight, overscan, containerRef]);

  return { virtualItems, totalHeight, scrollToIndex };
}

/**
 * Request idle callback wrapper
 * Runs tasks when browser is idle
 */
export function runWhenIdle(callback: () => void, timeout: number = 1000): void {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(callback, { timeout });
  } else {
    setTimeout(callback, 1);
  }
}

/**
 * Batch multiple state updates
 * React 18 does this automatically, but this is explicit
 */
export function batchUpdates(callback: () => void): void {
  // React 18+ automatically batches updates
  // This is kept for explicit batching when needed
  callback();
}

/**
 * Simple LRU cache for expensive computations
 */
export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove oldest (first) entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Create a memoized selector with cache
 */
export function createSelector<S, R>(
  selector: (state: S) => R,
  cacheSize: number = 10
): (state: S) => R {
  const cache = new LRUCache<string, R>(cacheSize);

  return (state: S): R => {
    const key = JSON.stringify(state);
    const cached = cache.get(key);

    if (cached !== undefined) {
      return cached;
    }

    const result = selector(state);
    cache.set(key, result);
    return result;
  };
}
