import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const children = [];
for (const [folder, script] of [['backend', 'start:dev'], ['workspace', 'dev']]) {
  const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', script], { cwd: path.join(root, folder), env: { ...process.env, ...(folder === 'backend' ? { MIDLEX_OFFLINE: 'true', MIDLEX_DATA_DIR: path.join(root, 'backend/data/workspace-preview') } : {}) }, stdio: 'inherit', shell: process.platform === 'win32', windowsHide: true });
  children.push(child);
  child.on('exit', code => { if (code) { for (const other of children) other.kill(); process.exitCode = code; } });
}
process.on('SIGINT', () => { for (const child of children) child.kill(); });
