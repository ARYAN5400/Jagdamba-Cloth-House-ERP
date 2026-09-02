import { createServer } from 'vite';

process.stdin.resume();

try {
  const server = await createServer({
    configFile: './vite.config.js'
  });

  await server.listen();
  console.log(`[Vite Dev Server] Running at http://127.0.0.1:${server.config.server.port || 5173}/`);
} catch (err) {
  console.error('[Vite Dev Server Error]:', err);
  process.exit(1);
}
