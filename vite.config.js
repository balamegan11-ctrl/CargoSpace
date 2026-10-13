import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { spawn } from 'node:child_process'

const API_PORT = Number(process.env.PORT || 5000)
const APP_PORT = Number(process.env.APP_PORT || 5173)

// Boots the Express API alongside Vite so `npm run dev` starts the whole stack.
// The API used to be a separate `npm start`, and forgetting it left the UI with
// no data and no explanation.
function backend() {
  let child = null
  const stop = () => {
    if (child && child.exitCode === null) child.kill()
  }
  return {
    name: 'cargospace-backend',
    apply: 'serve',
    configureServer(server) {
      const startBackend = () => {
        child = spawn(process.execPath, ['backend/server.js'], {
          cwd: process.cwd(),
          stdio: 'inherit',
          env: { ...process.env, PORT: String(API_PORT), APP_PORT: String(APP_PORT) },
        })
        child.on('error', (err) => server.config.logger.error(`backend failed to start: ${err.message}`))
      }

      // Boot the API only once the app port is actually ours. If 5173 is busy
      // Vite aborts, and an already-spawned API would linger holding :5000.
      if (server.httpServer) server.httpServer.once('listening', startBackend)
      else startBackend()

      server.httpServer?.once('close', stop)
      process.on('exit', stop)
      server.config.logger.info(
        `  CargoSpace app -> http://localhost:${APP_PORT}\n` +
          `  CargoSpace API -> http://localhost:${API_PORT}\n` +
          `  Port already busy? Run "npm run free-ports", then start again.`,
      )
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL || `http://localhost:${API_PORT}`

  return {
    plugins: [react(), tailwindcss(), backend()],
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
    },
    server: {
      port: APP_PORT,
      // Fail loudly instead of silently drifting to 5174/5175, which makes it
      // easy to end up staring at the wrong (or a stale) dev server.
      strictPort: true,
      open: true,
      proxy: {
        '/api': `http://localhost:${API_PORT}`,
      },
      watch: {
        usePolling: true,
        interval: 100,
      },
    },
  }
})

