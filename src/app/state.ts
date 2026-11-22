import { beginCreate, type CodeFlow } from '../core/codeFlow';
import { OVERLAY_IDLE_MS } from '../core/constants';
import { INITIAL_LOCK, type LockState } from '../core/passcode';
import type { RingDirection } from '../core/ring';
import type { Timer } from '../core/timer';

export type Settings = { readonly ringDirection: RingDirection; readonly passcode: string | null };
export type Overlay = 'none' | 'keypad' | 'controls';

export type AppState = {
  readonly settings: Settings;
  readonly timer: Timer | null;
  readonly overlay: Overlay;
  /** Keypad digits typed so far. */
  readonly entry: string;
  readonly lock: LockState;
  readonly codeFlow: CodeFlow | null;
  readonly overlayTouchedAt: number;
};

export type Action =
  | { readonly type: 'start'; readonly durationMs: number }
  | { readonly type: 'set-direction'; readonly direction: RingDirection }
  | { readonly type: 'open-keypad' }
  | { readonly type: 'digit'; readonly digit: string }
  | { readonly type: 'delete-digit' }
  | { readonly type: 'close-overlay' }
  | { readonly type: 'pause' }
  | { readonly type: 'resume' }
  | { readonly type: 'add-time'; readonly minutes: number }
  | { readonly type: 'stop' }
  | { readonly type: 'begin-change-code' }
  | { readonly type: 'cancel-code-flow' };

export type Screen = 'code' | 'setup' | 'timer';
export type Persisted = { readonly settings: Settings; readonly timer: Timer | null };

export const DEFAULT_PERSISTED: Persisted = {
  settings: { ringDirection: 'empties', passcode: null },
  timer: null,
};

export function initialState(persisted: Persisted): AppState {
  return {
    settings: persisted.settings,
    timer: persisted.timer,
    overlay: 'none',
    entry: '',
    lock: INITIAL_LOCK,
    codeFlow: persisted.settings.passcode === null ? beginCreate() : null,
    overlayTouchedAt: 0,
  };
}

export function screenFor(state: AppState): Screen {
  if (state.codeFlow !== null) return 'code';
  return state.timer === null ? 'setup' : 'timer';
}

export function shouldAutoClose(state: AppState, now: number): boolean {
  return state.overlay !== 'none' && now - state.overlayTouchedAt >= OVERLAY_IDLE_MS;
}
