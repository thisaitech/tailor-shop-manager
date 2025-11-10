import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';

  label: string;

}
  label: string;
  const fileInputRe
  const handleFileSelect = async (e: Re
    if (!files || fil
}

      const file = files[i];

        const reader = new FileReader();

          reader.readAsDataURL(file);
        newPhotos.push(dataUrl);
        console.error('Error reading file:', 

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

            {uploading ? (
            ) : (
                <Camera size={2
              </>
     
    

        type="file"
        multiple
    

      <p c
      </p>
  );


























            {uploading ? (

            ) : (



              </>







        type="file"

        multiple







      </p>

  );

