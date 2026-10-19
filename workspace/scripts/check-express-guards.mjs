import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const require = createRequire(path.join(root, 'Midlex-LLP/backend/package.json'));
const ts = require('typescript');
async function fixture(project, access = 'USER', valid = true) {
  const data = { users: [{ id: 'local-me', email: 'me@example.com' }], staff: [{ id: 'local-me', email: 'me@example.com' }], submissions: [{ id: 'other-submission', userId: 'other' }] };
  const source = await readFile(path.join(root, project, 'backend/src/workspace.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  const scope = { exports, require: () => ({ getDb: () => data, saveDb: () => {} }), process: { env: {} }, AbortSignal, fetch: async () => ({ ok: valid, status: valid ? 200 : 401, json: async () => ({ access, user: { id: 'central-id', workspaceId: 'workspace-id', email: 'me@example.com', name: 'Me' } }) }) };
  vm.runInNewContext(compiled, scope);
  async function run(method, url, body = {}, authorization = 'Bearer scoped-token') {
    let status = 200; let output; let passed = false;
    const req = { path: url, method, headers: { authorization }, body };
    const res = { status(value) { status = value; return this; }, json(value) { output = value; return this; } };
    await exports.workspaceGuard(req, res, () => { passed = true; });
    return { status, get output() { return output; }, passed, req, res };
  }
  return { data, run };
}
test('separate API guards reject missing or revoked workspace sessions', async () => {
  for (const project of ['cbt', 'hrms']) {
    let f = await fixture(project); assert.equal((await f.run('GET', '/staff', {}, '')).status, 401);
    f = await fixture(project, 'USER', false); assert.equal((await f.run('GET', '/staff')).status, 401);
  }
});
test('staff cannot call operational admin endpoints or legacy authentication', async () => {
  for (const project of ['cbt', 'hrms']) {
    const f = await fixture(project);
    assert.equal((await f.run('POST', '/users')).status, 403);
    assert.equal((await f.run('POST', '/auth/login')).status, 403);
  }
});
test('CBT user submissions are bound to the signed-in identity and cannot self-grade', async () => {
  const f = await fixture('cbt');
  const result = await f.run('POST', '/submissions', { userId: 'victim', answers: { question: { scoreAwarded: 100, adminGradingNotes: 'forged', selectedOptionKey: 'A' } } });
  assert(result.passed); assert.equal(result.req.body.userId, 'local-me'); assert.equal(result.req.body.answers.question.scoreAwarded, undefined);
  assert.equal(result.req.body.answers.question.selectedOptionKey, 'A');
  assert.equal((await f.run('GET', '/submissions/other-submission')).status, 403);
});
test('CBT question responses omit answer keys for users and credential fields for everyone', async () => {
  for (const access of ['ADMIN', 'USER']) {
    const f = await fixture('cbt', access); const result = await f.run('GET', '/questions');
    result.res.json({ questions: [{ correctOptionKey: 'A', correctTheoryKeyword: 'secret', password: 'secret', questionText: 'Prompt' }] });
    assert.equal(result.output.questions[0].password, undefined);
    assert.equal(result.output.questions[0].correctOptionKey, access === 'ADMIN' ? 'A' : undefined);
  }
});
test('HR staff cannot read another profile and attendance writes use their actual identity', async () => {
  const f = await fixture('hrms');
  assert.equal((await f.run('GET', '/staff/victim')).status, 403);
  const result = await f.run('POST', '/attendance/clock-out', { staffId: 'victim', staffName: 'Victim' });
  assert(result.passed); assert.equal(result.req.body.staffId, 'local-me'); assert.equal(result.req.body.staffName, 'Me');
  const list = await f.run('GET', '/leaves'); list.res.json({ data: [{ staffId: 'local-me' }, { staffId: 'other' }] });
  assert.equal(list.output.data.length, 1);
});
test('newly onboarded workspace identities receive one operational profile on first access', async () => {
  for (const project of ['cbt', 'hrms']) {
    const f = await fixture(project); const directory = project === 'cbt' ? f.data.users : f.data.staff; directory.length = 0;
    await f.run('GET', project === 'cbt' ? '/exams' : '/staff');
    await f.run('GET', project === 'cbt' ? '/exams' : '/staff');
    assert.equal(directory.length, 1); assert.equal(directory[0].email, 'me@example.com');
  }
});
