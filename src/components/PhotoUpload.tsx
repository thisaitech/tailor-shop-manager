import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X } from '@phosphor-icons/react';
import { useLanguage } from '@/hooks/use-language';

interface PhotoUploadProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
  label: string;
}

export function PhotoUpload({ photos, onPhotosChange, maxPhotos = 5, label }: PhotoUploadProps) {
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newPhotos: string[] = [];

    for (let i = 0; i < files.length && photos.length + newPhotos.length < maxPhotos; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      try {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        newPhotos.push(dataUrl);
      } catch (error) {
        console.error('Error reading file:', error);
      }
    }

    onPhotosChange([...photos, ...newPhotos]);
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">{label}</label>
      
      <div className="grid grid-cols-3 gap-3">
        {photos.map((photo, index) => (
          <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
            <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="absolute top-1 right-1 h-6 w-6 rounded-full"
              onClick={() => handleRemovePhoto(index)}
            >
              <X size={14} weight="bold" />
            </Button>
          </div>
        ))}

        {photos.length < maxPhotos && (
          <label className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 bg-muted/30 hover:bg-muted/50">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
              disabled={uploading}
            />
            {uploading ? (
              <div className="text-sm text-muted-foreground">Uploading...</div>
            ) : (
              <>
                <Camera size={24} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Add Photo</span>
              </>
            )}
          </label>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {photos.length}/{maxPhotos} photos
      </p>
    </div>
  );
}
