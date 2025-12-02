import { useNetworkStatus } from '@/hooks/use-mobile-app';
import { WifiSlash, WifiHigh } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';

export function NetworkStatus() {
  const { isOnline, connectionType } = useNetworkStatus();
  const [showBanner, setShowBanner] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true);
      setWasOffline(true);
    } else if (wasOffline) {
      // Show "Back online" message briefly
      setShowBanner(true);
      const timer = setTimeout(() => {
        setShowBanner(false);
        setWasOffline(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (!showBanner) return null;

  return (
    <div
      className={`offline-banner flex items-center justify-center gap-2 ${
        isOnline ? 'bg-green-500' : 'bg-red-500'
      }`}
    >
      {isOnline ? (
        <>
          <WifiHigh size={18} weight="bold" />
          <span>Back online</span>
        </>
      ) : (
        <>
          <WifiSlash size={18} weight="bold" />
          <span>No internet connection</span>
          {connectionType !== 'unknown' && (
            <span className="text-xs opacity-80">({connectionType})</span>
          )}
        </>
      )}
    </div>
  );
}

