import { expect, test, type Page } from '@playwright/test';
import {
  appRoot,
  CODE,
  controls,
  digits,
  enterCode,
  holdToOpen,
  keypadOverlay,
  nextFrame,
  openControls,
  readSeconds,
  readyApp,
  setupScreen,
  timerScreen,
} from './helpers';

const WRONG_CODE = '1111';

/** A running 15-minute timer with nothing open over it. */
async function runningTimer(page: Page): Promise<void> {
  await readyApp(page);
  await page.getByTestId('preset-15').click();
  await expect(digits(page)).toHaveText('15:00');
}

async function expectLocked(page: Page): Promise<void> {
  await expect(appRoot(page)).toHaveAttribute('data-overlay', 'none');
  await expect(keypadOverlay(page)).toBeHidden();
  await expect(controls(page)).toBeHidden();
}

/** Clicks spread over the whole screen: corners, edges, the ring and the digits. */
async function tapAround(page: Page, taps: number, msBetween: number): Promise<void> {
  const box = await timerScreen(page).boundingBox();
  if (box === null) throw new Error('The timer screen is not showing.');
  const columns = 5;
  const rows = Math.ceil(taps / columns);
  for (let i = 0; i < taps; i += 1) {
    const x = box.x + (box.width * ((i % columns) + 0.5)) / columns;
    const y = box.y + (box.height * (Math.floor(i / columns) + 0.5)) / rows;
    await page.mouse.click(x, y);
    await page.clock.runFor(msBetween);
  }
}

test('taps do nothing to a running timer', async ({ page }) => {
  await runningTimer(page);
  await tapAround(page, 20, 100);
  await expectLocked(page);
  await expect(timerScreen(page)).toBeVisible();
  // 20 taps 100 ms apart: exactly 2 seconds have passed, and the timer kept running.
  await nextFrame(page);
  await expect(digits(page)).toHaveText('14:58');
  await page.clock.runFor(1000);
  await expect(digits(page)).toHaveText('14:57');
});

test('a short hold (1 second) opens nothing', async ({ page }) => {
  await runningTimer(page);
  const box = await timerScreen(page).boundingBox();
  if (box === null) throw new Error('The timer screen is not showing.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.clock.runFor(1000);
  await page.mouse.up();
  await page.clock.runFor(2000);
  await expectLocked(page);
});

test('hold opens a keypad with blank keys; the right code opens the controls', async ({
  page,
}) => {
  await runningTimer(page);
  await holdToOpen(page);
  await expect(keypadOverlay(page)).toBeVisible();
  for (let digit = 0; digit <= 9; digit += 1) {
    const key = keypadOverlay(page).getByTestId(`key-${digit}`);
    await expect(key).toBeVisible();
    await expect(key).toHaveText('');
  }
  await enterCode(page, CODE);
  await expect(controls(page)).toBeVisible();
  await expect(keypadOverlay(page)).toBeHidden();
  await expect(appRoot(page)).toHaveAttribute('data-overlay', 'controls');
});

test('pause freezes the digits; resume continues', async ({ page }) => {
  await runningTimer(page);
  await openControls(page);
  await page.getByTestId('control-pause').click();
  const frozen = (await digits(page).textContent()) ?? '';
  await page.clock.runFor(10_000);
  await expect(digits(page)).toHaveText(frozen);
  // Allow one more check (4 a second) for the controls to close by themselves.
  await page.clock.runFor(250);
  await expectLocked(page);
  await expect(digits(page)).toHaveText(frozen);

  await openControls(page);
  await expect(digits(page)).toHaveText(frozen);
  await page.getByTestId('control-pause').click();
  await expect(page.getByTestId('control-pause')).toHaveText('Pause');
  const resumedAt = await readSeconds(page);
  await page.clock.runFor(1000);
  await nextFrame(page);
  expect(await readSeconds(page)).toBe(resumedAt - 1);
});

test('+1 min and +5 min add exactly that', async ({ page }) => {
  await runningTimer(page);
  await openControls(page);
  const before = await readSeconds(page);
  await page.getByTestId('control-add-1').click();
  expect(await readSeconds(page)).toBe(before + 60);
  await page.getByTestId('control-add-5').click();
  expect(await readSeconds(page)).toBe(before + 60 + 300);
});

test('stop returns to the setup screen', async ({ page }) => {
  await runningTimer(page);
  await openControls(page);
  await page.getByTestId('control-stop').click();
  await expect(setupScreen(page)).toBeVisible();
  await expect(appRoot(page)).toHaveAttribute('data-screen', 'setup');
});

test('a wrong code closes the keypad; three in a row lock it for 30 seconds', async ({
  page,
}) => {
  await runningTimer(page);
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await holdToOpen(page);
    await expect(keypadOverlay(page)).toBeVisible();
    await enterCode(page, WRONG_CODE);
    await expectLocked(page);
  }
  await holdToOpen(page);
  await expectLocked(page);

  await page.clock.runFor(30_000);
  await holdToOpen(page);
  await expect(keypadOverlay(page)).toBeVisible();
});

test('the keypad and the controls close by themselves after 10 seconds untouched', async ({
  page,
}) => {
  await runningTimer(page);
  await holdToOpen(page);
  await page.clock.runFor(9_500);
  await expect(keypadOverlay(page)).toBeVisible();
  // The app checks four times a second, so allow one check past the 10 seconds.
  await page.clock.runFor(750);
  await expectLocked(page);

  await openControls(page);
  await page.clock.runFor(9_500);
  await expect(controls(page)).toBeVisible();
  await page.clock.runFor(750);
  await expectLocked(page);
});

test("time's up needs the code, which goes back to setup", async ({ page }) => {
  await readyApp(page);
  await page.getByTestId('preset-5').click();
  await page.clock.fastForward('05:00');
  await expect(digits(page)).toHaveText('00:00');
  await expect(page.getByTestId('times-up')).toBeVisible();

  await tapAround(page, 10, 100);
  await expectLocked(page);
  await expect(page.getByTestId('times-up')).toBeVisible();

  await holdToOpen(page);
  await enterCode(page, CODE);
  await expect(setupScreen(page)).toBeVisible();
});

test('keyboard: hold Space for the keypad, type the code, Escape closes', async ({ page }) => {
  await runningTimer(page);
  await page.keyboard.down('Space');
  await page.clock.runFor(2000);
  await page.keyboard.up('Space');
  await expect(keypadOverlay(page)).toBeVisible();

  await page.keyboard.type(CODE);
  await expect(controls(page)).toBeVisible();

  await page.keyboard.press('Escape');
  await expectLocked(page);
});
