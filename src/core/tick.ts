import { STALE_TICK_MS } from './constants';
import { detectCrossing } from './marks';

export type TickSnapshot = { readonly at: number; readonly remainingMs: number | null };
export type SoundEffect =
  | { readonly kind: 'ding'; readonly minutes: number }
  | { readonly kind: 'tune' };

/** Which sound, if any, to play between two ticks. Silent after a long gap (page was asleep). */
export function soundEffectFor(prev: TickSnapshot | null, cur: TickSnapshot): SoundEffect | null {
  if (prev === null || prev.remainingMs === null || cur.remainingMs === null) {
    return null;
  }
  if (cur.at - prev.at > STALE_TICK_MS) {
    return null;
  }
  const crossing = detectCrossing(prev.remainingMs, cur.remainingMs);
  if (crossing === null) {
    return null;
  }
  return crossing.kind === 'end' ? { kind: 'tune' } : { kind: 'ding', minutes: crossing.minutes };
}
