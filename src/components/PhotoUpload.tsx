import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, Image as ImageIcon } from '@phosphor-icons/react';
import { Label } from '@/components/ui/label';

interface PhotoUploadProps {
  label: string;
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
}

export function PhotoUpload({ label, photos, onChange, maxPhotos = 5 }: PhotoUploadProps) {
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

    onChange([...photos, ...newPhotos]);
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {photos.map((photo, index) => (
          <div key={index} className="relative aspect-square group">
            <img
              src={photo}
              alt={`Photo ${index + 1}`}
              className="w-full h-full object-cover rounded-lg border"
            />
            <button
              type="button"
              onClick={() => removePhoto(index)}
              className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={14} weight="bold" />
            </button>
          </div>
        ))}
        
        {photos.length < maxPhotos && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1.5 hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <div className="text-xs text-muted-foreground">Loading...</div>
            ) : (
              <>
                <Camera size={20} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Add</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        capture="environment"
      />

      <p className="text-xs text-muted-foreground">
        {photos.length}/{maxPhotos} photos • Tap to add from camera or gallery
      </p>
    </div>
  );
}
