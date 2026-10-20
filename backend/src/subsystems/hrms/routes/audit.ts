import { Router, Request, Response } from 'express';
import { getDb } from '../config/database.js';

const router = Router();

// GET all audit logs
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  res.json({ success: true, data: db.auditLogs, total: db.auditLogs.length });
});

export default router;
