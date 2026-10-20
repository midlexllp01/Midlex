import { Router, Request, Response } from 'express';
import { getDb, saveDb } from '../config/database.js';
import { LeaveRequest } from '../types/hrms.js';

const router = Router();

// GET all leaves
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const statusFilter = req.query.status as string;

  let records = db.leaves;
  if (statusFilter && statusFilter !== 'ALL') {
    records = records.filter((l) => l.status === statusFilter);
  }

  res.json({ success: true, data: records, total: records.length });
});

// POST submit leave application
router.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const body = req.body;

  if (!body.startDate || !body.endDate || !body.staffName) {
    return res.status(400).json({ success: false, error: 'Start date, end date, and staff name are required.' });
  }

  const start = new Date(body.startDate);
  const end = new Date(body.endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const newLeave: LeaveRequest = {
    id: body.id || `lve-${Date.now()}`,
    staffId: body.staffId || 'stf-unknown',
    staffName: body.staffName,
    staffCategory: body.staffCategory || 'COUNSEL',
    department: body.department || 'LITIGATION',
    leaveType: body.leaveType || 'ANNUAL',
    startDate: body.startDate,
    endDate: body.endDate,
    daysCount: days > 0 ? days : 1,
    reason: body.reason || 'Staff leave application',
    handoverStaff: body.handoverStaff || 'Omatsuli Joshua',
    status: 'PENDING',
    appliedDate: new Date().toISOString().split('T')[0],
  };

  db.leaves.unshift(newLeave);
  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    timestamp: 'Just now',
    action: 'Leave Application Filed',
    performedBy: newLeave.staffName,
    target: `${newLeave.leaveType} (${newLeave.daysCount} Days)`,
    severity: 'INFO',
  });

  saveDb(db);
  res.status(201).json({ success: true, data: newLeave });
});

// PATCH approve or reject leave
router.patch('/:id/status', (req: Request, res: Response) => {
  const db = getDb();
  const { status, hrComment, reviewedBy } = req.body;

  if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Status must be APPROVED or REJECTED.' });
  }

  const leave = db.leaves.find((l) => l.id === req.params.id);
  if (!leave) {
    return res.status(404).json({ success: false, error: 'Leave request not found.' });
  }

  leave.status = status;
  leave.hrComment = hrComment || (status === 'APPROVED' ? 'Approved by HR Directorate' : 'Application declined');
  leave.reviewedDate = new Date().toISOString().split('T')[0];
  leave.reviewedBy = reviewedBy || 'Midlex HR Directorate';

  // Deduct from staff leave balance if approved
  if (status === 'APPROVED') {
    const staff = db.staff.find((s) => s.id === leave.staffId || s.name === leave.staffName);
    if (staff && staff.leaveBalance >= leave.daysCount) {
      staff.leaveBalance -= leave.daysCount;
    }
  }

  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    timestamp: 'Just now',
    action: `Leave Application ${status}`,
    performedBy: leave.reviewedBy || 'Midlex HR Directorate',
    target: `${leave.staffName} (${leave.leaveType})`,
    severity: status === 'APPROVED' ? 'INFO' : 'WARNING',
  });

  saveDb(db);
  res.json({ success: true, data: leave });
});

export default router;
