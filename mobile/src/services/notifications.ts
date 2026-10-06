import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getUpcomingForecastDividends, getSetting, setSetting } from './database';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('dividends', {
      name: 'Dividend Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563eb',
    });
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  await ensureChannel();
  const { status: currentStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = currentStatus;

  if (currentStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  const granted = finalStatus === 'granted';
  await setSetting('notifications_enabled', granted ? 'true' : 'false');
  if (granted) {
    await scheduleUpcomingDividends();
  }
  return granted;
}

export async function disableNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await setSetting('notifications_enabled', 'false');
}

export async function isNotificationsEnabled(): Promise<boolean> {
  const pref = await getSetting('notifications_enabled', 'false');
  if (pref !== 'true') return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

// ponytail: schedules next 30 dividends at fixed 9:00 AM local time; add user time-of-day picker if requested
export async function scheduleUpcomingDividends(): Promise<number> {
  const enabled = (await getSetting('notifications_enabled', 'false')) === 'true';
  if (!enabled) return 0;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return 0;

  await ensureChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();

  const upcoming = await getUpcomingForecastDividends(30);
  let scheduledCount = 0;

  for (const div of upcoming) {
    const [year, month, day] = div.payment_date.split('-').map(Number);
    if (!year || !month || !day) continue;

    const triggerDate = new Date(year, month - 1, day, 9, 0, 0);
    if (triggerDate.getTime() <= Date.now()) continue;

    const sym = div.currency === 'EUR' ? '€' : div.currency === 'USD' ? '$' : '£';
    const amountStr = `${sym}${div.amount.toFixed(2)}`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Dividend Expected: ${div.ticker}`,
        body: `Upcoming payout of ${amountStr} for ${div.ticker} is due today`,
        data: { ticker: div.ticker, date: div.payment_date },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: 'dividends',
      },
    });
    scheduledCount++;
  }

  return scheduledCount;
}
