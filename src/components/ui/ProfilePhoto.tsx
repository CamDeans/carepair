import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useCarePairUi } from '@/src/theme/CarePairUiContext';

import { ImagePlaceholder } from './ImagePlaceholder';

type Props = {
  uri: string | null | undefined;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * Shows a real profile image when `uri` is non-empty; otherwise a dashed placeholder (no letter avatars).
 */
export function ProfilePhoto({ uri, style, accessibilityLabel }: Props) {
  const { colors: c } = useCarePairUi();
  const trimmed = uri?.trim();
  if (trimmed) {
    return (
      <View
        style={[styles.clip, { backgroundColor: c.surface }, style]}
        accessibilityLabel={accessibilityLabel ?? 'Profile photo'}
        accessibilityRole="image">
        <Image source={{ uri: trimmed }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      </View>
    );
  }
  return (
    <ImagePlaceholder
      style={style}
      accessibilityLabel={accessibilityLabel ?? 'No profile photo yet'}
    />
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});
