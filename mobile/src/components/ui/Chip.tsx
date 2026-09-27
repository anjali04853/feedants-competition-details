import { StyleSheet, View } from 'react-native';
import { colors, radius } from '@/theme';
import { Txt } from './Txt';

export function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Txt size={12} weight="medium">{label}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.chip,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
});
