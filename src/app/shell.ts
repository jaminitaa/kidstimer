import type { View } from '../ui/view';
import { needsSoundHint } from './effects';
import { screenFor, type AppState, type Screen } from './state';

export const SOUND_HINT_TEXT = 'Tap for sound';
export const STARTUP_ERROR_TEXT = 'Something went wrong. Close the timer and open it again.';

/** One view per screen, plus the lock, which is layered over the timer screen. */
export type ShellViews = { readonly [S in Screen]: View } & { readonly lock: View };

export type Shell = {
  /** Shows the one screen the state calls for, redraws it, and shows or hides the hint. */
  render(state: AppState, now: number, soundUnlocked: boolean): void;
};

const SCREENS: readonly Screen[] = ['code', 'setup', 'timer'];

/** Redraws before un-hiding, so a screen never appears with the last timer's colors. */
function showIf(view: View, visible: boolean, state: AppState, now: number): void {
  if (visible) view.update(state, now);
  if (view.el.hidden === visible) view.el.hidden = !visible;
}

function setData(el: HTMLElement, key: string, value: string): void {
  if (el.dataset[key] !== value) el.dataset[key] = value;
}

/** A plain note, not a control: styles/shell.css lets every touch pass through it. */
function createSoundHint(): HTMLElement {
  const hint = document.createElement('div');
  hint.className = 'sound-hint';
  hint.dataset.testid = 'sound-hint';
  hint.textContent = SOUND_HINT_TEXT;
  hint.hidden = true;
  return hint;
}

/**
 * Puts the views in `root` and shows them one at a time. `root` carries data-screen and
 * data-overlay, which the lock styles use to make room for the keypad or the controls.
 */
export function mountShell(root: HTMLElement, views: ShellViews): Shell {
  const hint = createSoundHint();
  const all = [views.code, views.setup, views.timer, views.lock];
  for (const view of all) view.el.hidden = true;
  root.append(...all.map((view) => view.el), hint);

  return {
    render(state, now, soundUnlocked) {
      const screen = screenFor(state);
      setData(root, 'screen', screen);
      setData(root, 'overlay', state.overlay);
      for (const name of SCREENS) showIf(views[name], name === screen, state, now);
      showIf(views.lock, screen === 'timer', state, now);
      const hideHint = !needsSoundHint(state, now, soundUnlocked);
      if (hint.hidden !== hideHint) hint.hidden = hideHint;
    },
  };
}

/** Replaces the page with a plain message, so a failed start is never a blank screen. */
export function showStartupError(root: HTMLElement): void {
  const message = document.createElement('p');
  message.className = 'startup-error';
  message.setAttribute('role', 'alert');
  message.textContent = STARTUP_ERROR_TEXT;
  root.replaceChildren(message);
}
