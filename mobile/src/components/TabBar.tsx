import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/AuthProvider';
import { Txt } from '@/components/ui/Txt';
import { useI18n } from '@/i18n/LanguageProvider';
import type { StringKey } from '@/i18n/strings';
import { colors, radius, spacing } from '@/theme';

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const LABELS: Record<string, StringKey | null> = {
  home: 'home',
  explore: 'explore',
  create: null,
  competitions: 'competitions',
  profile: 'profile',
};

/** Custom bar matching the design: raised "+" in the middle, avatar for Profile. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { user } = useAuth();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const color = focused ? colors.primary : colors.textMuted;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        const label = LABELS[route.name];

        if (route.name === 'create') {
          return (
            <Pressable key={route.key} onPress={onPress} style={styles.item} accessibilityRole="button" accessibilityLabel="Create">
              <View style={styles.create}>
                <Ionicons name="add-circle-outline" size={30} color={colors.white} />
              </View>
            </Pressable>
          );
        }

        let icon: React.ReactNode;
        if (route.name === 'home') icon = <Ionicons name="home" size={24} color={focused ? colors.primary : '#8C93A6'} />;
        else if (route.name === 'explore') icon = <Ionicons name="search-outline" size={25} color={color} />;
        else if (route.name === 'competitions') icon = <MaterialCommunityIcons name="trophy" size={25} color={color} />;
        else
          icon = user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={[styles.avatar, focused && { borderColor: colors.primary }]} />
          ) : (
            <Ionicons name="person-circle" size={27} color={color} />
          );

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={styles.item}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label ? t(label) : route.name}
          >
            {icon}
            {label && <Txt size={10.5} weight={focused ? 'semibold' : 'regular'} color={color}>{t(label)}</Txt>}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  create: {
    width: 50,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
});
