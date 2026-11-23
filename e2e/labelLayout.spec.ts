import { expect, test, type Page } from '@playwright/test';
import {
  CODE,
  controls,
  digits,
  enterCode,
  holdToOpen,
  keypadOverlay,
  nextFrame,
  openControls,
  readyApp,
  setLabel,
  setupScreen,
  startCustom,
  timerLabel,
} from './helpers';
import {
  EPSILON,
  expectBoxInsideRing,
  expectInViewport,
  expectNoScroll,
  measure,
  overlaps,
  PHONE_LANDSCAPE,
  PHONE_PORTRAIT,
  sizeName,
  TABLET,
  TV,
  type Box,
  type Geometry,
} from './layoutHelpers';

type Reading = { readonly text: string; readonly start: (page: Page) => Promise<void> };

/** Four symbols, the most the line holds. */
const LABEL = '📺🛏️💤👟';
/** How far the digits' centre may sit from the ring's centre, in CSS pixels. */
const CENTRE_TOLERANCE_PX = 1;
const ONE_MINUTE_MS = 60_000;

/** The tallest and the widest readings, and how each is reached from the setup screen. */
const READINGS: readonly Reading[] = [
  { text: '05:00', start: (page) => page.getByTestId('preset-5').click() },
  { text: '1440:00', start: (page) => startCustom(page, '1440') },
];

const timesUp = (page: Page) => page.getByTestId('times-up');

function showing(box: Box | null, what: string): Box {
  if (box === null) throw new Error(`The ${what} is not showing.`);
  return box;
}

/** Starts `reading` from the setup screen, with `label` in the What for? box. */
async function startReading(page: Page, reading: Reading, label: string): Promise<void> {
  await setLabel(page, label);
  await reading.start(page);
  await expect(digits(page)).toHaveText(reading.text);
}

/** Opens the controls with the code and presses Stop: back on the setup screen. */
async function stopTimer(page: Page): Promise<void> {
  await openControls(page);
  await page.getByTestId('control-stop').click();
  await expect(setupScreen(page)).toBeVisible();
}

/** A 1-minute timer with `label`, run to the end. */
async function runToTimesUp(page: Page, label: string): Promise<void> {
  await setLabel(page, label);
  await startCustom(page, '1');
  await page.clock.runFor(ONE_MINUTE_MS);
  await nextFrame(page);
  await expect(timesUp(page)).toBeVisible();
}

/** The digits are centred in the ring and the same size as in `plain`, a run with no line. */
function expectDigitsUnmoved(g: Geometry, plain: Geometry): void {
  const { left, top, right, bottom } = g.digits;
  const off = Math.hypot((left + right) / 2 - g.center.x, (top + bottom) / 2 - g.center.y);
  expect(off, 'the digits are off centre').toBeLessThanOrEqual(CENTRE_TOLERANCE_PX);
  const width = (b: Box) => b.right - b.left;
  const height = (b: Box) => b.bottom - b.top;
  const grew = Math.abs(width(g.digits) - width(plain.digits));
  expect(grew, 'the digits changed width').toBeLessThanOrEqual(EPSILON);
  const rose = Math.abs(height(g.digits) - height(plain.digits));
  expect(rose, 'the digits changed height').toBeLessThanOrEqual(EPSILON);
}

/** The line is inside the ring, on screen, and not under the open lock panel. */
function expectLineClearOfPanel(g: Geometry): void {
  const panel = showing(g.panel, 'lock panel');
  const label = showing(g.label, 'emoji line');
  expectNoScroll(g);
  expectInViewport(label, g.viewport, 'emoji line');
  expectBoxInsideRing(label, g, 'emoji line');
  expect(overlaps(label, panel), 'the lock panel covers the emoji line').toBe(false);
}

for (const viewport of [PHONE_PORTRAIT, PHONE_LANDSCAPE, TABLET, TV]) {
  test.describe(`emoji line at ${sizeName(viewport)}`, () => {
    test.use({ viewport });

    for (const reading of READINGS) {
      test(`${reading.text}: four emojis fit under the digits, which stay put`, async ({
        page,
      }) => {
        await readyApp(page);
        await startReading(page, reading, '');
        const plain = await measure(page, null);
        await stopTimer(page);

        await startReading(page, reading, LABEL);
        await expect(timerLabel(page)).toHaveText(LABEL);
        const g = await measure(page, null);
        const label = showing(g.label, 'emoji line');
        expectNoScroll(g);
        expectBoxInsideRing(label, g, 'emoji line');
        expect(overlaps(label, g.digits), 'the emoji line overlaps the digits').toBe(false);
        expectDigitsUnmoved(g, plain);
      });
    }

    test("Time's up!: the line and Time's up! both fit, clear of the digits", async ({ page }) => {
      await readyApp(page);
      await runToTimesUp(page, LABEL);
      const g = await measure(page, null);
      const label = showing(g.label, 'emoji line');
      const done = showing(g.timesUp, "Time's up!");
      expectBoxInsideRing(label, g, 'emoji line');
      expectBoxInsideRing(done, g, "Time's up!");
      expect(overlaps(label, g.digits), 'the emoji line overlaps the digits').toBe(false);
      expect(overlaps(done, g.digits), "Time's up! overlaps the digits").toBe(false);
      expect(overlaps(label, done), "the emoji line overlaps Time's up!").toBe(false);
    });

    test("Time's up! with no line stays inside the ring", async ({ page }) => {
      await readyApp(page);
      await runToTimesUp(page, '');
      const g = await measure(page, null);
      expect(g.label, 'an empty line is showing').toBeNull();
      expectBoxInsideRing(showing(g.timesUp, "Time's up!"), g, "Time's up!");
    });
  });
}

for (const viewport of [PHONE_PORTRAIT, PHONE_LANDSCAPE, TV]) {
  test.describe(`emoji line under the lock at ${sizeName(viewport)}`, () => {
    test.use({ viewport });

    test('the keypad and the controls leave the line in full view', async ({ page }) => {
      await readyApp(page);
      await setLabel(page, LABEL);
      await startCustom(page, '1440');
      await expect(timerLabel(page)).toHaveText(LABEL);
      await holdToOpen(page);
      await expect(keypadOverlay(page)).toBeVisible();
      expectLineClearOfPanel(await measure(page, 'keypad-overlay'));

      await enterCode(page, CODE);
      await expect(controls(page)).toBeVisible();
      expectLineClearOfPanel(await measure(page, 'controls'));
    });
  });
}

/** A symbol far wider than an emoji, and a letter under a heavy stack of combining marks. */
const ODD_LABELS: readonly { readonly name: string; readonly text: string }[] = [
  { name: 'four very wide symbols', text: '﷽﷽﷽﷽' },
  { name: 'a letter with many stacked marks', text: `a${'̀'.repeat(30)}bcd` },
];

for (const viewport of [PHONE_PORTRAIT, PHONE_LANDSCAPE]) {
  test.describe(`odd symbols at ${sizeName(viewport)}`, () => {
    test.use({ viewport });

    for (const { name, text } of ODD_LABELS) {
      test(`${name} stay inside the ring and clear of the digits`, async ({ page }) => {
        await readyApp(page);
        await setLabel(page, text);
        await startCustom(page, '5');
        await expect(timerLabel(page)).toHaveText(text);
        const g = await measure(page, null);
        const label = showing(g.label, 'emoji line');
        expectNoScroll(g);
        expectBoxInsideRing(label, g, 'emoji line');
        expect(overlaps(label, g.digits), 'the emoji line overlaps the digits').toBe(false);
      });
    }
  });
}

for (const viewport of [PHONE_PORTRAIT, PHONE_LANDSCAPE]) {
  test.describe(`tallest stack under the lock at ${sizeName(viewport)}`, () => {
    test.use({ viewport });

    test("the keypad leaves the line and Time's up! in full view", async ({ page }) => {
      await readyApp(page);
      await runToTimesUp(page, LABEL);
      await holdToOpen(page);
      await expect(keypadOverlay(page)).toBeVisible();
      const g = await measure(page, 'keypad-overlay');
      const panel = showing(g.panel, 'keypad');
      expectNoScroll(g);
      for (const [box, what] of [
        [showing(g.label, 'emoji line'), 'emoji line'],
        [showing(g.timesUp, "Time's up!"), "Time's up!"],
      ] as const) {
        expectInViewport(box, g.viewport, what);
        expectBoxInsideRing(box, g, what);
        expect(overlaps(box, panel), `the keypad covers the ${what}`).toBe(false);
      }
    });
  });
}
