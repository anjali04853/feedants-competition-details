import { Pressable, StyleSheet, View } from 'react-native';
import { colors, fonts, radius } from '@/theme';
import { Txt } from './Txt';

interface Option<T extends string> {
  value: T;
  label: string;
}

export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.container} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.option, active && styles.active]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            hitSlop={4}
          >
            <Txt size={12} weight={active ? 'semibold' : 'medium'} color={active ? colors.white : colors.text} style={{ fontFamily: active ? fonts.semibold : fonts.medium }}>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.chip,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 2,
  },
  option: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: radius.pill, minWidth: 48, alignItems: 'center' },
  active: { backgroundColor: colors.primary },
});
