import type { Action, AppState } from '../app/state';
import { CODE_FLOW_TITLES } from '../core/codeFlow';
import { createDots, createKeypad } from './keypad';
import { applyStage } from './theme';
import type { View } from './view';

function part(tag: string, className: string, testId: string): HTMLElement {
  const el = document.createElement(tag);
  el.className = className;
  el.dataset.testid = testId;
  return el;
}

function setText(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

/** The screen where a parent sets or changes the 4-digit code. Uses the calm stage colors. */
export function createCodeView(dispatch: (action: Action) => void): View {
  const root = part('section', 'code-screen', 'code-screen');
  root.setAttribute('aria-label', 'Passcode');
  applyStage(root, 'calm');
  const title = part('h1', 'code-title', 'code-title');
  const dots = createDots();
  const error = part('p', 'code-error', 'code-error');
  error.setAttribute('role', 'alert');
  const keypad = createKeypad(
    (digit) => dispatch({ type: 'digit', digit }),
    () => dispatch({ type: 'delete-digit' }),
  );
  const cancel = part('button', 'code-cancel', 'code-cancel') as HTMLButtonElement;
  cancel.type = 'button';
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', () => dispatch({ type: 'cancel-code-flow' }));
  root.append(title, dots.el, error, keypad, cancel);

  return {
    el: root,
    update(state: AppState): void {
      const flow = state.codeFlow;
      if (flow === null) return;
      setText(title, CODE_FLOW_TITLES[flow.step]);
      setText(error, flow.error ?? '');
      dots.set(flow.entry.length);
      // First run has no code to go back to.
      cancel.hidden = state.settings.passcode === null;
    },
  };
}
