export type UserRole = 'auditor' | 'coordinator' | 'admin';
export type AuditCategory = 'technical' | 'statutory' | 'safety';
export type AuditStatus = 'open' | 'closed';
export type AuditRemark = 'pending' | 'dealer issue' | 'omc issue' | 'material requirement' | 'fabrication issue' | 'upgradation req' | 'done';
export type LeakageType = 'gas' | 'oil' | 'none';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  zone?: string;
  photoURL?: string;
}

export interface CNGStation {
  id: string;
  name: string;
  zone: string;
  location: {
    latitude: number;
    longitude: number;
  };
  lastAuditDate?: string;
}

export interface AuditPoint {
  id: string;
  stationId: string;
  auditorId: string;
  category: AuditCategory;
  description: string;
  status: AuditStatus;
  remark: AuditRemark;
  photoUrl?: string;
  createdAt: string;
  closedAt?: string;
  closedBy?: string;
  forwardedAt?: string;
  forwardedBy?: string;
  isLeakage: boolean;
  leakageType: LeakageType;
}

export interface AuditorLocation {
  auditorId: string;
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
}

export const ZONES = [
  'Western Zone',
  'Central Zone',
  'South Zone',
  'GA3 Zone',
  'GA2 (NMTP Zone)',
  'GA3 (KDAB Zone)'
];
