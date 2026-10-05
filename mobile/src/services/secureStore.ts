import * as SecureStore from 'expo-secure-store';
import { Trading212Credentials } from '../types';

const KEY_API_KEY = 'dy_t212_auth_token'; // gitleaks:allow
const KEY_API_SECRET = 'dy_t212_auth_pass'; // gitleaks:allow
const KEY_ENVIRONMENT = 'dy_t212_env';

export async function saveCredentials(
  apiKey: string,
  apiSecret?: string,
  environment: 'live' | 'demo' = 'live'
): Promise<void> {
  const cleanKey = apiKey.trim();
  const cleanSecret = (apiSecret || '').trim();

  await SecureStore.setItemAsync(KEY_API_KEY, cleanKey);
  if (cleanSecret) {
    await SecureStore.setItemAsync(KEY_API_SECRET, cleanSecret);
  } else {
    await SecureStore.deleteItemAsync(KEY_API_SECRET);
  }
  await SecureStore.setItemAsync(KEY_ENVIRONMENT, environment);
}

export async function getCredentials(): Promise<Trading212Credentials | null> {
  const apiKey = await SecureStore.getItemAsync(KEY_API_KEY);
  if (!apiKey) {
    return null;
  }
  const apiSecret = (await SecureStore.getItemAsync(KEY_API_SECRET)) || undefined;
  const envRaw = await SecureStore.getItemAsync(KEY_ENVIRONMENT);
  const environment: 'live' | 'demo' = envRaw === 'demo' ? 'demo' : 'live';

  return {
    apiKey,
    apiSecret,
    environment,
  };
}

export async function hasCredentials(): Promise<boolean> {
  const apiKey = await SecureStore.getItemAsync(KEY_API_KEY);
  return Boolean(apiKey && apiKey.length > 0);
}

export async function deleteCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_API_KEY);
  await SecureStore.deleteItemAsync(KEY_API_SECRET);
  await SecureStore.deleteItemAsync(KEY_ENVIRONMENT);
}

export function maskSecret(secret?: string | null): string {
  if (!secret) return '••••••••';
  const trimmed = secret.trim();
  if (trimmed.length <= 4) return '••••••••';
  return `••••••••${trimmed.slice(-4)}`;
}
