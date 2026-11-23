// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { HOLD_MS } from '../core/constants';
import { attachHold } from './hold';

type PointerInit = { pointerId?: number; button?: number; clientX?: number; clientY?: number };

/** jsdom may lack PointerEvent, so a MouseEvent with the pointer type name and a pointerId stands in. */
function fire(el: HTMLElement, type: string, init: PointerInit = {}): MouseEvent {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: init.button ?? 0,
    clientX: init.clientX ?? 0,
    clientY: init.clientY ?? 0,
  });
  Object.defineProperty(event, 'pointerId', { value: init.pointerId ?? 1 });
  el.dispatchEvent(event);
  return event;
}

describe('attachHold', () => {
  let el: HTMLElement;
  let onHold: Mock<() => void>;

  beforeEach(() => {
    vi.useFakeTimers();
    el = document.createElement('div');
    onHold = vi.fn();
  });
  afterEach(() => vi.useRealTimers());

  it('fires once after the hold time, not before', () => {
    attachHold(el, onHold);
    fire(el, 'pointerdown');
    vi.advanceTimersByTime(HOLD_MS - 1);
    expect(onHold).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onHold).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(5000);
    expect(onHold).toHaveBeenCalledOnce();
  });

  it('honours a custom hold time', () => {
    attachHold(el, onHold, 500);
    fire(el, 'pointerdown');
    vi.advanceTimersByTime(500);
    expect(onHold).toHaveBeenCalledOnce();
  });

  it.each(['pointerup', 'pointercancel', 'pointerleave'])('%s cancels the hold', (type) => {
    attachHold(el, onHold);
    fire(el, 'pointerdown');
    vi.advanceTimersByTime(1500);
    fire(el, type);
    vi.advanceTimersByTime(5000);
    expect(onHold).not.toHaveBeenCalled();
  });

  it('does not cancel for a small wobble', () => {
    attachHold(el, onHold);
    fire(el, 'pointerdown', { clientX: 100, clientY: 100 });
    fire(el, 'pointermove', { clientX: 105, clientY: 100 });
    vi.advanceTimersByTime(HOLD_MS);
    expect(onHold).toHaveBeenCalledOnce();
  });

  it('cancels when the pointer moves far away', () => {
    attachHold(el, onHold);
    fire(el, 'pointerdown', { clientX: 100, clientY: 100 });
    fire(el, 'pointermove', { clientX: 100, clientY: 125 });
    vi.advanceTimersByTime(HOLD_MS);
    expect(onHold).not.toHaveBeenCalled();
  });

  it('cancels when a second finger touches down', () => {
    attachHold(el, onHold);
    fire(el, 'pointerdown', { pointerId: 1 });
    vi.advanceTimersByTime(500);
    fire(el, 'pointerdown', { pointerId: 2 });
    vi.advanceTimersByTime(5000);
    expect(onHold).not.toHaveBeenCalled();
  });

  it('does not restart from the leftover finger after the other one lifts', () => {
    attachHold(el, onHold);
    fire(el, 'pointerdown', { pointerId: 1 });
    fire(el, 'pointerdown', { pointerId: 2 });
    fire(el, 'pointerup', { pointerId: 2 });
    vi.advanceTimersByTime(5000);
    expect(onHold).not.toHaveBeenCalled();
  });

  it('can hold again once every finger has lifted', () => {
    attachHold(el, onHold);
    fire(el, 'pointerdown', { pointerId: 1 });
    fire(el, 'pointerdown', { pointerId: 2 });
    fire(el, 'pointerup', { pointerId: 2 });
    fire(el, 'pointerup', { pointerId: 1 });
    fire(el, 'pointerdown', { pointerId: 3 });
    vi.advanceTimersByTime(HOLD_MS);
    expect(onHold).toHaveBeenCalledOnce();
  });

  it('ignores moves and releases from other pointers', () => {
    attachHold(el, onHold);
    fire(el, 'pointerdown', { pointerId: 1 });
    fire(el, 'pointerup', { pointerId: 9 });
    fire(el, 'pointermove', { pointerId: 9, clientX: 500 });
    vi.advanceTimersByTime(HOLD_MS);
    expect(onHold).toHaveBeenCalledOnce();
  });

  it('ignores non-primary buttons', () => {
    attachHold(el, onHold);
    fire(el, 'pointerdown', { button: 2 });
    vi.advanceTimersByTime(HOLD_MS);
    expect(onHold).not.toHaveBeenCalled();
  });

  it('blocks the context menu', () => {
    attachHold(el, onHold);
    const event = new Event('contextmenu', { bubbles: true, cancelable: true });
    el.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('does nothing after detach', () => {
    const detach = attachHold(el, onHold);
    fire(el, 'pointerdown');
    detach();
    vi.advanceTimersByTime(HOLD_MS);
    fire(el, 'pointerdown');
    vi.advanceTimersByTime(HOLD_MS);
    expect(onHold).not.toHaveBeenCalled();
    const event = new Event('contextmenu', { cancelable: true });
    el.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});
