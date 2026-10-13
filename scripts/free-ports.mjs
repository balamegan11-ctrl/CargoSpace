import { execSync } from 'node:child_process'
import process from 'node:process'

// Frees the dev ports so `npm run dev` can't fail with "Port 5173 is already
// in use" because of an orphaned Vite/backend left behind by a crashed run.
const ports = [Number(process.env.APP_PORT || 5173), Number(process.env.PORT || 5000)]
const isWindows = process.platform === 'win32'

function pidsListening(port) {
  try {
    if (isWindows) {
      // No `-p tcp`: that filter hides IPv6, and Vite binds [::1]:5173 by
      // default, so an IPv4-only query silently misses the dev server.
      const out = execSync('netstat -ano', { encoding: 'utf8' })
      return out
        .split(/\r?\n/)
        .map((line) => line.trim().split(/\s+/))
        .filter((cols) => cols.length >= 5 && cols[3] === 'LISTENING' && cols[1].endsWith(`:${port}`))
        .map((cols) => Number(cols[4]))
    }
    return execSync(`lsof -ti tcp:${port}`, { encoding: 'utf8' })
      .split(/\r?\n/)
      .filter(Boolean)
      .map(Number)
  } catch {
    return []
  }
}

let freed = 0
for (const port of ports) {
  for (const pid of new Set(pidsListening(port))) {
    if (!pid || pid === process.pid) continue
    try {
      execSync(isWindows ? `taskkill /PID ${pid} /F /T` : `kill -9 ${pid}`, { stdio: 'ignore' })
      console.log(`freed :${port} (killed PID ${pid})`)
      freed += 1
    } catch (err) {
      console.error(`could not kill PID ${pid} holding :${port} - ${err.message}`)
    }
  }
}

console.log(freed ? `${freed} process(es) stopped - ports are clear.` : 'Nothing to free - dev ports are already clear.')
