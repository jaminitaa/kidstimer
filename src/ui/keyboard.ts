import { screenFor, type Action, type AppState } from '../app/state';
import { HOLD_MS } from '../core/constants';

const HOLD_KEYS: readonly string[] = [' ', 'Enter'];
const DIGIT_KEY = /^[0-9]$/;
const TEXT_FIELDS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isTextField(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (TEXT_FIELDS.has(target.tagName) || target.isContentEditable);
}

type KeyHold = {
  readonly start: (event: KeyboardEvent) => void;
  readonly release: (event: KeyboardEvent) => void;
  /** Cancels a running hold and forgets the held key. */
  readonly cancel: () => void;
};

/** Holding one key down for holdMs calls onHold; releasing it first cancels. */
function createKeyHold(onHold: () => void, holdMs: number): KeyHold {
  let holdKey: string | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const cancel = (): void => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    holdKey = null;
  };

  return {
    start(event) {
      event.preventDefault(); // Space must never scroll the page.
      if (event.repeat || holdKey !== null) return;
      holdKey = event.key;
      timer = setTimeout(() => {
        cancel();
        onHold();
      }, holdMs);
    },
    release(event) {
      if (event.key === holdKey) cancel();
    },
    cancel,
  };
}

/**
 * Keyboard support for the MacBook: digits, Backspace and Escape drive the keypad and the
 * code screen, and holding Space or Enter for holdMs on the timer screen opens the keypad.
 * The page being hidden or the window losing focus cancels a held key, since its keyup
 * may never arrive. Returns a function that removes the listeners.
 */
export function attachKeyboard(
  target: Document,
  getState: () => AppState,
  dispatch: (action: Action) => void,
  holdMs: number = HOLD_MS,
): () => void {
  const hold = createKeyHold(() => dispatch({ type: 'open-keypad' }), holdMs);
  const win = target.defaultView;

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.metaKey || event.ctrlKey || event.altKey || isTextField(event.target)) return;
    const state = getState();
    const typing = state.overlay === 'keypad' || screenFor(state) === 'code';
    // A key held down repeats; a leaned-on key must not type a whole code like 1111.
    if (typing && DIGIT_KEY.test(event.key)) {
      event.preventDefault();
      if (!event.repeat) dispatch({ type: 'digit', digit: event.key });
    } else if (typing && event.key === 'Backspace') {
      event.preventDefault();
      if (!event.repeat) dispatch({ type: 'delete-digit' });
    } else if (event.key === 'Escape' && state.overlay !== 'none') {
      dispatch({ type: 'close-overlay' });
    } else if (
      HOLD_KEYS.includes(event.key) &&
      screenFor(state) === 'timer' &&
      state.overlay === 'none'
    ) {
      hold.start(event);
    }
  };
  const onVisibility = (): void => {
    if (target.visibilityState === 'hidden') hold.cancel();
  };

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', hold.release);
  target.addEventListener('visibilitychange', onVisibility);
  win?.addEventListener('blur', hold.cancel);
  return (): void => {
    hold.cancel();
    target.removeEventListener('keydown', onKeyDown);
    target.removeEventListener('keyup', hold.release);
    target.removeEventListener('visibilitychange', onVisibility);
    win?.removeEventListener('blur', hold.cancel);
  };
}
