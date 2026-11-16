import { useEffect } from 'react';

// Keeps the phone's screen on while the calling screen shows, where the browser allows it.
// A phone that sleeps drops its connection, and the server lets a dropped player go.
export function useWakeLock() {
  useEffect(() => {
    let active = true;
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
      try {
        const sentinel = await navigator.wakeLock.request('screen');
        if (active) lock = sentinel;
        else void sentinel.release().catch(() => {});
      } catch {
        // Low battery or a browser setting can refuse it, and the game works without it.
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void request();
    };
    void request();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisibility);
      void lock?.release().catch(() => {});
    };
  }, []);
}
