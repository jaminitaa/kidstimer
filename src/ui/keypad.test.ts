// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createDots, createKeypad } from './keypad';

const DIGIT_ORDER = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

function setup() {
  const onDigit = vi.fn();
  const onDelete = vi.fn();
  const pad = createKeypad(onDigit, onDelete);
  const key = (id: string) => pad.querySelector(`[data-testid="key-${id}"]`) as HTMLButtonElement;
  return { pad, onDigit, onDelete, key };
}

describe('createKeypad', () => {
  it('reports the digit that was clicked', () => {
    const { onDigit, key } = setup();
    key('7').click();
    expect(onDigit).toHaveBeenCalledExactlyOnceWith('7');
  });

  it('reports the delete key', () => {
    const { onDelete, onDigit, key } = setup();
    key('delete').click();
    expect(onDelete).toHaveBeenCalledOnce();
    expect(onDigit).not.toHaveBeenCalled();
  });

  it('shows nothing on any digit key, but names it for screen readers', () => {
    const { key } = setup();
    for (const digit of DIGIT_ORDER) {
      expect(key(digit).textContent).toBe('');
      expect(key(digit).getAttribute('aria-label')).toBe(digit);
      expect(key(digit).type).toBe('button');
    }
  });

  it('lays the digit keys out like a phone: 1 to 9, then 0', () => {
    const { pad } = setup();
    const ids = [...pad.querySelectorAll<HTMLElement>('[data-testid^="key-"]')]
      .map((el) => el.dataset.testid?.replace('key-', ''))
      .filter((id) => id !== 'delete');
    expect(ids).toEqual(DIGIT_ORDER);
  });

  it('gives the delete key a backspace symbol and a label', () => {
    const { key } = setup();
    expect(key('delete').textContent).toBe('⌫');
    expect(key('delete').getAttribute('aria-label')).toBe('Delete');
  });
});

describe('createDots', () => {
  const flags = (el: HTMLElement) => [...el.children].map((c) => (c as HTMLElement).dataset.filled);

  it('starts empty with four dots', () => {
    const dots = createDots();
    expect(dots.el.dataset.testid).toBe('dots');
    expect(flags(dots.el)).toEqual(['false', 'false', 'false', 'false']);
  });

  it('fills the first n dots', () => {
    const dots = createDots();
    dots.set(2);
    expect(flags(dots.el)).toEqual(['true', 'true', 'false', 'false']);
    dots.set(0);
    expect(flags(dots.el)).toEqual(['false', 'false', 'false', 'false']);
  });
});
