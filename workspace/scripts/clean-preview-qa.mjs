import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
let running = false;
try { running = (await fetch('http://localhost:3001/health', { signal: AbortSignal.timeout(1000) })).ok; } catch {}
if (running) throw new Error('Stop the isolated preview backend before cleaning QA fixtures');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = path.join(root, 'backend/data/workspace-preview/offline-db.json');
const database = JSON.parse(await readFile(file, 'utf8'));
const isQa = email => typeof email === 'string' && /^workspace-qa-\d+@example\.invalid$/.test(email);
const ids = new Set(Object.values(database.workspaceUsers || {}).filter(row => isQa(row.email)).map(row => row.id));
for (const [id, row] of Object.entries(database.workspaceUsers || {})) if (ids.has(id)) delete database.workspaceUsers[id];
for (const [id, row] of Object.entries(database.users || {})) if (isQa(row.email)) delete database.users[id];
for (const [id, row] of Object.entries(database.workspaceCodes || {})) if (ids.has(row.userId)) delete database.workspaceCodes[id];
for (const [id, row] of Object.entries(database.workspaceAudit || {})) if (ids.has(row.actorId) || ids.has(row.target)) delete database.workspaceAudit[id];
await writeFile(file, JSON.stringify(database, null, 2));
console.log(`Removed ${ids.size} temporary QA identities from the isolated local preview.`);
