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

type CgProfile = {
  displayName?: string;
  city?: string;
  province?: string;
  bio?: string;
  yearsExperience?: number;
  yearsExperienceLabel?: string;
  certificationsSummary?: string;
  specializations?: string;
  firstAidCpr?: boolean;
  vulnerableSectorCheck?: boolean;
  referencesSummary?: string;
  availabilitySummary?: string;
  payRangeLabel?: string;
  education?: string;
  languages?: string;
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

function Badge({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <View style={{ paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.md, backgroundColor: bg }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: fg }}>{label}</Text>
    </View>
  );
}

export default function CaregiverDetailScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const { id } = useLocalSearchParams<{ id: string }>();
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const savedIds = useAuthStore((s) => s.user?.savedUserIds ?? []);
  const [loading, setLoading] = useState(true);
  const [cg, setCg] = useState<CgProfile | null>(null);

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
      badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    });
  }, [c, f]);

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

  const photoUri = pickProfilePhotoUri({
    photoUrls: cg.photoUrls,
    primaryPhotoIndex: cg.primaryPhotoIndex,
  });
  const galleryUrls = (cg.photoUrls ?? []).map((u) => String(u).trim()).filter(Boolean);
  const loc = [cg.city, cg.province].filter(Boolean).join(', ');
  const expLine = [cg.yearsExperience != null ? `${cg.yearsExperience}+ yrs` : null, cg.yearsExperienceLabel].filter(Boolean).join(' · ');

  return (
    <Screen scroll>
      <ProfilePhotoGallery urls={galleryUrls} accessibilityPrefix={cg.displayName ?? 'Caregiver'} />

      <View style={[styles.heroRow, { marginTop: spacing.md }]}>
        <ProfilePhoto
          uri={photoUri}
          style={styles.leadPhoto}
          accessibilityLabel={`${cg.displayName ?? 'Caregiver'} profile photo`}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.name}>{cg.displayName ?? 'Caregiver'}</Text>
          <Text style={styles.meta}>
            {[loc, cg.payRangeLabel].filter(Boolean).join(' · ')}
          </Text>
          {expLine ? <Text style={styles.meta}>{expLine}</Text> : null}
        </View>
      </View>

      <View style={styles.badgeRow}>
        {cg.firstAidCpr ? <Badge label="First aid / CPR" bg={c.primaryMuted} fg={c.primaryDark} /> : null}
        {cg.vulnerableSectorCheck ? <Badge label="Vulnerable sector check" bg={c.primaryMuted} fg={c.primaryDark} /> : null}
      </View>

      {cg.bio ? (
        <Section title="About" labelStyle={styles.sectionLabel}>
          <Text style={styles.body}>{cg.bio}</Text>
        </Section>
      ) : null}

      {cg.specializations ? (
        <Section title="Specializations" labelStyle={styles.sectionLabel}>
          <Text style={styles.body}>{cg.specializations}</Text>
        </Section>
      ) : null}

      {cg.certificationsSummary ? (
        <Section title="Certifications & training" labelStyle={styles.sectionLabel}>
          <Text style={styles.body}>{cg.certificationsSummary}</Text>
        </Section>
      ) : null}

      {cg.availabilitySummary ? (
        <Section title="Availability" labelStyle={styles.sectionLabel}>
          <Text style={styles.body}>{cg.availabilitySummary}</Text>
        </Section>
      ) : null}

      {(cg.education || cg.languages) ? (
        <Section title="Education & languages" labelStyle={styles.sectionLabel}>
          {cg.education ? <Text style={styles.body}>{cg.education}</Text> : null}
          {cg.languages ? <Text style={[styles.bodySecondary, { marginTop: spacing.xs }]}>Languages: {cg.languages}</Text> : null}
        </Section>
      ) : null}

      {cg.referencesSummary ? (
        <Section title="References" labelStyle={styles.sectionLabel}>
          <Text style={styles.bodySecondary}>{cg.referencesSummary}</Text>
        </Section>
      ) : null}

      <Text style={[styles.bodySecondary, { marginBottom: spacing.md, fontSize: 13 }]}>
        Verification documents are reviewed by CarePair and are not shown on this public profile.
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
              params: { peerId: id, peerName: cg.displayName ?? 'Caregiver', peerRole: 'caregiver' },
            })
          }
        />
        <Button
          title="Schedule meet-up"
          onPress={() =>
            router.push({
              pathname: '/meetup-schedule',
              params: { peerId: id, peerName: cg.displayName ?? '' },
            })
          }
        />
      </View>
    </Screen>
  );
}
