// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { initialState, type AppState, type Overlay } from '../app/state';
import type { Timer } from '../core/timer';
import { createLockView } from './lockView';

const RUNNING: Timer = { status: 'running', totalMs: 600_000, endsAt: 500_000 };
const PAUSED: Timer = { status: 'paused', totalMs: 600_000, remainingMs: 300_000 };

function stateWith(overlay: Overlay, timer: Timer | null = RUNNING, entry = ''): AppState {
  const base = initialState({ settings: { ringDirection: 'empties', passcode: '2580' }, timer, label: '' });
  return { ...base, overlay, entry };
}

function setup() {
  const dispatch = vi.fn();
  const view = createLockView(dispatch);
  const part = <T extends HTMLElement>(id: string) =>
    view.el.querySelector(`[data-testid="${id}"]`) as T;
  return { view, dispatch, part };
}

describe('createLockView', () => {
  it('hides both parts when there is no overlay', () => {
    const { view, part } = setup();
    view.update(stateWith('none'), 0);
    expect(part('keypad-overlay').hidden).toBe(true);
    expect(part('controls').hidden).toBe(true);
  });

  it('shows the keypad with dots filled for the digits typed', () => {
    const { view, part, dispatch } = setup();
    view.update(stateWith('keypad', RUNNING, '258'), 0);
    expect(part('keypad-overlay').hidden).toBe(false);
    expect(part('controls').hidden).toBe(true);
    const filled = [...part('dots').children].filter(
      (c) => (c as HTMLElement).dataset.filled === 'true',
    );
    expect(filled).toHaveLength(3);
    part('key-0').click();
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'digit', digit: '0' });
  });

  it('sends delete from the keypad', () => {
    const { view, part, dispatch } = setup();
    view.update(stateWith('keypad'), 0);
    part('key-delete').click();
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'delete-digit' });
  });

  it('shows Pause for a running timer and pauses', () => {
    const { view, part, dispatch } = setup();
    view.update(stateWith('controls'), 0);
    expect(part('controls').hidden).toBe(false);
    expect(part('keypad-overlay').hidden).toBe(true);
    expect(part('control-pause').textContent).toBe('Pause');
    part('control-pause').click();
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'pause' });
  });

  it('shows Resume for a paused timer and resumes', () => {
    const { view, part, dispatch } = setup();
    view.update(stateWith('controls', PAUSED), 0);
    expect(part('control-pause').textContent).toBe('Resume');
    part('control-pause').click();
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'resume' });
  });

  it('keeps the last pause label when the timer is gone', () => {
    const { view, part } = setup();
    view.update(stateWith('controls', PAUSED), 0);
    view.update(stateWith('none', null), 0);
    expect(part('control-pause').textContent).toBe('Resume');
  });

  it('adds one or five minutes and stops', () => {
    const { view, part, dispatch } = setup();
    view.update(stateWith('controls'), 0);
    expect(part('control-add-1').textContent).toBe('+1 min');
    expect(part('control-add-5').textContent).toBe('+5 min');
    expect(part('control-stop').textContent).toBe('Stop');
    part('control-add-1').click();
    part('control-add-5').click();
    part('control-stop').click();
    expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'add-time', minutes: 1 });
    expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'add-time', minutes: 5 });
    expect(dispatch).toHaveBeenNthCalledWith(3, { type: 'stop' });
  });
});
