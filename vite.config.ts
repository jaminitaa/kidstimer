import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

// Same as STAGE_COLORS.calm.bg in src/ui/theme.ts (the config cannot import app code).
const CALM_BACKGROUND = '#6cc4fb';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'KIDSTIMER_');
  const domain = env['KIDSTIMER_NGROK_DOMAIN']?.trim();

  return {
    preview: {
      // Vite refuses unknown host names by default; the ngrok address must be allowed.
      allowedHosts: domain ? [domain] : [],
    },
    plugins: [
      VitePWA({
        registerType: 'autoUpdate',
        // The service worker is for the built app only, so `npm run dev` is unaffected.
        devOptions: { enabled: false },
        includeAssets: ['icon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
          navigateFallback: 'index.html',
        },
        manifest: {
          name: 'Kids Timer',
          short_name: 'Timer',
          start_url: '/',
          display: 'fullscreen',
          orientation: 'any',
          background_color: CALM_BACKGROUND,
          theme_color: CALM_BACKGROUND,
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
      }),
    ],
    test: {
      include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.ts'],
        exclude: ['src/main.ts', '**/*.test.ts'],
        thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
      },
    },
  };
});
