export type WakeLockController = {
  /** Safe to call often: only a change from off to on (or back) does anything. */
  setActive(active: boolean): Promise<void>;
};

const INACTIVE: WakeLockController = { setActive: async () => undefined };

/**
 * A tap or a key press. Safari refuses the lock to a page nobody has touched yet (an app
 * reopened onto a running timer), so a refused request is asked again inside the next one.
 */
const GESTURE_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'keydown'] as const;
const REFUSED_MESSAGE =
  'Could not keep the screen awake; trying again on the next tap or when the page is next shown.';

/**
 * Asks the device to keep the screen on while wanted. The system lets go of the lock
 * whenever the page is hidden, so it is taken again each time the page comes back.
 * A refused request warns and is retried only on that return or on the next tap or key
 * press, never in a loop.
 */
export function createWakeLock(nav: Navigator, doc: Document): WakeLockController {
  if (!('wakeLock' in nav)) return INACTIVE;
  const { wakeLock } = nav;
  let wanted = false;
  let sentinel: WakeLockSentinel | null = null;
  let pending: Promise<void> | null = null;

  const letGo = async (lock: WakeLockSentinel): Promise<void> => {
    try {
      await lock.release();
    } catch (error) {
      console.warn('Could not release the screen wake lock.', error);
    }
  };

  const request = async (): Promise<void> => {
    try {
      const lock = await wakeLock.request('screen');
      if (wanted) sentinel = lock;
      else await letGo(lock); // Turned off while the request was on its way.
    } catch (error) {
      console.warn(REFUSED_MESSAGE, error);
    }
  };

  /** Callers clear `sentinel` first; a request already on its way is shared, not repeated. */
  const acquire = (): Promise<void> => {
    pending ??= request().finally(() => {
      pending = null;
    });
    return pending;
  };

  const release = async (): Promise<void> => {
    const lock = sentinel;
    sentinel = null;
    if (lock !== null) await letGo(lock);
  };

  doc.addEventListener('visibilitychange', () => {
    if (!wanted || doc.visibilityState !== 'visible') return;
    sentinel = null; // Already released by the system when the page was hidden.
    void acquire();
  });

  // Wanted but not held: the last request was refused (or is still on its way, and is then
  // shared). Asked synchronously, so the request is made while the browser counts the tap.
  const retryOnGesture = (): void => {
    if (wanted && sentinel === null) void acquire();
  };
  for (const type of GESTURE_EVENTS) {
    doc.addEventListener(type, retryOnGesture, { capture: true, passive: true });
  }

  return {
    async setActive(active) {
      if (active === wanted) return;
      wanted = active;
      await (active ? acquire() : release());
    },
  };
}
