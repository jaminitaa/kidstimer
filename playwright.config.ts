import { defineConfig, devices } from '@playwright/test';

// The journeys run against the dev server, which has no offline copy (service worker).
const DEV_PORT = 5173;
// offline.spec.ts needs the built app, served on its own port so it never clashes with `npm start`.
const OFFLINE_PORT = 4174;
const VIEWPORT = { width: 1280, height: 800 };
const OFFLINE_SPEC = /offline\.spec\.ts$/;

const devURL = `http://localhost:${DEV_PORT}`;
const offlineURL = `http://localhost:${OFFLINE_PORT}`;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    // A fixed zone, so "until 09:30" means the same thing on every machine.
    timezoneId: 'UTC',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: OFFLINE_SPEC,
      use: {
        ...devices['Desktop Chrome'],
        viewport: VIEWPORT,
        baseURL: devURL,
        // Headless Chrome refuses to keep the screen awake unless told it may; real ones allow it.
        permissions: ['screen-wake-lock'],
      },
    },
    {
      // Stands in for Safari on the iPhone, the iPad and the MacBook.
      name: 'webkit',
      testIgnore: OFFLINE_SPEC,
      use: { ...devices['Desktop Safari'], viewport: VIEWPORT, baseURL: devURL },
    },
    {
      name: 'offline-chromium',
      testMatch: OFFLINE_SPEC,
      use: { ...devices['Desktop Chrome'], viewport: VIEWPORT, baseURL: offlineURL },
    },
  ],
  // Both servers are always started fresh: a server already on the port may be serving another
  // copy of the code (or an older build), so a busy port fails the run instead of being reused.
  webServer: [
    {
      command: `npm run dev -- --port ${DEV_PORT} --strictPort`,
      url: devURL,
      reuseExistingServer: false,
    },
    {
      command: `npm run build && npm run preview -- --port ${OFFLINE_PORT} --strictPort`,
      url: offlineURL,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
