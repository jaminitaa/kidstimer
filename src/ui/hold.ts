import { HOLD_MS } from '../core/constants';

/** How far (in CSS pixels) a held pointer may drift before it stops counting as a hold. */
export const HOLD_MOVE_TOLERANCE_PX = 20;

type Held = { readonly pointerId: number; readonly x: number; readonly y: number };

/**
 * Calls onHold when a single primary pointer (finger, mouse or trackpad click) stays
 * down on el for holdMs. Lifting, leaving, moving far, or a second finger touching
 * down cancels it. Returns a function that removes every listener.
 */
export function attachHold(
  el: HTMLElement,
  onHold: () => void,
  holdMs: number = HOLD_MS,
): () => void {
  const down = new Set<number>();
  let held: Held | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const cancel = (): void => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    held = null;
  };

  const onDown = (event: PointerEvent): void => {
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
  };

  const onMove = (event: PointerEvent): void => {
    if (held === null || event.pointerId !== held.pointerId) return;
    if (Math.hypot(event.clientX - held.x, event.clientY - held.y) > HOLD_MOVE_TOLERANCE_PX) {
      cancel();
    }
  };

  const onEnd = (event: PointerEvent): void => {
    down.delete(event.pointerId);
    if (held !== null && event.pointerId === held.pointerId) cancel();
  };

  const onContextMenu = (event: Event): void => event.preventDefault();

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onEnd);
  el.addEventListener('pointercancel', onEnd);
  el.addEventListener('pointerleave', onEnd);
  el.addEventListener('contextmenu', onContextMenu);

  return (): void => {
    cancel();
    down.clear();
    el.removeEventListener('pointerdown', onDown);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', onEnd);
    el.removeEventListener('pointercancel', onEnd);
    el.removeEventListener('pointerleave', onEnd);
    el.removeEventListener('contextmenu', onContextMenu);
  };
}
