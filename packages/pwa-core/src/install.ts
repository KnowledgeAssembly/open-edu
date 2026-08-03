export interface InstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  platform: 'android' | 'ios' | 'desktop' | 'unknown';
}

let deferredPrompt: Event | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e;
  });
}

export function getInstallState(): InstallState {
  const isInstalled =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches;

  const platform = detectPlatform();

  return {
    isInstallable: deferredPrompt !== null,
    isInstalled,
    platform,
  };
}

export async function promptInstall(): Promise<{ outcome: 'accepted' | 'dismissed' }> {
  if (!deferredPrompt) {
    return { outcome: 'dismissed' };
  }

  const event = deferredPrompt as unknown as {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  };

  await event.prompt();

  const userChoice = await event.userChoice;

  deferredPrompt = null;
  return userChoice;
}

function detectPlatform(): 'android' | 'ios' | 'desktop' | 'unknown' {
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/windows|mac|linux/.test(ua)) return 'desktop';
  return 'unknown';
}
