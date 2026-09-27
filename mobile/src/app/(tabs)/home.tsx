import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/AuthProvider';
import { CompetitionList } from '@/components/CompetitionList';
import { ScreenTitle } from '@/components/ScreenTitle';
import { colors } from '@/theme';

export default function HomeScreen() {
  const { user } = useAuth();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScreenTitle title={`Hi, ${user?.name.split(' ')[0] ?? ''} 👋`} />
      <CompetitionList />
    </SafeAreaView>
  );
}
