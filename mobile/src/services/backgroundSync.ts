import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { runSync } from './sync';
import { hasCredentials } from './secureStore';
import { getSetting, setSetting } from './database';

export const BACKGROUND_SYNC_TASK = 'DIVYIELD_DAILY_BACKGROUND_SYNC';
export const DAILY_SYNC_SETTING_KEY = 'daily_sync_enabled';

// ponytail: register globally on load; TaskManager calls this headlessly when WorkManager fires
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const isEnabled = await getSetting(DAILY_SYNC_SETTING_KEY, 'false');
    if (isEnabled !== 'true') {
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    const hasCreds = await hasCredentials();
    if (!hasCreds) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    const result = await runSync();
    return result.success
      ? BackgroundTask.BackgroundTaskResult.Success
      : BackgroundTask.BackgroundTaskResult.Failed;
  } catch (err) {
    console.error('Daily background sync error:', err);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function isDailySyncEnabled(): Promise<boolean> {
  const val = await getSetting(DAILY_SYNC_SETTING_KEY, 'false');
  return val === 'true';
}

export async function registerDailySync(): Promise<boolean> {
  try {
    await setSetting(DAILY_SYNC_SETTING_KEY, 'true');
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (!isRegistered) {
      // minimumInterval in minutes: 24 hours = 1440 minutes
      await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: 24 * 60,
      });
    }
    return true;
  } catch (err) {
    console.error('Failed to register daily background sync:', err);
    return false;
  }
}

export async function unregisterDailySync(): Promise<boolean> {
  try {
    await setSetting(DAILY_SYNC_SETTING_KEY, 'false');
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (isRegistered) {
      await BackgroundTask.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
    }
    return true;
  } catch (err) {
    console.error('Failed to unregister daily background sync:', err);
    return false;
  }
}
