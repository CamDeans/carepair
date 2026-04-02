import { ReactNode, useMemo } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { layout } from '@/src/theme/tokens';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
};

export function Screen({ children, scroll, style }: Props) {
  const { colors: c } = useCarePairUi();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: c.background },
        fill: {
          flex: 1,
          paddingHorizontal: layout.screenPaddingX,
          paddingVertical: layout.screenPaddingY,
        },
        scrollContent: {
          paddingHorizontal: layout.screenPaddingX,
          paddingTop: layout.screenPaddingY,
          paddingBottom: layout.sectionGap + layout.screenPaddingY,
          flexGrow: 1,
        },
      }),
    [c],
  );

  if (scroll) {
    return (
      <SafeAreaView style={[styles.safe, style]} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={[styles.safe, style]} edges={['top', 'left', 'right']}>
      <View style={styles.fill}>{children}</View>
    </SafeAreaView>
  );
}
