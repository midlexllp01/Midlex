export type StaffCategory = 'COUNSEL' | 'SUPPORT_STAFF';

export type Department = 'LITIGATION' | 'GENERAL' | 'FINANCE' | 'ADMIN' | 'ENGINEERING';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  staffCategory: StaffCategory;
  supportRole?: string;
  department: Department;
  phone: string;
  basicSalary: number;
  courtAllowanceRate: number;
  dateJoined: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE';
  qualification: string;
  leaveBalance: number;
  securityPasskey?: string;
  loginPassword?: string;
  firstLoginSetupComplete?: boolean;
  signatureData?: string;
}

export interface LeaveRequest {
  id: string;
  staffId: string;
  staffName: string;
  staffCategory: StaffCategory;
  department: string;
  leaveType: 'ANNUAL' | 'SICK' | 'MATERNITY' | 'EXAM' | 'COMPASSIONATE';
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  handoverStaff: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  appliedDate: string;
  hrComment?: string;
  reviewedDate?: string;
  reviewedBy?: string;
}

export interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  formattedAddress: string;
  capturedAt: string;
  isGpsVerified: boolean;
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  staffName: string;
  staffCategory: StaffCategory;
  supportRole?: string;
  department: string;
  
  date: string;
  dayOfWeek: string;
  fullDateFormatted: string;

  clockInTime: string;
  locationCategory: 'HOME_REMOTE' | 'BENIN_CHAMBERS' | 'HIGH_COURT' | 'MAGISTRATE_COURT' | 'APPEAL_COURT' | 'CLIENT_OFFSITE';
  clockInLocationName: string;
  clockInGps: GPSLocation;
  clockInSignature: string;
  clockInPasskeyVerified: boolean;
  clockInLocationPhoto?: string;

  clockOutTime?: string;
  clockOutLocationName?: string;
  clockOutGps?: GPSLocation;
  clockOutSignature?: string;
  clockOutPasskeyVerified?: boolean;
  clockOutLocationPhoto?: string;

  status: 'PRESENT' | 'REMOTE_HOME' | 'COURT_APPEARANCE' | 'LATE';
  notes?: string;
  deviceSecurityHash?: string;
}

export interface CourtAppearance {
  id: string;
  counselId: string;
  counselName: string;
  caseNumber: string;
  caseTitle: string;
  courtName: string;
  date: string;
  appearanceType: 'HEARING' | 'RULING' | 'TRIAL' | 'ARRAIGNMENT' | 'ARGUMENT';
  dailyRate: number;
  status: 'VERIFIED' | 'PENDING_APPROVAL';
  verifiedBy?: string;
  notes?: string;
}

export interface PerformanceReview {
  id: string;
  staffId: string;
  staffName: string;
  reviewPeriod: string;
  draftingScore: number;
  courtAdvocacyScore: number;
  punctualityScore: number;
  clientSatisfactionScore: number;
  overallGrade: 'EXCELLENT' | 'VERY_GOOD' | 'GOOD' | 'NEEDS_IMPROVEMENT';
  comments: string;
  reviewer: string;
  date: string;
}

export interface SystemAuditLog {
  id: string;
  timestamp: string;
  action: string;
  performedBy: string;
  target: string;
  severity: 'INFO' | 'WARNING' | 'ALERT';
}
