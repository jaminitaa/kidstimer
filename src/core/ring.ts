export type RingDirection = 'empties' | 'fills';

/** Fraction of the ring that is solid, from 0 to 1. A missing total counts as finished. */
export function ringFraction(
  remainingMs: number,
  totalMs: number,
  direction: RingDirection,
): number {
  const left = totalMs > 0 ? Math.min(1, Math.max(0, remainingMs / totalMs)) : 0;
  return direction === 'empties' ? left : 1 - left;
}

/**
 * Stroke settings for a circle whose arc starts at 12 o'clock and runs clockwise.
 * "fills" grows the solid arc from the top; "empties" removes it starting from the top.
 */
export function ringDash(
  fraction: number,
  direction: RingDirection,
  circumference: number,
): { readonly dasharray: string; readonly dashoffset: number } {
  const solid = fraction * circumference;
  return {
    dasharray: `${solid} ${circumference}`,
    dashoffset: direction === 'empties' ? solid - circumference : 0,
  };
}
