// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { initialState } from '../app/state';
import type { RingDirection } from '../core/ring';
import { createSetupView } from './setupView';

const NINE_AM = new Date(2026, 10, 22, 9, 0, 0, 0);
const FORTY_SECONDS_TO_HALF_PAST = new Date(2026, 10, 22, 9, 29, 20, 0);
const ONE_MINUTE_TO_HALF_PAST = new Date(2026, 10, 22, 9, 29, 0, 0);

function setup(now: Date = NINE_AM) {
  const dispatch = vi.fn();
  const view = createSetupView(dispatch, () => now);
  const part = <T extends HTMLElement>(id: string) =>
    view.el.querySelector(`[data-testid="${id}"]`) as T;
  const type = (id: string, value: string) => {
    const input = part<HTMLInputElement>(id);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  return { view, dispatch, part, type };
}

describe('createSetupView', () => {
  it('is the setup screen with the three section labels', () => {
    const { view } = setup();
    expect(view.el.dataset.testid).toBe('setup-screen');
    expect(view.el.textContent).toContain('How long?');
    expect(view.el.textContent).toContain('Or until a time');
    expect(view.el.textContent).toContain('Ring');
  });

  it.each([
    [5, 300_000],
    [10, 600_000],
    [15, 900_000],
    [30, 1_800_000],
  ])('starts a %i-minute timer from its preset', (minutes, durationMs) => {
    const { part, dispatch } = setup();
    part(`preset-${minutes}`).click();
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'start', durationMs });
  });

  it('starts a custom timer from the button and from Enter', () => {
    const { part, dispatch, type } = setup();
    type('custom-minutes', '20');
    part('custom-start').click();
    part('custom-minutes').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'start', durationMs: 1_200_000 });
    expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'start', durationMs: 1_200_000 });
  });

  it('rejects bad custom minutes with a message that clears on the next input', () => {
    const { part, dispatch, type } = setup();
    type('custom-minutes', '0');
    part('custom-start').click();
    expect(dispatch).not.toHaveBeenCalled();
    expect(part('custom-error').textContent).toBe('At least 1 minute.');
    type('custom-minutes', '2');
    expect(part('custom-error').textContent).toBe('');
  });

  it('starts an until-time timer measured from the injected clock', () => {
    const { part, dispatch, type } = setup();
    type('until-time', '09:30');
    part('until-start').click();
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'start', durationMs: 1_800_000 });
  });

  it('refuses a time less than a minute away, with a message that clears on the next input', () => {
    const { part, dispatch, type } = setup(FORTY_SECONDS_TO_HALF_PAST);
    type('until-time', '09:30');
    part('until-start').click();
    expect(dispatch).not.toHaveBeenCalled();
    expect(part('until-error').textContent).toBe("That's less than a minute away.");
    type('until-time', '09:45');
    expect(part('until-error').textContent).toBe('');
  });

  it('starts a timer for a time exactly one minute away', () => {
    const { part, dispatch, type } = setup(ONE_MINUTE_TO_HALF_PAST);
    type('until-time', '09:30');
    part('until-start').click();
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'start', durationMs: 60_000 });
    expect(part('until-error').textContent).toBe('');
  });

  it('asks for a time when none is chosen, and clears the message on input', () => {
    const { part, dispatch, type } = setup();
    part('until-start').click();
    expect(dispatch).not.toHaveBeenCalled();
    expect(part('until-error').textContent).toBe('Pick a time first.');
    type('until-time', '10:00');
    expect(part('until-error').textContent).toBe('');
  });

  it('sets the ring direction and shows the current one', () => {
    const { view, part, dispatch } = setup();
    part('direction-fills').click();
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'set-direction', direction: 'fills' });
    const show = (ringDirection: RingDirection) =>
      view.update(initialState({ settings: { ringDirection, passcode: '2580' }, timer: null }), 0);
    show('fills');
    expect(part('direction-fills').getAttribute('aria-pressed')).toBe('true');
    expect(part('direction-empties').getAttribute('aria-pressed')).toBe('false');
    show('empties');
    expect(part('direction-fills').getAttribute('aria-pressed')).toBe('false');
    expect(part('direction-empties').getAttribute('aria-pressed')).toBe('true');
  });

  it('labels the direction buttons', () => {
    const { part } = setup();
    expect(part('direction-empties').textContent).toBe('Empties');
    expect(part('direction-fills').textContent).toBe('Fills up');
  });

  it('starts the change-code flow', () => {
    const { part, dispatch } = setup();
    part('change-code').click();
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'begin-change-code' });
  });
});
