import { defineConfig } from '@vite-pwa/assets-generator/config';

// Run once with `npm run icons` to draw the PNG icons from public/icon.svg.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    transparent: {
      sizes: [192, 512],
      favicons: [[48, 'favicon.ico']],
    },
    maskable: { sizes: [512], resizeOptions: { background: '#6cc4fb' } },
    apple: { sizes: [180], resizeOptions: { background: '#6cc4fb' } },
  },
  images: ['public/icon.svg'],
});
