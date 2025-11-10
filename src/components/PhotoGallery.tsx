import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, CaretLeft, CaretRight, CaretDown, CaretUp } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

interface PhotoGalleryProps {
  photos: string[];
  onPhotoClick?: (index: number) => void;
  minimized?: boolean;
}

export function PhotoGallery({ photos, onPhotoClick, minimized = true }: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(!minimized);

  const handlePhotoClick = (index: number) => {
    setSelectedIndex(index);
    onPhotoClick?.(index);
  };

  const handlePrevious = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const handleNext = () => {
    if (selectedIndex !== null && selectedIndex < photos.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  if (photos.length === 0) return null;

  const displayPhotos = isExpanded ? photos : photos.slice(0, 3);
  const hasMore = photos.length > 3;

  return (
    <>
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {displayPhotos.map((photo, index) => (
            <div
              key={index}
              className="relative aspect-square cursor-pointer group overflow-hidden rounded-md border-2 border-border hover:border-primary transition-all"
              onClick={() => handlePhotoClick(index)}
            >
              <img
                src={photo}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
            </div>
          ))}
        </div>

        {hasMore && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-sm font-medium text-primary hover:text-primary/80 transition-colors bg-muted/50 hover:bg-muted rounded-md touch-manipulation"
          >
            {isExpanded ? (
              <>
                <CaretUp size={16} weight="bold" />
                <span className="text-sm sm:text-base">Show Less</span>
              </>
            ) : (
              <>
                <CaretDown size={16} weight="bold" />
                <span className="text-sm sm:text-base">Show All ({photos.length})</span>
              </>
            )}
          </button>
        )}
      </div>

      <Dialog open={selectedIndex !== null} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {selectedIndex !== null && (
            <div className="relative bg-black">
              <button
                onClick={() => setSelectedIndex(null)}
                className="absolute top-2 right-2 z-10 bg-black/50 text-white rounded-full p-2.5 sm:p-2 hover:bg-black/70 transition-colors touch-manipulation"
              >
                <X size={20} className="sm:size-5" weight="bold" />
              </button>

              <div className="relative">
                <img
                  src={photos[selectedIndex]}
                  alt={`Photo ${selectedIndex + 1}`}
                  className="w-full h-auto max-h-[80vh] object-contain"
                />

                {selectedIndex > 0 && (
                  <button
                    onClick={handlePrevious}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2.5 sm:p-2 hover:bg-black/70 transition-colors touch-manipulation"
                  >
                    <CaretLeft size={24} className="sm:size-6" weight="bold" />
                  </button>
                )}

                {selectedIndex < photos.length - 1 && (
                  <button
                    onClick={handleNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2.5 sm:p-2 hover:bg-black/70 transition-colors touch-manipulation"
                  >
                    <CaretRight size={24} className="sm:size-6" weight="bold" />
                  </button>
                )}
              </div>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 sm:px-3 sm:py-1.5 rounded-full text-base sm:text-sm font-medium">
                {selectedIndex + 1} / {photos.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
