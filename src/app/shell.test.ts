// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { Timer } from '../core/timer';
import { mountShell, showStartupError, SOUND_HINT_TEXT, STARTUP_ERROR_TEXT } from './shell';
import { initialState, type AppState, type Overlay } from './state';

const NOW = 1_000_000;
const RUNNING: Timer = { status: 'running', totalMs: 600_000, endsAt: NOW + 300_000 };
const PAUSED: Timer = { status: 'paused', totalMs: 600_000, remainingMs: 300_000 };

type Name = 'code' | 'setup' | 'timer' | 'lock';

function stateWith(timer: Timer | null, overlay: Overlay = 'none', passcode: string | null = '2580') {
  const base = initialState({ settings: { ringDirection: 'empties', passcode }, timer, label: '' });
  return { ...base, overlay } satisfies AppState;
}

/** A stand-in view that records whether it was still hidden each time it was redrawn. */
function fakeView(name: Name) {
  const el = document.createElement('section');
  el.dataset.testid = name;
  const hiddenWhenUpdated: boolean[] = [];
  const update = vi.fn((_state: AppState, _now: number) => {
    hiddenWhenUpdated.push(el.hidden === true);
  });
  return { el, update, hiddenWhenUpdated };
}

function setup() {
  const root = document.createElement('div');
  const views = {
    code: fakeView('code'),
    setup: fakeView('setup'),
    timer: fakeView('timer'),
    lock: fakeView('lock'),
  };
  const shell = mountShell(root, views);
  const hint = root.querySelector<HTMLElement>('[data-testid="sound-hint"]');
  const shown = (): Name[] =>
    (Object.keys(views) as Name[]).filter((name) => !views[name].el.hidden);
  return { root, views, shell, hint, shown };
}

describe('mountShell', () => {
  it('puts every view in the root, hidden until the first render, then the hint', () => {
    const { root, views, hint, shown } = setup();
    expect([...root.children]).toEqual([
      views.code.el,
      views.setup.el,
      views.timer.el,
      views.lock.el,
      hint,
    ]);
    expect(shown()).toEqual([]);
    expect(hint?.hidden).toBe(true);
  });

  it('shows only the code screen on first run', () => {
    const { root, shell, shown } = setup();
    shell.render(stateWith(null, 'none', null), NOW, false);
    expect(shown()).toEqual(['code']);
    expect(root.dataset.screen).toBe('code');
    expect(root.dataset.overlay).toBe('none');
  });

  it('shows only the setup screen when there is no timer', () => {
    const { root, views, shell, shown } = setup();
    shell.render(stateWith(null), NOW, false);
    expect(shown()).toEqual(['setup']);
    expect(root.dataset.screen).toBe('setup');
    expect(views.timer.update).not.toHaveBeenCalled();
    expect(views.lock.update).not.toHaveBeenCalled();
  });

  it('shows the timer screen with the lock layered over it', () => {
    const { root, views, shell, shown } = setup();
    const state = stateWith(RUNNING, 'keypad');
    shell.render(state, NOW, true);
    expect(shown()).toEqual(['timer', 'lock']);
    expect(root.dataset.screen).toBe('timer');
    expect(root.dataset.overlay).toBe('keypad');
    expect(views.timer.update).toHaveBeenCalledWith(state, NOW);
    expect(views.lock.update).toHaveBeenCalledWith(state, NOW);
  });

  it('redraws a screen before un-hiding it, so it never shows stale colors', () => {
    const { views, shell } = setup();
    shell.render(stateWith(null), NOW, false);
    shell.render(stateWith(RUNNING), NOW, false);
    expect(views.timer.hiddenWhenUpdated).toEqual([true]);
    expect(views.lock.hiddenWhenUpdated).toEqual([true]);
    expect(views.timer.el.hidden).toBe(false);
  });

  it('keeps redrawing the visible screen on every render', () => {
    const { views, shell } = setup();
    shell.render(stateWith(RUNNING), NOW, false);
    shell.render(stateWith(RUNNING), NOW + 16, false);
    expect(views.timer.update).toHaveBeenCalledTimes(2);
    expect(views.timer.update).toHaveBeenLastCalledWith(stateWith(RUNNING), NOW + 16);
    expect(views.setup.update).not.toHaveBeenCalled();
  });

  it('hides the timer screen and the lock once the timer is stopped', () => {
    const { root, shell, shown } = setup();
    shell.render(stateWith(RUNNING, 'controls'), NOW, true);
    shell.render(stateWith(null), NOW, true);
    expect(shown()).toEqual(['setup']);
    expect(root.dataset.overlay).toBe('none');
  });
});

describe('the sound hint', () => {
  it('reads "Tap for sound" and is not a control', () => {
    const { views, hint } = setup();
    expect(hint?.textContent).toBe(SOUND_HINT_TEXT);
    expect(SOUND_HINT_TEXT).toBe('Tap for sound');
    expect(hint?.tagName).not.toBe('BUTTON');
    expect(hint?.getAttribute('role')).toBeNull();
    expect(hint?.tabIndex).toBe(-1);
    expect(views.timer.el.contains(hint ?? null)).toBe(false);
  });

  it('shows only while a timer counts down with sound locked', () => {
    const { shell, hint } = setup();
    shell.render(stateWith(RUNNING), NOW, false);
    expect(hint?.hidden).toBe(false);
    shell.render(stateWith(RUNNING), NOW, true);
    expect(hint?.hidden).toBe(true);
    shell.render(stateWith(PAUSED), NOW, false);
    expect(hint?.hidden).toBe(true);
    shell.render(stateWith(null), NOW, false);
    expect(hint?.hidden).toBe(true);
  });
});

describe('showStartupError', () => {
  it('replaces whatever was on screen with a plain message', () => {
    const root = document.createElement('div');
    root.append(document.createElement('section'));
    showStartupError(root);
    expect(root.children).toHaveLength(1);
    expect(root.textContent).toBe(STARTUP_ERROR_TEXT);
    expect(STARTUP_ERROR_TEXT).toBe('Something went wrong. Close the timer and open it again.');
    expect(root.firstElementChild?.getAttribute('role')).toBe('alert');
  });
});
