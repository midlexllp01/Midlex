import { Router, Request, Response } from 'express';
import { getDb, saveDb } from '../config/database.js';
import { CbtUser } from '../types/cbt.js';

const router = Router();

// GET all users
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const safeUsers = db.users.map(({ password, ...u }) => u);
  res.json({ success: true, count: safeUsers.length, users: safeUsers });
});

// POST create user (examinee or admin)
router.post('/', (req: Request, res: Response) => {
  const { name, email, password, candidateId, assignedExamIds, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const db = getDb();
  const cleanEmail = email.trim().toLowerCase();

  const existing = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return res.status(409).json({ error: 'A user with this email address already exists.' });
  }

  const userRole: 'ADMIN' | 'USER' = role === 'ADMIN' ? 'ADMIN' : 'USER';
  const newUser: CbtUser = {
    id: `user-${Date.now()}`,
    name: name.trim(),
    email: cleanEmail,
    password: password.trim(),
    role: userRole,
    candidateId: candidateId?.trim() || (userRole === 'ADMIN' ? `ADM-${Math.floor(100 + Math.random() * 900)}` : `MID-CBT-${Math.floor(1000 + Math.random() * 9000)}`),
    assignedExamIds: assignedExamIds || db.exams.map((e) => e.id),
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  saveDb(db);

  const { password: _, ...safeUser } = newUser;
  return res.status(201).json({ success: true, user: safeUser });
});

// DELETE user
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();

  const idx = db.users.findIndex((u) => u.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'User not found.' });
  }

  db.users.splice(idx, 1);
  saveDb(db);

  return res.json({ success: true, message: 'User successfully deleted.' });
});

// POST reallocate exam for candidate (clears submission lock and allows retake)
router.post('/:id/reallocate', (req: Request, res: Response) => {
  const { id } = req.params;
  const { examId } = req.body;

  if (!examId) {
    return res.status(400).json({ error: 'examId is required.' });
  }

  const db = getDb();
  const user = db.users.find((u) => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'Candidate not found.' });
  }

  // Ensure exam is assigned to candidate
  if (!user.assignedExamIds.includes(examId)) {
    user.assignedExamIds.push(examId);
  }

  // Remove existing submission(s) for this candidate and exam
  db.submissions = db.submissions.filter(
    (s) => !(s.userId === id && s.examId === examId)
  );

  saveDb(db);
  return res.json({
    success: true,
    message: `Exam successfully re-allocated for candidate ${user.name}. Retake is now permitted.`,
  });
});

// PATCH update candidate assignedExamIds
router.patch('/:id/assignments', (req: Request, res: Response) => {
  const { id } = req.params;
  const { assignedExamIds } = req.body;
  const db = getDb();
  const user = db.users.find((u) => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'Candidate not found.' });
  }

  if (Array.isArray(assignedExamIds)) {
    user.assignedExamIds = assignedExamIds;
    saveDb(db);
  }

  const { password: _, ...safeUser } = user;
  return res.json({ success: true, user: safeUser });
});

// POST bulk assign or unassign exam for all candidates
router.post('/bulk-assign', (req: Request, res: Response) => {
  const { examId, assign, userIds } = req.body;
  if (!examId) {
    return res.status(400).json({ error: 'examId is required.' });
  }

  const db = getDb();
  db.users.forEach((u) => {
    if (u.role === 'USER' && (!userIds || userIds.includes(u.id))) {
      if (assign) {
        if (!u.assignedExamIds.includes(examId)) {
          u.assignedExamIds.push(examId);
        }
      } else {
        u.assignedExamIds = u.assignedExamIds.filter((id) => id !== examId);
      }
    }
  });

  saveDb(db);
  return res.json({ success: true, message: 'Candidate exam assignments successfully updated.' });
});

export default router;
