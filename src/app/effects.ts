import { soundEffectFor, type SoundEffect, type TickSnapshot } from '../core/tick';
import { remainingMs } from '../core/timer';
import { shouldAutoClose, type Action, type AppState } from './state';

/** The time left right now, or null unless a timer is running (paused or none). */
export function snapshotOf(state: AppState, now: number): TickSnapshot {
  const { timer } = state;
  const running = timer !== null && timer.status === 'running';
  return { at: now, remainingMs: running ? remainingMs(timer, now) : null };
}

/** The screen should stay on only while a timer is counting down. */
export function wantsWake(state: AppState, now: number): boolean {
  const { remainingMs: left } = snapshotOf(state, now);
  return left !== null && left > 0;
}

/** "Tap for sound" shows while a timer counts down but the browser has sound blocked. */
export function needsSoundHint(state: AppState, now: number, soundUnlocked: boolean): boolean {
  return !soundUnlocked && wantsWake(state, now);
}

/** The marker the page records for each sound: "ding-5", "tune". */
export function soundName(effect: SoundEffect): string {
  return effect.kind === 'tune' ? 'tune' : `ding-${effect.minutes}`;
}

export type TickPorts = {
  readonly getState: () => AppState;
  readonly dispatch: (action: Action) => void;
  readonly playSound: (effect: SoundEffect) => void;
  readonly setWake: (active: boolean) => void;
};

/**
 * The work done every tick: play a ding or the tune when one is due, close a keypad or
 * the controls left untouched, and keep the screen awake while the timer counts down.
 */
export function createTicker(ports: TickPorts): (now: number) => void {
  let prev: TickSnapshot | null = null;
  return (now) => {
    const state = ports.getState();
    const cur = snapshotOf(state, now);
    const effect = soundEffectFor(prev, cur);
    prev = cur;
    if (effect !== null) ports.playSound(effect);
    if (shouldAutoClose(state, now)) ports.dispatch({ type: 'close-overlay' });
    ports.setWake(wantsWake(state, now));
  };
}
