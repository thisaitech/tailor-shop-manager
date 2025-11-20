import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/hooks/use-language';
import { cn } from '@/lib/utils';
import { BodyDiagram } from '@/components/BodyDiagrams';
import { MeasurementGuide } from '@/components/MeasurementGuide';

interface MeasurementPoint {
  id: string;
  label: string;
  x: number;
  y: number;
  cx?: number; // Circle position for clickable area
  cy?: number;
}

interface MeasurementDiagramProps {
  garmentType: 'pant' | 'shirt' | 'coat' | 'blazer' | 'jocket' | 'sudhar' | 'kurta' | 'body';
  gender: 'male' | 'female';
  measurements: Record<string, number | undefined>;
  onMeasurementChange: (field: string, value: string) => void;
}

const MEASUREMENT_POINTS = {
  pant: [
    { id: 'length', label: 'length', x: 180, y: 245, cx: 200, cy: 245 },
    { id: 'waist', label: 'waist', x: 205, y: 100, cx: 195, cy: 100 },
    { id: 'hip', label: 'hip', x: 210, y: 135, cx: 205, cy: 135 },
    { id: 'thigh', label: 'thigh', x: 190, y: 175, cx: 182, cy: 175 },
    { id: 'bottom', label: 'bottom', x: 180, y: 390, cx: 177, cy: 390 },
  ],
  shirt: [
    { id: 'length', label: 'length', x: 180, y: 140, cx: 190, cy: 140 },
    { id: 'shoulder', label: 'shoulder', x: 205, y: 95, cx: 185, cy: 95 },
    { id: 'chest', label: 'chest', x: 200, y: 130, cx: 192, cy: 130 },
    { id: 'waist', label: 'waist', x: 195, y: 180, cx: 188, cy: 180 },
    { id: 'sleeve', label: 'sleeve', x: 235, y: 135, cx: 228, cy: 135 },
    { id: 'neck', label: 'neck', x: 120, y: 80, cx: 145, cy: 72 },
  ],
  coat: [
    { id: 'length', label: 'length', x: 180, y: 155, cx: 190, cy: 155 },
    { id: 'shoulder', label: 'shoulder', x: 205, y: 95, cx: 185, cy: 95 },
    { id: 'chest', label: 'chest', x: 200, y: 130, cx: 192, cy: 130 },
    { id: 'waist', label: 'waist', x: 195, y: 180, cx: 188, cy: 180 },
    { id: 'sleeve', label: 'sleeve', x: 235, y: 135, cx: 228, cy: 135 },
  ],
  blazer: [
    { id: 'length', label: 'length', x: 180, y: 150, cx: 190, cy: 150 },
    { id: 'shoulder', label: 'shoulder', x: 205, y: 95, cx: 185, cy: 95 },
    { id: 'chest', label: 'chest', x: 200, y: 130, cx: 192, cy: 130 },
    { id: 'waist', label: 'waist', x: 195, y: 180, cx: 188, cy: 180 },
    { id: 'sleeve', label: 'sleeve', x: 235, y: 135, cx: 228, cy: 135 },
  ],
  jocket: [
    { id: 'length', label: 'length', x: 180, y: 140, cx: 190, cy: 140 },
    { id: 'shoulder', label: 'shoulder', x: 205, y: 95, cx: 185, cy: 95 },
    { id: 'chest', label: 'chest', x: 200, y: 130, cx: 192, cy: 130 },
    { id: 'sleeve', label: 'sleeve', x: 235, y: 135, cx: 228, cy: 135 },
  ],
  sudhar: [
    { id: 'length', label: 'length', x: 180, y: 140, cx: 190, cy: 140 },
    { id: 'shoulder', label: 'shoulder', x: 205, y: 95, cx: 185, cy: 95 },
    { id: 'chest', label: 'chest', x: 200, y: 125, cx: 192, cy: 125 },
    { id: 'waist', label: 'waist', x: 195, y: 155, cx: 188, cy: 155 },
    { id: 'hip', label: 'hip', x: 200, y: 185, cx: 192, cy: 185 },
    { id: 'sleeve', label: 'sleeve', x: 235, y: 135, cx: 228, cy: 135 },
  ],
  kurta: [
    { id: 'length', label: 'length', x: 180, y: 140, cx: 190, cy: 140 },
    { id: 'shoulder', label: 'shoulder', x: 205, y: 95, cx: 185, cy: 95 },
    { id: 'chest', label: 'chest', x: 200, y: 130, cx: 192, cy: 130 },
    { id: 'sleeve', label: 'sleeve', x: 235, y: 135, cx: 228, cy: 135 },
  ],
  body: [
    { id: 'totalHeight', label: 'totalHeight', x: 150, y: 12, cx: 150, cy: 20 },
    { id: 'neckToFloor', label: 'neckToFloor', x: 150, y: 48, cx: 150, cy: 48 },
    { id: 'shoulderToWaistFront', label: 'shoulderToWaistFront', x: 150, y: 100, cx: 150, cy: 100 },
    { id: 'shoulderToWaistBack', label: 'shoulderToWaistBack', x: 120, y: 100, cx: 120, cy: 100 },
    { id: 'bustHeight', label: 'bustHeight', x: 150, y: 120, cx: 150, cy: 120 },
    { id: 'bustSeparation', label: 'bustSeparation', x: 170, y: 120, cx: 170, cy: 120 },
    { id: 'bust', label: 'bust', x: 150, y: 135, cx: 150, cy: 135 },
    { id: 'underBust', label: 'underBust', x: 150, y: 150, cx: 150, cy: 150 },
    { id: 'waist', label: 'waist', x: 150, y: 175, cx: 150, cy: 175 },
    { id: 'waistToFloor', label: 'waistToFloor', x: 170, y: 260, cx: 170, cy: 260 },
    { id: 'hip', label: 'hip', x: 150, y: 200, cx: 150, cy: 200 },
    { id: 'thigh', label: 'thigh', x: 150, y: 235, cx: 150, cy: 235 },
    { id: 'calf', label: 'calf', x: 150, y: 305, cx: 150, cy: 305 },
    { id: 'legLength', label: 'legLength', x: 150, y: 340, cx: 150, cy: 340 },
    { id: 'armLength', label: 'armLength', x: 230, y: 150, cx: 230, cy: 150 },
    { id: 'wrist', label: 'wrist', x: 240, y: 180, cx: 240, cy: 180 },
  ],
};

export function MeasurementDiagram({
  garmentType,
  gender,
  measurements,
  onMeasurementChange,
}: MeasurementDiagramProps) {
  const { t } = useLanguage();
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);
  const [activePoint, setActivePoint] = useState<string | null>(null);

  const points = MEASUREMENT_POINTS[garmentType] || [];

  const handlePointClick = (pointId: string) => {
    setActivePoint(pointId);
    const inputElement = document.getElementById(`measurement-${pointId}`);
    if (inputElement) {
      inputElement.focus();
    }
  };

  const isPantType = garmentType === 'pant';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Body Diagram */}
      <div className="flex flex-col items-center">
        <div className="flex items-center justify-between w-full mb-4">
          <h3 className="text-sm font-medium text-center flex-1">
            {t('clickOnBodyPart')}
          </h3>
          <MeasurementGuide garmentType={isPantType ? 'lower' : 'upper'} />
        </div>
        <div className="relative bg-muted/30 rounded-lg p-4 inline-block">
          <svg
            viewBox="0 0 300 400"
            className="w-full max-w-[300px] h-auto"
            style={{ minHeight: '400px' }}
          >
            {/* Try to load real photo first, fallback to SVG */}
            <image
              href={`/images/measurements/${gender}-${isPantType ? 'lower' : 'upper'}-body.jpg`}
              x="0"
              y="0"
              width="300"
              height="400"
              preserveAspectRatio="xMidYMid meet"
              onError={(e) => {
                // Hide image if it fails to load, SVG will show instead
                e.currentTarget.style.display = 'none';
              }}
            />
            {/* SVG illustration as fallback */}
            <BodyDiagram gender={gender} type={isPantType ? 'lower' : 'upper'} />

            {/* Measurement arrows and lines */}
            {points.map((point) => {
              const hasValue = measurements[point.id] !== undefined && measurements[point.id] !== null;
              if (!hasValue) return null;

              // Draw measurement lines for visual feedback
              if (isPantType) {
                if (point.id === 'waist') {
                  return (
                    <g key={`arrow-${point.id}`}>
                      <line x1="105" y1="100" x2="195" y2="100" stroke="#FF6B35" strokeWidth="2" markerEnd="url(#arrowhead)" />
                    </g>
                  );
                } else if (point.id === 'hip') {
                  return (
                    <g key={`arrow-${point.id}`}>
                      <line x1="95" y1="135" x2="205" y2="135" stroke="#FF6B35" strokeWidth="2" markerEnd="url(#arrowhead)" />
                    </g>
                  );
                } else if (point.id === 'thigh') {
                  return (
                    <g key={`arrow-${point.id}`}>
                      <line x1="118" y1="175" x2="137" y2="175" stroke="#FF6B35" strokeWidth="2" />
                    </g>
                  );
                } else if (point.id === 'length') {
                  return (
                    <g key={`arrow-${point.id}`}>
                      <line x1="205" y1="105" x2="205" y2="385" stroke="#FF6B35" strokeWidth="2" strokeDasharray="5,3" />
                    </g>
                  );
                } else if (point.id === 'bottom') {
                  return (
                    <g key={`arrow-${point.id}`}>
                      <line x1="123" y1="390" x2="133" y2="390" stroke="#FF6B35" strokeWidth="3" />
                    </g>
                  );
                }
              } else {
                if (point.id === 'shoulder') {
                  return (
                    <g key={`arrow-${point.id}`}>
                      <line x1="110" y1="95" x2="190" y2="95" stroke="#FF6B35" strokeWidth="2" markerEnd="url(#arrowhead)" />
                    </g>
                  );
                } else if (point.id === 'chest') {
                  return (
                    <g key={`arrow-${point.id}`}>
                      <line x1="108" y1="130" x2="192" y2="130" stroke="#FF6B35" strokeWidth="2" markerEnd="url(#arrowhead)" />
                    </g>
                  );
                } else if (point.id === 'waist') {
                  return (
                    <g key={`arrow-${point.id}`}>
                      <line x1="110" y1="180" x2="190" y2="180" stroke="#FF6B35" strokeWidth="2" markerEnd="url(#arrowhead)" />
                    </g>
                  );
                } else if (point.id === 'sleeve') {
                  return (
                    <g key={`arrow-${point.id}`}>
                      <line x1="190" y1="95" x2="228" y2="175" stroke="#FF6B35" strokeWidth="2" strokeDasharray="5,3" />
                    </g>
                  );
                } else if (point.id === 'length') {
                  return (
                    <g key={`arrow-${point.id}`}>
                      <line x1="195" y1="95" x2="195" y2="185" stroke="#FF6B35" strokeWidth="2" strokeDasharray="5,3" />
                    </g>
                  );
                }
              }
              return null;
            })}

            {/* Arrow marker definition */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#FF6B35" />
              </marker>
            </defs>

            {/* Interactive measurement points */}
            {points.map((point) => {
              const isHovered = hoveredPoint === point.id;
              const isActive = activePoint === point.id;
              const hasValue = measurements[point.id] !== undefined && measurements[point.id] !== null;

              return (
                <g key={point.id}>
                  {/* Clickable circle */}
                  <circle
                    cx={point.cx}
                    cy={point.cy}
                    r="8"
                    className={cn(
                      'cursor-pointer transition-all',
                      isActive && 'fill-primary',
                      !isActive && isHovered && 'fill-primary/60',
                      !isActive && !isHovered && hasValue && 'fill-green-500',
                      !isActive && !isHovered && !hasValue && 'fill-muted-foreground/40'
                    )}
                    stroke="currentColor"
                    strokeWidth="2"
                    onMouseEnter={() => setHoveredPoint(point.id)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    onClick={() => handlePointClick(point.id)}
                  />
                  {/* Label on hover or active */}
                  {(isHovered || isActive) && (
                    <text
                      x={point.x}
                      y={point.y}
                      className="text-xs font-medium pointer-events-none"
                      fill="currentColor"
                    >
                      {t(point.label)}
                    </text>
                  )}
                  {/* Value display */}
                  {hasValue && !isHovered && !isActive && (
                    <text
                      x={point.cx}
                      y={point.cy! - 15}
                      className="text-xs font-medium pointer-events-none"
                      fill="currentColor"
                      textAnchor="middle"
                    >
                      {measurements[point.id]}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Measurement Inputs */}
      <div className="space-y-4 w-full">
        <h3 className="text-sm font-medium mb-4">
          {t('measurements')} ({t(garmentType)})
        </h3>
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
          {points.map((point) => {
            const isActive = activePoint === point.id;
            return (
              <div
                key={point.id}
                className={cn(
                  'space-y-2 p-3 rounded-lg border-2 transition-all',
                  isActive && 'border-primary bg-primary/5',
                  !isActive && 'border-transparent hover:border-muted'
                )}
                onMouseEnter={() => setHoveredPoint(point.id)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <Label
                  htmlFor={`measurement-${point.id}`}
                  className={cn('text-sm', isActive && 'text-primary font-medium')}
                >
                  {t(point.label)}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={`measurement-${point.id}`}
                    type="number"
                    step="0.1"
                    value={measurements[point.id] || ''}
                    onChange={(e) => onMeasurementChange(point.id, e.target.value)}
                    onFocus={() => setActivePoint(point.id)}
                    onBlur={() => setActivePoint(null)}
                    className={cn(isActive && 'ring-2 ring-primary')}
                    placeholder="0.0"
                  />
                  <span className="text-sm text-muted-foreground">cm</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
