import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AnalyticsView } from './src/components/analytics/AnalyticsView';
import { CalendarView } from './src/components/calendar/CalendarView';
import { BottomNavBar } from './src/components/common/BottomNavBar';
import { SyncProgressBar } from './src/components/common/SyncProgressBar';
import { TopAppBar } from './src/components/common/TopAppBar';
import { DashboardView } from './src/components/dashboard/DashboardView';
import { HoldingsView } from './src/components/holdings/HoldingsView';
import { SettingsView } from './src/components/settings/SettingsView';
import {
  getDividends,
  getHoldings,
  getMonthlyDividends,
  getPortfolioSummary,
  getSetting,
  initDatabase,
} from './src/services/database';
import { hasCredentials } from './src/services/secureStore';
import { runSync } from './src/services/sync';
import {
  DividendEvent,
  Holding,
  PortfolioSummary,
  SyncProgress,
  TabKey,
} from './src/types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabKey>('dashboard');
  const [summary, setSummary] = useState<PortfolioSummary>({
    total_value: 0,
    holdings_value: 0,
    total_invested: 0,
    unrealized_pnl: 0,
    pnl_percent: 0,
    free_cash: 0,
    total_cash: 0,
    holdings_count: 0,
    account_currency: 'EUR',
  });
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [dividends, setDividends] = useState<DividendEvent[]>([]);
  const [monthlyDividends, setMonthlyDividends] = useState<
    Array<{ month: string; received: number; forecast: number }>
  >([]);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    is_syncing: false,
    current_step: 0,
    total_steps: 7,
    step_message: '',
  });

  const loadData = async () => {
    try {
      await initDatabase();
      const s = await getPortfolioSummary();
      const h = await getHoldings();
      const d = await getDividends();
      const m = await getMonthlyDividends();
      const ls = await getSetting('last_synced', '');

      setSummary(s);
      setHoldings(h);
      setDividends(d);
      setMonthlyDividends(m);
      if (ls) setLastSynced(ls);
    } catch (e) {
      console.error('Error loading database data:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSync = async () => {
    const configured = await hasCredentials();
    if (!configured) {
      Alert.alert(
        'Setup Required',
        'Please enter your Trading 212 API Key in Settings before syncing.',
        [
          { text: 'Go to Settings', onPress: () => setCurrentTab('settings') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    try {
      setSyncProgress({
        is_syncing: true,
        current_step: 1,
        total_steps: 7,
        step_message: 'Starting sync...',
      });

      const res = await runSync(progress => {
        setSyncProgress(progress);
      });

      await loadData();
      Alert.alert('Sync Successful', res.message);
    } catch (err: any) {
      Alert.alert('Sync Error', err.message || 'Failed to sync with Trading 212');
    } finally {
      setSyncProgress(prev => ({ ...prev, is_syncing: false }));
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />

        {/* Top App Bar */}
        <TopAppBar
          isSyncing={syncProgress.is_syncing}
          onSyncPress={handleSync}
          lastSynced={lastSynced}
        />

        {/* Sync Progress Bar */}
        <SyncProgressBar progress={syncProgress} />

        {/* Screen Content */}
        <View style={styles.content}>
          {currentTab === 'dashboard' && (
            <DashboardView
              summary={summary}
              holdings={holdings}
              dividends={dividends}
              monthlyDividends={monthlyDividends}
              onNavigateTab={setCurrentTab}
            />
          )}

          {currentTab === 'holdings' && <HoldingsView holdings={holdings} />}

          {currentTab === 'calendar' && <CalendarView dividends={dividends} />}

          {currentTab === 'analytics' && (
            <AnalyticsView
              summary={summary}
              holdings={holdings}
              dividends={dividends}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView onRefreshData={loadData} />
          )}
        </View>

        {/* Material 3 Bottom Navigation Bar */}
        <BottomNavBar currentTab={currentTab} onTabChange={setCurrentTab} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});
