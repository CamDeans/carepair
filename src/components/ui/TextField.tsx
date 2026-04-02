import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { radius, spacing } from '@/src/theme/tokens';

type Props = {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  error?: string;
  multiline?: boolean;
};

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize,
  error,
  multiline,
}: Props) {
  const { colors: c, fonts: f } = useCarePairUi();
  const [focused, setFocused] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { marginBottom: spacing.lg },
        label: {
          fontSize: 14,
          fontWeight: '500',
          letterSpacing: 0.14,
          color: c.text,
          marginBottom: spacing.xs,
          fontFamily: f.medium,
        },
        input: {
          borderWidth: focused ? 2 : 1,
          borderColor: error ? c.danger : focused ? c.primary : c.borderStrong,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: 12,
          fontSize: 15,
          fontWeight: '400',
          color: c.text,
          backgroundColor: c.surface,
          minHeight: 48,
          fontFamily: f.regular,
        },
        inputMulti: { minHeight: 100, textAlignVertical: 'top' },
        error: { marginTop: spacing.xs, color: c.danger, fontSize: 13, fontFamily: f.regular },
      }),
    [c, f.medium, f.regular, focused, error],
  );

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.textSubtle}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, multiline && styles.inputMulti]}
      />
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
