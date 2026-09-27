import { Stack } from 'expo-router';
import { colors } from '@/theme';

// Ensures the list sits beneath a deep-linked details screen, so "Go back" works.
export const unstable_settings = { initialRouteName: 'index' };

export default function CompetitionsLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
