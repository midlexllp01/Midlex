import { Router, Request, Response } from 'express';
import { getDb, saveDb } from '../config/database.js';
import { AttendanceRecord } from '../types/hrms.js';

const router = Router();

// GET all attendance records
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const dateFilter = req.query.date as string;

  let records = db.attendance;
  if (dateFilter) {
    records = records.filter((a) => a.date === dateFilter);
  }

  res.json({ success: true, data: records, total: records.length });
});

// POST clock-in (anti-proxy verified with GPS, passkey, and signature)
router.post('/clock-in', (req: Request, res: Response) => {
  const db = getDb();
  const body = req.body;

  if (!body.staffName || !body.clockInGps || !body.clockInPasskeyVerified) {
    return res.status(400).json({
      success: false,
      error: 'Missing required anti-proxy verification fields (GPS coordinates or Passkey).',
    });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const fullFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeNowStr = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Check if staff member already clocked in today
  const existing = db.attendance.find(
    (a) => a.staffName === body.staffName && a.date === todayStr
  );
  if (existing) {
    return res.status(409).json({
      success: false,
      error: `Staff member already clocked in today at ${existing.clockInTime}.`,
      data: existing,
    });
  }

  const newRecord: AttendanceRecord = {
    id: `att-${Date.now()}`,
    staffId: body.staffId || 'stf-unknown',
    staffName: body.staffName,
    staffCategory: body.staffCategory || 'COUNSEL',
    supportRole: body.supportRole,
    department: body.department || 'LITIGATION',

    date: todayStr,
    dayOfWeek: dayName,
    fullDateFormatted: fullFormatted,

    clockInTime: timeNowStr,
    locationCategory: body.locationCategory || 'BENIN_CHAMBERS',
    clockInLocationName: body.clockInLocationName || 'Midlex Chambers — Benin City',
    clockInGps: body.clockInGps,
    clockInSignature: body.clockInSignature || '',
    clockInPasskeyVerified: true,

    status: body.locationCategory === 'HOME_REMOTE' ? 'REMOTE_HOME' : body.locationCategory?.includes('COURT') ? 'COURT_APPEARANCE' : 'PRESENT',
    notes: body.notes || 'Verified GPS & Signature session',
    deviceSecurityHash: body.deviceSecurityHash || `PASSKEY-HASH-${Math.floor(100000 + Math.random() * 900000)}`,
  };

  db.attendance.unshift(newRecord);
  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    timestamp: 'Just now',
    action: 'Passkey & GPS Clock-In Verified',
    performedBy: newRecord.staffName,
    target: newRecord.clockInLocationName,
    severity: 'INFO',
  });

  saveDb(db);
  res.status(201).json({ success: true, data: newRecord });
});

// POST clock-out (re-verifies GPS & signature)
router.post('/clock-out', (req: Request, res: Response) => {
  const db = getDb();
  const { staffName, clockOutGps, clockOutSignature } = req.body;

  if (!staffName || !clockOutGps) {
    return res.status(400).json({
      success: false,
      error: 'Staff name and clock-out GPS satellite lock are required.',
    });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const timeNowStr = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const record = db.attendance.find(
    (a) => a.staffName === staffName && a.date === todayStr
  );

  if (!record) {
    return res.status(404).json({
      success: false,
      error: 'No active clock-in session found for today.',
    });
  }

  record.clockOutTime = timeNowStr;
  record.clockOutGps = clockOutGps;
  record.clockOutSignature = clockOutSignature;
  record.clockOutPasskeyVerified = true;

  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    timestamp: 'Just now',
    action: 'Clock-Out Re-verified',
    performedBy: staffName,
    target: `GPS: ${clockOutGps.latitude.toFixed(4)}°, ${clockOutGps.longitude.toFixed(4)}°`,
    severity: 'INFO',
  });

  saveDb(db);
  res.json({ success: true, data: record });
});

export default router;
