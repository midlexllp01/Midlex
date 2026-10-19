import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const email = process.argv[2] || 'developer@midlex.local';
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Pass a valid developer email');
const ids = ['legal-admin', 'legal-staff', 'finance', 'cbt', 'mip', 'hrms', 'analytics', 'media', 'realty', 'ai'];
const secret = () => randomBytes(36).toString('base64url');
async function merge(file, values) {
  let source = ''; try { source = await readFile(file, 'utf8'); } catch {}
  const existing = Object.fromEntries(source.split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^['"]|['"]$/g, '')]; }));
  const added = Object.entries(values).filter(([key]) => !existing[key]);
  // Append missing settings only; existing application configuration is preserved.
  if (added.length) await writeFile(file, source.replace(/\s*$/, '') + '\n\n# Midlex One Workspace\n' + added.map(([key, value]) => `${key}=${value}`).join('\n') + '\n');
  return { ...values, ...Object.fromEntries(Object.entries(existing).filter(([, v]) => v)) };
}
const values = { WORKSPACE_JWT_SECRET: secret(), WORKSPACE_DEVELOPER_EMAIL: email, WORKSPACE_DEVELOPER_NAME: 'Workspace Developer', WORKSPACE_DEVELOPER_PASSWORD: secret() };
for (const id of ids) values[`WORKSPACE_PROJECT_${id.replaceAll('-', '_').toUpperCase()}_SECRET`] = secret();
const backend = await merge(path.join(root, 'backend/.env'), values);
await merge(path.join(root, 'workspace/.env.local'), { WORKSPACE_API_URL: 'http://localhost:3001' });
const targets = [['admin', 'legal-admin'], ['lawyers', 'legal-staff'], ['payment management portal', 'finance'], ['cbt', 'cbt'], ['hrms', 'hrms'], ['mip', 'mip'], ['midlex-analytics', 'analytics'], ['midlex-media', 'media'], ['midlex-realty', 'realty'], ['../mip', 'mip'], ['../midlex-analytics', 'analytics'], ['../midlex-media', 'media'], ['../midlex-realty', 'realty'], ['../cbt/frontend', 'cbt'], ['../hrms/frontend', 'hrms'], ['../cbt/admin', 'cbt'], ['../hrms/admin', 'hrms'], ['../midlex-reality-admin', 'realty']];
for (const [folder, id] of targets) {
  const key = `WORKSPACE_PROJECT_${id.replaceAll('-', '_').toUpperCase()}_SECRET`;
  const config = await merge(path.join(root, folder, '.env.local'), { WORKSPACE_URL: 'http://localhost:3011', WORKSPACE_API_URL: 'http://localhost:3001', WORKSPACE_PROJECT_SECRET: backend[key] });
  if (config.WORKSPACE_PROJECT_SECRET !== backend[key]) throw new Error(`SSO secret mismatch in ${folder}; align it with ${key} on the backend`);
}
await merge(path.join(root, '../midlex-ai-main/server/.env'), { WORKSPACE_API_URL: 'http://localhost:3001', WORKSPACE_PROJECT_SECRET: backend.WORKSPACE_PROJECT_AI_SECRET });
await merge(path.join(root, '../midlex-ai-main/.env.local'), { VITE_WORKSPACE_URL: 'http://localhost:3011' });
await writeFile(path.join(root, 'workspace/.local-access.md'), `# Local developer workspace\n\nURL: http://localhost:3011\n\nEmail: ${backend.WORKSPACE_DEVELOPER_EMAIL}\n\nPassword: ${backend.WORKSPACE_DEVELOPER_PASSWORD}\n\nGenerated for local development. This file and the environment files are excluded from Git. Change the password from your workspace profile after signing in. The bootstrap settings create an owner only if that email does not already exist; they never reset an existing owner password.\n`);
console.log('Workspace configured. Local credentials: workspace/.local-access.md. Start the backend and workspace with npm run dev:workspace.');
