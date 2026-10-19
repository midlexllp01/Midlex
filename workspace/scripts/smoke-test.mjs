// Run against the isolated local preview only. Never use this script against a deployed service.
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const env = Object.fromEntries((await readFile(path.join(root, 'backend/.env'), 'utf8')).split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^['"]|['"]$/g, '')]; }));
const persisted = JSON.parse(await readFile(path.join(root, 'backend/data/workspace-preview/offline-db.json'), 'utf8'));
const localOwner = Object.values(persisted.workspaceUsers || {}).find(u => u.email === env.WORKSPACE_DEVELOPER_EMAIL);
assert(localOwner, 'Start the isolated local preview first');
const api = 'http://localhost:3001'; const hub = 'http://localhost:3011'; const mip = 'http://localhost:3005';
const results = [];
async function request(origin, route, method = 'GET', body, token, cookie) {
  const response = await fetch(origin + route, { method, redirect: 'manual', headers: { 'Content-Type': 'application/json', Origin: origin, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(60000) });
  const content = await response.text(); let data; try { data = JSON.parse(content); } catch { data = content; }
  return { response, data };
}
const signed = await request(api, '/workspace/login', 'POST', { email: env.WORKSPACE_DEVELOPER_EMAIL, password: env.WORKSPACE_DEVELOPER_PASSWORD });
assert.equal(signed.response.status, 201); assert.equal(signed.data.user.id, localOwner.id, 'Refusing to mutate anything except the isolated preview');
const owner = signed.data.token;
const webLogin = await request(hub, '/api/login', 'POST', { email: env.WORKSPACE_DEVELOPER_EMAIL, password: env.WORKSPACE_DEVELOPER_PASSWORD });
assert.equal(webLogin.response.status, 201); assert(!webLogin.data.token); assert.match(webLogin.response.headers.get('set-cookie'), /HttpOnly/i); results.push('Workspace server keeps the token in an HttpOnly cookie');
const csrf = await fetch(hub + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://unrelated.example' }, body: '{}' }); assert.equal(csrf.status, 403); results.push('Cross-origin writes rejected');
const password = randomBytes(24).toString('base64url'); const email = `workspace-qa-${Date.now()}@example.invalid`;
const created = await request(api, '/workspace/users', 'POST', { name: 'Workspace QA (temporary)', email, password, role: 'STAFF', grants: { mip: 'USER', 'legal-staff': 'USER' } }, owner);
assert.equal(created.response.status, 201); const id = created.data.id;
try {
  let login = await request(api, '/workspace/login', 'POST', { email, password }); let token = login.data.token;
  assert.equal((await request(api, '/workspace/launch/mip', 'POST', {}, token)).response.status, 403);
  const changed = await request(api, '/workspace/password', 'POST', { currentPassword: password, password: password + '-changed' }, token); assert.equal(changed.response.status, 201); token = changed.data.token; results.push('First sign-in requires replacement of the temporary password');
  assert.equal((await request(api, '/workspace/users', 'POST', {}, token)).response.status, 403); results.push('Staff cannot onboard users');
  assert.equal((await request(api, '/workspace/launch/finance', 'POST', {}, token)).response.status, 403); results.push('Unassigned projects are denied');
  const launched = await request(api, '/workspace/launch/mip', 'POST', {}, token); assert.equal(launched.response.status, 201);
  const code = new URLSearchParams(new URL(launched.data.url).hash.slice(1)).get('code');
  const redeem = await request(mip, '/api/sso', 'POST', { code }); assert.equal(redeem.response.status, 201, JSON.stringify(redeem.data));
  const cookie = redeem.response.headers.get('set-cookie').split(';')[0]; assert.equal(redeem.data.user.role, 'LAWYER'); assert.equal(redeem.data.path, '/dashboard');
  assert.equal((await request(mip, '/dashboard', 'GET', undefined, undefined, cookie)).response.status, 200);
  assert.equal((await request(mip, '/dashboard/admin', 'GET', undefined, undefined, cookie)).response.status, 403); results.push('Project handoff opens a user dashboard and blocks admin routes');
  assert.equal((await request(mip, '/api/sso', 'POST', { code })).response.status, 401); results.push('Replayed project links are rejected');
  assert.equal((await request(api, '/cases', 'GET', undefined, redeem.data.token)).response.status, 403); results.push('A project token cannot cross into another project API');
  const legalLink = await request(api, '/workspace/launch/legal-staff', 'POST', {}, token);
  const legalCode = new URLSearchParams(new URL(legalLink.data.url).hash.slice(1)).get('code');
  const legal = await fetch(api + '/workspace/redeem', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-project-secret': env.WORKSPACE_PROJECT_LEGAL_STAFF_SECRET }, body: JSON.stringify({ project: 'legal-staff', code: legalCode }) });
  const legalSession = await legal.json(); assert.equal(legal.status, 201);
  assert.equal((await request(api, '/users/profile', 'GET', undefined, legalSession.token)).response.status, 200); results.push('The existing legal API accepts a scoped legal project session');
  const updated = await request(api, `/workspace/users/${id}`, 'PATCH', { role: 'ADMIN', grants: { mip: 'ADMIN' } }, owner); assert.equal(updated.response.status, 200);
  const current = await request(api, '/workspace/me', 'GET', undefined, token); assert.equal(current.response.status, 200); assert.equal(current.data.user.role, 'ADMIN'); results.push('Project grants and workspace roles update without another sign-in');
  assert.equal((await request(api, '/workspace/users', 'POST', {}, token)).response.status, 403); results.push('Workspace admins still cannot onboard or grant access');
  assert.equal((await request(mip, '/dashboard', 'GET', undefined, undefined, cookie)).response.status, 307); results.push('Revoked project sessions are blocked on the next request');
  const adminLink = await request(api, '/workspace/launch/mip', 'POST', {}, token); const adminCode = new URLSearchParams(new URL(adminLink.data.url).hash.slice(1)).get('code');
  const adminSession = await request(mip, '/api/sso', 'POST', { code: adminCode }); assert.equal(adminSession.response.status, 201); assert.equal(adminSession.data.path, '/dashboard/admin');
  const adminCookie = adminSession.response.headers.get('set-cookie').split(';')[0];
  assert.equal((await request(mip, '/dashboard/admin', 'GET', undefined, undefined, adminCookie)).response.status, 200); results.push('Admin grants open the project admin dashboard without a password prompt');
  await request(api, '/workspace/logout', 'POST', {}, token);
  assert.equal((await request(mip, '/dashboard/admin', 'GET', undefined, undefined, adminCookie)).response.status, 307); results.push('Global workspace logout revokes project sessions');
  console.log(JSON.stringify({ passed: results.length, checks: results }, null, 2));
} finally {
  await request(api, `/workspace/users/${id}`, 'PATCH', { active: false, grants: {} }, owner);
  console.log('Temporary local QA account suspended. No external messages were sent.');
}
