import { StyleSheet, Text, TextProps } from 'react-native';
import { colors, fonts } from '@/theme';

type Weight = keyof typeof fonts;

export interface TxtProps extends TextProps {
  size?: number;
  weight?: Weight;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

/** Text with the app's font family baked in. */
export function Txt({ size = 13, weight = 'regular', color = colors.text, align, style, ...rest }: TxtProps) {
  return (
    <Text
      {...rest}
      style={[styles.base, { fontSize: size, lineHeight: Math.round(size * 1.45), fontFamily: fonts[weight], color, textAlign: align }, style]}
    />
  );
}

const styles = StyleSheet.create({
  base: { includeFontPadding: false },
});
