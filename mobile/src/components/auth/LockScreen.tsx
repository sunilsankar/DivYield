import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {
  authenticateWithBiometrics,
  isBiometricsAvailable,
  isBiometricsEnabled,
  verifyPin,
} from '../../services/security';
import { useTheme } from '../../context/ThemeContext';

interface LockScreenProps {
  onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const { theme, isSketch } = useTheme();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);

  useEffect(() => {
    checkAndTriggerBiometrics();
  }, []);

  const checkAndTriggerBiometrics = async () => {
    const available = await isBiometricsAvailable();
    const enabled = await isBiometricsEnabled();
    setBiometricsAvailable(available && enabled);

    if (available && enabled) {
      const success = await authenticateWithBiometrics();
      if (success) {
        onUnlock();
      }
    }
  };

  const handleKeyPress = async (digit: string) => {
    if (error) setError(false);
    if (pin.length >= 4) return;

    const nextPin = pin + digit;
    setPin(nextPin);

    if (nextPin.length === 4) {
      const valid = await verifyPin(nextPin);
      if (valid) {
        onUnlock();
      } else {
        setError(true);
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 600);
      }
    }
  };

  const handleBackspace = () => {
    if (error) setError(false);
    setPin(prev => prev.slice(0, -1));
  };

  const dynamicStyles = {
    container: {
      backgroundColor: theme.background,
    },
    title: {
      color: theme.textPrimary,
    },
    subtitle: {
      color: error ? '#dc2626' : theme.textSecondary,
    },
    dot: {
      borderColor: isSketch ? '#18181b' : theme.accent,
      borderWidth: isSketch ? 2 : 1.5,
      backgroundColor: 'transparent',
    },
    dotFilled: {
      backgroundColor: isSketch ? '#18181b' : theme.accent,
    },
    keyButton: {
      backgroundColor: theme.cardBg,
      borderColor: theme.cardBorder,
      borderWidth: isSketch ? 2 : 1,
    },
    keyText: {
      color: theme.textPrimary,
    },
  };

  return (
    <SafeAreaView style={[styles.safeArea, dynamicStyles.container]}>
      <StatusBar barStyle={isSketch ? 'dark-content' : 'dark-content'} />
      <View style={styles.header}>
        <Text style={[styles.brand, { color: theme.accent }]}>DivYield</Text>
        <Text style={[styles.title, dynamicStyles.title]}>App Locked</Text>
        <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
          {error ? 'Incorrect PIN, try again' : 'Enter your 4-digit PIN to continue'}
        </Text>

        <View style={styles.dotsRow}>
          {[0, 1, 2, 3].map(index => {
            const isFilled = pin.length > index;
            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  dynamicStyles.dot,
                  isFilled && dynamicStyles.dotFilled,
                ]}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.keypad}>
        {[
          ['1', '2', '3'],
          ['4', '5', '6'],
          ['7', '8', '9'],
        ].map((row, rIdx) => (
          <View key={rIdx} style={styles.keypadRow}>
            {row.map(digit => (
              <TouchableOpacity
                key={digit}
                style={[styles.keyButton, dynamicStyles.keyButton]}
                onPress={() => handleKeyPress(digit)}
                activeOpacity={0.7}
              >
                <Text style={[styles.keyText, dynamicStyles.keyText]}>{digit}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <View style={styles.keypadRow}>
          {biometricsAvailable ? (
            <TouchableOpacity
              style={[styles.keyButton, dynamicStyles.keyButton]}
              onPress={checkAndTriggerBiometrics}
              activeOpacity={0.7}
            >
              <Text style={styles.actionIcon}>👆</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.keyPlaceholder} />
          )}

          <TouchableOpacity
            style={[styles.keyButton, dynamicStyles.keyButton]}
            onPress={() => handleKeyPress('0')}
            activeOpacity={0.7}
          >
            <Text style={[styles.keyText, dynamicStyles.keyText]}>0</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.keyButton, dynamicStyles.keyButton]}
            onPress={handleBackspace}
            activeOpacity={0.7}
          >
            <Text style={[styles.keyText, dynamicStyles.keyText]}>⌫</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  brand: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 32,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  keypad: {
    marginBottom: 20,
    paddingHorizontal: 16,
    gap: 16,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  keyButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  keyPlaceholder: {
    width: 72,
    height: 72,
  },
  keyText: {
    fontSize: 26,
    fontWeight: '600',
  },
  actionIcon: {
    fontSize: 26,
  },
});
