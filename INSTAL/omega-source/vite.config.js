import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png'],
      manifest: {
        name: 'OMEGA - مطعم عصري',
        short_name: 'OMEGA',
        description: 'OMEGA - مطعم عصري للبرجر والبيتزا والتاكوس والمشروبات',
        theme_color: '#ff6b00',
        background_color: '#f8f9fa',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'ar',
        dir: 'rtl',
        start_url: '/',
        scope: '/',
        shortcuts: [
          {
            name: 'تطبيق العملاء',
            short_name: 'العملاء',
            description: 'فتح واجهة العملاء مباشرة',
            url: '/?launch=customer',
            icons: [{ src: '/logo.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'تطبيق الإدارة',
            short_name: 'الإدارة',
            description: 'فتح لوحة إدارة OMEGA مباشرة',
            url: '/admin?launch=admin',
            icons: [{ src: '/logo.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'تطبيق العمال',
            short_name: 'العمال',
            description: 'فتح واجهة العمال مباشرة',
            url: '/worker?launch=worker',
            icons: [{ src: '/logo.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
        icons: [
          {
            src: '/logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'firebase-images-cache', expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
})
