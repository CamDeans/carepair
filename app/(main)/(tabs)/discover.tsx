import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { SwipeDeck } from '@/src/components/SwipeDeck';
import { UserProfileStrip } from '@/src/components/UserProfileStrip';
import { Button } from '@/src/components/ui/Button';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { Screen } from '@/src/components/ui/Screen';
import { hapticImpactLight, hapticImpactMedium } from '@/src/lib/haptics';
import { getReactNativeMaps } from '@/src/lib/nativeMaps';
import type { DiscoverCardDto } from '@/src/lib/serverApi';
import * as api from '@/src/lib/serverApi';
import { useAuthStore } from '@/src/store/authStore';
import { useUiPreferencesStore } from '@/src/store/uiPreferencesStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { radius, spacing } from '@/src/theme/tokens';

export default function DiscoverScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const showDiscoverMap = useUiPreferencesStore((s) => s.showDiscoverMap);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const user = useAuthStore((s) => s.user);

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      h1: { ...t.screenTitle, marginBottom: spacing.md },
      mapWrap: {
        height: 176,
        borderRadius: radius.lg,
        overflow: 'hidden',
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: c.border,
        shadowColor: c.shadowInk,
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      },
      map: { flex: 1 },
      mapPh: {
        flex: 1,
        textAlign: 'center',
        padding: spacing.lg,
        ...t.caption,
        lineHeight: 20,
      },
    });
  }, [c, f]);

  const maps = useMemo(() => getReactNativeMaps(), []);
  const MapView = maps?.default;
  const Circle = maps?.Circle;
  const Marker = maps?.Marker;

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [stack, setStack] = useState<DiscoverCardDto[]>([]);
  const [loading, setLoading] = useState(false);

  const radiusKm = user?.searchRadiusKm ?? 25;

  const load = useCallback(async () => {
    if (!coords) return;
    setLoading(true);
    try {
      const { results } = await api.discoverCandidates(coords.lat, coords.lng, radiusKm, 40);
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
        Alert.alert('Location', 'Allow location to find people near you.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    })();
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void refreshMe();
    }, [refreshMe]),
  );

  const current = stack[0] ?? null;

  const onSwipe = async (liked: boolean) => {
    if (!current) return;
    try {
      const { matched } = await api.swipeUser(current.id, liked);
      void hapticImpactMedium();
      if (matched) {
        Alert.alert("It's a match!", 'You can message each other from Messages.');
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
    } catch (e) {
      Alert.alert('Save', e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <Screen scroll directionalLockIOS>
      <UserProfileStrip />
      <Text style={styles.h1}>Discover</Text>

      {showDiscoverMap ? (
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
                radius={radiusKm * 1000}
                strokeColor={c.primary}
                fillColor={c.mapSearchRadiusFill}
              />
            </MapView>
          ) : coords ? (
            <Text style={styles.mapPh}>Map preview unavailable</Text>
          ) : (
            <Text style={styles.mapPh}>Waiting for location…</Text>
          )}
        </View>
      ) : null}

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
            description="Try again later or widen your radius in Settings."
            primaryAction={{ title: 'Refresh', onPress: () => void load() }}
          />
        ) : (
          <EmptyState title="Waiting for location" description="Allow location when prompted." />
        )}
      </View>

      <View style={{ marginBottom: spacing.lg }}>
        <Button title={loading ? 'Loading…' : 'Refresh'} variant="secondary" onPress={() => void load()} disabled={loading || !coords} />
      </View>
    </Screen>
  );
}
