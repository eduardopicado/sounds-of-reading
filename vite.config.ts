import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  /* relative, so the same build works from a domain root, a GitHub Pages
     project path or a folder on a USB stick */
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Sounds of Reading',
        short_name: 'Sounds',
        description: 'Seven small phonics games. No accounts, no tracking, works offline.',
        lang: 'en-AU',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#10403E',
        theme_color: '#10403E',
        categories: ['education', 'kids'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        /* everything the app is, including the fonts — it has to work in the
           car with no signal, and it never asks the network for anything else */
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  test: { include: ['tests/**/*.spec.ts'], environment: 'node' },
} as never);
