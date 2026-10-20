import { Router, Request, Response } from 'express';
import { getDb, saveDb } from '../config/database.js';
import { CourtAppearance } from '../types/hrms.js';

const router = Router();

// GET all court appearances
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  res.json({ success: true, data: db.courtAppearances, total: db.courtAppearances.length });
});

// POST log counsel court appearance
router.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const body = req.body;

  if (!body.counselName || !body.caseNumber) {
    return res.status(400).json({ success: false, error: 'Counsel name and case number are required.' });
  }

  const newAppearance: CourtAppearance = {
    id: body.id || `crt-${Date.now()}`,
    counselId: body.counselId || 'counsel-unknown',
    counselName: body.counselName,
    caseNumber: body.caseNumber,
    caseTitle: body.caseTitle || 'Midlex Legal Matter',
    courtName: body.courtName || 'High Court of Edo State',
    date: body.date || new Date().toISOString().split('T')[0],
    appearanceType: body.appearanceType || 'HEARING',
    dailyRate: Number(body.dailyRate) || 20000,
    status: body.status || 'VERIFIED',
    verifiedBy: body.verifiedBy || 'HR Directorate',
    notes: body.notes || 'Litigation brief appearance',
  };

  db.courtAppearances.unshift(newAppearance);
  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    timestamp: 'Just now',
    action: 'Court Appearance Logged',
    performedBy: newAppearance.counselName,
    target: `${newAppearance.caseNumber} (${newAppearance.courtName})`,
    severity: 'INFO',
  });

  saveDb(db);
  res.status(201).json({ success: true, data: newAppearance });
});

export default router;
