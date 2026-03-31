import { router } from 'expo-router';
import * as Google from 'expo-auth-session/providers/google';
import { useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { getGoogleAndroidClientId, getGoogleIosClientId, getGoogleWebClientId } from '@/src/lib/config';
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
    if (response?.type !== 'success') return;
    const idToken = response.params.id_token;
    if (typeof idToken !== 'string' || idToken.length < 20) return;
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
        Alert.alert('Google sign-in', e instanceof Error ? e.message : 'Failed');
      }
    })();
  }, [response, flow, signupRole, loginWithGoogleIdToken]);

  return (
    <Button
      title={flow === 'signup' ? 'Continue with Google' : 'Sign in with Google'}
      variant="secondary"
      disabled={!request || disabled}
      onPress={() => void promptAsync()}
    />
  );
}
