import type { Action, AppState } from '../app/state';
import { ADD_TIME_MINUTES } from '../core/constants';
import { createDots, createKeypad } from './keypad';
import { applyStage } from './theme';
import type { View } from './view';

function part(tag: string, className: string, testId: string): HTMLElement {
  const el = document.createElement(tag);
  el.className = className;
  el.dataset.testid = testId;
  return el;
}

function control(testId: string, text: string, onClick: () => void): HTMLButtonElement {
  const button = part('button', 'control', testId) as HTMLButtonElement;
  button.type = 'button';
  button.textContent = text;
  button.addEventListener('click', onClick);
  return button;
}

/**
 * The lock: the passcode keypad overlay and, after the right code, the parent controls.
 * Both sit in a panel at the bottom of the screen; styles/lock.css shrinks the ring above it
 * while #app[data-overlay] is set. The keypad gives no hint of which key was pressed.
 */
export function createLockView(dispatch: (action: Action) => void): View {
  const root = part('div', 'lock', 'lock');
  applyStage(root, 'calm');

  const keypadOverlay = part('section', 'lock-panel lock-keypad', 'keypad-overlay');
  keypadOverlay.setAttribute('aria-label', 'Passcode');
  const dots = createDots();
  keypadOverlay.append(
    dots.el,
    createKeypad(
      (digit) => dispatch({ type: 'digit', digit }),
      () => dispatch({ type: 'delete-digit' }),
    ),
  );

  const controls = part('section', 'lock-panel lock-controls', 'controls');
  controls.setAttribute('aria-label', 'Timer controls');
  // The pause button's action depends on the timer, so it is chosen at click time.
  let pauseAction: Action = { type: 'pause' };
  const pause = control('control-pause', 'Pause', () => dispatch(pauseAction));
  const addButtons = ADD_TIME_MINUTES.map((minutes) =>
    control(`control-add-${minutes}`, `+${minutes} min`, () =>
      dispatch({ type: 'add-time', minutes }),
    ),
  );
  const stop = control('control-stop', 'Stop', () => dispatch({ type: 'stop' }));
  stop.classList.add('control-stop');
  controls.append(pause, ...addButtons, stop);
  root.append(keypadOverlay, controls);

  return {
    el: root,
    update(state: AppState): void {
      keypadOverlay.hidden = state.overlay !== 'keypad';
      controls.hidden = state.overlay !== 'controls';
      dots.set(state.entry.length);
      if (state.timer !== null) {
        const paused = state.timer.status === 'paused';
        pauseAction = paused ? { type: 'resume' } : { type: 'pause' };
        const label = paused ? 'Resume' : 'Pause';
        if (pause.textContent !== label) pause.textContent = label;
      }
    },
  };
}
