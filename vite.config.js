import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/plastic-jobwork/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      scope: '/plastic-jobwork/',
      includeAssets: ['apple-touch-icon.png'],
      workbox: {
        navigateFallback: '/plastic-jobwork/index.html',
        navigateFallbackAllowlist: [/^\/plastic-jobwork/],
      },
      manifest: {
        name: 'Plastic Job Work',
        short_name: 'Plastic',
        description: 'Plastic moulding job work — production, cost per piece, material reconciliation & molder hisab',
        theme_color: '#0f766e',
        background_color: '#f1f5f9',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/plastic-jobwork/',
        scope: '/plastic-jobwork/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})
