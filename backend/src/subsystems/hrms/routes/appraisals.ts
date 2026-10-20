import { Router, Request, Response } from 'express';
import { getDb, saveDb } from '../config/database.js';
import { PerformanceReview } from '../types/hrms.js';

const router = Router();

// GET all performance appraisals
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  res.json({ success: true, data: db.reviews, total: db.reviews.length });
});

// POST create performance review
router.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const body = req.body;

  if (!body.staffName || !body.staffId) {
    return res.status(400).json({ success: false, error: 'Staff name and staff ID are required.' });
  }

  const avg =
    (Number(body.draftingScore || 5) +
      Number(body.courtAdvocacyScore || 5) +
      Number(body.punctualityScore || 5) +
      Number(body.clientSatisfactionScore || 5)) /
    4;

  let grade: PerformanceReview['overallGrade'] = 'EXCELLENT';
  if (avg < 3) grade = 'NEEDS_IMPROVEMENT';
  else if (avg < 4) grade = 'GOOD';
  else if (avg < 4.8) grade = 'VERY_GOOD';

  const newReview: PerformanceReview = {
    id: body.id || `rev-${Date.now()}`,
    staffId: body.staffId,
    staffName: body.staffName,
    reviewPeriod: body.reviewPeriod || `Q4 ${new Date().getFullYear()} Evaluation`,
    draftingScore: Number(body.draftingScore) || 5,
    courtAdvocacyScore: Number(body.courtAdvocacyScore) || 5,
    punctualityScore: Number(body.punctualityScore) || 5,
    clientSatisfactionScore: Number(body.clientSatisfactionScore) || 5,
    overallGrade: body.overallGrade || grade,
    comments: body.comments || 'Evaluated performance meets firm standards.',
    reviewer: body.reviewer || 'Midlex HR Directorate',
    date: body.date || new Date().toISOString().split('T')[0],
  };

  db.reviews.unshift(newReview);
  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    timestamp: 'Just now',
    action: 'Appraisal Completed',
    performedBy: newReview.reviewer,
    target: `${newReview.staffName} (${newReview.overallGrade})`,
    severity: 'INFO',
  });

  saveDb(db);
  res.status(201).json({ success: true, data: newReview });
});

export default router;
