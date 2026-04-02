import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { PhotoSlotsRow } from '@/src/components/ui/PhotoSlotsRow';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import * as api from '@/src/lib/serverApi';
import { useAuthStore } from '@/src/store/authStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { radius, spacing } from '@/src/theme/tokens';

const STEPS = ['Basics', 'Experience & pay', 'Safety & references', 'Photos & documents', 'Location', 'Review'] as const;

export default function CaregiverSetupScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const [step, setStep] = useState(0);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [docUrls, setDocUrls] = useState<string[]>([]);
  const [radiusKm, setRadiusKm] = useState('25');
  const [form, setForm] = useState({
    displayName: '',
    phone: '',
    city: 'Calgary',
    province: 'AB',
    postalCode: '',
    bio: '',
    yearsExperience: 0,
    yearsExperienceLabel: '',
    certificationsSummary: '',
    specializations: '',
    firstAidCpr: false,
    vulnerableSectorCheck: false,
    referencesSummary: '',
    availabilitySummary: '',
    payMin: 0,
    payMax: 0,
    payRangeLabel: '',
    education: '',
    languages: '',
  });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        step: {
          fontSize: 14,
          fontWeight: '600',
          color: c.primaryDark,
          marginBottom: spacing.md,
          fontFamily: f.semibold,
        },
        h: { fontWeight: '700', marginBottom: spacing.sm, color: c.text, fontFamily: f.semibold },
        p: { color: c.textSecondary, marginBottom: spacing.md, fontFamily: f.regular },
        r: { color: c.text, marginBottom: spacing.xs, fontFamily: f.regular },
        row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
        row2: { paddingVertical: spacing.sm },
        chk: { fontSize: 16, color: c.text, fontFamily: f.regular },
        flex: { flex: 1 },
      }),
    [c, f],
  );

  const pickAndUpload = async (kind: 'photo' | 'doc') => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.85 });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    try {
      const up = await api.uploadFile(a.uri, 'upload.jpg', a.mimeType ?? 'image/jpeg');
      if (kind === 'photo') setPhotoUrls((p) => [...p, up.url]);
      else setDocUrls((p) => [...p, up.url]);
    } catch (e) {
      Alert.alert('Upload', e instanceof Error ? e.message : 'Failed');
    }
  };

  const savePartial = async () => {
    await api.profilePatchCaregiver({
      ...form,
      yearsExperience: Number(form.yearsExperience) || 0,
      payMin: Number(form.payMin) || 0,
      payMax: Number(form.payMax) || 0,
      photoUrls,
      documentUrls: docUrls,
    });
  };

  const next = async () => {
    try {
      await savePartial();
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    } catch (e) {
      Alert.alert('Save', e instanceof Error ? e.message : 'Failed');
    }
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  const finish = async () => {
    try {
      await savePartial();
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location', 'Location is required to publish.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const r = parseFloat(radiusKm) || 25;
      const calendarTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await api.profileLocation(pos.coords.longitude, pos.coords.latitude, r, calendarTimeZone);
      await api.profilePublish();
      await refreshMe();
      router.replace('/');
    } catch (e) {
      Alert.alert('Publish', e instanceof Error ? e.message : 'Failed');
    }
  };

  const toggle = (key: 'firstAidCpr' | 'vulnerableSectorCheck') => {
    setForm((f) => ({ ...f, [key]: !f[key] }));
  };

  return (
    <Screen scroll>
      <Text style={styles.step}>
        Step {step + 1}/{STEPS.length} — {STEPS[step]}
      </Text>

      {step === 0 && (
        <>
          <TextField label="Your name" value={form.displayName} onChangeText={(t) => setForm({ ...form, displayName: t })} />
          <TextField label="Phone" value={form.phone} onChangeText={(t) => setForm({ ...form, phone: t })} keyboardType="phone-pad" />
          <TextField label="City" value={form.city} onChangeText={(t) => setForm({ ...form, city: t })} />
          <TextField label="Province" value={form.province} onChangeText={(t) => setForm({ ...form, province: t })} />
          <TextField label="Postal code" value={form.postalCode} onChangeText={(t) => setForm({ ...form, postalCode: t })} />
          <TextField label="Bio" value={form.bio} onChangeText={(t) => setForm({ ...form, bio: t })} multiline />
        </>
      )}

      {step === 1 && (
        <>
          <TextField
            label="Years experience (number)"
            value={String(form.yearsExperience)}
            onChangeText={(t) => setForm({ ...form, yearsExperience: parseInt(t, 10) || 0 })}
            keyboardType="numeric"
          />
          <TextField label="Experience label" value={form.yearsExperienceLabel} onChangeText={(t) => setForm({ ...form, yearsExperienceLabel: t })} />
          <TextField label="Certifications" value={form.certificationsSummary} onChangeText={(t) => setForm({ ...form, certificationsSummary: t })} multiline />
          <TextField label="Specializations" value={form.specializations} onChangeText={(t) => setForm({ ...form, specializations: t })} multiline />
          <TextField label="Availability" value={form.availabilitySummary} onChangeText={(t) => setForm({ ...form, availabilitySummary: t })} multiline />
          <TextField label="Pay range label" value={form.payRangeLabel} onChangeText={(t) => setForm({ ...form, payRangeLabel: t })} />
          <TextField label="Education" value={form.education} onChangeText={(t) => setForm({ ...form, education: t })} />
          <TextField label="Languages" value={form.languages} onChangeText={(t) => setForm({ ...form, languages: t })} />
        </>
      )}

      {step === 2 && (
        <>
          <Pressable
            style={styles.row2}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: form.firstAidCpr }}
            accessibilityLabel="First aid and CPR certified"
            onPress={() => toggle('firstAidCpr')}>
            <Text style={styles.chk} importantForAccessibility="no">
              {form.firstAidCpr ? '☑' : '☐'} First aid / CPR
            </Text>
          </Pressable>
          <Pressable
            style={styles.row2}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: form.vulnerableSectorCheck }}
            accessibilityLabel="Vulnerable sector check completed"
            onPress={() => toggle('vulnerableSectorCheck')}>
            <Text style={styles.chk} importantForAccessibility="no">
              {form.vulnerableSectorCheck ? '☑' : '☐'} Vulnerable sector check
            </Text>
          </Pressable>
          <TextField label="References summary" value={form.referencesSummary} onChangeText={(t) => setForm({ ...form, referencesSummary: t })} multiline />
        </>
      )}

      {step === 3 && (
        <>
          <Text style={styles.h}>Profile photos</Text>
          <Text style={styles.p}>
            At least one profile photo and one verification document (certification, ID, or résumé image/PDF) are required
            to publish.
          </Text>
          <PhotoSlotsRow urls={photoUrls} maxSlots={4} slotSize={76} borderRadius={radius.md} />
          <Button title="Add photo" onPress={() => void pickAndUpload('photo')} />
          <Text style={[styles.h, { marginTop: spacing.lg }]}>Documents / certs ({docUrls.length})</Text>
          <Text style={styles.p}>Upload at least one document before publishing.</Text>
          <Button title="Add document" variant="secondary" onPress={() => void pickAndUpload('doc')} />
        </>
      )}

      {step === 4 && (
        <>
          <Text style={styles.p}>Location is captured when you publish.</Text>
          <TextField label="Search radius (km)" value={radiusKm} onChangeText={setRadiusKm} keyboardType="decimal-pad" />
        </>
      )}

      {step === 5 && (
        <View>
          <Text style={styles.r}>{form.displayName} · {form.city}</Text>
          <Text style={styles.r}>{form.yearsExperience} yrs · {form.payRangeLabel}</Text>
        </View>
      )}

      <View style={styles.row}>
        {step > 0 ? <Button title="Back" variant="secondary" onPress={back} style={styles.flex} /> : <View style={styles.flex} />}
        {step < STEPS.length - 1 ? (
          <Button title="Next" onPress={() => void next()} style={styles.flex} disabled={step === 0 && !form.displayName.trim()} />
        ) : (
          <Button title="Publish" onPress={() => void finish()} style={styles.flex} />
        )}
      </View>
    </Screen>
  );
}
