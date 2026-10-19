import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const projects = [
  ['admin', 'legal-admin', true], ['lawyers', 'legal-staff', true], ['payment management portal', 'finance', true],
  ['cbt', 'cbt', true], ['mip', 'mip', true], ['hrms', 'hrms', true],
  ['midlex-media', 'media', false], ['midlex-analytics', 'analytics', false], ['midlex-realty', 'realty', false],
  ['../mip', 'mip', true], ['../midlex-media', 'media', false], ['../midlex-analytics', 'analytics', false], ['../midlex-realty', 'realty', false],
  ['../cbt/frontend', 'cbt', true], ['../hrms/frontend', 'hrms', true],
  ['../cbt/admin', 'cbt', true, '/dashboard', true], ['../hrms/admin', 'hrms', true, '/', true], ['../midlex-reality-admin', 'realty', true, '/', true],
];
for (const [folder, id, privatePortal, entry = '', adminOnly = false] of projects) {
  const project = path.join(root, folder);
  await access(path.join(project, 'src/app'));
  for (const [template, destination] of [['config.ts', 'src/lib/workspace-sso.ts'], ['route.ts', 'src/app/api/sso/route.ts'], ['page.tsx', 'src/app/sso/page.tsx'], ['proxy.ts', 'src/proxy.ts']]) {
    const source = await readFile(path.join(root, `workspace/integrations/next/${template}.template`), 'utf8');
    const target = path.join(project, destination);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, source.replaceAll('__PROJECT__', id).replaceAll('__PRIVATE__', String(privatePortal)).replaceAll('__ENTRY__', entry).replaceAll('__ADMIN_ONLY__', String(adminOnly)));
  }
  await writeFile(path.join(project, '.env.workspace.example'), `# Server-only values. Merge into .env.local; never use NEXT_PUBLIC_ for secrets.\nWORKSPACE_URL=http://localhost:3011\nWORKSPACE_API_URL=http://localhost:3001\nWORKSPACE_PROJECT_SECRET=\n# Must match WORKSPACE_PROJECT_${id.replaceAll('-', '_').toUpperCase()}_SECRET on the central backend.\n`);
  console.log(`Connected ${folder} as ${id}`);
}
