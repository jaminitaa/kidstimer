import { MAX_TIMER_MS } from './constants';

export type Timer =
  | { readonly status: 'running'; readonly totalMs: number; readonly endsAt: number }
  | { readonly status: 'paused'; readonly totalMs: number; readonly remainingMs: number };

export function startTimer(durationMs: number, now: number): Timer {
  return { status: 'running', totalMs: durationMs, endsAt: now + durationMs };
}

/**
 * Time left, never below 0 and never above the timer's total (a device clock set back, or
 * a bad saved end time, could otherwise show more than was set). A paused timer is frozen.
 */
export function remainingMs(timer: Timer, now: number): number {
  const left = timer.status === 'running' ? timer.endsAt - now : timer.remainingMs;
  return Math.min(timer.totalMs, Math.max(0, left));
}

export function isDone(timer: Timer, now: number): boolean {
  return remainingMs(timer, now) === 0;
}

export function pauseTimer(timer: Timer, now: number): Timer {
  if (timer.status === 'paused' || isDone(timer, now)) {
    return timer;
  }
  return { status: 'paused', totalMs: timer.totalMs, remainingMs: remainingMs(timer, now) };
}

export function resumeTimer(timer: Timer, now: number): Timer {
  if (timer.status === 'running') {
    return timer;
  }
  return { status: 'running', totalMs: timer.totalMs, endsAt: now + timer.remainingMs };
}

/** Adds time. Unchanged if the timer is already done or the result would pass the 24 hour limit. */
export function addTime(timer: Timer, addMs: number, now: number): Timer {
  const left = remainingMs(timer, now);
  if (left === 0 || left + addMs > MAX_TIMER_MS) {
    return timer;
  }
  const totalMs = timer.totalMs + addMs;
  return timer.status === 'running'
    ? { status: 'running', totalMs, endsAt: timer.endsAt + addMs }
    : { status: 'paused', totalMs, remainingMs: timer.remainingMs + addMs };
}
