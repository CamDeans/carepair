import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import * as api from '@/src/lib/serverApi';
import { useAuthStore } from '@/src/store/authStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { spacing } from '@/src/theme/tokens';

export default function ProfileEditScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const user = useAuthStore((s) => s.user);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const role = user?.role;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        h1: { fontSize: 22, fontWeight: '800', color: c.text, marginBottom: spacing.md, fontFamily: f.semibold },
      }),
    [c, f],
  );

  const [familyDisplayName, setFamilyDisplayName] = useState('');
  const [familyCity, setFamilyCity] = useState('');
  const [familySchedule, setFamilySchedule] = useState('');
  const [familyBudgetLabel, setFamilyBudgetLabel] = useState('');

  const [cgDisplayName, setCgDisplayName] = useState('');
  const [cgCity, setCgCity] = useState('');
  const [cgBio, setCgBio] = useState('');
  const [cgPayLabel, setCgPayLabel] = useState('');

  useEffect(() => {
    const fp = user?.familyProfile as Record<string, unknown> | null | undefined;
    if (fp) {
      setFamilyDisplayName(String(fp.displayName ?? ''));
      setFamilyCity(String(fp.city ?? ''));
      setFamilySchedule(String(fp.scheduleNeeds ?? ''));
      setFamilyBudgetLabel(String(fp.budgetRangeLabel ?? ''));
    }
    const cp = user?.caregiverProfile as Record<string, unknown> | null | undefined;
    if (cp) {
      setCgDisplayName(String(cp.displayName ?? ''));
      setCgCity(String(cp.city ?? ''));
      setCgBio(String(cp.bio ?? ''));
      setCgPayLabel(String(cp.payRangeLabel ?? ''));
    }
  }, [user?.familyProfile, user?.caregiverProfile]);

  const save = async () => {
    try {
      if (role === 'family') {
        await api.profilePatchFamily({
          displayName: familyDisplayName,
          city: familyCity,
          scheduleNeeds: familySchedule,
          budgetRangeLabel: familyBudgetLabel,
        });
      } else if (role === 'caregiver') {
        await api.profilePatchCaregiver({
          displayName: cgDisplayName,
          city: cgCity,
          bio: cgBio,
          payRangeLabel: cgPayLabel,
        });
      }
      await refreshMe();
      router.back();
    } catch (e) {
      Alert.alert('Profile', e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.h1}>Edit profile</Text>
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
