import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const KEY_APP_PIN = 'dy_app_lock_pin';
const KEY_BIOMETRICS_ENABLED = 'dy_app_lock_biometrics';

export async function isPinSet(): Promise<boolean> {
  const pin = await SecureStore.getItemAsync(KEY_APP_PIN);
  return Boolean(pin && pin.length >= 4);
}

export async function getAppPin(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_APP_PIN);
}

export async function setAppPin(pin: string): Promise<void> {
  const cleanPin = pin.trim();
  if (cleanPin.length < 4) {
    throw new Error('PIN must be at least 4 digits');
  }
  await SecureStore.setItemAsync(KEY_APP_PIN, cleanPin);
}

export async function removeAppPin(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_APP_PIN);
  await SecureStore.deleteItemAsync(KEY_BIOMETRICS_ENABLED);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const storedPin = await SecureStore.getItemAsync(KEY_APP_PIN);
  if (!storedPin) return true; // No PIN set
  return storedPin === pin.trim();
}

export async function isBiometricsAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && isEnrolled;
}

export async function isBiometricsEnabled(): Promise<boolean> {
  const setting = await SecureStore.getItemAsync(KEY_BIOMETRICS_ENABLED);
  // Default to true if hardware is available, unless explicitly disabled
  if (setting === null) {
    return isBiometricsAvailable();
  }
  return setting === 'true';
}

export async function setBiometricsEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(KEY_BIOMETRICS_ENABLED, enabled ? 'true' : 'false');
}

export async function authenticateWithBiometrics(
  promptMessage = 'Unlock DivYield'
): Promise<boolean> {
  try {
    const available = await isBiometricsAvailable();
    if (!available) return false;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Use PIN',
      disableDeviceFallback: true,
      requireConfirmation: false,
    });

    return result.success;
  } catch (err) {
    // ponytail: safe fallback to PIN if biometric prompt is interrupted or unavailable
    return false;
  }
}
