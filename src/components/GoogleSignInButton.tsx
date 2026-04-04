import { router } from 'expo-router';
import * as Google from 'expo-auth-session/providers/google';
import { useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { getGoogleAndroidClientId, getGoogleIosClientId, getGoogleWebClientId } from '@/src/lib/config';
import { ApiError } from '@/src/lib/http';
import { logger } from '@/src/lib/logger';
import { reportError } from '@/src/lib/reportError';
import { useAuthStore } from '@/src/store/authStore';
import type { UserRole } from '@/src/types/models';

type Props = {
  flow: 'login' | 'signup';
  /** Used for new Google accounts on signup (`/auth/google` role). */
  signupRole?: UserRole;
  disabled?: boolean;
};

/** expo-auth-session requires the platform-specific client id; hooks cannot be conditional. */
function isGoogleAuthReadyForPlatform(): boolean {
  if (Platform.OS === 'ios') return Boolean(getGoogleIosClientId().trim());
  if (Platform.OS === 'android') return Boolean(getGoogleAndroidClientId().trim());
  return Boolean(getGoogleWebClientId().trim());
}

export function GoogleSignInButton(props: Props) {
  if (!isGoogleAuthReadyForPlatform()) {
    return null;
  }
  return <GoogleSignInButtonImpl {...props} />;
}

function GoogleSignInButtonImpl({ flow, signupRole = 'family', disabled = false }: Props) {
  const loginWithGoogleIdToken = useAuthStore((s) => s.loginWithGoogleIdToken);
  const web = getGoogleWebClientId();
  const ios = getGoogleIosClientId();
  const android = getGoogleAndroidClientId();
  const handledKey = useRef<string | null>(null);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: web || undefined,
    iosClientId: ios || undefined,
    androidClientId: android || undefined,
  });

  useEffect(() => {
    if (!response) return;

    if (response.type === 'error') {
      const p = response.params as Record<string, string | undefined>;
      const code = p.error ?? p.error_code;
      const desc = p.error_description;
      const detail = [code, desc].filter(Boolean).join(' — ') || 'Authorization failed';
      logger.warn('Google OAuth provider error', { flow, platform: Platform.OS, code, desc });
      reportError(new Error(`Google OAuth: ${detail}`), {
        flow,
        platform: Platform.OS,
        oauthCode: code,
        oauthDescription: desc,
      });
      Alert.alert('Google sign-in', `${detail}\n\nIf this persists, try again or use email sign-in.`);
      return;
    }

    if (response.type !== 'success') return;

    const idToken = response.params.id_token;
    if (typeof idToken !== 'string' || idToken.length < 20) {
      logger.warn('Google sign-in missing id_token in success response', { flow, platform: Platform.OS });
      reportError(new Error('Google sign-in: missing id_token'), { flow, platform: Platform.OS });
      Alert.alert(
        'Google sign-in',
        'No ID token returned. Check Google client IDs (web / iOS / Android) in your build configuration.',
      );
      return;
    }
    const dedupe = `${idToken.slice(0, 48)}:${flow}:${signupRole}`;
    if (handledKey.current === dedupe) return;
    handledKey.current = dedupe;
    void (async () => {
      try {
        if (flow === 'signup') {
          await loginWithGoogleIdToken(idToken, signupRole);
        } else {
          await loginWithGoogleIdToken(idToken);
        }
        router.replace('/');
      } catch (e) {
        handledKey.current = null;
        const ref =
          e instanceof ApiError && e.meta?.requestId
            ? `\n\nReference: ${e.meta.requestId}\n(Match this in server logs.)`
            : '';
        const verifyHint =
          e instanceof ApiError && e.meta?.verifyError ? `\n\nServer: ${e.meta.verifyError}` : '';
        const message =
          e instanceof Error ? `${e.message}${verifyHint}${ref}` : `Failed${ref}`;
        logger.warn('Google sign-in API error', {
          flow,
          platform: Platform.OS,
          requestId: e instanceof ApiError ? e.meta?.requestId : undefined,
          verifyError: e instanceof ApiError ? e.meta?.verifyError : undefined,
        });
        reportError(e instanceof Error ? e : new Error(String(e)), {
          flow,
          platform: Platform.OS,
          requestId: e instanceof ApiError ? e.meta?.requestId : undefined,
          googleVerifyError: e instanceof ApiError ? e.meta?.verifyError : undefined,
        });
        Alert.alert('Google sign-in', message);
      }
    })();
  }, [response, flow, signupRole, loginWithGoogleIdToken]);

  if (!request) {
    return (
      <Button
        title="Preparing Google sign-in…"
        variant="secondary"
        disabled
        loading
        onPress={() => {}}
      />
    );
  }

  return (
    <Button
      title={flow === 'signup' ? 'Continue with Google' : 'Sign in with Google'}
      variant="secondary"
      disabled={disabled}
      onPress={() => void promptAsync()}
    />
  );
}
