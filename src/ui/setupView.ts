import type { Action, AppState } from '../app/state';
import { MIN_TIMER_MS, MS_PER_MINUTE, PRESET_MINUTES } from '../core/constants';
import type { RingDirection } from '../core/ring';
import { parseCustomMinutes } from '../core/validate';
import { msUntil, parseTimeValue } from '../core/untilTime';
import { applyStage } from './theme';
import type { View } from './view';

const PICK_TIME_MESSAGE = 'Pick a time first.';
// The shortest timer is one minute, so a time sooner than that cannot start one.
const TOO_SOON_MESSAGE = "That's less than a minute away.";
const DIRECTIONS: readonly { readonly value: RingDirection; readonly label: string }[] = [
  { value: 'empties', label: 'Empties' },
  { value: 'fills', label: 'Fills up' },
];

type Dispatch = (action: Action) => void;

function make<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  testId?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.className = className;
  if (testId !== undefined) el.dataset.testid = testId;
  return el;
}

function button(className: string, testId: string, text: string, onClick: () => void) {
  const el = make('button', className, testId);
  el.type = 'button';
  el.textContent = text;
  el.addEventListener('click', onClick);
  return el;
}

function section(label: string, ...children: HTMLElement[]): HTMLElement {
  const el = make('section', 'setup-section');
  const heading = make('h2', 'setup-label');
  heading.textContent = label;
  el.append(heading, ...children);
  return el;
}

function errorLine(testId: string): HTMLElement {
  const el = make('p', 'setup-error', testId);
  el.setAttribute('role', 'alert');
  return el;
}

function presets(dispatch: Dispatch): HTMLElement {
  const grid = make('div', 'preset-grid');
  for (const minutes of PRESET_MINUTES) {
    const label = `${minutes} min`;
    const start = () => dispatch({ type: 'start', durationMs: minutes * MS_PER_MINUTE });
    grid.append(button('btn btn-preset', `preset-${minutes}`, label, start));
  }
  return grid;
}

function customMinutes(dispatch: Dispatch): HTMLElement {
  const input = make('input', 'field', 'custom-minutes');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.autocomplete = 'off';
  input.placeholder = 'Minutes';
  input.setAttribute('aria-label', 'Custom minutes');
  const error = errorLine('custom-error');
  const submit = () => {
    const result = parseCustomMinutes(input.value);
    if (!result.ok) {
      error.textContent = result.message;
      return;
    }
    dispatch({ type: 'start', durationMs: result.minutes * MS_PER_MINUTE });
  };
  input.addEventListener('input', () => (error.textContent = ''));
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') submit();
  });
  const row = make('div', 'setup-row');
  row.append(input, button('btn', 'custom-start', 'Start', submit));
  const wrap = make('div', 'setup-group');
  wrap.append(row, error);
  return wrap;
}

function untilTime(dispatch: Dispatch, clock: () => Date): HTMLElement {
  const input = make('input', 'field', 'until-time');
  input.type = 'time';
  input.setAttribute('aria-label', 'Until this time');
  const error = errorLine('until-error');
  const submit = () => {
    const target = parseTimeValue(input.value);
    if (target === null) {
      error.textContent = PICK_TIME_MESSAGE;
      return;
    }
    const durationMs = msUntil(target, clock());
    if (durationMs < MIN_TIMER_MS) {
      error.textContent = TOO_SOON_MESSAGE;
      return;
    }
    dispatch({ type: 'start', durationMs });
  };
  input.addEventListener('input', () => (error.textContent = ''));
  const row = make('div', 'setup-row');
  row.append(input, button('btn', 'until-start', 'Start', submit));
  const wrap = make('div', 'setup-group');
  wrap.append(row, error);
  return wrap;
}

function directions(dispatch: Dispatch): {
  readonly el: HTMLElement;
  readonly buttons: ReadonlyMap<RingDirection, HTMLButtonElement>;
} {
  const el = make('div', 'setup-row direction-row');
  const buttons = new Map<RingDirection, HTMLButtonElement>();
  for (const { value, label } of DIRECTIONS) {
    const choice = button('btn btn-choice', `direction-${value}`, label, () =>
      dispatch({ type: 'set-direction', direction: value }),
    );
    choice.setAttribute('aria-pressed', 'false');
    buttons.set(value, choice);
    el.append(choice);
  }
  return { el, buttons };
}

/** The screen where a parent starts a timer. Uses the calm stage colors. */
export function createSetupView(dispatch: Dispatch, clock: () => Date): View {
  const root = make('main', 'setup-screen', 'setup-screen');
  applyStage(root, 'calm');
  const inner = make('div', 'setup-inner');
  const direction = directions(dispatch);
  const changeCode = button('btn-link', 'change-code', 'Change code', () =>
    dispatch({ type: 'begin-change-code' }),
  );
  inner.append(
    section('How long?', presets(dispatch), customMinutes(dispatch)),
    section('Or until a time', untilTime(dispatch, clock)),
    section('Ring', direction.el),
    changeCode,
  );
  root.append(inner);

  return {
    el: root,
    update(state: AppState): void {
      for (const [value, el] of direction.buttons) {
        const pressed = String(state.settings.ringDirection === value);
        if (el.getAttribute('aria-pressed') !== pressed) el.setAttribute('aria-pressed', pressed);
      }
    },
  };
}
