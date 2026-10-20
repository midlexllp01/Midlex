import fs from 'fs';
import path from 'path';
import {
  StaffMember,
  LeaveRequest,
  AttendanceRecord,
  CourtAppearance,
  PerformanceReview,
  SystemAuditLog,
} from '../types/hrms.js';

export interface DatabaseSchema {
  staff: StaffMember[];
  leaves: LeaveRequest[];
  attendance: AttendanceRecord[];
  courtAppearances: CourtAppearance[];
  reviews: PerformanceReview[];
  auditLogs: SystemAuditLog[];
}

const defaultDatabase: DatabaseSchema = {
  staff: [
    {
      id: 'stf-001',
      name: 'Samson Sabbat',
      email: 'samson@midlex.com',
      role: 'Lead Senior Partner & Counsel',
      staffCategory: 'COUNSEL',
      department: 'GENERAL',
      phone: '+234 803 123 4567',
      basicSalary: 650000,
      courtAllowanceRate: 25000,
      dateJoined: '2020-01-15',
      status: 'ACTIVE',
      qualification: 'LL.B (Hons), BL, Senior Advocate',
      leaveBalance: 18,
      securityPasskey: '123456',
    },
    {
      id: 'stf-002',
      name: 'Omatsuli Joshua',
      email: 'joshua@midlex.com',
      role: 'Managing Partner (Litigation Counsel)',
      staffCategory: 'COUNSEL',
      department: 'LITIGATION',
      phone: '+234 812 987 6543',
      basicSalary: 600000,
      courtAllowanceRate: 25000,
      dateJoined: '2020-03-01',
      status: 'ACTIVE',
      qualification: 'LL.B (Hons), BL, FCIArb',
      leaveBalance: 15,
      securityPasskey: '123456',
    },
    {
      id: 'stf-003',
      name: 'Osasere Ighodaro',
      email: 'osasere@midlex.com',
      role: 'Senior Associate Advocate',
      staffCategory: 'COUNSEL',
      department: 'LITIGATION',
      phone: '+234 705 444 3322',
      basicSalary: 420000,
      courtAllowanceRate: 15000,
      dateJoined: '2021-06-10',
      status: 'ACTIVE',
      qualification: 'LL.B, BL (Benin Bar)',
      leaveBalance: 12,
      securityPasskey: '123456',
    },
    {
      id: 'stf-004',
      name: 'Victor Software Dev',
      email: 'victor.dev@midlex.com',
      role: 'Lead Legal Tech Engineer',
      staffCategory: 'SUPPORT_STAFF',
      supportRole: 'Software Developer',
      department: 'ENGINEERING',
      phone: '+234 806 777 8899',
      basicSalary: 500000,
      courtAllowanceRate: 0,
      dateJoined: '2022-01-10',
      status: 'ACTIVE',
      qualification: 'B.Sc Computer Science, Fullstack Engineer',
      leaveBalance: 20,
      securityPasskey: '123456',
    },
    {
      id: 'stf-005',
      name: 'Amina Bello',
      email: 'amina.bello@midlex.com',
      role: 'Associate Solicitor',
      staffCategory: 'COUNSEL',
      department: 'GENERAL',
      phone: '+234 802 334 5566',
      basicSalary: 380000,
      courtAllowanceRate: 15000,
      dateJoined: '2023-02-01',
      status: 'ACTIVE',
      qualification: 'LL.B, BL, LL.M Corporate Law',
      leaveBalance: 16,
      securityPasskey: '849201',
    },
    {
      id: 'stf-006',
      name: 'Blessing Osayande',
      email: 'blessing.o@midlex.com',
      role: 'Head of Accounts & Payroll',
      staffCategory: 'SUPPORT_STAFF',
      supportRole: 'Lead Accountant',
      department: 'FINANCE',
      phone: '+234 809 112 2334',
      basicSalary: 450000,
      courtAllowanceRate: 0,
      dateJoined: '2021-11-15',
      status: 'ACTIVE',
      qualification: 'B.Sc Accounting, ACA (ICAN)',
      leaveBalance: 14,
      securityPasskey: '732910',
    },
    {
      id: 'stf-007',
      name: 'Precious Edobor',
      email: 'precious.e@midlex.com',
      role: 'Chambers Administrative Officer',
      staffCategory: 'SUPPORT_STAFF',
      supportRole: 'Administrative Secretary',
      department: 'ADMIN',
      phone: '+234 701 998 8776',
      basicSalary: 280000,
      courtAllowanceRate: 0,
      dateJoined: '2022-08-20',
      status: 'ACTIVE',
      qualification: 'HND Secretarial Studies',
      leaveBalance: 18,
      securityPasskey: '554321',
    },
  ],
  leaves: [
    {
      id: 'lve-101',
      staffId: 'stf-003',
      staffName: 'Osasere Ighodaro',
      staffCategory: 'COUNSEL',
      department: 'LITIGATION',
      leaveType: 'ANNUAL',
      startDate: '2026-10-18',
      endDate: '2026-10-28',
      daysCount: 10,
      reason: 'Annual vacation & rest period following High Court murder trial conclusion.',
      handoverStaff: 'Omatsuli Joshua',
      status: 'PENDING',
      appliedDate: '2026-10-12',
    },
    {
      id: 'lve-102',
      staffId: 'stf-004',
      staffName: 'Victor Software Dev',
      staffCategory: 'SUPPORT_STAFF',
      department: 'ENGINEERING',
      leaveType: 'EXAM',
      startDate: '2026-10-22',
      endDate: '2026-10-25',
      daysCount: 3,
      reason: 'Final Cloud Architecture Professional Certification Examinations.',
      handoverStaff: 'Blessing Osayande',
      status: 'APPROVED',
      appliedDate: '2026-10-08',
      hrComment: 'Approved. Good luck with the cloud certification exams.',
      reviewedDate: '2026-10-09',
      reviewedBy: 'Midlex HR Director',
    },
    {
      id: 'lve-103',
      staffId: 'stf-005',
      staffName: 'Amina Bello',
      staffCategory: 'COUNSEL',
      department: 'GENERAL',
      leaveType: 'COMPASSIONATE',
      startDate: '2026-10-14',
      endDate: '2026-10-16',
      daysCount: 2,
      reason: 'Family emergency requiring travel outside Edo state.',
      handoverStaff: 'Samson Sabbat',
      status: 'PENDING',
      appliedDate: '2026-10-13',
    },
  ],
  attendance: [
    {
      id: 'att-501',
      staffId: 'stf-001',
      staffName: 'Samson Sabbat',
      staffCategory: 'COUNSEL',
      department: 'GENERAL',
      date: new Date().toISOString().split('T')[0],
      dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
      fullDateFormatted: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      clockInTime: '08:15:20 AM',
      locationCategory: 'BENIN_CHAMBERS',
      clockInLocationName: 'Chambers — Benin City Main Office',
      clockInGps: {
        latitude: 6.3350,
        longitude: 5.6037,
        accuracy: 12,
        formattedAddress: 'Midlex Law Firm Chambers, Boundary Rd, GRA Benin City, Edo State',
        capturedAt: new Date().toISOString(),
        isGpsVerified: true,
      },
      clockInSignature: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="50"><text x="10" y="30" font-family="cursive" font-size="20" fill="%23d4af37">S. Sabbat</text></svg>',
      clockInPasskeyVerified: true,
      status: 'PRESENT',
      notes: 'Reviewing property deeds and appellate court briefs',
      deviceSecurityHash: 'MIDLEX-PASSKEY-SECURE-9901',
    },
    {
      id: 'att-502',
      staffId: 'stf-002',
      staffName: 'Omatsuli Joshua',
      staffCategory: 'COUNSEL',
      department: 'LITIGATION',
      date: new Date().toISOString().split('T')[0],
      dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
      fullDateFormatted: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      clockInTime: '08:40:11 AM',
      locationCategory: 'HIGH_COURT',
      clockInLocationName: 'High Court of Edo State, Sapele Road Benin City',
      clockInGps: {
        latitude: 6.3385,
        longitude: 5.6189,
        accuracy: 15,
        formattedAddress: 'High Court Complex, High Court 1, Sapele Road, Benin City',
        capturedAt: new Date().toISOString(),
        isGpsVerified: true,
      },
      clockInSignature: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="50"><text x="10" y="30" font-family="cursive" font-size="20" fill="%23d4af37">O. Joshua</text></svg>',
      clockInPasskeyVerified: true,
      status: 'COURT_APPEARANCE',
      notes: 'Hearing in Suit B/144/2025: Edo State Govt vs Apex Logistics',
      deviceSecurityHash: 'MIDLEX-PASSKEY-SECURE-8412',
    },
    {
      id: 'att-503',
      staffId: 'stf-004',
      staffName: 'Victor Software Dev',
      staffCategory: 'SUPPORT_STAFF',
      supportRole: 'Software Developer',
      department: 'ENGINEERING',
      date: new Date().toISOString().split('T')[0],
      dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
      fullDateFormatted: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      clockInTime: '08:55:04 AM',
      locationCategory: 'HOME_REMOTE',
      clockInLocationName: 'Working Remotely (Home Office / Legal Tech Lab)',
      clockInGps: {
        latitude: 6.3402,
        longitude: 5.6110,
        accuracy: 8,
        formattedAddress: 'Remote IT Station, Airport Road, Benin City, Edo State',
        capturedAt: new Date().toISOString(),
        isGpsVerified: true,
      },
      clockInSignature: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="50"><text x="10" y="30" font-family="cursive" font-size="20" fill="%23d4af37">V. Dev</text></svg>',
      clockInPasskeyVerified: true,
      status: 'REMOTE_HOME',
      notes: 'Deploying Midlex HRMS Anti-Proxy Passkey upgrade & Vercel builds',
      deviceSecurityHash: 'MIDLEX-PASSKEY-SECURE-1029',
    },
  ],
  courtAppearances: [
    {
      id: 'crt-01',
      counselId: 'stf-002',
      counselName: 'Omatsuli Joshua',
      caseNumber: 'B/144/2025',
      caseTitle: 'Edo State Government vs Apex Logistics Ltd',
      courtName: 'High Court of Edo State (High Court 1, Benin)',
      date: new Date().toISOString().split('T')[0],
      appearanceType: 'HEARING',
      dailyRate: 25000,
      status: 'VERIFIED',
      verifiedBy: 'HR Director',
      notes: 'Cross-examination of Prosecution Witness 1',
    },
    {
      id: 'crt-02',
      counselId: 'stf-001',
      counselName: 'Samson Sabbat',
      caseNumber: 'CA/B/290/2024',
      caseTitle: 'Chief Obasuyi vs Zenith Realties Ltd',
      courtName: 'Court of Appeal (Benin Judicial Division)',
      date: '2026-10-10',
      appearanceType: 'ARGUMENT',
      dailyRate: 25000,
      status: 'VERIFIED',
      verifiedBy: 'Managing Partner',
      notes: 'Adoption of Appellant brief on commercial land title',
    },
  ],
  reviews: [
    {
      id: 'rev-01',
      staffId: 'stf-001',
      staffName: 'Samson Sabbat',
      reviewPeriod: 'Q3 Evaluation',
      draftingScore: 5,
      courtAdvocacyScore: 5,
      punctualityScore: 5,
      clientSatisfactionScore: 5,
      overallGrade: 'EXCELLENT',
      comments: 'Superb legal leadership in commercial property & general dispute resolution.',
      reviewer: 'HR Director',
      date: '2026-09-15',
    },
  ],
  auditLogs: [
    {
      id: 'aud-01',
      timestamp: 'Today, 08:15 AM',
      action: 'Passkey & GPS Clock-In Verified',
      performedBy: 'Samson Sabbat (Lead Counsel)',
      target: 'Chambers — Benin City Main Office',
      severity: 'INFO',
    },
  ],
};

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'hrms_db.json');

// Initialize database
let memoryDb: DatabaseSchema = defaultDatabase;

try {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    const rawData = fs.readFileSync(DB_FILE, 'utf-8');
    memoryDb = JSON.parse(rawData);
  } else {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDatabase, null, 2), 'utf-8');
    memoryDb = defaultDatabase;
  }
} catch (error) {
  console.warn('Using in-memory database fallback:', error);
  memoryDb = defaultDatabase;
}

export function getDb(): DatabaseSchema {
  return memoryDb;
}

export function saveDb(newDb: DatabaseSchema): void {
  memoryDb = newDb;
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(newDb, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error persisting database to disk:', error);
  }
}
