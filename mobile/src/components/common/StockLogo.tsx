import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface StockLogoProps {
  ticker?: string | null;
  size?: number;
}

export function formatTicker(ticker?: string | null): string {
  // ponytail: strip Trading212 exchange suffix for display; raw ticker preserved for DB/API
  if (!ticker) return '';
  return ticker
    .split('_')[0]
    .replace(/\.(US|AS|L|DE|PA|MC|MI|SW)$/i, '')
    .toUpperCase();
}

export const StockLogo: React.FC<StockLogoProps> = ({ ticker = '', size = 38 }) => {
  const [useFallbackUrl, setUseFallbackUrl] = useState(false);
  const [hasError, setHasError] = useState(false);

  const raw = (ticker || '').trim();
  const clean = formatTicker(raw);

  useEffect(() => {
    setUseFallbackUrl(false);
    setHasError(false);
  }, [ticker]);

  const primaryUrl = `https://trading212equities.s3.eu-central-1.amazonaws.com/${clean}.png`;
  const fallbackUrl = raw.includes('_')
    ? `https://trading212equities.s3.eu-central-1.amazonaws.com/${raw}.png`
    : `https://trading212equities.s3.eu-central-1.amazonaws.com/${clean}_US_EQ.png`;

  const imgUrl = useFallbackUrl ? fallbackUrl : primaryUrl;

  const handleImageError = () => {
    if (!useFallbackUrl && fallbackUrl !== primaryUrl) {
      setUseFallbackUrl(true);
    } else {
      setHasError(true);
    }
  };

  // Color generator for avatar fallback
  const getBackgroundColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['#2563eb', '#059669', '#7c3aed', '#d97706', '#dc2626', '#0891b2', '#4f46e5'];
    return colors[Math.abs(hash) % colors.length];
  };

  if (!clean || hasError) {
    const initials = clean.slice(0, 3) || 'DY';
    return (
      <View
        style={[
          styles.fallbackAvatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: getBackgroundColor(clean),
          },
        ]}
      >
        <Text style={[styles.avatarText, { fontSize: Math.max(10, size * 0.32) }]}>
          {initials}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Image
        source={{ uri: imgUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="contain"
        onError={handleImageError}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  fallbackAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
