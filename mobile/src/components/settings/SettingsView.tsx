import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { clearDatabase, getStats } from '../../services/database';
import {
  deleteCredentials,
  getCredentials,
  saveCredentials,
} from '../../services/secureStore';
import { Trading212Client } from '../../services/trading212';

interface SettingsViewProps {
  onRefreshData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onRefreshData }) => {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [dbStats, setDbStats] = useState({ holdings: 0, transactions: 0 });

  useEffect(() => {
    loadCreds();
    loadStats();
  }, []);

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
    setDbStats(await getStats());
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter your Trading 212 API Key');
      return;
    }
    await saveCredentials(apiKey, apiSecret, isDemo ? 'demo' : 'live');
    setIsSaved(true);
    setTestResult(null);
    Alert.alert('Success', 'Trading 212 credentials saved securely on your device.');
  };

  const handleTest = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter your API Key first.');
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* API Key Form */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="key-outline" size={24} color="#2563eb" />
          <Text style={styles.cardTitle}>Trading 212 API Credentials</Text>
        </View>

        <Text style={styles.inputLabel}>API Key *</Text>
        <TextInput
          style={styles.input}
          placeholder="Paste Trading 212 API key"
          placeholderTextColor="#94a3b8"
          value={apiKey}
          onChangeText={setApiKey}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={isSaved && apiKey.length > 10}
        />

        <Text style={styles.inputLabel}>API Secret (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Paste API Secret (if using Basic Auth)"
          placeholderTextColor="#94a3b8"
          value={apiSecret}
          onChangeText={setApiSecret}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={isSaved && apiSecret.length > 5}
        />

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>Practice / Demo Environment</Text>
            <Text style={styles.switchSub}>Turn on only if using a Demo account</Text>
          </View>
          <Switch value={isDemo} onValueChange={setIsDemo} trackColor={{ false: '#cbd5e1', true: '#93c5fd' }} thumbColor={isDemo ? '#2563eb' : '#f8fafc'} />
        </View>

        {testResult && (
          <View style={[styles.testBox, testResult.ok ? styles.testOk : styles.testFail]}>
            <MaterialCommunityIcons
              name={testResult.ok ? 'check-circle' : 'alert-circle'}
              size={18}
              color={testResult.ok ? '#059669' : '#dc2626'}
            />
            <Text style={[styles.testText, testResult.ok ? styles.testTextOk : styles.testTextFail]}>
              {testResult.message}
            </Text>
          </View>
        )}

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary]}
            onPress={handleTest}
            disabled={isTesting}
          >
            <Text style={styles.btnTextSecondary}>
              {isTesting ? 'Testing...' : 'Test Connection'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleSave}>
            <Text style={styles.btnTextPrimary}>Save Key</Text>
          </TouchableOpacity>
        </View>

        {isSaved && (
          <TouchableOpacity style={styles.deleteLink} onPress={handleDelete}>
            <Text style={styles.deleteLinkText}>Disconnect & Delete Key</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Permissions & Security Box */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="shield-lock-outline" size={24} color="#059669" />
          <Text style={styles.cardTitle}>Strict Read-Only Security</Text>
        </View>
        <Text style={styles.securityText}>
          DivYield is mathematically read-only. It contains ZERO trading, order execution, or transfer code.
        </Text>

        <View style={styles.checklist}>
          <View style={styles.checkItem}>
            <MaterialCommunityIcons name="check" size={16} color="#059669" />
            <Text style={styles.checkText}>Account & Cash: ON</Text>
          </View>
          <View style={styles.checkItem}>
            <MaterialCommunityIcons name="check" size={16} color="#059669" />
            <Text style={styles.checkText}>History & Dividends: ON</Text>
          </View>
          <View style={styles.checkItem}>
            <MaterialCommunityIcons name="close" size={16} color="#dc2626" />
            <Text style={[styles.checkText, { color: '#dc2626', fontWeight: '700' }]}>
              Orders - Execute: OFF (Forbidden)
            </Text>
          </View>
        </View>

        <Text style={styles.securitySub}>
          Your credentials are encrypted directly in your device's hardware-backed SecureStore.
        </Text>
      </View>

      {/* Local Database Storage */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="database-outline" size={24} color="#475569" />
          <Text style={styles.cardTitle}>Local SQLite Storage</Text>
        </View>

        <View style={styles.storageRow}>
          <Text style={styles.storageLabel}>Holdings Stored</Text>
          <Text style={styles.storageValue}>{dbStats.holdings}</Text>
        </View>
        <View style={styles.storageRow}>
          <Text style={styles.storageLabel}>Transactions Stored</Text>
          <Text style={styles.storageValue}>{dbStats.transactions}</Text>
        </View>

        <TouchableOpacity style={styles.clearBtn} onPress={handleClearDb}>
          <MaterialCommunityIcons name="trash-can-outline" size={18} color="#dc2626" />
          <Text style={styles.clearBtnText}>Clear Local Database</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  card: {
    backgroundColor: '#ffffff',
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
    color: '#0f172a',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: '#0f172a',
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
    color: '#0f172a',
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
    marginTop: 10,
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
    color: '#1e293b',
    fontSize: 14,
    fontWeight: '700',
  },
  deleteLink: {
    marginTop: 14,
    alignItems: 'center',
  },
  deleteLinkText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
  },
  securityText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 10,
  },
  checklist: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    gap: 6,
    marginBottom: 8,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  securitySub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  storageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
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
    color: '#0f172a',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 10,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
  },
});
