import { expect, test, type Page } from '@playwright/test';
import { CODE, digits, readSeconds, setCode } from './helpers';

// Runs against the built app (`vite preview`), the only version with an offline copy.
// Real time, not page.clock: the service worker runs outside the page and its clock.

/** Resolves once the page's service worker has finished installing and is in charge. */
async function waitForOfflineCopy(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    const worker = registration.active;
    if (worker === null || worker.state === 'activated') return;
    await new Promise<void>((resolve) => {
      worker.addEventListener('statechange', () => {
        if (worker.state === 'activated') resolve();
      });
    });
  });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
}

test('opened once, it then works with no network', async ({ page, context }) => {
  await page.goto('/');
  await waitForOfflineCopy(page);

  await context.setOffline(true);
  const response = await page.reload();
  expect(response?.fromServiceWorker(), 'the page came from the offline copy').toBe(true);
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);

  await setCode(page, CODE);
  await page.getByTestId('preset-5').click();
  // Real seconds pass here: on a slow machine the first reading may already be past 05:00.
  await expect(digits(page)).toHaveText(/^(05:00|04:5\d)$/);
  const first = await readSeconds(page);
  // And the digits must keep going down.
  await expect.poll(() => readSeconds(page)).toBeLessThan(first);
});
