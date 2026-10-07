import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import {
  clearDatabase,
  exportAllDataAsCsv,
  getStats,
} from '../../services/database';
import {
  deleteCredentials,
  getCredentials,
  saveCredentials,
} from '../../services/secureStore';
import { Trading212Client } from '../../services/trading212';
import {
  disableNotifications,
  isNotificationsEnabled,
  requestNotificationPermission,
} from '../../services/notifications';
import {
  isPinSet,
  setAppPin,
  removeAppPin,
  isBiometricsAvailable,
  isBiometricsEnabled,
  setBiometricsEnabled,
} from '../../services/security';

interface SettingsViewProps {
  onRefreshData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onRefreshData }) => {
  const { theme, themeMode, setThemeMode, isSketch } = useTheme();

  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [dbStats, setDbStats] = useState({ holdings: 0, transactions: 0, dividends: 0 });
  const [notificationsActive, setNotificationsActive] = useState(false);

  // App Lock & Biometrics state
  const [pinEnabled, setPinEnabled] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsOn, setBiometricsOn] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinStep, setPinStep] = useState<'create' | 'confirm'>('create');
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    loadCreds();
    loadStats();
    loadNotificationStatus();
    loadSecurityStatus();
  }, []);

  const loadSecurityStatus = async () => {
    const hasPin = await isPinSet();
    setPinEnabled(hasPin);
    const hasBio = await isBiometricsAvailable();
    setBiometricsAvailable(hasBio);
    const bioOn = await isBiometricsEnabled();
    setBiometricsOn(bioOn);
  };

  const handleTogglePin = async () => {
    if (pinEnabled) {
      Alert.alert(
        'Disable App Lock',
        'Are you sure you want to disable PIN and biometric protection?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              await removeAppPin();
              setPinEnabled(false);
              setBiometricsOn(false);
            },
          },
        ]
      );
    } else {
      setPinInput('');
      setPinConfirm('');
      setPinStep('create');
      setPinError('');
      setShowPinModal(true);
    }
  };

  const handleToggleBiometrics = async (val: boolean) => {
    await setBiometricsEnabled(val);
    setBiometricsOn(val);
  };

  const handleSavePinStep = async () => {
    if (pinStep === 'create') {
      if (pinInput.length !== 4) {
        setPinError('PIN must be 4 digits');
        return;
      }
      setPinStep('confirm');
      setPinError('');
    } else {
      if (pinConfirm !== pinInput) {
        setPinError('PINs do not match. Try again.');
        return;
      }
      await setAppPin(pinInput);
      setPinEnabled(true);
      setShowPinModal(false);
      Alert.alert('App Lock Enabled', 'Your 4-digit PIN is active.');
    }
  };

  const loadNotificationStatus = async () => {
    const active = await isNotificationsEnabled();
    setNotificationsActive(active);
  };

  const handleToggleNotifications = async (val: boolean) => {
    if (val) {
      const granted = await requestNotificationPermission();
      setNotificationsActive(granted);
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Notification permission was not granted. Please enable notifications for DivYield in your device Settings.'
        );
      } else {
        Alert.alert(
          'Alerts Enabled',
          'You will receive reminders at 9:00 AM on scheduled dividend payment dates.'
        );
      }
    } else {
      await disableNotifications();
      setNotificationsActive(false);
    }
  };

  const loadCreds = async () => {
    const creds = await getCredentials();
    if (creds && creds.apiKey) {
      setApiKey(creds.apiKey);
      setApiSecret(creds.apiSecret || '');
      setIsDemo(creds.environment === 'demo');
      setIsSaved(true);
    }
  };

  const loadStats = async () => {
    const s = await getStats();
    setDbStats(s);
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter your Trading 212 API Key');
      return;
    }
    if (!apiSecret.trim()) {
      Alert.alert('Error', 'Please enter your Trading 212 API Secret');
      return;
    }
    await saveCredentials(apiKey, apiSecret, isDemo ? 'demo' : 'live');
    setIsSaved(true);
    setTestResult(null);
    Alert.alert('Success', 'Trading 212 credentials saved securely on your device.');
  };

  const handleTest = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
      Alert.alert('Error', 'Please enter both your API Key and API Secret first.');
      return;
    }
    setIsTesting(true);
    setTestResult(null);

    const client = new Trading212Client({
      apiKey,
      apiSecret,
      environment: isDemo ? 'demo' : 'live',
    });

    const res = await client.testConnection();
    setIsTesting(false);
    setTestResult(res);
  };

  const handleDelete = () => {
    Alert.alert(
      'Remove Credentials',
      'Are you sure you want to remove your Trading 212 API credentials from this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await deleteCredentials();
            setApiKey('');
            setApiSecret('');
            setIsSaved(false);
            setTestResult(null);
          },
        },
      ]
    );
  };

  const handleClearDb = () => {
    Alert.alert(
      'Clear Local Database',
      'This will delete all locally cached holdings, transactions, and dividends on this device. Your Trading 212 API key will be kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            await clearDatabase();
            await loadStats();
            onRefreshData();
            Alert.alert('Cleared', 'Local SQLite database has been wiped.');
          },
        },
      ]
    );
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const csv = await exportAllDataAsCsv();
      if (!csv || csv.trim().length === 0) {
        Alert.alert('Export Empty', 'No holdings or transactions are available to export yet. Perform a sync first.');
        return;
      }
      await Share.share({
        title: 'DivYield_Portfolio_Export.csv',
        message: csv,
      });
    } catch (err: any) {
      Alert.alert('Export Error', err.message || 'Failed to export CSV data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      {/* API Key Form */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
            borderWidth: isSketch ? 2 : 1,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="key-outline" size={24} color={theme.accent} />
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
            Trading 212 API Credentials
          </Text>
        </View>

        {/* How to get API key link button */}
        <TouchableOpacity
          style={[styles.helpGuideBanner, isSketch && styles.sketchBorder]}
          onPress={() => setShowHelpModal(true)}
        >
          <MaterialCommunityIcons name="help-circle-outline" size={20} color="#2563eb" />
          <View style={{ flex: 1 }}>
            <Text style={styles.helpGuideTitle}>How to get your API Key?</Text>
            <Text style={styles.helpGuideSub}>
              Tap to see required permissions & setup checklist
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#2563eb" />
        </TouchableOpacity>

        <Text style={styles.inputLabel}>API Key *</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: isSketch ? '#faf7f2' : '#f8fafc',
              borderColor: theme.cardBorder,
              color: theme.textPrimary,
            },
          ]}
          placeholder="Paste Trading 212 API key"
          placeholderTextColor="#94a3b8"
          value={apiKey}
          onChangeText={setApiKey}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={isSaved && apiKey.length > 10}
        />

        <Text style={styles.inputLabel}>API Secret *</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: isSketch ? '#faf7f2' : '#f8fafc',
              borderColor: theme.cardBorder,
              color: theme.textPrimary,
            },
          ]}
          placeholder="Paste Trading 212 API Secret"
          placeholderTextColor="#94a3b8"
          value={apiSecret}
          onChangeText={setApiSecret}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={isSaved && apiSecret.length > 5}
        />

        <View style={styles.switchRow}>
          <View>
            <Text style={[styles.switchLabel, { color: theme.textPrimary }]}>
              Practice / Demo Environment
            </Text>
            <Text style={styles.switchSub}>Turn on only if using a Demo account</Text>
          </View>
          <Switch
            value={isDemo}
            onValueChange={setIsDemo}
            trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
            thumbColor={isDemo ? '#2563eb' : '#f8fafc'}
          />
        </View>

        {testResult && (
          <View style={[styles.testBox, testResult.ok ? styles.testOk : styles.testFail]}>
            <MaterialCommunityIcons
              name={testResult.ok ? 'check-circle' : 'alert-circle'}
              size={18}
              color={testResult.ok ? '#059669' : '#dc2626'}
            />
            <Text
              style={[
                styles.testText,
                testResult.ok ? styles.testTextOk : styles.testTextFail,
              ]}
            >
              {testResult.message}
            </Text>
          </View>
        )}

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary, isSketch && styles.sketchBorder]}
            onPress={handleTest}
            disabled={isTesting}
          >
            <Text style={styles.btnTextSecondary}>
              {isTesting ? 'Testing...' : 'Test Connection'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.btn,
              styles.btnPrimary,
              { backgroundColor: theme.accent },
              isSketch && styles.sketchBorder,
            ]}
            onPress={handleSave}
          >
            <Text style={styles.btnTextPrimary}>Save Key</Text>
          </TouchableOpacity>
        </View>

        {isSaved && (
          <TouchableOpacity style={styles.deleteLink} onPress={handleDelete}>
            <Text style={styles.deleteLinkText}>Disconnect & Delete Key</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Theme Options */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
            borderWidth: isSketch ? 2 : 1,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="palette-outline" size={24} color={theme.accent} />
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>App Theme</Text>
        </View>
        <Text style={styles.themeSub}>
          Choose your interface style. Sketch mode gives a hand-drawn paper look.
        </Text>

        <View style={styles.themeToggleRow}>
          <TouchableOpacity
            style={[
              styles.themeOptionBtn,
              themeMode === 'modern' && styles.themeOptionActive,
              isSketch && styles.sketchBorder,
            ]}
            onPress={() => setThemeMode('modern')}
          >
            <MaterialCommunityIcons
              name="cellphone"
              size={18}
              color={themeMode === 'modern' ? '#ffffff' : '#64748b'}
            />
            <Text
              style={[
                styles.themeOptionText,
                themeMode === 'modern' && styles.themeOptionTextActive,
              ]}
            >
              Modern
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.themeOptionBtn,
              themeMode === 'sketch' && styles.themeOptionActiveSketch,
              isSketch && styles.sketchBorder,
            ]}
            onPress={() => setThemeMode('sketch')}
          >
            <MaterialCommunityIcons
              name="draw"
              size={18}
              color={themeMode === 'sketch' ? '#18181b' : '#64748b'}
            />
            <Text
              style={[
                styles.themeOptionText,
                themeMode === 'sketch' && styles.themeOptionTextActiveSketch,
              ]}
            >
              Sketch
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Dividend Notifications */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
            borderWidth: isSketch ? 2 : 1,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="bell-ring-outline" size={24} color="#f59e0b" />
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Dividend Alerts</Text>
        </View>
        <Text style={styles.themeSub}>
          Receive local reminders at 9:00 AM on the day scheduled dividend payouts are due.
        </Text>
        <View style={styles.notificationRow}>
          <Text style={[styles.notificationLabel, { color: theme.textPrimary }]}>
            Upcoming Payout Reminders
          </Text>
          <Switch
            value={notificationsActive}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: '#cbd5e1', true: theme.accent }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      {/* App Lock & Biometrics */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
            borderWidth: isSketch ? 2 : 1,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="shield-key-outline" size={24} color="#6366f1" />
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>App Lock & Security</Text>
        </View>
        <Text style={styles.themeSub}>
          Protect your portfolio and dividend data with a 4-digit PIN or fingerprint / face biometric unlock.
        </Text>

        <View style={styles.notificationRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={[styles.notificationLabel, { color: theme.textPrimary }]}>
              4-Digit PIN Lock
            </Text>
            <Text style={styles.securityToggleSub}>
              {pinEnabled ? 'PIN protection active' : 'Disabled (tap switch to set PIN)'}
            </Text>
          </View>
          <Switch
            value={pinEnabled}
            onValueChange={handleTogglePin}
            trackColor={{ false: '#cbd5e1', true: theme.accent }}
            thumbColor="#ffffff"
          />
        </View>

        {pinEnabled && biometricsAvailable && (
          <View style={[styles.notificationRow, { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10, marginTop: 4 }]}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.notificationLabel, { color: theme.textPrimary }]}>
                Biometric Unlock
              </Text>
              <Text style={styles.securityToggleSub}>
                Use Fingerprint or Face ID when opening DivYield
              </Text>
            </View>
            <Switch
              value={biometricsOn}
              onValueChange={handleToggleBiometrics}
              trackColor={{ false: '#cbd5e1', true: theme.accent }}
              thumbColor="#ffffff"
            />
          </View>
        )}
      </View>

      {/* Export to CSV */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
            borderWidth: isSketch ? 2 : 1,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="file-delimited-outline" size={24} color="#059669" />
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Data Export</Text>
        </View>
        <Text style={styles.exportSub}>
          Export your portfolio holdings, dividend records, and transactions into a standard CSV file.
        </Text>

        <TouchableOpacity
          style={[styles.exportBtn, isSketch && styles.sketchBorder]}
          onPress={handleExportCsv}
          disabled={isExporting}
        >
          <MaterialCommunityIcons name="export-variant" size={20} color="#ffffff" />
          <Text style={styles.exportBtnText}>
            {isExporting ? 'Exporting...' : 'Export to CSV'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Permissions Checklist Box */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
            borderWidth: isSketch ? 2 : 1,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="shield-lock-outline" size={24} color="#059669" />
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
            Strict Read-Only Guarantee
          </Text>
        </View>
        <Text style={styles.securityText}>
          DivYield is mathematically read-only. It contains ZERO trading, order execution, or money transfer code.
        </Text>

        <View style={styles.checklist}>
          <View style={styles.checkItem}>
            <MaterialCommunityIcons name="check" size={16} color="#059669" />
            <Text style={styles.checkText}>Account data: ON</Text>
          </View>
          <View style={styles.checkItem}>
            <MaterialCommunityIcons name="check" size={16} color="#059669" />
            <Text style={styles.checkText}>History (Dividends, Orders, Tx): ON</Text>
          </View>
          <View style={styles.checkItem}>
            <MaterialCommunityIcons name="check" size={16} color="#059669" />
            <Text style={styles.checkText}>Metadata: ON</Text>
          </View>
          <View style={styles.checkItem}>
            <MaterialCommunityIcons name="check" size={16} color="#059669" />
            <Text style={styles.checkText}>Pies - Read & Portfolio: ON</Text>
          </View>
          <View style={styles.checkItem}>
            <MaterialCommunityIcons name="close" size={16} color="#dc2626" />
            <Text style={[styles.checkText, { color: '#dc2626', fontWeight: '700' }]}>
              Orders - Execute: OFF (Forbidden)
            </Text>
          </View>
          <View style={styles.checkItem}>
            <MaterialCommunityIcons name="close" size={16} color="#dc2626" />
            <Text style={[styles.checkText, { color: '#dc2626', fontWeight: '700' }]}>
              Pies - Write: OFF (Forbidden)
            </Text>
          </View>
        </View>

        <Text style={styles.securitySub}>
          Credentials are saved exclusively in your phone's hardware-backed SecureStore.
        </Text>
      </View>

      {/* Local Database Storage */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
            borderWidth: isSketch ? 2 : 1,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="database-outline" size={24} color="#475569" />
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
            Local SQLite Storage
          </Text>
        </View>

        <View style={styles.storageRow}>
          <Text style={styles.storageLabel}>Holdings Stored</Text>
          <Text style={[styles.storageValue, { color: theme.textPrimary }]}>
            {dbStats.holdings}
          </Text>
        </View>
        <View style={styles.storageRow}>
          <Text style={styles.storageLabel}>Dividends (Received & Forecast)</Text>
          <Text style={[styles.storageValue, { color: theme.textPrimary }]}>
            {dbStats.dividends}
          </Text>
        </View>
        <View style={styles.storageRow}>
          <Text style={styles.storageLabel}>Transactions Stored</Text>
          <Text style={[styles.storageValue, { color: theme.textPrimary }]}>
            {dbStats.transactions}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.clearBtn, isSketch && styles.sketchBorder]}
          onPress={handleClearDb}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={18} color="#dc2626" />
          <Text style={styles.clearBtnText}>Clear Local Database</Text>
        </TouchableOpacity>
      </View>

      {/* Help Modal: Step-by-Step API Key Instructions */}
      <Modal
        visible={showHelpModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHelpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
                borderWidth: isSketch ? 2 : 0,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  API Key Setup Guide
                </Text>
                <Text style={styles.modalSub}>
                  Follow these steps in your Trading 212 account
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowHelpModal(false)}
                style={styles.modalCloseBtn}
              >
                <MaterialCommunityIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.guideList}>
              <View style={styles.guideStep}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>1</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>
                    Open Trading 212 Settings
                  </Text>
                  <Text style={styles.stepDesc}>
                    Log into your Trading 212 mobile app or web portal. Tap on your profile icon or Menu &gt; Settings &gt; API.
                  </Text>
                </View>
              </View>

              <View style={styles.guideStep}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>2</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>
                    Generate API Key
                  </Text>
                  <Text style={styles.stepDesc}>
                    Click &quot;Generate API key&quot; (or &quot;New API Key&quot;). Give it a label like &quot;DivYield&quot;.
                  </Text>
                </View>
              </View>

              <View style={styles.guideStep}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>3</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>
                    Enable Read-Only Permissions
                  </Text>
                  <Text style={styles.stepDesc}>
                    Ensure the following permissions are checked ON:
                  </Text>
                  <View style={styles.permList}>
                    <Text style={styles.permOn}>✓ Account data: ON</Text>
                    <Text style={styles.permOn}>✓ History (Orders &amp; Tx): ON</Text>
                    <Text style={styles.permOn}>✓ History - Dividends: ON</Text>
                    <Text style={styles.permOn}>✓ Metadata: ON</Text>
                    <Text style={styles.permOn}>✓ Pies - Read &amp; Portfolio: ON</Text>
                  </View>
                </View>
              </View>

              <View style={styles.guideStep}>
                <View style={[styles.stepBadge, { backgroundColor: '#fee2e2' }]}>
                  <Text style={[styles.stepBadgeText, { color: '#dc2626' }]}>!</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepTitle, { color: '#dc2626' }]}>
                    Disable Order Execution (Mandatory)
                  </Text>
                  <Text style={styles.stepDesc}>
                    Leave &quot;Orders - Execute&quot; and &quot;Pies - Write&quot; strictly OFF. DivYield is completely read-only and never requires order rights.
                  </Text>
                </View>
              </View>

              <View style={styles.guideStep}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>4</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>
                    Paste Key &amp; Sync
                  </Text>
                  <Text style={styles.stepDesc}>
                    Copy the generated API key, paste it into DivYield, and tap &quot;Save Key&quot; then &quot;Test Connection&quot;.
                  </Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.gotItBtn, { backgroundColor: theme.accent }]}
              onPress={() => setShowHelpModal(false)}
            >
              <Text style={styles.gotItBtnText}>Got it, thanks!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PIN Setup Modal */}
      <Modal
        visible={showPinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
                borderWidth: isSketch ? 2 : 0,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="numeric" size={24} color="#6366f1" />
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  {pinStep === 'create' ? 'Set 4-Digit PIN' : 'Confirm Your PIN'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowPinModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.stepDesc, { marginVertical: 12 }]}>
              {pinStep === 'create'
                ? 'Enter a 4-digit PIN to lock DivYield.'
                : 'Re-enter your 4-digit PIN to confirm.'}
            </Text>

            <TextInput
              style={[
                styles.pinInputBox,
                {
                  backgroundColor: isSketch ? '#faf7f2' : '#f8fafc',
                  borderColor: theme.cardBorder,
                  color: theme.textPrimary,
                },
                isSketch && styles.sketchBorder,
              ]}
              value={pinStep === 'create' ? pinInput : pinConfirm}
              onChangeText={pinStep === 'create' ? setPinInput : setPinConfirm}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              autoFocus
              textAlign="center"
              placeholder="••••"
              placeholderTextColor="#94a3b8"
            />

            {pinError ? <Text style={styles.pinErrorText}>{pinError}</Text> : null}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              {pinStep === 'confirm' && (
                <TouchableOpacity
                  style={[styles.pinBackBtn, isSketch && styles.sketchBorder]}
                  onPress={() => {
                    setPinStep('create');
                    setPinConfirm('');
                    setPinError('');
                  }}
                >
                  <Text style={styles.pinBackBtnText}>Back</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.gotItBtn,
                  { flex: 1, backgroundColor: isSketch ? '#18181b' : '#6366f1' },
                  isSketch && styles.sketchBorder,
                ]}
                onPress={handleSavePinStep}
              >
                <Text style={styles.gotItBtnText}>
                  {pinStep === 'create' ? 'Next' : 'Save PIN'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  helpGuideBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    marginBottom: 14,
  },
  helpGuideTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  helpGuideSub: {
    fontSize: 11,
    color: '#3b82f6',
    marginTop: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  switchSub: {
    fontSize: 11,
    color: '#64748b',
  },
  testBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
  },
  testOk: {
    backgroundColor: '#ecfdf5',
  },
  testFail: {
    backgroundColor: '#fef2f2',
  },
  testText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  testTextOk: {
    color: '#065f46',
  },
  testTextFail: {
    color: '#991b1b',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: '#2563eb',
  },
  btnSecondary: {
    backgroundColor: '#f1f5f9',
  },
  btnTextPrimary: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  btnTextSecondary: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
  deleteLink: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 4,
  },
  deleteLinkText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '700',
  },
  themeSub: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
  },
  themeToggleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  themeOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  themeOptionActive: {
    backgroundColor: '#0f172a',
  },
  themeOptionActiveSketch: {
    backgroundColor: '#fef3c7',
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  themeOptionTextActive: {
    color: '#ffffff',
  },
  themeOptionTextActiveSketch: {
    color: '#18181b',
  },
  exportSub: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    height: 44,
    borderRadius: 10,
    gap: 8,
  },
  exportBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  securityText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 12,
  },
  checklist: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginVertical: 4,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  securitySub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 8,
  },
  storageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  storageLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  storageValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  clearBtnText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
  },
  guideList: {
    marginVertical: 14,
  },
  guideStep: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563eb',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
  permList: {
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
    gap: 4,
  },
  permOn: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
  },
  gotItBtn: {
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  gotItBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  notificationLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  securityToggleSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  pinInputBox: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 14,
    marginVertical: 8,
  },
  pinErrorText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  pinBackBtn: {
    height: 46,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  pinBackBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
  sketchBorder: {
    borderWidth: 1,
    borderColor: '#18181b',
  },
});
