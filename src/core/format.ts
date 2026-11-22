import { MS_PER_SECOND } from './constants';

const SECONDS_PER_MINUTE = 60;
const MINUTE_DIGITS = 2;

/** Formats remaining time as minutes:seconds, rounding up to the whole second. Never shows hours. */
export function formatRemaining(remainingMs: number): string {
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
    return '00:00';
  }
  const totalSeconds = Math.ceil(remainingMs / MS_PER_SECOND);
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return `${String(minutes).padStart(MINUTE_DIGITS, '0')}:${String(seconds).padStart(2, '0')}`;
}
