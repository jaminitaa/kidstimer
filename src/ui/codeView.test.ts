// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { initialState, type AppState } from '../app/state';
import { beginChange, beginCreate, type CodeFlow } from '../core/codeFlow';
import { createCodeView } from './codeView';

function stateWith(codeFlow: CodeFlow | null, passcode: string | null = null): AppState {
  const base = initialState({ settings: { ringDirection: 'empties', passcode }, timer: null, label: '' });
  return { ...base, codeFlow };
}

function setup() {
  const dispatch = vi.fn();
  const view = createCodeView(dispatch);
  const part = <T extends HTMLElement>(id: string) =>
    view.el.querySelector(`[data-testid="${id}"]`) as T;
  const filled = () =>
    [...part('dots').children].filter((c) => (c as HTMLElement).dataset.filled === 'true').length;
  return { view, dispatch, part, filled };
}

describe('createCodeView', () => {
  it('shows the first-run create step: no cancel, no dots filled', () => {
    const { view, part, filled } = setup();
    view.update(stateWith(beginCreate()), 0);
    expect(view.el.dataset.testid).toBe('code-screen');
    expect(part('code-title').textContent).toBe('Choose a 4-digit code');
    expect(part('code-cancel').hidden).toBe(true);
    expect(filled()).toBe(0);
  });

  it('fills a dot for each digit typed', () => {
    const { view, filled } = setup();
    view.update(stateWith({ ...beginCreate(), entry: '25' }), 0);
    expect(filled()).toBe(2);
  });

  it('asks for the code again on the confirm step', () => {
    const { view, part } = setup();
    view.update(stateWith({ step: 'confirm', first: '2580', entry: '', error: null }), 0);
    expect(part('code-title').textContent).toBe('Enter it again');
  });

  it('shows an error, and clears it', () => {
    const { view, part } = setup();
    view.update(stateWith({ ...beginCreate(), error: "Those didn't match. Try again." }), 0);
    expect(part('code-error').textContent).toBe("Those didn't match. Try again.");
    view.update(stateWith(beginCreate()), 0);
    expect(part('code-error').textContent).toBe('');
  });

  it('sends keypad presses as actions', () => {
    const { view, part, dispatch } = setup();
    view.update(stateWith(beginCreate()), 0);
    part('key-3').click();
    part('key-delete').click();
    expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'digit', digit: '3' });
    expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'delete-digit' });
  });

  it('offers cancel when changing an existing code', () => {
    const { view, part, dispatch } = setup();
    view.update(stateWith(beginChange(), '2580'), 0);
    expect(part('code-title').textContent).toBe('Enter your current code');
    expect(part('code-cancel').hidden).toBe(false);
    part('code-cancel').click();
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'cancel-code-flow' });
  });

  it('keeps what it last showed when there is no code flow', () => {
    const { view, part } = setup();
    view.update(stateWith(beginCreate()), 0);
    view.update(stateWith(null), 0);
    expect(part('code-title').textContent).toBe('Choose a 4-digit code');
  });
});
