import type { AppState } from '../app/state';

/** A screen or overlay: its root element, redrawn from the state at a given moment. */
export type View = { readonly el: HTMLElement; update(state: AppState, now: number): void };
