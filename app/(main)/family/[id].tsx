import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View, type TextStyle } from 'react-native';

import { ProfilePhotoGallery } from '@/src/components/ProfilePhotoGallery';
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
  province?: string;
  childrenCount?: number;
  childrenAges?: string;
  childrenNotes?: string;
  pets?: string;
  petDetails?: string;
  scheduleNeeds?: string;
  budgetRangeLabel?: string;
  languagesPreferred?: string;
  specialNeedsSummary?: string;
  householdRoutines?: string;
  carePreferences?: string;
  photoUrls?: string[];
  primaryPhotoIndex?: number;
};

function Section({ title, labelStyle, children }: { title: string; labelStyle: TextStyle; children: ReactNode }) {
  return (
    <View style={{ marginBottom: layout.sectionGap }}>
      <Text style={labelStyle}>{title}</Text>
      {children}
    </View>
  );
}

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
      sectionLabel: t.profileSectionLabel,
      miss: { ...t.bodySecondary },
      heroRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md, alignItems: 'flex-start' },
      leadPhoto: { width: 88, height: 88, borderRadius: radius.lg },
      name: { ...t.sectionTitle, fontSize: 24, lineHeight: 30 },
      meta: { ...t.caption, marginTop: spacing.xs, lineHeight: 20 },
      body: { ...t.body, color: c.text, lineHeight: 24 },
      bodySecondary: { ...t.body, color: c.textSecondary, lineHeight: 24 },
      actions: { gap: spacing.md, marginTop: spacing.lg },
      chip: {
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
        borderRadius: radius.md,
        backgroundColor: c.primaryMuted,
        marginBottom: spacing.sm,
      },
      chipText: { fontSize: 14, fontWeight: '600', color: c.primaryDark },
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
  const galleryUrls = (fm.photoUrls ?? []).map((u) => String(u).trim()).filter(Boolean);
  const loc = [fm.city, fm.province].filter(Boolean).join(', ');
  const kids = fm.childrenCount ?? 0;
  const kidsLabel = `${kids} ${kids === 1 ? 'child' : 'children'}`;

  return (
    <Screen scroll>
      <ProfilePhotoGallery urls={galleryUrls} accessibilityPrefix={fm.displayName ?? 'Family'} />

      <View style={[styles.heroRow, { marginTop: spacing.md }]}>
        <ProfilePhoto
          uri={photoUri}
          style={styles.leadPhoto}
          accessibilityLabel={`${fm.displayName ?? 'Family'} profile photo`}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.name}>{fm.displayName ?? 'Family'}</Text>
          <Text style={styles.meta}>
            {[loc, fm.budgetRangeLabel].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>

      <View style={styles.chip}>
        <Text style={styles.chipText}>{kidsLabel}{fm.childrenAges ? ` · ${fm.childrenAges}` : ''}</Text>
      </View>

      {fm.scheduleNeeds ? (
        <Section title="Schedule & care needs" labelStyle={styles.sectionLabel}>
          <Text style={styles.body}>{fm.scheduleNeeds}</Text>
        </Section>
      ) : null}

      {fm.childrenNotes ? (
        <Section title="About the children" labelStyle={styles.sectionLabel}>
          <Text style={styles.body}>{fm.childrenNotes}</Text>
        </Section>
      ) : null}

      {fm.pets || fm.petDetails ? (
        <Section title="Pets" labelStyle={styles.sectionLabel}>
          <Text style={styles.body}>{[fm.pets, fm.petDetails].filter(Boolean).join('\n\n')}</Text>
        </Section>
      ) : null}

      {fm.carePreferences ? (
        <Section title="Care preferences" labelStyle={styles.sectionLabel}>
          <Text style={styles.body}>{fm.carePreferences}</Text>
        </Section>
      ) : null}

      {fm.specialNeedsSummary ? (
        <Section title="Special considerations" labelStyle={styles.sectionLabel}>
          <Text style={styles.body}>{fm.specialNeedsSummary}</Text>
        </Section>
      ) : null}

      {fm.householdRoutines ? (
        <Section title="Household routines" labelStyle={styles.sectionLabel}>
          <Text style={styles.bodySecondary}>{fm.householdRoutines}</Text>
        </Section>
      ) : null}

      {fm.languagesPreferred ? (
        <Section title="Languages" labelStyle={styles.sectionLabel}>
          <Text style={styles.body}>{fm.languagesPreferred}</Text>
        </Section>
      ) : null}

      <Text style={[styles.bodySecondary, { marginBottom: spacing.md, fontSize: 13 }]}>
        CarePair asks families to upload at least one supporting document before publishing (e.g. utility summary, school or daycare
        correspondence, or other non-sensitive proof of your situation). Uploads are stored securely, may be checked for trust and
        safety only, and are never displayed on this public profile.
      </Text>

      <View style={styles.actions}>
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
        <Button
          title="Schedule meet-up"
          onPress={() =>
            router.push({
              pathname: '/meetup-schedule',
              params: { peerId: id, peerName: fm.displayName ?? '' },
            })
          }
        />
      </View>
    </Screen>
  );
}
