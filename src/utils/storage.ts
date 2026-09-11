import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  onboarding: '@rootora/onboarding',
  tutorialVisto: 'tutorial_visto',
} as const;

export async function salvarItem<T>(chave: string, valor: T): Promise<void> {
  await AsyncStorage.setItem(chave, JSON.stringify(valor));
}

export async function lerItem<T>(chave: string): Promise<T | null> {
  const bruto = await AsyncStorage.getItem(chave);
  return bruto ? (JSON.parse(bruto) as T) : null;
}

export function chaveRecoveryShown(data: string): string {
  return `recovery_shown:${data}`;
}

export function chaveAppBlockBannerDismissed(data: string): string {
  return `app_block_banner_dismissed:${data}`;
}
