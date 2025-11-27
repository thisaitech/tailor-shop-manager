import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, X, Check, Repeat } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface WebcamCaptureProps {
  onCapture: (imageDataUrl: string) => void;
  onClose?: () => void;
}

export function WebcamCapture({ onCapture, onClose }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const startCamera = useCallback(async () => {
    try {
      // Stop existing stream if any
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsStreaming(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Unable to access camera. Please check permissions.');
    }
  }, [stream, facingMode]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsStreaming(false);
    }
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to data URL
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(imageDataUrl);
        stopCamera();
      }
    }
  }, [stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const confirmPhoto = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage);
      stopCamera();
      if (onClose) onClose();
    }
  }, [capturedImage, onCapture, stopCamera, onClose]);

  const handleClose = useCallback(() => {
    stopCamera();
    if (onClose) onClose();
  }, [stopCamera, onClose]);

  const toggleCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    if (isStreaming) {
      stopCamera();
      // Restart with new facing mode
      setTimeout(() => startCamera(), 100);
    }
  }, [isStreaming, stopCamera, startCamera]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-background">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Camera size={24} weight="duotone" />
              Camera Capture
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0"
            >
              <X size={20} />
            </Button>
          </div>

          {/* Camera View / Captured Image */}
          <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
              </>
            ) : (
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-full object-contain"
              />
            )}

            {/* Camera switch button (only when streaming) */}
            {isStreaming && !capturedImage && (
              <Button
                variant="secondary"
                size="sm"
                onClick={toggleCamera}
                className="absolute top-4 right-4"
              >
                <Repeat size={20} />
              </Button>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-2 justify-center">
            {!isStreaming && !capturedImage && (
              <Button onClick={startCamera} className="flex items-center gap-2">
                <Camera size={20} weight="duotone" />
                Start Camera
              </Button>
            )}

            {isStreaming && !capturedImage && (
              <Button onClick={capturePhoto} size="lg" className="flex items-center gap-2">
                <Camera size={24} weight="duotone" />
                Capture Photo
              </Button>
            )}

            {capturedImage && (
              <>
                <Button
                  variant="outline"
                  onClick={retakePhoto}
                  className="flex items-center gap-2"
                >
                  <Repeat size={20} />
                  Retake
                </Button>
                <Button
                  onClick={confirmPhoto}
                  className="flex items-center gap-2"
                >
                  <Check size={20} weight="bold" />
                  Use Photo
                </Button>
              </>
            )}
          </div>

          {/* Instructions */}
          <p className="text-sm text-muted-foreground text-center">
            {!isStreaming && !capturedImage && 'Click "Start Camera" to begin'}
            {isStreaming && !capturedImage && 'Position the document/item and click "Capture Photo"'}
            {capturedImage && 'Review the photo and click "Use Photo" to confirm'}
          </p>
        </div>
      </Card>
    </div>
  );
}
