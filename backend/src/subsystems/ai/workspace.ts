// @ts-nocheck
/* global process */
import { Router } from 'express';
const router = Router();
const api = () => process.env.WORKSPACE_API_URL || `http://127.0.0.1:${process.env.PORT || 3001}`;
export async function inspectWorkspace(req) {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) return null;
  const response = await fetch(`${api()}/workspace/introspect`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: authorization }, body: JSON.stringify({ project: 'ai' }), signal: AbortSignal.timeout(15000) });
  return response.ok ? response.json() : null;
}
router.post('/sso', async (req, res) => {
  if (!process.env.WORKSPACE_PROJECT_SECRET) return res.status(503).json({ message: 'Configure WORKSPACE_PROJECT_SECRET on the AI server' });
  try {
    const response = await fetch(`${api()}/workspace/redeem`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-project-secret': process.env.WORKSPACE_PROJECT_SECRET }, body: JSON.stringify({ project: 'ai', code: req.body.code }), signal: AbortSignal.timeout(15000) });
    return res.status(response.status).set('Cache-Control', 'no-store').json(await response.json());
  } catch { return res.status(503).json({ message: 'Workspace service unavailable' }); }
});
router.get('/session', async (req, res) => {
  try { const session = await inspectWorkspace(req); return session ? res.set('Cache-Control', 'no-store').json(session) : res.status(401).json({ message: 'Return to your workspace to refresh access' }); }
  catch { return res.status(503).json({ message: 'Workspace service unavailable' }); }
});
export async function workspaceAdmin(req, res, next) {
  try {
    const session = await inspectWorkspace(req);
    if (!session) return res.status(401).json({ error: 'Open Midlex AI from your workspace' });
    if (session.access !== 'ADMIN') return res.status(403).json({ error: 'Your developer has not granted admin access to Midlex AI' });
    req.workspace = session; next();
  } catch { return res.status(503).json({ error: 'Unable to validate workspace access' }); }
}
export default router;

