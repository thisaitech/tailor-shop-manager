import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, DownloadSimple, DeviceMobile } from '@phosphor-icons/react';
import { useLanguage } from '@/hooks/use-language';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('install-prompt-dismissed') === 'true';
  });

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [dismissed]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowPrompt(false);
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('install-prompt-dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <Card className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 p-4 shadow-lg border-2 border-primary/20 bg-card/95 backdrop-blur-sm z-50 animate-in slide-in-from-bottom-5">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X size={20} />
      </button>

      <div className="flex gap-3 items-start pr-6">
        <div className="bg-primary/10 p-2.5 rounded-lg shrink-0">
          <DeviceMobile size={24} className="text-primary" weight="duotone" />
        </div>
        
        <div className="space-y-3 flex-1">
          <div>
            <h3 className="font-semibold text-foreground mb-1">
              {t('installApp') || 'Install App'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('installAppDescription') || 'Install this app on your device for quick access and offline use.'}
            </p>
          </div>

          <Button
            onClick={handleInstall}
            className="w-full"
            size="sm"
          >
            <DownloadSimple size={16} weight="bold" className="mr-2" />
            {t('install') || 'Install Now'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
