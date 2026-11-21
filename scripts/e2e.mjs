import { preview } from 'vite';
import { spawn } from 'node:child_process';

// Own the preview in this process: avoids shell/process-tree teardown on Windows.
const server = await preview({
  configFile: false,
  base: './',
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
});
const child = spawn(
  process.execPath,
  ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)],
  { stdio: 'inherit', shell: false },
);
const code = await new Promise((resolve) => {
  child.once('exit', (code) => resolve(code ?? 1));
  child.once('error', () => resolve(1));
});
server.httpServer.closeAllConnections();
await new Promise((resolve) => server.httpServer.close(resolve));
process.exitCode = code;
