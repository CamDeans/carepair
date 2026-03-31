import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import * as api from '@/src/lib/serverApi';
import { useAuthStore } from '@/src/store/authStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { spacing } from '@/src/theme/tokens';

type CgProfile = {
  displayName?: string;
  city?: string;
  bio?: string;
  yearsExperience?: number;
  payRangeLabel?: string;
  photoUrls?: string[];
  specializations?: string;
};

export default function CaregiverDetailScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const { id } = useLocalSearchParams<{ id: string }>();
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const savedIds = useAuthStore((s) => s.user?.savedUserIds ?? []);
  const [loading, setLoading] = useState(true);
  const [cg, setCg] = useState<CgProfile | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        miss: { fontSize: 16, color: c.textSecondary, fontFamily: f.regular },
        header: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
        photo: { width: 96, height: 96, borderRadius: 16 },
        name: { fontSize: 24, fontWeight: '800', color: c.text, fontFamily: f.semibold },
        meta: { fontSize: 14, color: c.textSecondary, marginTop: 4, fontFamily: f.regular },
        bio: { fontSize: 16, lineHeight: 24, color: c.text, marginBottom: spacing.lg, fontFamily: f.regular },
      }),
    [c, f],
  );

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { user } = await api.getUserProfile(id);
        if (!cancelled && user.caregiverProfile && typeof user.caregiverProfile === 'object') {
          setCg(user.caregiverProfile as CgProfile);
        } else if (!cancelled) setCg(null);
      } catch {
        if (!cancelled) setCg(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const saved = id ? savedIds.includes(id) : false;

  const toggleSaved = useCallback(async () => {
    if (!id) return;
    try {
      await api.profileSavedToggle(id);
      await refreshMe();
    } catch (e) {
      Alert.alert('Save', e instanceof Error ? e.message : 'Failed');
    }
  }, [id, refreshMe]);

  const openChat = useCallback(async () => {
    if (!id) return;
    try {
      const { conversationId } = await api.conversationOpen(id);
      router.push(`/conversation/${conversationId}`);
    } catch (e) {
      Alert.alert('Chat', e instanceof Error ? e.message : 'Match required to message');
    }
  }, [id]);

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={c.primary} />
      </Screen>
    );
  }

  if (!cg) {
    return (
      <Screen>
        <Text style={styles.miss}>Profile not found.</Text>
      </Screen>
    );
  }

  const photoUri = cg.photoUrls?.[0] ?? null;

  return (
    <Screen scroll>
      <View style={styles.header}>
        {photoUri ? <Image source={{ uri: photoUri }} style={styles.photo} /> : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{cg.displayName ?? 'Caregiver'}</Text>
          <Text style={styles.meta}>
            {cg.city ?? ''} · {cg.yearsExperience ?? 0} yrs · {cg.payRangeLabel ?? ''}
          </Text>
        </View>
      </View>
      {cg.specializations ? <Text style={styles.bio}>{cg.specializations}</Text> : null}
      <Text style={styles.bio}>{cg.bio ?? ''}</Text>
      <Button title={saved ? 'Saved' : 'Save to favourites'} variant={saved ? 'secondary' : 'primary'} onPress={() => void toggleSaved()} />
      <Button title="Message" variant="secondary" onPress={() => void openChat()} />
      <Button
        title="Send connection request"
        variant="ghost"
        onPress={() =>
          router.push({
            pathname: '/connection-request',
            params: { peerId: id, peerName: cg.displayName ?? 'Caregiver', peerRole: 'caregiver' },
          })
        }
      />
      <Button title="Schedule meet-up" onPress={() => router.push({ pathname: '/meetup-schedule', params: { peerName: cg.displayName ?? '' } })} />
    </Screen>
  );
}
