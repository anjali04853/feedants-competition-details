import { Ionicons } from '@expo/vector-icons';
import { FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import type { Competition } from '@/api/types';
import { Card } from '@/components/ui/Card';
import { Txt } from '@/components/ui/Txt';
import { useI18n } from '@/i18n/LanguageProvider';
import { colors, radius, spacing } from '@/theme';
import { ordinal } from '@/utils/format';
import { openVideo } from '@/utils/media';

type Winner = Competition['previousWinners'][number];

export function PreviousWinners({ winners }: { winners: Winner[] }) {
  const { t, lang } = useI18n();
  if (!winners.length) return null;

  return (
    <Card style={styles.card}>
      <Txt size={14} weight="semibold" style={{ paddingHorizontal: spacing.lg }} accessibilityRole="header">
        {t('previousWinners')}
      </Txt>
      <FlatList
        horizontal
        data={winners}
        keyExtractor={(w) => w.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm, paddingTop: spacing.sm }}
        renderItem={({ item }) => {
          const label = t('winnerLabel', { pos: ordinal(item.position, lang) });
          return (
            <Pressable
              style={styles.item}
              onPress={() => openVideo(item.videoUrl)}
              disabled={!item.videoUrl}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${label}`}
            >
              <View>
                {item.thumbnailUrl ? (
                  <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, { backgroundColor: colors.chip }]} />
                )}
                {item.videoUrl && (
                  <View style={styles.playBadge}>
                    <Ionicons name="play" size={13} color={colors.white} style={{ marginLeft: 2 }} />
                  </View>
                )}
              </View>
              <View style={{ flexShrink: 1 }}>
                <Txt size={12} weight="medium" numberOfLines={1}>{item.name}</Txt>
                <Txt size={11} color={colors.primaryText}>{label}</Txt>
              </View>
            </Pressable>
          );
        }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 0, paddingVertical: spacing.md },
  item: {
    width: 196,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primaryTint,
    borderRadius: radius.md,
    paddingRight: spacing.sm,
  },
  thumb: { width: 80, height: 80, borderRadius: radius.md, backgroundColor: colors.chip },
  playBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
