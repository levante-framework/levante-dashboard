import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import mkcert from 'vite-plugin-mkcert'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    mkcert() // Enable HTTPS with local certificates
  ],
  server: {
    https: {
      // The mkcert plugin will provide the certificates
    },
    proxy: {
      '/hs-levante-admin-dev': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false
      },
      // Firebase emulator proxies
      '/auth': {
        target: 'http://127.0.0.1:9199',
        changeOrigin: true,
        secure: false
      },
      '/firestore': {
        target: 'http://127.0.0.1:8180',
        changeOrigin: true,
        secure: false
      },
      '/functions': {
        target: 'http://127.0.0.1:5102',
        changeOrigin: true,
        secure: false
      },
      '/emulator': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
}) 