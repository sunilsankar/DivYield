import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Info,
  Sliders,
  Users,
  RefreshCw,
  Coins,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";
import { fetchNetherlandsTax, fetchTaxRules, getTaxExportUrl } from "../../lib/api";
import { NetherlandsTaxData, TaxRulesData } from "../../types";

export const TaxEstimatorView: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [hasFiscalPartner, setHasFiscalPartner] = useState<boolean>(false);
  const [useCustomValues, setUseCustomValues] = useState<boolean>(false);
  const [customInvestments, setCustomInvestments] = useState<number>(75000);
  const [customCash, setCustomCash] = useState<number>(10000);

  const [taxData, setTaxData] = useState<NetherlandsTaxData | null>(null);
  const [taxRules, setTaxRules] = useState<TaxRulesData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTaxRules()
      .then((rules) => setTaxRules(rules))
      .catch((err) => console.error("Could not fetch tax rules", err));
  }, []);

  const loadTaxCalculation = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNetherlandsTax({
        year: selectedYear,
        has_fiscal_partner: hasFiscalPartner,
        investments_override: useCustomValues ? customInvestments : undefined,
        cash_override: useCustomValues ? customCash : undefined,
      });
      setTaxData(data);
    } catch (err: any) {
      setError(err.message || "Failed to calculate Netherlands Box 3 tax");
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
      <div className="sketch-box p-6 bg-[#fffef9] relative">
        <div className="sketch-tape bg-[#fff3cd] border-amber-400 rotate-[-1deg] -top-3 left-1/2 transform -translate-x-1/2">
          Jurisdiction: Netherlands (Belastingdienst Box 3)
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900 tracking-tight flex items-center gap-3">
              <span>🇳🇱 Box 3 Wealth Tax Estimator</span>
              <span className="sketch-tag text-xs bg-amber-100 text-amber-900 border-amber-400">
                Rule-Versioned
              </span>
            </h1>
            <p className="text-gray-600 font-sans mt-1 text-sm">
              Local wealth and dividend tax calculations for Dutch fiscal residents. Modeled after the Dutch Wet IB 2001 (Box 3 deemed returns).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="sketch-button flex items-center gap-2 bg-emerald-50 text-emerald-800 border-emerald-600 hover:bg-emerald-100 px-4 py-2 text-sm font-display font-bold"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Export CSV Report</span>
            </button>
            <button
              onClick={loadTaxCalculation}
              disabled={loading}
              className="sketch-button flex items-center gap-2 bg-amber-50 text-amber-900 border-amber-600 hover:bg-amber-100 px-3 py-2 text-sm font-display font-bold"
            >
              <RefreshCw className={`w-4 h-4 text-amber-700 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Mandatory Legal Notice */}
        <div className="mt-4 p-3 bg-amber-50 border-2 border-amber-400 rounded-lg text-xs text-amber-900 font-sans flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">Legal Disclaimer: </strong>
            DivYield calculates estimates locally from synchronized holdings and received dividends. Never present these calculations as an official tax assessment or liability. The Dutch Supreme Court (Hoge Raad) Box 3 rulings continue to impact provisional rates. Consult a certified Belastingadviseur for filing.
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border-2 border-rose-400 rounded-lg text-xs text-rose-900 font-sans flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Interactive Parameters Panel */}
      <div className="sketch-box p-6 bg-[#fffef9]">
        <h2 className="text-xl font-display font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Sliders className="w-5 h-5 text-amber-700" />
          <span>Filing Parameters & Scenarios</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tax Year Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
              Tax Year (Heffingsjaar)
            </label>
            <div className="flex rounded-lg border-2 border-gray-800 overflow-hidden bg-white shadow-sm">
              {[2024, 2025, 2026].map((yr) => (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={`flex-1 py-2 px-3 text-sm font-display font-bold transition-colors border-r-2 last:border-r-0 border-gray-800 ${
                    selectedYear === yr
                      ? "bg-amber-400 text-gray-900 shadow-inner"
                      : "bg-white text-gray-600 hover:bg-amber-50"
                  }`}
                >
                  {yr}
                  <span className="block text-[10px] font-sans font-normal opacity-75">
                    {yr === 2024 ? "Final" : yr === 2025 ? "Provisional" : "Estimate"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Fiscal Partner Toggle */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
              Fiscal Partnership (Fiscaal Partner)
            </label>
            <button
              onClick={() => setHasFiscalPartner(!hasFiscalPartner)}
              className={`w-full py-2.5 px-4 sketch-button flex items-center justify-between text-sm font-display font-bold ${
                hasFiscalPartner
                  ? "bg-indigo-100 text-indigo-900 border-indigo-700"
                  : "bg-white text-gray-700 border-gray-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-700" />
                <span>{hasFiscalPartner ? "Fiscal Partner Included" : "Single Filer"}</span>
              </div>
              <span className="text-xs bg-white px-2 py-0.5 rounded border border-gray-400 font-sans">
                {hasFiscalPartner
                  ? `Allowance: €${(selectedYear === 2024 ? 114000 : 115368).toLocaleString()}`
                  : `Allowance: €${(selectedYear === 2024 ? 57000 : 57684).toLocaleString()}`}
              </span>
            </button>
          </div>

          {/* Data Source Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
              Calculation Source
            </label>
            <div className="flex rounded-lg border-2 border-gray-800 overflow-hidden bg-white">
              <button
                onClick={() => setUseCustomValues(false)}
                className={`flex-1 py-2 px-3 text-xs font-display font-bold border-r-2 border-gray-800 ${
                  !useCustomValues ? "bg-emerald-200 text-emerald-950 font-bold" : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Live Portfolio Data
              </button>
              <button
                onClick={() => setUseCustomValues(true)}
                className={`flex-1 py-2 px-3 text-xs font-display font-bold ${
                  useCustomValues ? "bg-amber-300 text-amber-950 font-bold" : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                What-If Simulator
              </button>
            </div>
          </div>
        </div>

        {/* Custom What-If Inputs */}
        {useCustomValues && (
          <div className="mt-6 pt-6 border-t-2 border-dashed border-gray-300 grid grid-cols-1 md:grid-cols-3 gap-6 items-end bg-amber-50/50 p-4 rounded-xl border border-amber-200">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Custom Investments Value (Stocks, ETFs)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500 font-bold">€</span>
                <input
                  type="number"
                  value={customInvestments}
                  onChange={(e) => setCustomInvestments(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full pl-8 pr-3 py-1.5 sketch-input text-sm font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Custom Bank Deposits / Cash
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500 font-bold">€</span>
                <input
                  type="number"
                  value={customCash}
                  onChange={(e) => setCustomCash(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full pl-8 pr-3 py-1.5 sketch-input text-sm font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <button
                onClick={handleApplyCustom}
                className="w-full sketch-button py-2 bg-amber-400 text-gray-900 border-gray-800 font-display font-bold text-sm hover:bg-amber-300"
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
          <div className="sketch-box p-4 bg-[#fffef9] relative">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
              Total Box 3 Assets
            </span>
            <div className="text-2xl font-display font-black text-gray-900 mt-1">
              €{taxData.total_assets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-gray-600 mt-2 font-mono flex items-center justify-between">
              <span>Inv: €{taxData.total_investments.toLocaleString()}</span>
              <span>Cash: €{taxData.total_cash.toLocaleString()}</span>
            </div>
          </div>

          {/* Card 2: Tax Free Threshold */}
          <div className="sketch-box p-4 bg-[#fffef9] relative">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
              Heffingsvrij Vermogen
            </span>
            <div className="text-2xl font-display font-black text-emerald-700 mt-1">
              €{taxData.tax_free_allowance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="text-[11px] text-gray-600 mt-2 font-sans flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{hasFiscalPartner ? "Fiscal Partner (2x)" : "Single Filer"}</span>
            </div>
          </div>

          {/* Card 3: Taxable Base */}
          <div className="sketch-box p-4 bg-[#fffef9] relative">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
              Taxable Wealth Base
            </span>
            <div className="text-2xl font-display font-black text-indigo-900 mt-1">
              €{taxData.taxable_assets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-gray-600 mt-2 font-mono">
              {taxData.is_below_threshold ? (
                <span className="text-emerald-700 font-bold">100% Tax-Exempt (Below Allowance)</span>
              ) : (
                <span>Deemed Yield: {taxData.effective_return_rate.toFixed(2)}%</span>
              )}
            </div>
          </div>

          {/* Card 4: Estimated Net Tax */}
          <div className={`sketch-box p-4 relative ${taxData.estimated_net_liability > 0 ? "bg-amber-50/80 border-amber-800" : "bg-emerald-50/80 border-emerald-800"}`}>
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
              Estimated Box 3 Payable
            </span>
            <div className={`text-2xl font-display font-black mt-1 ${taxData.estimated_net_liability > 0 ? "text-amber-900" : "text-emerald-800"}`}>
              €{taxData.estimated_net_liability.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-gray-700 mt-2 font-sans flex items-center justify-between">
              <span>Gross: €{taxData.estimated_tax_liability.toFixed(0)}</span>
              {taxData.withholding_tax_credit > 0 && (
                <span className="text-emerald-800 font-bold">Offset: -€{taxData.withholding_tax_credit.toFixed(0)}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Deemed Return Calculation Breakdown */}
      {taxData && (
        <div className="sketch-box p-6 bg-[#fffef9]">
          <h3 className="text-lg font-display font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-700" />
            <span>Calculation Breakdown: Deemed Return (Forfaitair Rendement)</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-sans border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-800 text-xs font-bold text-gray-600 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Asset Category</th>
                  <th className="py-2.5 px-3 text-right">Value (EUR)</th>
                  <th className="py-2.5 px-3 text-right">Deemed Rate (%)</th>
                  <th className="py-2.5 px-3 text-right">Deemed Return (EUR)</th>
                  <th className="py-2.5 px-3">Status / Basis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-mono">
                <tr>
                  <td className="py-3 px-3 font-sans font-medium text-gray-900">
                    Investments (Stocks, ETFs, Mutual Funds)
                  </td>
                  <td className="py-3 px-3 text-right">
                    €{taxData.total_investments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-indigo-700">
                    {taxRules?.rules.find(r => r.year === selectedYear)?.investments_rate || 5.88}%
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-gray-900">
                    €{taxData.deemed_return_investments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 font-sans text-xs text-gray-500">
                    Overige bezittingen
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-sans font-medium text-gray-900">
                    Bank Deposits & Uninvested Cash
                  </td>
                  <td className="py-3 px-3 text-right">
                    €{taxData.total_cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-700">
                    {taxRules?.rules.find(r => r.year === selectedYear)?.savings_rate || 1.44}%
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-gray-900">
                    €{taxData.deemed_return_cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 font-sans text-xs text-gray-500">
                    Banktegoeden (ECB benchmark)
                  </td>
                </tr>
                <tr className="bg-amber-50/60 font-bold">
                  <td className="py-3 px-3 font-sans text-gray-900">
                    Total Assets & Effective Deemed Yield
                  </td>
                  <td className="py-3 px-3 text-right text-gray-900">
                    €{taxData.total_assets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right text-amber-800">
                    {taxData.effective_return_rate.toFixed(2)}%
                  </td>
                  <td className="py-3 px-3 text-right text-amber-900">
                    €{taxData.total_deemed_return.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 font-sans text-xs text-gray-600">
                    Weighted Effective Return
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Stepped calculation formula box */}
          <div className="mt-6 p-4 bg-gray-50 border-2 border-gray-300 rounded-lg text-xs font-mono space-y-1.5 text-gray-700">
            <div className="font-bold text-gray-900 uppercase font-sans mb-1 text-[11px]">
              Belastingdienst Formula Application:
            </div>
            <div>
              1. Taxable Wealth Portion = €{taxData.total_assets.toLocaleString()} - €{taxData.tax_free_allowance.toLocaleString()} = <span className="font-bold">€{taxData.taxable_assets.toLocaleString()}</span>
            </div>
            <div>
              2. Effective Yield Rate = €{taxData.total_deemed_return.toLocaleString()} / €{taxData.total_assets.toLocaleString()} = <span className="font-bold">{taxData.effective_return_rate.toFixed(2)}%</span>
            </div>
            <div>
              3. Taxable Benefit (Rendement) = €{taxData.taxable_assets.toLocaleString()} × {taxData.effective_return_rate.toFixed(2)}% = <span className="font-bold">€{taxData.taxable_benefit.toLocaleString()}</span>
            </div>
            <div>
              4. Gross Box 3 Tax = €{taxData.taxable_benefit.toLocaleString()} × {taxData.tax_rate}% = <span className="font-bold">€{taxData.estimated_tax_liability.toLocaleString()}</span>
            </div>
            {taxData.withholding_tax_credit > 0 && (
              <div className="text-emerald-800">
                5. Dutch/Foreign Dividend Withholding Tax Credit = <span className="font-bold">-€{taxData.withholding_tax_credit.toLocaleString()}</span> (15% creditable under Dutch tax law)
              </div>
            )}
            <div className="font-bold text-gray-900 pt-1 border-t border-gray-300">
              Final Estimated Net Box 3 Tax = €{taxData.estimated_net_liability.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Assumptions & Methodology List */}
      {taxData && (
        <div className="sketch-box p-6 bg-[#fffef9]">
          <h3 className="text-lg font-display font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-700" />
            <span>Assumptions & Legal Basis for Tax Year {selectedYear}</span>
          </h3>
          <ul className="space-y-2 text-xs font-sans text-gray-700">
            {taxData.assumptions.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-600 font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
