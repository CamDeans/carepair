import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { PhotoSlotsRow } from '@/src/components/ui/PhotoSlotsRow';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import * as api from '@/src/lib/serverApi';
import { useAuthStore } from '@/src/store/authStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, radius, spacing } from '@/src/theme/tokens';

function readPhotoUrls(profile: Record<string, unknown> | null | undefined): string[] {
  if (!profile) return [];
  const raw = profile.photoUrls;
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
}

export default function ProfileEditScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const user = useAuthStore((s) => s.user);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const role = user?.role;

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      h1: { ...t.sectionTitle, marginBottom: spacing.sm },
      photoHint: { ...t.caption, marginBottom: spacing.md },
      primaryRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
      chip: {
        paddingVertical: spacing.xs + 2,
        paddingHorizontal: spacing.md,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surface,
      },
      chipOn: { borderColor: c.primary, backgroundColor: c.primaryMuted },
      chipText: { ...t.caption, fontWeight: '600' },
      chipTextOn: { color: c.primaryDark },
    });
  }, [c, f]);

  const profilePhotos = useMemo(() => {
    if (role === 'family') return readPhotoUrls(user?.familyProfile ?? undefined);
    if (role === 'caregiver') return readPhotoUrls(user?.caregiverProfile ?? undefined);
    return [];
  }, [role, user?.familyProfile, user?.caregiverProfile]);

  const [familyDisplayName, setFamilyDisplayName] = useState('');
  const [familyCity, setFamilyCity] = useState('');
  const [familySchedule, setFamilySchedule] = useState('');
  const [familyBudgetLabel, setFamilyBudgetLabel] = useState('');

  const [cgDisplayName, setCgDisplayName] = useState('');
  const [cgCity, setCgCity] = useState('');
  const [cgBio, setCgBio] = useState('');
  const [cgPayLabel, setCgPayLabel] = useState('');
  const [primaryPhotoIndex, setPrimaryPhotoIndex] = useState(0);

  useEffect(() => {
    if (role === 'family') {
      const fp = user?.familyProfile as Record<string, unknown> | null | undefined;
      if (fp) {
        setFamilyDisplayName(String(fp.displayName ?? ''));
        setFamilyCity(String(fp.city ?? ''));
        setFamilySchedule(String(fp.scheduleNeeds ?? ''));
        setFamilyBudgetLabel(String(fp.budgetRangeLabel ?? ''));
        const pi = fp.primaryPhotoIndex;
        setPrimaryPhotoIndex(typeof pi === 'number' && pi >= 0 ? pi : 0);
      }
    } else if (role === 'caregiver') {
      const cp = user?.caregiverProfile as Record<string, unknown> | null | undefined;
      if (cp) {
        setCgDisplayName(String(cp.displayName ?? ''));
        setCgCity(String(cp.city ?? ''));
        setCgBio(String(cp.bio ?? ''));
        setCgPayLabel(String(cp.payRangeLabel ?? ''));
        const pi = cp.primaryPhotoIndex;
        setPrimaryPhotoIndex(typeof pi === 'number' && pi >= 0 ? pi : 0);
      }
    }
  }, [role, user?.familyProfile, user?.caregiverProfile]);

  const save = async () => {
    try {
      if (role === 'family') {
        await api.profilePatchFamily({
          displayName: familyDisplayName,
          city: familyCity,
          scheduleNeeds: familySchedule,
          budgetRangeLabel: familyBudgetLabel,
          ...(profilePhotos.length > 0 ? { primaryPhotoIndex } : {}),
        });
      } else if (role === 'caregiver') {
        await api.profilePatchCaregiver({
          displayName: cgDisplayName,
          city: cgCity,
          bio: cgBio,
          payRangeLabel: cgPayLabel,
          ...(profilePhotos.length > 0 ? { primaryPhotoIndex } : {}),
        });
      }
      await refreshMe();
      Alert.alert('Saved', 'Your profile was updated.');
      router.back();
    } catch (e) {
      Alert.alert('Profile', e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.h1}>Edit profile</Text>
      {role === 'family' || role === 'caregiver' ? (
        <>
          <Text style={styles.photoHint}>Your photos — dashed slots stay empty until you add more (e.g. during setup).</Text>
          <PhotoSlotsRow
            urls={profilePhotos}
            maxSlots={4}
            slotSize={80}
            borderRadius={radius.lg}
            gap={spacing.md}
          />
          {profilePhotos.length > 0 ? (
            <View style={styles.primaryRow}>
              <Text style={styles.photoHint}>Main photo on Discover:</Text>
              {profilePhotos.map((_, i) => (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityLabel={`Set photo ${i + 1} as main`}
                  onPress={() => setPrimaryPhotoIndex(i)}
                  style={[styles.chip, i === primaryPhotoIndex && styles.chipOn]}>
                  <Text style={[styles.chipText, i === primaryPhotoIndex && styles.chipTextOn]}>{i + 1}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <Text style={[styles.photoHint, { marginBottom: layout.sectionGap }]}>Details below.</Text>
        </>
      ) : null}
      {role === 'family' ? (
        <>
          <TextField label="Name" value={familyDisplayName} onChangeText={setFamilyDisplayName} />
          <TextField label="City" value={familyCity} onChangeText={setFamilyCity} />
          <TextField label="Schedule needs" value={familySchedule} onChangeText={setFamilySchedule} multiline />
          <TextField label="Budget label" value={familyBudgetLabel} onChangeText={setFamilyBudgetLabel} />
        </>
      ) : (
        <>
          <TextField label="Name" value={cgDisplayName} onChangeText={setCgDisplayName} />
          <TextField label="City" value={cgCity} onChangeText={setCgCity} />
          <TextField label="Bio" value={cgBio} onChangeText={setCgBio} multiline />
          <TextField label="Pay range label" value={cgPayLabel} onChangeText={setCgPayLabel} />
        </>
      )}
      <Button title="Save" onPress={() => void save()} />
    </Screen>
  );
}
