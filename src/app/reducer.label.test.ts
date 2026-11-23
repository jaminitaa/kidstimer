import { describe, expect, it } from 'vitest';
import { startTimer } from '../core/timer';
import { reduce } from './reducer';
import { initialState, type Action, type AppState } from './state';

const NOW = 1_000_000;
const CODE = '2580';
const MINUTE = 60_000;
const RUNNING = startTimer(10 * MINUTE, NOW);

const returning = initialState({
  settings: { ringDirection: 'empties', passcode: CODE },
  timer: null,
  label: '',
});

const onTimer = (overrides: Partial<AppState> = {}): AppState => ({
  ...returning,
  timer: RUNNING,
  ...overrides,
});
const keypad = (overrides: Partial<AppState> = {}): AppState =>
  onTimer({ overlay: 'keypad', ...overrides });
const controls = (overrides: Partial<AppState> = {}): AppState =>
  onTimer({ overlay: 'controls', ...overrides });

function run(state: AppState, actions: readonly Action[], now = NOW): AppState {
  return actions.reduce((s, a) => reduce(s, a, now), state);
}
const digits = (code: string): Action[] =>
  [...code].map((digit) => ({ type: 'digit', digit }) as const);

describe('start with a label', () => {
  const startWith = (state: AppState, label: string, durationMs = 5 * MINUTE): AppState =>
    reduce(state, { type: 'start', durationMs, label }, NOW);

  it('keeps the label with the new timer', () => {
    const next = startWith(returning, '👟🚗');
    expect(next.label).toBe('👟🚗');
    expect(next.timer).not.toBeNull();
  });

  it('keeps only the first four symbols', () => {
    expect(startWith(returning, '📺🛏️💤👟🚗🛝').label).toBe('📺🛏️💤👟');
  });

  it('accepts an empty label', () => {
    expect(startWith(returning, '').label).toBe('');
  });

  it('is ignored for a bad duration, so no label is set', () => {
    expect(startWith(returning, '👟', 30_000)).toBe(returning);
  });

  it('is ignored while a timer is showing', () => {
    const running = onTimer({ label: '📺' });
    expect(startWith(running, '👟')).toBe(running);
  });
});

describe('label stays put', () => {
  it('is unchanged by pause, resume and add-time', () => {
    const open = controls({ label: '🛏️💤' });
    for (const action of [
      { type: 'pause' },
      { type: 'resume' },
      { type: 'add-time', minutes: 5 },
    ] as const) {
      expect(reduce(open, action, NOW).label).toBe('🛏️💤');
    }
  });

  it('is cleared with the timer by stop', () => {
    const next = reduce(controls({ label: '🛝' }), { type: 'stop' }, NOW);
    expect(next.timer).toBeNull();
    expect(next.label).toBe('');
  });

  it('is cleared with a done timer by the right code', () => {
    const next = run(keypad({ label: '🛝' }), digits(CODE), NOW + 10 * MINUTE);
    expect(next.timer).toBeNull();
    expect(next.label).toBe('');
  });
});

