import { expect, test } from '@playwright/test';
import {
  appRoot,
  CODE,
  codeScreen,
  digits,
  freshApp,
  keypadOverlay,
  MORNING,
  openControls,
  readyApp,
  screenKeptAwake,
  setCode,
  setupScreen,
  timerScreen,
  watchWakeLock,
} from './helpers';

test('reload mid-timer: same time, still locked, one tap brings sound back', async ({
  page,
}) => {
  await watchWakeLock(page);
  await readyApp(page);
  await page.getByTestId('preset-15').click();
  await page.clock.runFor(60_000);
  await page.reload();

  await expect(digits(page)).toHaveText('14:00');
  await expect(appRoot(page)).toHaveAttribute('data-overlay', 'none');
  const hint = page.getByTestId('sound-hint');
  await expect(hint).toBeVisible();

  const box = await timerScreen(page).boundingBox();
  if (box === null) throw new Error('The timer screen is not showing.');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(hint).toBeHidden();
  await page.clock.runFor(3000);
  await expect(appRoot(page)).toHaveAttribute('data-overlay', 'none');
  await expect(keypadOverlay(page)).toBeHidden();
  // Safari only keeps the screen awake for a page someone has touched, so the tap counts too.
  await expect.poll(() => screenKeptAwake(page)).toBe(true);
});

test("slept past the end: Time's up shows without the tune", async ({ page }) => {
  await readyApp(page);
  await page.getByTestId('preset-5').click();
  await page.clock.fastForward('10:00');
  await expect(page.getByTestId('times-up')).toBeVisible();
  await expect(digits(page)).toHaveText('00:00');
  await expect(page.locator('html')).not.toHaveAttribute('data-last-sound', 'tune');
});

test("reload at Time's up stays on Time's up", async ({ page }) => {
  await readyApp(page);
  await page.getByTestId('preset-5').click();
  await page.clock.fastForward('05:00');
  await expect(page.getByTestId('times-up')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('times-up')).toBeVisible();
  await expect(digits(page)).toHaveText('00:00');
  await expect(timerScreen(page)).toHaveAttribute('data-stage', 'done');
});

test('the code and the ring direction survive a reload', async ({ page }) => {
  await readyApp(page);
  await page.getByTestId('direction-fills').click();
  await expect(page.getByTestId('direction-fills')).toHaveAttribute('aria-pressed', 'true');
  await page.reload();

  await expect(setupScreen(page)).toBeVisible();
  await expect(page.getByTestId('direction-fills')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('direction-empties')).toHaveAttribute('aria-pressed', 'false');
  await page.getByTestId('preset-5').click();
  await openControls(page);
});

test('corrupt saved data starts fresh on the first-run code screen', async ({ page }) => {
  const pageErrors: Error[] = [];
  const warnings: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));
  page.on('console', (message) => {
    if (message.type() === 'warning') warnings.push(message.text());
  });
  await freshApp(page, MORNING);
  await setCode(page, CODE);
  await page.evaluate(() => localStorage.setItem('kidstimer.v1', '{oops'));
  await page.reload();

  await expect(codeScreen(page)).toBeVisible();
  await expect(codeScreen(page).getByTestId('code-title')).toHaveText('Choose a 4-digit code');
  await expect(codeScreen(page).getByTestId('code-error')).toHaveText('');
  await expect(page.locator('.startup-error')).toHaveCount(0);
  expect(pageErrors).toEqual([]);
  // Not silent: the console says why the device was started fresh.
  expect(warnings.some((text) => text.includes('not valid JSON'))).toBe(true);
});
