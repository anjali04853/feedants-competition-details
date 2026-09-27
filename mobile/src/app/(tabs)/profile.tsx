import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthProvider';
import { ScreenTitle } from '@/components/ScreenTitle';
import { Card } from '@/components/ui/Card';
import { Txt } from '@/components/ui/Txt';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n/LanguageProvider';
import { colors, spacing } from '@/theme';

export default function ProfileScreen() {
  const { t } = useI18n();
  const toast = useToast();
  const { user, switchUser } = useAuth();
  const [switching, setSwitching] = useState<string | null>(null);
  const users = useQuery({ queryKey: ['dev-users'], queryFn: api.devUsers });

  const onSwitch = async (id: string) => {
    setSwitching(id);
    try {
      await switchUser(id);
    } catch {
      toast(t('genericError'), 'error');
    } finally {
      setSwitching(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScreenTitle title={t('profile')} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        {user && (
          <Card style={styles.me}>
            {user.avatarUrl && <Image source={{ uri: user.avatarUrl }} style={styles.avatarLg} />}
            <View>
              <Txt size={12} color={colors.textMuted}>{t('signedInAs')}</Txt>
              <Txt size={18} weight="semibold">{user.name}</Txt>
              <Txt size={12} color={colors.primaryText}>#{user.referralCode}</Txt>
            </View>
          </Card>
        )}

        <View>
          <Txt size={15} weight="semibold">{t('switchUser')}</Txt>
          <Txt size={12} color={colors.textMuted} style={{ marginBottom: spacing.sm }}>{t('switchUserHelp')}</Txt>
          <Card style={{ padding: 0 }}>
            {users.isPending && <ActivityIndicator style={{ padding: spacing.lg }} color={colors.primary} />}
            {users.data?.map((u, i) => {
              const active = u.id === user?.id;
              return (
                <Pressable
                  key={u.id}
                  onPress={() => !active && onSwitch(u.id)}
                  style={[styles.userRow, i > 0 && styles.divider]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                >
                  {u.avatarUrl && <Image source={{ uri: u.avatarUrl }} style={styles.avatar} />}
                  <Txt size={14} weight={active ? 'semibold' : 'regular'} style={{ flex: 1 }}>{u.name}</Txt>
                  {switching === u.id ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={20} color={active ? colors.primary : colors.textMuted} />
                  )}
                </Pressable>
              );
            })}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  me: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatarLg: { width: 64, height: 64, borderRadius: 32 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
});
