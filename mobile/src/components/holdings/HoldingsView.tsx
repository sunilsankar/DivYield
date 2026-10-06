import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Holding } from '../../types';
import { StockLogo } from '../common/StockLogo';

interface HoldingsViewProps {
  holdings: Holding[];
}

type SortField = 'value' | 'pnl' | 'ticker' | 'quantity';

export const HoldingsView: React.FC<HoldingsViewProps> = ({ holdings }) => {
  const { theme, isSketch } = useTheme();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('value');

  const filteredHoldings = useMemo(() => {
    let list = holdings.filter(h => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return (
        h.ticker.toLowerCase().includes(q) ||
        (h.name && h.name.toLowerCase().includes(q)) ||
        (h.sector && h.sector.toLowerCase().includes(q))
      );
    });

    list.sort((a, b) => {
      if (sortBy === 'value') return b.market_value - a.market_value;
      if (sortBy === 'pnl') return b.ppl - a.ppl;
      if (sortBy === 'ticker') return a.ticker.localeCompare(b.ticker);
      if (sortBy === 'quantity') return b.quantity - a.quantity;
      return 0;
    });

    return list;
  }, [holdings, search, sortBy]);

  const totalValue = useMemo(() => {
    return holdings.reduce((acc, h) => acc + h.market_value, 0);
  }, [holdings]);

  const renderItem = ({ item }: { item: Holding }) => {
    const isPos = item.ppl >= 0;
    const invested = item.quantity * item.average_price;
    const pnlPercent = invested > 0 ? (item.ppl / invested) * 100 : 0;
    const weight = totalValue > 0 ? (item.market_value / totalValue) * 100 : 0;

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
        <View style={styles.topRow}>
          <StockLogo ticker={item.ticker} size={40} />
          <View style={styles.headerInfo}>
            <View style={styles.tickerWeightRow}>
              <Text style={[styles.ticker, { color: theme.textPrimary }]}>{item.ticker}</Text>
              <Text style={styles.weightBadge}>{weight.toFixed(1)}%</Text>
              {Boolean(item.sector) && (
                <Text style={styles.sectorBadge} numberOfLines={1}>
                  {item.sector}
                </Text>
              )}
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {item.name || item.ticker}
            </Text>
          </View>
          <View style={styles.valueCol}>
            <Text style={[styles.marketValue, { color: theme.textPrimary }]}>
              €{item.market_value.toFixed(2)}
            </Text>
            <View style={[styles.pnlPill, isPos ? styles.pnlPos : styles.pnlNeg]}>
              <Text style={[styles.pnlText, isPos ? styles.pnlTextPos : styles.pnlTextNeg]}>
                {isPos ? '+' : ''}€{item.ppl.toFixed(2)} ({isPos ? '+' : ''}{pnlPercent.toFixed(1)}%)
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <Text style={styles.detailText}>
            {item.quantity.toLocaleString()} shs @ €{item.average_price.toFixed(2)}
          </Text>
          <View style={styles.rightDetails}>
            {item.dividend_yield && item.dividend_yield > 0 ? (
              <Text style={styles.yieldText}>
                Yield: {(item.dividend_yield * 100).toFixed(2)}% •{' '}
              </Text>
            ) : null}
            <Text style={styles.priceText}>
              Curr: €{item.current_price.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Search Bar */}
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: isSketch ? '#faf7f2' : '#ffffff',
              borderColor: theme.cardBorder,
              borderWidth: isSketch ? 2 : 1,
            },
          ]}
        >
          <MaterialCommunityIcons name="magnify" size={20} color="#94a3b8" />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Search holdings or sectors..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Sort Chips */}
      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sort:</Text>
        {(['value', 'pnl', 'ticker', 'quantity'] as SortField[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[
              styles.sortChip,
              {
                backgroundColor: isSketch ? '#faf7f2' : '#ffffff',
                borderColor: theme.cardBorder,
                borderWidth: isSketch ? 1 : 1,
              },
              sortBy === f && {
                backgroundColor: theme.accent,
                borderColor: theme.accent,
              },
            ]}
            onPress={() => setSortBy(f)}
          >
            <Text
              style={[
                styles.sortChipText,
                sortBy === f && styles.sortChipTextActive,
              ]}
            >
              {f === 'value' ? 'Value' : f === 'pnl' ? 'Return' : f === 'ticker' ? 'Name' : 'Shares'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={filteredHoldings}
        keyExtractor={item => item.ticker}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No matching holdings found</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sortChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  sortChipTextActive: {
    color: '#ffffff',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 10,
  },
  card: {
    borderRadius: 16,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  tickerWeightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  ticker: {
    fontSize: 15,
    fontWeight: '800',
  },
  weightBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  sectorBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0369a1',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    maxWidth: 90,
  },
  name: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  valueCol: {
    alignItems: 'flex-end',
  },
  marketValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  pnlPill: {
    marginTop: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pnlPos: {
    backgroundColor: '#ecfdf5',
  },
  pnlNeg: {
    backgroundColor: '#fef2f2',
  },
  pnlText: {
    fontSize: 10,
    fontWeight: '700',
  },
  pnlTextPos: {
    color: '#059669',
  },
  pnlTextNeg: {
    color: '#dc2626',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  detailText: {
    fontSize: 11,
    color: '#64748b',
  },
  rightDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  yieldText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  priceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
  },
});
