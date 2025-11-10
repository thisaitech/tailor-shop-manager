import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

interface PhotoGalleryProps {
  photos: string[];
  onPhotoClick?: (index: number) => void;
}

export function PhotoGallery({ photos, onPhotoClick }: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

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

  return (
    <>
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {photos.slice(0, 6).map((photo, index) => (
          <div
            key={index}
            className="relative aspect-square cursor-pointer group overflow-hidden rounded-md"
            onClick={() => handlePhotoClick(index)}
          >
            <img
              src={photo}
              alt={`Photo ${index + 1}`}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            {index === 5 && photos.length > 6 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white font-semibold text-sm sm:text-lg">
                  +{photos.length - 6}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={selectedIndex !== null} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {selectedIndex !== null && (
            <div className="relative bg-black">
              <button
                onClick={() => setSelectedIndex(null)}
                className="absolute top-2 right-2 z-10 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
              >
                <X size={20} weight="bold" />
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
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
                  >
                    <CaretLeft size={24} weight="bold" />
                  </button>
                )}

                {selectedIndex < photos.length - 1 && (
                  <button
                    onClick={handleNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
                  >
                    <CaretRight size={24} weight="bold" />
                  </button>
                )}
              </div>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1.5 rounded-full text-sm">
                {selectedIndex + 1} / {photos.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
