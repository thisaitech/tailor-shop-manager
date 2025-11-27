import { cn } from '@/lib/utils';

interface LoaderProps {
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export function Loader({ fullScreen = false, size = 'md', text, className }: LoaderProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const spinnerSizeClasses = {
    sm: 'w-8 h-8 border-2',
    md: 'w-12 h-12 border-3',
    lg: 'w-16 h-16 border-4',
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const LoaderContent = () => (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      {/* Animated Spinner with Scissors Icon */}
      <div className={cn('relative', sizeClasses[size])}>
        {/* Outer spinning ring */}
        <div
          className={cn(
            'absolute inset-0 rounded-full border-primary/20 animate-spin',
            spinnerSizeClasses[size]
          )}
          style={{
            borderTopColor: 'var(--primary)',
            borderRightColor: 'transparent',
            borderBottomColor: 'transparent',
            borderLeftColor: 'transparent',
            animationDuration: '1s',
          }}
        />

        {/* Second spinning ring (opposite direction) */}
        <div
          className={cn(
            'absolute inset-0 rounded-full border-primary/10',
            spinnerSizeClasses[size]
          )}
          style={{
            borderTopColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: 'var(--primary)',
            borderLeftColor: 'transparent',
            animation: 'spin 1.5s linear infinite reverse',
          }}
        />

        {/* Center icon - Scissors */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 256 256"
            className={cn('text-primary animate-pulse', iconSizeClasses[size])}
            fill="currentColor"
          >
            <path d="M157.73,113.13A28,28,0,0,0,148,68.37L108.78,89.7a28,28,0,1,0-18.54,48.71L119.63,128l-29.39,10.41a28,28,0,1,0,18.54,48.71L148,165.78a28,28,0,0,0,9.73-44.76L143.54,128Zm-7.39-32.68a12,12,0,1,1,4.41,16.37l-20.21-11.35ZM80,180a12,12,0,1,1,4.41-16.37l20.21,11.35A12,12,0,0,1,80,180ZM84.41,92.37a12,12,0,1,1,0-20.78l44.25,24.86L112,102.36Zm66.15,64.08-44.25,24.86-16.66-5.91,44.25-24.86a12,12,0,0,1,16.66,5.91Z" />
          </svg>
        </div>
      </div>

      {/* Loading Text */}
      {text && (
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-medium text-foreground">{text}</p>
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <LoaderContent />
      </div>
    );
  }

  return <LoaderContent />;
}

// App Loader - Full screen loader with branding
export function AppLoader() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      {/* Logo/Brand Area */}
      <div className="flex flex-col items-center gap-6">
        {/* Animated Logo */}
        <div className="relative w-20 h-20">
          {/* Outer ring pulse */}
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '2s' }} />

          {/* Main spinner */}
          <div className="absolute inset-0 rounded-full border-4 border-primary/20">
            <div
              className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin"
              style={{ animationDuration: '1s' }}
            />
          </div>

          {/* Inner content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-primary/5 flex items-center justify-center">
              {/* Scissors Icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 256 256"
                className="w-8 h-8 text-primary"
                fill="currentColor"
              >
                <path d="M157.73,113.13A28,28,0,0,0,148,68.37L108.78,89.7a28,28,0,1,0-18.54,48.71L119.63,128l-29.39,10.41a28,28,0,1,0,18.54,48.71L148,165.78a28,28,0,0,0,9.73-44.76L143.54,128Zm-7.39-32.68a12,12,0,1,1,4.41,16.37l-20.21-11.35ZM80,180a12,12,0,1,1,4.41-16.37l20.21,11.35A12,12,0,0,1,80,180ZM84.41,92.37a12,12,0,1,1,0-20.78l44.25,24.86L112,102.36Zm66.15,64.08-44.25,24.86-16.66-5.91,44.25-24.86a12,12,0,0,1,16.66,5.91Z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Brand Name */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            Thisai Technologies
          </h1>
          <p className="text-sm font-medium text-muted-foreground">
            Tailor Management System
          </p>
        </div>

        {/* Loading indicator */}
        <div className="flex items-center gap-2 mt-4">
          <div className="flex gap-1">
            <span
              className="w-2 h-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: '0ms', animationDuration: '0.6s' }}
            />
            <span
              className="w-2 h-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: '150ms', animationDuration: '0.6s' }}
            />
            <span
              className="w-2 h-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: '300ms', animationDuration: '0.6s' }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 text-center">
        <p className="text-xs text-muted-foreground">
          Loading your workspace...
        </p>
      </div>
    </div>
  );
}

// Inline loader for buttons/cards
export function InlineLoader({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div
        className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"
        style={{ animationDuration: '0.8s' }}
      />
    </div>
  );
}

// Skeleton loader for content placeholders
export function SkeletonLoader({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-md bg-muted', className)} />
  );
}
