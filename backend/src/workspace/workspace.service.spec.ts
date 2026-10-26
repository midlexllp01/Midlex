import { WorkspaceService } from './workspace.service';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';

function memory() {
  const rows: Record<string, Map<string, any>> = {};
  const model = (name: string) => {
    const records = rows[name] = new Map();
    return {
      create: async ({ data }: any) => { const row = { id: randomUUID(), createdAt: new Date(), ...data }; records.set(row.id, row); return { ...row }; },
      findUnique: async ({ where }: any) => { const row = [...records.values()].find(r => Object.entries(where).every(([k, v]) => r[k] === v)); return row ? { ...row } : null; },
      findMany: async () => [...records.values()].map(r => ({ ...r })),
      update: async ({ where, data }: any) => { const row = { ...records.get(where.id), ...data }; records.set(row.id, row); return { ...row }; },
    };
  };
  const db: any = { workspaceUser: model('users'), workspaceCode: model('codes'), workspaceAudit: model('audit'), user: model('legacy') };
  db.mutateWorkspaceUser = async (id: string, change: (current: any) => any) => { const current = rows.users.get(id); const updated = { ...current, ...change(current) }; rows.users.set(id, updated); return { ...updated }; };
  db.consumeWorkspaceCode = async (id: string) => { const row = rows.codes.get(id); if (!row || row.usedAt) return null; row.usedAt = new Date(); return { ...row }; };
  return { db, rows };
}

describe('Workspace access and project SSO', () => {
  let service: WorkspaceService; let store: ReturnType<typeof memory>; let owner: any; let member: any;
  beforeEach(async () => {
    process.env.WORKSPACE_JWT_SECRET = 'test-only-secret-with-at-least-32-characters';
    process.env.WORKSPACE_PROJECT_CBT_SECRET = 'test-cbt-server-secret';
    process.env.WORKSPACE_PROJECT_MIP_SECRET = 'test-mip-server-secret';
    store = memory(); service = new WorkspaceService(store.db);
    owner = await store.db.workspaceUser.create({ data: { name: 'Owner', email: 'owner@example.com', role: 'DEVELOPER', active: true, password: await bcrypt.hash('owner-password-123', 4), version: 1, grants: {}, mustChangePassword: false } });
    member = await store.db.workspaceUser.create({ data: { name: 'Staff', email: 'staff@example.com', role: 'STAFF', active: true, password: await bcrypt.hash('staff-password-123', 4), version: 1, grants: { cbt: 'USER' }, mustChangePassword: false } });
  });
  async function launch() { const result = await service.launch(member, 'cbt'); return new URLSearchParams(new URL(result.url).hash.slice(1)).get('code')!; }
  it('only sends a one-use code to the project and uses the deployed CBT URL', async () => {
    const result = await service.launch(member, 'cbt');
    const url = new URL(result.url);
    expect(url.origin).toBe('https://cbt.midlex.xyz');
    expect(url.hash).toMatch(/^#code=[A-Za-z0-9_-]+$/);
    expect(url.hash).not.toContain('sso=');
    const code = [...store.rows.codes.values()][0];
    expect(new Date(code.expiresAt).getTime() - Date.now()).toBeGreaterThan(170000);
  });
  it('lets developers and dual-granted staff choose a project profile without escalating single grants', async () => {
    expect((await service.overview(owner)).projects.find(p => p.id === 'cbt')?.access).toBe('BOTH');
    await service.update(owner, member.id, { grants: { cbt: 'BOTH' } });
    const dualGranted = await store.db.workspaceUser.findUnique({ where: { id: member.id } });
    for (const actor of [owner, dualGranted]) {
      for (const profile of ['USER', 'ADMIN'] as const) {
        const link = await service.launch(actor, 'cbt', profile);
        expect(new URL(link.url).origin).toBe(profile === 'ADMIN' ? 'https://admin.cbt.midlex.xyz' : 'https://cbt.midlex.xyz');
        const code = new URLSearchParams(new URL(link.url).hash.slice(1)).get('code')!;
        const session = await service.redeem('cbt', code, 'test-cbt-server-secret');
        expect(session.access).toBe(profile);
        expect((await service.inspect(session.token, 'cbt')).access).toBe(profile);
      }
    }
    const userOnly = await service.update(owner, member.id, { grants: { cbt: 'USER' } });
    await expect(service.launch(userOnly, 'cbt', 'ADMIN')).rejects.toThrow('profile');
  });
  it('keeps the separate legal admin and lawyer handoffs on their matching portals', async () => {
    await expect(service.launch(owner, 'legal-admin', 'USER')).rejects.toThrow('Counsel Workspace');
    const admin = await service.launch(owner, 'legal-admin', 'ADMIN');
    const lawyer = await service.launch(owner, 'legal-staff', 'USER');
    const counselAdmin = await service.launch(owner, 'legal-staff', 'ADMIN');
    expect(new URL(admin.url).origin).toBe('https://legal-admin.midlex.xyz');
    expect(new URL(lawyer.url).origin).toBe('https://lawyer.midlex.xyz');
    expect(new URL(counselAdmin.url).origin).toBe('https://lawyer.midlex.xyz');
    await expect(service.update(owner, member.id, { grants: { 'legal-admin': 'BOTH' } })).rejects.toThrow('Legal Management grants admin access');
  });
  it('returns only an approved workspace origin after project handoff', async () => {
    const approved = await service.launch(member, 'cbt', 'USER', 'https://staff.midlex.xyz');
    const approvedCode = new URLSearchParams(new URL(approved.url).hash.slice(1)).get('code')!;
    expect((await service.redeem('cbt', approvedCode, 'test-cbt-server-secret')).workspaceUrl).toBe('https://staff.midlex.xyz');
    const rejected = await service.launch(member, 'cbt', 'USER', 'https://other.example');
    const rejectedCode = new URLSearchParams(new URL(rejected.url).hash.slice(1)).get('code')!;
    expect((await service.redeem('cbt', rejectedCode, 'test-cbt-server-secret')).workspaceUrl).toBe('https://developer.midlex.xyz');
  });
  it('rejects login for an account that was never provisioned', async () => {
    await expect(service.login('unknown@example.com', 'any-password', 'test')).rejects.toThrow('Invalid email or password');
  });
  it('does not grant admins implicit project access or onboarding authority', async () => {
    const admin = { ...member, role: 'ADMIN', grants: {} };
    expect((await service.overview(admin)).projects).toHaveLength(0);
    await expect(service.onboard(admin, {})).rejects.toThrow('Only the developer');
    await expect(service.update(admin, member.id, { grants: { cbt: 'ADMIN' } })).rejects.toThrow('Only the developer');
    await expect(service.launch(admin, 'cbt')).rejects.toThrow('do not have access');
  });
  it('onboards accounts with hashed passwords, denies self-selected developer roles, and rejects unknown grants', async () => {
    await expect(service.onboard(owner, { name: 'Someone', email: 'new@example.com', password: 'temporary-secret-123', role: 'DEVELOPER' })).rejects.toThrow();
    await expect(service.onboard(owner, { name: 'Someone', email: 'new@example.com', password: 'temporary-secret-123', role: 'ADMIN', grants: { nonexistent: 'ADMIN' } })).rejects.toThrow();
    const created = await service.onboard(owner, { name: 'Someone', email: 'NEW@example.com', password: 'temporary-secret-123', role: 'ADMIN', grants: {} });
    expect(created).not.toHaveProperty('password'); expect(created.email).toBe('new@example.com'); expect(created.mustChangePassword).toBe(true);
    const saved = await store.db.workspaceUser.findUnique({ where: { id: created.id } }); expect(saved.password).not.toBe('temporary-secret-123');
    await expect(service.launch(saved, 'cbt')).rejects.toThrow();
  });
  it('requires a valid password and rejects a suspended account', async () => {
    await expect(service.login(member.email, 'wrong', 'test')).rejects.toThrow('Invalid email');
    await service.update(owner, member.id, { active: false });
    await expect(service.login(member.email, 'staff-password-123', 'test')).rejects.toThrow('Invalid email');
  });
  it('locks repeated failed sign-ins', async () => {
    for (let i = 0; i < 10; i++) await expect(service.login('unknown@example.com', 'bad', 'attacker')).rejects.toThrow('Invalid email');
    await expect(service.login(member.email, 'staff-password-123', 'attacker')).rejects.toThrow('Too many attempts');
  });
  it('exchanges a handoff only for its intended project and only once, including concurrent requests', async () => {
    const code = await launch();
    await expect(service.redeem('cbt', code, 'incorrect')).rejects.toThrow('Invalid project');
    await expect(service.redeem('mip', code, 'test-mip-server-secret')).rejects.toThrow('expired');
    const results = await Promise.allSettled([service.redeem('cbt', code, 'test-cbt-server-secret'), service.redeem('cbt', code, 'test-cbt-server-secret')]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    const result = results.find(r => r.status === 'fulfilled') as PromiseFulfilledResult<any>;
    expect(result.value.access).toBe('USER'); expect(result.value.path).toBe('/dashboard');
    expect((await service.inspect(result.value.token, 'cbt')).user.id).toBe(result.value.user.id);
    await expect(service.inspect(result.value.token, 'mip')).rejects.toThrow('another project');
  });
  it('rejects expired handoffs and links issued before revocation', async () => {
    const expired = await launch(); for (const row of store.rows.codes.values()) row.expiresAt = new Date(0);
    await expect(service.redeem('cbt', expired, 'test-cbt-server-secret')).rejects.toThrow('expired');
    const code = await launch(); await service.update(owner, member.id, { grants: {} });
    await expect(service.redeem('cbt', code, 'test-cbt-server-secret')).rejects.toThrow('revoked');
  });
  it('keeps the workspace signed in while revoking project sessions when permissions change', async () => {
    const login = await service.login(member.email, 'staff-password-123', 'staff');
    const session = await service.redeem('cbt', await launch(), 'test-cbt-server-secret');
    await service.update(owner, member.id, { grants: { cbt: 'ADMIN' } });
    expect((await service.session(login.token)).grants.cbt).toBe('ADMIN');
    await expect(service.inspect(session.token)).rejects.toThrow('revoked');
  });
  it('does not allow workspace tokens to be used as project sessions or vice versa', async () => {
    const login = await service.login(member.email, 'staff-password-123', 'staff');
    const session = await service.redeem('cbt', await launch(), 'test-cbt-server-secret');
    await expect(service.inspect(login.token)).rejects.toThrow('Invalid session type');
    await expect(service.session(session.token)).rejects.toThrow('Invalid session type');
  });
  it('maps finance admin and user grants to distinct operational roles', async () => {
    process.env.WORKSPACE_PROJECT_FINANCE_SECRET = 'finance-server-secret';
    for (const [access, expected] of [['ADMIN', 'ADMIN'], ['USER', 'ACCOUNTANT']]) {
      const updated = await service.update(owner, member.id, { grants: { finance: access } });
      const current = await store.db.workspaceUser.findUnique({ where: { id: updated.id } });
      const link = await service.launch(current, 'finance');
      const code = new URLSearchParams(new URL(link.url).hash.slice(1)).get('code')!;
      const session = await service.redeem('finance', code, 'finance-server-secret');
      expect(session.user.role).toBe(expected);
    }
  });
  it('forces password replacement after an owner reset and invalidates old sessions', async () => {
    const login = await service.login(member.email, 'staff-password-123', 'staff');
    await service.update(owner, member.id, { password: 'reset-temporary-123' });
    await expect(service.session(login.token)).rejects.toThrow('revoked');
    const reset = await service.login(member.email, 'reset-temporary-123', 'staff');
    await expect(service.session(reset.token)).rejects.toThrow('temporary password');
    const user = await service.session(reset.token, true);
    const changed = await service.changePassword(user, { currentPassword: 'reset-temporary-123', password: 'permanent-password-123' });
    expect((await service.session(changed.token)).mustChangePassword).toBe(false);
  });
  it('revokes all sessions on workspace sign out and protects the owner account', async () => {
    const login = await service.login(member.email, 'staff-password-123', 'staff'); await service.logout(member);
    await expect(service.session(login.token)).rejects.toThrow('revoked');
    await expect(service.update(owner, owner.id, { active: false })).rejects.toThrow('owner account');
  });
  it('keeps signed-in sessions valid until sign-out and revokes project sessions independently', async () => {
    const login = await service.login(member.email, 'staff-password-123', 'staff');
    const project = await service.redeem('cbt', await launch(), 'test-cbt-server-secret');
    const workspaceClaims = JSON.parse(Buffer.from(login.token.split('.')[1], 'base64url').toString());
    const projectClaims = JSON.parse(Buffer.from(project.token.split('.')[1], 'base64url').toString());
    expect(workspaceClaims.exp).toBeUndefined();
    expect(projectClaims.exp).toBeUndefined();
    await service.logoutProject(project.token);
    await expect(service.inspect(project.token, 'cbt')).rejects.toThrow('revoked');
    expect((await service.session(login.token)).id).toBe(member.id);
    await service.logout(member);
    await expect(service.session(login.token)).rejects.toThrow('revoked');
  });
  it('preserves monotonically increasing revocation versions during concurrent updates', async () => {
    const session = await service.redeem('cbt', await launch(), 'test-cbt-server-secret');
    await Promise.all([service.update(owner, member.id, { grants: { cbt: 'ADMIN' } }), service.update(owner, member.id, { grants: { cbt: 'USER' } })]);
    const current = await store.db.workspaceUser.findUnique({ where: { id: member.id } });
    expect(current.accessVersion).toBe(3);
    await expect(service.inspect(session.token)).rejects.toThrow('revoked');
  });
});
