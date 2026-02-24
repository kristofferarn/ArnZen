import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import pkg from './package.json'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        external: ['node-pty']
      }
    }
  },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        'react': resolve('node_modules/react'),
        'react-dom': resolve('node_modules/react-dom')
      }
    },
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __IS_DEV__: JSON.stringify(process.env.NODE_ENV !== 'production')
    },
    plugins: [react(), tailwindcss()]
  }
})
