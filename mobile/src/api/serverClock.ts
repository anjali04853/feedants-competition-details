/**
 * Keeps an estimate of (server time - device time). Countdowns and hold timers
 * use `serverNow()` so a device with a wrong clock still shows correct deadlines.
 */
let offsetMs = 0;
const listeners = new Set<() => void>();

export function recordServerTime(serverTimeIso: string, requestStartedAt: number, responseReceivedAt: number) {
  const serverTime = Date.parse(serverTimeIso);
  if (Number.isNaN(serverTime)) return;
  // Assume the server stamped the response halfway through the round trip.
  const midpoint = requestStartedAt + (responseReceivedAt - requestStartedAt) / 2;
  const next = serverTime - midpoint;
  // Ignore sub-second jitter so timers don't visibly jump.
  if (Math.abs(next - offsetMs) > 1000) {
    offsetMs = next;
    listeners.forEach((l) => l());
  }
}

export const serverNow = () => Date.now() + offsetMs;

export function subscribeClockOffset(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
