import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Schedule } from '@/api/types';
import { serverNow } from '@/api/serverClock';
import { Card } from '@/components/ui/Card';
import { Txt } from '@/components/ui/Txt';
import { useI18n } from '@/i18n/LanguageProvider';
import type { StringKey } from '@/i18n/strings';
import { colors, radius, spacing } from '@/theme';
import { formatShortDate, formatTime } from '@/utils/format';

interface Item {
  key: keyof Schedule;
  label: StringKey;
  icon: ReactNode;
}

const ICON = colors.primaryDark;
const ITEMS: Item[] = [
  { key: 'registrationClosesAt', label: 'registerBefore', icon: <MaterialCommunityIcons name="calendar-month-outline" size={26} color={ICON} /> },
  { key: 'submissionStartsAt', label: 'submissionStarts', icon: <Feather name="send" size={23} color={ICON} /> },
  { key: 'submissionEndsAt', label: 'submissionEnds', icon: <Feather name="upload" size={23} color={ICON} /> },
  { key: 'resultAt', label: 'resultDate', icon: <MaterialCommunityIcons name="trophy-outline" size={25} color={ICON} /> },
];

export function ImportantDates({ schedule }: { schedule: Schedule }) {
  const { t, lang } = useI18n();
  const now = serverNow();

  return (
    <Card style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
      <Txt size={14} weight="semibold" accessibilityRole="header">{t('importantDates')}</Txt>
      <View style={styles.grid}>
        {ITEMS.map((item, i) => {
          const iso = schedule[item.key];
          const passed = Date.parse(iso) <= now;
          return (
            <View
              key={item.key}
              style={[styles.cell, i % 2 === 0 && styles.cellRightBorder, i < 2 && styles.cellBottomBorder, passed && { opacity: 0.55 }]}
              accessibilityLabel={`${t(item.label)} ${formatShortDate(iso, lang)} ${formatTime(iso)}`}
            >
              <View style={styles.icon}>{item.icon}</View>
              <View>
                <Txt size={11} color={colors.textMuted}>{t(item.label)}</Txt>
                <Txt size={13.5} weight="semibold" color={colors.primaryText}>{formatShortDate(iso, lang)}</Txt>
                <Txt size={12.5} weight="medium">{formatTime(iso)}</Txt>
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  cell: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingLeft: spacing.xl },
  cellRightBorder: { borderRightWidth: 1, borderRightColor: colors.border },
  cellBottomBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  icon: { width: 30, alignItems: 'center' },
});
