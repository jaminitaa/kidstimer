// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { initialState } from '../app/state';
import type { RingDirection } from '../core/ring';
import { startTimer, type Timer } from '../core/timer';
import { createSetupView } from './setupView';

const NINE_AM = new Date(2026, 10, 22, 9, 0, 0, 0);
const FORTY_SECONDS_TO_HALF_PAST = new Date(2026, 10, 22, 9, 29, 20, 0);
const ONE_MINUTE_TO_HALF_PAST = new Date(2026, 10, 22, 9, 29, 0, 0);
const FIVE_EMOJIS = '📺🛏️💤👟🚗';
const FIRST_FOUR = '📺🛏️💤👟';

function stateWith(timer: Timer | null) {
  const settings = { ringDirection: 'empties', passcode: '2580' } as const;
  return initialState({ settings, timer, label: '' });
}

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
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'start', durationMs, label: '' });
  });

  it('starts a custom timer from the button and from Enter', () => {
    const { part, dispatch, type } = setup();
    type('custom-minutes', '20');
    part('custom-start').click();
    part('custom-minutes').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'start', durationMs: 1_200_000, label: '' });
    expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'start', durationMs: 1_200_000, label: '' });
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
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'start', durationMs: 1_800_000, label: '' });
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
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'start', durationMs: 60_000, label: '' });
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
      view.update({ ...stateWith(null), settings: { ringDirection, passcode: '2580' } }, 0);
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

describe('createSetupView: What for?', () => {
  type Harness = ReturnType<typeof setup>;
  type StartWay = {
    readonly how: string;
    readonly durationMs: number;
    readonly begin: (harness: Harness) => void;
  };
  const START_WAYS: readonly StartWay[] = [
    { how: 'a preset', durationMs: 300_000, begin: ({ part }) => part('preset-5').click() },
    {
      how: 'custom minutes',
      durationMs: 600_000,
      begin: ({ part, type }) => {
        type('custom-minutes', '10');
        part('custom-start').click();
      },
    },
    {
      how: 'until a time',
      durationMs: 1_800_000,
      begin: ({ part, type }) => {
        type('until-time', '09:30');
        part('until-start').click();
      },
    },
  ];

  it('comes first, above How long?', () => {
    const { view } = setup();
    const headings = [...view.el.querySelectorAll('.setup-label')].map((h) => h.textContent);
    expect(headings.slice(0, 2)).toEqual(['What for?', 'How long?']);
  });

  it('has an empty, labelled text box', () => {
    const { part } = setup();
    const box = part<HTMLInputElement>('label-input');
    expect(box.tagName).toBe('INPUT');
    expect(box.type).toBe('text');
    expect(box.value).toBe('');
    expect(box.getAttribute('aria-label')).toBe('What for');
    expect(box.getAttribute('autocomplete')).toBe('off');
    expect(box.getAttribute('autocapitalize')).toBe('off');
    expect(box.getAttribute('autocorrect')).toBe('off');
    expect(box.spellcheck).toBe(false);
  });

  it('keeps only the first 4 symbols as you type', () => {
    const { part, type } = setup();
    type('label-input', FIVE_EMOJIS);
    expect(part<HTMLInputElement>('label-input').value).toBe(FIRST_FOUR);
  });

  it('leaves the text alone while a word is still being composed, and trims it once done', () => {
    const { part } = setup();
    const box = part<HTMLInputElement>('label-input');
    box.value = FIVE_EMOJIS;
    box.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true }));
    expect(box.value).toBe(FIVE_EMOJIS);
    box.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    expect(box.value).toBe(FIRST_FOUR);
  });

  it('has the four quick picks in order, each named for a screen reader', () => {
    const { view, part } = setup();
    const picks = [...view.el.querySelectorAll<HTMLElement>('[data-testid^="pick-"]')];
    const ids = picks.map((p) => p.dataset.testid);
    expect(ids).toEqual(['pick-tv', 'pick-bed', 'pick-shoes', 'pick-slide']);
    expect(picks.every((p) => p.tagName === 'BUTTON')).toBe(true);
    expect(part('pick-bed').textContent).toBe('🛏️💤');
    expect(part('pick-bed').getAttribute('aria-label')).toBe('Bed and zzz');
  });

  it('fills the box from a quick pick, replacing what was there', () => {
    const { part, type } = setup();
    part('pick-shoes').click();
    expect(part<HTMLInputElement>('label-input').value).toBe('👟🚗');
    type('label-input', '📺');
    part('pick-slide').click();
    expect(part<HTMLInputElement>('label-input').value).toBe('🛝');
  });

  it.each(START_WAYS)('starts from $how with what is in the box, then empties it', (way) => {
    const harness = setup();
    harness.part('pick-shoes').click();
    way.begin(harness);
    const expected = { type: 'start', durationMs: way.durationMs, label: '👟🚗' };
    expect(harness.dispatch).toHaveBeenCalledExactlyOnceWith(expected);
    expect(harness.part<HTMLInputElement>('label-input').value).toBe('');
  });

  it('sends an empty label when the box is empty', () => {
    const { part, dispatch } = setup();
    part('preset-5').click();
    const expected = { type: 'start', durationMs: 300_000, label: '' };
    expect(dispatch).toHaveBeenCalledExactlyOnceWith(expected);
  });

  it('keeps the box when the minutes are refused', () => {
    const { part, dispatch, type } = setup();
    type('label-input', '👟');
    type('custom-minutes', '0');
    part('custom-start').click();
    expect(dispatch).not.toHaveBeenCalled();
    expect(part<HTMLInputElement>('label-input').value).toBe('👟');
  });

  it('keeps the box when the time is missing or too soon', () => {
    const { part, dispatch, type } = setup(FORTY_SECONDS_TO_HALF_PAST);
    type('label-input', '👟');
    part('until-start').click();
    type('until-time', '09:30');
    part('until-start').click();
    expect(dispatch).not.toHaveBeenCalled();
    expect(part<HTMLInputElement>('label-input').value).toBe('👟');
  });

  it('keeps the box on every redraw: no timer, a running timer, or the screen hidden', () => {
    const { view, part, type } = setup();
    const box = part<HTMLInputElement>('label-input');
    type('label-input', '👟');
    view.update(stateWith(null), 0);
    expect(box.value).toBe('👟');
    view.update(stateWith(startTimer(300_000, 0)), 0);
    expect(box.value).toBe('👟');
    view.el.hidden = true;
    view.update(stateWith(null), 0);
    expect(box.value).toBe('👟');
  });
});
