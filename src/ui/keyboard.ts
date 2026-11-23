import { screenFor, type Action, type AppState } from '../app/state';
import { HOLD_MS } from '../core/constants';

const HOLD_KEYS: readonly string[] = [' ', 'Enter'];
const DIGIT_KEY = /^[0-9]$/;
const TEXT_FIELDS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isTextField(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (TEXT_FIELDS.has(target.tagName) || target.isContentEditable);
}

/**
 * Keyboard support for the MacBook: digits, Backspace and Escape drive the keypad and the
 * code screen, and holding Space or Enter for holdMs on the timer screen opens the keypad.
 * Returns a function that removes the listeners.
 */
export function attachKeyboard(
  target: Document,
  getState: () => AppState,
  dispatch: (action: Action) => void,
  holdMs: number = HOLD_MS,
): () => void {
  let holdKey: string | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const cancelHold = (): void => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    holdKey = null;
  };

  const startHold = (event: KeyboardEvent): void => {
    event.preventDefault(); // Space must never scroll the page.
    if (event.repeat || holdKey !== null) return;
    holdKey = event.key;
    timer = setTimeout(() => {
      cancelHold();
      dispatch({ type: 'open-keypad' });
    }, holdMs);
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.metaKey || event.ctrlKey || event.altKey || isTextField(event.target)) return;
    const state = getState();
    const typing = state.overlay === 'keypad' || screenFor(state) === 'code';
    if (typing && DIGIT_KEY.test(event.key)) {
      event.preventDefault();
      dispatch({ type: 'digit', digit: event.key });
    } else if (typing && event.key === 'Backspace') {
      event.preventDefault();
      dispatch({ type: 'delete-digit' });
    } else if (event.key === 'Escape' && state.overlay !== 'none') {
      dispatch({ type: 'close-overlay' });
    } else if (
      HOLD_KEYS.includes(event.key) &&
      screenFor(state) === 'timer' &&
      state.overlay === 'none'
    ) {
      startHold(event);
    }
  };

  const onKeyUp = (event: KeyboardEvent): void => {
    if (event.key === holdKey) cancelHold();
  };

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  return (): void => {
    cancelHold();
    target.removeEventListener('keydown', onKeyDown);
    target.removeEventListener('keyup', onKeyUp);
  };
}
