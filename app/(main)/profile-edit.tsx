import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { PhotoSlotsRow } from '@/src/components/ui/PhotoSlotsRow';
import { Screen } from '@/src/components/ui/Screen';
import { InlineError } from '@/src/components/ui/InlineError';
import { TextField } from '@/src/components/ui/TextField';
import * as api from '@/src/lib/serverApi';
import { useAuthStore } from '@/src/store/authStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, radius, spacing } from '@/src/theme/tokens';

function str(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v == null) return '';
  return String(v);
}

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function bool(v: unknown): boolean {
  return v === true;
}

function readUrlArray(profile: Record<string, unknown> | null | undefined, key: string): string[] {
  const raw = profile?.[key];
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
}

function countFilledUrls(urls: string[]): number {
  return urls.map((u) => u.trim()).filter(Boolean).length;
}

type FamilyForm = {
  displayName: string;
  phone: string;
  addressLine: string;
  city: string;
  province: string;
  postalCode: string;
  childrenCount: number;
  childrenAges: string;
  childrenNotes: string;
  pets: string;
  petDetails: string;
  scheduleNeeds: string;
  budgetMin: number;
  budgetMax: number;
  budgetRangeLabel: string;
  languagesPreferred: string;
  specialNeedsSummary: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  householdRoutines: string;
  carePreferences: string;
};

type CaregiverForm = {
  displayName: string;
  phone: string;
  city: string;
  province: string;
  postalCode: string;
  bio: string;
  yearsExperience: number;
  yearsExperienceLabel: string;
  certificationsSummary: string;
  specializations: string;
  firstAidCpr: boolean;
  vulnerableSectorCheck: boolean;
  referencesSummary: string;
  availabilitySummary: string;
  payMin: number;
  payMax: number;
  payRangeLabel: string;
  education: string;
  languages: string;
};

const emptyFamily: FamilyForm = {
  displayName: '',
  phone: '',
  addressLine: '',
  city: '',
  province: '',
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
};

const emptyCaregiver: CaregiverForm = {
  displayName: '',
  phone: '',
  city: '',
  province: '',
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
};

export default function ProfileEditScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const user = useAuthStore((s) => s.user);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const role = user?.role;

  const [familyForm, setFamilyForm] = useState<FamilyForm>(emptyFamily);
  const [cgForm, setCgForm] = useState<CaregiverForm>(emptyCaregiver);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [docUrls, setDocUrls] = useState<string[]>([]);
  const [primaryPhotoIndex, setPrimaryPhotoIndex] = useState(0);
  const [radiusKm, setRadiusKm] = useState('25');
  const [locBusy, setLocBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      h1: { ...t.screenTitle, marginBottom: spacing.sm },
      section: {
        ...t.sectionTitle,
        fontSize: 17,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
        color: c.primaryDark,
      },
      hint: { ...t.caption, marginBottom: spacing.md },
      primaryRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
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
      docRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: c.border,
        gap: spacing.sm,
      },
      docLabel: { ...t.body, flex: 1 },
      row2: { paddingVertical: spacing.sm },
      chk: { ...t.body },
    });
  }, [c, f]);

  useEffect(() => {
    if (role === 'family') {
      const fp = user?.familyProfile as Record<string, unknown> | undefined;
      if (fp) {
        setFamilyForm({
          displayName: str(fp.displayName),
          phone: str(fp.phone),
          addressLine: str(fp.addressLine),
          city: str(fp.city),
          province: str(fp.province),
          postalCode: str(fp.postalCode),
          childrenCount: Math.max(1, num(fp.childrenCount, 1)),
          childrenAges: str(fp.childrenAges),
          childrenNotes: str(fp.childrenNotes),
          pets: str(fp.pets),
          petDetails: str(fp.petDetails),
          scheduleNeeds: str(fp.scheduleNeeds),
          budgetMin: num(fp.budgetMin),
          budgetMax: num(fp.budgetMax),
          budgetRangeLabel: str(fp.budgetRangeLabel),
          languagesPreferred: str(fp.languagesPreferred),
          specialNeedsSummary: str(fp.specialNeedsSummary),
          emergencyContactName: str(fp.emergencyContactName),
          emergencyContactPhone: str(fp.emergencyContactPhone),
          householdRoutines: str(fp.householdRoutines),
          carePreferences: str(fp.carePreferences),
        });
        setPhotoUrls(readUrlArray(fp, 'photoUrls'));
        setDocUrls(readUrlArray(fp, 'documentUrls'));
        const pi = fp.primaryPhotoIndex;
        setPrimaryPhotoIndex(typeof pi === 'number' && pi >= 0 ? pi : 0);
      }
    } else if (role === 'caregiver') {
      const cp = user?.caregiverProfile as Record<string, unknown> | undefined;
      if (cp) {
        setCgForm({
          displayName: str(cp.displayName),
          phone: str(cp.phone),
          city: str(cp.city),
          province: str(cp.province),
          postalCode: str(cp.postalCode),
          bio: str(cp.bio),
          yearsExperience: num(cp.yearsExperience),
          yearsExperienceLabel: str(cp.yearsExperienceLabel),
          certificationsSummary: str(cp.certificationsSummary),
          specializations: str(cp.specializations),
          firstAidCpr: bool(cp.firstAidCpr),
          vulnerableSectorCheck: bool(cp.vulnerableSectorCheck),
          referencesSummary: str(cp.referencesSummary),
          availabilitySummary: str(cp.availabilitySummary),
          payMin: num(cp.payMin),
          payMax: num(cp.payMax),
          payRangeLabel: str(cp.payRangeLabel),
          education: str(cp.education),
          languages: str(cp.languages),
        });
        setPhotoUrls(readUrlArray(cp, 'photoUrls'));
        setDocUrls(readUrlArray(cp, 'documentUrls'));
        const pi = cp.primaryPhotoIndex;
        setPrimaryPhotoIndex(typeof pi === 'number' && pi >= 0 ? pi : 0);
      }
    }
    setRadiusKm(String(user?.searchRadiusKm ?? 25));
  }, [role, user?.familyProfile, user?.caregiverProfile, user?.searchRadiusKm]);

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

  const removePhotoAt = (index: number) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
    setPrimaryPhotoIndex((pi) => {
      if (index === pi) return 0;
      if (index < pi) return Math.max(0, pi - 1);
      return pi;
    });
  };

  const removeDocAt = (index: number) => {
    setDocUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const coordsFromUser = useCallback((): { lng: number; lat: number } | null => {
    const coords = user?.location?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return null;
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat) || (lng === 0 && lat === 0)) return null;
    return { lng, lat };
  }, [user?.location?.coordinates]);

  const applyLocation = async (lat: number, lng: number) => {
    const r = parseFloat(radiusKm) || 25;
    const calendarTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    await api.profileLocation(lng, lat, r, calendarTimeZone);
  };

  const refreshGpsLocation = () => {
    void (async () => {
      setLocBusy(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Location', 'Allow location to update where you appear on the map.');
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
          if (!last?.coords) {
            Alert.alert('Location', 'Current position unavailable. Try again on a device with GPS.');
            return;
          }
          lat = last.coords.latitude;
          lng = last.coords.longitude;
        }
        await applyLocation(lat, lng);
        await refreshMe();
        Alert.alert('Location updated', 'Your discover position and radius are saved.');
      } catch (e) {
        Alert.alert('Location', e instanceof Error ? e.message : 'Failed');
      } finally {
        setLocBusy(false);
      }
    })();
  };

  const save = async () => {
    setSaveError('');
    setSaving(true);
    try {
      if (role === 'family') {
        await api.profilePatchFamily({
          ...familyForm,
          childrenCount: Math.max(1, familyForm.childrenCount),
          budgetMin: Number(familyForm.budgetMin) || 0,
          budgetMax: Number(familyForm.budgetMax) || 0,
          photoUrls,
          documentUrls: docUrls,
          ...(countFilledUrls(photoUrls) > 0 ? { primaryPhotoIndex } : {}),
        });
      } else if (role === 'caregiver') {
        await api.profilePatchCaregiver({
          ...cgForm,
          yearsExperience: Math.min(80, Math.max(0, cgForm.yearsExperience)),
          payMin: Number(cgForm.payMin) || 0,
          payMax: Number(cgForm.payMax) || 0,
          photoUrls,
          documentUrls: docUrls,
          ...(countFilledUrls(photoUrls) > 0 ? { primaryPhotoIndex } : {}),
        });
      } else {
        Alert.alert('Profile', 'This account type has no editable family or caregiver profile here.');
        return;
      }

      const c = coordsFromUser();
      if (c) {
        const r = parseFloat(radiusKm) || 25;
        const tz = user?.calendarTimeZone?.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone;
        await api.profileLocation(c.lng, c.lat, r, tz);
      }

      await refreshMe();
      Alert.alert('Saved', 'Your profile was updated.');
      router.back();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (role !== 'family' && role !== 'caregiver') {
    return (
      <Screen scroll>
        <Text style={styles.h1}>Edit profile</Text>
        <Text style={styles.hint}>Use the staff portal or account tools for this role.</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={styles.h1}>Edit profile</Text>
      <Text style={styles.hint}>
        Update what caregivers or families see on Discover. Supporting and verification documents stay private and are not shown on your
        public card.
      </Text>

      <Text style={styles.section}>Photos</Text>
      <PhotoSlotsRow urls={photoUrls} maxSlots={4} slotSize={80} borderRadius={radius.lg} gap={spacing.md} />
      <Button title="Add photo" onPress={() => void pickAndUpload('photo')} />
      {photoUrls.some((u) => u.trim()) ? (
        <View style={styles.primaryRow}>
          <Text style={styles.hint}>Main photo on Discover:</Text>
          {photoUrls.map((u, i) =>
            u.trim() ? (
              <Pressable
                key={`pri-${i}`}
                accessibilityRole="button"
                accessibilityLabel={`Set photo ${i + 1} as main`}
                onPress={() => setPrimaryPhotoIndex(i)}
                style={[styles.chip, i === primaryPhotoIndex && styles.chipOn]}>
                <Text style={[styles.chipText, i === primaryPhotoIndex && styles.chipTextOn]}>{i + 1}</Text>
              </Pressable>
            ) : null,
          )}
        </View>
      ) : null}
      {photoUrls.map((u, i) =>
        u.trim() ? (
          <View key={`rm-ph-${i}`} style={styles.docRow}>
            <Text style={styles.docLabel} numberOfLines={1}>
              Photo {i + 1}
            </Text>
            <Button title="Remove" variant="secondary" size="sm" onPress={() => removePhotoAt(i)} />
          </View>
        ) : null,
      )}

      <Text style={styles.section}>Documents</Text>
      <Text style={styles.hint}>
        {role === 'family'
          ? 'Supporting documents help verify your household. They are required to stay published when your plan requires them.'
          : 'Verification documents back your experience. They are required to stay published when your plan requires them.'}
      </Text>
      <Button title="Add document image" variant="secondary" onPress={() => void pickAndUpload('doc')} />
      {docUrls
        .map((u, i) => ({ u, i }))
        .filter(({ u }) => u.trim())
        .map(({ u, i }) => (
          <View key={`doc-${i}-${u.slice(-12)}`} style={styles.docRow}>
            <Text style={styles.docLabel} numberOfLines={1}>
              Document {i + 1}
            </Text>
            <Button title="Remove" variant="secondary" size="sm" onPress={() => removeDocAt(i)} />
          </View>
        ))}

      <Text style={styles.section}>Search area</Text>
      <TextField label="Search radius (km)" value={radiusKm} onChangeText={setRadiusKm} keyboardType="decimal-pad" />
      <Button
        title={locBusy ? 'Getting location…' : 'Update my map position (GPS)'}
        variant="secondary"
        onPress={refreshGpsLocation}
        disabled={locBusy}
      />
      <Text style={[styles.hint, { marginTop: spacing.sm }]}>
        Radius applies to Discover. Use GPS when you move so nearby matches stay accurate.
      </Text>

      {role === 'family' ? (
        <>
          <Text style={styles.section}>Household</Text>
          <TextField label="Your name" value={familyForm.displayName} onChangeText={(t) => setFamilyForm({ ...familyForm, displayName: t })} />
          <TextField label="Phone" value={familyForm.phone} onChangeText={(t) => setFamilyForm({ ...familyForm, phone: t })} keyboardType="phone-pad" />
          <TextField label="Street address" value={familyForm.addressLine} onChangeText={(t) => setFamilyForm({ ...familyForm, addressLine: t })} />
          <TextField label="City" value={familyForm.city} onChangeText={(t) => setFamilyForm({ ...familyForm, city: t })} />
          <TextField label="Province" value={familyForm.province} onChangeText={(t) => setFamilyForm({ ...familyForm, province: t })} />
          <TextField label="Postal code" value={familyForm.postalCode} onChangeText={(t) => setFamilyForm({ ...familyForm, postalCode: t })} />

          <Text style={styles.section}>Children &amp; pets</Text>
          <TextField
            label="Number of children"
            value={String(familyForm.childrenCount)}
            onChangeText={(t) => setFamilyForm({ ...familyForm, childrenCount: Math.max(1, parseInt(t, 10) || 1) })}
            keyboardType="numeric"
          />
          <TextField label="Children ages" value={familyForm.childrenAges} onChangeText={(t) => setFamilyForm({ ...familyForm, childrenAges: t })} />
          <TextField
            label="Notes about children"
            value={familyForm.childrenNotes}
            onChangeText={(t) => setFamilyForm({ ...familyForm, childrenNotes: t })}
            multiline
          />
          <TextField label="Pets" value={familyForm.pets} onChangeText={(t) => setFamilyForm({ ...familyForm, pets: t })} />
          <TextField label="Pet details" value={familyForm.petDetails} onChangeText={(t) => setFamilyForm({ ...familyForm, petDetails: t })} multiline />

          <Text style={styles.section}>Care needs</Text>
          <TextField
            label="Schedule needs"
            value={familyForm.scheduleNeeds}
            onChangeText={(t) => setFamilyForm({ ...familyForm, scheduleNeeds: t })}
            multiline
          />
          <TextField label="Budget label (e.g. $18–22/hr)" value={familyForm.budgetRangeLabel} onChangeText={(t) => setFamilyForm({ ...familyForm, budgetRangeLabel: t })} />
          <TextField label="Budget min ($/hr)" value={String(familyForm.budgetMin)} onChangeText={(t) => setFamilyForm({ ...familyForm, budgetMin: parseFloat(t) || 0 })} keyboardType="decimal-pad" />
          <TextField label="Budget max ($/hr)" value={String(familyForm.budgetMax)} onChangeText={(t) => setFamilyForm({ ...familyForm, budgetMax: parseFloat(t) || 0 })} keyboardType="decimal-pad" />
          <TextField label="Languages preferred" value={familyForm.languagesPreferred} onChangeText={(t) => setFamilyForm({ ...familyForm, languagesPreferred: t })} />
          <TextField
            label="Special needs or accessibility"
            value={familyForm.specialNeedsSummary}
            onChangeText={(t) => setFamilyForm({ ...familyForm, specialNeedsSummary: t })}
            multiline
          />
          <TextField label="Emergency contact name" value={familyForm.emergencyContactName} onChangeText={(t) => setFamilyForm({ ...familyForm, emergencyContactName: t })} />
          <TextField label="Emergency contact phone" value={familyForm.emergencyContactPhone} onChangeText={(t) => setFamilyForm({ ...familyForm, emergencyContactPhone: t })} />
          <TextField label="Household routines" value={familyForm.householdRoutines} onChangeText={(t) => setFamilyForm({ ...familyForm, householdRoutines: t })} multiline />
          <TextField label="Care preferences" value={familyForm.carePreferences} onChangeText={(t) => setFamilyForm({ ...familyForm, carePreferences: t })} multiline />
        </>
      ) : (
        <>
          <Text style={styles.section}>Basics</Text>
          <TextField label="Your name" value={cgForm.displayName} onChangeText={(t) => setCgForm({ ...cgForm, displayName: t })} />
          <TextField label="Phone" value={cgForm.phone} onChangeText={(t) => setCgForm({ ...cgForm, phone: t })} keyboardType="phone-pad" />
          <TextField label="City" value={cgForm.city} onChangeText={(t) => setCgForm({ ...cgForm, city: t })} />
          <TextField label="Province" value={cgForm.province} onChangeText={(t) => setCgForm({ ...cgForm, province: t })} />
          <TextField label="Postal code" value={cgForm.postalCode} onChangeText={(t) => setCgForm({ ...cgForm, postalCode: t })} />
          <TextField label="Bio" value={cgForm.bio} onChangeText={(t) => setCgForm({ ...cgForm, bio: t })} multiline />

          <Text style={styles.section}>Experience &amp; pay</Text>
          <TextField
            label="Years experience"
            value={String(cgForm.yearsExperience)}
            onChangeText={(t) => setCgForm({ ...cgForm, yearsExperience: parseInt(t, 10) || 0 })}
            keyboardType="numeric"
          />
          <TextField label="Experience label" value={cgForm.yearsExperienceLabel} onChangeText={(t) => setCgForm({ ...cgForm, yearsExperienceLabel: t })} />
          <TextField label="Certifications" value={cgForm.certificationsSummary} onChangeText={(t) => setCgForm({ ...cgForm, certificationsSummary: t })} multiline />
          <TextField label="Specializations" value={cgForm.specializations} onChangeText={(t) => setCgForm({ ...cgForm, specializations: t })} multiline />
          <TextField label="Availability" value={cgForm.availabilitySummary} onChangeText={(t) => setCgForm({ ...cgForm, availabilitySummary: t })} multiline />
          <TextField label="Pay range label" value={cgForm.payRangeLabel} onChangeText={(t) => setCgForm({ ...cgForm, payRangeLabel: t })} />
          <TextField label="Pay min ($/hr)" value={String(cgForm.payMin)} onChangeText={(t) => setCgForm({ ...cgForm, payMin: parseFloat(t) || 0 })} keyboardType="decimal-pad" />
          <TextField label="Pay max ($/hr)" value={String(cgForm.payMax)} onChangeText={(t) => setCgForm({ ...cgForm, payMax: parseFloat(t) || 0 })} keyboardType="decimal-pad" />
          <TextField label="Education" value={cgForm.education} onChangeText={(t) => setCgForm({ ...cgForm, education: t })} />
          <TextField label="Languages" value={cgForm.languages} onChangeText={(t) => setCgForm({ ...cgForm, languages: t })} />

          <Text style={styles.section}>Safety &amp; references</Text>
          <Pressable
            style={styles.row2}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: cgForm.firstAidCpr }}
            onPress={() => setCgForm((f) => ({ ...f, firstAidCpr: !f.firstAidCpr }))}>
            <Text style={styles.chk}>{cgForm.firstAidCpr ? '☑' : '☐'} First aid / CPR</Text>
          </Pressable>
          <Pressable
            style={styles.row2}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: cgForm.vulnerableSectorCheck }}
            onPress={() => setCgForm((f) => ({ ...f, vulnerableSectorCheck: !f.vulnerableSectorCheck }))}>
            <Text style={styles.chk}>{cgForm.vulnerableSectorCheck ? '☑' : '☐'} Vulnerable sector check</Text>
          </Pressable>
          <TextField label="References summary" value={cgForm.referencesSummary} onChangeText={(t) => setCgForm({ ...cgForm, referencesSummary: t })} multiline />
        </>
      )}

      <View style={{ marginTop: layout.sectionGap, marginBottom: spacing.xl }}>
        {saveError ? <InlineError message={saveError} onRetry={() => void save()} /> : null}
        <Button title={saving ? 'Saving…' : 'Save changes'} onPress={() => void save()} loading={saving} />
      </View>
    </Screen>
  );
}
