import { expect, test, type Page } from '@playwright/test';
import {
  CODE,
  codeScreen,
  controls,
  digits,
  enterCode,
  freshApp,
  holdToOpen,
  keypadOverlay,
  MORNING,
  readyApp,
  startCustom,
} from './helpers';
import {
  expectBoxInsideRing,
  expectInViewport,
  expectNoScroll,
  LAPTOP,
  measure,
  overlaps,
  PHONE_LANDSCAPE,
  PHONE_PORTRAIT,
  sizeName,
  TABLET,
  TV,
  type Box,
  type Geometry,
  type Size,
} from './layoutHelpers';

type Target = { readonly name: string; readonly width: number; readonly height: number };
type Reading = { readonly text: string; readonly start: (page: Page) => Promise<void> };
type Part = { readonly name: string; readonly box: Box };
type CodeScreenLayout = {
  readonly viewport: Size;
  readonly page: Size;
  readonly screen: { readonly scrollHeight: number; readonly clientHeight: number };
  readonly parts: readonly Part[];
};

/** The smallest comfortable touch target, in CSS pixels. */
const MIN_TARGET_PX = 44;

/** Every key of the code screen's keypad: ten digits and delete. */
const KEY_IDS: readonly string[] = [...'0123456789'].map((digit) => `key-${digit}`).concat('key-delete');
/** The parts of the code screen that must always be fully on screen (Cancel only when shown). */
const CODE_PARTS: readonly string[] = ['code-title', 'dots', 'code-error', ...KEY_IDS];
/** Not the code each journey sets, so the change-code screen shows its error line. */
const WRONG_CODE = '1357';

/** The shortest and longest readings, and how each is reached from the setup screen. */
const READINGS: readonly Reading[] = [
  { text: '05:00', start: (page) => page.getByTestId('preset-5').click() },
  { text: '480:00', start: (page) => startCustom(page, '480') },
  { text: '1440:00', start: (page) => startCustom(page, '1440') },
];

/** Every corner of the digits' box lies within the inner edge of the ring's stroke. */
function expectDigitsInsideRing(g: Geometry): void {
  expectBoxInsideRing(g.digits, g, 'digits');
}

function expectLockLayout(g: Geometry): void {
  if (g.panel === null) throw new Error('No lock panel was measured.');
  expectNoScroll(g);
  expectInViewport(g.panel, g.viewport, 'lock panel');
  expectInViewport(g.digits, g.viewport, 'digits');
  expect(overlaps(g.digits, g.panel), 'the lock panel covers the digits').toBe(false);
  expectDigitsInsideRing(g);
}

/** Buttons and fields on a screen that are showing, with their size. */
function touchTargets(page: Page, screenTestId: string): Promise<readonly Target[]> {
  return page.evaluate((id) => {
    const screen = document.querySelector(`[data-testid="${id}"]`);
    if (screen === null) throw new Error(`No ${id} on the page.`);
    return [...screen.querySelectorAll<HTMLElement>('button, input')]
      .filter((el) => el.getClientRects().length > 0)
      .map((el) => {
        const { width, height } = el.getBoundingClientRect();
        return { name: el.dataset['testid'] ?? el.tagName, width, height };
      });
  }, screenTestId);
}

/** No sideways scrolling, for the page or inside the screen, and every target is big enough. */
async function expectComfortableScreen(page: Page, screenTestId: string): Promise<void> {
  const widths = await page.evaluate((id) => {
    const screen = document.querySelector(`[data-testid="${id}"]`);
    if (screen === null) throw new Error(`No ${id} on the page.`);
    const doc = document.documentElement;
    return {
      page: doc.scrollWidth,
      viewport: doc.clientWidth,
      content: screen.scrollWidth,
      screen: screen.clientWidth,
    };
  }, screenTestId);
  expect(widths.page, 'the page scrolls sideways').toBeLessThanOrEqual(widths.viewport);
  expect(widths.content, 'the screen scrolls sideways').toBeLessThanOrEqual(widths.screen);

  const targets = await touchTargets(page, screenTestId);
  expect(targets.length).toBeGreaterThan(0);
  const small = targets.filter((t) => t.width < MIN_TARGET_PX || t.height < MIN_TARGET_PX);
  expect(small, `targets under ${MIN_TARGET_PX} px`).toEqual([]);
}

/** Where the title, dots, error line, keys and Cancel (when shown) of the code screen are. */
function measureCodeScreen(page: Page): Promise<CodeScreenLayout> {
  return page.evaluate((ids) => {
    const screen = document.querySelector('[data-testid="code-screen"]');
    if (screen === null) throw new Error('No code-screen on the page.');
    const doc = document.documentElement;
    const selector = ids.map((id) => `[data-testid="${id}"]`).join(', ');
    const parts = [...screen.querySelectorAll<HTMLElement>(selector)]
      .filter((el) => el.getClientRects().length > 0)
      .map((el) => {
        const { left, top, right, bottom } = el.getBoundingClientRect();
        return { name: el.dataset['testid'] ?? el.tagName, box: { left, top, right, bottom } };
      });
    return {
      viewport: { width: doc.clientWidth, height: doc.clientHeight },
      page: { width: doc.scrollWidth, height: doc.scrollHeight },
      screen: { scrollHeight: screen.scrollHeight, clientHeight: screen.clientHeight },
      parts,
    };
  }, [...CODE_PARTS, 'code-cancel']);
}

/** Each expected part is showing and wholly on screen, nothing scrolls, and no key is small. */
async function expectWholeCodeScreen(page: Page, expected: readonly string[]): Promise<void> {
  const layout = await measureCodeScreen(page);
  expect(layout.parts.map((p) => p.name).sort(), 'parts showing').toEqual([...expected].sort());
  for (const part of layout.parts) expectInViewport(part.box, layout.viewport, part.name);
  expect(layout.page.height, 'the page scrolls').toBeLessThanOrEqual(layout.viewport.height);
  expect(layout.screen.scrollHeight, 'the screen cuts something off').toBeLessThanOrEqual(
    layout.screen.clientHeight,
  );
  const small = layout.parts
    .filter((p) => p.name.startsWith('key-'))
    .filter((p) => p.box.right - p.box.left < MIN_TARGET_PX || p.box.bottom - p.box.top < MIN_TARGET_PX)
    .map((p) => p.name);
  expect(small, `keys under ${MIN_TARGET_PX} px`).toEqual([]);
}

for (const viewport of [PHONE_PORTRAIT, PHONE_LANDSCAPE, TABLET, TV]) {
  test.describe(`timer screen at ${sizeName(viewport)}`, () => {
    test.use({ viewport });

    for (const reading of READINGS) {
      test(`${reading.text} fits inside the ring, with no scrolling`, async ({ page }) => {
        await readyApp(page);
        await reading.start(page);
        await expect(digits(page)).toHaveText(reading.text);
        const g = await measure(page, null);
        expectNoScroll(g);
        expectInViewport(g.ring, g.viewport, 'ring');
        expectInViewport(g.digits, g.viewport, 'digits');
        expectDigitsInsideRing(g);
      });
    }
  });
}

for (const viewport of [PHONE_PORTRAIT, PHONE_LANDSCAPE, TV]) {
  test.describe(`lock at ${sizeName(viewport)}`, () => {
    test.use({ viewport });

    test('the keypad and the controls leave the digits in full view', async ({ page }) => {
      await readyApp(page);
      await startCustom(page, '1440');
      await holdToOpen(page);
      await expect(keypadOverlay(page)).toBeVisible();
      expectLockLayout(await measure(page, 'keypad-overlay'));

      await enterCode(page, CODE);
      await expect(controls(page)).toBeVisible();
      expectLockLayout(await measure(page, 'controls'));
    });
  });
}

for (const viewport of [PHONE_PORTRAIT, PHONE_LANDSCAPE, TABLET, LAPTOP]) {
  test.describe(`code screen at ${sizeName(viewport)}`, () => {
    test.use({ viewport });

    test('first run: title, dots and every key fully on screen, nothing scrolls', async ({
      page,
    }) => {
      await freshApp(page, MORNING);
      await expect(codeScreen(page).getByTestId('code-title')).toHaveText('Choose a 4-digit code');
      await expectWholeCodeScreen(page, CODE_PARTS);
    });

    test('change code, with its message: every part and Cancel fully on screen', async ({
      page,
    }) => {
      await readyApp(page);
      await page.getByTestId('change-code').click();
      const screen = codeScreen(page);
      await expect(screen.getByTestId('code-title')).toHaveText('Enter your current code');
      for (const digit of WRONG_CODE) await screen.getByTestId(`key-${digit}`).click();
      await expect(screen.getByTestId('code-error')).toHaveText("That's not the current code.");
      await expectWholeCodeScreen(page, [...CODE_PARTS, 'code-cancel']);
    });
  });
}

for (const viewport of [PHONE_PORTRAIT, PHONE_LANDSCAPE, LAPTOP]) {
  test.describe(`setup and code screens at ${sizeName(viewport)}`, () => {
    test.use({ viewport });

    test('first-run code screen: no sideways scroll, big enough targets', async ({ page }) => {
      await freshApp(page, MORNING);
      await expect(page.getByTestId('code-screen')).toBeVisible();
      await expectComfortableScreen(page, 'code-screen');
    });

    test('setup screen: no sideways scroll, big enough targets', async ({ page }) => {
      await readyApp(page);
      await expectComfortableScreen(page, 'setup-screen');
    });
  });
}
