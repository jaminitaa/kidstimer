import { HOLD_MS } from '../core/constants';

/** How far (in CSS pixels) a held pointer may drift before it stops counting as a hold. */
export const HOLD_MOVE_TOLERANCE_PX = 20;

type Held = { readonly pointerId: number; readonly x: number; readonly y: number };

type HoldTracker = {
  readonly down: (event: PointerEvent) => void;
  readonly move: (event: PointerEvent) => void;
  readonly end: (event: PointerEvent) => void;
  /** Forgets every pointer and cancels a running hold. */
  readonly reset: () => void;
};

/** Tracks the pointers that are down and runs the hold timer for a single one. */
function createHoldTracker(onHold: () => void, holdMs: number): HoldTracker {
  const down = new Set<number>();
  let held: Held | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const cancel = (): void => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    held = null;
  };

  return {
    down(event) {
      if (event.button !== 0) return;
      down.add(event.pointerId);
      cancel();
      // A second finger, or a finger left over from one: no hold until all are lifted.
      if (down.size > 1) return;
      held = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      timer = setTimeout(() => {
        cancel();
        onHold();
      }, holdMs);
    },
    move(event) {
      if (held === null || event.pointerId !== held.pointerId) return;
      if (Math.hypot(event.clientX - held.x, event.clientY - held.y) > HOLD_MOVE_TOLERANCE_PX) {
        cancel();
      }
    },
    end(event) {
      down.delete(event.pointerId);
      if (held !== null && event.pointerId === held.pointerId) cancel();
    },
    reset() {
      cancel();
      down.clear();
    },
  };
}

/**
 * Calls onHold when a single primary pointer (finger, mouse or trackpad click) stays
 * down on el for holdMs. Lifting, leaving, moving far, or a second finger touching
 * down cancels it. The page being hidden or the window losing focus (a call, the app
 * switcher) cancels it and forgets every finger, since their lifts may never arrive.
 * Returns a function that removes every listener.
 */
export function attachHold(
  el: HTMLElement,
  onHold: () => void,
  holdMs: number = HOLD_MS,
): () => void {
  const hold = createHoldTracker(onHold, holdMs);
  const doc = el.ownerDocument;
  const win = doc.defaultView;
  const onVisibility = (): void => {
    if (doc.visibilityState === 'hidden') hold.reset();
  };
  const onContextMenu = (event: Event): void => event.preventDefault();

  el.addEventListener('pointerdown', hold.down);
  el.addEventListener('pointermove', hold.move);
  el.addEventListener('pointerup', hold.end);
  el.addEventListener('pointercancel', hold.end);
  el.addEventListener('pointerleave', hold.end);
  el.addEventListener('contextmenu', onContextMenu);
  doc.addEventListener('visibilitychange', onVisibility);
  win?.addEventListener('blur', hold.reset);

  return (): void => {
    hold.reset();
    el.removeEventListener('pointerdown', hold.down);
    el.removeEventListener('pointermove', hold.move);
    el.removeEventListener('pointerup', hold.end);
    el.removeEventListener('pointercancel', hold.end);
    el.removeEventListener('pointerleave', hold.end);
    el.removeEventListener('contextmenu', onContextMenu);
    doc.removeEventListener('visibilitychange', onVisibility);
    win?.removeEventListener('blur', hold.reset);
  };
}
