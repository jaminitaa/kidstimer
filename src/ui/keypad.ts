import { PASSCODE_LENGTH } from '../core/constants';

// Phone keypad order. The 0 sits in the middle of the last row (styles.css places it).
const DIGIT_ROWS: readonly (readonly string[])[] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['0'],
];
const BACKSPACE_SYMBOL = '⌫';

function key(testId: string, className: string, label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.dataset.testid = testId;
  button.setAttribute('aria-label', label);
  return button;
}

/**
 * The unlabeled passcode keypad. Digit keys are plain circles: the children can read
 * digits, so nothing on a key says which one it is (the aria-label is for screen readers
 * only). styles.css gives them no pressed, hover or focus look; the dots are the only feedback.
 */
export function createKeypad(
  onDigit: (digit: string) => void,
  onDelete: () => void,
): HTMLElement {
  const pad = document.createElement('div');
  pad.className = 'keypad';
  for (const row of DIGIT_ROWS) {
    for (const digit of row) {
      const button = key(`key-${digit}`, 'key key-digit', digit);
      button.dataset.digit = digit;
      button.addEventListener('click', () => onDigit(digit));
      pad.append(button);
    }
  }
  const del = key('key-delete', 'key key-delete', 'Delete');
  del.textContent = BACKSPACE_SYMBOL;
  del.addEventListener('click', onDelete);
  pad.append(del);
  return pad;
}

/** The row of dots that fill in as digits are typed. */
export function createDots(): { readonly el: HTMLElement; set(filled: number): void } {
  const el = document.createElement('div');
  el.className = 'dots';
  el.dataset.testid = 'dots';
  el.setAttribute('aria-hidden', 'true');
  const dots = Array.from({ length: PASSCODE_LENGTH }, () => {
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.dataset.filled = 'false';
    return dot;
  });
  el.append(...dots);
  return {
    el,
    set(filled: number): void {
      dots.forEach((dot, index) => {
        const value = String(index < filled);
        if (dot.dataset.filled !== value) dot.dataset.filled = value;
      });
    },
  };
}
