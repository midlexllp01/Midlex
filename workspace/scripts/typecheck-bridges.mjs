import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(workspace, '.bridge-check');
const require = createRequire(path.join(workspace, 'package.json'));
for (const [project, entry, adminOnly] of [['mip', '', false], ['realty', '/', true], ['legal-admin', '', false]]) {
  for (const [source, destination] of [['config.ts', 'lib/workspace-sso.ts'], ['route.ts', 'app/api/sso/route.ts'], ['page.tsx', 'app/sso/page.tsx'], ['proxy.ts', 'proxy.ts']]) {
    const template = await readFile(path.join(workspace, `integrations/next/${source}.template`), 'utf8');
    const file = path.join(root, project, 'src', destination);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, template.replaceAll('__PROJECT__', project).replaceAll('__PRIVATE__', 'true').replaceAll('__ENTRY__', entry).replaceAll('__ADMIN_ONLY__', String(adminOnly)));
  }
}
await writeFile(path.join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true, noEmit: true, skipLibCheck: true, target: 'ES2017', module: 'esnext', moduleResolution: 'bundler', jsx: 'react-jsx', esModuleInterop: true, lib: ['dom', 'esnext'] }, include: ['**/*.ts', '**/*.tsx'] }));
const result = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', path.join(root, 'tsconfig.json')], { stdio: 'inherit', windowsHide: true });
process.exitCode = result.status ?? 1;
if (result.status === 0) console.log('All bridge templates pass strict TypeScript checks.');
