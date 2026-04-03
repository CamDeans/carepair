import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

/** Match server `profilePublish` defaults (photos + family supporting docs). */
const MIN_PROFILE_PHOTOS = 1;
const MIN_SUPPORTING_DOCS = 1;

function countFilledUrls(urls: string[]): number {
  return urls.map((u) => u.trim()).filter(Boolean).length;
}

import { Button } from '@/src/components/ui/Button';
import { PhotoSlotsRow } from '@/src/components/ui/PhotoSlotsRow';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import * as api from '@/src/lib/serverApi';
import { useAuthStore } from '@/src/store/authStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { radius, spacing } from '@/src/theme/tokens';

const STEPS = ['Household', 'Children & pets', 'Care needs', 'Photos & documents', 'Location', 'Review'] as const;

export default function FamilySetupScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const [step, setStep] = useState(0);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [docUrls, setDocUrls] = useState<string[]>([]);
  const [radiusKm, setRadiusKm] = useState('25');
  const [form, setForm] = useState({
    displayName: '',
    phone: '',
    addressLine: '',
    city: 'Calgary',
    province: 'AB',
    postalCode: '',
    childrenCount: 1,
    childrenAges: '',
    childrenNotes: '',
    pets: '',
    petDetails: '',
    scheduleNeeds: '',
    budgetMin: 0,
    budgetMax: 0,
    budgetRangeLabel: '',
    languagesPreferred: '',
    specialNeedsSummary: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    householdRoutines: '',
    carePreferences: '',
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
        review: { marginBottom: spacing.lg },
        r: { color: c.text, marginBottom: spacing.xs, fontFamily: f.regular },
        row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
        flex: { flex: 1 },
        reqOk: { color: c.success, fontWeight: '600', fontFamily: f.semibold, marginTop: spacing.sm },
        reqBad: { color: c.danger, fontWeight: '600', fontFamily: f.semibold, marginTop: spacing.sm },
        docLine: { color: c.textSecondary, fontSize: 14, marginTop: spacing.xs, fontFamily: f.regular },
      }),
    [c, f],
  );

  const pickAndUpload = async (kind: 'photo' | 'doc') => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission', 'Photo library access is needed to upload.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    try {
      const mime = a.mimeType ?? 'image/jpeg';
      const up = await api.uploadFile(a.uri, kind === 'photo' ? 'photo.jpg' : 'doc.jpg', mime);
      if (kind === 'photo') setPhotoUrls((p) => [...p, up.url]);
      else setDocUrls((p) => [...p, up.url]);
    } catch (e) {
      Alert.alert('Upload', e instanceof Error ? e.message : 'Failed');
    }
  };

  const savePartial = async () => {
    await api.profilePatchFamily({
      ...form,
      childrenCount: Number(form.childrenCount) || 1,
      budgetMin: Number(form.budgetMin) || 0,
      budgetMax: Number(form.budgetMax) || 0,
      photoUrls,
      documentUrls: docUrls,
    });
  };

  const next = async () => {
    if (step === 3) {
      const nPhotos = countFilledUrls(photoUrls);
      const nDocs = countFilledUrls(docUrls);
      if (nPhotos < MIN_PROFILE_PHOTOS || nDocs < MIN_SUPPORTING_DOCS) {
        Alert.alert(
          'Photos & documents required',
          `Add at least ${MIN_PROFILE_PHOTOS} profile photo(s) and ${MIN_SUPPORTING_DOCS} supporting document (for example a utility summary, school note, or other image that helps show you are a real household). Caregivers rely on this to trust who they match with.`,
        );
        return;
      }
    }
    try {
      await savePartial();
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    } catch (e) {
      Alert.alert('Save', e instanceof Error ? e.message : 'Failed');
    }
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  const finish = async () => {
    const nPhotos = countFilledUrls(photoUrls);
    const nDocs = countFilledUrls(docUrls);
    if (nPhotos < MIN_PROFILE_PHOTOS || nDocs < MIN_SUPPORTING_DOCS) {
      Alert.alert(
        'Complete photos & documents',
        `You need at least ${MIN_PROFILE_PHOTOS} photo(s) and ${MIN_SUPPORTING_DOCS} supporting document. Go back to the Photos & documents step.`,
      );
      return;
    }
    try {
      await savePartial();
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location', 'Location is required to publish your profile.');
        return;
      }
      let lat: number;
      let lng: number;
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        const last = await Location.getLastKnownPositionAsync();
        if (last?.coords) {
          lat = last.coords.latitude;
          lng = last.coords.longitude;
        } else {
          throw new Error(
            'Current location is unavailable. On emulators, set a mock location or test on a device with GPS.',
          );
        }
      }
      const r = parseFloat(radiusKm) || 25;
      const calendarTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await api.profileLocation(lng, lat, r, calendarTimeZone);
      await api.profilePublish();
      await refreshMe();
      router.replace('/');
    } catch (e) {
      Alert.alert('Publish', e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.step}>Family profile setup</Text>
      <Text style={[styles.step, { marginTop: -spacing.sm, marginBottom: spacing.lg }]}>
        Step {step + 1} of {STEPS.length} — {STEPS[step]}
      </Text>

      {step === 0 && (
        <>
          <TextField label="Your name" value={form.displayName} onChangeText={(t) => setForm({ ...form, displayName: t })} />
          <TextField label="Phone" value={form.phone} onChangeText={(t) => setForm({ ...form, phone: t })} keyboardType="phone-pad" />
          <TextField label="Street address" value={form.addressLine} onChangeText={(t) => setForm({ ...form, addressLine: t })} />
          <TextField label="City" value={form.city} onChangeText={(t) => setForm({ ...form, city: t })} />
          <TextField label="Province" value={form.province} onChangeText={(t) => setForm({ ...form, province: t })} />
          <TextField label="Postal code" value={form.postalCode} onChangeText={(t) => setForm({ ...form, postalCode: t })} />
        </>
      )}

      {step === 1 && (
        <>
          <TextField
            label="Number of children"
            value={String(form.childrenCount)}
            onChangeText={(t) => setForm({ ...form, childrenCount: Math.max(1, parseInt(t, 10) || 1) })}
            keyboardType="numeric"
          />
          <TextField label="Children ages" value={form.childrenAges} onChangeText={(t) => setForm({ ...form, childrenAges: t })} />
          <TextField
            label="Notes about children (temperament, routines)"
            value={form.childrenNotes}
            onChangeText={(t) => setForm({ ...form, childrenNotes: t })}
            multiline
          />
          <TextField label="Pets" value={form.pets} onChangeText={(t) => setForm({ ...form, pets: t })} />
          <TextField label="Pet details" value={form.petDetails} onChangeText={(t) => setForm({ ...form, petDetails: t })} multiline />
        </>
      )}

      {step === 2 && (
        <>
          <TextField
            label="Schedule needs"
            value={form.scheduleNeeds}
            onChangeText={(t) => setForm({ ...form, scheduleNeeds: t })}
            multiline
          />
          <TextField label="Budget label (e.g. $18–22/hr)" value={form.budgetRangeLabel} onChangeText={(t) => setForm({ ...form, budgetRangeLabel: t })} />
          <TextField label="Languages preferred" value={form.languagesPreferred} onChangeText={(t) => setForm({ ...form, languagesPreferred: t })} />
          <TextField
            label="Special needs or accessibility"
            value={form.specialNeedsSummary}
            onChangeText={(t) => setForm({ ...form, specialNeedsSummary: t })}
            multiline
          />
          <TextField label="Emergency contact name" value={form.emergencyContactName} onChangeText={(t) => setForm({ ...form, emergencyContactName: t })} />
          <TextField label="Emergency contact phone" value={form.emergencyContactPhone} onChangeText={(t) => setForm({ ...form, emergencyContactPhone: t })} />
          <TextField label="Household routines" value={form.householdRoutines} onChangeText={(t) => setForm({ ...form, householdRoutines: t })} multiline />
          <TextField label="Care preferences" value={form.carePreferences} onChangeText={(t) => setForm({ ...form, carePreferences: t })} multiline />
        </>
      )}

      {step === 3 && (
        <>
          <Text style={styles.h}>Profile photos</Text>
          <Text style={styles.p}>
            Add real photos of you or your household. At least {MIN_PROFILE_PHOTOS} photo is required. Caregivers use this to recognize who
            they may work with.
          </Text>
          <PhotoSlotsRow urls={photoUrls} maxSlots={4} slotSize={76} borderRadius={radius.md} />
          <Button title="Add photo" onPress={() => void pickAndUpload('photo')} />
          {countFilledUrls(photoUrls) >= MIN_PROFILE_PHOTOS ? (
            <Text style={styles.reqOk}>✓ {countFilledUrls(photoUrls)} profile photo(s)</Text>
          ) : (
            <Text style={styles.reqBad}>
              Need {MIN_PROFILE_PHOTOS} photo — you have {countFilledUrls(photoUrls)}
            </Text>
          )}

          <Text style={[styles.h, { marginTop: spacing.lg }]}>Supporting documents ({countFilledUrls(docUrls)})</Text>
          <Text style={styles.p}>
            Upload at least {MIN_SUPPORTING_DOCS} image (screenshot or photo) that helps show you are a genuine parent or guardian — for
            example a utility summary, school or daycare note, or benefit letter with sensitive numbers covered. This is not shown on your
            public profile; it reduces fake accounts for caregivers.
          </Text>
          <Button title="Add document image" variant="secondary" onPress={() => void pickAndUpload('doc')} />
          {docUrls.filter((u) => u.trim()).map((u, i) => (
            <Text key={`${u}-${i}`} style={styles.docLine} numberOfLines={1}>
              Document {i + 1}: uploaded
            </Text>
          ))}
          {countFilledUrls(docUrls) >= MIN_SUPPORTING_DOCS ? (
            <Text style={styles.reqOk}>✓ Supporting document on file</Text>
          ) : (
            <Text style={styles.reqBad}>Add at least {MIN_SUPPORTING_DOCS} document to continue.</Text>
          )}
        </>
      )}

      {step === 4 && (
        <>
          <Text style={styles.p}>We will use your device location when you tap Publish on the next step.</Text>
          <TextField label="Default search radius (km)" value={radiusKm} onChangeText={setRadiusKm} keyboardType="decimal-pad" />
        </>
      )}

      {step === 5 && (
        <View style={styles.review}>
          <Text style={styles.r}>{form.displayName || '—'} · {form.city}</Text>
          <Text style={styles.r}>{form.childrenCount} children · {form.scheduleNeeds?.slice(0, 120)}</Text>
          <Text style={styles.r}>{photoUrls.length} photos · {docUrls.length} documents</Text>
        </View>
      )}

      <View style={styles.row}>
        {step > 0 ? <Button title="Back" variant="secondary" onPress={back} style={styles.flex} /> : <View style={styles.flex} />}
        {step < STEPS.length - 1 ? (
          <Button
            title="Next"
            onPress={() => void next()}
            style={styles.flex}
            disabled={
              (step === 0 && !form.displayName.trim()) ||
              (step === 3 &&
                (countFilledUrls(photoUrls) < MIN_PROFILE_PHOTOS || countFilledUrls(docUrls) < MIN_SUPPORTING_DOCS))
            }
          />
        ) : (
          <Button title="Publish profile" onPress={() => void finish()} style={styles.flex} />
        )}
      </View>
    </Screen>
  );
}
