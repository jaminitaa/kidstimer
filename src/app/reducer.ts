import { beginChange, codeFlowDelete, codeFlowDigit } from '../core/codeFlow';
import {
  ADD_TIME_MINUTES,
  MAX_TIMER_MS,
  MIN_TIMER_MS,
  MS_PER_MINUTE,
  PASSCODE_LENGTH,
} from '../core/constants';
import { appendDigit, checkPasscode, deleteDigit, isLockedOut } from '../core/passcode';
import { addTime, isDone, pauseTimer, resumeTimer, startTimer, type Timer } from '../core/timer';
import { screenFor, type Action, type AppState } from './state';

type Handler<T extends Action['type']> = (
  state: AppState,
  action: Extract<Action, { type: T }>,
  now: number,
) => AppState;

const closed = (state: AppState, changes: Partial<AppState>): AppState => ({
  ...state,
  ...changes,
  overlay: 'none',
  entry: '',
});

const onStart: Handler<'start'> = (state, { durationMs }, now) => {
  const valid =
    Number.isFinite(durationMs) && durationMs >= MIN_TIMER_MS && durationMs <= MAX_TIMER_MS;
  if (screenFor(state) !== 'setup' || !valid) return state;
  return { ...state, timer: startTimer(durationMs, now) };
};

const onSetDirection: Handler<'set-direction'> = (state, { direction }) =>
  screenFor(state) === 'setup'
    ? { ...state, settings: { ...state.settings, ringDirection: direction } }
    : state;

const onOpenKeypad: Handler<'open-keypad'> = (state, _action, now) => {
  if (screenFor(state) !== 'timer' || state.overlay !== 'none') return state;
  if (isLockedOut(state.lock, now)) return state;
  return { ...state, overlay: 'keypad', entry: '', overlayTouchedAt: now };
};

/** A full code was typed on the keypad: open the controls, clear a done timer, or count a miss. */
function submitKeypad(state: AppState, entry: string, now: number): AppState {
  const { passcode } = state.settings;
  if (passcode === null || state.timer === null) return state;
  const { lock, outcome } = checkPasscode(state.lock, entry, passcode, now);
  if (outcome === 'wrong') return closed(state, { lock });
  if (isDone(state.timer, now)) return closed(state, { lock, timer: null });
  return { ...state, lock, overlay: 'controls', entry: '', overlayTouchedAt: now };
}

function codeFlowDigitStep(state: AppState, digit: string): AppState {
  if (state.codeFlow === null) return state;
  const { flow, newPasscode } = codeFlowDigit(state.codeFlow, digit, state.settings.passcode);
  const settings =
    newPasscode === null ? state.settings : { ...state.settings, passcode: newPasscode };
  return { ...state, codeFlow: flow, settings };
}

const onDigit: Handler<'digit'> = (state, { digit }, now) => {
  if (state.codeFlow !== null) return codeFlowDigitStep(state, digit);
  if (state.overlay !== 'keypad') return state;
  const entry = appendDigit(state.entry, digit);
  if (entry === state.entry) return state;
  if (entry.length < PASSCODE_LENGTH) return { ...state, entry, overlayTouchedAt: now };
  return submitKeypad(state, entry, now);
};

const onDeleteDigit: Handler<'delete-digit'> = (state, _action, now) => {
  if (state.codeFlow !== null) return { ...state, codeFlow: codeFlowDelete(state.codeFlow) };
  if (state.overlay !== 'keypad') return state;
  return { ...state, entry: deleteDigit(state.entry), overlayTouchedAt: now };
};

const onCloseOverlay: Handler<'close-overlay'> = (state) =>
  state.overlay === 'none' ? state : closed(state, {});

/** Changes the timer, but only while the parent controls are open. */
function withControls(state: AppState, now: number, change: (timer: Timer) => Timer): AppState {
  if (state.overlay !== 'controls' || state.timer === null) return state;
  return { ...state, timer: change(state.timer), overlayTouchedAt: now };
}

const onPause: Handler<'pause'> = (state, _action, now) =>
  withControls(state, now, (timer) => pauseTimer(timer, now));

const onResume: Handler<'resume'> = (state, _action, now) =>
  withControls(state, now, (timer) => resumeTimer(timer, now));

const onAddTime: Handler<'add-time'> = (state, { minutes }, now) => {
  if (!(ADD_TIME_MINUTES as readonly number[]).includes(minutes)) return state;
  return withControls(state, now, (timer) => addTime(timer, minutes * MS_PER_MINUTE, now));
};

const onStop: Handler<'stop'> = (state) =>
  state.overlay === 'controls' ? closed(state, { timer: null }) : state;

const onBeginChangeCode: Handler<'begin-change-code'> = (state) =>
  screenFor(state) === 'setup' && state.settings.passcode !== null
    ? { ...state, codeFlow: beginChange() }
    : state;

const onCancelCodeFlow: Handler<'cancel-code-flow'> = (state) =>
  state.codeFlow !== null && state.settings.passcode !== null
    ? { ...state, codeFlow: null }
    : state;

const HANDLERS: { readonly [T in Action['type']]: Handler<T> } = {
  start: onStart,
  'set-direction': onSetDirection,
  'open-keypad': onOpenKeypad,
  digit: onDigit,
  'delete-digit': onDeleteDigit,
  'close-overlay': onCloseOverlay,
  pause: onPause,
  resume: onResume,
  'add-time': onAddTime,
  stop: onStop,
  'begin-change-code': onBeginChangeCode,
  'cancel-code-flow': onCancelCodeFlow,
};

export function reduce(state: AppState, action: Action, now: number): AppState {
  const handler = HANDLERS[action.type] as Handler<typeof action.type>;
  return handler(state, action, now);
}
