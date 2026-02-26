import { resolve } from 'path'
import { realpathSync } from 'fs'
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
    // Git worktrees symlink node_modules to the main repo — Vite resolves the
    // real path and blocks it as outside the project root. realpathSync follows
    // the symlink so the actual directory gets allow-listed.
    server: {
      fs: {
        allow: [resolve('.'), realpathSync(resolve('node_modules'))]
      }
    },
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
