import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

/** Opens a video in the in-app browser (falls back to the system handler). */
export async function openVideo(url: string | null | undefined) {
  if (!url) return;
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    await Linking.openURL(url).catch(() => {});
  }
}
