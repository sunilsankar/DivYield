import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { DividendEvent, Holding, PortfolioSummary } from '../../types';
import { StockLogo } from '../common/StockLogo';

// ponytail: ticker suffix heuristic; upgrade to backend API region metadata when mobile syncs geographic payload
const getRegion = (ticker: string) => {
  const normalized = ticker.toUpperCase();
  if (normalized.endsWith('_US_EQ') || normalized.includes('.US') || (!normalized.includes('_') && !normalized.includes('.') && normalized.length <= 5 && !normalized.endsWith('L') && !normalized.endsWith('D') && !normalized.endsWith('A'))) {
    return 'United States';
  }
  if (normalized.endsWith('_NL_EQ') || normalized.includes('.AS') || normalized.endsWith('A')) {
    return 'Netherlands & Euronext';
  }
  if (normalized.endsWith('_GB_EQ') || normalized.includes('.L') || normalized.endsWith('L')) {
    return 'United Kingdom';
  }
  if (normalized.endsWith('_DE_EQ') || normalized.includes('.DE') || normalized.endsWith('D') || normalized.includes('.XETRA')) {
    return 'Germany & DAX';
  }
  return 'International / Other';
};

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
  const { theme, isSketch } = useTheme();
  const totalValue = summary.total_value > 0 ? summary.total_value : 1;
  const [expandedSector, setExpandedSector] = useState<string | null>(null);
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);

  // Compounding simulator parameters
  const [projYears, setProjYears] = useState<number>(10);
  const [dividendGrowthRate, setDividendGrowthRate] = useState<number>(6.0);
  const [expectedPriceGrowth, setExpectedPriceGrowth] = useState<number>(4.0);
  const [annualContribution, setAnnualContribution] = useState<number>(1000);
  const [reinvestDividends, setReinvestDividends] = useState<boolean>(true);

  // Yield & Income calculations
  const totalAnnualDividend = useMemo(() => {
    let sum = 0;
    for (const h of holdings) {
      if (h.annual_dividend && h.annual_dividend > 0) {
        sum += h.annual_dividend;
      } else if (h.dividend_yield && h.dividend_yield > 0) {
        sum += h.market_value * (h.dividend_yield / 100);
      }
    }
    return sum;
  }, [holdings]);

  const totalInvested = summary.total_invested > 0 ? summary.total_invested : totalValue;
  const portfolioYield = totalValue > 0 ? (totalAnnualDividend / totalValue) * 100 : 0;
  const yieldOnCost = totalInvested > 0 ? (totalAnnualDividend / totalInvested) * 100 : 0;

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

  // Sector allocation calculation
  const sectorAllocation = useMemo(() => {
    const map = new Map<string, { totalValue: number; holdings: Holding[] }>();
    for (const h of holdings) {
      const sector = h.sector && h.sector.trim().length > 0 ? h.sector.trim() : 'Unassigned / ETFs';
      if (!map.has(sector)) {
        map.set(sector, { totalValue: 0, holdings: [] });
      }
      const item = map.get(sector)!;
      item.totalValue += h.market_value;
      item.holdings.push(h);
    }

    const sectors = Array.from(map.entries()).map(([name, data]) => ({
      name,
      value: data.totalValue,
      count: data.holdings.length,
      percentage: (data.totalValue / totalValue) * 100,
      holdings: data.holdings.sort((a, b) => b.market_value - a.market_value),
    }));

    sectors.sort((a, b) => b.value - a.value);
    return sectors;
  }, [holdings, totalValue]);

  const geographicAllocation = useMemo(() => {
    const map = new Map<string, Holding[]>();
    for (const holding of holdings) {
      const region = getRegion(holding.ticker);
      if (!map.has(region)) map.set(region, []);
      map.get(region)!.push(holding);
    }

    return Array.from(map.entries())
      .map(([region, regionHoldings]) => ({
        region,
        holdings: regionHoldings.sort((a, b) => b.market_value - a.market_value),
        value: regionHoldings.reduce((sum, holding) => sum + holding.market_value, 0),
      }))
      .sort((a, b) => b.value - a.value);
  }, [holdings]);

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

  // Concentration and safety warnings
  const singleStockWarnings = useMemo(() => {
    const list: string[] = [];
    for (const h of holdings) {
      const pct = (h.market_value / totalValue) * 100;
      if (pct > 15) {
        list.push(`${h.ticker} is ${pct.toFixed(1)}% of portfolio (exceeds 15% guideline)`);
      }
    }
    return list;
  }, [holdings, totalValue]);

  const sectorWarnings = useMemo(() => {
    return sectorAllocation
      .filter((s) => s.percentage > 25)
      .map((s) => `${s.name} is ${s.percentage.toFixed(1)}% of portfolio (exceeds 25% guideline)`);
  }, [sectorAllocation]);

  const hasWarnings = singleStockWarnings.length > 0 || sectorWarnings.length > 0;

  // ponytail: local projection calculation in JS matching backend logic; upgrade to shared API when client transitions to network API
  const projections = useMemo(() => {
    const dGrowth = dividendGrowthRate / 100;
    const pGrowth = expectedPriceGrowth / 100;
    let portVal = totalValue;
    let annDiv = totalAnnualDividend > 0 ? totalAnnualDividend : totalValue * 0.035;
    let invested = totalInvested;
    let cumulative = 0;

    const list: Array<{
      year: number;
      portfolioValue: number;
      annualDividend: number;
      yieldOnCost: number;
      cumulative: number;
    }> = [];

    for (let yr = 1; yr <= projYears; yr++) {
      annDiv = annDiv * (1 + dGrowth);
      cumulative += annDiv;
      portVal = portVal * (1 + pGrowth);

      if (reinvestDividends) {
        portVal += annDiv;
        const reinvestYield = portVal > 0 ? annDiv / portVal : 0.035;
        annDiv += annDiv * reinvestYield;
      }

      if (annualContribution > 0) {
        portVal += annualContribution;
        const contribYield = portVal > 0 ? annDiv / portVal : 0.035;
        annDiv += annualContribution * contribYield;
        invested += annualContribution;
      }

      const yoc = invested > 0 ? (annDiv / invested) * 100 : 0;
      list.push({
        year: yr,
        portfolioValue: portVal,
        annualDividend: annDiv,
        yieldOnCost: yoc,
        cumulative,
      });
    }

    return list;
  }, [
    totalValue,
    totalAnnualDividend,
    totalInvested,
    projYears,
    dividendGrowthRate,
    expectedPriceGrowth,
    reinvestDividends,
    annualContribution,
  ]);

  const finalYearProj = projections[projections.length - 1];

  const maxProjDividend = useMemo(() => {
    let max = 1;
    for (const p of projections) {
      if (p.annualDividend > max) max = p.annualDividend;
    }
    return max;
  }, [projections]);

  // Historical dividend growth by year
  const historicalGrowth = useMemo(() => {
    const yearTotals = new Map<number, number>();
    for (const d of dividends) {
      if (d.status === 'RECEIVED' && d.payment_date) {
        const yr = parseInt(d.payment_date.slice(0, 4), 10);
        if (!isNaN(yr)) {
          yearTotals.set(yr, (yearTotals.get(yr) || 0) + d.amount);
        }
      }
    }
    const years = Array.from(yearTotals.keys()).sort((a, b) => a - b);
    const items = years.map((yr, idx) => {
      const amt = yearTotals.get(yr) || 0;
      const prevAmt = idx > 0 ? yearTotals.get(years[idx - 1]) || 0 : null;
      const yoy = prevAmt && prevAmt > 0 ? ((amt - prevAmt) / prevAmt) * 100 : null;
      return { year: yr, amount: amt, yoy };
    });
    let cagr: number | null = null;
    if (items.length >= 2) {
      const first = items[0].amount;
      const last = items[items.length - 1].amount;
      if (first > 0 && last > 0) {
        cagr = (Math.pow(last / first, 1 / (items.length - 1)) - 1) * 100;
      }
    }
    return { items, cagr };
  }, [dividends]);

  const renderHoldingDetails = (items: Holding[]) => (
    <View style={styles.holdingDetails}>
      {items.map((holding, idx) => (
        <View key={`${holding.ticker}-${idx}`} style={styles.holdingRow}>
          <StockLogo ticker={holding.ticker} size={30} />
          <View style={styles.holdingInfo}>
            <Text style={[styles.holdingTicker, { color: theme.textPrimary }]}>{holding.ticker}</Text>
            <Text style={styles.holdingName} numberOfLines={1}>{holding.name || 'Unknown holding'}</Text>
          </View>
          <View style={styles.holdingValue}>
            <Text style={[styles.holdingPercent, { color: theme.textPrimary }]}>
              {((holding.market_value / totalValue) * 100).toFixed(1)}%
            </Text>
            <Text style={styles.holdingEuro}>€{holding.market_value.toFixed(0)}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Yield & Return KPIs */}
      <View style={styles.gridRow}>
        <View
          style={[
            styles.kpiCard,
            {
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
              borderWidth: isSketch ? 2 : 1,
            },
          ]}
        >
          <Text style={styles.kpiLabel}>Portfolio Yield</Text>
          <Text style={[styles.kpiValue, { color: '#4f46e5' }]}>
            {portfolioYield.toFixed(2)}%
          </Text>
          <Text style={styles.kpiSub}>€{totalAnnualDividend.toFixed(0)} / year</Text>
        </View>

        <View
          style={[
            styles.kpiCard,
            {
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
              borderWidth: isSketch ? 2 : 1,
            },
          ]}
        >
          <Text style={styles.kpiLabel}>Yield on Cost (YOC)</Text>
          <Text style={[styles.kpiValue, { color: '#059669' }]}>
            {yieldOnCost.toFixed(2)}%
          </Text>
          <Text style={styles.kpiSub}>Cost: €{totalInvested.toFixed(0)}</Text>
        </View>
      </View>

      {/* Diversification Score Card */}
      <View
        style={[
          styles.scoreCard,
          {
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
            borderWidth: isSketch ? 2 : 1,
          },
        ]}
      >
        <View style={styles.scoreHeader}>
          <MaterialCommunityIcons name="shield-check" size={28} color={theme.accent} />
          <Text style={[styles.scoreTitle, { color: theme.textPrimary }]}>
            Diversification Health
          </Text>
        </View>

        <View style={styles.gaugeContainer}>
          <Text style={[styles.scoreNumber, { color: theme.accent }]}>
            {diversificationScore}
          </Text>
          <Text style={styles.scoreMax}>/ 100</Text>
        </View>

        <Text style={styles.scoreVerdict}>
          {diversificationScore >= 80
            ? 'Excellent balance across holdings'
            : diversificationScore >= 60
            ? 'Good diversification with minor concentration'
            : 'Moderate concentration risk detected'}
        </Text>

        <View style={[styles.hhiBadge, isSketch && styles.sketchBorder]}>
          <Text style={styles.hhiText}>
            HHI Index: {hhi} ({hhi < 1500 ? 'Low concentration' : hhi < 2500 ? 'Moderate' : 'High'})
          </Text>
        </View>
      </View>

      {/* Concentration Risk Alerts */}
      {hasWarnings && (
        <View style={[styles.warningCard, isSketch && styles.sketchBorder]}>
          <View style={styles.warningHeader}>
            <MaterialCommunityIcons name="alert-outline" size={18} color="#d97706" />
            <Text style={styles.warningTitle}>Concentration Risk Guidelines</Text>
          </View>
          {singleStockWarnings.map((w, idx) => (
            <Text key={`sw-${idx}`} style={styles.warningText}>• ⚠️ {w}</Text>
          ))}
          {sectorWarnings.map((w, idx) => (
            <Text key={`secw-${idx}`} style={styles.warningText}>• ⚠️ {w}</Text>
          ))}
        </View>
      )}

      {/* Forward Dividend Compounding Simulator */}
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
        <View style={styles.cardHeaderRow}>
          <View>
            <View style={styles.titleWithIcon}>
              <MaterialCommunityIcons name="chart-timeline-variant" size={20} color="#4f46e5" />
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                Dividend Compounding Simulator
              </Text>
            </View>
            <Text style={styles.cardSubtitle}>
              Model dividend growth, DRIP reinvestment, and capital additions
            </Text>
          </View>
        </View>

        {/* Time Horizon Pills */}
        <View style={styles.pillsRow}>
          {[3, 5, 10, 15, 20].map((yr) => (
            <TouchableOpacity
              key={yr}
              onPress={() => setProjYears(yr)}
              style={[
                styles.pillButton,
                projYears === yr && { backgroundColor: theme.accent },
                isSketch && styles.sketchBorder,
              ]}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.pillText,
                  projYears === yr ? styles.pillTextActive : { color: theme.textPrimary },
                ]}
              >
                {yr}Y
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Simulator Controls */}
        <View style={styles.controlsContainer}>
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Dividend Growth Rate</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                onPress={() => setDividendGrowthRate((v) => Math.max(0, Number((v - 0.5).toFixed(1))))}
                style={styles.stepperBtn}
              >
                <Text style={styles.stepperBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={[styles.stepperValue, { color: theme.textPrimary }]}>
                {dividendGrowthRate.toFixed(1)}%
              </Text>
              <TouchableOpacity
                onPress={() => setDividendGrowthRate((v) => Math.min(25, Number((v + 0.5).toFixed(1))))}
                style={styles.stepperBtn}
              >
                <Text style={styles.stepperBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Capital Price Growth</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                onPress={() => setExpectedPriceGrowth((v) => Math.max(-10, Number((v - 0.5).toFixed(1))))}
                style={styles.stepperBtn}
              >
                <Text style={styles.stepperBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={[styles.stepperValue, { color: theme.textPrimary }]}>
                {expectedPriceGrowth.toFixed(1)}%
              </Text>
              <TouchableOpacity
                onPress={() => setExpectedPriceGrowth((v) => Math.min(25, Number((v + 0.5).toFixed(1))))}
                style={styles.stepperBtn}
              >
                <Text style={styles.stepperBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Annual Contribution</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                onPress={() => setAnnualContribution((v) => Math.max(0, v - 250))}
                style={styles.stepperBtn}
              >
                <Text style={styles.stepperBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={[styles.stepperValue, { color: theme.textPrimary }]}>
                €{annualContribution}
              </Text>
              <TouchableOpacity
                onPress={() => setAnnualContribution((v) => v + 250)}
                style={styles.stepperBtn}
              >
                <Text style={styles.stepperBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Reinvest Dividends (DRIP)</Text>
            <TouchableOpacity
              onPress={() => setReinvestDividends((v) => !v)}
              style={[
                styles.dripToggle,
                reinvestDividends ? styles.dripActive : styles.dripInactive,
                isSketch && styles.sketchBorder,
              ]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: reinvestDividends }}
            >
              <Text style={[styles.dripText, reinvestDividends ? styles.dripTextActive : styles.dripTextInactive]}>
                {reinvestDividends ? '✓ Reinvesting' : 'Cash Payout'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Milestone Results for Year N */}
        {finalYearProj && (
          <View style={styles.milestonesGrid}>
            <View style={styles.milestoneItem}>
              <Text style={styles.milestoneLabel}>Yr {projYears} Annual Dividend</Text>
              <Text style={[styles.milestoneValue, { color: '#d97706' }]}>
                €{finalYearProj.annualDividend.toFixed(0)}
              </Text>
              <Text style={styles.milestoneSub}>~€{(finalYearProj.annualDividend / 12).toFixed(0)}/mo</Text>
            </View>

            <View style={styles.milestoneItem}>
              <Text style={styles.milestoneLabel}>Yr {projYears} Portfolio Value</Text>
              <Text style={[styles.milestoneValue, { color: theme.textPrimary }]}>
                €{finalYearProj.portfolioValue.toFixed(0)}
              </Text>
              <Text style={styles.milestoneSub}>Projected assets</Text>
            </View>

            <View style={styles.milestoneItem}>
              <Text style={styles.milestoneLabel}>Projected Yield on Cost</Text>
              <Text style={[styles.milestoneValue, { color: '#059669' }]}>
                {finalYearProj.yieldOnCost.toFixed(1)}%
              </Text>
              <Text style={styles.milestoneSub}>On invested capital</Text>
            </View>

            <View style={styles.milestoneItem}>
              <Text style={styles.milestoneLabel}>Total Cumulative Paid</Text>
              <Text style={[styles.milestoneValue, { color: theme.textPrimary }]}>
                €{finalYearProj.cumulative.toFixed(0)}
              </Text>
              <Text style={styles.milestoneSub}>Over {projYears} years</Text>
            </View>
          </View>
        )}

        {/* Compounding Trajectory Bar Chart */}
        {/* ponytail: View-based bar chart instead of svg chart library; upgrade when complex multi-series interactive area charts needed */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Annual Income Growth Trajectory</Text>
          <View style={styles.simBarsContainer}>
            {projections.map((p) => {
              const heightPct = maxProjDividend > 0 ? (p.annualDividend / maxProjDividend) * 100 : 0;
              return (
                <View key={p.year} style={styles.simBarCol}>
                  <View style={styles.simBarTrack}>
                    <View
                      style={[
                        styles.simBarFill,
                        {
                          height: `${Math.min(100, Math.max(4, heightPct))}%`,
                          backgroundColor: '#d97706',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.simBarLabel}>{`Y${p.year}`}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* Sector Allocation Breakdown */}
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
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
              Sector Allocation
            </Text>
            <Text style={styles.cardSubtitle}>
              Recommended maximum weight per sector: 20-25%
            </Text>
          </View>
          <View style={styles.badgeSmall}>
            <Text style={styles.badgeSmallText}>{sectorAllocation.length} Sectors</Text>
          </View>
        </View>

        {sectorAllocation.length === 0 ? (
          <Text style={styles.emptyText}>
            Sync with Yahoo Finance to populate sector allocations.
          </Text>
        ) : (
          <View style={styles.sectorList}>
            {sectorAllocation.map((sec, idx) => {
              const isOver = sec.percentage > 25.0;
              return (
                <View key={idx} style={styles.sectorItem}>
                  <TouchableOpacity
                    onPress={() => setExpandedSector(expandedSector === sec.name ? null : sec.name)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: expandedSector === sec.name }}
                    style={styles.sectorHeader}
                  >
                    <View style={styles.sectorNameCol}>
                      <Text
                        style={[styles.sectorName, { color: theme.textPrimary }]}
                        numberOfLines={1}
                      >
                        {sec.name}
                      </Text>
                      {isOver && (
                        <View style={styles.overBadge}>
                          <Text style={styles.overBadgeText}>Concentrated (&gt;25%)</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.sectorValueCol}>
                      <Text style={[styles.sectorPercent, { color: theme.textPrimary }]}>
                        {sec.percentage.toFixed(1)}%
                      </Text>
                      <Text style={styles.sectorEuro}>€{sec.value.toFixed(0)}</Text>
                      <MaterialCommunityIcons
                        name={expandedSector === sec.name ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color="#94a3b8"
                      />
                    </View>
                  </TouchableOpacity>
                  <View style={styles.track}>
                    <View
                      style={[
                        styles.bar,
                        {
                          width: `${Math.min(100, Math.max(3, sec.percentage))}%`,
                          backgroundColor: isOver ? '#ef4444' : theme.accent,
                        },
                      ]}
                      />
                  </View>
                  {expandedSector === sec.name && renderHoldingDetails(sec.holdings)}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Geographic Allocation Breakdown */}
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
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Geographic Exposure</Text>
            <Text style={styles.cardSubtitle}>Tap a region to see its holdings</Text>
          </View>
          <View style={styles.badgeSmall}>
            <Text style={styles.badgeSmallText}>{geographicAllocation.length} Regions</Text>
          </View>
        </View>

        {geographicAllocation.length === 0 ? (
          <Text style={styles.emptyText}>Add holdings to populate geographic exposure.</Text>
        ) : (
          <View style={styles.sectorList}>
            {geographicAllocation.map((geo) => (
              <View key={geo.region} style={styles.sectorItem}>
                <TouchableOpacity
                  onPress={() => setExpandedRegion(expandedRegion === geo.region ? null : geo.region)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: expandedRegion === geo.region }}
                  style={styles.sectorHeader}
                >
                  <View style={styles.sectorNameCol}>
                    <Text style={[styles.sectorName, { color: theme.textPrimary }]} numberOfLines={1}>
                      {geo.region}
                    </Text>
                    <Text style={styles.regionCount}>{geo.holdings.length} position{geo.holdings.length !== 1 ? 's' : ''}</Text>
                  </View>
                  <View style={styles.sectorValueCol}>
                    <Text style={[styles.sectorPercent, { color: theme.textPrimary }]}>
                      {((geo.value / totalValue) * 100).toFixed(1)}%
                    </Text>
                    <Text style={styles.sectorEuro}>€{geo.value.toFixed(0)}</Text>
                    <MaterialCommunityIcons
                      name={expandedRegion === geo.region ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="#94a3b8"
                    />
                  </View>
                </TouchableOpacity>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.bar,
                      { width: `${Math.min(100, (geo.value / totalValue) * 100)}%`, backgroundColor: '#10b981' },
                    ]}
                  />
                </View>
                {expandedRegion === geo.region && renderHoldingDetails(geo.holdings)}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Concentration Breakdown */}
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
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
          Holding Concentration
        </Text>

        <View style={styles.metricItem}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Top Holding Weight</Text>
            <Text style={[styles.metricValue, { color: theme.textPrimary }]}>
              {top1Weight.toFixed(1)}%
            </Text>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.bar,
                { width: `${Math.min(100, top1Weight)}%`, backgroundColor: '#3b82f6' },
              ]}
            />
          </View>
        </View>

        <View style={styles.metricItem}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Top 3 Holdings</Text>
            <Text style={[styles.metricValue, { color: theme.textPrimary }]}>
              {top3Weight.toFixed(1)}%
            </Text>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.bar,
                { width: `${Math.min(100, top3Weight)}%`, backgroundColor: '#6366f1' },
              ]}
            />
          </View>
        </View>

        <View style={styles.metricItem}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Top 5 Holdings</Text>
            <Text style={[styles.metricValue, { color: theme.textPrimary }]}>
              {top5Weight.toFixed(1)}%
            </Text>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.bar,
                { width: `${Math.min(100, top5Weight)}%`, backgroundColor: '#8b5cf6' },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Historical Dividend Growth */}
      {historicalGrowth.items.length > 0 && (
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
          <View style={styles.cardHeaderRow}>
            <View>
              <View style={styles.titleWithIcon}>
                <MaterialCommunityIcons name="history" size={20} color="#059669" />
                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                  Historical Dividend Growth
                </Text>
              </View>
              <Text style={styles.cardSubtitle}>
                Received dividend cash flows by calendar year
              </Text>
            </View>
            {historicalGrowth.cagr !== null && (
              <View style={styles.cagrBadge}>
                <Text style={styles.cagrBadgeText}>
                  CAGR: {historicalGrowth.cagr > 0 ? '+' : ''}{historicalGrowth.cagr.toFixed(1)}%
                </Text>
              </View>
            )}
          </View>

          <View style={styles.historyGrid}>
            {historicalGrowth.items.map((item) => (
              <View
                key={item.year}
                style={[styles.historyItem, isSketch && styles.sketchBorder]}
              >
                <Text style={styles.historyYear}>{item.year}</Text>
                <Text style={[styles.historyAmount, { color: theme.textPrimary }]}>
                  €{item.amount.toFixed(2)}
                </Text>
                {item.yoy !== null ? (
                  <Text
                    style={[
                      styles.historyYoy,
                      { color: item.yoy >= 0 ? '#059669' : '#dc2626' },
                    ]}
                  >
                    {item.yoy >= 0 ? '+' : ''}{item.yoy.toFixed(1)}% YoY
                  </Text>
                ) : (
                  <Text style={styles.historyYoyBase}>Baseline</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Income Leaders */}
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
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
          Top Income Producers
        </Text>
        <Text style={styles.cardSubtitle}>Holdings generating the most cash dividends</Text>

        {incomeRanking.map((item, idx) => (
          <View key={idx} style={styles.incomeRow}>
            <StockLogo ticker={item.ticker} size={36} />
            <View style={styles.incomeInfo}>
              <Text style={[styles.incomeTicker, { color: theme.textPrimary }]}>{item.ticker}</Text>
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
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  scoreCard: {
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
  },
  gaugeContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 6,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: '900',
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
    color: '#475569',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  hhiBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 14,
  },
  hhiText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8',
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  badgeSmall: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeSmallText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  emptyText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
    paddingVertical: 12,
    textAlign: 'center',
  },
  sectorList: {
    gap: 12,
  },
  sectorItem: {
    gap: 6,
  },
  sectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectorNameCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  sectorName: {
    fontSize: 12,
    fontWeight: '700',
    maxWidth: 160,
  },
  overBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  overBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#dc2626',
  },
  sectorValueCol: {
    alignItems: 'flex-end',
  },
  sectorPercent: {
    fontSize: 12,
    fontWeight: '800',
  },
  sectorEuro: {
    fontSize: 10,
    color: '#64748b',
  },
  regionCount: {
    fontSize: 10,
    color: '#94a3b8',
    marginLeft: 6,
  },
  holdingDetails: {
    marginTop: 8,
    paddingTop: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 8,
  },
  holdingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  holdingInfo: {
    flex: 1,
    minWidth: 0,
  },
  holdingTicker: {
    fontSize: 12,
    fontWeight: '800',
  },
  holdingName: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  holdingValue: {
    alignItems: 'flex-end',
  },
  holdingPercent: {
    fontSize: 11,
    fontWeight: '800',
  },
  holdingEuro: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  metricItem: {
    marginTop: 12,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '800',
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
    borderBottomColor: '#f1f5f9',
  },
  incomeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  incomeTicker: {
    fontSize: 14,
    fontWeight: '800',
  },
  incomeCount: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
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
    color: '#64748b',
    marginTop: 1,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 2,
  },
  kpiSub: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  warningCard: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400e',
  },
  warningText: {
    fontSize: 12,
    color: '#b45309',
    fontWeight: '600',
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    marginBottom: 14,
  },
  pillButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pillTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  controlsContainer: {
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  stepperBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stepperBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
  },
  stepperValue: {
    fontSize: 13,
    fontWeight: '800',
    minWidth: 58,
    textAlign: 'center',
  },
  dripToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  dripActive: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  dripInactive: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dripText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dripTextActive: {
    color: '#059669',
  },
  dripTextInactive: {
    color: '#64748b',
  },
  milestonesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
  },
  milestoneItem: {
    width: '48%',
    flexGrow: 1,
    paddingVertical: 4,
  },
  milestoneLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  milestoneValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  milestoneSub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  chartSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  chartTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
  },
  simBarsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 110,
    paddingTop: 10,
  },
  simBarCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    marginHorizontal: 2,
  },
  simBarTrack: {
    flex: 1,
    width: '100%',
    maxWidth: 20,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  simBarFill: {
    width: '100%',
    borderRadius: 4,
  },
  simBarLabel: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 6,
    fontWeight: '600',
  },
  cagrBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  cagrBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  historyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  historyItem: {
    width: '31%',
    flexGrow: 1,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  historyYear: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: '800',
    marginVertical: 3,
  },
  historyYoy: {
    fontSize: 10,
    fontWeight: '800',
  },
  historyYoyBase: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
  },
  sketchBorder: {
    borderWidth: 1,
    borderColor: '#18181b',
  },
});
