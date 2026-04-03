import { router, useFocusEffect, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/ui/Screen';
import * as api from '@/src/lib/serverApi';
import { useAuthStore } from '@/src/store/authStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, radius, spacing } from '@/src/theme/tokens';

export default function SettingsScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const email = useAuthStore((s) => s.user?.email);
  const canStaffPortal = useAuthStore((s) => s.user?.canOpenStaffPortal === true);
  const calendarLinked = useAuthStore((s) => s.user?.googleCalendarConnected === true);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const logout = useAuthStore((s) => s.logout);
  const [calendarOpening, setCalendarOpening] = useState(false);
  const [calendarDisconnecting, setCalendarDisconnecting] = useState(false);

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
      void refreshMe();
    }, [refreshMe]),
  );

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
      'Confirmed shifts will stop syncing to your Google Calendar until you connect again.',
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
        {canStaffPortal ? (
          <Row title="Staff portal" onPress={() => router.push('/staff-portal' as Href)} />
        ) : null}
        <Row title="Edit profile" onPress={() => router.push('/profile-edit')} />
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
