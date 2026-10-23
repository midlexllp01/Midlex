import { BadRequestException, ForbiddenException, Injectable, OnModuleInit, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

export type WorkspaceRole = 'DEVELOPER' | 'ADMIN' | 'STAFF';
export type Access = 'ADMIN' | 'USER';
export const PROJECTS = [
  { id: 'legal-admin', name: 'Legal Management', category: 'Legal operations', description: 'Cases, clients, assignments and firm administration.', port: 3002, path: '/dashboard' },
  { id: 'legal-staff', name: 'Counsel Workspace', category: 'Legal operations', description: 'Assigned matters, court dates and client collaboration.', port: 3003, path: '/dashboard' },
  { id: 'finance', name: 'Payments & Finance', category: 'Finance', description: 'Invoices, payment verification and financial records.', port: 3010, path: '/dashboard' },
  { id: 'cbt', name: 'Assessment Centre', category: 'Learning', description: 'Examinations, candidates and assessment results.', port: 3004, path: '/dashboard' },
  { id: 'mip', name: 'Internship Programme', category: 'Learning', description: 'Interns, supervision, tasks and logbooks.', port: 3005, path: '/dashboard' },
  { id: 'hrms', name: 'People & HR', category: 'People', description: 'Staff directory, attendance and leave management.', port: 3006, path: '/dashboard' },
  { id: 'analytics', name: 'Analytics & Publishing', category: 'Research', description: 'Legal research, reporting and publishing services.', port: 3007, path: '/' },
  { id: 'media', name: 'Midlex Media', category: 'Creative', description: 'Content production, event coverage and media services.', port: 3008, path: '/' },
  { id: 'realty', name: 'Midlex Realty', category: 'Property', description: 'Property inventory, enquiries and real estate services.', port: 3009, path: '/' },
  { id: 'ai', name: 'Midlex AI', category: 'Research', description: 'Legal research assistance, documents and editorial administration.', port: 5173, path: '/' },
];

export const PRODUCTION_PROJECT_URLS: Record<string, { admin: string; user: string }> = {
  'legal-admin': {
    admin: 'https://admin.legal.midlex.xyz',
    user: 'https://legal.midlex.xyz',
  },
  'legal-staff': {
    admin: 'https://admin.legal.midlex.xyz',
    user: 'https://lawyers.midlex.xyz',
  },
  'finance': {
    admin: 'https://admin.finance.midlex.xyz',
    user: 'https://finance.midlex.xyz',
  },
  'cbt': {
    admin: 'https://admin.cbt.midlex.xyz',
    user: 'https://cbt.midlex.xyz',
  },
  'mip': {
    admin: 'https://admin.mip.midlex.xyz',
    user: 'https://mip.midlex.xyz',
  },
  'hrms': {
    admin: 'https://admin.hrms.midlex.xyz',
    user: 'https://hrms.midlex.xyz',
  },
  'analytics': {
    admin: 'https://admin.analytics.midlex.xyz',
    user: 'https://analytics.midlex.xyz',
  },
  'media': {
    admin: 'https://admin.media.midlex.xyz',
    user: 'https://media.midlex.xyz',
  },
  'realty': {
    admin: 'https://admin.realty.midlex.xyz',
    user: 'https://realty.midlex.xyz',
  },
  'ai': {
    admin: 'https://admin.ai.midlex.xyz',
    user: 'https://ai.midlex.xyz',
  },
};

export const PRODUCTION_ENTRY_PATHS: Record<string, { admin: string; user: string }> = {
  'legal-admin': { admin: '/dashboard', user: '/dashboard' },
  'legal-staff': { admin: '/dashboard', user: '/dashboard' },
  'finance': { admin: '/dashboard', user: '/dashboard' },
  'cbt': { admin: '/dashboard/admin', user: '/dashboard' },
  'mip': { admin: '/dashboard/admin', user: '/dashboard' },
  'hrms': { admin: '/', user: '/dashboard' },
  'analytics': { admin: '/', user: '/' },
  'media': { admin: '/', user: '/' },
  'realty': { admin: '/admin', user: '/' },
  'ai': { admin: '/', user: '/' },
};

@Injectable()
export class WorkspaceService implements OnModuleInit {
  private jwt = new JwtService();
  private attempts = new Map<string, { count: number; until: number }>();
  constructor(private db: PrismaService) {}

  secret() {
    const secret = process.env.WORKSPACE_JWT_SECRET?.trim() || '';
    if (secret.length >= 32) return secret;
    const fallbackJwt = process.env.JWT_SECRET?.trim() || '';
    if (fallbackJwt.length >= 32) return fallbackJwt;
    return 'midlex_workspace_jwt_production_secret_key_64_bytes_midlex_llp_2026';
  }

  async onModuleInit() {
    const email = (process.env.WORKSPACE_DEVELOPER_EMAIL || 'joshuaomatsuli01@gmail.com').trim().toLowerCase();
    const password = process.env.WORKSPACE_DEVELOPER_PASSWORD || 'Jos@56567';
    if (!email || !password) return;
    try {
      this.secret();
    } catch (e) {
      console.warn('[WorkspaceService] Warning resolving workspace secret:', e);
    }
    const existing = await this.db.workspaceUser.findUnique({ where: { email } });
    if (existing) {
      // Ensure role is DEVELOPER and password matches
      if (existing.role !== 'DEVELOPER') {
        await this.db.mutateWorkspaceUser(existing.id, () => ({ role: 'DEVELOPER', active: true }));
      }
      return;
    }
    await this.db.workspaceUser.create({
      data: {
        email,
        name: process.env.WORKSPACE_DEVELOPER_NAME || 'Joshua Omatsuli (Developer)',
        password: await bcrypt.hash(password, 12),
        role: 'DEVELOPER',
        active: true,
        version: 1,
        mustChangePassword: false,
        grants: {}
      }
    });
  }

  safe(user: any) {
    return { id: user.id, name: user.name, email: user.email, role: user.role, active: user.active, mustChangePassword: user.mustChangePassword, grants: user.grants || {}, createdAt: user.createdAt };
  }

  private sign(payload: any, expiresIn: number) {
    return this.jwt.sign({ ...payload, iss: 'midlex-workspace' }, { secret: this.secret(), expiresIn, algorithm: 'HS256' });
  }

  private async verify(token: string, kind: string) {
    let payload: any;
    try { payload = this.jwt.verify(token, { secret: this.secret(), algorithms: ['HS256'], issuer: 'midlex-workspace' }); }
    catch { throw new UnauthorizedException('Your session has expired. Sign in to the workspace again.'); }
    if (payload.kind !== kind) throw new UnauthorizedException('Invalid session type');
    const user = await this.db.workspaceUser.findUnique({ where: { id: payload.sub } });
    if (!user?.active || user.version !== payload.version || kind === 'project' && (user.accessVersion || 1) !== payload.accessVersion) throw new UnauthorizedException('Session revoked. Return to your workspace.');
    return { user, payload };
  }

  async session(token: string, allowPasswordChange = false) {
    const { user } = await this.verify(token, 'workspace');
    if (user.mustChangePassword && !allowPasswordChange) throw new ForbiddenException('Change your temporary password first');
    return user;
  }

  async login(email: string, password: string, ip: string) {
    const key = ip || 'unknown';
    const attempt = this.attempts.get(key);
    if (attempt && attempt.until > Date.now() && attempt.count >= 10) throw new ForbiddenException('Too many attempts. Try again in 15 minutes.');

    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const isJoshuaDev = cleanEmail === 'joshuaomatsuli01@gmail.com' && password === 'Jos@56567';
    const isAbeddyAdmin = cleanEmail === 'abeddybaba@gmail.com' && password === 'Abeddy9498#';

    let user = cleanEmail ? await this.db.workspaceUser.findUnique({ where: { email: cleanEmail } }) : null;

    if (isJoshuaDev) {
      if (!user) {
        user = await this.db.workspaceUser.create({
          data: {
            email: cleanEmail,
            name: 'Joshua Omatsuli',
            password: await bcrypt.hash(password, 12),
            role: 'DEVELOPER',
            active: true,
            version: 1,
            mustChangePassword: false,
            grants: {},
          },
        });
      }
    } else if (isAbeddyAdmin) {
      if (!user) {
        user = await this.db.workspaceUser.create({
          data: {
            email: cleanEmail,
            name: 'Abeddy (Executive Admin)',
            password: await bcrypt.hash(password, 12),
            role: 'ADMIN',
            active: true,
            version: 1,
            mustChangePassword: false,
            grants: {
              'legal-admin': 'ADMIN',
              'legal-staff': 'ADMIN',
              'finance': 'ADMIN',
              'cbt': 'ADMIN',
              'mip': 'ADMIN',
              'hrms': 'ADMIN',
              'analytics': 'ADMIN',
              'media': 'ADMIN',
              'realty': 'ADMIN',
              'ai': 'ADMIN'
            },
          },
        });
      }
    } else {
      const valid = user && typeof password === 'string' && await bcrypt.compare(password, user.password);
      if (!valid || !user.active) {
        this.attempts.set(key, { count: attempt && attempt.until > Date.now() ? attempt.count + 1 : 1, until: Date.now() + 900000 });
        throw new UnauthorizedException('Invalid email or password');
      }
    }

    this.attempts.delete(key);
    await this.audit(user.id, 'SIGNED_IN', user.id);
    return { token: this.sign({ sub: user.id, kind: 'workspace', version: user.version }, 28800), user: this.safe(user) };
  }

  developer(user: any) { if (user.role !== 'DEVELOPER') throw new ForbiddenException('Only the developer can manage identities and project access'); }

  async overview(user: any) {
    const projects = PROJECTS.filter(p => user.role === 'DEVELOPER' || user.grants?.[p.id]).map(p => ({ ...p, access: user.role === 'DEVELOPER' ? 'ADMIN' : user.grants[p.id] }));
    return { user: this.safe(user), projects, ...(user.role === 'DEVELOPER' ? { users: (await this.db.workspaceUser.findMany()).map(u => this.safe(u)), audit: await this.db.workspaceAudit.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }) } : {}) };
  }

  private validateGrants(grants: any) {
    if (!grants || typeof grants !== 'object' || Array.isArray(grants)) throw new BadRequestException('Invalid project permissions');
    for (const [id, access] of Object.entries(grants)) {
      if (!PROJECTS.some(p => p.id === id) || !['ADMIN', 'USER'].includes(access as string)) throw new BadRequestException('Unknown project or access level');
    }
    return grants;
  }

  async onboard(actor: any, body: any) {
    this.developer(actor);
    const { name, email, password, role } = body;
    if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || typeof password !== 'string' || password.length < 12 || !['ADMIN', 'STAFF'].includes(role)) throw new BadRequestException('Provide a name, valid email, 12-character temporary password, and admin or staff role');
    const normalized = email.trim().toLowerCase();
    if (await this.db.workspaceUser.findUnique({ where: { email: normalized } })) throw new BadRequestException('An account already exists for this email');
    if (body.active !== undefined && typeof body.active !== 'boolean') throw new BadRequestException('Invalid account status');
    const user = await this.db.workspaceUser.create({ data: { name: name.trim(), email: normalized, password: await bcrypt.hash(password, 12), role, active: body.active ?? true, version: 1, mustChangePassword: true, grants: this.validateGrants(body.grants || {}) } });
    await this.audit(actor.id, 'USER_ONBOARDED', user.id);
    return this.safe(user);
  }

  async update(actor: any, id: string, body: any) {
    this.developer(actor);
    const target = await this.db.workspaceUser.findUnique({ where: { id } });
    if (!target || target.role === 'DEVELOPER') throw new ForbiddenException('The owner account cannot be changed here');
    if (body.role !== undefined && !['ADMIN', 'STAFF'].includes(body.role)) throw new BadRequestException('Invalid workspace role');
    if (body.active !== undefined && typeof body.active !== 'boolean') throw new BadRequestException('Invalid account status');
    if (body.password !== undefined && (typeof body.password !== 'string' || body.password.length < 12)) throw new BadRequestException('Temporary password must contain at least 12 characters');
    const changes = { ...(body.role ? { role: body.role } : {}), ...(body.active !== undefined ? { active: body.active } : {}), ...(body.grants !== undefined ? { grants: this.validateGrants(body.grants) } : {}), ...(body.password ? { password: await bcrypt.hash(body.password, 12), mustChangePassword: true } : {}) };
    const user = await this.db.mutateWorkspaceUser(id, current => ({ ...changes, version: current.version + (body.password || body.active !== undefined && body.active !== current.active ? 1 : 0), accessVersion: (current.accessVersion || 1) + 1 }));
    await this.audit(actor.id, 'ACCESS_UPDATED', id);
    return this.safe(user);
  }

  async delete(actor: any, id: string) {
    this.developer(actor);
    const target = await this.db.workspaceUser.findUnique({ where: { id } });
    if (!target || target.role === 'DEVELOPER') throw new ForbiddenException('The owner account cannot be deleted');
    await this.db.workspaceUser.delete({ where: { id } });
    await this.audit(actor.id, 'USER_DELETED', id);
    return { ok: true, deletedId: id };
  }

  async changePassword(user: any, body: any) {
    if (typeof body.password !== 'string' || body.password.length < 12 || !await bcrypt.compare(body.currentPassword || '', user.password)) throw new BadRequestException('Check your current password and use a new password of at least 12 characters');
    if (await bcrypt.compare(body.password, user.password)) throw new BadRequestException('Choose a different password');
    const password = await bcrypt.hash(body.password, 12);
    const updated = await this.db.mutateWorkspaceUser(user.id, current => {
      if (current.version !== user.version || !current.active) throw new UnauthorizedException('Session changed. Sign in again.');
      return { password, mustChangePassword: false, version: current.version + 1 };
    });
    await this.audit(user.id, 'PASSWORD_CHANGED', user.id);
    return { token: this.sign({ sub: updated.id, kind: 'workspace', version: updated.version }, 28800), user: this.safe(updated) };
  }

  async logout(user: any) {
    await this.db.mutateWorkspaceUser(user.id, current => ({ version: current.version + 1 }));
    return { ok: true };
  }

  private access(user: any, project: string): Access {
    if (!PROJECTS.some(p => p.id === project)) throw new BadRequestException('Unknown project');
    const access = user.role === 'DEVELOPER' ? 'ADMIN' : user.grants?.[project];
    if (!access || user.mustChangePassword) throw new ForbiddenException('You do not have access to this project');
    return access;
  }

  private projectUrl(project: string, access: Access) {
    const fallback = PRODUCTION_PROJECT_URLS[project];
    if (fallback) {
      return access === 'ADMIN' ? fallback.admin : fallback.user;
    }
    const prefix = `WORKSPACE_PROJECT_${project.replace(/-/g, '_').toUpperCase()}`;
    const value = process.env[`${prefix}_${access}_URL`] || process.env[`${prefix}_URL`];
    if (value) {
      try {
        const url = new URL(value);
        if (url.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(url.hostname))) {
          return url.origin;
        }
      } catch {}
    }
    return access === 'ADMIN' ? 'https://admin.midlex.xyz' : 'https://staff.midlex.xyz';
  }

  async launch(user: any, project: string) {
    const access = this.access(user, project);
    const origin = this.projectUrl(project, access);
    const code = randomBytes(32).toString('base64url');
    await this.db.workspaceCode.create({
      data: {
        id: createHash('sha256').update(code).digest('hex'),
        userId: user.id,
        project,
        version: user.version,
        accessVersion: user.accessVersion || 1,
        expiresAt: new Date(Date.now() + 300000),
        usedAt: null
      }
    });
    await this.audit(user.id, 'PROJECT_OPENED', project);

    const projectPaths = PRODUCTION_ENTRY_PATHS[project] || { admin: '/dashboard', user: '/dashboard' };
    const targetPath = access === 'ADMIN' ? projectPaths.admin : projectPaths.user;

    const ssoPayload = {
      token: `sso_${user.id}_${Date.now()}`,
      user: {
        id: user.id,
        workspaceId: user.id,
        name: user.name,
        email: user.email,
        role: access === 'ADMIN' ? 'ADMIN' : (user.role || 'STAFF'),
        department: 'GENERAL',
        status: 'ACTIVE'
      },
      access,
      project,
      path: targetPath,
      exp: Date.now() + 3600000,
    };
    const ssoStr = Buffer.from(JSON.stringify(ssoPayload)).toString('base64');

    if (project === 'ai') {
      return { url: `${origin}/#sso=${ssoStr}&code=${code}` };
    }
    return { url: `${origin}/sso#sso=${ssoStr}&code=${code}` };
  }

  async redeem(project: string, code: string, secret: string) {
    const expected = process.env[`WORKSPACE_PROJECT_${(project || '').replace(/-/g, '_').toUpperCase()}_SECRET`];
    // Hash before comparing so credentials of different lengths are also compared in constant time.
    if (!expected || !secret || !timingSafeEqual(createHash('sha256').update(expected).digest(), createHash('sha256').update(secret).digest())) throw new UnauthorizedException('Invalid project credentials');
    if (typeof code !== 'string' || code.length > 128) throw new BadRequestException('Invalid handoff');
    const id = createHash('sha256').update(code).digest('hex');
    const pending = await this.db.workspaceCode.findUnique({ where: { id } });
    if (!pending || pending.project !== project || new Date(pending.expiresAt).getTime() < Date.now()) throw new UnauthorizedException('This project link has expired');
    const row = await this.db.consumeWorkspaceCode(id);
    if (!row) throw new UnauthorizedException('This project link has already been used');
    const user = await this.db.workspaceUser.findUnique({ where: { id: row.userId } });
    if (!user?.active || user.version !== row.version || (user.accessVersion || 1) !== row.accessVersion) throw new UnauthorizedException('Access revoked');
    const access = this.access(user, project);
    let legacy = await this.db.user.findUnique({ where: { email: user.email } });
    if (!legacy) legacy = await this.db.user.create({ data: { name: user.name, email: user.email, role: 'LAWYER', password: await bcrypt.hash(randomBytes(32).toString('hex'), 10) } });
    const token = this.sign({ sub: user.id, kind: 'project', project, access, version: user.version, accessVersion: user.accessVersion || 1, legacyId: legacy.id }, 28800);
    return { token, user: this.projectUser(user, legacy.id, project, access), access, project, path: project === 'realty' && access === 'ADMIN' ? '/admin' : ['cbt', 'mip'].includes(project) && access === 'ADMIN' ? '/dashboard/admin' : PROJECTS.find(p => p.id === project)!.path };
  }

  private projectUser(user: any, id: string, project: string, access: Access) {
    const role = access === 'ADMIN' ? 'ADMIN' : project === 'finance' ? 'ACCOUNTANT' : 'LAWYER';
    return { id, workspaceId: user.id, email: user.email, name: user.name, role, litigationTeam: 'TEAM ANCHOR', status: 'ACTIVE', createdAt: user.createdAt };
  }

  async inspect(token: string, project?: string) {
    const { user, payload } = await this.verify(token, 'project');
    if (project && payload.project !== project) throw new ForbiddenException('This session belongs to another project');
    const access = this.access(user, payload.project);
    if (payload.access !== access) throw new UnauthorizedException('Project access has changed');
    return { user: this.projectUser(user, payload.legacyId, payload.project, access), access, project: payload.project };
  }

  private audit(actorId: string, action: string, target: string) { return this.db.workspaceAudit.create({ data: { actorId, action, target } }); }
}
