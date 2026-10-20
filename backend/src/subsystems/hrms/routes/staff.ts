import { Router, Request, Response } from 'express';
import { getDb, saveDb } from '../config/database.js';
import { StaffMember } from '../types/hrms.js';

const router = Router();

// GET all staff members
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  res.json({ success: true, data: db.staff, total: db.staff.length });
});

// GET staff member by ID
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const staff = db.staff.find((s) => s.id === req.params.id);
  if (!staff) {
    return res.status(404).json({ success: false, error: 'Staff member not found.' });
  }
  res.json({ success: true, data: staff });
});

// POST enroll new staff member
router.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const body = req.body;

  if (!body.name || !body.email) {
    return res.status(400).json({ success: false, error: 'Name and email are required.' });
  }

  const newStaff: StaffMember = {
    id: body.id || `stf-${Date.now()}`,
    name: body.name,
    email: body.email,
    role: body.role || (body.staffCategory === 'SUPPORT_STAFF' ? 'Support Specialist' : 'Associate Solicitor'),
    staffCategory: body.staffCategory || 'COUNSEL',
    supportRole: body.supportRole,
    department: body.department || 'LITIGATION',
    phone: body.phone || '+234 800 000 0000',
    basicSalary: Number(body.basicSalary) || 350000,
    courtAllowanceRate: body.staffCategory === 'COUNSEL' ? Number(body.courtAllowanceRate) || 15000 : 0,
    dateJoined: body.dateJoined || new Date().toISOString().split('T')[0],
    status: body.status || 'ACTIVE',
    qualification: body.qualification || 'LL.B, BL',
    leaveBalance: Number(body.leaveBalance) || 20,
    securityPasskey: body.securityPasskey || Math.floor(100000 + Math.random() * 900000).toString(),
    loginPassword: body.loginPassword,
    firstLoginSetupComplete: body.firstLoginSetupComplete ?? false,
    signatureData: body.signatureData,
  };

  db.staff.unshift(newStaff);
  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    timestamp: 'Just now',
    action: 'New Staff Enrolled',
    performedBy: 'HR Directorate',
    target: `${newStaff.name} (${newStaff.role})`,
    severity: 'INFO',
  });

  saveDb(db);
  res.status(201).json({ success: true, data: newStaff });
});

// PUT update staff member
router.put('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const index = db.staff.findIndex((s) => s.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Staff member not found.' });
  }

  db.staff[index] = {
    ...db.staff[index],
    ...req.body,
    id: db.staff[index].id, // Prevent ID override
  };

  saveDb(db);
  res.json({ success: true, data: db.staff[index] });
});

// PATCH partial staff profile updates, including first-login setup
router.patch('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const index = db.staff.findIndex((s) => s.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Staff member not found.' });
  }

  db.staff[index] = {
    ...db.staff[index],
    ...req.body,
    id: db.staff[index].id,
  };

  saveDb(db);
  res.json({ success: true, data: db.staff[index] });
});

// DELETE staff member
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const staff = db.staff.find((s) => s.id === req.params.id);

  if (!staff) {
    return res.status(404).json({ success: false, error: 'Staff member not found.' });
  }

  db.staff = db.staff.filter((s) => s.id !== req.params.id);
  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    timestamp: 'Just now',
    action: 'Staff Record Removed',
    performedBy: 'HR Directorate',
    target: staff.name,
    severity: 'WARNING',
  });

  saveDb(db);
  res.json({ success: true, message: `Staff member ${staff.name} deleted successfully.` });
});

export default router;
