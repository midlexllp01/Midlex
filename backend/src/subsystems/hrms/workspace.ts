import type { Request, Response, NextFunction } from 'express';
import { getDb, saveDb } from './config/database.js';
const project: string = 'hrms';
export async function workspaceGuard(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/health') return next();
  if (req.path.startsWith('/auth')) return res.status(403).json({ error: 'Sign in and manage access through your Midlex workspace' });
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) return res.status(401).json({ error: 'Workspace session required' });
  try {
    const workspaceBase = process.env.WORKSPACE_API_URL || `http://127.0.0.1:${process.env.PORT || 3001}`;
    const response = await fetch(`${workspaceBase}/workspace/introspect`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: authorization }, body: JSON.stringify({ project }), signal: AbortSignal.timeout(15000) });
    if (!response.ok) return res.status(response.status >= 500 ? 503 : 401).json({ error: 'Return to your workspace to refresh project access' });
    const session = await response.json() as any;
    const database = getDb() as any;
    const directory = project === 'cbt' ? database.users : database.staff;
    let local = directory.find((person: any) => person.email?.toLowerCase() === session.user.email.toLowerCase());
    if (!local) {
      const identity = { id: session.user.id, name: session.user.name, email: session.user.email };
      local = project === 'cbt'
        ? { ...identity, role: session.access, candidateId: session.user.workspaceId, assignedExamIds: [], createdAt: new Date().toISOString() }
        : { ...identity, role: 'STAFF', staffCategory: 'SUPPORT_STAFF', department: 'GENERAL', phone: '', basicSalary: 0, courtAllowanceRate: 0, dateJoined: new Date().toISOString().slice(0, 10), status: 'ACTIVE', qualification: '', leaveBalance: 0, firstLoginSetupComplete: true };
      directory.push(local); saveDb(database);
    }
    session.user.id = local.id;
    (req as any).workspace = session;
    // Internal account management and operational administration require the project's admin grant.
    if (session.access !== 'ADMIN') {
      const selfService = project === 'cbt' ? ['/exams', '/questions', '/submissions'] : ['/staff', '/attendance', '/leaves', '/court-appearances'];
      if (!selfService.some(p => req.path === p || req.path.startsWith(`${p}/`))) return res.status(403).json({ error: 'Admin project access required' });
      const userWrite = project === 'cbt' ? req.method === 'POST' && req.path === '/submissions' : req.method === 'POST' && ['/attendance', '/leaves', '/attendance/clock-in', '/attendance/clock-out'].includes(req.path);
      if (!['GET', 'HEAD'].includes(req.method) && !userWrite) return res.status(403).json({ error: 'Admin project access required' });
      if (project === 'cbt' && req.path.startsWith('/submissions/')) {
        const submission = database.submissions.find((row: any) => row.id === req.path.split('/')[2]);
        if (submission && submission.userId !== session.user.id) return res.status(403).json({ error: 'You can only access your own submissions' });
      }
      if (project === 'hrms' && req.path.startsWith('/staff/') && req.path.split('/')[2] !== session.user.id) return res.status(403).json({ error: 'You can only access your own staff record' });
      if (project === 'cbt' && userWrite) {
        req.body.userId = session.user.id; req.body.userName = session.user.name; req.body.userEmail = session.user.email;
        for (const answer of Object.values(req.body.answers || {}) as any[]) { delete answer.scoreAwarded; delete answer.adminGradingNotes; }
      }
      if (project === 'hrms' && userWrite) { req.body.staffId = session.user.id; req.body.staffName = session.user.name; req.body.staffEmail = session.user.email; }
    }
    const original = res.json.bind(res);
    res.json = ((body: any) => {
      const clean = (value: any, depth = 0): any => {
        if (Array.isArray(value)) {
          let rows = value;
          if (depth <= 1 && session.access !== 'ADMIN' && req.path.startsWith('/submissions')) rows = rows.filter(row => row.userId === session.user.id);
          if (depth <= 1 && session.access !== 'ADMIN' && project === 'hrms' && !req.path.startsWith('/court-appearances')) rows = rows.filter(row => row.email === session.user.email || row.staffEmail === session.user.email || row.staffId === session.user.id);
          return rows.map(row => clean(row, depth + 1));
        }
        if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !['password', 'loginPassword', 'securityPasskey'].includes(key) && (session.access === 'ADMIN' || !['correctOptionKey', 'correctTrueFalse', 'correctTheoryKeyword', 'explanation'].includes(key))).map(([key, val]) => [key, clean(val, depth + 1)]));
        return value;
      };
      return original(clean(body));
    }) as typeof res.json;
    return next();
  } catch { return res.status(503).json({ error: 'Unable to verify workspace access' }); }
}
