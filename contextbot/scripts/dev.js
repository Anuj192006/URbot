import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');
const isWindows = process.platform === 'win32';
const pythonPath = isWindows
  ? path.join(backendDir, '.venv', 'Scripts', 'python.exe')
  : path.join(backendDir, '.venv', 'bin', 'python');
const npmCommand = isWindows ? 'npm.cmd' : 'npm';

function ensureExists(targetPath, message) {
  if (!fs.existsSync(targetPath)) {
    console.error(message);
    process.exit(1);
  }
}

function spawnProcess(label, command, args, cwd) {
  console.log(`Starting ${label}...`);
  const child = spawn(command, args, {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });

  child.on('error', (error) => {
    console.error(`${label} failed to start: ${error.message}`);
  });

  return child;
}

ensureExists(
  pythonPath,
  'Missing backend virtual environment. Run "cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt" first.',
);
ensureExists(
  path.join(frontendDir, 'node_modules'),
  'Missing frontend dependencies. Run "cd frontend && npm install" first.',
);

const backend = spawnProcess(
  'backend',
  pythonPath,
  ['-m', 'uvicorn', 'app.main:app', '--reload', '--host', '0.0.0.0', '--port', '8000'],
  backendDir,
);
const frontend = spawnProcess(
  'frontend',
  npmCommand,
  ['run', 'dev', '--', '--host', '0.0.0.0', '--port', '5173'],
  frontendDir,
);

let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  backend.kill('SIGTERM');
  frontend.kill('SIGTERM');
  setTimeout(() => process.exit(exitCode), 150);
}

backend.on('exit', (code, signal) => {
  if (!shuttingDown) {
    console.error(
      `Backend stopped ${signal ? `with signal ${signal}` : `with code ${code ?? 0}`}.`,
    );
    shutdown(code ?? 1);
  }
});

frontend.on('exit', (code, signal) => {
  if (!shuttingDown) {
    console.error(
      `Frontend stopped ${signal ? `with signal ${signal}` : `with code ${code ?? 0}`}.`,
    );
    shutdown(code ?? 1);
  }
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
