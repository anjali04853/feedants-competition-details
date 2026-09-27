import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { serverNow, subscribeClockOffset } from '@/api/serverClock';
import { Duration, splitDuration } from '@/utils/format';

/**
 * Remaining time until `endsAt`, based on server-corrected time.
 * Ticks once per second, and only in the component that uses it, so a
 * countdown never re-renders the whole screen.
 */
export function useCountdown(endsAt: string | null | undefined): Duration | null {
  const target = endsAt ? Date.parse(endsAt) : null;
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    if (target === null) return;
    const tick = () => setNow(serverNow());
    tick();
    const interval = setInterval(() => {
      tick();
      if (serverNow() >= target) clearInterval(interval);
    }, 1000);
    // Re-sync immediately when the app returns to the foreground or the offset changes.
    const appState = AppState.addEventListener('change', (s) => s === 'active' && tick());
    const unsubscribe = subscribeClockOffset(tick);
    return () => {
      clearInterval(interval);
      appState.remove();
      unsubscribe();
    };
  }, [target]);

  return target === null ? null : splitDuration(target - now);
}
