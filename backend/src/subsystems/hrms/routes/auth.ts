import { Router, Request, Response } from 'express';
import { getDb, saveDb } from '../config/database.js';

const router = Router();

router.post('/login', (req: Request, res: Response) => {
  const { email, password, role } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  const db = getDb();
  const staffMember = db.staff.find((s) => s.email.toLowerCase() === email.toLowerCase());

  // Default credentials handling
  const cleanEmail = email.toLowerCase().trim();
  if (role === 'HR_ADMIN' || cleanEmail === 'hr@midlex.com' || cleanEmail === 'abeddybaba@gmail.com' || cleanEmail === 'joshuaomatsuli01@gmail.com') {
    if (cleanEmail === 'abeddybaba@gmail.com' && password && password !== 'Abeddy9498#') {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }
    if (cleanEmail === 'joshuaomatsuli01@gmail.com' && password && password !== 'Jos@56567') {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }
    const isJoshua = cleanEmail === 'joshuaomatsuli01@gmail.com';
    const isAdminAbeddy = cleanEmail === 'abeddybaba@gmail.com';
    return res.json({
      success: true,
      user: {
        role: 'HR_ADMIN',
        email: isJoshua ? 'joshuaomatsuli01@gmail.com' : isAdminAbeddy ? 'abeddybaba@gmail.com' : 'hr@midlex.com',
        name: isJoshua ? 'Joshua Omatsuli (Developer)' : isAdminAbeddy ? 'Abeddy (Executive Admin)' : 'Midlex HR Directorate',
        department: isJoshua ? 'ENGINEERING' : 'HUMAN_RESOURCES',
        staffCategory: 'SUPPORT_STAFF',
        supportRole: isJoshua ? 'Lead Developer / IT Engineer' : isAdminAbeddy ? 'Executive Administrator' : 'HR Director',
        token: `JWT_MIDLEX_ADMIN_${Date.now()}`,
      },
    });
  }

  if (staffMember) {
    if (staffMember.loginPassword && staffMember.loginPassword !== password) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    return res.json({
      success: true,
      user: {
        role: 'STAFF',
        email: staffMember.email,
        name: staffMember.name,
        department: staffMember.department,
        staffCategory: staffMember.staffCategory,
        supportRole: staffMember.supportRole,
        staffId: staffMember.id,
        phone: staffMember.phone,
        qualification: staffMember.qualification,
        securityPasskey: staffMember.securityPasskey,
        signatureData: staffMember.signatureData,
        firstLoginSetupComplete: staffMember.firstLoginSetupComplete ?? true,
        token: `JWT_MIDLEX_STAFF_${staffMember.id}_${Date.now()}`,
      },
    });
  }

  // Fallback demo user
  return res.json({
    success: true,
    user: {
      role: 'STAFF',
      email,
      name: email.split('@')[0],
      department: 'GENERAL',
      staffCategory: 'COUNSEL',
      supportRole: 'Counsel Advocate',
      token: `JWT_MIDLEX_${Date.now()}`,
    },
  });
});

// POST change password & security passkey
router.post('/change-password', (req: Request, res: Response) => {
  const { email, currentPassword, newPassword, newPasskey } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ success: false, error: 'Email and new password are required.' });
  }

  const db = getDb();
  const staffMember = db.staff.find((s) => s.email.toLowerCase() === email.toLowerCase());

  if (!staffMember) {
    return res.status(404).json({ success: false, error: 'Staff account not found.' });
  }

  // If a login password is set, verify current password
  if (staffMember.loginPassword && staffMember.loginPassword !== currentPassword) {
    return res.status(401).json({ success: false, error: 'Current password is incorrect.' });
  }

  staffMember.loginPassword = newPassword;

  if (newPasskey && /^\d{6}$/.test(newPasskey)) {
    staffMember.securityPasskey = newPasskey;
  }

  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    timestamp: 'Just now',
    action: 'Security Credentials Updated',
    performedBy: staffMember.name,
    target: `${staffMember.name} updated login password`,
    severity: 'INFO',
  });

  saveDb(db);

  return res.json({
    success: true,
    message: 'Security credentials updated successfully.',
    data: {
      email: staffMember.email,
      securityPasskey: staffMember.securityPasskey,
    },
  });
});

export default router;
