// `npm run share`: builds the app, serves it, and opens an ngrok tunnel to it.
import { spawn, spawnSync } from 'node:child_process';
import { accessSync, constants, existsSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { readShareConfig } from './shareConfig.mjs';

const ENV_FILE = '.env.local';
const VITE = join('node_modules', '.bin', 'vite');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function onPath(command) {
  return (process.env.PATH ?? '').split(delimiter).some((dir) => {
    try {
      accessSync(join(dir, command), constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });
}

if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

const config = readShareConfig(process.env);
if (!config.ok) fail(config.message);

if (!onPath('ngrok')) fail('ngrok is not installed. Install it with: brew install ngrok');

const build = spawnSync(VITE, ['build'], { stdio: 'inherit' });
if (build.status !== 0) fail('The build failed, so nothing was shared.');

// The preview server allows only this host name, so give it the cleaned one ngrok will use.
const previewEnv = { ...process.env, KIDSTIMER_NGROK_DOMAIN: config.domain };

const children = [
  spawn(VITE, ['preview', '--port', String(config.port), '--strictPort'], {
    stdio: 'inherit',
    env: previewEnv,
  }),
  spawn('ngrok', ['http', String(config.port), `--url=${config.domain}`], { stdio: 'inherit' }),
];

let stopping = false;
function stopAll(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exit(code);
}

for (const child of children) {
  child.on('error', (error) => {
    console.error('Could not start a helper program.', error);
    stopAll(1);
  });
  child.on('exit', (code) => {
    if (!stopping) console.error('A helper program stopped, so sharing has ended.');
    stopAll(code ?? 1);
  });
}
process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));

console.log(`\nOpen this address on the iPhone or iPad: https://${config.domain}\n`);
