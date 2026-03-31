import * as Notifications from 'expo-notifications';
import type { Href, Router } from 'expo-router';

/** Dedupe cold-start + listener firing for the same notification. */
const handledNotificationIds = new Set<string>();
const MAX_HANDLED = 48;

function rememberHandled(id: string) {
  handledNotificationIds.add(id);
  while (handledNotificationIds.size > MAX_HANDLED) {
    const first = handledNotificationIds.values().next().value;
    if (first) handledNotificationIds.delete(first);
  }
}

function extractConversationId(data: Record<string, unknown> | undefined): string | null {
  const raw = data?.conversationId;
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

/** Expo Router path, e.g. `/staff-portal` or `/staff-portal/team-access`. */
function extractDeepLinkPath(data: Record<string, unknown> | undefined): string | null {
  const raw = data?.deepLink;
  if (typeof raw !== 'string' || raw.length < 2) return null;
  if (!raw.startsWith('/')) return null;
  return raw;
}

function wantsStaffPortalShortcut(data: Record<string, unknown> | undefined): boolean {
  const v = data?.staffPortal;
  return v === '1' || v === 'true' || v === true;
}

function handleNotificationOpen(router: Router, response: Notifications.NotificationResponse | null) {
  if (!response) return;
  const nid = response.notification.request.identifier;
  if (handledNotificationIds.has(nid)) return;

  const data = response.notification.request.content.data as Record<string, unknown>;

  const path = extractDeepLinkPath(data);
  if (path) {
    rememberHandled(nid);
    router.push(path as Href);
    return;
  }
  if (wantsStaffPortalShortcut(data)) {
    rememberHandled(nid);
    router.push('/staff-portal' as Href);
    return;
  }

  const cid = extractConversationId(data);
  if (!cid) return;

  rememberHandled(nid);
  router.push(`/conversation/${cid}` as Href);
}

/**
 * When the user opens a push (tap or cold start), route by notification `data`:
 * - `deepLink`: absolute in-app path starting with `/` (e.g. `/staff-portal`, `/staff-portal/team-access`)
 * - `staffPortal`: `"1"` or `"true"` → `/staff-portal`
 * - `conversationId`: opens that thread (see server `sendPushToUser`)
 *
 * Priority: `deepLink`, then `staffPortal`, then `conversationId`.
 */
export function subscribePushNotificationDeepLinks(router: Router): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    handleNotificationOpen(router, response);
  });

  void Notifications.getLastNotificationResponseAsync().then((r) => handleNotificationOpen(router, r));

  return () => sub.remove();
}

/** @deprecated Use `subscribePushNotificationDeepLinks` (same behavior, wider routing). */
export const subscribeConversationNotificationDeepLinks = subscribePushNotificationDeepLinks;
