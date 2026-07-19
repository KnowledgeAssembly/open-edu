import * as React from 'react';
import { WifiOff } from 'lucide-react';

interface OfflineBannerProps {
  isOnline: boolean;
}

export const OfflineBanner = React.forwardRef<HTMLDivElement, OfflineBannerProps>(
  ({ isOnline }, ref) => {
    if (isOnline) return null;

    return (
      <div
        ref={ref}
        role="alert"
        className="fixed top-0 left-0 right-0 z-50 bg-surface-container px-4 py-2 text-center text-sm text-on-surface/70 dark:bg-surface-container dark:text-on-surface/70"
      >
        <WifiOff className="mr-2 inline h-4 w-4" aria-hidden="true" />
        You're offline. Some features may be limited.
      </div>
    );
  },
);
OfflineBanner.displayName = 'OfflineBanner';
