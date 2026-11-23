// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { initialState, type Action, type AppState, type Overlay } from '../app/state';
import { beginCreate } from '../core/codeFlow';
import { HOLD_MS } from '../core/constants';
import type { Timer } from '../core/timer';
import { attachKeyboard } from './keyboard';

const RUNNING: Timer = { status: 'running', totalMs: 600_000, endsAt: 500_000 };

function stateWith(opts: { overlay?: Overlay; timer?: Timer | null; code?: boolean }): AppState {
  const base = initialState({
    settings: { ringDirection: 'empties', passcode: '2580' },
    timer: opts.timer === undefined ? RUNNING : opts.timer,
    label: '',
  });
  return { ...base, overlay: opts.overlay ?? 'none', codeFlow: opts.code ? beginCreate() : null };
}

function press(
  key: string,
  init: KeyboardEventInit = {},
  target: EventTarget = document,
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

function release(key: string): void {
  document.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
}

describe('attachKeyboard', () => {
  let dispatch: Mock<(action: Action) => void>;
  let state: AppState;
  let detach: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    dispatch = vi.fn();
    state = stateWith({});
    detach = attachKeyboard(document, () => state, dispatch);
  });
  afterEach(() => {
    detach();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  /** The page going into the background, or the window losing focus (Command-Tab). */
  const hidePage = (): void => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
  };
  const blurWindow = (): void => void window.dispatchEvent(new Event('blur'));

  it.each([
    ['the page is hidden', hidePage],
    ['the window loses focus', blurWindow],
  ])('cancels a held key, and allows a new hold, when %s', (_when, away) => {
    press(' ');
    vi.advanceTimersByTime(HOLD_MS / 2);
    away();
    vi.advanceTimersByTime(HOLD_MS);
    expect(dispatch).not.toHaveBeenCalled();
    // Its keyup never arrived, yet the next press starts a fresh hold.
    press('Enter');
    vi.advanceTimersByTime(HOLD_MS);
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'open-keypad' });
  });

  it('keeps a held key going when the page becomes visible', () => {
    press(' ');
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(HOLD_MS);
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'open-keypad' });
  });

  it('stops listening to the page and the window after detach', () => {
    const fromDocument = vi.spyOn(document, 'removeEventListener');
    const fromWindow = vi.spyOn(window, 'removeEventListener');
    detach();
    expect(fromDocument).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(fromWindow).toHaveBeenCalledWith('blur', expect.any(Function));
  });

  it('types digits, deletes and closes on the keypad overlay', () => {
    state = stateWith({ overlay: 'keypad' });
    press('7');
    press('Backspace');
    press('Escape');
    expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'digit', digit: '7' });
    expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'delete-digit' });
    expect(dispatch).toHaveBeenNthCalledWith(3, { type: 'close-overlay' });
  });

  it('types digits and deletes on the code screen', () => {
    state = stateWith({ code: true });
    press('0');
    press('Backspace');
    expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'digit', digit: '0' });
    expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'delete-digit' });
  });

  it('types one digit, and deletes once, for a key that is leaned on', () => {
    for (const screen of [stateWith({ overlay: 'keypad' }), stateWith({ code: true })]) {
      dispatch.mockClear();
      state = screen;
      press('1');
      press('1', { repeat: true });
      press('1', { repeat: true });
      press('1', { repeat: true });
      press('Backspace');
      const repeat = press('Backspace', { repeat: true });
      expect(repeat.defaultPrevented).toBe(true);
      expect(dispatch.mock.calls).toEqual([
        [{ type: 'digit', digit: '1' }],
        [{ type: 'delete-digit' }],
      ]);
    }
  });

  it('ignores letters and other keys', () => {
    state = stateWith({ overlay: 'keypad' });
    press('a');
    press('F1');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('closes the controls with Escape but ignores digits there', () => {
    state = stateWith({ overlay: 'controls' });
    press('5');
    expect(dispatch).not.toHaveBeenCalled();
    press('Escape');
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'close-overlay' });
  });

  it('ignores keys with ctrl, meta or alt held', () => {
    state = stateWith({ overlay: 'keypad' });
    press('7', { metaKey: true });
    press('7', { ctrlKey: true });
    press('7', { altKey: true });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('ignores keys typed into an input', () => {
    state = stateWith({ timer: null });
    const input = document.createElement('input');
    document.body.append(input);
    press('5', {}, input);
    press('Backspace', {}, input);
    expect(dispatch).not.toHaveBeenCalled();
    input.remove();
  });

  it.each([' ', 'Enter'])('opens the keypad after holding %j for the hold time', (key) => {
    const event = press(key);
    expect(event.defaultPrevented).toBe(true);
    vi.advanceTimersByTime(HOLD_MS - 1);
    expect(dispatch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'open-keypad' });
    vi.advanceTimersByTime(5000);
    expect(dispatch).toHaveBeenCalledOnce();
  });

  it('does nothing when the key is released early', () => {
    press(' ');
    vi.advanceTimersByTime(1500);
    release(' ');
    vi.advanceTimersByTime(5000);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('does not restart the hold on repeat keydown events', () => {
    press(' ');
    vi.advanceTimersByTime(1000);
    press(' ', { repeat: true });
    vi.advanceTimersByTime(1000);
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'open-keypad' });
  });

  it('does not start a hold off the timer screen or with an overlay open', () => {
    state = stateWith({ timer: null });
    press(' ');
    state = stateWith({ overlay: 'keypad' });
    press('Enter');
    vi.advanceTimersByTime(HOLD_MS);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('honours a custom hold time', () => {
    detach();
    detach = attachKeyboard(document, () => state, dispatch, 300);
    press(' ');
    vi.advanceTimersByTime(300);
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'open-keypad' });
  });

  it('does nothing after detach', () => {
    detach();
    state = stateWith({ overlay: 'keypad' });
    press('7');
    expect(dispatch).not.toHaveBeenCalled();
  });
});
