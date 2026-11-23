import { reduce } from './reducer';
import type { Action, AppState } from './state';

export type Store = {
  getState(): AppState;
  dispatch(action: Action): void;
  subscribe(listener: (state: AppState) => void): () => void;
};

type Listener = (state: AppState) => void;

export function createStore(initial: AppState, now: () => number): Store {
  let state = initial;
  let listeners: readonly Listener[] = [];
  return {
    getState: () => state,
    dispatch(action) {
      const next = reduce(state, action, now());
      if (next === state) return;
      state = next;
      listeners.forEach((listener) => listener(next));
    },
    subscribe(listener) {
      listeners = [...listeners, listener];
      return () => {
        listeners = listeners.filter((l) => l !== listener);
      };
    },
  };
}
