import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { SwipeDeck } from '@/src/components/SwipeDeck';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { isGoogleMapsAndroidConfigured } from '@/src/lib/config';
import { getReactNativeMaps } from '@/src/lib/nativeMaps';
import type { DiscoverCardDto } from '@/src/lib/serverApi';
import * as api from '@/src/lib/serverApi';
import { useAuthStore } from '@/src/store/authStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { radius, spacing } from '@/src/theme/tokens';

export default function DiscoverScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        h1: {
          fontSize: 28,
          fontWeight: '600',
          color: c.text,
          fontFamily: f.semibold,
          letterSpacing: -0.56,
        },
        sub: {
          fontSize: 14,
          color: c.textSecondary,
          marginVertical: spacing.sm,
          lineHeight: 20,
          fontFamily: f.regular,
        },
        mapWrap: { height: 180, borderRadius: radius.md, overflow: 'hidden', marginBottom: spacing.md },
        map: { flex: 1 },
        mapPh: {
          flex: 1,
          textAlign: 'center',
          padding: spacing.lg,
          color: c.textSecondary,
          fontFamily: f.regular,
        },
        mapsHint: {
          fontSize: 12,
          color: c.textSecondary,
          marginBottom: spacing.sm,
          lineHeight: 18,
          fontFamily: f.regular,
        },
        label: {
          fontSize: 14,
          fontWeight: '600',
          color: c.text,
          marginBottom: spacing.xs,
          fontFamily: f.semibold,
        },
        input: {
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: radius.sm,
          padding: spacing.sm,
          marginBottom: spacing.sm,
          backgroundColor: c.surface,
          color: c.text,
          fontFamily: f.regular,
        },
        actions: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.md, flexWrap: 'wrap' },
      }),
    [c, f],
  );

  const maps = useMemo(() => getReactNativeMaps(), []);
  const MapView = maps?.default;
  const Circle = maps?.Circle;
  const Marker = maps?.Marker;

  const refreshMe = useAuthStore((s) => s.refreshMe);
  const user = useAuthStore((s) => s.user);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState(String(user?.searchRadiusKm ?? 25));
  const [stack, setStack] = useState<DiscoverCardDto[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!coords) return;
    setLoading(true);
    try {
      const r = parseFloat(radiusKm) || 25;
      const { results } = await api.discoverCandidates(coords.lat, coords.lng, r, 40);
      setStack(results);
    } catch (e) {
      Alert.alert('Discover', e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [coords, radiusKm]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location', 'Enable location to find caregivers or families near you.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    })();
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const current = stack[0] ?? null;

  const onSwipe = async (liked: boolean) => {
    if (!current) return;
    try {
      const { matched } = await api.swipeUser(current.id, liked);
      if (matched) {
        Alert.alert("It's a match!", 'You can now message each other from the Messages tab.');
      }
      setStack((s) => s.slice(1));
    } catch (e) {
      Alert.alert('Swipe', e instanceof Error ? e.message : 'Failed');
    }
  };

  const onHeart = async () => {
    if (!current) return;
    try {
      await api.profileSavedToggle(current.id);
      await refreshMe();
      Alert.alert('Saved', 'Added to your Saved list.');
    } catch (e) {
      Alert.alert('Save', e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.h1}>Discover</Text>
      <Text style={styles.sub}>Swipe right to connect, left to pass. Heart saves without matching.</Text>

      <View style={styles.mapWrap}>
        {coords && MapView && Circle && Marker ? (
          <MapView
            style={styles.map}
            region={{
              latitude: coords.lat,
              longitude: coords.lng,
              latitudeDelta: 0.12,
              longitudeDelta: 0.12,
            }}>
            <Marker coordinate={{ latitude: coords.lat, longitude: coords.lng }} title="You" />
            <Circle
              center={{ latitude: coords.lat, longitude: coords.lng }}
              radius={(parseFloat(radiusKm) || 25) * 1000}
              strokeColor={c.primary}
              fillColor={c.mapSearchRadiusFill}
            />
          </MapView>
        ) : coords && !MapView ? (
          <Text style={styles.mapPh}>
            Map preview is unavailable in Expo Go. Use a development build for the map, or keep swiping — discovery still works.
          </Text>
        ) : (
          <Text style={styles.mapPh}>Waiting for location…</Text>
        )}
      </View>
      {Platform.OS === 'android' && !isGoogleMapsAndroidConfigured() ? (
        <Text style={styles.mapsHint}>
          For Google basemaps on Android release builds, set GOOGLE_MAPS_ANDROID_API_KEY before prebuild (see .env.example).
        </Text>
      ) : null}

      <Text style={styles.label}>Search radius (km)</Text>
      <TextInput
        style={styles.input}
        value={radiusKm}
        onChangeText={setRadiusKm}
        keyboardType="decimal-pad"
        onEndEditing={() => void load()}
      />
      <Button title={loading ? 'Loading…' : 'Refresh'} onPress={() => void load()} disabled={loading || !coords} />

      {current ? (
        <SwipeDeck
          key={current.id}
          card={current}
          onSwipeLeft={() => void onSwipe(false)}
          onSwipeRight={() => void onSwipe(true)}
        />
      ) : (
        <SwipeDeck card={null} onSwipeLeft={() => {}} onSwipeRight={() => {}} />
      )}

      <View style={styles.actions}>
        <Button title="Pass" variant="secondary" onPress={() => void onSwipe(false)} disabled={!current} />
        <Button title="Heart" variant="secondary" onPress={() => void onHeart()} disabled={!current} />
        <Button title="Like" onPress={() => void onSwipe(true)} disabled={!current} />
      </View>

      {current ? (
        <Button
          title="Open profile"
          variant="ghost"
          onPress={() =>
            router.push(user?.role === 'family' ? `/caregiver/${current.id}` : `/family/${current.id}`)
          }
        />
      ) : null}
    </Screen>
  );
}
