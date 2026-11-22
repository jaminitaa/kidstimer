import { MAX_TIMER_MS } from './constants';

export type ClockTime = { readonly hours: number; readonly minutes: number };

const TIME_VALUE = /^([0-9]{2}):([0-9]{2})$/;
const MAX_HOUR = 23;
const MAX_MINUTE = 59;

/** Parses "HH:MM" from an <input type="time">. Returns null for anything else. */
export function parseTimeValue(value: string): ClockTime | null {
  const match = TIME_VALUE.exec(value);
  if (match === null) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > MAX_HOUR || minutes > MAX_MINUTE) return null;
  return { hours, minutes };
}

/**
 * Milliseconds from now until the next time the wall clock reads `target`
 * (device local time). Always > 0 and <= 24 hours: if the time is now or has
 * passed, it means tomorrow.
 */
export function msUntil(target: ClockTime, now: Date): number {
  const next = new Date(
    now.getFullYear(), now.getMonth(), now.getDate(), target.hours, target.minutes, 0, 0,
  );
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  // A daylight-saving change can make "tomorrow" 25 hours away; the timer caps at 24.
  return Math.min(next.getTime() - now.getTime(), MAX_TIMER_MS);
}
