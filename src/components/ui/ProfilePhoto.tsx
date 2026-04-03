import { useEffect, useState } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { resolveMediaUri } from '@/src/lib/mediaUrl';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';

import { ImagePlaceholder } from './ImagePlaceholder';

type Props = {
  uri: string | null | undefined;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * Shows a real profile image when `uri` is non-empty; otherwise a dashed placeholder (no letter avatars).
 * Resolves root-relative URLs against the API host; on load error falls back to placeholder (avoids black tiles).
 */
export function ProfilePhoto({ uri, style, accessibilityLabel }: Props) {
  const { colors: c } = useCarePairUi();
  const resolved = resolveMediaUri(uri);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [resolved]);

  if (!resolved || failed) {
    return (
      <ImagePlaceholder
        style={style}
        accessibilityLabel={accessibilityLabel ?? 'No profile photo yet'}
      />
    );
  }

  return (
    <View
      style={[styles.clip, { backgroundColor: c.border }, style]}
      accessibilityLabel={accessibilityLabel ?? 'Profile photo'}
      accessibilityRole="image">
      <Image
        key={resolved}
        source={{ uri: resolved }}
        style={styles.image}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  image: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
});
