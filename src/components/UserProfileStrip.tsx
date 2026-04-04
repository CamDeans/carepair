import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProfilePhoto } from '@/src/components/ui/ProfilePhoto';
import { meProfilePreview } from '@/src/lib/meProfilePreview';
import { useAuthStore } from '@/src/store/authStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { radius, spacing } from '@/src/theme/tokens';

/**
 * Compact signed-in user row for main tabs — tap opens profile editor.
 */
export function UserProfileStrip() {
  const user = useAuthStore((s) => s.user);
  const { colors: c, fonts: f } = useCarePairUi();
  const preview = meProfilePreview(user);

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.lg,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        shadowColor: c.shadowInk,
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      },
      avatar: { width: 44, height: 44, borderRadius: radius.md },
      body: { flex: 1, minWidth: 0 },
      name: { ...t.body, fontWeight: '600', fontFamily: f.semibold },
      role: { ...t.caption, marginTop: 2 },
      chev: { fontSize: 22, color: c.textSubtle, fontWeight: '300' },
    });
  }, [c, f]);

  if (!preview) return null;

  return (
    <Pressable
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={`Your profile, ${preview.displayName}`}
      onPress={() => router.push('/profile-edit')}>
      <ProfilePhoto
        uri={preview.photoUri}
        style={styles.avatar}
        accessibilityLabel={`${preview.displayName} photo`}
      />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {preview.displayName}
        </Text>
        <Text style={styles.role} numberOfLines={1}>
          {preview.roleLabel}
        </Text>
      </View>
      <Text style={styles.chev}>›</Text>
    </Pressable>
  );
}
