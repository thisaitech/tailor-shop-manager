/**
 * Lazy Loading Utilities for Mobile App Optimization
 * Reduces initial bundle size by loading heavy components on-demand
 */

import React, { Suspense, lazy, ComponentType } from 'react';

/**
 * Loading fallback component
 */
export const LoadingFallback: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="flex items-center justify-center p-8">
    <div className="flex flex-col items-center gap-2">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <span className="text-sm text-muted-foreground">{message}</span>
    </div>
  </div>
);

/**
 * Error fallback component for failed lazy loads
 */
export const ErrorFallback: React.FC<{ error?: Error; retry?: () => void }> = ({ error, retry }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <p className="text-destructive mb-2">Failed to load component</p>
    <p className="text-sm text-muted-foreground mb-4">{error?.message || 'Unknown error'}</p>
    {retry && (
      <button
        onClick={retry}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
      >
        Retry
      </button>
    )}
  </div>
);

/**
 * Create a lazy-loaded component with Suspense wrapper
 * @param importFn - Dynamic import function
 * @param fallbackMessage - Loading message to show
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallbackMessage?: string
): React.FC<React.ComponentProps<T>> {
  const LazyComponent = lazy(importFn);

  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={<LoadingFallback message={fallbackMessage} />}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

/**
 * Preload a lazy component (useful for prefetching on hover/focus)
 */
export function preloadComponent(importFn: () => Promise<any>): void {
  importFn().catch(() => {
    // Silently fail preload - component will be loaded when needed
  });
}

// ============================================
// LAZY-LOADED HEAVY COMPONENTS
// ============================================

// Note: Add lazy-loaded component exports as needed
// Example usage:
// export const LazyPdfGenerator = createLazyComponent(
//   () => import('@/components/PdfGenerator'),
//   'Loading PDF generator...'
// );

// ============================================
// DYNAMIC IMPORTS FOR LIBRARIES
// ============================================

/**
 * Dynamically import jsPDF for PDF generation
 * Call this only when user triggers PDF generation
 */
export async function loadPdfLibrary(): Promise<typeof import('jspdf')> {
  return import('jspdf');
}

/**
 * Dynamically import html2canvas for screenshots/PDF
 */
export async function loadHtml2Canvas(): Promise<typeof import('html2canvas')> {
  return import('html2canvas');
}

/**
 * Dynamically import recharts for data visualization
 */
export async function loadRechartsLibrary(): Promise<typeof import('recharts')> {
  return import('recharts');
}

/**
 * Dynamically import Three.js for 3D graphics
 */
export async function loadThreeJs(): Promise<typeof import('three')> {
  return import('three');
}

// ============================================
// COMPONENT PREFETCH UTILITIES
// ============================================

/**
 * Prefetch dashboard components when app starts
 * This loads them in the background after initial render
 */
export function prefetchDashboardComponents(): void {
  // Prefetch after a short delay to not block initial render
  setTimeout(() => {
    // These will be loaded in background
    import('@/components/OwnerDashboard');
    import('@/components/EmployeeDashboard');
  }, 2000);
}

/**
 * Prefetch order-related components
 */
export function prefetchOrderComponents(): void {
  setTimeout(() => {
    import('@/components/ServiceOrderForm');
    import('@/components/ActiveOrdersList');
  }, 3000);
}

// ============================================
// INTERSECTION OBSERVER LAZY LOADING
// ============================================

/**
 * Hook for lazy loading components when they enter viewport
 * Useful for below-the-fold content
 */
export function useLazyLoad(
  ref: React.RefObject<HTMLElement>,
  callback: () => void,
  options?: IntersectionObserverInit
): void {
  React.useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            callback();
            observer.disconnect();
          }
        });
      },
      {
        root: null,
        rootMargin: '100px', // Start loading 100px before entering viewport
        threshold: 0.1,
        ...options,
      }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [ref, callback, options]);
}
