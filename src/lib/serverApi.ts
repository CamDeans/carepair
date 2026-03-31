import { getAccessToken } from '@/src/lib/authToken';
import { requireApiBase } from '@/src/lib/config';
import type { StaffRegisterRole, UserRole } from '@/src/types/models';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = requireApiBase();
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string>),
  };
  if (!(init?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${base}${path}`, { ...init, headers });
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = { message: text };
    }
  }
  if (!res.ok) {
    const msg =
      typeof data === 'object' && data !== null && 'message' in data
        ? String((data as { message: unknown }).message)
        : res.statusText;
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return data as T;
}

export type MeUser = {
  id: string;
  email: string;
  role: UserRole | StaffRegisterRole;
  profilePublished: boolean;
  subscriptionStatus: string;
  familyProfile: Record<string, unknown> | null;
  caregiverProfile: Record<string, unknown> | null;
  searchRadiusKm?: number;
  location?: { type: string; coordinates: number[] };
  careTrialEndsAt?: string | null;
  savedUserIds?: string[];
  stripeCustomerId?: string;
  googleCalendarConnected?: boolean;
  /** Present when server marks user as DB-only tester (CareSpace bypass). */
  isAdmin?: boolean;
  canOpenStaffPortal?: boolean;
  valuedTesterAccessUntil?: string | null;
};

export type PortalMeResponse = {
  canOpenStaffPortal: boolean;
  staffRole: string | null;
  sections: Record<string, boolean> | null;
  sectionLabels: Record<string, string> | null;
  canManageTeamAccess: boolean;
};

export type TeamPortalAccessResponse = {
  teamSectionAccess: Record<string, boolean>;
  updatedAt?: string;
  updatedByEmail?: string | null;
};

export async function authRegister(email: string, password: string, role: UserRole | StaffRegisterRole) {
  return request<{ token: string; user: MeUser }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, role }),
  });
}

export async function portalMe() {
  return request<PortalMeResponse>('/portal/me');
}

export async function portalTeamAccessGet() {
  return request<TeamPortalAccessResponse>('/portal/team-access');
}

export async function portalTeamAccessPatch(patch: Record<string, boolean>) {
  return request<TeamPortalAccessResponse>('/portal/team-access', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function portalDashboardSummary() {
  return request<{ headline: string; metrics: { label: string; value: number }[] }>('/portal/dashboard-summary');
}

export type PortalActivityLogEntry = {
  id: string;
  createdAt: string;
  action: string;
  actorEmail: string;
  detail: { changes?: Record<string, { from: boolean; to: boolean }> };
};

export async function portalActivityLog(limit = 40) {
  return request<{ entries: PortalActivityLogEntry[] }>(`/portal/activity-log?limit=${limit}`);
}

export async function portalSystemHealth() {
  return request<{ ok: boolean; database: string; nodeEnv: string; serverTime: string }>('/portal/system-health');
}

export type PortalTesterRow = {
  id: string;
  email: string;
  valuedTesterAccessUntil: string | null;
  profilePublished: boolean;
  createdAt: string;
};

export async function portalTesters() {
  return request<{ testers: PortalTesterRow[] }>('/portal/testers');
}

export async function portalRevenueSummary() {
  return request<{
    stripeConfigured: boolean;
    headline: string;
    lines?: string[];
    available?: string;
    pending?: string;
  }>('/portal/revenue-summary');
}

export async function portalPayoutsSummary() {
  return request<{ headline: string; message: string; items: unknown[] }>('/portal/payouts-summary');
}

export async function portalReportsSummary() {
  return request<{ headline: string; rows: { role: string; count: number }[] }>('/portal/reports-summary');
}

export async function portalSettingsSummary() {
  return request<{ headline: string; notes: string[]; valuedTesterMax: number }>('/portal/settings-summary');
}

export async function portalRoadmap() {
  return request<{ items: { status: string; title: string; detail: string }[] }>('/portal/roadmap');
}

export type PortalAnnouncementRow = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  createdByEmail: string;
};

export async function portalAnnouncements() {
  return request<{ announcements: PortalAnnouncementRow[] }>('/portal/announcements');
}

export async function portalUserSupportSearch(q: string) {
  const enc = encodeURIComponent(q);
  return request<{
    results: {
      id: string;
      email: string;
      role: string;
      profilePublished: boolean;
      subscriptionStatus: string;
    }[];
  }>(`/portal/user-support/search?q=${enc}`);
}

export async function authLogin(email: string, password: string) {
  return request<{ token: string; user: MeUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function authGoogle(idToken: string, role?: UserRole) {
  return request<{ token: string; user: MeUser }>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken, role }),
  });
}

export async function authMe() {
  return request<{ user: MeUser }>('/auth/me');
}

export async function profilePatchFamily(patch: Record<string, unknown>) {
  return request<{ familyProfile: Record<string, unknown> }>('/profile/family', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function profilePatchCaregiver(patch: Record<string, unknown>) {
  return request<{ caregiverProfile: Record<string, unknown> }>('/profile/caregiver', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function profileLocation(lng: number, lat: number, searchRadiusKm?: number) {
  return request<{ location: { type: string; coordinates: number[] }; searchRadiusKm: number }>(
    '/profile/location',
    {
      method: 'POST',
      body: JSON.stringify({ lng, lat, searchRadiusKm }),
    },
  );
}

export async function profilePublish() {
  return request<{ profilePublished: boolean }>('/profile/publish', { method: 'POST' });
}

export async function profileSavedList() {
  return request<{ results: DiscoverCardDto[] }>('/profile/saved');
}

export async function profileSavedToggle(targetUserId: string) {
  return request<{ savedUserIds: string[] }>(`/profile/saved/${targetUserId}`, { method: 'POST' });
}

export async function discoverCandidates(lat: number, lng: number, radiusKm?: number, limit?: number) {
  const q = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    ...(radiusKm != null ? { radiusKm: String(radiusKm) } : {}),
    ...(limit != null ? { limit: String(limit) } : {}),
  });
  return request<{ results: DiscoverCardDto[] }>(`/discover?${q}`);
}

export type DiscoverCardDto = {
  id: string;
  role: UserRole;
  displayName?: string;
  city?: string;
  photoUri: string | null;
  snippet: string;
  payRangeLabel: string;
  childrenSummary: string;
  distanceKm: number | null;
};

export async function swipeUser(toUserId: string, liked: boolean) {
  return request<{ ok: boolean; matched: boolean }>('/swipes', {
    method: 'POST',
    body: JSON.stringify({ toUserId, liked }),
  });
}

export async function getUserProfile(userId: string) {
  return request<{ user: { id: string; role: UserRole; familyProfile?: unknown; caregiverProfile?: unknown } }>(
    `/users/${userId}`,
  );
}

export async function uploadFile(uri: string, filename: string, mimeType: string) {
  const base = requireApiBase();
  const token = await getAccessToken();
  const form = new FormData();
  form.append('file', { uri, name: filename, type: mimeType } as unknown as Blob);
  const res = await fetch(`${base}/upload/file`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as { url?: string; message?: string }) : {};
  if (!res.ok) throw new Error(data.message ?? res.statusText);
  return data as { url: string };
}

export type ConversationRow = {
  id: string;
  peerId: string;
  peerName: string;
  lastMessage: string;
  lastMessageAt: string;
  unread?: boolean;
};

export async function conversationsList() {
  return request<{ conversations: ConversationRow[] }>('/conversations');
}

export async function conversationMarkRead(conversationId: string) {
  return request<{ ok: boolean }>(`/conversations/${conversationId}/read`, { method: 'POST' });
}

export async function conversationOpen(peerUserId: string) {
  return request<{ conversationId: string }>(`/conversations/open/${peerUserId}`, { method: 'POST' });
}

export async function messagesList(conversationId: string) {
  return request<{
    messages: { id: string; senderId: string; body: string; createdAt: string }[];
  }>(`/conversations/${conversationId}/messages`);
}

export async function messageSend(conversationId: string, body: string) {
  return request<{ message: { id: string; senderId: string; body: string; createdAt: string } }>(
    `/conversations/${conversationId}/messages`,
    { method: 'POST', body: JSON.stringify({ body }) },
  );
}

export type ShiftDto = {
  id: string;
  familyUserId: string;
  caregiverUserId: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
  status: string;
};

export async function shiftsList() {
  return request<{ shifts: ShiftDto[] }>('/shifts');
}

export async function shiftGet(id: string) {
  return request<{
    shift: {
      id: string;
      familyUserId: string;
      caregiverUserId: string;
      date: string;
      startTime: string;
      endTime: string;
      notes: string;
      status: string;
    };
  }>(`/shifts/${id}`);
}

export async function shiftCreate(payload: {
  caregiverUserId: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
}) {
  return request<{ shift: unknown }>('/shifts', { method: 'POST', body: JSON.stringify(payload) });
}

export type ShiftPatchResponse = {
  shift: { id: string; status: string; date: string; startTime: string; endTime: string; notes: string };
  calendarWarnings?: string[];
};

export async function shiftPatch(
  shiftId: string,
  patch: {
    status?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    notes?: string;
  },
) {
  return request<ShiftPatchResponse>(`/shifts/${shiftId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export type CareNoteRow = {
  id: string;
  date: string;
  authorRole: UserRole;
  body: string;
  authorUserId: string;
};

export async function notesList() {
  return request<{ notes: CareNoteRow[] }>('/notes');
}

export async function noteCreate(otherUserId: string, body: string) {
  return request<{ note: unknown }>('/notes', {
    method: 'POST',
    body: JSON.stringify({ otherUserId, body }),
  });
}

export async function subscriptionTrial() {
  return request<{ careTrialEndsAt: string; subscriptionStatus: string }>('/subscription/trial', {
    method: 'POST',
  });
}

export type CareAccessDto = {
  canUseCareSpace: boolean;
  subscriptionStatus: string;
  careTrialEndsAt: string | null;
};

export async function subscriptionCareAccess() {
  return request<CareAccessDto>('/subscription/care-access');
}

export async function pushRegister(token: string) {
  return request<{ ok: boolean }>('/push/register', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function pushUnregister(token: string) {
  return request<{ ok: boolean }>('/push/unregister', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function stripeCheckoutSession() {
  return request<{ url: string | null }>('/stripe/create-checkout-session', { method: 'POST' });
}

export async function stripePortalSession(returnUrl: string) {
  return request<{ url: string | null }>('/stripe/create-portal-session', {
    method: 'POST',
    body: JSON.stringify({ returnUrl }),
  });
}

export async function googleCalendarAuthUrl() {
  return request<{ url: string }>('/integrations/google/calendar/start', { method: 'GET' });
}

export async function googleCalendarDisconnect() {
  return request<{ ok: boolean }>('/integrations/google/calendar/disconnect', { method: 'DELETE' });
}

export type MatchPeer = { id: string; role: UserRole; displayName: string; city?: string };

export async function matchesList() {
  return request<{ matches: MatchPeer[] }>('/matches');
}
