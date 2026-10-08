import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Transaction } from '../../types';
import { StockLogo } from '../common/StockLogo';

interface HistoryViewProps {
  transactions: Transaction[];
}

type HistoryFilter = 'ALL' | 'ORDERS' | 'CASH';

export const HistoryView: React.FC<HistoryViewProps> = ({ transactions }) => {
  const { theme, isSketch } = useTheme();
  const [filter, setFilter] = useState<HistoryFilter>('ALL');

  const filteredTransactions = useMemo(() => {
    if (filter === 'ORDERS') return transactions.filter(tx => tx.type === 'BUY' || tx.type === 'SELL');
    if (filter === 'CASH') return transactions.filter(tx => tx.type !== 'BUY' && tx.type !== 'SELL');
    return transactions;
  }, [filter, transactions]);

  const filterLabels: Array<{ key: HistoryFilter; label: string }> = [
    { key: 'ALL', label: 'All' },
    { key: 'ORDERS', label: 'Orders' },
    { key: 'CASH', label: 'Cash & Dividends' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}> 
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Order & History</Text>
          <Text style={styles.subtitle}>Read-only Trading 212 activity</Text>
        </View>
        <Text style={[styles.count, { color: theme.accent }]}>{filteredTransactions.length}</Text>
      </View>

      <View style={styles.filterRow}>
        {filterLabels.map(item => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.filterPill,
              { borderColor: theme.cardBorder },
              filter === item.key && { backgroundColor: theme.accent, borderColor: theme.accent },
              isSketch && styles.sketchBorder,
            ]}
            onPress={() => setFilter(item.key)}
          >
            <Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredTransactions}
        keyExtractor={(item, index) => item.external_id || `${item.id || 'transaction'}-${index}`}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isOrder = item.type === 'BUY' || item.type === 'SELL';
          const isPositive = item.type === 'SELL' || item.type === 'DIVIDEND' || item.type === 'INTEREST';
          const typeColor = item.type === 'BUY' ? '#059669' : item.type === 'SELL' ? '#d97706' : '#2563eb';

          return (
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
              <View style={styles.cardTopRow}>
                <View style={styles.dateRow}>
                  <MaterialCommunityIcons name="calendar-clock" size={16} color={theme.textSecondary} />
                  <Text style={styles.date}>{item.date ? item.date.slice(0, 10) : '-'}</Text>
                </View>
                <Text style={[styles.type, { color: typeColor }]}>{item.type}</Text>
              </View>

              <View style={styles.assetRow}>
                {item.ticker ? <StockLogo ticker={item.ticker} size={36} /> : <View style={styles.cashIcon}><MaterialCommunityIcons name="wallet-outline" size={20} color="#64748b" /></View>}
                <View style={styles.assetInfo}>
                  <Text style={[styles.ticker, { color: theme.textPrimary }]}>{item.ticker || 'Account activity'}</Text>
                  <Text style={styles.details}>
                    {isOrder && item.quantity ? `${item.quantity.toLocaleString()} shares` : item.notes || 'Trading 212 account activity'}
                    {isOrder && item.price ? ` at ${item.currency} ${item.price.toFixed(2)}` : ''}
                  </Text>
                </View>
                <Text style={[styles.amount, { color: isPositive ? '#059669' : item.type === 'BUY' ? '#dc2626' : theme.textPrimary }]}>
                  {item.type === 'BUY' ? '-' : item.type === 'SELL' || isPositive ? '+' : ''}{item.currency} {item.total_amount.toFixed(2)}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="history" size={42} color="#cbd5e1" />
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No activity yet</Text>
            <Text style={styles.emptyText}>Sync Trading 212 to load orders, dividends, and cash history.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  title: { fontSize: 20, fontWeight: '800' },
  subtitle: { color: '#64748b', fontSize: 12, marginTop: 2 },
  count: { fontSize: 20, fontWeight: '800' },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  filterPill: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  filterText: { color: '#64748b', fontSize: 11, fontWeight: '700' },
  filterTextActive: { color: '#ffffff' },
  listContent: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  card: { borderRadius: 14, padding: 12 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  date: { color: '#64748b', fontSize: 11, fontWeight: '600' },
  type: { fontSize: 11, fontWeight: '800' },
  assetRow: { flexDirection: 'row', alignItems: 'center' },
  cashIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  assetInfo: { flex: 1, marginLeft: 10 },
  ticker: { fontSize: 14, fontWeight: '800' },
  details: { color: '#64748b', fontSize: 11, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '800', marginLeft: 8 },
  empty: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 72 },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 10 },
  emptyText: { color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 4 },
  sketchBorder: { borderWidth: 1, borderColor: '#18181b' },
});
