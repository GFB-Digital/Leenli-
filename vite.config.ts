import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Farben für Manifest/Splash – entsprechen --bg aus src/styles/global.css
const PAPER = '#f7f3ea'

export default defineConfig({
  // Relative Pfade: läuft so in jedem Unterordner (z. B. GitHub Pages)
  // und später unverändert in der Capacitor-Hülle.
  base: './',
  plugins: [
    react(),
    VitePWA({
      // Neue Versionen nicht ungefragt laden (sonst ginge eine laufende
      // Lektion verloren) – die App zeigt stattdessen einen Hinweis.
      registerType: 'prompt',
      injectRegister: false, // Registrierung erfolgt in src/lib/pwa.ts
      includeManifestIcons: false, // Icons erfasst bereits globPatterns unten
      manifest: {
        id: './',
        name: 'Locus',
        short_name: 'Locus',
        description: 'Lernen in kurzen Abschnitten – mit eingebautem Speed-Reader.',
        lang: 'de',
        dir: 'ltr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: PAPER,
        theme_color: PAPER,
        categories: ['education', 'books'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Alles, was die App braucht, wird vorab gespeichert → komplett offline
        // (das Manifest fügt das Plugin selbst hinzu)
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // Bilder aus Kursen (z. B. Wikimedia) nach dem ersten Laden offline verfügbar
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'leenli-bilder',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      // Im Entwicklungsmodus (npm run dev) bleibt der Service Worker aus.
      // Offline-Test: npm run build und danach npm run preview.
      devOptions: { enabled: false },
    }),
  ],
})
