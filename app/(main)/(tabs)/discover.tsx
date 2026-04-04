import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { SwipeDeck } from '@/src/components/SwipeDeck';
import { Button } from '@/src/components/ui/Button';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { Screen } from '@/src/components/ui/Screen';
import { hapticImpactLight, hapticImpactMedium } from '@/src/lib/haptics';
import { isGoogleMapsAndroidConfigured } from '@/src/lib/config';
import { getReactNativeMaps } from '@/src/lib/nativeMaps';
import type { DiscoverCardDto } from '@/src/lib/serverApi';
import * as api from '@/src/lib/serverApi';
import { useAuthStore } from '@/src/store/authStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, radius, spacing } from '@/src/theme/tokens';

export default function DiscoverScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      h1: { ...t.screenTitle, marginBottom: spacing.xs },
      sub: { ...t.caption, marginBottom: layout.sectionGap - spacing.xs },
      mapWrap: {
        height: 192,
        borderRadius: radius.lg,
        overflow: 'hidden',
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: c.border,
      },
      map: { flex: 1 },
      mapPh: {
        flex: 1,
        textAlign: 'center',
        padding: spacing.lg,
        ...t.caption,
        lineHeight: 20,
      },
      mapsHint: {
        ...t.caption,
        fontSize: 13,
        marginBottom: spacing.sm,
      },
      label: { ...t.label, marginBottom: spacing.xs },
      input: {
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: 14,
        marginBottom: spacing.md,
        backgroundColor: c.surface,
        color: c.text,
        fontSize: 16,
        minHeight: 48,
        fontFamily: f.regular,
      },
    });
  }, [c, f]);

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
      void hapticImpactMedium();
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
      void hapticImpactLight();
      Alert.alert('Saved', 'Added to your Saved list.');
    } catch (e) {
      Alert.alert('Save', e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <Screen scroll directionalLockIOS>
      <Text style={styles.h1}>Discover</Text>
      <Text style={styles.sub}>
        Swipe right to connect, left to pass. Heart saves without matching. Discovery uses your current GPS position — if location is
        unavailable, open this tab again after granting permission or moving to a clearer signal.
      </Text>

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
            Map preview needs native maps (EAS production or development build). Swiping and discovery still work without the map.
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
      <View style={{ marginBottom: spacing.lg }}>
        <Button title={loading ? 'Loading…' : 'Refresh'} onPress={() => void load()} disabled={loading || !coords} />
      </View>

      <View style={{ marginBottom: spacing.md }}>
        {current ? (
          <SwipeDeck
            key={current.id}
            card={current}
            onSwipeLeft={() => void onSwipe(false)}
            onSwipeRight={() => void onSwipe(true)}
            onHeart={() => void onHeart()}
          />
        ) : loading ? (
          <ActivityIndicator color={c.primary} style={{ marginVertical: spacing.lg }} />
        ) : coords ? (
          <EmptyState
            title="No more profiles nearby"
            description="Widen your search radius, tap Refresh, or check back later."
            primaryAction={{ title: 'Refresh', onPress: () => void load() }}
          />
        ) : (
          <EmptyState
            title="Waiting for location"
            description="Grant location access to load people near you, then pull to refresh this tab."
          />
        )}
      </View>
    </Screen>
  );
}
