import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { ProfilePhoto } from '@/src/components/ui/ProfilePhoto';
import { Screen } from '@/src/components/ui/Screen';
import { pickProfilePhotoUri } from '@/src/lib/profilePhoto';
import * as api from '@/src/lib/serverApi';
import { useAuthStore } from '@/src/store/authStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, radius, spacing } from '@/src/theme/tokens';

type FmProfile = {
  displayName?: string;
  city?: string;
  scheduleNeeds?: string;
  childrenCount?: number;
  budgetRangeLabel?: string;
  photoUrls?: string[];
  primaryPhotoIndex?: number;
};

export default function FamilyDetailScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const { id } = useLocalSearchParams<{ id: string }>();
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const savedIds = useAuthStore((s) => s.user?.savedUserIds ?? []);

  const [loading, setLoading] = useState(true);
  const [fm, setFm] = useState<FmProfile | null>(null);

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      miss: { ...t.bodySecondary },
      header: { flexDirection: 'row', gap: layout.sectionGap - spacing.sm, marginBottom: layout.sectionGap - spacing.sm },
      photo: { width: 96, height: 96, borderRadius: radius.lg },
      name: { ...t.sectionTitle, fontSize: 22, lineHeight: 28 },
      meta: { ...t.caption, marginTop: spacing.xs },
      bio: { ...t.body, marginBottom: layout.sectionGap },
    });
  }, [c, f]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { user } = await api.getUserProfile(id);
        if (!cancelled && user.familyProfile && typeof user.familyProfile === 'object') {
          setFm(user.familyProfile as FmProfile);
        } else if (!cancelled) setFm(null);
      } catch {
        if (!cancelled) setFm(null);
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

  if (!fm) {
    return (
      <Screen>
        <Text style={styles.miss}>Profile not found.</Text>
      </Screen>
    );
  }

  const photoUri = pickProfilePhotoUri({
    photoUrls: fm.photoUrls,
    primaryPhotoIndex: fm.primaryPhotoIndex,
  });
  const kids = fm.childrenCount ?? 0;

  return (
    <Screen scroll>
      <View style={styles.header}>
        <ProfilePhoto
          uri={photoUri}
          style={styles.photo}
          accessibilityLabel={`${fm.displayName ?? 'Family'} profile photo`}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{fm.displayName ?? 'Family'}</Text>
          <Text style={styles.meta}>
            {fm.city ?? ''} · {kids} {kids === 1 ? 'child' : 'children'} · {fm.budgetRangeLabel ?? ''}
          </Text>
        </View>
      </View>
      <Text style={styles.bio}>{fm.scheduleNeeds ?? ''}</Text>
      <Button title={saved ? 'Saved' : 'Save to favourites'} variant={saved ? 'secondary' : 'primary'} onPress={() => void toggleSaved()} />
      <Button title="Message" variant="secondary" onPress={() => void openChat()} />
      <Button
        title="Send connection request"
        variant="ghost"
        onPress={() =>
          router.push({
            pathname: '/connection-request',
            params: { peerId: id, peerName: fm.displayName ?? 'Family', peerRole: 'family' },
          })
        }
      />
      <Button title="Schedule meet-up" onPress={() => router.push({ pathname: '/meetup-schedule', params: { peerName: fm.displayName ?? '' } })} />
    </Screen>
  );
}
