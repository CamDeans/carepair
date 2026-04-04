import { router, useFocusEffect, type Href } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/ui/Screen';
import * as api from '@/src/lib/serverApi';
import { useAuthStore } from '@/src/store/authStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, radius, spacing } from '@/src/theme/tokens';

export default function SettingsScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const user = useAuthStore((s) => s.user);
  const email = user?.email;
  const calendarLinked = user?.googleCalendarConnected === true;
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const logout = useAuthStore((s) => s.logout);
  const [calendarOpening, setCalendarOpening] = useState(false);
  const [calendarDisconnecting, setCalendarDisconnecting] = useState(false);
  const [staffPortalAllowed, setStaffPortalAllowed] = useState(false);

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      h1: { ...t.screenTitle, marginBottom: spacing.xs },
      email: { ...t.caption, marginBottom: layout.sectionGap },
      block: {
        borderRadius: radius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surface,
      },
      row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: layout.listRowMinHeight,
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: c.border,
      },
      rowText: { ...t.body },
      chev: { fontSize: 20, color: c.textSubtle, fontWeight: '300' },
      logout: {
        marginTop: spacing.xl,
        textAlign: 'center',
        color: c.danger,
        fontSize: 16,
        fontWeight: '600',
        fontFamily: f.semibold,
      },
    });
  }, [c, f]);

  function Row({ title, onPress }: { title: string; onPress: () => void }) {
    return (
      <Pressable style={styles.row} accessibilityRole="button" accessibilityLabel={title} onPress={onPress}>
        <Text style={styles.rowText}>{title}</Text>
        <Text style={styles.chev}>›</Text>
      </Pressable>
    );
  }

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        await refreshMe();
        try {
          const pm = await api.portalMe();
          setStaffPortalAllowed(pm.canOpenStaffPortal === true);
        } catch {
          setStaffPortalAllowed(false);
        }
      })();
    }, [refreshMe]),
  );

  useEffect(() => {
    const onUrl = ({ url }: { url: string }) => {
      if (url.includes('googleCalendar=connected')) void refreshMe();
    };
    const sub = Linking.addEventListener('url', onUrl);
    void Linking.getInitialURL().then((url) => {
      if (url?.includes('googleCalendar=connected')) void refreshMe();
    });
    return () => sub.remove();
  }, [refreshMe]);

  const connectGoogleCalendar = () => {
    void (async () => {
      setCalendarOpening(true);
      try {
        const { url } = await api.googleCalendarAuthUrl();
        await WebBrowser.openBrowserAsync(url);
        await refreshMe();
      } catch (e) {
        Alert.alert(
          'Google Calendar',
          e instanceof Error ? e.message : 'Not configured on the server or network error.',
        );
      } finally {
        setCalendarOpening(false);
      }
    })();
  };

  const disconnectGoogleCalendar = () => {
    if (calendarDisconnecting) return;
    Alert.alert(
      'Disconnect Google Calendar?',
      'Confirmed shifts will stop syncing to Google, and CareSpace will no longer show your other Google Calendar events until you connect again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setCalendarDisconnecting(true);
              try {
                await api.googleCalendarDisconnect();
                await refreshMe();
              } catch (e) {
                Alert.alert('Google Calendar', e instanceof Error ? e.message : 'Failed to disconnect.');
              } finally {
                setCalendarDisconnecting(false);
              }
            })();
          },
        },
      ],
    );
  };

  const confirmLogout = () => {
    Alert.alert('Log out?', 'You will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await logout();
            router.replace('/');
          })();
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <Text style={styles.h1}>Settings</Text>
      <Text style={styles.email}>{email}</Text>
      <View style={styles.block}>
        {staffPortalAllowed ? (
          <Row title="Staff portal" onPress={() => router.push('/staff-portal' as Href)} />
        ) : null}
        {user?.role === 'valued_tester' ? (
          <Row
            title={`Tester mode: ${user.valuedTesterPersona === 'caregiver' ? 'Caregiver' : 'Family'}`}
            onPress={() => {
              Alert.alert(
                'Switch tester mode',
                'You will need to complete and publish the profile for the other flow. Your listing is hidden until you publish again.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Test as family',
                    onPress: () => {
                      void (async () => {
                        if (user.valuedTesterPersona === 'family') {
                          Alert.alert('Tester mode', 'You are already in the family flow.');
                          return;
                        }
                        try {
                          await api.profilePatchTesterPersona('family');
                          await refreshMe();
                          router.replace('/');
                        } catch (e) {
                          Alert.alert('Could not switch', e instanceof Error ? e.message : 'Try again.');
                        }
                      })();
                    },
                  },
                  {
                    text: 'Test as caregiver',
                    onPress: () => {
                      void (async () => {
                        if (user.valuedTesterPersona === 'caregiver') {
                          Alert.alert('Tester mode', 'You are already in the caregiver flow.');
                          return;
                        }
                        try {
                          await api.profilePatchTesterPersona('caregiver');
                          await refreshMe();
                          router.replace('/');
                        } catch (e) {
                          Alert.alert('Could not switch', e instanceof Error ? e.message : 'Try again.');
                        }
                      })();
                    },
                  },
                ],
              );
            }}
          />
        ) : null}
        <Row title="Edit profile" onPress={() => router.push('/profile-edit')} />
        <Row title="Data & privacy" onPress={() => router.push('/data-privacy' as Href)} />
        <Row title="Subscription" onPress={() => router.push('/subscription')} />
        {calendarLinked ? (
          <Row
            title={calendarDisconnecting ? 'Disconnecting…' : 'Disconnect Google Calendar'}
            onPress={disconnectGoogleCalendar}
          />
        ) : (
          <Row
            title={calendarOpening ? 'Opening Calendar…' : 'Connect Google Calendar'}
            onPress={connectGoogleCalendar}
          />
        )}
        <Row title="Meet-up proposals" onPress={() => router.push('/meetup-proposals' as Href)} />
        <Row title="Notifications" onPress={() => router.push('/notifications-settings')} />
        <Row title="Help & support" onPress={() => router.push('/help')} />
        <Row title="Community guidelines" onPress={() => router.push('/guidelines')} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log out"
        onPress={confirmLogout}
        hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}>
        <Text style={styles.logout}>Log out</Text>
      </Pressable>
    </Screen>
  );
}
