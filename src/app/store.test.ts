import { describe, expect, it, vi } from 'vitest';
import { reduce } from './reducer';
import { DEFAULT_PERSISTED, initialState, type Action } from './state';
import { createStore } from './store';

const returning = initialState({
  settings: { ringDirection: 'empties', passcode: '2580' },
  timer: null,
});
const START: Action = { type: 'start', durationMs: 300_000 };

describe('createStore', () => {
  it('runs the reducer with the current time', () => {
    const store = createStore(returning, () => 5000);
    store.dispatch(START);
    expect(store.getState()).toEqual(reduce(returning, START, 5000));
    expect(store.getState().timer).not.toBeNull();
  });

  it('notifies listeners only when the state changed', () => {
    const store = createStore(returning, () => 0);
    const listener = vi.fn();
    store.subscribe(listener);
    store.dispatch({ type: 'close-overlay' });
    expect(listener).not.toHaveBeenCalled();
    store.dispatch(START);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(store.getState());
  });

  it('stops calling a listener after it unsubscribes', () => {
    const store = createStore(returning, () => 0);
    const kept = vi.fn();
    const dropped = vi.fn();
    store.subscribe(kept);
    const unsubscribe = store.subscribe(dropped);
    unsubscribe();
    store.dispatch({ type: 'set-direction', direction: 'fills' });
    expect(dropped).not.toHaveBeenCalled();
    expect(kept).toHaveBeenCalledTimes(1);
  });

  it('keeps the initial state when nothing changes', () => {
    const initial = initialState(DEFAULT_PERSISTED);
    const store = createStore(initial, () => 0);
    store.dispatch({ type: 'stop' });
    expect(store.getState()).toBe(initial);
  });
});
