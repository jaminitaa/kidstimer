import { MARK_MINUTES, MS_PER_MINUTE } from './constants';

export type Crossing =
  | { readonly kind: 'ding'; readonly minutes: number }
  | { readonly kind: 'end' };

/**
 * Finds what happened between two readings. A mark M is crossed when prev > M >= cur.
 * Reaching zero is the end. If several marks were crossed, the lowest wins.
 */
export function detectCrossing(prevRemainingMs: number, curRemainingMs: number): Crossing | null {
  if (curRemainingMs <= 0) {
    return prevRemainingMs > 0 ? { kind: 'end' } : null;
  }
  const crossed = MARK_MINUTES.filter((minutes) => {
    const markMs = minutes * MS_PER_MINUTE;
    return prevRemainingMs > markMs && markMs >= curRemainingMs;
  });
  if (crossed.length === 0) {
    return null;
  }
  return { kind: 'ding', minutes: Math.min(...crossed) };
}
