export interface UpdateState {
  updateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

let registration: ServiceWorkerRegistration | null = null;
let updateAvailable = false;

export async function registerUpdateListener(
  callback: (state: UpdateState) => void,
): Promise<() => void> {
  if (!('serviceWorker' in navigator)) return () => {};

  const reg = await navigator.serviceWorker.ready;
  registration = reg;

  reg.addEventListener('updatefound', () => {
    const newWorker = reg.installing;
    if (newWorker) {
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          updateAvailable = true;
          callback({ updateAvailable: true, registration: reg });
        }
      });
    }
  });

  return () => {
    registration = null;
    updateAvailable = false;
  };
}

export function getUpdateState(): UpdateState {
  return {
    updateAvailable,
    registration,
  };
}

export async function skipWaiting(): Promise<void> {
  if (registration?.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}
