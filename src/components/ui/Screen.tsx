import { ReactNode, useMemo } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { layout } from '@/src/theme/tokens';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  /** When false, horizontal padding is not applied (e.g. full-bleed carousels). */
  contentPaddingH?: boolean;
  /**
   * iOS: lock scroll to one axis after the user starts moving — helps horizontal swipes (e.g. Discover cards)
   * win over vertical scroll when appropriate.
   */
  directionalLockIOS?: boolean;
  style?: ViewStyle;
};

export function Screen({ children, scroll, contentPaddingH = true, directionalLockIOS, style }: Props) {
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
        fillBleedH: {
          flex: 1,
          paddingVertical: layout.screenPaddingY,
        },
        scrollContent: {
          paddingHorizontal: layout.screenPaddingX,
          paddingTop: layout.screenPaddingY,
          paddingBottom: layout.sectionGap + layout.screenPaddingY,
          flexGrow: 1,
        },
        scrollContentBleedH: {
          paddingTop: layout.screenPaddingY,
          paddingBottom: layout.sectionGap + layout.screenPaddingY,
          flexGrow: 1,
        },
        keyboard: { flex: 1 },
      }),
    [c],
  );

  const scrollContentStyle = contentPaddingH ? styles.scrollContent : styles.scrollContentBleedH;

  if (scroll) {
    return (
      <SafeAreaView style={[styles.safe, style]} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
          <GHScrollView
            contentContainerStyle={scrollContentStyle}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            directionalLockEnabled={Platform.OS === 'ios' && !!directionalLockIOS}
            bounces>
            {children}
          </GHScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={[styles.safe, style]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <View style={contentPaddingH ? styles.fill : styles.fillBleedH}>{children}</View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
