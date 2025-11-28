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
      className={`flex flex-col items-center justify-center py-12 px-6 rounded-2xl border-2 border-dashed ${className}`}
      style={{
        background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 50%, #e0e7ff 100%)',
        borderColor: '#1e40af',
      }}
    >
      {/* Icon Container */}
      <div
        className="mb-4 p-4 rounded-2xl shadow-lg"
        style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%)',
        }}
      >
        <Icon size={iconSize} className="text-white" weight="duotone" />
      </div>

      {/* Title */}
      <h3
        className="text-lg font-bold mb-1"
        style={{ color: '#1e3a8a' }}
      >
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
          className="h-11 px-6 font-semibold shadow-lg hover:shadow-xl transition-all"
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
          }}
        >
          <Plus size={18} className="mr-2" weight="bold" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
