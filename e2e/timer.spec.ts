import { expect, test, type Page } from '@playwright/test';
import {
  CODE,
  codeScreen,
  digits,
  freshApp,
  MORNING,
  nextFrame,
  openControls,
  readyApp,
  setCode,
  setLabel,
  setupScreen,
  startCustom,
  timerLabel,
  timerScreen,
} from './helpers';

const lastSound = (page: Page) => page.locator('html');

/** The solid part of the ring, in SVG units: the first number of its dash pattern. */
async function arcLength(page: Page): Promise<number> {
  const dash = await page.getByTestId('ring-arc').getAttribute('stroke-dasharray');
  const solid = Number.parseFloat(dash ?? '');
  if (!Number.isFinite(solid)) throw new Error(`The ring has no dash pattern: "${dash}".`);
  return solid;
}

test('first run asks for a code, then shows the setup screen', async ({ page }) => {
  await freshApp(page, MORNING);
  await expect(codeScreen(page).getByTestId('code-title')).toHaveText('Choose a 4-digit code');
  await setCode(page, CODE);
  await expect(setupScreen(page)).toBeVisible();
});

test('a preset starts at once and counts down', async ({ page }) => {
  await readyApp(page);
  await page.getByTestId('preset-15').click();
  await expect(digits(page)).toHaveText('15:00');
  await expect(timerScreen(page)).toHaveAttribute('data-stage', 'calm');
  await page.clock.runFor(1000);
  await nextFrame(page);
  await expect(digits(page)).toHaveText('14:59');
});

test('dings at the marks, color stages, and the tune at zero', async ({ page }) => {
  await readyApp(page);
  await page.getByTestId('preset-15').click();

  await page.clock.fastForward('09:57');
  await expect(digits(page)).toHaveText('05:03');
  await page.clock.runFor(4000);
  await expect(lastSound(page)).toHaveAttribute('data-last-sound', 'ding-5');
  await expect(timerScreen(page)).toHaveAttribute('data-stage', 'warm');

  // Skips past 3:00 with a long jump, so the 3-minute ding is (correctly) not played.
  await page.clock.fastForward('03:56');
  await expect(digits(page)).toHaveText('01:03');
  await page.clock.runFor(4000);
  await expect(lastSound(page)).toHaveAttribute('data-last-sound', 'ding-1');
  await expect(timerScreen(page)).toHaveAttribute('data-stage', 'hot');

  await page.clock.fastForward('00:56');
  await expect(digits(page)).toHaveText('00:03');
  await page.clock.runFor(4000);
  await expect(lastSound(page)).toHaveAttribute('data-last-sound', 'tune');
  await expect(digits(page)).toHaveText('00:00');
  await expect(page.getByTestId('times-up')).toBeVisible();
});

test('no ding at the start of a 15-minute timer', async ({ page }) => {
  await readyApp(page);
  await page.getByTestId('preset-15').click();
  await page.clock.runFor(3000);
  await nextFrame(page);
  await expect(digits(page)).toHaveText('14:57');
  await expect(lastSound(page)).not.toHaveAttribute('data-last-sound');
});

test('custom minutes: 0 is refused, 90 starts', async ({ page }) => {
  await readyApp(page);
  await startCustom(page, '0');
  await expect(page.getByTestId('custom-error')).toHaveText('At least 1 minute.');
  await expect(setupScreen(page)).toBeVisible();
  await expect(timerScreen(page)).toBeHidden();

  await startCustom(page, '90');
  await expect(digits(page)).toHaveText('90:00');
});

test('until a time counts down to that clock time', async ({ page }) => {
  await readyApp(page, '2026-11-23T09:10:30Z');
  await page.getByTestId('until-time').fill('09:30');
  await page.getByTestId('until-start').click();
  await expect(digits(page)).toHaveText('19:30');
});

test('until a time less than a minute away: refused with a message', async ({ page }) => {
  await readyApp(page, '2026-11-23T09:29:20Z');
  await page.getByTestId('until-time').fill('09:30');
  await page.getByTestId('until-start').click();
  await expect(page.getByTestId('until-error')).toHaveText("That's less than a minute away.");
  await expect(setupScreen(page)).toBeVisible();
  await expect(timerScreen(page)).toBeHidden();
});

test('a long timer shows minutes only, never hours', async ({ page }) => {
  await readyApp(page, '2026-11-23T09:00:00Z');
  await page.getByTestId('until-time').fill('17:00');
  await page.getByTestId('until-start').click();
  await expect(digits(page)).toHaveText('480:00');
});

test('ring direction: "Fills up" grows, "Empties" shrinks', async ({ page }) => {
  await readyApp(page);

  await page.getByTestId('direction-fills').click();
  await page.getByTestId('preset-5').click();
  const fillsAtStart = await arcLength(page);
  await page.clock.runFor(60_000);
  expect(await arcLength(page)).toBeGreaterThan(fillsAtStart);

  await openControls(page);
  await page.getByTestId('control-stop').click();
  await page.getByTestId('direction-empties').click();
  await page.getByTestId('preset-5').click();
  const emptiesAtStart = await arcLength(page);
  await page.clock.runFor(60_000);
  expect(await arcLength(page)).toBeLessThan(emptiesAtStart);
});

test('a quick pick, then a preset: the timer shows the picked emojis', async ({ page }) => {
  await readyApp(page);
  await page.getByTestId('pick-shoes').click();
  await page.getByTestId('preset-5').click();
  await expect(digits(page)).toHaveText('05:00');
  await expect(timerLabel(page)).toBeVisible();
  await expect(timerLabel(page)).toHaveText('👟🚗');
});

test('typed emojis go with a custom-minutes timer', async ({ page }) => {
  await readyApp(page);
  await setLabel(page, '🛝');
  await startCustom(page, '15');
  await expect(digits(page)).toHaveText('15:00');
  await expect(timerLabel(page)).toHaveText('🛝');
});

test('typed emojis go with an until-a-time timer', async ({ page }) => {
  await readyApp(page, '2026-11-23T09:10:30Z');
  await setLabel(page, '📺');
  await page.getByTestId('until-time').fill('09:30');
  await page.getByTestId('until-start').click();
  await expect(digits(page)).toHaveText('19:30');
  await expect(timerLabel(page)).toHaveText('📺');
});

test('with no emojis chosen, the timer shows no line', async ({ page }) => {
  await readyApp(page);
  await page.getByTestId('preset-5').click();
  await expect(digits(page)).toHaveText('05:00');
  await expect(timerLabel(page)).toBeHidden();
});

test('more than 4 emojis: the box keeps the first 4, and so does the timer', async ({
  page,
}) => {
  await readyApp(page);
  await setLabel(page, '📺🛏️💤👟🚗🛝');
  await expect(page.getByTestId('label-input')).toHaveValue('📺🛏️💤👟');
  await page.getByTestId('preset-5').click();
  await expect(timerLabel(page)).toHaveText('📺🛏️💤👟');
});

test('tapping the emoji line on a running timer does nothing', async ({ page }) => {
  await readyApp(page);
  await setLabel(page, '🛏️💤');
  await page.getByTestId('preset-15').click();
  const box = await timerLabel(page).boundingBox();
  if (box === null) throw new Error('The emoji line is not showing.');
  for (let tap = 0; tap < 10; tap += 1) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.clock.runFor(100);
  }
  await expect(timerLabel(page)).toHaveText('🛏️💤');
  await nextFrame(page);
  // Ten taps 100 ms apart: exactly 1 second has passed, and the timer kept running.
  await expect(digits(page)).toHaveText('14:59');
  await expect(timerScreen(page)).toBeVisible();
  await expect(page.locator('#app')).toHaveAttribute('data-overlay', 'none');
  await expect(setupScreen(page)).toBeHidden();
});
