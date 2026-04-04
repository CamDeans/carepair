import { router, useFocusEffect, type Href } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { UserProfileStrip } from '@/src/components/UserProfileStrip';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import * as api from '@/src/lib/serverApi';
import { useAuthStore } from '@/src/store/authStore';
import type { AppearancePreference } from '@/src/store/uiPreferencesStore';
import { useUiPreferencesStore } from '@/src/store/uiPreferencesStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, radius, spacing } from '@/src/theme/tokens';

export default function SettingsScreen() {
  const { colors: c, fonts: f, appearance, setAppearance } = useCarePairUi();
  const user = useAuthStore((s) => s.user);
  const email = user?.email;
  const calendarLinked = user?.googleCalendarConnected === true;
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const logout = useAuthStore((s) => s.logout);
  const showDiscoverMap = useUiPreferencesStore((s) => s.showDiscoverMap);
  const setShowDiscoverMap = useUiPreferencesStore((s) => s.setShowDiscoverMap);
  const [calendarOpening, setCalendarOpening] = useState(false);
  const [calendarDisconnecting, setCalendarDisconnecting] = useState(false);
  const [staffPortalAllowed, setStaffPortalAllowed] = useState(false);
  const [radiusKm, setRadiusKm] = useState(String(user?.searchRadiusKm ?? 25));
  const [radiusSaving, setRadiusSaving] = useState(false);

  useEffect(() => {
    setRadiusKm(String(user?.searchRadiusKm ?? 25));
  }, [user?.searchRadiusKm]);

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      h1: { ...t.screenTitle, marginBottom: spacing.sm },
      email: { ...t.caption, marginBottom: spacing.md },
      section: {
        ...t.caption,
        fontWeight: '600',
        fontFamily: f.semibold,
        marginBottom: spacing.sm,
        marginTop: spacing.md,
        color: c.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        fontSize: 12,
      },
      block: {
        borderRadius: radius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surface,
        marginBottom: spacing.md,
        shadowColor: c.shadowInk,
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
      },
      pad: { padding: spacing.lg },
      segRow: { flexDirection: 'row', gap: spacing.sm },
      segBtn: {
        flex: 1,
        paddingVertical: spacing.sm + 2,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: c.border,
        alignItems: 'center',
        backgroundColor: c.surfaceMuted,
      },
      segBtnOn: {
        borderColor: c.primary,
        backgroundColor: c.primaryMuted,
      },
      segLabel: { ...t.caption, fontWeight: '600', fontFamily: f.semibold, fontSize: 13 },
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
      rowLast: { borderBottomWidth: 0 },
      rowText: { ...t.body, flex: 1, paddingRight: spacing.md },
      chev: { fontSize: 20, color: c.textSubtle, fontWeight: '300' },
      logout: {
        marginTop: spacing.xl,
        textAlign: 'center',
        color: c.danger,
        fontSize: 16,
        fontWeight: '600',
        fontFamily: f.semibold,
      },
      radiusSave: { marginTop: spacing.md },
    });
  }, [c, f]);

  function Row({ title, onPress, last }: { title: string; onPress: () => void; last?: boolean }) {
    return (
      <Pressable
        style={[styles.row, last && styles.rowLast]}
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={onPress}>
        <Text style={styles.rowText}>{title}</Text>
        <Text style={styles.chev}>›</Text>
      </Pressable>
    );
  }

  const setSeg = (a: AppearancePreference) => () => setAppearance(a);

  const saveRadius = () => {
    void (async () => {
      const coords = user?.location?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) {
        Alert.alert('Location', 'Add your location in Edit profile, then you can save radius here.');
        return;
      }
      const lng = Number(coords[0]);
      const lat = Number(coords[1]);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        Alert.alert('Location', 'Add your location in Edit profile first.');
        return;
      }
      const r = Math.min(200, Math.max(1, parseFloat(radiusKm) || 25));
      setRadiusSaving(true);
      try {
        const tz = user?.calendarTimeZone?.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone;
        await api.profileLocation(lng, lat, r, tz);
        await refreshMe();
      } catch (e) {
        Alert.alert('Discover radius', e instanceof Error ? e.message : 'Could not save');
      } finally {
        setRadiusSaving(false);
      }
    })();
  };

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
        Alert.alert('Google Calendar', e instanceof Error ? e.message : 'Something went wrong. Try again.');
      } finally {
        setCalendarOpening(false);
      }
    })();
  };

  const disconnectGoogleCalendar = () => {
    if (calendarDisconnecting) return;
    Alert.alert(
      'Disconnect Google Calendar?',
      'Shifts will stop syncing to Google until you connect again.',
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
      <UserProfileStrip />
      {email ? <Text style={styles.email}>{email}</Text> : null}

      <Text style={styles.section}>Appearance</Text>
      <View style={styles.block}>
        <View style={[styles.pad, { paddingBottom: spacing.md }]}>
          <View style={styles.segRow}>
            <Pressable
              style={[styles.segBtn, appearance === 'system' && styles.segBtnOn]}
              onPress={setSeg('system')}
              accessibilityRole="button"
              accessibilityLabel="Match system theme"
              accessibilityState={{ selected: appearance === 'system' }}>
              <Text style={styles.segLabel}>System</Text>
            </Pressable>
            <Pressable
              style={[styles.segBtn, appearance === 'light' && styles.segBtnOn]}
              onPress={setSeg('light')}
              accessibilityRole="button"
              accessibilityLabel="Light theme"
              accessibilityState={{ selected: appearance === 'light' }}>
              <Text style={styles.segLabel}>Light</Text>
            </Pressable>
            <Pressable
              style={[styles.segBtn, appearance === 'dark' && styles.segBtnOn]}
              onPress={setSeg('dark')}
              accessibilityRole="button"
              accessibilityLabel="Dark theme"
              accessibilityState={{ selected: appearance === 'dark' }}>
              <Text style={styles.segLabel}>Dark</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <Text style={styles.section}>Discover</Text>
      <View style={styles.block}>
        <View style={styles.row}>
          <Text style={styles.rowText}>Show map on Discover</Text>
          <Switch
            value={showDiscoverMap}
            onValueChange={setShowDiscoverMap}
            trackColor={{ true: c.primaryMuted, false: c.border }}
            thumbColor={c.surface}
          />
        </View>
        <View style={[styles.pad, styles.rowLast, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}>
          <TextField
            label="Search radius (km)"
            value={radiusKm}
            onChangeText={setRadiusKm}
            keyboardType="decimal-pad"
          />
          <View style={styles.radiusSave}>
            <Button title={radiusSaving ? 'Saving…' : 'Save radius'} onPress={saveRadius} disabled={radiusSaving} />
          </View>
        </View>
      </View>

      <Text style={styles.section}>Account</Text>
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
        {user?.role === 'admin' || user?.role === 'team' ? (
          <Row title="Service status" onPress={() => router.push('/system-health' as Href)} />
        ) : null}
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
        <Row title="Community guidelines" onPress={() => router.push('/guidelines')} last />
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
