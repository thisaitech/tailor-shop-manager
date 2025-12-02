import { Button } from '@/components/ui/button';
import { Scissors, Plus } from '@phosphor-icons/react';

interface EmptyStateProps {
  icon?: React.ComponentType<{ size?: number; className?: string; weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone' }>;
  iconSize?: number;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = Scissors,
  iconSize = 56,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-10 px-6 rounded-xl bg-slate-50/30 ${className}`}
    >
      {/* Icon Container */}
      <div className="mb-4 p-4 rounded-2xl bg-primary/10">
        <Icon size={iconSize} className="text-primary" weight="duotone" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold mb-1 text-foreground">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-600 mb-4 text-center max-w-xs">
          {description}
        </p>
      )}

      {/* Action Button */}
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="h-11 px-6 font-semibold"
        >
          <Plus size={18} className="mr-2" weight="bold" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
