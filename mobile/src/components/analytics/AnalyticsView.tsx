import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DividendEvent, Holding, PortfolioSummary } from '../../types';
import { StockLogo } from '../common/StockLogo';

interface AnalyticsViewProps {
  summary: PortfolioSummary;
  holdings: Holding[];
  dividends: DividendEvent[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  summary,
  holdings,
  dividends,
}) => {
  const totalValue = summary.total_value > 0 ? summary.total_value : 1;

  // Concentration metrics
  const sortedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => b.market_value - a.market_value);
  }, [holdings]);

  const top1Weight = useMemo(() => {
    if (sortedHoldings.length === 0) return 0;
    return (sortedHoldings[0].market_value / totalValue) * 100;
  }, [sortedHoldings, totalValue]);

  const top3Weight = useMemo(() => {
    return (
      (sortedHoldings.slice(0, 3).reduce((acc, h) => acc + h.market_value, 0) /
        totalValue) *
      100
    );
  }, [sortedHoldings, totalValue]);

  const top5Weight = useMemo(() => {
    return (
      (sortedHoldings.slice(0, 5).reduce((acc, h) => acc + h.market_value, 0) /
        totalValue) *
      100
    );
  }, [sortedHoldings, totalValue]);

  // HHI Calculation
  const hhi = useMemo(() => {
    let sumSquares = 0;
    for (const h of holdings) {
      const share = (h.market_value / totalValue) * 100;
      sumSquares += share * share;
    }
    return Math.round(sumSquares);
  }, [holdings, totalValue]);

  // Diversification score 0 - 100
  const diversificationScore = useMemo(() => {
    if (holdings.length === 0) return 0;
    // Lower HHI is better (<1500 is diverse)
    const countScore = Math.min(40, holdings.length * 2);
    const hhiScore = Math.max(0, 60 - (hhi / 3000) * 60);
    return Math.min(100, Math.round(countScore + hhiScore));
  }, [holdings, hhi]);

  // Income ranking (top dividend contributors)
  const incomeRanking = useMemo(() => {
    const divTotals = new Map<string, { total: number; count: number }>();
    for (const d of dividends) {
      if (!divTotals.has(d.ticker)) divTotals.set(d.ticker, { total: 0, count: 0 });
      const item = divTotals.get(d.ticker)!;
      item.total += d.amount;
      item.count += 1;
    }
    const totalDivs = dividends.reduce((a, b) => a + b.amount, 0) || 1;

    const list = Array.from(divTotals.entries()).map(([ticker, data]) => ({
      ticker,
      total: data.total,
      count: data.count,
      percent: (data.total / totalDivs) * 100,
    }));
    list.sort((a, b) => b.total - a.total);
    return list.slice(0, 8);
  }, [dividends]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Diversification Score Card */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreHeader}>
          <MaterialCommunityIcons name="shield-check" size={28} color="#2563eb" />
          <Text style={styles.scoreTitle}>Diversification Health</Text>
        </View>

        <View style={styles.gaugeContainer}>
          <Text style={styles.scoreNumber}>{diversificationScore}</Text>
          <Text style={styles.scoreMax}>/ 100</Text>
        </View>

        <Text style={styles.scoreVerdict}>
          {diversificationScore >= 80
            ? 'Excellent balance across holdings'
            : diversificationScore >= 60
            ? 'Good diversification with minor concentration'
            : 'Moderate concentration risk detected'}
        </Text>

        <View style={styles.hhiBadge}>
          <Text style={styles.hhiText}>
            HHI Index: {hhi} ({hhi < 1500 ? 'Low concentration' : hhi < 2500 ? 'Moderate' : 'High'})
          </Text>
        </View>
      </View>

      {/* Concentration Breakdown */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Holding Concentration</Text>

        <View style={styles.metricItem}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Top Holding Weight</Text>
            <Text style={styles.metricValue}>{top1Weight.toFixed(1)}%</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.bar, { width: `${Math.min(100, top1Weight)}%`, backgroundColor: '#3b82f6' }]} />
          </View>
        </View>

        <View style={styles.metricItem}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Top 3 Holdings</Text>
            <Text style={styles.metricValue}>{top3Weight.toFixed(1)}%</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.bar, { width: `${Math.min(100, top3Weight)}%`, backgroundColor: '#6366f1' }]} />
          </View>
        </View>

        <View style={styles.metricItem}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Top 5 Holdings</Text>
            <Text style={styles.metricValue}>{top5Weight.toFixed(1)}%</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.bar, { width: `${Math.min(100, top5Weight)}%`, backgroundColor: '#8b5cf6' }]} />
          </View>
        </View>
      </View>

      {/* Income Leaders */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Top Income Producers</Text>
        <Text style={styles.cardSubtitle}>Holdings generating the most cash dividends</Text>

        {incomeRanking.map((item, idx) => (
          <View key={idx} style={styles.incomeRow}>
            <StockLogo ticker={item.ticker} size={36} />
            <View style={styles.incomeInfo}>
              <Text style={styles.incomeTicker}>{item.ticker}</Text>
              <Text style={styles.incomeCount}>{item.count} payments</Text>
            </View>
            <View style={styles.incomeAmountCol}>
              <Text style={styles.incomeAmount}>€{item.total.toFixed(2)}</Text>
              <Text style={styles.incomePercent}>{item.percent.toFixed(1)}% of total</Text>
            </View>
          </View>
        ))}
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
  scoreCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  scoreTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  gaugeContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 6,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: '#2563eb',
    letterSpacing: -1,
  },
  scoreMax: {
    fontSize: 18,
    fontWeight: '700',
    color: '#94a3b8',
    marginLeft: 4,
  },
  scoreVerdict: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    marginTop: 4,
  },
  hhiBadge: {
    marginTop: 14,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  hhiText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 14,
  },
  metricItem: {
    marginBottom: 14,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  track: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
  incomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  incomeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  incomeTicker: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  incomeCount: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  incomeAmountCol: {
    alignItems: 'flex-end',
  },
  incomeAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
  },
  incomePercent: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
});
