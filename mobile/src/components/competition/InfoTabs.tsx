import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Competition } from '@/api/types';
import { Card } from '@/components/ui/Card';
import { Txt } from '@/components/ui/Txt';
import { useI18n } from '@/i18n/LanguageProvider';
import type { StringKey } from '@/i18n/strings';
import { colors, spacing } from '@/theme';

type TabKey = 'about' | 'judging' | 'rules';
const TABS: { key: TabKey; label: StringKey }[] = [
  { key: 'about', label: 'aboutCompetition' },
  { key: 'judging', label: 'judgingParameters' },
  { key: 'rules', label: 'rulesEligibility' },
];

/** Number of lines/items shown before "View more". */
const COLLAPSED_ITEMS = 3;

function Bullets({ items }: { items: { text: string; trailing?: string }[] }) {
  return (
    <View style={{ gap: 6 }}>
      {items.map((item, i) => (
        <View key={i} style={styles.bulletRow}>
          <View style={styles.dot} />
          <Txt size={13} color={colors.textSecondary} style={{ flex: 1 }}>{item.text}</Txt>
          {item.trailing && <Txt size={13} weight="semibold" color={colors.primaryText}>{item.trailing}</Txt>}
        </View>
      ))}
    </View>
  );
}

export function InfoTabs({ competition }: { competition: Competition }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<TabKey>('about');
  const [expanded, setExpanded] = useState(false);

  const aboutLines = competition.about.split('\n').filter(Boolean);
  const judging = competition.judgingParameters.map((p) => ({ text: p.title, trailing: p.weight != null ? `${p.weight}%` : undefined }));
  const rules = competition.rules.map((r) => ({ text: r }));

  const total = tab === 'about' ? aboutLines.length : tab === 'judging' ? judging.length : rules.length;
  const canExpand = total > COLLAPSED_ITEMS;
  const limit = expanded ? Infinity : COLLAPSED_ITEMS;

  return (
    <Card style={{ paddingTop: spacing.sm }}>
      <View style={styles.tabs} accessibilityRole="tablist">
        {TABS.map((item) => {
          const active = item.key === tab;
          return (
            <Pressable
              key={item.key}
              onPress={() => {
                setTab(item.key);
                setExpanded(false);
              }}
              style={[styles.tab, active && styles.tabActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Txt size={11.5} weight={active ? 'semibold' : 'medium'} color={active ? colors.primaryText : colors.textSecondary} align="center" numberOfLines={1} adjustsFontSizeToFit>
                {t(item.label)}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <View style={{ paddingTop: spacing.md }}>
        {tab === 'about' &&
          aboutLines.slice(0, limit).map((line, i) => (
            <Txt key={i} size={13} color={colors.textSecondary}>{line}</Txt>
          ))}
        {tab === 'judging' && <Bullets items={judging.slice(0, limit)} />}
        {tab === 'rules' && <Bullets items={rules.slice(0, limit)} />}
      </View>

      {canExpand && (
        <Pressable onPress={() => setExpanded((e) => !e)} style={styles.more} accessibilityRole="button" hitSlop={8}>
          <Txt size={13} weight="medium" color={colors.primaryText}>{t(expanded ? 'viewLess' : 'viewMore')}</Txt>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primaryText} />
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flexGrow: 1, flexShrink: 1, paddingHorizontal: 2, paddingVertical: spacing.sm, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -1 },
  tabActive: { borderBottomColor: colors.primary },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary, marginTop: 8 },
  more: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 4, marginTop: spacing.sm },
});
