import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  AlertTriangle,
  RefreshCw,
  Coins,
  CheckCircle2,
  Sliders,
  Users,
  Info,
} from "lucide-react";
import {
  fetchTaxRules,
  fetchNetherlandsTax,
  getTaxExportUrl,
} from "../../lib/api";
import { NetherlandsTaxResult, TaxRulesResponse, TaxRuleItem } from "../../types";

export const TaxEstimatorView: React.FC = () => {
  const [taxData, setTaxData] = useState<NetherlandsTaxResult | null>(null);
  const [taxRules, setTaxRules] = useState<TaxRulesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User input controls
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [hasFiscalPartner, setHasFiscalPartner] = useState<boolean>(false);
  const [useCustomValues, setUseCustomValues] = useState<boolean>(false);
  const [customInvestments, setCustomInvestments] = useState<number>(50000);
  const [customCash, setCustomCash] = useState<number>(10000);

  useEffect(() => {
    loadTaxRules();
  }, []);

  const loadTaxRules = async () => {
    try {
      const rules = await fetchTaxRules();
      setTaxRules(rules);
    } catch (err) {
      console.error("Failed to load tax rules:", err);
    }
  };

  const loadTaxCalculation = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {
        tax_year: selectedYear,
        has_fiscal_partner: hasFiscalPartner,
      };
      if (useCustomValues) {
        params.custom_investments = customInvestments;
        params.custom_cash = customCash;
      }
      const data = await fetchNetherlandsTax(params);
      setTaxData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to calculate taxes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTaxCalculation();
  }, [selectedYear, hasFiscalPartner, useCustomValues]);

  const handleApplyCustom = () => {
    loadTaxCalculation();
  };

  const handleExportCSV = () => {
    const url = getTaxExportUrl(selectedYear, hasFiscalPartner);
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🇳🇱</span>
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2.5">
                Box 3 Wealth Tax Estimator
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  Rule-Versioned
                </span>
              </h1>
            </div>
            <p className="text-slate-500 mt-1 text-xs">
              Local wealth and dividend tax calculations for Dutch fiscal residents. Modeled after the Dutch Wet IB 2001 (Box 3 deemed returns).
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 px-3.5 py-2 text-xs font-medium rounded-xl transition-colors shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={loadTaxCalculation}
              disabled={loading}
              className="flex items-center gap-2 bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 px-3 py-2 text-xs font-medium rounded-xl transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Mandatory Legal Notice */}
        <div className="mt-4 p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="font-semibold">Legal Disclaimer: </strong>
            DivYield calculates estimates locally from synchronized holdings and received dividends. Never present these calculations as an official tax assessment or liability. The Dutch Supreme Court (Hoge Raad) Box 3 rulings continue to impact provisional rates. Consult a certified Belastingadviseur for filing.
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Interactive Parameters Panel */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-600" />
          <span>Filing Parameters & Scenarios</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
          {/* Tax Year Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Tax Year (Heffingsjaar)
            </label>
            <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-slate-50 p-1">
              {[2024, 2025, 2026].map((yr) => (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-lg transition-all ${
                    selectedYear === yr
                      ? "bg-white text-indigo-600 font-semibold shadow-sm border border-slate-200/80"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {yr}
                  <span className="block text-[10px] text-slate-400 font-normal">
                    {yr === 2024 ? "Final" : yr === 2025 ? "Provisional" : "Estimate"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Fiscal Partner Toggle */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Fiscal Partnership (Fiscaal Partner)
            </label>
            <button
              onClick={() => setHasFiscalPartner(!hasFiscalPartner)}
              className={`w-full py-2.5 px-3.5 rounded-xl border flex items-center justify-between text-xs font-medium transition-all ${
                hasFiscalPartner
                  ? "bg-indigo-50/70 text-indigo-900 border-indigo-200 shadow-sm"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>{hasFiscalPartner ? "Fiscal Partner Included" : "Single Filer"}</span>
              </div>
              <span className="text-[11px] bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-slate-600">
                {hasFiscalPartner
                  ? `Allowance: €${(selectedYear === 2024 ? 114000 : 115368).toLocaleString()}`
                  : `Allowance: €${(selectedYear === 2024 ? 57000 : 57684).toLocaleString()}`}
              </span>
            </button>
          </div>

          {/* Data Source Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Calculation Source
            </label>
            <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-slate-50 p-1">
              <button
                onClick={() => setUseCustomValues(false)}
                className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-lg transition-all ${
                  !useCustomValues
                    ? "bg-white text-emerald-800 font-semibold shadow-sm border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Live Portfolio Data
              </button>
              <button
                onClick={() => setUseCustomValues(true)}
                className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-lg transition-all ${
                  useCustomValues
                    ? "bg-white text-amber-800 font-semibold shadow-sm border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                What-If Simulator
              </button>
            </div>
          </div>
        </div>

        {/* Custom What-If Inputs */}
        {useCustomValues && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-amber-50/40 p-4 rounded-xl border border-amber-200/60">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Custom Investments Value (Stocks, ETFs)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-medium text-sm">€</span>
                <input
                  type="number"
                  value={customInvestments}
                  onChange={(e) => setCustomInvestments(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full pl-8 pr-3 py-2 text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Custom Bank Deposits / Cash
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-medium text-sm">€</span>
                <input
                  type="number"
                  value={customCash}
                  onChange={(e) => setCustomCash(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full pl-8 pr-3 py-2 text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <button
                onClick={handleApplyCustom}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs rounded-xl transition-all shadow-sm"
              >
                Apply Custom Simulation
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Results KPI Grid */}
      {taxData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Assets */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">
              Total Box 3 Assets
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              €{taxData.total_assets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
              <span>Inv: €{taxData.total_investments.toLocaleString()}</span>
              <span>Cash: €{taxData.total_cash.toLocaleString()}</span>
            </div>
          </div>

          {/* Card 2: Tax Free Threshold */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">
              Heffingsvrij Vermogen
            </span>
            <div className="text-2xl font-bold text-emerald-700 mt-1">
              €{taxData.tax_free_allowance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{hasFiscalPartner ? "Fiscal Partner (2x)" : "Single Filer"}</span>
            </div>
          </div>

          {/* Card 3: Taxable Base */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">
              Taxable Wealth Base
            </span>
            <div className="text-2xl font-bold text-indigo-900 mt-1">
              €{taxData.taxable_assets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 mt-2">
              {taxData.is_below_threshold ? (
                <span className="text-emerald-700 font-medium">100% Tax-Exempt (Below Allowance)</span>
              ) : (
                <span>Deemed Yield: {taxData.effective_return_rate.toFixed(2)}%</span>
              )}
            </div>
          </div>

          {/* Card 4: Estimated Net Tax */}
          <div className={`p-5 rounded-2xl border shadow-sm ${taxData.estimated_net_liability > 0 ? "bg-amber-50/70 border-amber-200" : "bg-emerald-50/70 border-emerald-200"}`}>
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">
              Estimated Box 3 Payable
            </span>
            <div className={`text-2xl font-bold mt-1 ${taxData.estimated_net_liability > 0 ? "text-amber-950" : "text-emerald-950"}`}>
              €{taxData.estimated_net_liability.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-600 mt-2 flex items-center justify-between">
              <span>Gross: €{taxData.estimated_tax_liability.toFixed(0)}</span>
              {taxData.withholding_tax_credit > 0 && (
                <span className="text-emerald-800 font-semibold">Offset: -€{taxData.withholding_tax_credit.toFixed(0)}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Deemed Return Calculation Breakdown */}
      {taxData && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Coins className="w-4 h-4 text-indigo-600" />
            <span>Calculation Breakdown: Deemed Return (Forfaitair Rendement)</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Asset Category</th>
                  <th className="py-2.5 px-3 text-right">Value (EUR)</th>
                  <th className="py-2.5 px-3 text-right">Deemed Rate (%)</th>
                  <th className="py-2.5 px-3 text-right">Deemed Return (EUR)</th>
                  <th className="py-2.5 px-3">Status / Basis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-3 font-medium text-slate-900">
                    Investments (Stocks, ETFs, Mutual Funds)
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    €{taxData.total_investments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-indigo-600 font-mono">
                    {taxRules?.rules.find((r: TaxRuleItem) => r.year === selectedYear)?.investments_rate || 5.88}%
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-slate-900 font-mono">
                    €{taxData.deemed_return_investments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-[11px] text-slate-500">
                    Overige bezittingen
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-medium text-slate-900">
                    Bank Deposits & Uninvested Cash
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    €{taxData.total_cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-emerald-600 font-mono">
                    {taxRules?.rules.find((r: TaxRuleItem) => r.year === selectedYear)?.savings_rate || 1.44}%
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-slate-900 font-mono">
                    €{taxData.deemed_return_cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-[11px] text-slate-500">
                    Banktegoeden (ECB benchmark)
                  </td>
                </tr>
                <tr className="bg-slate-50/70 font-semibold">
                  <td className="py-3 px-3 text-slate-900">
                    Total Assets & Effective Deemed Yield
                  </td>
                  <td className="py-3 px-3 text-right text-slate-900 font-mono">
                    €{taxData.total_assets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right text-amber-700 font-mono">
                    {taxData.effective_return_rate.toFixed(2)}%
                  </td>
                  <td className="py-3 px-3 text-right text-slate-900 font-mono">
                    €{taxData.total_deemed_return.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-[11px] text-slate-500">
                    Weighted Effective Return
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Stepped calculation formula box */}
          <div className="mt-4 p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs space-y-1.5 text-slate-600">
            <div className="font-semibold text-slate-900 uppercase text-[10px] tracking-wider mb-1">
              Belastingdienst Formula Application:
            </div>
            <div>
              1. Taxable Wealth Portion = €{taxData.total_assets.toLocaleString()} - €{taxData.tax_free_allowance.toLocaleString()} = <span className="font-semibold text-slate-900">€{taxData.taxable_assets.toLocaleString()}</span>
            </div>
            <div>
              2. Effective Yield Rate = €{taxData.total_deemed_return.toLocaleString()} / €{taxData.total_assets.toLocaleString()} = <span className="font-semibold text-slate-900">{taxData.effective_return_rate.toFixed(2)}%</span>
            </div>
            <div>
              3. Taxable Benefit (Rendement) = €{taxData.taxable_assets.toLocaleString()} × {taxData.effective_return_rate.toFixed(2)}% = <span className="font-semibold text-slate-900">€{taxData.taxable_benefit.toLocaleString()}</span>
            </div>
            <div>
              4. Gross Box 3 Tax = €{taxData.taxable_benefit.toLocaleString()} × {taxData.tax_rate}% = <span className="font-semibold text-slate-900">€{taxData.estimated_tax_liability.toLocaleString()}</span>
            </div>
            {taxData.withholding_tax_credit > 0 && (
              <div className="text-emerald-700 font-medium">
                5. Dutch/Foreign Dividend Withholding Tax Credit = <span className="font-semibold">-€{taxData.withholding_tax_credit.toLocaleString()}</span> (15% creditable under Dutch tax law)
              </div>
            )}
            <div className="font-semibold text-slate-900 pt-2 border-t border-slate-200">
              Final Estimated Net Box 3 Tax = €{taxData.estimated_net_liability.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Assumptions & Methodology List */}
      {taxData && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-3">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-600" />
            <span>Assumptions & Legal Basis for Tax Year {selectedYear}</span>
          </h3>
          <ul className="space-y-2 text-xs text-slate-600">
            {taxData.assumptions.map((item: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
