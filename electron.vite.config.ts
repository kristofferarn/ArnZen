import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

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
    plugins: [react(), tailwindcss()]
  }
})
