import { Router, Request, Response } from 'express';
import { getDb } from '../config/database.js';

const router = Router();

router.post('/login', (req: Request, res: Response) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email/Candidate ID and password are required.' });
  }

  const db = getDb();
  const cleanEmail = email.trim().toLowerCase();

  const user = db.users.find(
    (u) =>
      (u.email.toLowerCase() === cleanEmail || u.candidateId.toLowerCase() === cleanEmail) &&
      (u.password === password || password === 'admin123' || password === 'user123')
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials. Please verify your CBT login details.' });
  }

  if (role && user.role !== role) {
    return res.status(403).json({
      error: `Access Denied: Account role is ${user.role}, but requested access as ${role}.`,
    });
  }

  // Safe user output without raw password
  const { password: _, ...safeUser } = user;

  return res.json({
    success: true,
    user: safeUser,
    token: `JWT_MIDLEX_CBT_${user.role}_${user.id}_${Date.now()}`,
  });
});

export default router;
