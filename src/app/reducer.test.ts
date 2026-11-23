import { describe, expect, it } from 'vitest';
import { beginChange, beginCreate } from '../core/codeFlow';
import { LOCKOUT_MS, MAX_TIMER_MS } from '../core/constants';
import { INITIAL_LOCK } from '../core/passcode';
import { addTime, pauseTimer, resumeTimer, startTimer } from '../core/timer';
import { reduce } from './reducer';
import {
  DEFAULT_PERSISTED,
  initialState,
  screenFor,
  shouldAutoClose,
  type Action,
  type AppState,
} from './state';

const NOW = 1_000_000;
const CODE = '2580';
const MINUTE = 60_000;
const RUNNING = startTimer(10 * MINUTE, NOW);

const returning = initialState({
  settings: { ringDirection: 'empties', passcode: CODE },
  timer: null,
  label: '',
});

function stateWith(overrides: Partial<AppState>): AppState {
  return { ...returning, ...overrides };
}

const onTimer = (overrides: Partial<AppState> = {}): AppState =>
  stateWith({ timer: RUNNING, ...overrides });
const keypad = (overrides: Partial<AppState> = {}): AppState =>
  onTimer({ overlay: 'keypad', ...overrides });
const controls = (overrides: Partial<AppState> = {}): AppState =>
  onTimer({ overlay: 'controls', ...overrides });

function run(state: AppState, actions: readonly Action[], now = NOW): AppState {
  return actions.reduce((s, a) => reduce(s, a, now), state);
}
const digits = (code: string): Action[] =>
  [...code].map((digit) => ({ type: 'digit', digit }) as const);

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

describe('initial state', () => {
  it('starts a first run in the create-code flow', () => {
    const state = initialState(DEFAULT_PERSISTED);
    expect(state.codeFlow).toEqual(beginCreate());
    expect(screenFor(state)).toBe('code');
  });

  it('shows setup for a returning user with no timer', () => {
    expect(returning.codeFlow).toBeNull();
    expect(screenFor(returning)).toBe('setup');
  });

  it('shows the timer screen when a timer was saved', () => {
    expect(screenFor(onTimer())).toBe('timer');
  });
});

describe('start', () => {
  it('starts a timer on setup', () => {
    const next = reduce(returning, { type: 'start', durationMs: 5 * MINUTE, label: '' }, NOW);
    expect(next.timer).toEqual(startTimer(5 * MINUTE, NOW));
  });

  it('is ignored on the code and timer screens', () => {
    const action: Action = { type: 'start', durationMs: 5 * MINUTE, label: '' };
    const code = initialState(DEFAULT_PERSISTED);
    expect(reduce(code, action, NOW)).toBe(code);
    const running = onTimer();
    expect(reduce(running, action, NOW)).toBe(running);
  });

  it('is ignored for durations that are out of range or not finite', () => {
    for (const durationMs of [MINUTE - 1, 0, -5, MAX_TIMER_MS + 1, NaN, Infinity]) {
      expect(reduce(returning, { type: 'start', durationMs, label: '' }, NOW)).toBe(returning);
    }
  });

  it('accepts both ends of the allowed range', () => {
    expect(reduce(returning, { type: 'start', durationMs: MINUTE, label: '' }, NOW).timer).not.toBeNull();
    expect(reduce(returning, { type: 'start', durationMs: MAX_TIMER_MS, label: '' }, NOW).timer).not.toBeNull();
  });
});

describe('set-direction', () => {
  it('updates the ring direction on setup', () => {
    const next = reduce(returning, { type: 'set-direction', direction: 'fills' }, NOW);
    expect(next.settings.ringDirection).toBe('fills');
    expect(next.settings.passcode).toBe(CODE);
  });

  it('is ignored on other screens', () => {
    const action: Action = { type: 'set-direction', direction: 'fills' };
    const running = onTimer();
    expect(reduce(running, action, NOW)).toBe(running);
    const code = initialState(DEFAULT_PERSISTED);
    expect(reduce(code, action, NOW)).toBe(code);
  });
});

describe('open-keypad', () => {
  it('opens the keypad on the timer screen', () => {
    const next = reduce(onTimer({ entry: '12' }), { type: 'open-keypad' }, NOW + 5);
    expect(next.overlay).toBe('keypad');
    expect(next.entry).toBe('');
    expect(next.overlayTouchedAt).toBe(NOW + 5);
  });

  it('is ignored on other screens', () => {
    expect(reduce(returning, { type: 'open-keypad' }, NOW)).toBe(returning);
  });

  it('is ignored when an overlay is already open', () => {
    const open = keypad();
    expect(reduce(open, { type: 'open-keypad' }, NOW)).toBe(open);
    const ctrl = controls();
    expect(reduce(ctrl, { type: 'open-keypad' }, NOW)).toBe(ctrl);
  });

  it('is ignored while locked out and accepted at exactly lockedUntil', () => {
    const locked = onTimer({ lock: { wrongCount: 0, lockedUntil: NOW + LOCKOUT_MS } });
    expect(reduce(locked, { type: 'open-keypad' }, NOW + LOCKOUT_MS - 1)).toBe(locked);
    expect(reduce(locked, { type: 'open-keypad' }, NOW + LOCKOUT_MS).overlay).toBe('keypad');
  });
});

describe('digit in keypad', () => {
  it('appends and touches the overlay', () => {
    const next = reduce(keypad(), { type: 'digit', digit: '2' }, NOW + 7);
    expect(next.entry).toBe('2');
    expect(next.overlayTouchedAt).toBe(NOW + 7);
    expect(next.overlay).toBe('keypad');
  });

  it('ignores non-digits', () => {
    const open = keypad();
    expect(reduce(open, { type: 'digit', digit: 'x' }, NOW)).toBe(open);
  });

  it('opens the controls on the right code', () => {
    const start = keypad({ lock: { wrongCount: 2, lockedUntil: null } });
    const next = run(start, digits(CODE));
    expect(next.overlay).toBe('controls');
    expect(next.entry).toBe('');
    expect(next.lock).toEqual(INITIAL_LOCK);
    expect(next.timer).toBe(RUNNING);
  });

  it('clears a done timer on the right code', () => {
    const next = run(keypad(), digits(CODE), NOW + 10 * MINUTE);
    expect(next.timer).toBeNull();
    expect(next.overlay).toBe('none');
    expect(screenFor(next)).toBe('setup');
  });

  it('closes the keypad and counts a wrong code', () => {
    const next = run(keypad(), digits('1111'));
    expect(next.overlay).toBe('none');
    expect(next.entry).toBe('');
    expect(next.lock.wrongCount).toBe(1);
    expect(next.timer).toBe(RUNNING);
  });

  it('is ignored when no passcode is set', () => {
    const open = keypad({ settings: { ringDirection: 'empties', passcode: null } });
    const next = run(open, digits('1234'));
    expect(next.timer).toBe(RUNNING);
    expect(next.overlay).toBe('keypad');
  });
});

describe('lockout', () => {
  it('locks for 30 seconds after three wrong codes', () => {
    let state = onTimer();
    for (let i = 0; i < 3; i += 1) {
      state = run(reduce(state, { type: 'open-keypad' }, NOW), digits('1111'));
    }
    expect(state.lock.lockedUntil).toBe(NOW + LOCKOUT_MS);
    expect(reduce(state, { type: 'open-keypad' }, NOW + LOCKOUT_MS - 1)).toBe(state);
    expect(reduce(state, { type: 'open-keypad' }, NOW + LOCKOUT_MS).overlay).toBe('keypad');
  });
});

describe('digit elsewhere', () => {
  it('is ignored when the overlay is none or controls', () => {
    const idle = onTimer();
    expect(reduce(idle, { type: 'digit', digit: '1' }, NOW)).toBe(idle);
    const ctrl = controls();
    expect(reduce(ctrl, { type: 'digit', digit: '1' }, NOW)).toBe(ctrl);
  });
});

describe('delete-digit', () => {
  it('removes the last keypad digit and touches the overlay', () => {
    const next = reduce(keypad({ entry: '25' }), { type: 'delete-digit' }, NOW + 3);
    expect(next.entry).toBe('2');
    expect(next.overlayTouchedAt).toBe(NOW + 3);
  });

  it('removes the last code flow digit', () => {
    const flow = { ...beginCreate(), entry: '12' };
    const next = reduce(stateWith({ codeFlow: flow }), { type: 'delete-digit' }, NOW);
    expect(next.codeFlow?.entry).toBe('1');
  });

  it('is ignored otherwise', () => {
    const idle = onTimer();
    expect(reduce(idle, { type: 'delete-digit' }, NOW)).toBe(idle);
  });
});

describe('controls gate', () => {
  it('ignores pause, resume, add-time and stop unless the controls are open', () => {
    const actions: Action[] = [
      { type: 'pause' },
      { type: 'resume' },
      { type: 'add-time', minutes: 1 },
      { type: 'stop' },
    ];
    for (const overlay of ['none', 'keypad'] as const) {
      const state = onTimer({ overlay });
      for (const action of actions) {
        expect(reduce(state, action, NOW)).toBe(state);
      }
    }
  });
});

describe('controls', () => {
  it('pauses then resumes', () => {
    const paused = reduce(controls(), { type: 'pause' }, NOW + 1000);
    expect(paused.timer).toEqual(pauseTimer(RUNNING, NOW + 1000));
    expect(paused.overlayTouchedAt).toBe(NOW + 1000);
    const resumed = reduce(paused, { type: 'resume' }, NOW + 2000);
    expect(resumed.timer).toEqual(resumeTimer(pauseTimer(RUNNING, NOW + 1000), NOW + 2000));
    expect(resumed.overlayTouchedAt).toBe(NOW + 2000);
  });

  it('adds 1 and 5 minutes', () => {
    for (const minutes of [1, 5]) {
      const next = reduce(controls(), { type: 'add-time', minutes }, NOW + 10);
      expect(next.timer).toEqual(addTime(RUNNING, minutes * MINUTE, NOW + 10));
      expect(next.overlayTouchedAt).toBe(NOW + 10);
    }
  });

  it('ignores other add-time amounts', () => {
    const ctrl = controls();
    expect(reduce(ctrl, { type: 'add-time', minutes: 2 }, NOW)).toBe(ctrl);
  });

  it('stop clears the timer and closes the overlay', () => {
    const next = reduce(controls(), { type: 'stop' }, NOW);
    expect(next.timer).toBeNull();
    expect(next.overlay).toBe('none');
  });
});

describe('close-overlay', () => {
  it('closes an open overlay and clears the entry', () => {
    const next = reduce(keypad({ entry: '12' }), { type: 'close-overlay' }, NOW);
    expect(next.overlay).toBe('none');
    expect(next.entry).toBe('');
  });

  it('is ignored when already closed', () => {
    const idle = onTimer();
    expect(reduce(idle, { type: 'close-overlay' }, NOW)).toBe(idle);
  });
});

describe('code flow', () => {
  it('creates a passcode on first run', () => {
    const first = initialState(DEFAULT_PERSISTED);
    const next = run(first, [...digits('1357'), ...digits('1357')]);
    expect(next.settings.passcode).toBe('1357');
    expect(next.codeFlow).toBeNull();
    expect(screenFor(next)).toBe('setup');
  });

  it('does not count wrong current codes toward the lockout', () => {
    const start = reduce(returning, { type: 'begin-change-code' }, NOW);
    const next = run(start, digits('0000'));
    expect(next.lock).toEqual(INITIAL_LOCK);
    expect(next.codeFlow?.error).not.toBeNull();
  });

  it('changes the code', () => {
    const start = reduce(returning, { type: 'begin-change-code' }, NOW);
    const next = run(start, [...digits(CODE), ...digits('4321'), ...digits('4321')]);
    expect(next.settings.passcode).toBe('4321');
    expect(next.codeFlow).toBeNull();
  });
});

describe('begin-change-code and cancel-code-flow', () => {
  it('begins a change on setup with a passcode', () => {
    expect(reduce(returning, { type: 'begin-change-code' }, NOW).codeFlow).toEqual(beginChange());
  });

  it('is ignored on the timer screen', () => {
    const running = onTimer();
    expect(reduce(running, { type: 'begin-change-code' }, NOW)).toBe(running);
  });

  it('is ignored when there is no passcode yet', () => {
    const noCode = stateWith({ settings: { ringDirection: 'empties', passcode: null } });
    expect(reduce(noCode, { type: 'begin-change-code' }, NOW)).toBe(noCode);
  });

  it('cancel clears the flow when a passcode exists', () => {
    const changing = reduce(returning, { type: 'begin-change-code' }, NOW);
    expect(reduce(changing, { type: 'cancel-code-flow' }, NOW).codeFlow).toBeNull();
  });

  it('cancel is ignored on first run and when no flow is active', () => {
    const first = initialState(DEFAULT_PERSISTED);
    expect(reduce(first, { type: 'cancel-code-flow' }, NOW)).toBe(first);
    expect(reduce(returning, { type: 'cancel-code-flow' }, NOW)).toBe(returning);
  });
});

describe('fast fingers', () => {
  it('ignores digits typed after a wrong code closed the keypad', () => {
    const next = run(keypad(), digits('111122'));
    expect(next.overlay).toBe('none');
    expect(next.entry).toBe('');
    expect(next.lock.wrongCount).toBe(1);
  });
});

describe('purity', () => {
  it('never changes a frozen input state', () => {
    const actions: Action[] = [
      { type: 'start', durationMs: 5 * MINUTE, label: '' },
      { type: 'set-direction', direction: 'fills' },
      { type: 'open-keypad' },
      { type: 'digit', digit: '2' },
      { type: 'delete-digit' },
      { type: 'close-overlay' },
      { type: 'pause' },
      { type: 'resume' },
      { type: 'add-time', minutes: 5 },
      { type: 'stop' },
      { type: 'begin-change-code' },
      { type: 'cancel-code-flow' },
    ];
    const states = [
      returning,
      onTimer(),
      keypad({ entry: '258' }),
      controls(),
      initialState(DEFAULT_PERSISTED),
    ].map((s) => deepFreeze(structuredClone(s)));
    for (const state of states) {
      for (const action of actions) {
        expect(() => reduce(state, action, NOW)).not.toThrow();
      }
    }
    expect(states[3]).toEqual(controls());
  });
});

describe('shouldAutoClose', () => {
  it('is true only when an overlay has been idle for 10 seconds', () => {
    const open = keypad({ overlayTouchedAt: NOW });
    expect(shouldAutoClose(open, NOW + 9_999)).toBe(false);
    expect(shouldAutoClose(open, NOW + 10_000)).toBe(true);
    expect(shouldAutoClose(onTimer({ overlayTouchedAt: 0 }), NOW)).toBe(false);
  });
});
