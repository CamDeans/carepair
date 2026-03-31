export type UserRole = 'family' | 'caregiver';

/** Staff / tester registration (server allowlists apply). */
export type StaffRegisterRole = 'admin' | 'team' | 'valued_tester';

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface FamilyProfile {
  displayName: string;
  photoUri: string | null;
  city: string;
  childrenCount: number;
  childrenAges: string;
  pets: string;
  scheduleNeeds: string;
  budgetRange: string;
  carePreferences: string;
}

export interface CaregiverProfile {
  displayName: string;
  photoUri: string | null;
  city: string;
  bio: string;
  yearsExperience: string;
  certifications: string;
  specializations: string;
  availabilitySummary: string;
  payRange: string;
}

export interface DiscoverCaregiver {
  id: string;
  displayName: string;
  city: string;
  photoUri: string | null;
  yearsExperience: number;
  payRangeLabel: string;
  compatibility: number;
  snippet: string;
}

export interface DiscoverFamily {
  id: string;
  displayName: string;
  city: string;
  photoUri: string | null;
  childrenSummary: string;
  compatibility: number;
  snippet: string;
}

export type ShiftStatus = 'pending' | 'confirmed' | 'change_requested';

export interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
  status: ShiftStatus;
}

export interface CareNote {
  id: string;
  date: string;
  authorRole: UserRole;
  body: string;
}

export interface ThreadPreview {
  id: string;
  peerName: string;
  peerRole: UserRole;
  lastMessage: string;
  unread: boolean;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  fromMe: boolean;
  body: string;
  createdAt: string;
}
