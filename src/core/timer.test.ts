import { describe, expect, it } from 'vitest';
import { MAX_TIMER_MS } from './constants';
import { addTime, isDone, pauseTimer, remainingMs, resumeTimer, startTimer } from './timer';
import type { Timer } from './timer';

const T0 = 1_000_000;

function frozen(timer: Timer): Timer {
  return Object.freeze({ ...timer });
}

describe('timer', () => {
  const t = frozen(startTimer(600_000, T0));
  const p = frozen(pauseTimer(t, T0 + 100_000));

  it('starts running with an end time', () => {
    expect(t).toEqual({ status: 'running', totalMs: 600_000, endsAt: T0 + 600_000 });
  });

  it('reports remaining time, clamped at zero', () => {
    expect(remainingMs(t, T0 + 1_000)).toBe(599_000);
    expect(remainingMs(t, T0 + 700_000)).toBe(0);
  });

  it('knows when it is done', () => {
    expect(isDone(t, T0 + 599_999)).toBe(false);
    expect(isDone(t, T0 + 600_000)).toBe(true);
  });

  it('pauses and freezes the remaining time', () => {
    expect(p).toEqual({ status: 'paused', totalMs: 600_000, remainingMs: 500_000 });
    expect(remainingMs(p, T0 + 999_999)).toBe(500_000);
  });

  it('resumes from the remaining time', () => {
    expect(resumeTimer(p, T0 + 200_000)).toEqual({
      status: 'running',
      totalMs: 600_000,
      endsAt: T0 + 700_000,
    });
  });

  it('adds time to running and paused timers', () => {
    expect(addTime(t, 60_000, T0)).toEqual({
      status: 'running',
      totalMs: 660_000,
      endsAt: T0 + 660_000,
    });
    expect(addTime(p, 300_000, T0)).toEqual({
      status: 'paused',
      totalMs: 900_000,
      remainingMs: 800_000,
    });
  });

  it('returns the same object when nothing changes', () => {
    expect(pauseTimer(p, T0)).toBe(p);
    expect(resumeTimer(t, T0)).toBe(t);
    expect(pauseTimer(t, T0 + 600_000)).toBe(t);
    expect(addTime(t, 60_000, T0 + 600_000)).toBe(t);
    const doneButPaused = frozen({ status: 'paused', totalMs: 1000, remainingMs: 0 });
    expect(addTime(doneButPaused, 60_000, T0)).toBe(doneButPaused);
  });

  it('refuses to pass 24 hours left', () => {
    const full = frozen(startTimer(MAX_TIMER_MS, T0));
    expect(addTime(full, 60_000, T0)).toBe(full);
  });
});
