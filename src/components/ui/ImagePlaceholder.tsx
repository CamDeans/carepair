import { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useCarePairUi } from '@/src/theme/CarePairUiContext';

type Props = {
  style?: StyleProp<ViewStyle>;
  /** Shown to VoiceOver / TalkBack */
  accessibilityLabel?: string;
};

/**
 * Empty slot for future photography — dashed border, no stock or mock imagery.
 * Use inside a sized container (`width`/`height` or `flex` from parent `style`).
 */
export function ImagePlaceholder({ style, accessibilityLabel = 'Photo placeholder' }: Props) {
  const { colors: c } = useCarePairUi();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        base: {
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: c.textSubtle,
          backgroundColor: c.surface,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [c.textSubtle, c.surface],
  );

  return (
    <View
      style={[styles.base, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      importantForAccessibility="yes"
    />
  );
}
