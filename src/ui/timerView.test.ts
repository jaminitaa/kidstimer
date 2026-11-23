// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { initialState, type AppState } from '../app/state';
import { MS_PER_MINUTE } from '../core/constants';
import { ringDash, type RingDirection } from '../core/ring';
import { pauseTimer, startTimer, type Timer } from '../core/timer';
import { STAGE_COLORS } from './theme';
import { createTimerView } from './timerView';

const FIFTEEN_MIN = 900_000;

function stateWith(timer: Timer | null, ringDirection: RingDirection = 'empties'): AppState {
  return initialState({ settings: { ringDirection, passcode: '2580' }, timer, label: '' });
}

function labelled(label: string, timer: Timer = startTimer(FIFTEEN_MIN, 0)): AppState {
  return { ...stateWith(timer), label };
}

function setup() {
  const view = createTimerView();
  const part = (id: string): Element => {
    const found = view.el.querySelector(`[data-testid="${id}"]`);
    if (found === null) throw new Error(`missing ${id}`);
    return found;
  };
  const digits = part('digits') as HTMLElement;
  const timesUp = part('times-up') as HTMLElement;
  /** Looked up when asked, so a missing line fails only the tests about it. */
  const label = (): HTMLElement => part('timer-label') as HTMLElement;
  const arc = part('ring-arc');
  const track = part('ring-track');
  const circumference = 2 * Math.PI * Number(arc.getAttribute('r'));
  const dash = () => ({
    dasharray: arc.getAttribute('stroke-dasharray'),
    dashoffset: Number(arc.getAttribute('stroke-dashoffset')),
  });
  return { view, digits, timesUp, label, arc, track, circumference, dash };
}

describe('createTimerView', () => {
  it('is the timer screen, with the track drawn behind the arc', () => {
    const { view, arc, track } = setup();
    expect(view.el.dataset.testid).toBe('timer-screen');
    expect(arc.tagName).toBe('circle');
    expect(track.tagName).toBe('circle');
    expect(track.getAttribute('r')).toBe(arc.getAttribute('r'));
    expect(track.compareDocumentPosition(arc) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('opens a 15-minute timer on 15:00, calm, with a full ring', () => {
    const { view, digits, timesUp, circumference, dash } = setup();
    view.update(stateWith(startTimer(FIFTEEN_MIN, 0)), 0);
    expect(digits.textContent).toBe('15:00');
    expect(digits.dataset.len).toBe('5');
    expect(view.el.dataset.stage).toBe('calm');
    expect(timesUp.hidden).toBe(true);
    expect(dash()).toEqual(ringDash(1, 'empties', circumference));
  });

  it('turns warm at 5 minutes left and hot at 1 minute left', () => {
    const { view, digits } = setup();
    const state = stateWith(startTimer(FIFTEEN_MIN, 0));
    view.update(state, 600_000);
    expect(digits.textContent).toBe('05:00');
    expect(view.el.dataset.stage).toBe('warm');
    expect(view.el.style.getPropertyValue('--stage-bg')).toBe(STAGE_COLORS.warm.bg);
    view.update(state, 840_000);
    expect(digits.textContent).toBe('01:00');
    expect(view.el.dataset.stage).toBe('hot');
  });

  it.each([900_000, 5_000_000])('shows 00:00 and Time\'s up! at and after the end (now = %i)', (now) => {
    const { view, digits, timesUp } = setup();
    view.update(stateWith(startTimer(FIFTEEN_MIN, 0)), now);
    expect(digits.textContent).toBe('00:00');
    expect(view.el.dataset.stage).toBe('done');
    expect(timesUp.hidden).toBe(false);
    expect(timesUp.textContent).toBe("Time's up!");
  });

  it('hides Time\'s up! again when a new timer replaces a finished one', () => {
    const { view, timesUp } = setup();
    view.update(stateWith(startTimer(FIFTEEN_MIN, 0)), FIFTEEN_MIN);
    view.update(stateWith(startTimer(FIFTEEN_MIN, FIFTEEN_MIN)), FIFTEEN_MIN);
    expect(view.el.dataset.stage).toBe('calm');
    expect(timesUp.hidden).toBe(true);
  });

  it('grows the arc in "fills" mode', () => {
    const { view, circumference, dash } = setup();
    view.update(stateWith(startTimer(FIFTEEN_MIN, 0), 'fills'), 450_000);
    expect(dash()).toEqual(ringDash(0.5, 'fills', circumference));
  });

  it('hides the arc when no part of it is solid', () => {
    const { view, arc } = setup();
    view.update(stateWith(startTimer(FIFTEEN_MIN, 0), 'fills'), 0);
    expect(arc.getAttribute('visibility')).toBe('hidden');
    view.update(stateWith(startTimer(FIFTEEN_MIN, 0), 'fills'), 1000);
    expect(arc.getAttribute('visibility')).toBe('visible');
    view.update(stateWith(startTimer(FIFTEEN_MIN, 0), 'empties'), FIFTEEN_MIN);
    expect(arc.getAttribute('visibility')).toBe('hidden');
  });

  it('freezes a paused timer whatever the time', () => {
    const { view, digits, circumference, dash } = setup();
    const paused = stateWith(pauseTimer(startTimer(FIFTEEN_MIN, 0), 300_000));
    for (const now of [300_000, 900_000, 10_000_000]) {
      view.update(paused, now);
      expect(digits.textContent).toBe('10:00');
      expect(view.el.dataset.stage).toBe('calm');
      expect(dash()).toEqual(ringDash(600_000 / FIFTEEN_MIN, 'empties', circumference));
    }
  });

  it('shows long timers in minutes only, with their length', () => {
    const { view, digits } = setup();
    view.update(stateWith(startTimer(480 * MS_PER_MINUTE, 0)), 0);
    expect(digits.textContent).toBe('480:00');
    expect(digits.dataset.len).toBe('6');
    view.update(stateWith(startTimer(1440 * MS_PER_MINUTE, 0)), 0);
    expect(digits.textContent).toBe('1440:00');
    expect(digits.dataset.len).toBe('7');
  });

  it('has nothing a child could press or focus', () => {
    const { view } = setup();
    view.update(stateWith(startTimer(FIFTEEN_MIN, 0)), 0);
    expect(view.el.querySelectorAll('button, a, input, select, textarea, [tabindex]').length).toBe(0);
  });

  it('does not throw without a timer', () => {
    const { view } = setup();
    expect(() => view.update(stateWith(null), 0)).not.toThrow();
  });
});

describe('createTimerView: the line under the time', () => {
  it('is there but hidden when the label is empty', () => {
    const { view, label } = setup();
    view.update(labelled(''), 0);
    expect(view.el.contains(label())).toBe(true);
    expect(label().hidden).toBe(true);
  });

  it('shows each symbol of the label in its own element', () => {
    const { view, label } = setup();
    view.update(labelled('👟🚗'), 0);
    expect(label().hidden).toBe(false);
    expect(label().textContent).toBe('👟🚗');
    expect(label().children.length).toBe(2);
  });

  it('shows markup as plain text', () => {
    const { view, label } = setup();
    view.update(labelled('<b>hi'), 0);
    expect(label().textContent).toBe('<b>hi');
    expect(label().querySelector('b')).toBeNull();
  });

  it('stays at the end, with Time\'s up! showing too', () => {
    const { view, label, timesUp } = setup();
    view.update(labelled('🛏️💤'), FIFTEEN_MIN);
    expect(label().hidden).toBe(false);
    expect(label().textContent).toBe('🛏️💤');
    expect(timesUp.hidden).toBe(false);
  });

  it('is not rebuilt when the label has not changed', () => {
    const { view, label } = setup();
    view.update(labelled('👟🚗'), 0);
    const first = label().firstElementChild;
    view.update(labelled('👟🚗'), 1000);
    expect(first).not.toBeNull();
    expect(label().firstElementChild).toBe(first);
  });

  it('follows a change of label', () => {
    const { view, label } = setup();
    view.update(labelled('👟'), 0);
    expect(label().textContent).toBe('👟');
    view.update(labelled('🛝'), 0);
    expect(label().textContent).toBe('🛝');
    view.update(labelled(''), 0);
    expect(label().hidden).toBe(true);
  });
});
