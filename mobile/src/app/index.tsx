import { Redirect } from 'expo-router';

/** The app opens straight onto the featured competition (the screen from the design). */
export default function Index() {
  return <Redirect href="/competitions/feedants-classical-dance" />;
}
