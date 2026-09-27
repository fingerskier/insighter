import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/insighter/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'Insighter — device sensor explorer',
        short_name: 'Insighter',
        description: 'Explore and visualize every device sensor and hardware-facing Web API your browser exposes.',
        theme_color: '#0b0a12',
        background_color: '#0b0a12',
        display: 'standalone',
        start_url: '.',
        icons: [
          { src: 'icons/insighter64.png', sizes: '64x64', type: 'image/png' },
          { src: 'icons/insighter128.png', sizes: '128x128', type: 'image/png' },
          { src: 'icons/insighter256.png', sizes: '256x256', type: 'image/png' },
          { src: 'icons/insighter512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
  },
})
