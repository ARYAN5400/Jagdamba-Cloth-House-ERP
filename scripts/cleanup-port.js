import net from 'net';
import { execSync } from 'child_process';

function checkAndFreePort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[Startup] Port ${port} is occupied. Cleaning up stale process...`);
        try {
          if (process.platform === 'win32') {
            const stdout = execSync(`netstat -ano | findstr :${port}`).toString();
            const lines = stdout.trim().split('\n');
            for (const line of lines) {
              const parts = line.trim().split(/\s+/);
              const pid = parts[parts.length - 1];
              if (pid && pid !== '0' && pid !== process.pid.toString()) {
                try {
                  execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
                  console.log(`[Startup] Cleaned up stale PID ${pid} on port ${port}`);
                } catch (e) {}
              }
            }
          }
        } catch (e) {
          console.warn(`[Startup] Warning during port cleanup:`, e.message);
        }
      }
      resolve();
    });
    server.once('listening', () => {
      server.close(() => resolve());
    });
    server.listen(port, '127.0.0.1');
  });
}

checkAndFreePort(5173).then(() => {
  process.exit(0);
});
