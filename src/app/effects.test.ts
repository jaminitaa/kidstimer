import { describe, expect, it, vi } from 'vitest';
import { OVERLAY_IDLE_MS, STALE_TICK_MS, TICK_MS } from '../core/constants';
import type { Timer } from '../core/timer';
import {
  createTicker,
  needsSoundHint,
  shouldReloadForUpdate,
  snapshotOf,
  soundName,
  wantsWake,
} from './effects';
import { initialState, type AppState } from './state';

const NOW = 1_000_000;
const TOTAL_MS = 900_000;
const running = (leftMs: number): Timer => ({
  status: 'running',
  totalMs: TOTAL_MS,
  endsAt: NOW + leftMs,
});
const PAUSED: Timer = { status: 'paused', totalMs: TOTAL_MS, remainingMs: 120_000 };

function stateWith(timer: Timer | null, changes: Partial<AppState> = {}): AppState {
  const settings = { ringDirection: 'empties', passcode: '2580' } as const;
  return { ...initialState({ settings, timer }), ...changes };
}

describe('snapshotOf', () => {
  it('gives the time left for a running timer', () => {
    expect(snapshotOf(stateWith(running(120_000)), NOW)).toEqual({ at: NOW, remainingMs: 120_000 });
  });

  it('gives 0 for a running timer past its end', () => {
    expect(snapshotOf(stateWith(running(-5_000)), NOW)).toEqual({ at: NOW, remainingMs: 0 });
  });

  it('gives null when the timer is paused or there is none', () => {
    expect(snapshotOf(stateWith(PAUSED), NOW)).toEqual({ at: NOW, remainingMs: null });
    expect(snapshotOf(stateWith(null), NOW)).toEqual({ at: NOW, remainingMs: null });
  });
});

describe('wantsWake', () => {
  it('is true only while a timer is counting down', () => {
    expect(wantsWake(stateWith(running(1)), NOW)).toBe(true);
    expect(wantsWake(stateWith(running(0)), NOW)).toBe(false);
    expect(wantsWake(stateWith(running(-1)), NOW)).toBe(false);
    expect(wantsWake(stateWith(PAUSED), NOW)).toBe(false);
    expect(wantsWake(stateWith(null), NOW)).toBe(false);
  });
});

describe('needsSoundHint', () => {
  it('is true only while a timer is counting down and sound is still locked', () => {
    expect(needsSoundHint(stateWith(running(60_000)), NOW, false)).toBe(true);
    expect(needsSoundHint(stateWith(running(60_000)), NOW, true)).toBe(false);
    expect(needsSoundHint(stateWith(running(0)), NOW, false)).toBe(false);
    expect(needsSoundHint(stateWith(PAUSED), NOW, false)).toBe(false);
    expect(needsSoundHint(stateWith(null), NOW, false)).toBe(false);
  });
});

describe('shouldReloadForUpdate', () => {
  it('reloads for a new version only when there is no timer', () => {
    expect(shouldReloadForUpdate(stateWith(null))).toBe(true);
  });

  it('waits for the next open while any timer exists: running, paused or finished', () => {
    expect(shouldReloadForUpdate(stateWith(running(600_000)))).toBe(false);
    expect(shouldReloadForUpdate(stateWith(PAUSED))).toBe(false);
    expect(shouldReloadForUpdate(stateWith(running(-5_000)))).toBe(false);
    expect(shouldReloadForUpdate(stateWith(running(600_000), { overlay: 'controls' }))).toBe(false);
  });
});

describe('soundName', () => {
  it('names dings by their minutes and the end tune as "tune"', () => {
    expect(soundName({ kind: 'ding', minutes: 5 })).toBe('ding-5');
    expect(soundName({ kind: 'ding', minutes: 15 })).toBe('ding-15');
    expect(soundName({ kind: 'tune' })).toBe('tune');
  });
});

describe('createTicker', () => {
  function setup(initial: AppState) {
    let state = initial;
    const ports = {
      getState: () => state,
      dispatch: vi.fn(),
      playSound: vi.fn(),
      setWake: vi.fn(),
    };
    const setState = (next: AppState): void => {
      state = next;
    };
    return { tick: createTicker(ports), ports, setState };
  }

  it('dings when a mark is crossed, but never on the first tick', () => {
    const { tick, ports } = setup(stateWith(running(300_100)));
    tick(NOW);
    expect(ports.playSound).not.toHaveBeenCalled();
    tick(NOW + TICK_MS);
    expect(ports.playSound).toHaveBeenCalledExactlyOnceWith({ kind: 'ding', minutes: 5 });
  });

  it('plays the tune once when the time runs out', () => {
    const { tick, ports } = setup(stateWith(running(TICK_MS / 2)));
    tick(NOW);
    tick(NOW + TICK_MS);
    tick(NOW + 2 * TICK_MS);
    expect(ports.playSound).toHaveBeenCalledExactlyOnceWith({ kind: 'tune' });
  });

  it('stays silent when the page was asleep across a mark', () => {
    const { tick, ports } = setup(stateWith(running(300_100)));
    tick(NOW);
    tick(NOW + STALE_TICK_MS + 1);
    expect(ports.playSound).not.toHaveBeenCalled();
  });

  it('closes the keypad or controls after they sit untouched', () => {
    const { tick, ports } = setup(
      stateWith(running(600_000), { overlay: 'keypad', overlayTouchedAt: NOW }),
    );
    tick(NOW + OVERLAY_IDLE_MS - 1);
    expect(ports.dispatch).not.toHaveBeenCalled();
    tick(NOW + OVERLAY_IDLE_MS);
    expect(ports.dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'close-overlay' });
  });

  it('keeps the screen awake only while the timer counts down', () => {
    const { tick, ports, setState } = setup(stateWith(running(600_000)));
    tick(NOW);
    expect(ports.setWake).toHaveBeenLastCalledWith(true);
    setState(stateWith(PAUSED));
    tick(NOW + TICK_MS);
    expect(ports.setWake).toHaveBeenLastCalledWith(false);
  });
});
