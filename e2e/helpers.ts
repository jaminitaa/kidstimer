import { expect, type Locator, type Page } from '@playwright/test';

/** The code every journey sets on first run. */
export const CODE = '2580';
/** Any date will do; journeys that care about the clock time pass their own. */
export const MORNING = '2026-11-23T09:00:00Z';

/** Hold time from the spec: pressing for 2 seconds opens the keypad. */
const HOLD_MS = 2000;
/**
 * The page loads with the fake clock running in real time (page.clock's advice), starting
 * this long before the requested time. Once the app is up, the clock is paused exactly at
 * the requested time, so every journey starts from a known moment.
 */
const LOAD_ALLOWANCE_MS = 15_000;
/** page.clock fires animation frames every 16 ms of fake time. */
const FRAME_MS = 16;

/** The keypad's key ids exist twice (code screen and lock overlay), so always scope them. */
export const codeScreen = (page: Page): Locator => page.getByTestId('code-screen');
export const keypadOverlay = (page: Page): Locator => page.getByTestId('keypad-overlay');
export const controls = (page: Page): Locator => page.getByTestId('controls');
export const digits = (page: Page): Locator => page.getByTestId('digits');
export const timerScreen = (page: Page): Locator => page.getByTestId('timer-screen');
export const setupScreen = (page: Page): Locator => page.getByTestId('setup-screen');
export const appRoot = (page: Page): Locator => page.locator('#app');

/** Opens the app with an empty device, the clock paused at `isoTime`. */
export async function freshApp(page: Page, isoTime: string): Promise<void> {
  const at = Date.parse(isoTime);
  await page.clock.install({ time: at - LOAD_ALLOWANCE_MS });
  await page.goto('/');
  await expect(appRoot(page)).toHaveAttribute('data-screen', /^(code|setup|timer)$/);
  await page.clock.pauseAt(at);
}

/**
 * The digits are redrawn every animation frame, so right after `clock.runFor` they can show
 * the frame drawn up to 16 ms earlier (a whole second behind, at a second boundary). Running
 * one more frame makes the screen show the moment just reached, as a real screen would.
 */
export async function nextFrame(page: Page): Promise<void> {
  await page.clock.runFor(FRAME_MS);
}

/** Clicks the keys for `code`, one digit at a time, inside one keypad. */
async function pressKeys(keypad: Locator, code: string): Promise<void> {
  for (const digit of code) {
    await keypad.getByTestId(`key-${digit}`).click();
  }
}

/** First run: choose the code, confirm it, and land on the setup screen. */
export async function setCode(page: Page, code: string): Promise<void> {
  const screen = codeScreen(page);
  await expect(screen.getByTestId('code-title')).toHaveText('Choose a 4-digit code');
  await pressKeys(screen, code);
  await expect(screen.getByTestId('code-title')).toHaveText('Enter it again');
  await pressKeys(screen, code);
  await expect(setupScreen(page)).toBeVisible();
}

/** A fresh device with the code set, on the setup screen. */
export async function readyApp(page: Page, isoTime: string = MORNING): Promise<void> {
  await freshApp(page, isoTime);
  await setCode(page, CODE);
}

/** Presses on the middle of the timer screen for the full 2 seconds, then lets go. */
export async function holdToOpen(page: Page): Promise<void> {
  const box = await timerScreen(page).boundingBox();
  if (box === null) throw new Error('The timer screen is not showing, so it cannot be held.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.clock.runFor(HOLD_MS);
  await page.mouse.up();
}

/** Types a code on the lock's keypad overlay. */
export async function enterCode(page: Page, code: string): Promise<void> {
  await pressKeys(keypadOverlay(page), code);
}

/** Hold, then the right code: the parent controls are open. */
export async function openControls(page: Page): Promise<void> {
  await holdToOpen(page);
  await expect(keypadOverlay(page)).toBeVisible();
  await enterCode(page, CODE);
  await expect(controls(page)).toBeVisible();
}

/** Starts a timer from the setup screen with the custom-minutes box. */
export async function startCustom(page: Page, minutes: string): Promise<void> {
  await page.getByTestId('custom-minutes').fill(minutes);
  await page.getByTestId('custom-start').click();
}

type WakeLockWatch = Window & { kidstimerWakeLocks?: WakeLockSentinel[] };

/**
 * Before the page loads (and on every reload), records each screen wake lock the app is
 * given, so a journey can ask whether the screen is being kept awake right now.
 *
 * The hook goes on WakeLock.prototype, not on navigator.wakeLock: WebKit may throw away
 * that object's script wrapper when nothing else holds it and hand the page a fresh one,
 * losing anything set on it. The prototype is always reachable, so the hook stays.
 */
export async function watchWakeLock(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (typeof WakeLock === 'undefined') return;
    const watch = window as WakeLockWatch;
    watch.kidstimerWakeLocks = [];
    const { request } = WakeLock.prototype;
    WakeLock.prototype.request = async function (this: WakeLock, type) {
      const sentinel = await request.call(this, type);
      watch.kidstimerWakeLocks = [...(watch.kidstimerWakeLocks ?? []), sentinel];
      return sentinel;
    };
  });
}

/** True while the app holds a screen wake lock (needs watchWakeLock first). */
export function screenKeptAwake(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const held = (window as WakeLockWatch).kidstimerWakeLocks ?? [];
    return held.some((sentinel) => !sentinel.released);
  });
}

/** "mm:ss" to whole seconds, for comparing readings. */
function toSeconds(text: string): number {
  const match = /^(\d+):(\d{2})$/.exec(text);
  if (match === null) throw new Error(`"${text}" is not a minutes:seconds reading.`);
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Reads the digits now showing as whole seconds. */
export async function readSeconds(page: Page): Promise<number> {
  return toSeconds((await digits(page).textContent()) ?? '');
}
