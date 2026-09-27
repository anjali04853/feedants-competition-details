import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTestimonials } from '@/api/queries';
import { Card } from '@/components/ui/Card';
import { ErrorView } from '@/components/ui/ErrorView';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { Txt } from '@/components/ui/Txt';
import { useI18n } from '@/i18n/LanguageProvider';
import { colors, spacing } from '@/theme';

export default function TestimonialsScreen() {
  const { t } = useI18n();
  const { data, isPending, error, refetch } = useTestimonials();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.header}>
        <Txt size={18} weight="semibold">{t('testimonials')}</Txt>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('close')}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
      </View>
      {isPending ? (
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          {[0, 1, 2].map((i) => <SkeletonBlock key={i} height={96} />)}
        </View>
      ) : error ? (
        <ErrorView message={t('networkError')} onRetry={refetch} retryLabel={t('retry')} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          renderItem={({ item }) => (
            <Card style={{ gap: spacing.sm }}>
              <View style={styles.row}>
                {item.avatarUrl && <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />}
                <View style={{ flex: 1 }}>
                  <Txt weight="semibold">{item.userName}</Txt>
                  <View style={{ flexDirection: 'row' }} accessibilityLabel={`${item.rating} / 5`}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Ionicons key={i} name={i < item.rating ? 'star' : 'star-outline'} size={13} color={colors.gold} />
                    ))}
                  </View>
                </View>
              </View>
              <Txt color={colors.textSecondary}>“{item.quote}”</Txt>
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20 },
});
