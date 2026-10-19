import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
for (const id of ['cbt', 'hrms']) {
  const base = path.join(root, id, 'backend/src');
  const template = await fs.readFile(path.join(root, 'Midlex-LLP/workspace/integrations/express/guard.ts.template'), 'utf8');
  await fs.writeFile(path.join(base, 'workspace.ts'), template.replaceAll('__PROJECT__', id));
  const file = path.join(base, 'index.ts'); let source = await fs.readFile(file, 'utf8');
  if (!source.includes('workspaceGuard')) source = "import { workspaceGuard } from './workspace.js';\n" + source.replace("app.use('/api/auth', authRoutes);", "app.use('/api', workspaceGuard);\napp.use('/api/auth', authRoutes);");
  await fs.writeFile(file, source);
}
async function walk(folder) {
  for (const item of await fs.readdir(folder, { withFileTypes: true })) {
    const file = path.join(folder, item.name);
    if (item.isDirectory()) { if (!['sso', 'api'].includes(item.name)) await walk(file); continue; }
    if (!/\.tsx?$/.test(item.name) || item.name.startsWith('workspace-')) continue;
    let source = await fs.readFile(file, 'utf8');
    if (!/(?<![\w.])fetch\(/.test(source)) continue;
    source = source.replace(/(?<![\w.])fetch\(/g, 'workspaceFetch(');
    // Keep the client directive at the start of the module.
    const directive = /^(?:["']use client["'];?\s*)/;
    if (directive.test(source)) source = source.replace(directive, match => `${match}\nimport { workspaceFetch } from '@/lib/workspace-fetch';\n`);
    else source = "import { workspaceFetch } from '@/lib/workspace-fetch';\n" + source;
    await fs.writeFile(file, source);
  }
}
for (const [folder, api] of [['cbt/frontend', 'https://midlex-cbt.onrender.com'], ['cbt/admin', 'https://midlex-cbt.onrender.com'], ['hrms/frontend', 'https://midlex-hrms.onrender.com'], ['hrms/admin', 'https://midlex-hrms.onrender.com']]) {
  const target = path.join(root, folder, 'src');
  const template = await fs.readFile(path.join(root, 'Midlex-LLP/workspace/integrations/next/fetch.ts.template'), 'utf8');
  await fs.writeFile(path.join(target, 'lib/workspace-fetch.ts'), template.replaceAll('__API__', api));
  await walk(target);
}
for (const folder of ['midlex-reality', 'midlex-realty/backend']) {
  const file = path.join(root, folder, 'src/middleware/auth.ts'); let source = await fs.readFile(file, 'utf8');
  source = source.replace('export function requireAdmin(', 'export async function requireAdmin(');
  const start = source.indexOf('    const decoded = jwt.verify'); const end = source.indexOf('    if (decoded.role', start);
  if (start !== -1) source = source.slice(0, start) + `    const response = await fetch(\`\${process.env.WORKSPACE_API_URL || 'http://localhost:3001'}/workspace/introspect\`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: authHeader }, body: JSON.stringify({ project: 'realty' }), signal: AbortSignal.timeout(15000) });\n    if (!response.ok) return res.status(401).json({ message: 'Workspace access expired' });\n    const session = await response.json() as any;\n    const decoded = { ...session.user, role: session.access };\n` + source.slice(end);
  source = source.replace('import jwt from "jsonwebtoken";\n', '').replace(/const JWT_SECRET =[\s\S]*?;\n\n/, '').replace('  const token = authHeader.split(" ")[1];\n', '');
  await fs.writeFile(file, source);
}
